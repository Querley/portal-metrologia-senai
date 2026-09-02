begin;

create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('a1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'recorrente@example.test', '', now(), '{}', '{}', now(), now()),
  ('a1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-recorrente@example.test', '', now(), '{}', '{}', now(), now()),
  ('a1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tecnico-recorrente@example.test', '', now(), '{}', '{}', now(), now());

insert into perfis (usuario_id, nome, perfil_interno, origem_ativa) values
  ('a1000000-0000-0000-0000-000000000001', 'Cliente Recorrente', null, 'demonstracao'),
  ('a1000000-0000-0000-0000-000000000002', 'Administrador Recorrente', 'administrador', 'demonstracao'),
  ('a1000000-0000-0000-0000-000000000003', 'Tecnico Recorrente', 'tecnico', 'demonstracao');

insert into empresas (id, origem, visibilidade, razao_social, documento_cifrado)
values (
  'a2000000-0000-0000-0000-000000000001', 'demonstracao', 'restrito',
  'Empresa Recorrente Ficticia', 'DEMONSTRACAO:11222333000181'
);

insert into vinculos_empresa (empresa_id, usuario_id, perfil, aprovado_em, aprovado_por, unico_ativo)
values (
  'a2000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001',
  'gestor_empresa', now(), 'a1000000-0000-0000-0000-000000000001', true
);

insert into solicitacoes_publicas (
  id, nome, email_normalizado, empresa_nome, cnpj_sintetico, necessidade,
  material, quantidade, prazo_servico, prazo_pagamento_dias, descricao,
  token_ativacao_hash
) values (
  'a3000000-0000-0000-0000-000000000001', 'Cliente Recorrente', 'recorrente@example.test',
  'Empresa Recorrente Ficticia', '22333444000155', 'digitalizacao-modelo-3d',
  'Aco ficticio', 1, current_date + 30, 30, 'Nova solicitacao publica recorrente ficticia.',
  encode(extensions.digest(repeat('a', 64), 'sha256'), 'hex')
), (
  'a3000000-0000-0000-0000-000000000002', 'Cliente Recorrente', 'recorrente@example.test',
  'Empresa Recorrente Ficticia', '33444555000166', 'medicao-inspecao-dimensional',
  'Aluminio ficticio', 2, current_date + 35, 45, 'Solicitacao pendente para vinculo administrativo.',
  encode(extensions.digest(repeat('b', 64), 'sha256'), 'hex')
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"a1000000-0000-0000-0000-000000000001","email":"recorrente@example.test","role":"authenticated"}', true);

select lives_ok(
  $$select ativar_solicitacao_cliente_demonstrativa(repeat('a', 64))$$,
  'Cliente com empresa ativa vincula outro trabalho sem criar nova empresa'
);
reset role;
select is(
  (select count(*) from solicitacoes where empresa_id = 'a2000000-0000-0000-0000-000000000001'),
  1::bigint,
  'Ativacao recorrente cria o primeiro trabalho na empresa existente'
);
select is(
  (select count(*) from empresas where id = 'a2000000-0000-0000-0000-000000000001'),
  1::bigint,
  'Ativacao recorrente nao duplica a empresa'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"a1000000-0000-0000-0000-000000000001","email":"recorrente@example.test","role":"authenticated"}', true);
select lives_ok(
  $$select criar_solicitacao_cliente_demonstrativa(jsonb_build_object(
    'necessidade', 'analise-falha-desgaste',
    'material', 'Aco demonstrativo',
    'quantidade', 3,
    'prazo_servico', current_date + 40,
    'prazo_pagamento_dias', 60,
    'descricao', 'Segundo trabalho criado diretamente na area protegida.'
  ))$$,
  'Cliente cria outro trabalho diretamente na area protegida'
);
reset role;
select is(
  (select count(*) from solicitacoes where empresa_id = 'a2000000-0000-0000-0000-000000000001'),
  2::bigint,
  'Empresa mantem dois trabalhos simultaneos'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"a1000000-0000-0000-0000-000000000001","email":"recorrente@example.test","role":"authenticated"}', true);
select is(
  jsonb_array_length(listar_portal_cliente()),
  2,
  'Portal lista todos os trabalhos da empresa'
);
select ok(
  (listar_portal_cliente()->0->>'protocolo') like 'DEM-SOL-%',
  'Portal preserva o protocolo publico demonstrativo'
);

select set_config('request.jwt.claim.sub', 'a1000000-0000-0000-0000-000000000003', true);
select set_config('request.jwt.claims', '{"sub":"a1000000-0000-0000-0000-000000000003","email":"tecnico-recorrente@example.test","role":"authenticated"}', true);
select throws_ok(
  $$select vincular_solicitacao_publica_cliente_existente('a3000000-0000-0000-0000-000000000002')$$,
  '42501',
  'Somente Administrador da demonstracao pode vincular esta solicitacao.',
  'Tecnico nao pode forcar vinculo de Cliente'
);

select set_config('request.jwt.claim.sub', 'a1000000-0000-0000-0000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"a1000000-0000-0000-0000-000000000002","email":"admin-recorrente@example.test","role":"authenticated"}', true);
select ok(
  (select cliente_existente from listar_solicitacoes_publicas_demonstrativas() where id = 'a3000000-0000-0000-0000-000000000002'),
  'Fila interna identifica a solicitacao de Cliente existente'
);
select lives_ok(
  $$select vincular_solicitacao_publica_cliente_existente('a3000000-0000-0000-0000-000000000002')$$,
  'Administrador recupera solicitacao pendente para o Cliente existente'
);

select * from finish();
rollback;
