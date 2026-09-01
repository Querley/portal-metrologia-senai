-- Modelos simples de etapas por servico e operacao persistente da execucao.
-- Somente a origem demonstracao recebe modelos neste MVP de homologacao.

create table modelos_execucao_servico (
  id uuid primary key default gen_random_uuid(),
  servico_catalogo_id uuid not null references servicos_catalogo(id),
  origem origem_dado not null,
  versao integer not null check (versao > 0),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (servico_catalogo_id, origem, versao)
);

create unique index modelos_execucao_servico_ativo_idx
on modelos_execucao_servico (servico_catalogo_id, origem)
where ativo;

create table itens_modelo_execucao (
  id uuid primary key default gen_random_uuid(),
  modelo_id uuid not null references modelos_execucao_servico(id) on delete cascade,
  ordem integer not null check (ordem > 0),
  titulo text not null check (char_length(trim(titulo)) between 2 and 120),
  descricao text check (descricao is null or char_length(trim(descricao)) between 2 and 500),
  visivel_cliente boolean not null default true,
  unique (modelo_id, ordem)
);

alter table execucoes_servico
  add column modelo_etapas_id uuid references modelos_execucao_servico(id);

alter table modelos_execucao_servico enable row level security;
alter table itens_modelo_execucao enable row level security;

revoke all on table modelos_execucao_servico, itens_modelo_execucao from public, anon, authenticated;

create policy "equipe consulta modelos demonstrativos"
on modelos_execucao_servico for select to authenticated
using (
  origem = origem_ativa_atual()
  and perfil_interno_atual() in ('tecnico', 'validador', 'administrador')
);

create policy "equipe consulta itens dos modelos demonstrativos"
on itens_modelo_execucao for select to authenticated
using (
  exists (
    select 1
    from modelos_execucao_servico m
    where m.id = modelo_id
      and m.origem = origem_ativa_atual()
      and perfil_interno_atual() in ('tecnico', 'validador', 'administrador')
  )
);

grant select on table modelos_execucao_servico, itens_modelo_execucao to authenticated;

-- Escritas nas etapas passam exclusivamente pela RPC auditada.
drop policy if exists "equipe gerencia etapas demonstrativas" on etapas_execucao;
revoke insert, update, delete on table etapas_execucao from authenticated;

insert into modelos_execucao_servico (servico_catalogo_id, origem, versao, ativo)
select sc.id, 'demonstracao', 1, true
from servicos_catalogo sc
where sc.slug in (
  'escaneamento-3d-digitalizacao-pecas',
  'engenharia-reversa-reconstrucao-cad',
  'nacionalizacao-desenvolvimento-componentes',
  'metrologia-avancada-inspecao-dimensional',
  'comparacao-cad-peca-fisica',
  'mapa-desgaste',
  'tomografia-industrial',
  'analise-falhas-quebras-anomalias',
  'arvore-equipamentos-pecas-criticas',
  'almoxarifado-virtual-biblioteca-digital'
)
on conflict (servico_catalogo_id, origem, versao) do nothing;

with etapas (slug, ordem, titulo) as (
  values
    ('escaneamento-3d-digitalizacao-pecas', 1, 'Planejamento'),
    ('escaneamento-3d-digitalizacao-pecas', 2, 'Digitalização'),
    ('escaneamento-3d-digitalizacao-pecas', 3, 'Tratamento do modelo 3D'),
    ('escaneamento-3d-digitalizacao-pecas', 4, 'Validação'),
    ('escaneamento-3d-digitalizacao-pecas', 5, 'Entrega'),
    ('engenharia-reversa-reconstrucao-cad', 1, 'Planejamento'),
    ('engenharia-reversa-reconstrucao-cad', 2, 'Digitalização'),
    ('engenharia-reversa-reconstrucao-cad', 3, 'Criação do modelo CAD'),
    ('engenharia-reversa-reconstrucao-cad', 4, 'Validação'),
    ('engenharia-reversa-reconstrucao-cad', 5, 'Entrega'),
    ('nacionalizacao-desenvolvimento-componentes', 1, 'Planejamento'),
    ('nacionalizacao-desenvolvimento-componentes', 2, 'Medição da peça'),
    ('nacionalizacao-desenvolvimento-componentes', 3, 'Criação do modelo técnico'),
    ('nacionalizacao-desenvolvimento-componentes', 4, 'Validação'),
    ('nacionalizacao-desenvolvimento-componentes', 5, 'Entrega'),
    ('metrologia-avancada-inspecao-dimensional', 1, 'Planejamento'),
    ('metrologia-avancada-inspecao-dimensional', 2, 'Medições'),
    ('metrologia-avancada-inspecao-dimensional', 3, 'Análise dos resultados'),
    ('metrologia-avancada-inspecao-dimensional', 4, 'Validação do relatório'),
    ('metrologia-avancada-inspecao-dimensional', 5, 'Entrega'),
    ('comparacao-cad-peca-fisica', 1, 'Planejamento'),
    ('comparacao-cad-peca-fisica', 2, 'Medição da peça'),
    ('comparacao-cad-peca-fisica', 3, 'Comparação com o CAD'),
    ('comparacao-cad-peca-fisica', 4, 'Validação do relatório'),
    ('comparacao-cad-peca-fisica', 5, 'Entrega'),
    ('mapa-desgaste', 1, 'Planejamento'),
    ('mapa-desgaste', 2, 'Medições'),
    ('mapa-desgaste', 3, 'Análise do desgaste'),
    ('mapa-desgaste', 4, 'Validação do mapa e relatório'),
    ('mapa-desgaste', 5, 'Entrega'),
    ('tomografia-industrial', 1, 'Planejamento'),
    ('tomografia-industrial', 2, 'Escaneamento tomográfico'),
    ('tomografia-industrial', 3, 'Processamento das imagens'),
    ('tomografia-industrial', 4, 'Validação do relatório'),
    ('tomografia-industrial', 5, 'Entrega'),
    ('analise-falhas-quebras-anomalias', 1, 'Planejamento'),
    ('analise-falhas-quebras-anomalias', 2, 'Medição e inspeção'),
    ('analise-falhas-quebras-anomalias', 3, 'Análise da falha'),
    ('analise-falhas-quebras-anomalias', 4, 'Validação do relatório'),
    ('analise-falhas-quebras-anomalias', 5, 'Entrega'),
    ('arvore-equipamentos-pecas-criticas', 1, 'Planejamento'),
    ('arvore-equipamentos-pecas-criticas', 2, 'Coleta das informações'),
    ('arvore-equipamentos-pecas-criticas', 3, 'Organização dos equipamentos'),
    ('arvore-equipamentos-pecas-criticas', 4, 'Validação'),
    ('arvore-equipamentos-pecas-criticas', 5, 'Entrega'),
    ('almoxarifado-virtual-biblioteca-digital', 1, 'Planejamento'),
    ('almoxarifado-virtual-biblioteca-digital', 2, 'Digitalização dos itens'),
    ('almoxarifado-virtual-biblioteca-digital', 3, 'Organização dos modelos'),
    ('almoxarifado-virtual-biblioteca-digital', 4, 'Validação'),
    ('almoxarifado-virtual-biblioteca-digital', 5, 'Disponibilização')
)
insert into itens_modelo_execucao (modelo_id, ordem, titulo, visivel_cliente)
select m.id, e.ordem, e.titulo, true
from etapas e
join servicos_catalogo sc on sc.slug = e.slug
join modelos_execucao_servico m
  on m.servico_catalogo_id = sc.id
 and m.origem = 'demonstracao'
 and m.versao = 1
on conflict (modelo_id, ordem) do nothing;

-- Vincula e preenche execucoes que ja foram iniciadas antes desta migration.
update execucoes_servico ex
set modelo_etapas_id = modelo.id
from itens_proposta ip
join modelos_execucao_servico modelo
  on modelo.servico_catalogo_id = ip.servico_catalogo_id
 and modelo.origem = 'demonstracao'
 and modelo.ativo
where ex.item_proposta_id = ip.id
  and ex.origem = 'demonstracao'
  and ex.modelo_etapas_id is null;

insert into etapas_execucao (
  execucao_id,
  origem,
  ordem,
  titulo,
  descricao,
  estado,
  progresso,
  visivel_cliente
)
select
  ex.id,
  'demonstracao',
  ime.ordem,
  ime.titulo,
  ime.descricao,
  'a_fazer',
  0,
  ime.visivel_cliente
from execucoes_servico ex
join itens_modelo_execucao ime on ime.modelo_id = ex.modelo_etapas_id
where ex.origem = 'demonstracao'
on conflict (execucao_id, ordem) do nothing;

create or replace function confirmar_inicio_trabalho_demonstrativo(versao uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  usuario uuid := auth.uid();
  perfil perfil_interno;
  origem_sessao origem_dado;
  estado_atual estado_proposta;
  origem_versao origem_dado;
  alteradas integer := 0;
  afetadas integer := 0;
  etapas_criadas integer := 0;
begin
  select p.perfil_interno, p.origem_ativa
    into perfil, origem_sessao
  from perfis p
  where p.usuario_id = usuario;

  if perfil is distinct from 'administrador'::perfil_interno then
    raise exception 'Somente Administrador pode confirmar o inicio do trabalho.' using errcode = '42501';
  end if;

  if origem_sessao is distinct from 'demonstracao'::origem_dado then
    raise exception 'Esta funcao aceita somente a origem demonstracao.' using errcode = '23514';
  end if;

  select v.estado, v.origem
    into estado_atual, origem_versao
  from versoes_proposta v
  where v.id = versao
  for update;

  if not found or origem_versao is distinct from origem_sessao then
    raise exception 'Pre-proposta nao encontrada na origem ativa.' using errcode = '23503';
  end if;

  if estado_atual is distinct from 'aceita'::estado_proposta then
    raise exception 'O inicio exige aceite previo do Cliente.' using errcode = '23514';
  end if;

  if exists (
    select 1
    from execucoes_servico ex
    join itens_proposta i on i.id = ex.item_proposta_id
    where i.versao_proposta_id = versao
      and ex.estado in ('concluido', 'cancelado')
  ) then
    raise exception 'Uma execucao concluida ou cancelada nao pode ser reiniciada.' using errcode = '23514';
  end if;

  insert into execucoes_servico (
    origem,
    visibilidade,
    item_proposta_id,
    estado,
    inicio_real
  )
  select 'demonstracao', 'restrito', i.id, 'em_execucao', now()
  from itens_proposta i
  where i.versao_proposta_id = versao
    and i.origem = 'demonstracao'
  on conflict (item_proposta_id) do nothing;

  get diagnostics afetadas = row_count;
  alteradas := alteradas + afetadas;

  update execucoes_servico ex
  set estado = 'em_execucao',
      inicio_real = coalesce(ex.inicio_real, now())
  from itens_proposta i
  where i.id = ex.item_proposta_id
    and i.versao_proposta_id = versao
    and ex.origem = 'demonstracao'
    and ex.estado = 'planejado';

  get diagnostics afetadas = row_count;
  alteradas := alteradas + afetadas;

  update execucoes_servico ex
  set modelo_etapas_id = modelo.id
  from itens_proposta ip
  join modelos_execucao_servico modelo
    on modelo.servico_catalogo_id = ip.servico_catalogo_id
   and modelo.origem = origem_sessao
   and modelo.ativo
  where ex.item_proposta_id = ip.id
    and ip.versao_proposta_id = versao
    and ex.modelo_etapas_id is null;

  insert into etapas_execucao (
    execucao_id,
    origem,
    ordem,
    titulo,
    descricao,
    estado,
    progresso,
    visivel_cliente
  )
  select
    ex.id,
    origem_sessao,
    ime.ordem,
    ime.titulo,
    ime.descricao,
    'a_fazer',
    0,
    ime.visivel_cliente
  from execucoes_servico ex
  join itens_proposta ip on ip.id = ex.item_proposta_id
  join itens_modelo_execucao ime on ime.modelo_id = ex.modelo_etapas_id
  where ip.versao_proposta_id = versao
    and ex.origem = origem_sessao
  on conflict (execucao_id, ordem) do nothing;

  get diagnostics etapas_criadas = row_count;

  if alteradas > 0 or etapas_criadas > 0 then
    insert into auditoria (origem, usuario_id, acao, entidade, entidade_id, dados)
    values (
      origem_sessao,
      usuario,
      'confirmar_inicio_trabalho_demonstrativo',
      'versoes_proposta',
      versao,
      jsonb_build_object(
        'estado_pre_proposta', 'aceita',
        'execucoes_iniciadas', alteradas,
        'etapas_criadas', etapas_criadas,
        'observacao', 'Liberacao operacional e modelo de etapas registrados pelo Administrador.'
      )
    );
  end if;

  return alteradas;
end;
$$;

create or replace function listar_execucoes_demonstrativas()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  usuario uuid := auth.uid();
  perfil perfil_interno;
  origem_sessao origem_dado;
  resultado jsonb;
begin
  select pf.perfil_interno, pf.origem_ativa
    into perfil, origem_sessao
  from perfis pf
  where pf.usuario_id = usuario;

  if perfil is null or perfil not in ('tecnico', 'validador', 'administrador') then
    raise exception 'Perfil sem acesso as execucoes.' using errcode = '42501';
  end if;

  if origem_sessao is distinct from 'demonstracao'::origem_dado then
    raise exception 'Esta funcao aceita somente a origem demonstracao.' using errcode = '23514';
  end if;

  select coalesce(jsonb_agg(registro order by (registro->>'criada_em') desc), '[]'::jsonb)
    into resultado
  from (
    select jsonb_build_object(
      'execucao_id', ex.id,
      'estado', ex.estado,
      'inicio_real', ex.inicio_real,
      'entrega_real', ex.entrega_real,
      'criada_em', ex.criado_em,
      'solicitacao_codigo', coalesce(sp.codigo, s.codigo),
      'empresa_nome', emp.razao_social,
      'servico_slug', sc.slug,
      'descricao', ip.descricao,
      'responsavel_nome', coalesce(pf.nome, 'Equipe do laboratorio'),
      'etapas', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', et.id,
          'ordem', et.ordem,
          'titulo', et.titulo,
          'descricao', et.descricao,
          'estado', et.estado,
          'progresso', et.progresso,
          'visivel_cliente', et.visivel_cliente,
          'atualizada_em', et.atualizada_em
        ) order by et.ordem), '[]'::jsonb)
        from etapas_execucao et
        where et.execucao_id = ex.id and et.origem = origem_sessao
      )
    ) as registro
    from execucoes_servico ex
    join itens_proposta ip on ip.id = ex.item_proposta_id
    join versoes_proposta vp on vp.id = ip.versao_proposta_id
    join propostas p on p.id = vp.proposta_id
    join solicitacoes s on s.id = p.solicitacao_id
    join empresas emp on emp.id = p.empresa_id
    join servicos_catalogo sc on sc.id = ip.servico_catalogo_id
    left join perfis pf on pf.usuario_id = p.criado_por
    left join solicitacoes_publicas sp on sp.solicitacao_id = s.id and sp.origem = origem_sessao
    where ex.origem = origem_sessao
      and ip.origem = origem_sessao
      and vp.origem = origem_sessao
      and p.origem = origem_sessao
      and s.origem = origem_sessao
      and emp.origem = origem_sessao
      and (perfil in ('validador', 'administrador') or p.criado_por = usuario)
  ) dados;

  return resultado;
end;
$$;

create or replace function atualizar_etapa_execucao_demonstrativa(
  etapa uuid,
  novo_estado text,
  novo_progresso integer
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
  etapa_origem origem_dado;
  execucao_id_atual uuid;
  execucao_estado estado_servico;
  autor_proposta uuid;
  estado_anterior text;
  progresso_anterior integer;
begin
  select pf.perfil_interno, pf.origem_ativa
    into perfil, origem_sessao
  from perfis pf
  where pf.usuario_id = usuario;

  if perfil is null or perfil not in ('tecnico', 'validador', 'administrador') then
    raise exception 'Perfil sem permissao para atualizar execucoes.' using errcode = '42501';
  end if;

  if origem_sessao is distinct from 'demonstracao'::origem_dado then
    raise exception 'Esta funcao aceita somente a origem demonstracao.' using errcode = '23514';
  end if;

  if novo_estado not in ('a_fazer', 'em_andamento', 'concluida') then
    raise exception 'Estado de etapa invalido.' using errcode = '23514';
  end if;

  if (novo_estado = 'a_fazer' and novo_progresso <> 0)
    or (novo_estado = 'em_andamento' and novo_progresso not between 1 and 99)
    or (novo_estado = 'concluida' and novo_progresso <> 100) then
    raise exception 'Progresso incompativel com o estado da etapa.' using errcode = '23514';
  end if;

  select
    et.origem,
    et.execucao_id,
    ex.estado,
    p.criado_por,
    et.estado,
    et.progresso
  into
    etapa_origem,
    execucao_id_atual,
    execucao_estado,
    autor_proposta,
    estado_anterior,
    progresso_anterior
  from etapas_execucao et
  join execucoes_servico ex on ex.id = et.execucao_id
  join itens_proposta ip on ip.id = ex.item_proposta_id
  join versoes_proposta vp on vp.id = ip.versao_proposta_id
  join propostas p on p.id = vp.proposta_id
  where et.id = etapa
  for update of et, ex;

  if not found or etapa_origem is distinct from origem_sessao then
    raise exception 'Etapa nao encontrada na origem ativa.' using errcode = '23503';
  end if;

  if perfil = 'tecnico' and autor_proposta is distinct from usuario then
    raise exception 'Tecnico pode atualizar somente execucoes dos proprios trabalhos.' using errcode = '42501';
  end if;

  if execucao_estado in ('concluido', 'cancelado') then
    raise exception 'Execucao concluida ou cancelada nao pode ser alterada.' using errcode = '23514';
  end if;

  update etapas_execucao
  set estado = novo_estado,
      progresso = novo_progresso,
      atualizada_em = now()
  where id = etapa;

  -- Concluir todas as macroetapas nao fecha administrativamente o servico.
  -- O fechamento posterior registrara realizado, causas e retrabalho antes de
  -- executar a transicao da execucao para concluido.
  update execucoes_servico
  set estado = 'em_execucao',
      inicio_real = coalesce(inicio_real, now()),
      entrega_real = null
  where id = execucao_id_atual;

  insert into auditoria (origem, usuario_id, acao, entidade, entidade_id, dados)
  values (
    origem_sessao,
    usuario,
    'atualizar_etapa_execucao_demonstrativa',
    'etapas_execucao',
    etapa,
    jsonb_build_object(
      'execucao_id', execucao_id_atual,
      'estado_anterior', estado_anterior,
      'estado_novo', novo_estado,
      'progresso_anterior', progresso_anterior,
      'progresso_novo', novo_progresso
    )
  );
end;
$$;

do $$
begin
  alter publication supabase_realtime add table etapas_execucao;
exception
  when duplicate_object then null;
end;
$$;

revoke all on function confirmar_inicio_trabalho_demonstrativo(uuid) from public, anon;
revoke all on function listar_execucoes_demonstrativas() from public, anon;
revoke all on function atualizar_etapa_execucao_demonstrativa(uuid, text, integer) from public, anon;

grant execute on function confirmar_inicio_trabalho_demonstrativo(uuid) to authenticated;
grant execute on function listar_execucoes_demonstrativas() to authenticated;
grant execute on function atualizar_etapa_execucao_demonstrativa(uuid, text, integer) to authenticated;

comment on table modelos_execucao_servico is
  'Cabecalho versionado do modelo de etapas de cada servico e origem.';
comment on table itens_modelo_execucao is
  'Macroetapas simples copiadas para a execucao; alteracoes futuras nao reescrevem o historico.';
comment on function listar_execucoes_demonstrativas() is
  'Lista execucoes demonstrativas do proprio Tecnico ou de toda a equipe para Validador e Administrador.';
comment on function atualizar_etapa_execucao_demonstrativa(uuid, text, integer) is
  'Atualiza progresso pela hierarquia interna e registra auditoria; o fechamento da execucao e separado.';
