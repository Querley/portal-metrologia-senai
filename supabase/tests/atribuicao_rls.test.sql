begin;

create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('91000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tecnico1@example.test', '', now(), '{}', '{}', now(), now()),
  ('91000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tecnico2@example.test', '', now(), '{}', '{}', now(), now()),
  ('91000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@example.test', '', now(), '{}', '{}', now(), now()),
  ('91000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cliente@example.test', '', now(), '{}', '{}', now(), now());

insert into perfis (usuario_id, nome, perfil_interno, origem_ativa) values
  ('91000000-0000-0000-0000-000000000001', 'Tecnico Atribuido', 'tecnico', 'demonstracao'),
  ('91000000-0000-0000-0000-000000000002', 'Tecnico Nao Atribuido', 'tecnico', 'demonstracao'),
  ('91000000-0000-0000-0000-000000000003', 'Administrador Teste', 'administrador', 'demonstracao');

insert into empresas (id, origem, razao_social)
values ('92000000-0000-0000-0000-000000000001', 'demonstracao', 'Empresa Ficticia RLS');

insert into vinculos_empresa (empresa_id, usuario_id, aprovado_em)
values ('92000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000004', now());

insert into servicos_catalogo (id, slug, perguntas)
values ('93000000-0000-0000-0000-000000000001', 'servico-teste-rls', '[]');

insert into solicitacoes (id, origem, empresa_id, solicitante_id, servico_catalogo_id)
values (
  '94000000-0000-0000-0000-000000000001', 'demonstracao',
  '92000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000004',
  '93000000-0000-0000-0000-000000000001'
);

insert into propostas (id, origem, solicitacao_id, empresa_id, criado_por)
values (
  '95000000-0000-0000-0000-000000000001', 'demonstracao',
  '94000000-0000-0000-0000-000000000001', '92000000-0000-0000-0000-000000000001',
  '91000000-0000-0000-0000-000000000003'
);

insert into versoes_proposta (id, proposta_id, numero, origem, criada_por)
values (
  '96000000-0000-0000-0000-000000000001', '95000000-0000-0000-0000-000000000001',
  1, 'demonstracao', '91000000-0000-0000-0000-000000000003'
);

insert into itens_proposta (
  id, versao_proposta_id, origem, servico_catalogo_id, descricao, quantidade,
  percentual_lucro, custo_congelado, preco_antes_ajuste, preco_final
) values (
  '97000000-0000-0000-0000-000000000001', '96000000-0000-0000-0000-000000000001',
  'demonstracao', '93000000-0000-0000-0000-000000000001', 'Item ficticio RLS', 1,
  10, 100, 110, 110
);

insert into execucoes_servico (id, origem, item_proposta_id, estado, responsavel_id)
values (
  '98000000-0000-0000-0000-000000000001', 'demonstracao',
  '97000000-0000-0000-0000-000000000001', 'em_execucao',
  '91000000-0000-0000-0000-000000000001'
);

insert into etapas_execucao (id, execucao_id, origem, ordem, titulo, estado, progresso, visivel_cliente)
values
  ('99000000-0000-0000-0000-000000000001', '98000000-0000-0000-0000-000000000001', 'demonstracao', 1, 'Etapa publica', 'a_fazer', 0, true),
  ('99000000-0000-0000-0000-000000000002', '98000000-0000-0000-0000-000000000001', 'demonstracao', 2, 'Etapa interna', 'a_fazer', 0, false);

set local role authenticated;
select set_config('request.jwt.claim.sub', '91000000-0000-0000-0000-000000000001', true);
select is((select count(*) from execucoes_servico), 1::bigint, 'Tecnico atribuido le a execucao por RLS');
select is(jsonb_array_length(listar_execucoes_demonstrativas()), 1, 'Tecnico atribuido recebe a execucao pela RPC');
select is((select count(*) from etapas_execucao), 2::bigint, 'Tecnico atribuido le todas as etapas da sua execucao');

select set_config('request.jwt.claim.sub', '91000000-0000-0000-0000-000000000002', true);
select is((select count(*) from execucoes_servico), 0::bigint, 'Tecnico nao atribuido nao le a execucao por RLS');
select is(jsonb_array_length(listar_execucoes_demonstrativas()), 0, 'Tecnico nao atribuido nao recebe a execucao pela RPC');
select throws_ok(
  $$select atualizar_etapa_execucao_demonstrativa('99000000-0000-0000-0000-000000000001', 'em_andamento', 10)$$,
  '42501',
  'Tecnico pode operar somente execucao demonstrativa atribuida a ele.',
  'Tecnico nao atribuido nao altera etapa pela RPC'
);

select set_config('request.jwt.claim.sub', '91000000-0000-0000-0000-000000000003', true);
select is((select count(*) from execucoes_servico), 1::bigint, 'Administrador supervisiona todas as execucoes');
select is((select count(*) from listar_responsaveis_demonstrativos()), 2::bigint, 'Administrador consulta somente Tecnicos atribuiveis');
select lives_ok(
  $$select atribuir_responsavel_execucao_demonstrativa('98000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000002')$$,
  'Administrador reatribui a execucao'
);

select set_config('request.jwt.claim.sub', '91000000-0000-0000-0000-000000000002', true);
select is(jsonb_array_length(listar_execucoes_demonstrativas()), 1, 'Novo Tecnico passa a receber a execucao');

select set_config('request.jwt.claim.sub', '91000000-0000-0000-0000-000000000004', true);
select is((select count(*) from etapas_execucao), 1::bigint, 'Cliente le somente etapa marcada como visivel');

select * from finish();
rollback;
