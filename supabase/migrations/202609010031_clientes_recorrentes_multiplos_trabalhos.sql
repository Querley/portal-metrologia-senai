-- Clientes recorrentes podem manter varios trabalhos simultaneos na mesma empresa.
-- O recorte continua exclusivo da origem demonstracao e nao habilita dados reais.

create or replace function materializar_solicitacao_publica_demonstrativa(
  entrada_id uuid,
  usuario_alvo uuid,
  empresa_alvo uuid,
  acao_auditoria text default 'ativar_portal_cliente'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  entrada solicitacoes_publicas%rowtype;
  solicitacao_nova uuid;
  servico_novo uuid;
  servico_slug text;
begin
  select * into entrada
  from solicitacoes_publicas sp
  where sp.id = entrada_id
    and sp.origem = 'demonstracao'
  for update;

  if entrada.id is null then
    raise exception 'Solicitacao publica demonstrativa nao encontrada.' using errcode = '23503';
  end if;
  if entrada.estado = 'ativada' then
    if entrada.ativada_por is distinct from usuario_alvo then
      raise exception 'Esta solicitacao ja foi vinculada a outro usuario.' using errcode = '42501';
    end if;
    return entrada.solicitacao_id;
  end if;
  if entrada.estado <> 'recebida' then
    raise exception 'Esta solicitacao nao pode ser vinculada.' using errcode = '23514';
  end if;
  if not exists (
    select 1
    from vinculos_empresa v
    join empresas e on e.id = v.empresa_id
    where v.usuario_id = usuario_alvo
      and v.empresa_id = empresa_alvo
      and v.aprovado_em is not null
      and v.unico_ativo
      and e.origem = 'demonstracao'
  ) then
    raise exception 'Vinculo ativo do Cliente nao encontrado.' using errcode = '42501';
  end if;

  servico_slug := case entrada.necessidade
    when 'digitalizacao-modelo-3d' then 'escaneamento-3d-digitalizacao-pecas'
    when 'medicao-inspecao-dimensional' then 'metrologia-avancada-inspecao-dimensional'
    when 'inspecao-interna-nao-destrutiva' then 'tomografia-industrial'
    when 'engenharia-reversa-adequacao' then 'engenharia-reversa-reconstrucao-cad'
    when 'analise-falha-desgaste' then 'mapa-desgaste'
    else 'escaneamento-3d-digitalizacao-pecas'
  end;

  select id into servico_novo
  from servicos_catalogo
  where slug = servico_slug and ativo;

  if servico_novo is null then
    raise exception 'Servico demonstrativo indisponivel.' using errcode = '23503';
  end if;

  insert into solicitacoes (
    origem, visibilidade, empresa_id, solicitante_id, servico_catalogo_id, respostas, estado
  ) values (
    'demonstracao', 'restrito', empresa_alvo, usuario_alvo, servico_novo,
    jsonb_build_object(
      'material', entrada.material,
      'quantidade', entrada.quantidade,
      'prazo_servico', entrada.prazo_servico,
      'prazo_pagamento_dias', entrada.prazo_pagamento_dias,
      'descricao', entrada.descricao,
      'necessidade', entrada.necessidade,
      'necessidade_personalizada', entrada.necessidade_personalizada,
      'origem_publica_id', entrada.id,
      'cnpj_informado_na_triagem', entrada.cnpj_sintetico
    ),
    'nova'
  ) returning id into solicitacao_nova;

  update solicitacoes_publicas
  set estado = 'ativada',
      ativada_por = usuario_alvo,
      ativada_em = now(),
      solicitacao_id = solicitacao_nova
  where id = entrada.id;

  insert into auditoria (origem, usuario_id, acao, entidade, entidade_id, dados)
  values (
    'demonstracao', usuario_alvo, acao_auditoria, 'solicitacoes', solicitacao_nova,
    jsonb_build_object(
      'solicitacao_publica_id', entrada.id,
      'codigo_publico', entrada.codigo,
      'empresa_id', empresa_alvo,
      'cnpj_triagem_diverge_empresa', entrada.cnpj_sintetico is distinct from nullif(regexp_replace(
        coalesce((select e.documento_cifrado from empresas e where e.id = empresa_alvo), ''),
        '^DEMONSTRACAO:', ''
      ), '')
    )
  );

  return solicitacao_nova;
end;
$$;

revoke all on function materializar_solicitacao_publica_demonstrativa(uuid, uuid, uuid, text) from public, anon, authenticated;

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
  empresa_destino uuid;
  solicitacao_nova uuid;
begin
  if usuario is null then
    raise exception 'Autenticacao necessaria.' using errcode = '42501';
  end if;
  if usuario_interno() then
    raise exception 'Perfis internos nao podem ativar acesso de Cliente.' using errcode = '42501';
  end if;
  if nullif(trim(token_ativacao), '') is null or char_length(token_ativacao) <> 64 then
    raise exception 'Token de ativacao invalido.' using errcode = '23514';
  end if;

  select * into entrada
  from solicitacoes_publicas sp
  where sp.token_ativacao_hash = encode(digest(trim(token_ativacao), 'sha256'), 'hex')
  for update;

  if entrada.id is null or entrada.token_expira_em < now() then
    raise exception 'Token de ativacao invalido ou expirado.' using errcode = '42501';
  end if;
  if entrada.email_normalizado <> email_usuario then
    raise exception 'Entre com o mesmo e-mail usado na solicitacao.' using errcode = '42501';
  end if;
  if entrada.estado = 'ativada' then
    if entrada.ativada_por <> usuario then
      raise exception 'Esta solicitacao ja foi vinculada.' using errcode = '42501';
    end if;
    return jsonb_build_object(
      'solicitacao_id', entrada.solicitacao_id,
      'codigo', entrada.codigo,
      'ja_ativada', true
    );
  end if;
  if entrada.estado <> 'recebida' then
    raise exception 'Esta solicitacao nao pode mais ser ativada.' using errcode = '42501';
  end if;

  insert into perfis (usuario_id, nome, perfil_interno, origem_ativa)
  values (usuario, entrada.nome, null, 'demonstracao')
  on conflict (usuario_id) do update set nome = excluded.nome
  where perfis.perfil_interno is null;

  select v.empresa_id into empresa_destino
  from vinculos_empresa v
  join empresas e on e.id = v.empresa_id
  where v.usuario_id = usuario
    and v.aprovado_em is not null
    and v.unico_ativo
    and e.origem = 'demonstracao'
  order by v.aprovado_em desc
  limit 1;

  if empresa_destino is null then
    insert into empresas (origem, visibilidade, razao_social, documento_cifrado)
    values ('demonstracao', 'restrito', entrada.empresa_nome, 'DEMONSTRACAO:' || entrada.cnpj_sintetico)
    returning id into empresa_destino;

    insert into vinculos_empresa (empresa_id, usuario_id, perfil, aprovado_em, aprovado_por, unico_ativo)
    values (empresa_destino, usuario, 'gestor_empresa', now(), usuario, true);
  end if;

  solicitacao_nova := materializar_solicitacao_publica_demonstrativa(
    entrada.id, usuario, empresa_destino, 'ativar_portal_cliente'
  );

  return jsonb_build_object(
    'solicitacao_id', solicitacao_nova,
    'codigo', entrada.codigo,
    'ja_ativada', false
  );
end;
$$;

create or replace function criar_solicitacao_cliente_demonstrativa(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  usuario uuid := auth.uid();
  empresa_destino uuid;
  empresa_nome text;
  documento_empresa text;
  nome_cliente text;
  email_cliente text := lower(trim(coalesce(auth.jwt()->>'email', '')));
  cnpj_empresa text;
  registro jsonb;
  entrada_id uuid;
  solicitacao_nova uuid;
begin
  if usuario is null or usuario_interno() then
    raise exception 'Acesso exclusivo do Cliente autenticado.' using errcode = '42501';
  end if;

  select v.empresa_id, e.razao_social, e.documento_cifrado, coalesce(p.nome, 'Cliente')
    into empresa_destino, empresa_nome, documento_empresa, nome_cliente
  from vinculos_empresa v
  join empresas e on e.id = v.empresa_id
  left join perfis p on p.usuario_id = v.usuario_id
  where v.usuario_id = usuario
    and v.aprovado_em is not null
    and v.unico_ativo
    and e.origem = 'demonstracao'
  order by v.aprovado_em desc
  limit 1;

  if empresa_destino is null then
    raise exception 'Vinculo ativo do Cliente nao encontrado.' using errcode = '42501';
  end if;
  if email_cliente !~ '^[a-z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-z0-9.-]+\.test$' then
    raise exception 'A homologacao aceita somente e-mail sintetico terminado em .test.' using errcode = '23514';
  end if;

  cnpj_empresa := regexp_replace(coalesce(documento_empresa, ''), '^DEMONSTRACAO:', '');
  if cnpj_empresa !~ '^[0-9]{14}$' or cnpj_empresa ~ '^([0-9])\1{13}$' then
    cnpj_empresa := '11222333000181';
  end if;

  registro := registrar_solicitacao_publica_demonstrativa(
    jsonb_build_object(
      'nome', nome_cliente,
      'email', email_cliente,
      'empresa', empresa_nome,
      'cnpj', cnpj_empresa,
      'telefone', payload->>'telefone',
      'necessidade', payload->>'necessidade',
      'necessidade_personalizada', payload->>'necessidade_personalizada',
      'material', payload->>'material',
      'quantidade', payload->>'quantidade',
      'prazo_servico', payload->>'prazo_servico',
      'prazo_pagamento_dias', payload->>'prazo_pagamento_dias',
      'descricao', payload->>'descricao'
    )
  );

  entrada_id := (registro->>'id')::uuid;
  solicitacao_nova := materializar_solicitacao_publica_demonstrativa(
    entrada_id, usuario, empresa_destino, 'criar_solicitacao_cliente'
  );

  return jsonb_build_object(
    'solicitacao_id', solicitacao_nova,
    'codigo', (registro->>'codigo')::bigint,
    'protocolo', 'DEM-SOL-' || lpad(registro->>'codigo', 4, '0')
  );
end;
$$;

create or replace function vincular_solicitacao_publica_cliente_existente(solicitacao_publica uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  usuario_interno_atual uuid := auth.uid();
  entrada solicitacoes_publicas%rowtype;
  usuario_cliente uuid;
  empresa_destino uuid;
begin
  if perfil_interno_atual() is distinct from 'administrador'::perfil_interno
    or origem_ativa_atual() is distinct from 'demonstracao'::origem_dado then
    raise exception 'Somente Administrador da demonstracao pode vincular esta solicitacao.' using errcode = '42501';
  end if;

  select * into entrada
  from solicitacoes_publicas sp
  where sp.id = solicitacao_publica and sp.origem = 'demonstracao'
  for update;

  if entrada.id is null or entrada.estado <> 'recebida' then
    raise exception 'Solicitacao pendente nao encontrada.' using errcode = '23503';
  end if;

  select u.id, v.empresa_id into usuario_cliente, empresa_destino
  from auth.users u
  join vinculos_empresa v on v.usuario_id = u.id
  join empresas e on e.id = v.empresa_id
  where lower(trim(u.email)) = entrada.email_normalizado
    and v.aprovado_em is not null
    and v.unico_ativo
    and e.origem = 'demonstracao'
  order by v.aprovado_em desc
  limit 1;

  if usuario_cliente is null then
    raise exception 'Cliente existente com o mesmo e-mail nao encontrado.' using errcode = '23503';
  end if;

  insert into auditoria (origem, usuario_id, acao, entidade, entidade_id, dados)
  values (
    'demonstracao', usuario_interno_atual, 'autorizar_vinculo_cliente_existente',
    'solicitacoes_publicas', entrada.id,
    jsonb_build_object('cliente_id', usuario_cliente, 'empresa_id', empresa_destino)
  );

  return materializar_solicitacao_publica_demonstrativa(
    entrada.id, usuario_cliente, empresa_destino, 'vincular_solicitacao_cliente_existente'
  );
end;
$$;

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
  estado_pre_proposta estado_proposta,
  cliente_existente boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if perfil_interno_atual() not in ('tecnico', 'validador', 'administrador') then
    raise exception 'Perfil sem acesso as solicitacoes.' using errcode = '42501';
  end if;
  if origem_ativa_atual() is distinct from 'demonstracao'::origem_dado then
    raise exception 'Esta funcao aceita somente a origem demonstracao.' using errcode = '23514';
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
    proposta_atual.estado,
    exists (
      select 1
      from auth.users u
      join vinculos_empresa v on v.usuario_id = u.id
      join empresas e on e.id = v.empresa_id
      where lower(trim(u.email)) = sp.email_normalizado
        and v.aprovado_em is not null
        and v.unico_ativo
        and e.origem = 'demonstracao'
    )
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
      'codigo', coalesce(sp.codigo, s.codigo),
      'protocolo', case
        when sp.codigo is not null then 'DEM-SOL-' || lpad(sp.codigo::text, 4, '0')
        else 'SOL-' || lpad(s.codigo::text, 4, '0')
      end,
      'estado', s.estado,
      'criada_em', s.criado_em,
      'servico', sc.slug,
      'proposta_estado', proposta_atual.estado,
      'valor_pre_proposta', proposta_atual.total_moeda,
      'prazo_pagamento_dias', proposta_atual.prazo_pagamento_dias,
      'aceita_em', proposta_atual.aceita_em,
      'execucao_estado', (
        select case
          when bool_and(ex.estado = 'concluido') then 'concluido'
          when bool_or(ex.estado = 'em_execucao') then 'em_execucao'
          when bool_or(ex.estado = 'planejado') then 'planejado'
          when bool_or(ex.estado = 'cancelado') then 'cancelado'
          else null
        end
        from itens_proposta ip
        join execucoes_servico ex on ex.item_proposta_id = ip.id
        where ip.versao_proposta_id = proposta_atual.id
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
        from itens_proposta ip
        join execucoes_servico ex on ex.item_proposta_id = ip.id
        join etapas_execucao et on et.execucao_id = ex.id
        where ip.versao_proposta_id = proposta_atual.id
          and et.visivel_cliente
          and et.origem = 'demonstracao'
      )
    ) as registro
    from solicitacoes s
    join servicos_catalogo sc on sc.id = s.servico_catalogo_id
    left join solicitacoes_publicas sp
      on sp.solicitacao_id = s.id and sp.origem = 'demonstracao'
    left join lateral (
      select vp.id, vp.estado, vp.total_moeda, vp.prazo_pagamento_dias, vp.aceita_em
      from propostas p
      join versoes_proposta vp on vp.proposta_id = p.id
      where p.solicitacao_id = s.id
        and vp.estado in ('publicada', 'aceita')
      order by vp.numero desc
      limit 1
    ) proposta_atual on true
    where s.origem = 'demonstracao'
      and usuario_da_empresa(s.empresa_id)
  ) dados;
$$;

-- Recupera entradas ja pendentes para um Cliente que possui um unico contexto ativo.
do $$
declare
  candidato record;
begin
  for candidato in
    select sp.id, u.id as usuario_id, contexto.empresa_id
    from solicitacoes_publicas sp
    join auth.users u on lower(trim(u.email)) = sp.email_normalizado
    join lateral (
      select v.empresa_id
      from vinculos_empresa v
      join empresas e on e.id = v.empresa_id
      where v.usuario_id = u.id
        and v.aprovado_em is not null
        and v.unico_ativo
        and e.origem = 'demonstracao'
      order by v.aprovado_em desc
      limit 1
    ) contexto on true
    where sp.origem = 'demonstracao'
      and sp.estado = 'recebida'
  loop
    perform materializar_solicitacao_publica_demonstrativa(
      candidato.id,
      candidato.usuario_id,
      candidato.empresa_id,
      'recuperar_solicitacao_cliente_recorrente'
    );
  end loop;
end;
$$;

revoke all on function ativar_solicitacao_cliente_demonstrativa(text) from public, anon;
revoke all on function criar_solicitacao_cliente_demonstrativa(jsonb) from public, anon;
revoke all on function vincular_solicitacao_publica_cliente_existente(uuid) from public, anon;
revoke all on function listar_solicitacoes_publicas_demonstrativas() from public, anon;
revoke all on function listar_portal_cliente() from public, anon;

grant execute on function ativar_solicitacao_cliente_demonstrativa(text) to authenticated;
grant execute on function criar_solicitacao_cliente_demonstrativa(jsonb) to authenticated;
grant execute on function vincular_solicitacao_publica_cliente_existente(uuid) to authenticated;
grant execute on function listar_solicitacoes_publicas_demonstrativas() to authenticated;
grant execute on function listar_portal_cliente() to authenticated;

comment on function criar_solicitacao_cliente_demonstrativa(jsonb) is
  'Cria outro trabalho demonstrativo na empresa do Cliente autenticado, sem exigir nova ativacao.';
comment on function vincular_solicitacao_publica_cliente_existente(uuid) is
  'Permite ao Administrador recuperar uma entrada pendente para o Cliente de mesmo e-mail.';
comment on function listar_portal_cliente() is
  'Entrega todos os trabalhos demonstrativos da empresa vinculada, com protocolo publico e selecao independente.';
