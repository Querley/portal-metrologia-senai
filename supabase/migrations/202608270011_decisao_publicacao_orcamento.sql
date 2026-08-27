-- Validador e Administrador devolvem ou rejeitam com justificativa.
-- Somente Administrador publica, e apenas quando PDF e hash imutável existem.

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
  publicacao_pronta boolean
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
    v.ultima_justificativa_interna,
    p.criado_por = usuario and v.estado in ('rascunho', 'devolvida'),
    perfil in ('validador', 'administrador') and v.estado = 'em_validacao',
    perfil in ('validador', 'administrador') and v.estado = 'em_validacao',
    perfil in ('validador', 'administrador') and v.estado = 'em_validacao',
    perfil = 'administrador' and v.estado = 'aprovada',
    v.pdf_caminho is not null and v.hash_conteudo is not null
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

  if estado_atual not in ('rascunho'::estado_proposta, 'devolvida'::estado_proposta) then
    raise exception 'Somente rascunho ou orçamento devolvido pode ser enviado para validação.' using errcode = '23514';
  end if;

  update versoes_proposta
  set estado = 'em_validacao',
      enviada_em = now(),
      enviada_por = usuario,
      ultima_justificativa_interna = null,
      ultima_decisao_em = null,
      ultima_decisao_por = null
  where id = versao;

  insert into auditoria (origem, usuario_id, acao, entidade, entidade_id, dados)
  values (
    origem_sessao,
    usuario,
    'enviar_orcamento_validacao',
    'versoes_proposta',
    versao,
    jsonb_build_object('estado_anterior', estado_atual, 'estado_novo', 'em_validacao')
  );
end;
$$;

create or replace function decidir_orcamento_demonstrativo(
  versao uuid,
  decisao text,
  justificativa text
)
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
  justificativa_normalizada text := trim(justificativa);
  novo_estado estado_proposta;
  acao_auditoria text;
begin
  select p.perfil_interno, p.origem_ativa
    into perfil, origem_sessao
  from perfis p
  where p.usuario_id = usuario;

  if perfil is null or perfil not in ('validador', 'administrador') then
    raise exception 'Somente Validador ou Administrador pode devolver ou rejeitar orçamento.' using errcode = '42501';
  end if;

  if origem_sessao is distinct from 'demonstracao'::origem_dado then
    raise exception 'Esta função aceita somente a origem demonstracao.' using errcode = '23514';
  end if;

  if decisao not in ('devolver', 'rejeitar') then
    raise exception 'Decisão interna inválida.' using errcode = '23514';
  end if;

  if justificativa_normalizada is null or char_length(justificativa_normalizada) not between 5 and 500 then
    raise exception 'A justificativa deve ter entre 5 e 500 caracteres.' using errcode = '23514';
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
    raise exception 'Somente orçamento em validação pode ser devolvido ou rejeitado.' using errcode = '23514';
  end if;

  if decisao = 'devolver' then
    novo_estado := 'devolvida';
    acao_auditoria := 'devolver_orcamento_demonstrativo';
  else
    novo_estado := 'rejeitada';
    acao_auditoria := 'rejeitar_orcamento_demonstrativo';
  end if;

  update versoes_proposta
  set estado = novo_estado,
      ultima_justificativa_interna = justificativa_normalizada,
      ultima_decisao_em = now(),
      ultima_decisao_por = usuario
  where id = versao;

  insert into auditoria (origem, usuario_id, acao, entidade, entidade_id, dados)
  values (
    origem_sessao,
    usuario,
    acao_auditoria,
    'versoes_proposta',
    versao,
    jsonb_build_object(
      'estado_anterior', 'em_validacao',
      'estado_novo', novo_estado,
      'justificativa', justificativa_normalizada
    )
  );
end;
$$;

create or replace function publicar_orcamento_demonstrativo(versao uuid)
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
  caminho_pdf text;
  hash_pdf text;
begin
  select p.perfil_interno, p.origem_ativa
    into perfil, origem_sessao
  from perfis p
  where p.usuario_id = usuario;

  if perfil is distinct from 'administrador'::perfil_interno then
    raise exception 'Somente Administrador pode publicar orçamento.' using errcode = '42501';
  end if;

  if origem_sessao is distinct from 'demonstracao'::origem_dado then
    raise exception 'Esta função aceita somente a origem demonstracao.' using errcode = '23514';
  end if;

  select v.estado, v.origem, v.pdf_caminho, v.hash_conteudo
    into estado_atual, origem_orcamento, caminho_pdf, hash_pdf
  from versoes_proposta v
  where v.id = versao
  for update;

  if not found or origem_orcamento is distinct from origem_sessao then
    raise exception 'Orçamento não encontrado na origem ativa.' using errcode = '23503';
  end if;

  if estado_atual is distinct from 'aprovada'::estado_proposta then
    raise exception 'Somente orçamento aprovado pode ser publicado.' using errcode = '23514';
  end if;

  if nullif(trim(caminho_pdf), '') is null or nullif(trim(hash_pdf), '') is null then
    raise exception 'A publicação exige PDF privado e hash imutável.' using errcode = '23514';
  end if;

  update versoes_proposta
  set estado = 'publicada', publicada_em = now()
  where id = versao;

  insert into auditoria (origem, usuario_id, acao, entidade, entidade_id, dados)
  values (
    origem_sessao,
    usuario,
    'publicar_orcamento_demonstrativo',
    'versoes_proposta',
    versao,
    jsonb_build_object('estado_anterior', 'aprovada', 'estado_novo', 'publicada', 'hash_conteudo', hash_pdf)
  );
end;
$$;

revoke all on function listar_orcamentos_demonstrativos() from public, anon;
revoke all on function enviar_orcamento_para_validacao(uuid) from public, anon;
revoke all on function decidir_orcamento_demonstrativo(uuid, text, text) from public, anon;
revoke all on function publicar_orcamento_demonstrativo(uuid) from public, anon;

grant execute on function listar_orcamentos_demonstrativos() to authenticated;
grant execute on function enviar_orcamento_para_validacao(uuid) to authenticated;
grant execute on function decidir_orcamento_demonstrativo(uuid, text, text) to authenticated;
grant execute on function publicar_orcamento_demonstrativo(uuid) to authenticated;

comment on function enviar_orcamento_para_validacao(uuid) is
  'Envia ou reenvia o orçamento do próprio autor para validação e registra auditoria.';
comment on function decidir_orcamento_demonstrativo(uuid, text, text) is
  'Devolve ou rejeita orçamento demonstrativo com justificativa; somente Validador ou Administrador.';
comment on function publicar_orcamento_demonstrativo(uuid) is
  'Publica orçamento aprovado com PDF e hash imutável; somente Administrador.';

