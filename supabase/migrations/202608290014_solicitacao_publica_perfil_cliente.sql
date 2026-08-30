-- Ponte segura de homologação: solicitação pública sintética -> conta Cliente autenticada.
-- A origem permanece fixada em demonstracao. Esta migration não habilita recebimento de dados reais.

create table solicitacoes_publicas (
  id uuid primary key default gen_random_uuid(),
  codigo bigint generated always as identity unique,
  origem origem_dado not null default 'demonstracao' check (origem = 'demonstracao'),
  nome text not null check (char_length(trim(nome)) between 2 and 120),
  email_normalizado text not null check (char_length(email_normalizado) between 6 and 254),
  empresa_nome text not null check (char_length(trim(empresa_nome)) between 2 and 180),
  cnpj_sintetico text not null check (cnpj_sintetico ~ '^[0-9]{14}$'),
  telefone text check (telefone is null or char_length(trim(telefone)) between 8 and 30),
  necessidade text not null check (necessidade in (
    'digitalizacao-modelo-3d',
    'medicao-inspecao-dimensional',
    'inspecao-interna-nao-destrutiva',
    'engenharia-reversa-adequacao',
    'analise-falha-desgaste',
    'orientacao-tecnica',
    'outro'
  )),
  necessidade_personalizada text check (necessidade_personalizada is null or char_length(trim(necessidade_personalizada)) <= 500),
  material text not null check (char_length(trim(material)) between 2 and 120),
  quantidade integer not null check (quantidade between 1 and 100000),
  prazo_servico date not null,
  prazo_pagamento_dias integer not null check (prazo_pagamento_dias between 1 and 365),
  descricao text not null check (char_length(trim(descricao)) between 10 and 5000),
  estado text not null default 'recebida' check (estado in ('recebida', 'ativada', 'descartada')),
  token_ativacao_hash text not null unique,
  token_expira_em timestamptz not null default (now() + interval '14 days'),
  ativada_por uuid references auth.users(id),
  ativada_em timestamptz,
  solicitacao_id uuid unique references solicitacoes(id),
  criado_em timestamptz not null default now()
);

create index solicitacoes_publicas_email_idx
  on solicitacoes_publicas (email_normalizado, criado_em desc);

alter table solicitacoes_publicas enable row level security;
revoke all on table solicitacoes_publicas from public, anon, authenticated;
revoke all on sequence solicitacoes_publicas_codigo_seq from public, anon, authenticated;

create or replace function registrar_solicitacao_publica_demonstrativa(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  nome_normalizado text := trim(coalesce(payload->>'nome', ''));
  email_normalizado text := lower(trim(coalesce(payload->>'email', '')));
  empresa_normalizada text := trim(coalesce(payload->>'empresa', ''));
  cnpj_normalizado text := regexp_replace(coalesce(payload->>'cnpj', ''), '[^0-9]', '', 'g');
  telefone_normalizado text := nullif(trim(coalesce(payload->>'telefone', '')), '');
  necessidade_informada text := trim(coalesce(payload->>'necessidade', ''));
  necessidade_personalizada_informada text := nullif(trim(coalesce(payload->>'necessidade_personalizada', '')), '');
  material_informado text := trim(coalesce(payload->>'material', ''));
  quantidade_informada integer;
  prazo_servico_informado date;
  prazo_pagamento_informado integer;
  descricao_informada text := trim(coalesce(payload->>'descricao', ''));
  token_ativacao text := encode(gen_random_bytes(32), 'hex');
  nova_id uuid;
  novo_codigo bigint;
begin
  if nome_normalizado !~ '^.{2,120}$' then
    raise exception 'Nome inválido.' using errcode = '23514';
  end if;
  if email_normalizado !~ '^[a-z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-z0-9.-]+\.test$' then
    raise exception 'Na homologação, use somente um e-mail sintético terminado em .test.' using errcode = '23514';
  end if;
  if empresa_normalizada !~ '^.{2,180}$' then
    raise exception 'Empresa inválida.' using errcode = '23514';
  end if;
  if cnpj_normalizado !~ '^[0-9]{14}$' or cnpj_normalizado ~ '^([0-9])\1{13}$' then
    raise exception 'CNPJ sintético inválido.' using errcode = '23514';
  end if;
  if necessidade_informada not in (
    'digitalizacao-modelo-3d', 'medicao-inspecao-dimensional',
    'inspecao-interna-nao-destrutiva', 'engenharia-reversa-adequacao',
    'analise-falha-desgaste', 'orientacao-tecnica', 'outro'
  ) then
    raise exception 'Necessidade inválida.' using errcode = '23514';
  end if;
  if char_length(material_informado) not between 2 and 120 then
    raise exception 'Material inválido.' using errcode = '23514';
  end if;
  if char_length(descricao_informada) not between 10 and 5000 then
    raise exception 'Descrição deve ter entre 10 e 5000 caracteres.' using errcode = '23514';
  end if;
  if telefone_normalizado is not null and char_length(telefone_normalizado) not between 8 and 30 then
    raise exception 'Telefone inválido.' using errcode = '23514';
  end if;

  begin
    quantidade_informada := (payload->>'quantidade')::integer;
    prazo_servico_informado := (payload->>'prazo_servico')::date;
    prazo_pagamento_informado := (payload->>'prazo_pagamento_dias')::integer;
  exception when others then
    raise exception 'Quantidade ou prazos inválidos.' using errcode = '23514';
  end;

  if quantidade_informada not between 1 and 100000
    or prazo_pagamento_informado not between 1 and 365
    or prazo_servico_informado < current_date then
    raise exception 'Quantidade ou prazos fora do intervalo permitido.' using errcode = '23514';
  end if;

  if exists (
    select 1 from solicitacoes_publicas sp
    where sp.email_normalizado = registrar_solicitacao_publica_demonstrativa.email_normalizado
      and sp.criado_em > now() - interval '1 hour'
    group by sp.email_normalizado
    having count(*) >= 3
  ) then
    raise exception 'Limite temporário de solicitações atingido.' using errcode = 'P0001';
  end if;

  insert into solicitacoes_publicas (
    nome, email_normalizado, empresa_nome, cnpj_sintetico, telefone,
    necessidade, necessidade_personalizada, material, quantidade,
    prazo_servico, prazo_pagamento_dias, descricao, token_ativacao_hash
  ) values (
    nome_normalizado, email_normalizado, empresa_normalizada, cnpj_normalizado, telefone_normalizado,
    necessidade_informada, necessidade_personalizada_informada, material_informado, quantidade_informada,
    prazo_servico_informado, prazo_pagamento_informado, descricao_informada,
    encode(digest(token_ativacao, 'sha256'), 'hex')
  ) returning id, codigo into nova_id, novo_codigo;

  insert into auditoria (origem, acao, entidade, entidade_id, dados)
  values ('demonstracao', 'receber_solicitacao_publica', 'solicitacoes_publicas', nova_id,
    jsonb_build_object('codigo', novo_codigo, 'necessidade', necessidade_informada));

  return jsonb_build_object(
    'id', nova_id,
    'codigo', novo_codigo,
    'token_ativacao', token_ativacao,
    'token_expira_em', now() + interval '14 days'
  );
end;
$$;

create or replace function ativar_solicitacao_cliente_demonstrativa(token_ativacao text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  usuario uuid := auth.uid();
  email_usuario text := lower(trim(coalesce(auth.jwt()->>'email', '')));
  entrada solicitacoes_publicas%rowtype;
  empresa_nova uuid;
  solicitacao_nova uuid;
  servico_novo uuid;
  servico_slug text;
begin
  if usuario is null then
    raise exception 'Autenticação necessária.' using errcode = '42501';
  end if;
  if usuario_interno() then
    raise exception 'Perfis internos não podem ativar acesso de Cliente.' using errcode = '42501';
  end if;
  if nullif(trim(token_ativacao), '') is null or char_length(token_ativacao) <> 64 then
    raise exception 'Token de ativação inválido.' using errcode = '23514';
  end if;

  select * into entrada
  from solicitacoes_publicas sp
  where sp.token_ativacao_hash = encode(digest(trim(token_ativacao), 'sha256'), 'hex')
  for update;

  if entrada.id is null or entrada.token_expira_em < now() then
    raise exception 'Token de ativação inválido ou expirado.' using errcode = '42501';
  end if;
  if entrada.email_normalizado <> email_usuario then
    raise exception 'Entre com o mesmo e-mail usado na solicitação.' using errcode = '42501';
  end if;
  if entrada.estado = 'ativada' then
    if entrada.ativada_por <> usuario then
      raise exception 'Esta solicitação já foi vinculada.' using errcode = '42501';
    end if;
    return jsonb_build_object('solicitacao_id', entrada.solicitacao_id, 'codigo', entrada.codigo, 'ja_ativada', true);
  end if;
  if entrada.estado <> 'recebida' then
    raise exception 'Esta solicitação não pode mais ser ativada.' using errcode = '42501';
  end if;
  if exists (select 1 from vinculos_empresa where usuario_id = usuario and unico_ativo) then
    raise exception 'Este usuário já possui vínculo ativo com uma empresa.' using errcode = '23505';
  end if;

  servico_slug := case entrada.necessidade
    when 'digitalizacao-modelo-3d' then 'escaneamento-3d-digitalizacao-pecas'
    when 'medicao-inspecao-dimensional' then 'metrologia-avancada-inspecao-dimensional'
    when 'inspecao-interna-nao-destrutiva' then 'tomografia-industrial'
    when 'engenharia-reversa-adequacao' then 'engenharia-reversa-reconstrucao-cad'
    when 'analise-falha-desgaste' then 'mapa-desgaste'
    else 'escaneamento-3d-digitalizacao-pecas'
  end;

  select id into servico_novo from servicos_catalogo where slug = servico_slug and ativo;
  if servico_novo is null then
    raise exception 'Serviço demonstrativo indisponível.' using errcode = '23503';
  end if;

  insert into perfis (usuario_id, nome, perfil_interno, origem_ativa)
  values (usuario, entrada.nome, null, 'demonstracao')
  on conflict (usuario_id) do update set nome = excluded.nome
  where perfis.perfil_interno is null;

  insert into empresas (origem, visibilidade, razao_social, documento_cifrado)
  values ('demonstracao', 'restrito', entrada.empresa_nome, 'DEMONSTRACAO:' || entrada.cnpj_sintetico)
  returning id into empresa_nova;

  insert into vinculos_empresa (empresa_id, usuario_id, perfil, aprovado_em, aprovado_por, unico_ativo)
  values (empresa_nova, usuario, 'gestor_empresa', now(), usuario, true);

  insert into solicitacoes (
    origem, visibilidade, empresa_id, solicitante_id, servico_catalogo_id, respostas, estado
  ) values (
    'demonstracao', 'restrito', empresa_nova, usuario, servico_novo,
    jsonb_build_object(
      'material', entrada.material,
      'quantidade', entrada.quantidade,
      'prazo_servico', entrada.prazo_servico,
      'prazo_pagamento_dias', entrada.prazo_pagamento_dias,
      'descricao', entrada.descricao,
      'necessidade', entrada.necessidade,
      'necessidade_personalizada', entrada.necessidade_personalizada,
      'origem_publica_id', entrada.id
    ),
    'nova'
  ) returning id into solicitacao_nova;

  update solicitacoes_publicas
  set estado = 'ativada', ativada_por = usuario, ativada_em = now(), solicitacao_id = solicitacao_nova
  where id = entrada.id;

  insert into auditoria (origem, usuario_id, acao, entidade, entidade_id, dados)
  values ('demonstracao', usuario, 'ativar_portal_cliente', 'solicitacoes', solicitacao_nova,
    jsonb_build_object('solicitacao_publica_id', entrada.id, 'codigo_publico', entrada.codigo));

  return jsonb_build_object('solicitacao_id', solicitacao_nova, 'codigo', entrada.codigo, 'ja_ativada', false);
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
    'usuario_nome', coalesce(p.nome, 'Cliente'),
    'usuario_email', auth.jwt()->>'email',
    'aceite_privacidade_em', v.aceite_privacidade_em,
    'versao_aviso_privacidade', v.versao_aviso_privacidade
  )
  from vinculos_empresa v
  join empresas e on e.id = v.empresa_id
  left join perfis p on p.usuario_id = v.usuario_id
  where v.usuario_id = auth.uid()
    and v.aprovado_em is not null
    and v.unico_ativo
    and e.origem = 'demonstracao'
  order by v.aprovado_em desc
  limit 1;
$$;

create or replace function atualizar_nome_cliente(nome text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  nome_normalizado text := trim(coalesce(nome, ''));
begin
  if char_length(nome_normalizado) not between 2 and 120 then
    raise exception 'Nome deve ter entre 2 e 120 caracteres.' using errcode = '23514';
  end if;
  if not exists (
    select 1 from vinculos_empresa v join empresas e on e.id = v.empresa_id
    where v.usuario_id = auth.uid() and v.aprovado_em is not null and v.unico_ativo
      and e.origem = 'demonstracao'
  ) then
    raise exception 'Vínculo de Cliente não encontrado.' using errcode = '42501';
  end if;

  insert into perfis (usuario_id, nome, perfil_interno, origem_ativa)
  values (auth.uid(), nome_normalizado, null, 'demonstracao')
  on conflict (usuario_id) do update set nome = excluded.nome
  where perfis.perfil_interno is null;

  return nome_normalizado;
end;
$$;

create or replace function listar_solicitacoes_publicas_demonstrativas()
returns table (
  id uuid,
  codigo bigint,
  nome text,
  email text,
  empresa text,
  necessidade text,
  estado text,
  criado_em timestamptz
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

  return query
  select sp.id, sp.codigo, sp.nome, sp.email_normalizado, sp.empresa_nome,
    sp.necessidade, sp.estado, sp.criado_em
  from solicitacoes_publicas sp
  where sp.origem = 'demonstracao'
  order by sp.criado_em desc;
end;
$$;

revoke all on function registrar_solicitacao_publica_demonstrativa(jsonb) from public;
revoke all on function ativar_solicitacao_cliente_demonstrativa(text) from public, anon;
revoke all on function obter_contexto_cliente() from public, anon;
revoke all on function atualizar_nome_cliente(text) from public, anon;
revoke all on function listar_solicitacoes_publicas_demonstrativas() from public, anon;

grant execute on function registrar_solicitacao_publica_demonstrativa(jsonb) to anon, authenticated;
grant execute on function ativar_solicitacao_cliente_demonstrativa(text) to authenticated;
grant execute on function obter_contexto_cliente() to authenticated;
grant execute on function atualizar_nome_cliente(text) to authenticated;
grant execute on function listar_solicitacoes_publicas_demonstrativas() to authenticated;

comment on table solicitacoes_publicas is
  'Entrada pública estritamente demonstrativa. Produção exigirá endpoint protegido, criptografia e ambiente real separado.';
comment on function ativar_solicitacao_cliente_demonstrativa(text) is
  'Vincula uma entrada sintética ao mesmo e-mail autenticado e cria o contexto externo do Cliente.';
