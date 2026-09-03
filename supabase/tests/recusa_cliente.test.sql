begin;

create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('c1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'recusa-cliente@example.test', '', now(), '{}', '{}', now(), now()),
  ('c1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'recusa-outro@example.test', '', now(), '{}', '{}', now(), now()),
  ('c1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'recusa-admin@example.test', '', now(), '{}', '{}', now(), now());

insert into perfis (usuario_id, nome, perfil_interno, origem_ativa) values
  ('c1000000-0000-0000-0000-000000000001', 'Cliente Recusa', null, 'demonstracao'),
  ('c1000000-0000-0000-0000-000000000002', 'Outro Cliente Recusa', null, 'demonstracao'),
  ('c1000000-0000-0000-0000-000000000003', 'Administrador Recusa', 'administrador', 'demonstracao');

insert into empresas (id, origem, visibilidade, razao_social, documento_cifrado)
values ('c2000000-0000-0000-0000-000000000001', 'demonstracao', 'restrito', 'Empresa Recusa Ficticia', 'DEMONSTRACAO:12345678000195');
insert into vinculos_empresa (empresa_id, usuario_id, perfil, aprovado_em, aprovado_por, unico_ativo)
values ('c2000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'gestor_empresa', now(), 'c1000000-0000-0000-0000-000000000001', true);

insert into servicos_catalogo (id, slug, ativo, perguntas)
values ('c3000000-0000-0000-0000-000000000001', 'servico-recusa-ficticio', true, '[]');
insert into equipamentos (id, codigo, nome, ativo)
values ('c3100000-0000-0000-0000-000000000001', 'EQ-RECUSA-FICTICIO', 'Equipamento Recusa Ficticio', true);
insert into custos_equipamento (equipamento_id, custo_hora, vigente_desde, origem_fonte, criado_por, origem)
values ('c3100000-0000-0000-0000-000000000001', 100, current_date - 1, 'Teste transacional ficticio', 'c1000000-0000-0000-0000-000000000003', 'demonstracao');
insert into solicitacoes (id, origem, visibilidade, empresa_id, solicitante_id, servico_catalogo_id, respostas, estado)
values ('c4000000-0000-0000-0000-000000000001', 'demonstracao', 'restrito', 'c2000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000001', '{}', 'orcada');
insert into solicitacoes_publicas (id, nome, email_normalizado, empresa_nome, cnpj_sintetico, necessidade, material, quantidade, prazo_servico, prazo_pagamento_dias, descricao, estado, token_ativacao_hash, ativada_por, ativada_em, solicitacao_id)
values ('c4100000-0000-0000-0000-000000000001', 'Cliente Recusa', 'recusa-cliente@example.test', 'Empresa Recusa Ficticia', '12345678000195', 'outro', 'Material ficticio', 1, current_date + 30, 30, 'Solicitacao ficticia para testar recusa.', 'ativada', repeat('c', 64), 'c1000000-0000-0000-0000-000000000001', now(), 'c4000000-0000-0000-0000-000000000001');
insert into propostas (id, origem, visibilidade, solicitacao_id, empresa_id, criado_por)
values ('c5000000-0000-0000-0000-000000000001', 'demonstracao', 'restrito', 'c4000000-0000-0000-0000-000000000001', 'c2000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000003');
insert into versoes_proposta (id, proposta_id, numero, origem, estado, moeda, cotacao_brl, total_brl, total_moeda, criada_por, destinatario, prazo_pagamento_dias, expira_em, pdf_caminho, hash_conteudo)
values ('c6000000-0000-0000-0000-000000000001', 'c5000000-0000-0000-0000-000000000001', 1, 'demonstracao', 'publicada', 'BRL', 1, 100, 100, 'c1000000-0000-0000-0000-000000000003', 'Cliente Recusa', 30, now() + interval '30 days', 'demonstracao/c6000000-0000-0000-0000-000000000001.pdf', repeat('a', 64));

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000002', true);
select throws_ok($$select recusar_pre_proposta_cliente('c4000000-0000-0000-0000-000000000001', 'Nao concordo com o prazo.')$$, '42501', 'Pre-proposta emitida nao encontrada para este usuario.', 'Outro Cliente nao pode recusar a proposta');

select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000001', true);
select lives_ok($$select recusar_pre_proposta_cliente('c4000000-0000-0000-0000-000000000001', 'Preciso revisar o prazo de entrega.')$$, 'Cliente vinculado recusa a proposta emitida');
reset role;
select is((select estado::text from versoes_proposta where id = 'c6000000-0000-0000-0000-000000000001'), 'recusada', 'Estado recusada e persistido');
select is((select recusa_motivo from versoes_proposta where id = 'c6000000-0000-0000-0000-000000000001'), 'Preciso revisar o prazo de entrega.', 'Motivo da recusa e persistido');
select is((select count(*) from auditoria where entidade_id = 'c6000000-0000-0000-0000-000000000001' and acao = 'recusar_pre_proposta_cliente'), 1::bigint, 'Recusa gera auditoria');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000001', true);
select ok(pode_ler_pdf_pre_proposta('demonstracao/c6000000-0000-0000-0000-000000000001.pdf'), 'Cliente ainda consulta o PDF recusado como historico');
select is(listar_portal_cliente()->0->>'proposta_estado', 'recusada', 'Portal do Cliente exibe a decisao recusada');

select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000003', true);
select ok((select not tem_pre_proposta and estado_pre_proposta = 'recusada' from listar_solicitacoes_publicas_demonstrativas() where id = 'c4100000-0000-0000-0000-000000000001'), 'Fila interna libera uma nova pre-proposta depois da recusa');
select lives_ok(
  $$select criar_nova_pre_proposta_para_solicitacao_demonstrativa(
    'c4000000-0000-0000-0000-000000000001',
    'c3000000-0000-0000-0000-000000000001',
    'c3100000-0000-0000-0000-000000000001',
    'Nova versao ficticia apos revisao solicitada', 1, 2, 0, 20, 'Cliente Recusa', 30
  )$$,
  'Equipe cria uma nova pre-proposta depois da recusa do Cliente'
);
reset role;
select is((select estado::text from versoes_proposta where id = 'c6000000-0000-0000-0000-000000000001'), 'recusada', 'Versao recusada permanece imutavel no historico');
select is((select count(*) from versoes_proposta v join propostas p on p.id = v.proposta_id where p.solicitacao_id = 'c4000000-0000-0000-0000-000000000001' and v.estado = 'rascunho'), 1::bigint, 'Nova pre-proposta inicia em rascunho');
select is((select count(*) from auditoria where acao = 'criar_pre_proposta_apos_recusa_cliente' and dados->>'solicitacao_id' = 'c4000000-0000-0000-0000-000000000001'), 1::bigint, 'Nova versao depois da recusa gera auditoria especifica');

select * from finish();
rollback;
