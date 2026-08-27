-- Técnico cria e envia o próprio orçamento. Validador e Administrador aprovam.
-- Todos os registros deste recorte permanecem restritos e demonstrativos.

drop policy if exists "propostas da origem para validador e administrador" on propostas;
create policy "propostas restritas da origem por responsabilidade"
on propostas for select to authenticated
using (
  origem = origem_ativa_atual()
  and (
    perfil_interno_atual() in ('validador', 'administrador')
    or criado_por = auth.uid()
  )
);

drop policy if exists "versoes da origem para validador e administrador" on versoes_proposta;
create policy "versoes restritas da origem por responsabilidade"
on versoes_proposta for select to authenticated
using (
  origem = origem_ativa_atual()
  and exists (
    select 1
    from propostas p
    where p.id = proposta_id
      and p.origem = origem_ativa_atual()
      and (
        perfil_interno_atual() in ('validador', 'administrador')
        or p.criado_por = auth.uid()
      )
  )
);

drop policy if exists "itens da origem para validador e administrador" on itens_proposta;
create policy "itens restritos da origem por responsabilidade"
on itens_proposta for select to authenticated
using (
  origem = origem_ativa_atual()
  and exists (
    select 1
    from versoes_proposta v
    join propostas p on p.id = v.proposta_id
    where v.id = versao_proposta_id
      and v.origem = origem_ativa_atual()
      and p.origem = origem_ativa_atual()
      and (
        perfil_interno_atual() in ('validador', 'administrador')
        or p.criado_por = auth.uid()
      )
  )
);

drop policy if exists "usos da origem para validador e administrador" on usos_equipamento_proposta;
create policy "usos restritos da origem por responsabilidade"
on usos_equipamento_proposta for select to authenticated
using (
  exists (
    select 1
    from itens_proposta i
    join versoes_proposta v on v.id = i.versao_proposta_id
    join propostas p on p.id = v.proposta_id
    where i.id = item_proposta_id
      and i.origem = origem_ativa_atual()
      and v.origem = origem_ativa_atual()
      and p.origem = origem_ativa_atual()
      and (
        perfil_interno_atual() in ('validador', 'administrador')
        or p.criado_por = auth.uid()
      )
  )
);

create or replace function criar_orcamento_demonstrativo(
  servico uuid,
  equipamento uuid,
  descricao text,
  quantidade numeric,
  horas numeric,
  custos_extras numeric,
  percentual_lucro numeric
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  usuario uuid := auth.uid();
  perfil perfil_interno;
  origem_sessao origem_dado;
  empresa_demo constant uuid := '40000000-0000-0000-0000-000000000001';
  solicitacao_id uuid;
  proposta_id uuid;
  versao_id uuid;
  item_id uuid;
  custo_hora_vigente numeric(18,6);
  custo_calculado numeric(18,6);
  preco_calculado numeric(18,6);
begin
  select p.perfil_interno, p.origem_ativa
    into perfil, origem_sessao
  from perfis p
  where p.usuario_id = usuario;

  if perfil is null or perfil not in ('tecnico', 'validador', 'administrador') then
    raise exception 'Perfil sem autorização para criar orçamento.' using errcode = '42501';
  end if;

  if origem_sessao is distinct from 'demonstracao'::origem_dado then
    raise exception 'Esta função aceita somente a origem demonstracao.' using errcode = '23514';
  end if;

  if nullif(trim(descricao), '') is null or char_length(trim(descricao)) not between 3 and 500 then
    raise exception 'Descrição deve ter entre 3 e 500 caracteres.' using errcode = '23514';
  end if;

  if quantidade is null or quantidade <= 0
     or horas is null or horas < 0
     or custos_extras is null or custos_extras < 0
     or percentual_lucro is null or percentual_lucro <= -100
     or quantidade > 999999999999.999999
     or horas > 999999999999.999999
     or custos_extras > 999999999999.999999
     or percentual_lucro > 999.999999 then
    raise exception 'Valores numéricos do orçamento são inválidos.' using errcode = '23514';
  end if;

  if not exists (select 1 from servicos_catalogo s where s.id = servico and s.ativo) then
    raise exception 'Serviço ativo não encontrado.' using errcode = '23503';
  end if;

  if not exists (select 1 from equipamentos e where e.id = equipamento and e.ativo) then
    raise exception 'Equipamento ativo não encontrado.' using errcode = '23503';
  end if;

  select c.custo_hora
    into custo_hora_vigente
  from custos_equipamento c
  where c.equipamento_id = equipamento
    and c.origem = origem_sessao
    and c.vigente_desde <= current_date
    and (c.vigente_ate is null or c.vigente_ate >= current_date)
  order by c.vigente_desde desc
  limit 1;

  if custo_hora_vigente is null then
    raise exception 'Equipamento sem custo vigente na origem ativa.' using errcode = '23514';
  end if;

  custo_calculado := round(custo_hora_vigente * horas + custos_extras, 6);
  preco_calculado := round(custo_calculado * (1 + percentual_lucro / 100), 6);

  if custo_calculado > 999999999999.999999 or preco_calculado < 0 or preco_calculado > 999999999999.999999 then
    raise exception 'Total calculado fora do limite permitido.' using errcode = '22003';
  end if;

  insert into empresas (id, origem, visibilidade, razao_social)
  values (empresa_demo, 'demonstracao', 'restrito', 'Empresa demonstrativa interna')
  on conflict (id) do nothing;

  if not exists (select 1 from empresas e where e.id = empresa_demo and e.origem = 'demonstracao') then
    raise exception 'Contexto demonstrativo inválido.' using errcode = '23514';
  end if;

  insert into solicitacoes (
    origem, visibilidade, empresa_id, solicitante_id, servico_catalogo_id, respostas, estado
  ) values (
    origem_sessao,
    'restrito',
    empresa_demo,
    usuario,
    servico,
    jsonb_build_object('contexto', 'orcamento_demonstrativo_interno'),
    'orcada'
  ) returning id into solicitacao_id;

  insert into propostas (origem, visibilidade, solicitacao_id, empresa_id, criado_por)
  values (origem_sessao, 'restrito', solicitacao_id, empresa_demo, usuario)
  returning id into proposta_id;

  insert into versoes_proposta (
    proposta_id, numero, origem, estado, moeda, cotacao_brl,
    ajuste_comercial, total_brl, total_moeda, criada_por
  ) values (
    proposta_id, 1, origem_sessao, 'rascunho', 'BRL', 1,
    0, preco_calculado, preco_calculado, usuario
  ) returning id into versao_id;

  insert into itens_proposta (
    versao_proposta_id, origem, servico_catalogo_id, descricao, quantidade,
    custos_extras, percentual_lucro, custo_congelado, preco_antes_ajuste,
    ajuste_rateado, preco_final
  ) values (
    versao_id, origem_sessao, servico, trim(descricao), quantidade,
    custos_extras, percentual_lucro, custo_calculado, preco_calculado,
    0, preco_calculado
  ) returning id into item_id;

  insert into usos_equipamento_proposta (
    item_proposta_id, equipamento_id, horas, custo_hora_congelado
  ) values (
    item_id, equipamento, horas, custo_hora_vigente
  );

  insert into auditoria (origem, usuario_id, acao, entidade, entidade_id, dados)
  values (
    origem_sessao,
    usuario,
    'criar_orcamento_demonstrativo',
    'versoes_proposta',
    versao_id,
    jsonb_build_object(
      'proposta_id', proposta_id,
      'equipamento_id', equipamento,
      'servico_id', servico,
      'estado', 'rascunho'
    )
  );

  return versao_id;
end;
$$;

drop function if exists listar_orcamentos_demonstrativos();
create function listar_orcamentos_demonstrativos()
returns table (
  versao_id uuid,
  numero integer,
  estado estado_proposta,
  criada_em timestamptz,
  descricao text,
  servico_slug text,
  equipamento_nome text,
  horas numeric,
  custo_hora_congelado numeric,
  custos_extras numeric,
  percentual_lucro numeric,
  custo_congelado numeric,
  preco_final numeric,
  pode_enviar boolean,
  pode_aprovar boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  usuario uuid := auth.uid();
  perfil perfil_interno;
  origem_sessao origem_dado;
begin
  select pf.perfil_interno, pf.origem_ativa
    into perfil, origem_sessao
  from perfis pf
  where pf.usuario_id = usuario;

  if perfil is null or perfil not in ('tecnico', 'validador', 'administrador') then
    raise exception 'Perfil sem acesso aos orçamentos.' using errcode = '42501';
  end if;

  return query
  select
    v.id,
    v.numero,
    v.estado,
    v.criada_em,
    i.descricao,
    s.slug,
    e.nome,
    u.horas,
    case when perfil in ('validador', 'administrador') then u.custo_hora_congelado else null end,
    i.custos_extras,
    i.percentual_lucro,
    case when perfil in ('validador', 'administrador') then i.custo_congelado else null end,
    i.preco_final,
    p.criado_por = usuario and v.estado = 'rascunho',
    perfil in ('validador', 'administrador') and v.estado = 'em_validacao'
  from versoes_proposta v
  join propostas p on p.id = v.proposta_id
  join itens_proposta i on i.versao_proposta_id = v.id
  join servicos_catalogo s on s.id = i.servico_catalogo_id
  join usos_equipamento_proposta u on u.item_proposta_id = i.id
  join equipamentos e on e.id = u.equipamento_id
  where v.origem = origem_sessao
    and i.origem = origem_sessao
    and p.origem = origem_sessao
    and (perfil in ('validador', 'administrador') or p.criado_por = usuario)
  order by v.criada_em desc;
end;
$$;

create or replace function enviar_orcamento_para_validacao(versao uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  usuario uuid := auth.uid();
  perfil perfil_interno;
  origem_sessao origem_dado;
  estado_atual estado_proposta;
  criador uuid;
  origem_orcamento origem_dado;
begin
  select p.perfil_interno, p.origem_ativa
    into perfil, origem_sessao
  from perfis p
  where p.usuario_id = usuario;

  if perfil is null or perfil not in ('tecnico', 'validador', 'administrador') then
    raise exception 'Perfil sem autorização para enviar orçamento.' using errcode = '42501';
  end if;

  if origem_sessao is distinct from 'demonstracao'::origem_dado then
    raise exception 'Esta função aceita somente a origem demonstracao.' using errcode = '23514';
  end if;

  select v.estado, p.criado_por, v.origem
    into estado_atual, criador, origem_orcamento
  from versoes_proposta v
  join propostas p on p.id = v.proposta_id
  where v.id = versao
  for update of v;

  if not found or origem_orcamento is distinct from origem_sessao then
    raise exception 'Orçamento não encontrado na origem ativa.' using errcode = '23503';
  end if;

  if criador is distinct from usuario then
    raise exception 'Somente o autor pode enviar este orçamento.' using errcode = '42501';
  end if;

  if estado_atual is distinct from 'rascunho'::estado_proposta then
    raise exception 'Somente rascunho pode ser enviado para validação.' using errcode = '23514';
  end if;

  update versoes_proposta
  set estado = 'em_validacao', enviada_em = now(), enviada_por = usuario
  where id = versao;

  insert into auditoria (origem, usuario_id, acao, entidade, entidade_id, dados)
  values (
    origem_sessao,
    usuario,
    'enviar_orcamento_validacao',
    'versoes_proposta',
    versao,
    jsonb_build_object('estado_anterior', 'rascunho', 'estado_novo', 'em_validacao')
  );
end;
$$;

create or replace function aprovar_orcamento_demonstrativo(versao uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  usuario uuid := auth.uid();
  perfil perfil_interno;
  origem_sessao origem_dado;
  estado_atual estado_proposta;
  origem_orcamento origem_dado;
begin
  select p.perfil_interno, p.origem_ativa
    into perfil, origem_sessao
  from perfis p
  where p.usuario_id = usuario;

  if perfil is null or perfil not in ('validador', 'administrador') then
    raise exception 'Somente Validador ou Administrador pode aprovar orçamento.' using errcode = '42501';
  end if;

  if origem_sessao is distinct from 'demonstracao'::origem_dado then
    raise exception 'Esta função aceita somente a origem demonstracao.' using errcode = '23514';
  end if;

  select v.estado, v.origem
    into estado_atual, origem_orcamento
  from versoes_proposta v
  where v.id = versao
  for update;

  if not found or origem_orcamento is distinct from origem_sessao then
    raise exception 'Orçamento não encontrado na origem ativa.' using errcode = '23503';
  end if;

  if estado_atual is distinct from 'em_validacao'::estado_proposta then
    raise exception 'Somente orçamento em validação pode ser aprovado.' using errcode = '23514';
  end if;

  update versoes_proposta
  set estado = 'aprovada', aprovada_em = now(), aprovada_por = usuario
  where id = versao;

  insert into auditoria (origem, usuario_id, acao, entidade, entidade_id, dados)
  values (
    origem_sessao,
    usuario,
    'aprovar_orcamento_demonstrativo',
    'versoes_proposta',
    versao,
    jsonb_build_object('estado_anterior', 'em_validacao', 'estado_novo', 'aprovada')
  );
end;
$$;

revoke all on function criar_orcamento_demonstrativo(uuid, uuid, text, numeric, numeric, numeric, numeric) from public, anon;
revoke all on function listar_orcamentos_demonstrativos() from public, anon;
revoke all on function enviar_orcamento_para_validacao(uuid) from public, anon;
revoke all on function aprovar_orcamento_demonstrativo(uuid) from public, anon;

grant execute on function criar_orcamento_demonstrativo(uuid, uuid, text, numeric, numeric, numeric, numeric) to authenticated;
grant execute on function listar_orcamentos_demonstrativos() to authenticated;
grant execute on function enviar_orcamento_para_validacao(uuid) to authenticated;
grant execute on function aprovar_orcamento_demonstrativo(uuid) to authenticated;

comment on function criar_orcamento_demonstrativo(uuid, uuid, text, numeric, numeric, numeric, numeric) is
  'Cria rascunho sintético com custo vigente congelado para Técnico, Validador ou Administrador.';
comment on function enviar_orcamento_para_validacao(uuid) is
  'Envia o rascunho do próprio autor para validação e registra auditoria.';
comment on function aprovar_orcamento_demonstrativo(uuid) is
  'Aprova orçamento demonstrativo em validação; somente Validador ou Administrador.';

