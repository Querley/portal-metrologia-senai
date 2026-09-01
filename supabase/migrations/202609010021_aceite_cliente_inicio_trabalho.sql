-- Aceite da pre-proposta pelo Cliente e liberacao operacional pelo Administrador.
-- O aceite registrado aqui nao substitui a proposta oficial emitida pelo SENAI no Nectar.
-- Este recorte permanece restrito a dados demonstrativos de homologacao.

alter table versoes_proposta
  add column if not exists aceita_em timestamptz,
  add column if not exists aceita_por uuid references auth.users(id),
  add column if not exists aceita_empresa_id uuid references empresas(id),
  add column if not exists aceite_declaracao_versao text;

alter table versoes_proposta
  drop constraint if exists versoes_proposta_aceite_declaracao_valida;

alter table versoes_proposta
  add constraint versoes_proposta_aceite_declaracao_valida
  check (
    aceite_declaracao_versao is null
    or char_length(trim(aceite_declaracao_versao)) between 3 and 80
  ) not valid;

alter table versoes_proposta
  validate constraint versoes_proposta_aceite_declaracao_valida;

comment on column versoes_proposta.aceita_em is
  'Instante em que um usuario externo vinculado manifestou aceite da pre-proposta do laboratorio.';
comment on column versoes_proposta.aceita_por is
  'Usuario externo autenticado que manifestou o aceite.';
comment on column versoes_proposta.aceita_empresa_id is
  'Empresa demonstrativa representada pelo usuario no momento do aceite.';
comment on column versoes_proposta.aceite_declaracao_versao is
  'Versao do texto de ciencia aceito pelo Cliente; nao equivale ao aceite da proposta oficial do Nectar.';

create or replace function aceitar_pre_proposta_cliente(
  solicitacao uuid,
  declaracao_versao text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  usuario uuid := auth.uid();
  versao_id uuid;
  estado_atual estado_proposta;
  empresa uuid;
  expira_em_atual timestamptz;
begin
  if usuario is null then
    raise exception 'Autenticacao obrigatoria.' using errcode = '42501';
  end if;

  if declaracao_versao is distinct from '2026-09-01-v1' then
    raise exception 'Versao da declaracao de aceite invalida.' using errcode = '23514';
  end if;

  select v.id, v.estado, p.empresa_id, v.expira_em
    into versao_id, estado_atual, empresa, expira_em_atual
  from propostas p
  join versoes_proposta v on v.proposta_id = p.id
  where p.solicitacao_id = solicitacao
    and p.origem = 'demonstracao'
    and v.origem = 'demonstracao'
    and v.estado in ('publicada', 'aceita')
    and usuario_da_empresa(p.empresa_id)
  order by v.numero desc
  limit 1
  for update of v;

  if not found then
    raise exception 'Pre-proposta emitida nao encontrada para este usuario.' using errcode = '42501';
  end if;

  if estado_atual = 'aceita' then
    return versao_id;
  end if;

  if expira_em_atual is not null and expira_em_atual < now() then
    raise exception 'Esta pre-proposta expirou.' using errcode = '23514';
  end if;

  update versoes_proposta
  set estado = 'aceita',
      aceita_em = now(),
      aceita_por = usuario,
      aceita_empresa_id = empresa,
      aceite_declaracao_versao = declaracao_versao
  where id = versao_id;

  insert into auditoria (origem, usuario_id, acao, entidade, entidade_id, dados)
  values (
    'demonstracao',
    usuario,
    'aceitar_pre_proposta_cliente',
    'versoes_proposta',
    versao_id,
    jsonb_build_object(
      'estado_anterior', 'publicada',
      'estado_novo', 'aceita',
      'empresa_id', empresa,
      'declaracao_versao', declaracao_versao,
      'observacao', 'Aceite da pre-proposta do laboratorio; nao substitui a proposta oficial do Nectar.'
    )
  );

  return versao_id;
end;
$$;

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
  select
    'demonstracao',
    'restrito',
    i.id,
    'em_execucao',
    now()
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

  if alteradas > 0 then
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
        'observacao', 'Liberacao operacional registrada manualmente pelo Administrador.'
      )
    );
  end if;

  return alteradas;
end;
$$;

create or replace function listar_situacoes_execucao_demonstrativas()
returns table (
  versao_id uuid,
  aceita_em timestamptz,
  execucao_estado estado_servico
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
  select p.perfil_interno, p.origem_ativa
    into perfil, origem_sessao
  from perfis p
  where p.usuario_id = usuario;

  if perfil is null or perfil not in ('tecnico', 'validador', 'administrador') then
    raise exception 'Perfil sem acesso as execucoes.' using errcode = '42501';
  end if;

  if origem_sessao is distinct from 'demonstracao'::origem_dado then
    raise exception 'Esta funcao aceita somente a origem demonstracao.' using errcode = '23514';
  end if;

  return query
  select
    v.id,
    v.aceita_em,
    case
      when bool_and(ex.estado = 'concluido') then 'concluido'::estado_servico
      when bool_or(ex.estado = 'em_execucao') then 'em_execucao'::estado_servico
      when bool_or(ex.estado = 'planejado') then 'planejado'::estado_servico
      when bool_or(ex.estado = 'cancelado') then 'cancelado'::estado_servico
      else null
    end
  from versoes_proposta v
  join propostas p on p.id = v.proposta_id
  left join itens_proposta i on i.versao_proposta_id = v.id
  left join execucoes_servico ex on ex.item_proposta_id = i.id
  where v.origem = origem_sessao
    and p.origem = origem_sessao
    and (perfil in ('validador', 'administrador') or p.criado_por = usuario)
  group by v.id, v.aceita_em;
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
      'aceita_em', (
        select vp.aceita_em from propostas p join versoes_proposta vp on vp.proposta_id = p.id
        where p.solicitacao_id = s.id and vp.estado = 'aceita'
        order by vp.numero desc limit 1
      ),
      'execucao_estado', (
        select case
          when bool_and(ex.estado = 'concluido') then 'concluido'
          when bool_or(ex.estado = 'em_execucao') then 'em_execucao'
          when bool_or(ex.estado = 'planejado') then 'planejado'
          when bool_or(ex.estado = 'cancelado') then 'cancelado'
          else null
        end
        from propostas p
        join versoes_proposta vp on vp.proposta_id = p.id and vp.estado = 'aceita'
        join itens_proposta ip on ip.versao_proposta_id = vp.id
        join execucoes_servico ex on ex.item_proposta_id = ip.id
        where p.solicitacao_id = s.id
          and vp.id = (
            select vp_ativa.id
            from versoes_proposta vp_ativa
            where vp_ativa.proposta_id = p.id and vp_ativa.estado = 'aceita'
            order by vp_ativa.numero desc
            limit 1
          )
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
        join versoes_proposta vp on vp.proposta_id = p.id and vp.estado = 'aceita'
        join itens_proposta ip on ip.versao_proposta_id = vp.id
        join execucoes_servico ex on ex.item_proposta_id = ip.id
        join etapas_execucao et on et.execucao_id = ex.id
        where p.solicitacao_id = s.id
          and vp.id = (
            select vp_ativa.id
            from versoes_proposta vp_ativa
            where vp_ativa.proposta_id = p.id and vp_ativa.estado = 'aceita'
            order by vp_ativa.numero desc
            limit 1
          )
          and et.visivel_cliente
          and et.origem = 'demonstracao'
      )
    ) as registro
    from solicitacoes s
    join servicos_catalogo sc on sc.id = s.servico_catalogo_id
    where s.origem = 'demonstracao'
      and usuario_da_empresa(s.empresa_id)
  ) dados;
$$;

revoke all on function aceitar_pre_proposta_cliente(uuid, text) from public, anon;
revoke all on function confirmar_inicio_trabalho_demonstrativo(uuid) from public, anon;
revoke all on function listar_situacoes_execucao_demonstrativas() from public, anon;
revoke all on function listar_portal_cliente() from public, anon;

grant execute on function aceitar_pre_proposta_cliente(uuid, text) to authenticated;
grant execute on function confirmar_inicio_trabalho_demonstrativo(uuid) to authenticated;
grant execute on function listar_situacoes_execucao_demonstrativas() to authenticated;
grant execute on function listar_portal_cliente() to authenticated;

comment on function aceitar_pre_proposta_cliente(uuid, text) is
  'Registra o aceite autenticado da pre-proposta do laboratorio pela empresa demonstrativa vinculada.';
comment on function confirmar_inicio_trabalho_demonstrativo(uuid) is
  'Cria ou inicia as execucoes de uma pre-proposta aceita; exclusivo do Administrador demonstrativo.';
comment on function listar_situacoes_execucao_demonstrativas() is
  'Complementa a fila interna com o aceite e o estado agregado da execucao sem expor dados reais.';
comment on function listar_portal_cliente() is
  'Entrega somente solicitacoes demonstrativas da empresa vinculada, com aceite e execucao agregados.';
