-- Fecha o ciclo demonstrativo comparar -> aprender -> recomendar.
-- Somente execucoes concluidas, na mesma origem e com licao formalizada
-- podem alimentar a recomendacao estatistica.

create or replace function validar_imutabilidade_licao_formalizada()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_table_name = 'licoes' and old.estado = 'formalizada'
     and not (
       tg_op = 'UPDATE'
       and new.estado = 'em_validacao'
       and new.revisao_atual = old.revisao_atual + 1
       and new.origem = old.origem
       and new.execucao_id = old.execucao_id
       and new.superada_motivo is not distinct from old.superada_motivo
       and new.substituta_id is not distinct from old.substituta_id
       and exists (
         select 1 from revisoes_licao rl
         where rl.licao_id = old.id and rl.numero = new.revisao_atual
       )
     ) then
    raise exception 'Licao formalizada e imutavel; uma correcao exige nova revisao.' using errcode = '23514';
  end if;

  if tg_table_name = 'revisoes_licao' and exists (
    select 1 from licoes l where l.id = old.licao_id and l.estado = 'formalizada'
  ) then
    raise exception 'Revisao de licao formalizada e imutavel.' using errcode = '23514';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists licoes_formalizadas_imutaveis on licoes;
create trigger licoes_formalizadas_imutaveis
before update or delete on licoes
for each row execute function validar_imutabilidade_licao_formalizada();

drop trigger if exists revisoes_licao_formalizadas_imutaveis on revisoes_licao;
create trigger revisoes_licao_formalizadas_imutaveis
before update or delete on revisoes_licao
for each row execute function validar_imutabilidade_licao_formalizada();

create or replace function criar_licao_demonstrativa(
  execucao uuid,
  resumo text,
  assuntos text[] default '{}'
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
  estado_execucao estado_servico;
  nova_licao uuid;
  resumo_normalizado text := trim(coalesce(resumo, ''));
  assuntos_normalizados text[];
begin
  select p.perfil_interno, p.origem_ativa into perfil, origem_sessao
  from perfis p where p.usuario_id = usuario;

  if perfil is null or perfil not in ('tecnico', 'validador', 'administrador') then
    raise exception 'Perfil sem permissao para registrar licao.' using errcode = '42501';
  end if;
  if origem_sessao is distinct from 'demonstracao'::origem_dado then
    raise exception 'Esta funcao aceita somente a origem demonstracao.' using errcode = '23514';
  end if;
  if char_length(resumo_normalizado) not between 5 and 2000 then
    raise exception 'A licao deve ter entre 5 e 2000 caracteres.' using errcode = '23514';
  end if;

  select coalesce(array_agg(distinct trim(assunto) order by trim(assunto)), '{}')
    into assuntos_normalizados
  from unnest(coalesce(assuntos, '{}')) assunto
  where char_length(trim(assunto)) between 2 and 60;

  if cardinality(coalesce(assuntos, '{}')) > 10
     or cardinality(assuntos_normalizados) <> cardinality(coalesce(assuntos, '{}')) then
    raise exception 'Informe ate dez assuntos validos e sem repeticao.' using errcode = '23514';
  end if;

  select ex.estado into estado_execucao
  from execucoes_servico ex
  where ex.id = execucao and ex.origem = origem_sessao
  for update;

  if not found then
    raise exception 'Execucao nao encontrada na origem ativa.' using errcode = '23503';
  end if;
  if estado_execucao is distinct from 'concluido'::estado_servico then
    raise exception 'Somente servico concluido pode originar licao.' using errcode = '23514';
  end if;
  if exists (select 1 from licoes l where l.execucao_id = execucao) then
    raise exception 'Esta execucao ja possui uma licao.' using errcode = '23505';
  end if;

  insert into licoes (origem, visibilidade, execucao_id, estado, revisao_atual)
  values (origem_sessao, 'restrito', execucao, 'em_validacao', 1)
  returning id into nova_licao;

  insert into revisoes_licao (licao_id, numero, resumo, assuntos, criada_por)
  values (nova_licao, 1, resumo_normalizado, assuntos_normalizados, usuario);

  insert into auditoria (origem, usuario_id, acao, entidade, entidade_id, dados)
  values (origem_sessao, usuario, 'criar_licao_demonstrativa', 'licoes', nova_licao,
    jsonb_build_object('execucao_id', execucao, 'revisao', 1));

  return nova_licao;
end;
$$;

create or replace function formalizar_licao_demonstrativa(licao uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  usuario uuid := auth.uid();
  perfil perfil_interno;
  origem_sessao origem_dado;
  estado_atual estado_licao;
  revisao integer;
begin
  select p.perfil_interno, p.origem_ativa into perfil, origem_sessao
  from perfis p where p.usuario_id = usuario;

  if perfil is null or perfil not in ('validador', 'administrador') then
    raise exception 'Somente Validador ou Administrador formaliza licoes.' using errcode = '42501';
  end if;
  if origem_sessao is distinct from 'demonstracao'::origem_dado then
    raise exception 'Esta funcao aceita somente a origem demonstracao.' using errcode = '23514';
  end if;

  select l.estado, l.revisao_atual into estado_atual, revisao
  from licoes l
  join execucoes_servico ex on ex.id = l.execucao_id
  where l.id = licao
    and l.origem = origem_sessao
    and ex.origem = origem_sessao
    and ex.estado = 'concluido'
  for update of l;

  if not found then
    raise exception 'Licao de servico concluido nao encontrada na origem ativa.' using errcode = '23503';
  end if;
  if estado_atual is distinct from 'em_validacao'::estado_licao then
    raise exception 'Somente licao em validacao pode ser formalizada.' using errcode = '23514';
  end if;

  update revisoes_licao
  set validada_por = usuario, validada_em = now()
  where licao_id = licao and numero = revisao and validada_em is null;

  if not found then
    raise exception 'Revisao atual da licao nao encontrada.' using errcode = '23503';
  end if;

  update licoes set estado = 'formalizada' where id = licao;

  insert into auditoria (origem, usuario_id, acao, entidade, entidade_id, dados)
  values (origem_sessao, usuario, 'formalizar_licao_demonstrativa', 'licoes', licao,
    jsonb_build_object('revisao', revisao));
end;
$$;

create or replace function revisar_licao_demonstrativa(
  licao uuid,
  resumo text,
  assuntos text[] default '{}'
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  usuario uuid := auth.uid();
  perfil perfil_interno;
  origem_sessao origem_dado;
  estado_atual estado_licao;
  revisao integer;
  resumo_normalizado text := trim(coalesce(resumo, ''));
  assuntos_normalizados text[];
begin
  select p.perfil_interno, p.origem_ativa into perfil, origem_sessao
  from perfis p where p.usuario_id = usuario;

  if perfil is null or perfil not in ('tecnico', 'validador', 'administrador') then
    raise exception 'Perfil sem permissao para revisar licao.' using errcode = '42501';
  end if;
  if origem_sessao is distinct from 'demonstracao'::origem_dado then
    raise exception 'Esta funcao aceita somente a origem demonstracao.' using errcode = '23514';
  end if;
  if char_length(resumo_normalizado) not between 5 and 2000 then
    raise exception 'A licao deve ter entre 5 e 2000 caracteres.' using errcode = '23514';
  end if;

  select coalesce(array_agg(distinct trim(assunto) order by trim(assunto)), '{}')
    into assuntos_normalizados
  from unnest(coalesce(assuntos, '{}')) assunto
  where char_length(trim(assunto)) between 2 and 60;

  if cardinality(coalesce(assuntos, '{}')) > 10
     or cardinality(assuntos_normalizados) <> cardinality(coalesce(assuntos, '{}')) then
    raise exception 'Informe ate dez assuntos validos e sem repeticao.' using errcode = '23514';
  end if;

  select l.estado, l.revisao_atual into estado_atual, revisao
  from licoes l
  join execucoes_servico ex on ex.id = l.execucao_id
  where l.id = licao
    and l.origem = origem_sessao
    and ex.origem = origem_sessao
    and ex.estado = 'concluido'
  for update of l;

  if not found then
    raise exception 'Licao de servico concluido nao encontrada na origem ativa.' using errcode = '23503';
  end if;
  if estado_atual is distinct from 'formalizada'::estado_licao then
    raise exception 'Somente licao formalizada exige nova revisao.' using errcode = '23514';
  end if;

  revisao := revisao + 1;
  insert into revisoes_licao (licao_id, numero, resumo, assuntos, criada_por)
  values (licao, revisao, resumo_normalizado, assuntos_normalizados, usuario);

  update licoes set estado = 'em_validacao', revisao_atual = revisao where id = licao;

  insert into auditoria (origem, usuario_id, acao, entidade, entidade_id, dados)
  values (origem_sessao, usuario, 'revisar_licao_demonstrativa', 'licoes', licao,
    jsonb_build_object('revisao', revisao));

  return revisao;
end;
$$;

create or replace function listar_indicadores_execucoes_demonstrativas()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  perfil perfil_interno;
  origem_sessao origem_dado;
  resultado jsonb;
begin
  select p.perfil_interno, p.origem_ativa into perfil, origem_sessao
  from perfis p where p.usuario_id = auth.uid();

  if perfil is null or perfil not in ('tecnico', 'validador', 'administrador') then
    raise exception 'Perfil sem acesso aos indicadores.' using errcode = '42501';
  end if;
  if origem_sessao is distinct from 'demonstracao'::origem_dado then
    raise exception 'Esta funcao aceita somente a origem demonstracao.' using errcode = '23514';
  end if;

  select coalesce(jsonb_agg(registro order by (registro->>'concluida_em') desc), '[]'::jsonb)
    into resultado
  from (
    select jsonb_build_object(
      'execucao_id', ex.id,
      'solicitacao_codigo', coalesce(sp.codigo, s.codigo),
      'empresa_nome', emp.razao_social,
      'servico_id', sc.id,
      'servico_slug', sc.slug,
      'concluida_em', ex.entrega_real,
      'horas_estimadas', metricas.horas_estimadas,
      'horas_realizadas', metricas.horas_realizadas,
      'desvio_esforco', case when metricas.horas_estimadas = 0 then null else round((metricas.horas_realizadas - metricas.horas_estimadas) / metricas.horas_estimadas, 6) end,
      'esforco_assertivo', case when metricas.horas_estimadas = 0 then null else abs((metricas.horas_realizadas - metricas.horas_estimadas) / metricas.horas_estimadas) <= 0.15 end,
      'custo_estimado', case when perfil in ('validador', 'administrador') then ip.custo_congelado else null end,
      'custo_realizado', case when perfil in ('validador', 'administrador') then metricas.custo_realizado else null end,
      'desvio_custo', case when perfil not in ('validador', 'administrador') or ip.custo_congelado = 0 then null else round((metricas.custo_realizado - ip.custo_congelado) / ip.custo_congelado, 6) end,
      'custo_assertivo', case when perfil not in ('validador', 'administrador') or ip.custo_congelado = 0 then null else abs((metricas.custo_realizado - ip.custo_congelado) / ip.custo_congelado) <= 0.15 end,
      'duracao_estimada_horas', metricas.duracao_estimada_horas,
      'duracao_realizada_horas', metricas.duracao_realizada_horas,
      'desvio_duracao', case when metricas.duracao_estimada_horas is null or metricas.duracao_estimada_horas = 0 then null else round((metricas.duracao_realizada_horas - metricas.duracao_estimada_horas) / metricas.duracao_estimada_horas, 6) end,
      'duracao_assertiva', case when metricas.duracao_estimada_horas is null or metricas.duracao_estimada_horas = 0 then null else abs((metricas.duracao_realizada_horas - metricas.duracao_estimada_horas) / metricas.duracao_estimada_horas) <= 0.15 end,
      'licao_id', l.id,
      'licao_estado', l.estado,
      'licao_resumo', rl.resumo,
      'licao_assuntos', coalesce(rl.assuntos, '{}')
    ) registro
    from execucoes_servico ex
    join itens_proposta ip on ip.id = ex.item_proposta_id and ip.origem = origem_sessao
    join versoes_proposta vp on vp.id = ip.versao_proposta_id and vp.origem = origem_sessao
    join propostas p on p.id = vp.proposta_id and p.origem = origem_sessao
    join solicitacoes s on s.id = p.solicitacao_id and s.origem = origem_sessao
    join empresas emp on emp.id = p.empresa_id and emp.origem = origem_sessao
    join servicos_catalogo sc on sc.id = ip.servico_catalogo_id
    left join solicitacoes_publicas sp on sp.solicitacao_id = s.id and sp.origem = origem_sessao
    left join licoes l on l.execucao_id = ex.id and l.origem = origem_sessao
    left join revisoes_licao rl on rl.licao_id = l.id and rl.numero = l.revisao_atual
    cross join lateral (
      select
        coalesce((select sum(ue.horas) from usos_equipamento_proposta ue where ue.item_proposta_id = ip.id), 0)::numeric as horas_estimadas,
        coalesce((select sum(hr.horas) from horas_reais_equipamento hr where hr.execucao_id = ex.id and hr.origem = origem_sessao), 0)::numeric as horas_realizadas,
        (coalesce((select sum(hr.horas * hr.custo_hora_inicio_real) from horas_reais_equipamento hr where hr.execucao_id = ex.id and hr.origem = origem_sessao), 0) + coalesce(ex.custos_extras_reais, 0))::numeric as custo_realizado,
        case when ex.inicio_planejado is null or ex.entrega_planejada is null then null else (extract(epoch from (ex.entrega_planejada - ex.inicio_planejado)) / 3600)::numeric end as duracao_estimada_horas,
        case when ex.inicio_real is null or ex.entrega_real is null then null else (extract(epoch from (ex.entrega_real - ex.inicio_real)) / 3600)::numeric end as duracao_realizada_horas
    ) metricas
    where ex.origem = origem_sessao and ex.estado = 'concluido'
  ) dados;

  return resultado;
end;
$$;

create or replace function recomendar_horas_demonstrativas(
  servico uuid,
  quantidade_nova numeric,
  equipamento uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  perfil perfil_interno;
  origem_sessao origem_dado;
  quantidade_casos integer;
  resumo jsonb;
begin
  select p.perfil_interno, p.origem_ativa into perfil, origem_sessao
  from perfis p where p.usuario_id = auth.uid();

  if perfil is null or perfil not in ('tecnico', 'validador', 'administrador') then
    raise exception 'Perfil sem acesso a recomendacoes.' using errcode = '42501';
  end if;
  if origem_sessao is distinct from 'demonstracao'::origem_dado then
    raise exception 'Esta funcao aceita somente a origem demonstracao.' using errcode = '23514';
  end if;
  if quantidade_nova is null or quantidade_nova <= 0 then
    raise exception 'Quantidade deve ser positiva.' using errcode = '23514';
  end if;

  with casos as (
    select
      ex.id,
      ip.quantidade,
      coalesce((select sum(ue.horas) from usos_equipamento_proposta ue where ue.item_proposta_id = ip.id), 0)::numeric as horas_estimadas,
      coalesce((select sum(hr.horas) from horas_reais_equipamento hr where hr.execucao_id = ex.id and hr.origem = origem_sessao), 0)::numeric as horas_realizadas,
      exists (select 1 from usos_equipamento_proposta ue where ue.item_proposta_id = ip.id and ue.equipamento_id = equipamento) as mesmo_equipamento
    from execucoes_servico ex
    join itens_proposta ip on ip.id = ex.item_proposta_id and ip.origem = origem_sessao
    join licoes l on l.execucao_id = ex.id and l.origem = origem_sessao and l.estado = 'formalizada'
    join revisoes_licao rl on rl.licao_id = l.id and rl.numero = l.revisao_atual and rl.validada_em is not null
    where ex.origem = origem_sessao
      and ex.estado = 'concluido'
      and ip.servico_catalogo_id = servico
      and ip.quantidade > 0
  ), normalizados as (
    select *, round(horas_realizadas / quantidade * quantidade_nova, 6) as horas_normalizadas
    from casos
  ), estatisticas as (
    select
      count(*)::integer as total,
      (percentile_cont(0.25) within group (order by horas_normalizadas))::numeric as q1,
      (percentile_cont(0.50) within group (order by horas_normalizadas))::numeric as mediana,
      (percentile_cont(0.75) within group (order by horas_normalizadas))::numeric as q3,
      (percentile_cont(0.50) within group (order by horas_realizadas / nullif(horas_estimadas, 0))
        filter (where horas_estimadas > 0))::numeric as fator
    from normalizados
  )
  select e.total, jsonb_build_object(
    'quantidade_casos', e.total,
    'confianca', case when e.total = 0 then 'sem_base' when e.total < 5 then 'baixa' when e.total < 15 then 'media' else 'alta' end,
    'q1', case when e.total >= 5 then round(e.q1, 6) else null end,
    'mediana', case when e.total >= 5 then round(e.mediana, 6) else null end,
    'q3', case when e.total >= 5 then round(e.q3, 6) else null end,
    'fator_correcao', case when e.total >= 15 then round(e.fator, 6) else null end,
    'horas_sugeridas', case when e.total > 0 then round(e.mediana, 6) else null end,
    'casos', coalesce((select jsonb_agg(jsonb_build_object(
      'execucao_id', n.id,
      'horas_normalizadas', n.horas_normalizadas,
      'mesmo_equipamento', n.mesmo_equipamento
    ) order by n.mesmo_equipamento desc, n.id) from normalizados n), '[]'::jsonb)
  ) into quantidade_casos, resumo
  from estatisticas e;

  return resumo;
end;
$$;

revoke all on function criar_licao_demonstrativa(uuid, text, text[]) from public, anon;
revoke all on function formalizar_licao_demonstrativa(uuid) from public, anon;
revoke all on function revisar_licao_demonstrativa(uuid, text, text[]) from public, anon;
revoke all on function listar_indicadores_execucoes_demonstrativas() from public, anon;
revoke all on function recomendar_horas_demonstrativas(uuid, numeric, uuid) from public, anon;

grant execute on function criar_licao_demonstrativa(uuid, text, text[]) to authenticated;
grant execute on function formalizar_licao_demonstrativa(uuid) to authenticated;
grant execute on function revisar_licao_demonstrativa(uuid, text, text[]) to authenticated;
grant execute on function listar_indicadores_execucoes_demonstrativas() to authenticated;
grant execute on function recomendar_horas_demonstrativas(uuid, numeric, uuid) to authenticated;

comment on function criar_licao_demonstrativa(uuid, text, text[]) is
  'Cria licao em validacao somente para execucao concluida da origem demonstracao.';
comment on function formalizar_licao_demonstrativa(uuid) is
  'Formaliza e congela a revisao atual; somente Validador ou Administrador.';
comment on function revisar_licao_demonstrativa(uuid, text, text[]) is
  'Cria nova revisao auditada para corrigir licao formalizada e exige nova validacao.';
comment on function listar_indicadores_execucoes_demonstrativas() is
  'Compara esforco, custo e duracao estimados e realizados sem cruzar origens; custo fica oculto ao Tecnico.';
comment on function recomendar_horas_demonstrativas(uuid, numeric, uuid) is
  'Calcula quartis e fator somente com execucoes concluidas e licoes formalizadas da mesma origem e servico.';
