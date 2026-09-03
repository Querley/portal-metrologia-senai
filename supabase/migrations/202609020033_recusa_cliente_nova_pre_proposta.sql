-- Permite ao Cliente recusar uma pre-proposta emitida e solicitar nova versao.
-- A decisao e auditada; a equipe pode criar outra pre-proposta sem apagar o historico.

alter table versoes_proposta
  add column if not exists recusada_em timestamptz,
  add column if not exists recusada_por uuid references auth.users(id),
  add column if not exists recusa_motivo text;

alter table versoes_proposta
  drop constraint if exists versoes_proposta_recusa_motivo_valido;
alter table versoes_proposta
  add constraint versoes_proposta_recusa_motivo_valido
  check (recusa_motivo is null or char_length(trim(recusa_motivo)) between 5 and 1000) not valid;
alter table versoes_proposta validate constraint versoes_proposta_recusa_motivo_valido;

create or replace function recusar_pre_proposta_cliente(solicitacao uuid, motivo text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  usuario uuid := auth.uid();
  versao_id uuid;
  empresa uuid;
  expira_em_atual timestamptz;
  motivo_normalizado text := trim(coalesce(motivo, ''));
begin
  if usuario is null then
    raise exception 'Autenticacao obrigatoria.' using errcode = '42501';
  end if;
  if char_length(motivo_normalizado) not between 5 and 1000 then
    raise exception 'Informe o motivo da recusa entre 5 e 1000 caracteres.' using errcode = '23514';
  end if;

  select v.id, p.empresa_id, v.expira_em
    into versao_id, empresa, expira_em_atual
  from propostas p
  join versoes_proposta v on v.proposta_id = p.id
  where p.solicitacao_id = solicitacao
    and p.origem = 'demonstracao'
    and v.origem = 'demonstracao'
    and v.estado = 'publicada'
    and usuario_da_empresa(p.empresa_id)
  order by v.criada_em desc
  limit 1
  for update of v;

  if not found then
    raise exception 'Pre-proposta emitida nao encontrada para este usuario.' using errcode = '42501';
  end if;
  if expira_em_atual is not null and expira_em_atual < now() then
    raise exception 'Esta pre-proposta expirou.' using errcode = '23514';
  end if;

  update versoes_proposta
  set estado = 'recusada', recusada_em = now(), recusada_por = usuario, recusa_motivo = motivo_normalizado
  where id = versao_id;

  insert into auditoria (origem, usuario_id, acao, entidade, entidade_id, dados)
  values ('demonstracao', usuario, 'recusar_pre_proposta_cliente', 'versoes_proposta', versao_id,
    jsonb_build_object('estado_anterior', 'publicada', 'estado_novo', 'recusada', 'empresa_id', empresa, 'motivo', motivo_normalizado));
  return versao_id;
end;
$$;

-- Compatibilidade com a rotina consolidada anterior: estados recusados ficam terminais
-- apenas durante a mesma transacao, invisiveis a outras sessoes, para liberar a nova proposta.
create or replace function criar_nova_pre_proposta_para_solicitacao_demonstrativa(
  solicitacao uuid, servico uuid, equipamento uuid, descricao text, quantidade numeric,
  horas numeric, custos_extras numeric, percentual_lucro numeric, destinatario text,
  prazo_pagamento_dias integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  resultado uuid;
  recusadas uuid[];
begin
  if perfil_interno_atual() not in ('tecnico', 'validador', 'administrador')
     or origem_ativa_atual() is distinct from 'demonstracao'::origem_dado then
    raise exception 'Perfil sem autorizacao para criar pre-proposta.' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(solicitacao::text, 33));

  select array_agg(v.id) into recusadas
  from propostas p join versoes_proposta v on v.proposta_id = p.id
  where p.solicitacao_id = solicitacao and p.origem = 'demonstracao'
    and v.origem = 'demonstracao' and v.estado = 'recusada';

  update versoes_proposta set estado = 'rejeitada'
  where id = any(coalesce(recusadas, '{}'::uuid[]));

  resultado := criar_pre_proposta_para_solicitacao_demonstrativa(
    solicitacao, servico, equipamento, descricao, quantidade, horas, custos_extras,
    percentual_lucro, destinatario, prazo_pagamento_dias
  );

  update versoes_proposta set estado = 'recusada'
  where id = any(coalesce(recusadas, '{}'::uuid[]));

  if recusadas is not null then
    insert into auditoria (origem, usuario_id, acao, entidade, entidade_id, dados)
    values ('demonstracao', auth.uid(), 'criar_pre_proposta_apos_recusa_cliente', 'versoes_proposta', resultado,
      jsonb_build_object('solicitacao_id', solicitacao, 'versoes_recusadas', to_jsonb(recusadas)));
  end if;
  return resultado;
end;
$$;

drop function if exists listar_solicitacoes_publicas_demonstrativas();
create function listar_solicitacoes_publicas_demonstrativas()
returns table (
  id uuid, codigo bigint, nome text, email text, empresa text, necessidade text, estado text,
  criado_em timestamptz, solicitacao_id uuid, servico_id uuid, descricao text, quantidade integer,
  prazo_pagamento_dias integer, tem_pre_proposta boolean, estado_pre_proposta estado_proposta,
  cliente_existente boolean
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if perfil_interno_atual() not in ('tecnico', 'validador', 'administrador') then
    raise exception 'Perfil sem acesso as solicitacoes.' using errcode = '42501';
  end if;
  if origem_ativa_atual() is distinct from 'demonstracao'::origem_dado then
    raise exception 'Esta funcao aceita somente a origem demonstracao.' using errcode = '23514';
  end if;
  return query
  select sp.id, sp.codigo, sp.nome, sp.email_normalizado, sp.empresa_nome, sp.necessidade,
    sp.estado, sp.criado_em, sp.solicitacao_id, s.servico_catalogo_id, sp.descricao,
    sp.quantidade, sp.prazo_pagamento_dias,
    coalesce(proposta_atual.estado not in ('rejeitada', 'recusada', 'expirada', 'substituida'), false),
    proposta_atual.estado,
    exists (
      select 1 from auth.users u join vinculos_empresa ve on ve.usuario_id = u.id
      join empresas e on e.id = ve.empresa_id
      where lower(trim(u.email)) = sp.email_normalizado and ve.aprovado_em is not null
        and ve.unico_ativo and e.origem = 'demonstracao'
    )
  from solicitacoes_publicas sp
  left join solicitacoes s on s.id = sp.solicitacao_id and s.origem = 'demonstracao'
  left join lateral (
    select v.estado from propostas p join versoes_proposta v on v.proposta_id = p.id
    where p.solicitacao_id = sp.solicitacao_id and p.origem = 'demonstracao' and v.origem = 'demonstracao'
    order by v.criada_em desc limit 1
  ) proposta_atual on true
  where sp.origem = 'demonstracao'
  order by sp.criado_em desc;
end;
$$;

create or replace function listar_portal_cliente()
returns jsonb
language sql stable security definer set search_path = public
as $$
  select coalesce(jsonb_agg(registro order by (registro->>'criada_em') desc), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'id', s.id, 'codigo', coalesce(sp.codigo, s.codigo),
      'protocolo', case when sp.codigo is not null then 'DEM-SOL-' || lpad(sp.codigo::text, 4, '0') else 'SOL-' || lpad(s.codigo::text, 4, '0') end,
      'estado', s.estado, 'criada_em', s.criado_em, 'servico', sc.slug,
      'proposta_estado', proposta_atual.estado, 'valor_pre_proposta', proposta_atual.total_moeda,
      'prazo_pagamento_dias', proposta_atual.prazo_pagamento_dias, 'aceita_em', proposta_atual.aceita_em,
      'recusada_em', proposta_atual.recusada_em, 'recusa_motivo', proposta_atual.recusa_motivo,
      'execucao_estado', (
        select case when bool_and(ex.estado = 'concluido') then 'concluido'
          when bool_or(ex.estado = 'em_execucao') then 'em_execucao'
          when bool_or(ex.estado = 'planejado') then 'planejado'
          when bool_or(ex.estado = 'cancelado') then 'cancelado' else null end
        from itens_proposta ip join execucoes_servico ex on ex.item_proposta_id = ip.id
        where ip.versao_proposta_id = proposta_atual.id
      ),
      'etapas', (
        select coalesce(jsonb_agg(jsonb_build_object('id', et.id, 'titulo', et.titulo,
          'descricao', et.descricao, 'ordem', et.ordem, 'estado', et.estado,
          'progresso', et.progresso, 'atualizada_em', et.atualizada_em) order by et.ordem), '[]'::jsonb)
        from itens_proposta ip join execucoes_servico ex on ex.item_proposta_id = ip.id
        join etapas_execucao et on et.execucao_id = ex.id
        where ip.versao_proposta_id = proposta_atual.id and et.visivel_cliente and et.origem = 'demonstracao'
      )
    ) registro
    from solicitacoes s join servicos_catalogo sc on sc.id = s.servico_catalogo_id
    left join solicitacoes_publicas sp on sp.solicitacao_id = s.id and sp.origem = 'demonstracao'
    left join lateral (
      select vp.id, vp.estado, vp.total_moeda, vp.prazo_pagamento_dias, vp.aceita_em,
        vp.recusada_em, vp.recusa_motivo
      from propostas p join versoes_proposta vp on vp.proposta_id = p.id
      where p.solicitacao_id = s.id and vp.estado in ('publicada', 'aceita', 'recusada')
      order by vp.criada_em desc limit 1
    ) proposta_atual on true
    where s.origem = 'demonstracao' and usuario_da_empresa(s.empresa_id)
  ) dados;
$$;

create or replace function obter_pdf_pre_proposta_cliente(solicitacao uuid)
returns table (caminho text, hash_sha256 text)
language plpgsql stable security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Autenticacao obrigatoria.' using errcode = '42501'; end if;
  return query
  select v.pdf_caminho, v.hash_conteudo from propostas p join versoes_proposta v on v.proposta_id = p.id
  where p.solicitacao_id = solicitacao and p.origem = 'demonstracao' and v.origem = 'demonstracao'
    and v.estado in ('publicada', 'aceita', 'recusada') and v.pdf_caminho is not null
    and v.hash_conteudo is not null and usuario_da_empresa(p.empresa_id)
  order by v.criada_em desc limit 1;
  if not found then raise exception 'PDF emitido ainda nao disponivel.' using errcode = '23503'; end if;
end;
$$;

create or replace function public.pode_ler_pdf_pre_proposta(caminho text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.versoes_proposta v join public.propostas p on p.id = v.proposta_id
    where v.id = public.versao_pdf_do_caminho(caminho) and v.origem = 'demonstracao'
      and p.origem = 'demonstracao' and v.pdf_caminho = caminho and v.hash_conteudo is not null
      and (exists (select 1 from public.perfis pf where pf.usuario_id = auth.uid()
        and pf.perfil_interno in ('tecnico', 'validador', 'administrador') and pf.origem_ativa = 'demonstracao')
        or (v.estado in ('publicada', 'aceita', 'recusada') and exists (
          select 1 from public.vinculos_empresa ve where ve.usuario_id = auth.uid()
            and ve.empresa_id = p.empresa_id and ve.aprovado_em is not null and ve.unico_ativo)))
  );
$$;

revoke all on function recusar_pre_proposta_cliente(uuid, text) from public, anon;
revoke all on function criar_nova_pre_proposta_para_solicitacao_demonstrativa(uuid, uuid, uuid, text, numeric, numeric, numeric, numeric, text, integer) from public, anon;
revoke all on function listar_solicitacoes_publicas_demonstrativas() from public, anon;
revoke all on function listar_portal_cliente() from public, anon;
revoke all on function obter_pdf_pre_proposta_cliente(uuid) from public, anon;
revoke all on function public.pode_ler_pdf_pre_proposta(text) from public, anon;
grant execute on function recusar_pre_proposta_cliente(uuid, text) to authenticated;
grant execute on function criar_nova_pre_proposta_para_solicitacao_demonstrativa(uuid, uuid, uuid, text, numeric, numeric, numeric, numeric, text, integer) to authenticated;
grant execute on function listar_solicitacoes_publicas_demonstrativas() to authenticated;
grant execute on function listar_portal_cliente() to authenticated;
grant execute on function obter_pdf_pre_proposta_cliente(uuid) to authenticated;
grant execute on function public.pode_ler_pdf_pre_proposta(text) to authenticated;

comment on function recusar_pre_proposta_cliente(uuid, text) is 'Registra a recusa autenticada e auditada do Cliente sobre a pre-proposta emitida.';
comment on function criar_nova_pre_proposta_para_solicitacao_demonstrativa(uuid, uuid, uuid, text, numeric, numeric, numeric, numeric, text, integer) is 'Cria outra pre-proposta para a solicitacao, inclusive depois da recusa do Cliente, sem apagar a decisao anterior.';
