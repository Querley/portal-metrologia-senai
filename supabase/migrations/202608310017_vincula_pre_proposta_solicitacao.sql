-- Liga a solicitação pública ativada à pré-proposta criada pela equipe.
-- O recorte continua exclusivo da origem demonstracao e não habilita dados reais.

drop function if exists listar_solicitacoes_publicas_demonstrativas();
create function listar_solicitacoes_publicas_demonstrativas()
returns table (
  id uuid,
  codigo bigint,
  nome text,
  email text,
  empresa text,
  necessidade text,
  estado text,
  criado_em timestamptz,
  solicitacao_id uuid,
  servico_id uuid,
  descricao text,
  quantidade integer,
  prazo_pagamento_dias integer,
  tem_pre_proposta boolean,
  estado_pre_proposta estado_proposta
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if perfil_interno_atual() not in ('tecnico', 'validador', 'administrador') then
    raise exception 'Perfil sem acesso às solicitações.' using errcode = '42501';
  end if;
  if origem_ativa_atual() is distinct from 'demonstracao'::origem_dado then
    raise exception 'Esta função aceita somente a origem demonstracao.' using errcode = '23514';
  end if;

  return query
  select
    sp.id,
    sp.codigo,
    sp.nome,
    sp.email_normalizado,
    sp.empresa_nome,
    sp.necessidade,
    sp.estado,
    sp.criado_em,
    sp.solicitacao_id,
    s.servico_catalogo_id,
    sp.descricao,
    sp.quantidade,
    sp.prazo_pagamento_dias,
    proposta_atual.versao_id is not null,
    proposta_atual.estado
  from solicitacoes_publicas sp
  left join solicitacoes s
    on s.id = sp.solicitacao_id
   and s.origem = 'demonstracao'
  left join lateral (
    select v.id as versao_id, v.estado
    from propostas p
    join versoes_proposta v on v.proposta_id = p.id
    where p.solicitacao_id = sp.solicitacao_id
      and p.origem = 'demonstracao'
      and v.origem = 'demonstracao'
      and v.estado <> 'rejeitada'
    order by v.criada_em desc
    limit 1
  ) proposta_atual on true
  where sp.origem = 'demonstracao'
  order by sp.criado_em desc;
end;
$$;

create or replace function criar_pre_proposta_para_solicitacao_demonstrativa(
  solicitacao uuid,
  servico uuid,
  equipamento uuid,
  descricao text,
  quantidade numeric,
  horas numeric,
  custos_extras numeric,
  percentual_lucro numeric,
  destinatario text,
  prazo_pagamento_dias integer
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
  empresa_destino uuid;
  proposta_id uuid;
  versao_id uuid;
  item_id uuid;
  custo_hora_vigente numeric(18,6);
  custo_calculado numeric(18,6);
  preco_calculado numeric(18,6);
  destinatario_normalizado text := trim(coalesce(destinatario, ''));
begin
  select p.perfil_interno, p.origem_ativa
    into perfil, origem_sessao
  from perfis p
  where p.usuario_id = usuario;

  if perfil is null or perfil not in ('tecnico', 'validador', 'administrador') then
    raise exception 'Perfil sem autorização para criar pré-proposta.' using errcode = '42501';
  end if;
  if origem_sessao is distinct from 'demonstracao'::origem_dado then
    raise exception 'Esta função aceita somente a origem demonstracao.' using errcode = '23514';
  end if;
  if destinatario_normalizado is null or char_length(destinatario_normalizado) not between 2 and 160 then
    raise exception 'Destinatário deve ter entre 2 e 160 caracteres.' using errcode = '23514';
  end if;
  if prazo_pagamento_dias is null or prazo_pagamento_dias not between 1 and 365 then
    raise exception 'Prazo de pagamento deve estar entre 1 e 365 dias.' using errcode = '23514';
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
    raise exception 'Valores numéricos da pré-proposta são inválidos.' using errcode = '23514';
  end if;
  if not exists (select 1 from servicos_catalogo s where s.id = servico and s.ativo) then
    raise exception 'Serviço ativo não encontrado.' using errcode = '23503';
  end if;
  if not exists (select 1 from equipamentos e where e.id = equipamento and e.ativo) then
    raise exception 'Equipamento ativo não encontrado.' using errcode = '23503';
  end if;

  select s.empresa_id
    into empresa_destino
  from solicitacoes s
  join solicitacoes_publicas sp on sp.solicitacao_id = s.id
  where s.id = solicitacao
    and s.origem = 'demonstracao'
    and sp.origem = 'demonstracao'
    and sp.estado = 'ativada'
  for update of s;

  if empresa_destino is null then
    raise exception 'Solicitação ativada não encontrada na homologação.' using errcode = '23503';
  end if;
  if exists (
    select 1
    from propostas p
    join versoes_proposta v on v.proposta_id = p.id
    where p.solicitacao_id = solicitacao
      and p.origem = 'demonstracao'
      and v.origem = 'demonstracao'
      and v.estado <> 'rejeitada'
  ) then
    raise exception 'A solicitação já possui uma pré-proposta ativa.' using errcode = '23505';
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

  insert into propostas (origem, visibilidade, solicitacao_id, empresa_id, criado_por)
  values (origem_sessao, 'restrito', solicitacao, empresa_destino, usuario)
  returning id into proposta_id;

  insert into versoes_proposta (
    proposta_id, numero, origem, estado, moeda, cotacao_brl,
    ajuste_comercial, total_brl, total_moeda, criada_por,
    destinatario, prazo_pagamento_dias
  ) values (
    proposta_id, 1, origem_sessao, 'rascunho', 'BRL', 1,
    0, preco_calculado, preco_calculado, usuario,
    destinatario_normalizado, prazo_pagamento_dias
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

  insert into usos_equipamento_proposta (item_proposta_id, equipamento_id, horas, custo_hora_congelado)
  values (item_id, equipamento, horas, custo_hora_vigente);

  update solicitacoes
  set estado = 'orcada'
  where id = solicitacao and origem = 'demonstracao';

  insert into auditoria (origem, usuario_id, acao, entidade, entidade_id, dados)
  values (
    origem_sessao,
    usuario,
    'criar_pre_proposta_para_solicitacao',
    'versoes_proposta',
    versao_id,
    jsonb_build_object(
      'proposta_id', proposta_id,
      'solicitacao_id', solicitacao,
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
  ultima_justificativa_interna text,
  pode_enviar boolean,
  pode_aprovar boolean,
  pode_devolver boolean,
  pode_rejeitar boolean,
  pode_publicar boolean,
  publicacao_pronta boolean,
  solicitacao_id uuid,
  solicitacao_codigo bigint,
  empresa_nome text,
  cliente_vinculado boolean
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
    sc.slug,
    eq.nome,
    u.horas,
    case when perfil in ('validador', 'administrador') then u.custo_hora_congelado else null end,
    i.custos_extras,
    i.percentual_lucro,
    case when perfil in ('validador', 'administrador') then i.custo_congelado else null end,
    i.preco_final,
    v.ultima_justificativa_interna,
    p.criado_por = usuario and v.estado in ('rascunho', 'devolvida'),
    perfil in ('validador', 'administrador') and v.estado = 'em_validacao',
    perfil in ('validador', 'administrador') and v.estado = 'em_validacao',
    perfil in ('validador', 'administrador') and v.estado = 'em_validacao',
    perfil = 'administrador' and v.estado = 'aprovada',
    v.pdf_caminho is not null and v.hash_conteudo is not null,
    sol.id,
    coalesce(sp.codigo, sol.codigo),
    emp.razao_social,
    sp.id is not null and sp.estado = 'ativada'
  from versoes_proposta v
  join propostas p on p.id = v.proposta_id
  join solicitacoes sol on sol.id = p.solicitacao_id
  join empresas emp on emp.id = p.empresa_id
  join itens_proposta i on i.versao_proposta_id = v.id
  join servicos_catalogo sc on sc.id = i.servico_catalogo_id
  join usos_equipamento_proposta u on u.item_proposta_id = i.id
  join equipamentos eq on eq.id = u.equipamento_id
  left join solicitacoes_publicas sp on sp.solicitacao_id = sol.id and sp.origem = origem_sessao
  where v.origem = origem_sessao
    and i.origem = origem_sessao
    and p.origem = origem_sessao
    and sol.origem = origem_sessao
    and emp.origem = origem_sessao
    and (perfil in ('validador', 'administrador') or p.criado_por = usuario)
  order by v.criada_em desc;
end;
$$;

revoke all on function listar_solicitacoes_publicas_demonstrativas() from public, anon;
revoke all on function criar_pre_proposta_para_solicitacao_demonstrativa(uuid, uuid, uuid, text, numeric, numeric, numeric, numeric, text, integer) from public, anon;
revoke all on function listar_orcamentos_demonstrativos() from public, anon;

grant execute on function listar_solicitacoes_publicas_demonstrativas() to authenticated;
grant execute on function criar_pre_proposta_para_solicitacao_demonstrativa(uuid, uuid, uuid, text, numeric, numeric, numeric, numeric, text, integer) to authenticated;
grant execute on function listar_orcamentos_demonstrativos() to authenticated;

comment on function criar_pre_proposta_para_solicitacao_demonstrativa(uuid, uuid, uuid, text, numeric, numeric, numeric, numeric, text, integer) is
  'Cria pré-proposta restrita para uma solicitação Cliente ativada da origem demonstracao, com cálculo e auditoria no servidor.';
