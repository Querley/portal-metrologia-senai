-- Pré-proposta do laboratório e primeiro acompanhamento externo em homologação.
-- O documento oficial do SENAI é produzido no Nectar, sem integração com este portal.
-- Toda consulta externa deste recorte permanece limitada à origem demonstracao.

alter table versoes_proposta
  add column destinatario text not null default 'Destinatário demonstrativo'
    check (char_length(trim(destinatario)) between 2 and 160),
  add column prazo_pagamento_dias integer not null default 30
    check (prazo_pagamento_dias between 1 and 365);

comment on column versoes_proposta.destinatario is
  'Destinatário exibido na pré-proposta informal do laboratório.';
comment on column versoes_proposta.prazo_pagamento_dias is
  'Prazo de pagamento desejado pelo cliente; não substitui a condição da proposta oficial no Nectar.';

alter table vinculos_empresa
  add column aceite_privacidade_em timestamptz,
  add column versao_aviso_privacidade text;

create table etapas_execucao (
  id uuid primary key default gen_random_uuid(),
  execucao_id uuid not null references execucoes_servico(id) on delete cascade,
  origem origem_dado not null,
  ordem integer not null check (ordem > 0),
  titulo text not null check (char_length(trim(titulo)) between 2 and 120),
  descricao text check (descricao is null or char_length(trim(descricao)) between 2 and 500),
  estado text not null default 'a_fazer' check (estado in ('a_fazer', 'em_andamento', 'concluida')),
  progresso integer not null default 0 check (progresso between 0 and 100),
  visivel_cliente boolean not null default true,
  atualizada_em timestamptz not null default now(),
  unique (execucao_id, ordem),
  check ((estado = 'concluida' and progresso = 100) or estado <> 'concluida'),
  check ((estado = 'a_fazer' and progresso = 0) or estado <> 'a_fazer')
);

create index etapas_execucao_ordem_idx on etapas_execucao (execucao_id, ordem);

create or replace function validar_origem_etapa_execucao()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.origem <> (select origem from execucoes_servico where id = new.execucao_id) then
    raise exception 'origem divergente';
  end if;
  return new;
end;
$$;

create trigger etapas_execucao_origem
before insert or update on etapas_execucao
for each row execute function validar_origem_etapa_execucao();

alter table etapas_execucao enable row level security;

create policy "etapas visiveis aos participantes"
on etapas_execucao for select to authenticated
using (
  origem = 'demonstracao'
  and (
    usuario_interno()
    or (
      visivel_cliente
      and exists (
        select 1
        from execucoes_servico ex
        join itens_proposta i on i.id = ex.item_proposta_id
        join versoes_proposta v on v.id = i.versao_proposta_id
        join propostas p on p.id = v.proposta_id
        where ex.id = execucao_id
          and usuario_da_empresa(p.empresa_id)
      )
    )
  )
);

create policy "equipe gerencia etapas demonstrativas"
on etapas_execucao for all to authenticated
using (origem = origem_ativa_atual() and perfil_interno_atual() in ('tecnico', 'validador', 'administrador'))
with check (origem = origem_ativa_atual() and perfil_interno_atual() in ('tecnico', 'validador', 'administrador'));

grant select, insert, update, delete on table etapas_execucao to authenticated;

create or replace function criar_pre_proposta_demonstrativa(
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
  nova_versao uuid;
begin
  if nullif(trim(destinatario), '') is null or char_length(trim(destinatario)) not between 2 and 160 then
    raise exception 'Destinatário deve ter entre 2 e 160 caracteres.' using errcode = '23514';
  end if;
  if prazo_pagamento_dias is null or prazo_pagamento_dias not between 1 and 365 then
    raise exception 'Prazo de pagamento deve estar entre 1 e 365 dias.' using errcode = '23514';
  end if;

  nova_versao := criar_orcamento_demonstrativo(
    servico, equipamento, descricao, quantidade, horas, custos_extras, percentual_lucro
  );

  update versoes_proposta v
  set destinatario = trim(criar_pre_proposta_demonstrativa.destinatario),
      prazo_pagamento_dias = criar_pre_proposta_demonstrativa.prazo_pagamento_dias
  where v.id = nova_versao;

  insert into auditoria (origem, usuario_id, acao, entidade, entidade_id, dados)
  values ('demonstracao', auth.uid(), 'definir_dados_pre_proposta', 'versoes_proposta', nova_versao,
    jsonb_build_object('prazo_pagamento_dias', prazo_pagamento_dias));

  return nova_versao;
end;
$$;

create or replace function revisar_pre_proposta_demonstrativa(
  versao uuid,
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
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if nullif(trim(destinatario), '') is null or char_length(trim(destinatario)) not between 2 and 160 then
    raise exception 'Destinatário deve ter entre 2 e 160 caracteres.' using errcode = '23514';
  end if;
  if prazo_pagamento_dias is null or prazo_pagamento_dias not between 1 and 365 then
    raise exception 'Prazo de pagamento deve estar entre 1 e 365 dias.' using errcode = '23514';
  end if;

  perform revisar_orcamento_demonstrativo(
    versao, servico, equipamento, descricao, quantidade, horas, custos_extras, percentual_lucro
  );

  update versoes_proposta v
  set destinatario = trim(revisar_pre_proposta_demonstrativa.destinatario),
      prazo_pagamento_dias = revisar_pre_proposta_demonstrativa.prazo_pagamento_dias
  where v.id = versao;

  insert into auditoria (origem, usuario_id, acao, entidade, entidade_id, dados)
  values ('demonstracao', auth.uid(), 'revisar_dados_pre_proposta', 'versoes_proposta', versao,
    jsonb_build_object('prazo_pagamento_dias', prazo_pagamento_dias));
end;
$$;

create or replace function listar_dados_pre_propostas_demonstrativas()
returns table (versao_id uuid, destinatario text, prazo_pagamento_dias integer)
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
  select pf.perfil_interno, pf.origem_ativa into perfil, origem_sessao
  from perfis pf where pf.usuario_id = usuario;

  if perfil is null or perfil not in ('tecnico', 'validador', 'administrador') then
    raise exception 'Perfil sem acesso às pré-propostas.' using errcode = '42501';
  end if;

  return query
  select v.id, v.destinatario, v.prazo_pagamento_dias
  from versoes_proposta v
  join propostas p on p.id = v.proposta_id
  where v.origem = origem_sessao
    and p.origem = origem_sessao
    and (perfil in ('validador', 'administrador') or p.criado_por = usuario);
end;
$$;

create or replace function obter_dados_pre_proposta_demonstrativa(versao uuid)
returns table (destinatario text, prazo_pagamento_dias integer)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  usuario uuid := auth.uid();
begin
  return query
  select v.destinatario, v.prazo_pagamento_dias
  from versoes_proposta v
  join propostas p on p.id = v.proposta_id
  join perfis pf on pf.usuario_id = usuario
  where v.id = versao
    and v.origem = pf.origem_ativa
    and p.criado_por = usuario
    and pf.perfil_interno in ('tecnico', 'validador', 'administrador')
    and v.estado in ('rascunho', 'devolvida');

  if not found then
    raise exception 'Pré-proposta editável não encontrada para o autor.' using errcode = '23503';
  end if;
end;
$$;

create or replace function obter_contexto_cliente()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'vinculo_id', v.id,
    'empresa_id', e.id,
    'empresa_nome', e.razao_social,
    'perfil', v.perfil,
    'origem', e.origem,
    'aceite_privacidade_em', v.aceite_privacidade_em,
    'versao_aviso_privacidade', v.versao_aviso_privacidade
  )
  from vinculos_empresa v
  join empresas e on e.id = v.empresa_id
  where v.usuario_id = auth.uid()
    and v.aprovado_em is not null
    and v.unico_ativo
    and e.origem = 'demonstracao'
  order by v.aprovado_em desc
  limit 1;
$$;

create or replace function registrar_aceite_privacidade_cliente(versao text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if nullif(trim(versao), '') is null or char_length(versao) > 80 then
    raise exception 'Versão do aviso inválida.' using errcode = '23514';
  end if;

  update vinculos_empresa v
  set aceite_privacidade_em = now(), versao_aviso_privacidade = trim(versao)
  from empresas e
  where v.empresa_id = e.id
    and v.usuario_id = auth.uid()
    and v.aprovado_em is not null
    and v.unico_ativo
    and e.origem = 'demonstracao';

  if not found then
    raise exception 'Vínculo externo aprovado não encontrado.' using errcode = '42501';
  end if;
end;
$$;

create or replace function listar_portal_cliente()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(registro order by (registro->>'criada_em') desc), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'id', s.id,
      'codigo', s.codigo,
      'estado', s.estado,
      'criada_em', s.criado_em,
      'servico', sc.slug,
      'proposta_estado', (
        select vp.estado from propostas p join versoes_proposta vp on vp.proposta_id = p.id
        where p.solicitacao_id = s.id and vp.estado in ('publicada', 'aceita')
        order by vp.numero desc limit 1
      ),
      'valor_pre_proposta', (
        select vp.total_moeda from propostas p join versoes_proposta vp on vp.proposta_id = p.id
        where p.solicitacao_id = s.id and vp.estado in ('publicada', 'aceita')
        order by vp.numero desc limit 1
      ),
      'prazo_pagamento_dias', (
        select vp.prazo_pagamento_dias from propostas p join versoes_proposta vp on vp.proposta_id = p.id
        where p.solicitacao_id = s.id and vp.estado in ('publicada', 'aceita')
        order by vp.numero desc limit 1
      ),
      'etapas', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', et.id,
          'titulo', et.titulo,
          'descricao', et.descricao,
          'ordem', et.ordem,
          'estado', et.estado,
          'progresso', et.progresso,
          'atualizada_em', et.atualizada_em
        ) order by et.ordem), '[]'::jsonb)
        from propostas p
        join versoes_proposta vp on vp.proposta_id = p.id
        join itens_proposta ip on ip.versao_proposta_id = vp.id
        join execucoes_servico ex on ex.item_proposta_id = ip.id
        join etapas_execucao et on et.execucao_id = ex.id
        where p.solicitacao_id = s.id and et.visivel_cliente and et.origem = 'demonstracao'
      )
    ) as registro
    from solicitacoes s
    join servicos_catalogo sc on sc.id = s.servico_catalogo_id
    where s.origem = 'demonstracao'
      and usuario_da_empresa(s.empresa_id)
  ) dados;
$$;

create or replace function listar_mensagens_cliente(solicitacao uuid)
returns table (id uuid, autor_proprio boolean, conteudo text, criada_em timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from solicitacoes s
    where s.id = solicitacao and s.origem = 'demonstracao' and usuario_da_empresa(s.empresa_id)
  ) then
    raise exception 'Solicitação não disponível para este usuário.' using errcode = '42501';
  end if;

  return query
  select m.id, m.autor_id = auth.uid(), m.conteudo, m.criada_em
  from mensagens m
  where m.solicitacao_id = solicitacao and m.origem = 'demonstracao'
  order by m.criada_em;
end;
$$;

create or replace function enviar_mensagem_cliente(solicitacao uuid, conteudo text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  mensagem_id uuid;
begin
  if nullif(trim(conteudo), '') is null or char_length(trim(conteudo)) > 5000 then
    raise exception 'Mensagem deve ter entre 1 e 5000 caracteres.' using errcode = '23514';
  end if;
  if not exists (
    select 1 from solicitacoes s
    where s.id = solicitacao and s.origem = 'demonstracao' and usuario_da_empresa(s.empresa_id)
  ) then
    raise exception 'Solicitação não disponível para este usuário.' using errcode = '42501';
  end if;

  insert into mensagens (origem, visibilidade, solicitacao_id, autor_id, conteudo)
  values ('demonstracao', 'restrito', solicitacao, auth.uid(), trim(conteudo))
  returning id into mensagem_id;
  return mensagem_id;
end;
$$;

revoke all on function criar_pre_proposta_demonstrativa(uuid, uuid, text, numeric, numeric, numeric, numeric, text, integer) from public, anon;
revoke all on function revisar_pre_proposta_demonstrativa(uuid, uuid, uuid, text, numeric, numeric, numeric, numeric, text, integer) from public, anon;
revoke all on function listar_dados_pre_propostas_demonstrativas() from public, anon;
revoke all on function obter_dados_pre_proposta_demonstrativa(uuid) from public, anon;
revoke all on function obter_contexto_cliente() from public, anon;
revoke all on function registrar_aceite_privacidade_cliente(text) from public, anon;
revoke all on function listar_portal_cliente() from public, anon;
revoke all on function listar_mensagens_cliente(uuid) from public, anon;
revoke all on function enviar_mensagem_cliente(uuid, text) from public, anon;

grant execute on function criar_pre_proposta_demonstrativa(uuid, uuid, text, numeric, numeric, numeric, numeric, text, integer) to authenticated;
grant execute on function revisar_pre_proposta_demonstrativa(uuid, uuid, uuid, text, numeric, numeric, numeric, numeric, text, integer) to authenticated;
grant execute on function listar_dados_pre_propostas_demonstrativas() to authenticated;
grant execute on function obter_dados_pre_proposta_demonstrativa(uuid) to authenticated;
grant execute on function obter_contexto_cliente() to authenticated;
grant execute on function registrar_aceite_privacidade_cliente(text) to authenticated;
grant execute on function listar_portal_cliente() to authenticated;
grant execute on function listar_mensagens_cliente(uuid) to authenticated;
grant execute on function enviar_mensagem_cliente(uuid, text) to authenticated;

comment on table etapas_execucao is
  'Etapas visuais do trabalho. Em homologação, somente dados demonstrativos podem ser expostos ao cliente vinculado.';
comment on function obter_contexto_cliente() is
  'Resolve somente vínculo externo aprovado na origem demonstracao.';
comment on function listar_portal_cliente() is
  'Entrega acompanhamento, pré-proposta emitida e etapas visíveis somente da empresa vinculada.';
