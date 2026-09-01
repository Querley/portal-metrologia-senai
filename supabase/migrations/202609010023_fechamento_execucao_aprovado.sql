-- Fechamento operacional demonstrativo com separacao de responsabilidades.
-- Tecnico, Validador e Administrador podem registrar; somente Validador ou
-- Administrador aprovam ou devolvem. A aprovacao encerra a execucao.

alter table execucoes_servico
  add column if not exists fechamento_estado text not null default 'nao_iniciado',
  add column if not exists fechamento_observacoes text,
  add column if not exists fechamento_aprendizado text,
  add column if not exists fechamento_enviado_em timestamptz,
  add column if not exists fechamento_enviado_por uuid references auth.users(id),
  add column if not exists fechamento_decidido_em timestamptz,
  add column if not exists fechamento_decidido_por uuid references auth.users(id),
  add column if not exists fechamento_justificativa text;

alter table execucoes_servico
  drop constraint if exists execucoes_fechamento_estado_valido;

alter table execucoes_servico
  add constraint execucoes_fechamento_estado_valido
  check (fechamento_estado in ('nao_iniciado', 'em_validacao', 'devolvido', 'aprovado')) not valid;

alter table execucoes_servico validate constraint execucoes_fechamento_estado_valido;

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
      'fechamento_estado', ex.fechamento_estado,
      'custos_extras_reais', ex.custos_extras_reais,
      'retrabalho', ex.retrabalho,
      'mudanca_escopo', ex.mudanca_escopo,
      'causa_principal', ex.causa_principal,
      'fechamento_observacoes', ex.fechamento_observacoes,
      'fechamento_aprendizado', ex.fechamento_aprendizado,
      'fechamento_enviado_em', ex.fechamento_enviado_em,
      'fechamento_decidido_em', ex.fechamento_decidido_em,
      'fechamento_justificativa', ex.fechamento_justificativa,
      'equipamentos', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'equipamento_id', uso.equipamento_id,
          'nome', uso.nome,
          'horas_estimadas', uso.horas_estimadas,
          'horas_reais', hr.horas
        ) order by uso.nome), '[]'::jsonb)
        from (
          select ue.equipamento_id, eq.nome, sum(ue.horas) as horas_estimadas
          from usos_equipamento_proposta ue
          join equipamentos eq on eq.id = ue.equipamento_id
          where ue.item_proposta_id = ip.id
          group by ue.equipamento_id, eq.nome
        ) uso
        left join horas_reais_equipamento hr
          on hr.execucao_id = ex.id
         and hr.equipamento_id = uso.equipamento_id
         and hr.origem = origem_sessao
      ),
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

create or replace function registrar_fechamento_demonstrativo(
  execucao uuid,
  equipamentos_horas jsonb,
  custos_extras numeric,
  houve_retrabalho boolean,
  houve_mudanca_escopo boolean,
  causa text,
  observacoes text,
  aprendizado text
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
  autor_proposta uuid;
  estado_atual estado_servico;
  fechamento_atual text;
  esperados integer;
  recebidos integer;
  distintos integer;
begin
  select pf.perfil_interno, pf.origem_ativa into perfil, origem_sessao
  from perfis pf where pf.usuario_id = usuario;

  if perfil is null or perfil not in ('tecnico', 'validador', 'administrador') then
    raise exception 'Perfil sem permissao para registrar fechamento.' using errcode = '42501';
  end if;
  if origem_sessao is distinct from 'demonstracao'::origem_dado then
    raise exception 'Esta funcao aceita somente a origem demonstracao.' using errcode = '23514';
  end if;
  if jsonb_typeof(coalesce(equipamentos_horas, '[]'::jsonb)) <> 'array' then
    raise exception 'Horas reais devem ser enviadas como lista.' using errcode = '23514';
  end if;
  if custos_extras is null or custos_extras < 0 then
    raise exception 'Custos extras devem ser maiores ou iguais a zero.' using errcode = '23514';
  end if;
  if char_length(trim(coalesce(observacoes, ''))) not between 5 and 2000 then
    raise exception 'Informe observacoes do fechamento entre 5 e 2000 caracteres.' using errcode = '23514';
  end if;
  if nullif(trim(coalesce(aprendizado, '')), '') is not null
     and char_length(trim(aprendizado)) not between 5 and 2000 then
    raise exception 'O aprendizado deve ter entre 5 e 2000 caracteres.' using errcode = '23514';
  end if;
  if (houve_retrabalho or houve_mudanca_escopo)
     and char_length(trim(coalesce(causa, ''))) not between 5 and 500 then
    raise exception 'Informe a causa principal quando houver retrabalho ou mudanca de escopo.' using errcode = '23514';
  end if;

  select ex.estado, ex.fechamento_estado, p.criado_por
    into estado_atual, fechamento_atual, autor_proposta
  from execucoes_servico ex
  join itens_proposta ip on ip.id = ex.item_proposta_id
  join versoes_proposta vp on vp.id = ip.versao_proposta_id
  join propostas p on p.id = vp.proposta_id
  where ex.id = execucao and ex.origem = origem_sessao
  for update of ex;

  if not found then
    raise exception 'Execucao nao encontrada na origem ativa.' using errcode = '23503';
  end if;
  if perfil = 'tecnico' and autor_proposta is distinct from usuario then
    raise exception 'Tecnico pode fechar somente os proprios trabalhos.' using errcode = '42501';
  end if;
  if estado_atual is distinct from 'em_execucao'::estado_servico then
    raise exception 'Somente uma execucao em andamento pode ser fechada.' using errcode = '23514';
  end if;
  if fechamento_atual in ('em_validacao', 'aprovado') then
    raise exception 'Este fechamento ja foi enviado ou aprovado.' using errcode = '23514';
  end if;
  if exists (
    select 1 from etapas_execucao et
    where et.execucao_id = execucao and et.origem = origem_sessao
      and (et.estado <> 'concluida' or et.progresso <> 100)
  ) or not exists (
    select 1 from etapas_execucao et
    where et.execucao_id = execucao and et.origem = origem_sessao
  ) then
    raise exception 'Conclua todas as etapas antes de enviar o fechamento.' using errcode = '23514';
  end if;

  select count(distinct ue.equipamento_id) into esperados
  from execucoes_servico ex
  join usos_equipamento_proposta ue on ue.item_proposta_id = ex.item_proposta_id
  where ex.id = execucao;

  select count(*), count(distinct entrada.equipamento_id)
    into recebidos, distintos
  from jsonb_to_recordset(coalesce(equipamentos_horas, '[]'::jsonb))
    as entrada(equipamento_id uuid, horas numeric);

  if recebidos <> esperados or distintos <> esperados or exists (
    select 1
    from jsonb_to_recordset(coalesce(equipamentos_horas, '[]'::jsonb))
      as entrada(equipamento_id uuid, horas numeric)
    where entrada.equipamento_id is null or entrada.horas is null or entrada.horas < 0
  ) or exists (
    select 1
    from jsonb_to_recordset(coalesce(equipamentos_horas, '[]'::jsonb))
      as entrada(equipamento_id uuid, horas numeric)
    where not exists (
      select 1 from execucoes_servico ex
      join usos_equipamento_proposta ue on ue.item_proposta_id = ex.item_proposta_id
      where ex.id = execucao and ue.equipamento_id = entrada.equipamento_id
    )
  ) then
    raise exception 'Informe uma carga horaria valida para cada equipamento previsto.' using errcode = '23514';
  end if;

  delete from horas_reais_equipamento hr
  where hr.execucao_id = execucao and hr.origem = origem_sessao;

  insert into horas_reais_equipamento (
    execucao_id, origem, equipamento_id, horas, custo_hora_inicio_real
  )
  select
    ex.id,
    origem_sessao,
    entrada.equipamento_id,
    entrada.horas,
    coalesce((
      select ce.custo_hora
      from custos_equipamento ce
      where ce.equipamento_id = entrada.equipamento_id
        and ce.origem = origem_sessao
        and ce.vigente_desde <= coalesce(ex.inicio_real, now())::date
        and (ce.vigente_ate is null or ce.vigente_ate >= coalesce(ex.inicio_real, now())::date)
      order by ce.vigente_desde desc
      limit 1
    ), ue.custo_hora_congelado)
  from jsonb_to_recordset(coalesce(equipamentos_horas, '[]'::jsonb))
    as entrada(equipamento_id uuid, horas numeric)
  join execucoes_servico ex on ex.id = execucao
  join (
    select ue.item_proposta_id, ue.equipamento_id, max(ue.custo_hora_congelado) as custo_hora_congelado
    from usos_equipamento_proposta ue
    group by ue.item_proposta_id, ue.equipamento_id
  ) ue on ue.item_proposta_id = ex.item_proposta_id
      and ue.equipamento_id = entrada.equipamento_id;

  update execucoes_servico
  set custos_extras_reais = custos_extras,
      retrabalho = houve_retrabalho,
      mudanca_escopo = houve_mudanca_escopo,
      causa_principal = nullif(trim(coalesce(causa, '')), ''),
      fechamento_observacoes = trim(observacoes),
      fechamento_aprendizado = nullif(trim(coalesce(aprendizado, '')), ''),
      fechamento_estado = 'em_validacao',
      fechamento_enviado_em = now(),
      fechamento_enviado_por = usuario,
      fechamento_decidido_em = null,
      fechamento_decidido_por = null,
      fechamento_justificativa = null
  where id = execucao;

  insert into auditoria (origem, usuario_id, acao, entidade, entidade_id, dados)
  values (origem_sessao, usuario, 'registrar_fechamento_demonstrativo', 'execucoes_servico', execucao,
    jsonb_build_object('fechamento_estado', 'em_validacao', 'equipamentos_informados', recebidos,
      'custos_extras_reais', custos_extras, 'retrabalho', houve_retrabalho,
      'mudanca_escopo', houve_mudanca_escopo));
end;
$$;

create or replace function decidir_fechamento_demonstrativo(
  execucao uuid,
  decisao text,
  justificativa text default null
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
  fechamento_atual text;
begin
  select pf.perfil_interno, pf.origem_ativa into perfil, origem_sessao
  from perfis pf where pf.usuario_id = usuario;

  if perfil is null or perfil not in ('validador', 'administrador') then
    raise exception 'Somente Validador ou Administrador decide o fechamento.' using errcode = '42501';
  end if;
  if origem_sessao is distinct from 'demonstracao'::origem_dado then
    raise exception 'Esta funcao aceita somente a origem demonstracao.' using errcode = '23514';
  end if;
  if decisao not in ('aprovar', 'devolver') then
    raise exception 'Decisao de fechamento invalida.' using errcode = '23514';
  end if;
  if decisao = 'devolver' and char_length(trim(coalesce(justificativa, ''))) not between 5 and 500 then
    raise exception 'A devolucao exige justificativa entre 5 e 500 caracteres.' using errcode = '23514';
  end if;

  select ex.fechamento_estado into fechamento_atual
  from execucoes_servico ex
  where ex.id = execucao and ex.origem = origem_sessao
  for update;

  if not found then
    raise exception 'Execucao nao encontrada na origem ativa.' using errcode = '23503';
  end if;
  if fechamento_atual is distinct from 'em_validacao' then
    raise exception 'Somente um fechamento em validacao pode ser decidido.' using errcode = '23514';
  end if;

  update execucoes_servico
  set fechamento_estado = case when decisao = 'aprovar' then 'aprovado' else 'devolvido' end,
      fechamento_decidido_em = now(),
      fechamento_decidido_por = usuario,
      fechamento_justificativa = case when decisao = 'devolver' then trim(justificativa) else null end,
      estado = case when decisao = 'aprovar' then 'concluido'::estado_servico else estado end,
      entrega_real = case when decisao = 'aprovar' then now() else entrega_real end
  where id = execucao;

  insert into auditoria (origem, usuario_id, acao, entidade, entidade_id, dados)
  values (origem_sessao, usuario, 'decidir_fechamento_demonstrativo', 'execucoes_servico', execucao,
    jsonb_build_object('decisao', decisao, 'justificativa', nullif(trim(coalesce(justificativa, '')), '')));
end;
$$;

revoke all on function listar_execucoes_demonstrativas() from public, anon;
revoke all on function registrar_fechamento_demonstrativo(uuid, jsonb, numeric, boolean, boolean, text, text, text) from public, anon;
revoke all on function decidir_fechamento_demonstrativo(uuid, text, text) from public, anon;

grant execute on function listar_execucoes_demonstrativas() to authenticated;
grant execute on function registrar_fechamento_demonstrativo(uuid, jsonb, numeric, boolean, boolean, text, text, text) to authenticated;
grant execute on function decidir_fechamento_demonstrativo(uuid, text, text) to authenticated;

comment on column execucoes_servico.fechamento_estado is
  'Fluxo separado das etapas: registro interno, validacao, devolucao e aprovacao final.';
comment on function registrar_fechamento_demonstrativo(uuid, jsonb, numeric, boolean, boolean, text, text, text) is
  'Registra realizado e envia para validacao, preservando a hierarquia interna e a origem demonstracao.';
comment on function decidir_fechamento_demonstrativo(uuid, text, text) is
  'Validador ou Administrador aprova e conclui a execucao, ou devolve o fechamento com justificativa.';
