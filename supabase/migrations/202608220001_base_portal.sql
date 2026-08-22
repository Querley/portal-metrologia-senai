create extension if not exists pgcrypto;

create type origem_dado as enum ('real', 'demonstracao');
create type visibilidade_dado as enum ('interno', 'restrito');
create type perfil_interno as enum ('consulta', 'tecnico', 'validador', 'administrador');
create type perfil_externo as enum ('contato', 'gestor_empresa');
create type estado_proposta as enum ('rascunho', 'em_validacao', 'publicada', 'aceita', 'recusada', 'expirada', 'substituida');
create type estado_servico as enum ('planejado', 'em_execucao', 'concluido', 'cancelado');
create type estado_licao as enum ('rascunho', 'em_validacao', 'formalizada', 'superada');
create type estado_conteudo as enum ('rascunho', 'publicado', 'arquivado');

create table perfis (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  nome text not null check (char_length(nome) between 2 and 120),
  perfil_interno perfil_interno,
  criado_em timestamptz not null default now(),
  check (perfil_interno is null or usuario_id is not null)
);

create table empresas (
  id uuid primary key default gen_random_uuid(),
  origem origem_dado not null,
  visibilidade visibilidade_dado not null default 'restrito',
  razao_social text not null,
  documento_cifrado text,
  criado_em timestamptz not null default now()
);

create table vinculos_empresa (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  perfil perfil_externo not null default 'contato',
  aprovado_em timestamptz,
  aprovado_por uuid references auth.users(id),
  unico_ativo boolean not null default true,
  unique (empresa_id, usuario_id)
);

create table servicos_catalogo (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  ativo boolean not null default true,
  perguntas jsonb not null default '[]'::jsonb,
  criado_em timestamptz not null default now()
);

create table equipamentos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome text not null,
  ativo boolean not null default true
);

create table custos_equipamento (
  id uuid primary key default gen_random_uuid(),
  equipamento_id uuid not null references equipamentos(id),
  custo_hora numeric(18,6) not null check (custo_hora >= 0),
  vigente_desde date not null,
  vigente_ate date,
  origem_fonte text not null,
  criado_por uuid references auth.users(id),
  criado_em timestamptz not null default now(),
  check (vigente_ate is null or vigente_ate >= vigente_desde),
  unique (equipamento_id, vigente_desde)
);

create table solicitacoes (
  id uuid primary key default gen_random_uuid(),
  codigo bigint generated always as identity unique,
  origem origem_dado not null,
  visibilidade visibilidade_dado not null default 'restrito',
  empresa_id uuid not null references empresas(id),
  solicitante_id uuid not null references auth.users(id),
  servico_catalogo_id uuid not null references servicos_catalogo(id),
  respostas jsonb not null default '{}'::jsonb,
  estado text not null default 'nova' check (estado in ('nova','em_analise','orcada','cancelada')),
  criado_em timestamptz not null default now()
);

create table anexos_solicitacao (
  id uuid primary key default gen_random_uuid(),
  solicitacao_id uuid not null references solicitacoes(id) on delete cascade,
  origem origem_dado not null,
  caminho_storage text not null unique,
  nome_original text not null,
  tipo_mime text not null,
  tamanho_bytes bigint not null check (tamanho_bytes > 0 and tamanho_bytes <= 52428800),
  criado_em timestamptz not null default now()
);

create table propostas (
  id uuid primary key default gen_random_uuid(),
  origem origem_dado not null,
  visibilidade visibilidade_dado not null default 'restrito',
  solicitacao_id uuid not null references solicitacoes(id),
  empresa_id uuid not null references empresas(id),
  criado_por uuid not null references auth.users(id),
  criado_em timestamptz not null default now()
);

create table versoes_proposta (
  id uuid primary key default gen_random_uuid(),
  proposta_id uuid not null references propostas(id) on delete cascade,
  numero integer not null check (numero > 0),
  origem origem_dado not null,
  estado estado_proposta not null default 'rascunho',
  moeda text not null default 'BRL' check (moeda in ('BRL','USD','EUR')),
  cotacao_brl numeric(18,8) not null default 1 check (cotacao_brl > 0),
  ajuste_comercial numeric(18,6) not null default 0,
  justificativa_ajuste text,
  total_brl numeric(18,6) not null default 0,
  total_moeda numeric(18,6) not null default 0,
  expira_em timestamptz,
  pdf_caminho text,
  publicada_em timestamptz,
  hash_conteudo text,
  criada_por uuid not null references auth.users(id),
  criada_em timestamptz not null default now(),
  unique (proposta_id, numero),
  check (ajuste_comercial = 0 or char_length(trim(coalesce(justificativa_ajuste,''))) > 0),
  check ((moeda = 'BRL' and cotacao_brl = 1) or moeda <> 'BRL')
);

create table itens_proposta (
  id uuid primary key default gen_random_uuid(),
  versao_proposta_id uuid not null references versoes_proposta(id) on delete cascade,
  origem origem_dado not null,
  servico_catalogo_id uuid not null references servicos_catalogo(id),
  descricao text not null,
  quantidade numeric(18,6) not null check (quantidade > 0),
  custos_extras numeric(18,6) not null default 0,
  percentual_lucro numeric(9,6) not null,
  custo_congelado numeric(18,6) not null,
  preco_antes_ajuste numeric(18,6) not null,
  ajuste_rateado numeric(18,6) not null default 0,
  preco_final numeric(18,6) not null
);

create table usos_equipamento_proposta (
  id uuid primary key default gen_random_uuid(),
  item_proposta_id uuid not null references itens_proposta(id) on delete cascade,
  equipamento_id uuid not null references equipamentos(id),
  horas numeric(18,6) not null check (horas >= 0),
  custo_hora_congelado numeric(18,6) not null check (custo_hora_congelado >= 0)
);

create table execucoes_servico (
  id uuid primary key default gen_random_uuid(),
  origem origem_dado not null,
  visibilidade visibilidade_dado not null default 'restrito',
  item_proposta_id uuid not null unique references itens_proposta(id),
  estado estado_servico not null default 'planejado',
  inicio_planejado timestamptz,
  entrega_planejada timestamptz,
  inicio_real timestamptz,
  entrega_real timestamptz,
  valor_cobrado numeric(18,6),
  custos_extras_reais numeric(18,6),
  retrabalho boolean,
  mudanca_escopo boolean,
  causa_principal text,
  causas_secundarias text[] not null default '{}',
  criado_em timestamptz not null default now()
);

create table horas_reais_equipamento (
  id uuid primary key default gen_random_uuid(),
  execucao_id uuid not null references execucoes_servico(id) on delete cascade,
  origem origem_dado not null,
  equipamento_id uuid not null references equipamentos(id),
  horas numeric(18,6) not null check (horas >= 0),
  custo_hora_inicio_real numeric(18,6) not null check (custo_hora_inicio_real >= 0),
  unique (execucao_id, equipamento_id)
);

create table licoes (
  id uuid primary key default gen_random_uuid(),
  origem origem_dado not null,
  visibilidade visibilidade_dado not null default 'restrito',
  execucao_id uuid not null unique references execucoes_servico(id),
  estado estado_licao not null default 'rascunho',
  revisao_atual integer not null default 1,
  superada_motivo text,
  substituta_id uuid references licoes(id),
  criada_em timestamptz not null default now()
);

create table revisoes_licao (
  id uuid primary key default gen_random_uuid(),
  licao_id uuid not null references licoes(id) on delete cascade,
  numero integer not null,
  resumo text not null,
  assuntos text[] not null default '{}',
  criada_por uuid not null references auth.users(id),
  criada_em timestamptz not null default now(),
  validada_por uuid references auth.users(id),
  validada_em timestamptz,
  unique (licao_id, numero)
);

create table mensagens (
  id uuid primary key default gen_random_uuid(),
  origem origem_dado not null,
  visibilidade visibilidade_dado not null default 'restrito',
  solicitacao_id uuid not null references solicitacoes(id) on delete cascade,
  autor_id uuid not null references auth.users(id),
  conteudo text not null check (char_length(conteudo) between 1 and 5000),
  criada_em timestamptz not null default now()
);

create table conteudos (
  id uuid primary key default gen_random_uuid(),
  chave text not null unique,
  tipo text not null,
  estado estado_conteudo not null default 'rascunho',
  versao_publicada_id uuid,
  criado_em timestamptz not null default now()
);

create table versoes_conteudo (
  id uuid primary key default gen_random_uuid(),
  conteudo_id uuid not null references conteudos(id) on delete cascade,
  numero integer not null,
  idioma text not null check (idioma in ('pt-BR','en','de')),
  titulo text not null,
  corpo jsonb not null,
  criada_por uuid references auth.users(id),
  criada_em timestamptz not null default now(),
  unique (conteudo_id, numero, idioma)
);

alter table conteudos add constraint conteudos_versao_publicada_fk foreign key (versao_publicada_id) references versoes_conteudo(id);

create table auditoria (
  id bigint generated always as identity primary key,
  origem origem_dado,
  usuario_id uuid references auth.users(id),
  acao text not null,
  entidade text not null,
  entidade_id uuid,
  dados jsonb not null default '{}'::jsonb,
  endereco_rede inet,
  criada_em timestamptz not null default now()
);

create table interacoes_ia (
  id uuid primary key default gen_random_uuid(),
  origem origem_dado not null,
  usuario_id uuid references auth.users(id),
  finalidade text not null check (finalidade in ('licao','bot_publico','assistente_interno')),
  modelo text not null,
  entrada_sanitizada jsonb not null,
  resposta text not null,
  fontes jsonb not null default '[]'::jsonb,
  edicao_aceita jsonb,
  criada_em timestamptz not null default now(),
  expira_em timestamptz not null default (now() + interval '90 days')
);

create index solicitacoes_empresa_idx on solicitacoes (empresa_id, criado_em desc);
create index mensagens_solicitacao_idx on mensagens (solicitacao_id, criada_em);
create index execucoes_origem_estado_idx on execucoes_servico (origem, estado);
create index licoes_origem_estado_idx on licoes (origem, estado);
create index conteudo_busca_idx on versoes_conteudo using gin (to_tsvector('portuguese', titulo || ' ' || corpo::text));

create or replace function perfil_interno_atual() returns perfil_interno language sql stable security definer set search_path = public as $$
  select perfil_interno from perfis where usuario_id = auth.uid();
$$;

create or replace function usuario_interno() returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from perfis where usuario_id = auth.uid() and perfil_interno is not null);
$$;

create or replace function usuario_da_empresa(empresa uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from vinculos_empresa where usuario_id = auth.uid() and empresa_id = empresa and aprovado_em is not null and unico_ativo);
$$;

create or replace function validar_mesma_origem() returns trigger language plpgsql as $$
begin
  if tg_table_name = 'versoes_proposta' and new.origem <> (select origem from propostas where id = new.proposta_id) then raise exception 'origem divergente'; end if;
  if tg_table_name = 'itens_proposta' and new.origem <> (select origem from versoes_proposta where id = new.versao_proposta_id) then raise exception 'origem divergente'; end if;
  if tg_table_name = 'anexos_solicitacao' and new.origem <> (select origem from solicitacoes where id = new.solicitacao_id) then raise exception 'origem divergente'; end if;
  if tg_table_name = 'mensagens' and new.origem <> (select origem from solicitacoes where id = new.solicitacao_id) then raise exception 'origem divergente'; end if;
  return new;
end; $$;

create trigger versoes_origem before insert or update on versoes_proposta for each row execute function validar_mesma_origem();
create trigger itens_origem before insert or update on itens_proposta for each row execute function validar_mesma_origem();
create trigger anexos_origem before insert or update on anexos_solicitacao for each row execute function validar_mesma_origem();
create trigger mensagens_origem before insert or update on mensagens for each row execute function validar_mesma_origem();

alter table perfis enable row level security;
alter table empresas enable row level security;
alter table vinculos_empresa enable row level security;
alter table solicitacoes enable row level security;
alter table anexos_solicitacao enable row level security;
alter table propostas enable row level security;
alter table versoes_proposta enable row level security;
alter table itens_proposta enable row level security;
alter table execucoes_servico enable row level security;
alter table licoes enable row level security;
alter table revisoes_licao enable row level security;
alter table mensagens enable row level security;
alter table interacoes_ia enable row level security;
alter table auditoria enable row level security;

create policy "perfil proprio" on perfis for select using (usuario_id = auth.uid() or perfil_interno_atual() = 'administrador');
create policy "empresa interna ou vinculada" on empresas for select using (usuario_interno() or usuario_da_empresa(id));
create policy "vinculos visiveis" on vinculos_empresa for select using (usuario_id = auth.uid() or usuario_interno());
create policy "solicitacoes da empresa ou internas" on solicitacoes for select using (usuario_interno() or usuario_da_empresa(empresa_id));
create policy "cliente cria solicitacao demo ou real da empresa" on solicitacoes for insert with check (solicitante_id = auth.uid() and usuario_da_empresa(empresa_id));
create policy "anexos da solicitacao" on anexos_solicitacao for select using (exists(select 1 from solicitacoes s where s.id = solicitacao_id and (usuario_interno() or usuario_da_empresa(s.empresa_id))));
create policy "propostas da empresa ou internas" on propostas for select using (usuario_interno() or usuario_da_empresa(empresa_id));
create policy "versoes visiveis via proposta" on versoes_proposta for select using (exists(select 1 from propostas p where p.id = proposta_id and (usuario_interno() or usuario_da_empresa(p.empresa_id))));
create policy "itens visiveis via proposta" on itens_proposta for select using (exists(select 1 from versoes_proposta v join propostas p on p.id = v.proposta_id where v.id = versao_proposta_id and (usuario_interno() or usuario_da_empresa(p.empresa_id))));
create policy "execucao interna ou cliente" on execucoes_servico for select using (exists(select 1 from itens_proposta i join versoes_proposta v on v.id=i.versao_proposta_id join propostas p on p.id=v.proposta_id where i.id=item_proposta_id and (usuario_interno() or usuario_da_empresa(p.empresa_id))));
create policy "licoes internas" on licoes for select using (usuario_interno());
create policy "revisoes internas" on revisoes_licao for select using (usuario_interno());
create policy "mensagens dos participantes" on mensagens for select using (exists(select 1 from solicitacoes s where s.id=solicitacao_id and (usuario_interno() or usuario_da_empresa(s.empresa_id))));
create policy "participante envia mensagem" on mensagens for insert with check (autor_id=auth.uid() and exists(select 1 from solicitacoes s where s.id=solicitacao_id and (usuario_interno() or usuario_da_empresa(s.empresa_id))));
create policy "ia interna propria" on interacoes_ia for select using (usuario_id=auth.uid() or perfil_interno_atual() in ('validador','administrador'));
create policy "auditoria administradores" on auditoria for select using (perfil_interno_atual()='administrador');

alter publication supabase_realtime add table mensagens;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('solicitacoes', 'solicitacoes', false, 52428800, array['application/pdf','image/jpeg','image/png','image/webp','application/octet-stream'])
on conflict (id) do nothing;

create policy "arquivos autenticados por caminho" on storage.objects for select to authenticated using (bucket_id='solicitacoes');

comment on table custos_equipamento is 'Valores administrativos versionados; a planilha de origem é restrita e não é publicada.';
comment on table interacoes_ia is 'Retenção máxima de 90 dias; dados devem chegar sanitizados.';
