-- Corrige a resolução da variável de e-mail na limitação de solicitações da migration 014.

create or replace function registrar_solicitacao_publica_demonstrativa(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  nome_recebido text := trim(coalesce(payload->>'nome', ''));
  email_recebido text := lower(trim(coalesce(payload->>'email', '')));
  empresa_recebida text := trim(coalesce(payload->>'empresa', ''));
  cnpj_recebido text := regexp_replace(coalesce(payload->>'cnpj', ''), '[^0-9]', '', 'g');
  telefone_recebido text := nullif(trim(coalesce(payload->>'telefone', '')), '');
  necessidade_recebida text := trim(coalesce(payload->>'necessidade', ''));
  necessidade_personalizada_recebida text := nullif(trim(coalesce(payload->>'necessidade_personalizada', '')), '');
  material_recebido text := trim(coalesce(payload->>'material', ''));
  quantidade_recebida integer;
  prazo_servico_recebido date;
  prazo_pagamento_recebido integer;
  descricao_recebida text := trim(coalesce(payload->>'descricao', ''));
  token_ativacao text := encode(gen_random_bytes(32), 'hex');
  nova_id uuid;
  novo_codigo bigint;
begin
  if nome_recebido !~ '^.{2,120}$' then
    raise exception 'Nome inválido.' using errcode = '23514';
  end if;
  if email_recebido !~ '^[a-z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-z0-9.-]+\.test$' then
    raise exception 'Na homologação, use somente um e-mail sintético terminado em .test.' using errcode = '23514';
  end if;
  if empresa_recebida !~ '^.{2,180}$' then
    raise exception 'Empresa inválida.' using errcode = '23514';
  end if;
  if cnpj_recebido !~ '^[0-9]{14}$' or cnpj_recebido ~ '^([0-9])\1{13}$' then
    raise exception 'CNPJ sintético inválido.' using errcode = '23514';
  end if;
  if necessidade_recebida not in (
    'digitalizacao-modelo-3d', 'medicao-inspecao-dimensional',
    'inspecao-interna-nao-destrutiva', 'engenharia-reversa-adequacao',
    'analise-falha-desgaste', 'orientacao-tecnica', 'outro'
  ) then
    raise exception 'Necessidade inválida.' using errcode = '23514';
  end if;
  if char_length(material_recebido) not between 2 and 120 then
    raise exception 'Material inválido.' using errcode = '23514';
  end if;
  if char_length(descricao_recebida) not between 10 and 5000 then
    raise exception 'Descrição deve ter entre 10 e 5000 caracteres.' using errcode = '23514';
  end if;
  if telefone_recebido is not null and char_length(telefone_recebido) not between 8 and 30 then
    raise exception 'Telefone inválido.' using errcode = '23514';
  end if;

  begin
    quantidade_recebida := (payload->>'quantidade')::integer;
    prazo_servico_recebido := (payload->>'prazo_servico')::date;
    prazo_pagamento_recebido := (payload->>'prazo_pagamento_dias')::integer;
  exception when others then
    raise exception 'Quantidade ou prazos inválidos.' using errcode = '23514';
  end;

  if quantidade_recebida not between 1 and 100000
    or prazo_pagamento_recebido not between 1 and 365
    or prazo_servico_recebido < current_date then
    raise exception 'Quantidade ou prazos fora do intervalo permitido.' using errcode = '23514';
  end if;

  if exists (
    select 1 from solicitacoes_publicas sp
    where sp.email_normalizado = email_recebido
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
    nome_recebido, email_recebido, empresa_recebida, cnpj_recebido, telefone_recebido,
    necessidade_recebida, necessidade_personalizada_recebida, material_recebido, quantidade_recebida,
    prazo_servico_recebido, prazo_pagamento_recebido, descricao_recebida,
    encode(digest(token_ativacao, 'sha256'), 'hex')
  ) returning id, codigo into nova_id, novo_codigo;

  insert into auditoria (origem, acao, entidade, entidade_id, dados)
  values ('demonstracao', 'receber_solicitacao_publica', 'solicitacoes_publicas', nova_id,
    jsonb_build_object('codigo', novo_codigo, 'necessidade', necessidade_recebida));

  return jsonb_build_object(
    'id', nova_id,
    'codigo', novo_codigo,
    'token_ativacao', token_ativacao,
    'token_expira_em', now() + interval '14 days'
  );
end;
$$;

revoke all on function registrar_solicitacao_publica_demonstrativa(jsonb) from public;
grant execute on function registrar_solicitacao_publica_demonstrativa(jsonb) to anon, authenticated;
