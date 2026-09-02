begin;

create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('b1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'anexo-cliente@example.test', '', now(), '{}', '{}', now(), now()),
  ('b1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'anexo-outro@example.test', '', now(), '{}', '{}', now(), now()),
  ('b1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pdf-admin@example.test', '', now(), '{}', '{}', now(), now());

insert into perfis (usuario_id, nome, perfil_interno, origem_ativa) values
  ('b1000000-0000-0000-0000-000000000001', 'Cliente Anexo', null, 'demonstracao'),
  ('b1000000-0000-0000-0000-000000000002', 'Outro Cliente', null, 'demonstracao'),
  ('b1000000-0000-0000-0000-000000000003', 'Administrador PDF', 'administrador', 'demonstracao');

insert into empresas (id, origem, visibilidade, razao_social, documento_cifrado) values
  ('b2000000-0000-0000-0000-000000000001', 'demonstracao', 'restrito', 'Empresa Anexo Ficticia', 'DEMONSTRACAO:12345678000195'),
  ('b2000000-0000-0000-0000-000000000002', 'demonstracao', 'restrito', 'Outra Empresa Ficticia', 'DEMONSTRACAO:98765432000198');

insert into vinculos_empresa (empresa_id, usuario_id, perfil, aprovado_em, aprovado_por, unico_ativo) values
  ('b2000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'gestor_empresa', now(), 'b1000000-0000-0000-0000-000000000001', true),
  ('b2000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002', 'gestor_empresa', now(), 'b1000000-0000-0000-0000-000000000002', true);

insert into servicos_catalogo (id, slug, ativo, perguntas)
values ('b3000000-0000-0000-0000-000000000001', 'servico-anexo-ficticio', true, '[]');

insert into solicitacoes (id, origem, visibilidade, empresa_id, solicitante_id, servico_catalogo_id, respostas, estado) values
  ('b4000000-0000-0000-0000-000000000001', 'demonstracao', 'restrito', 'b2000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001', '{}', 'nova'),
  ('b4000000-0000-0000-0000-000000000002', 'demonstracao', 'restrito', 'b2000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002', 'b3000000-0000-0000-0000-000000000001', '{}', 'nova');

insert into propostas (id, origem, visibilidade, solicitacao_id, empresa_id, criado_por)
values ('b5000000-0000-0000-0000-000000000001', 'demonstracao', 'restrito', 'b4000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000003');

insert into versoes_proposta (id, proposta_id, numero, origem, estado, moeda, cotacao_brl, total_brl, total_moeda, criada_por)
values ('b6000000-0000-0000-0000-000000000001', 'b5000000-0000-0000-0000-000000000001', 1, 'demonstracao', 'aprovada', 'BRL', 1, 100, 100, 'b1000000-0000-0000-0000-000000000003');

insert into storage.objects (bucket_id, name, metadata) values
  ('solicitacoes', 'demonstracao/b4000000-0000-0000-0000-000000000001/b7000000-0000-0000-0000-000000000001-desenho.pdf', '{"mimetype":"application/pdf","size":120}'),
  ('pre-propostas', 'demonstracao/b6000000-0000-0000-0000-000000000001.pdf', '{"mimetype":"application/pdf","size":120}');

select is(
  solicitacao_anexo_do_caminho('demonstracao/b4000000-0000-0000-0000-000000000001/b7000000-0000-0000-0000-000000000001-desenho.pdf'),
  'b4000000-0000-0000-0000-000000000001'::uuid,
  'Caminho privado identifica somente a solicitacao demonstrativa'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'b1000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"b1000000-0000-0000-0000-000000000001","email":"anexo-cliente@example.test","role":"authenticated"}', true);

select ok(
  pode_enviar_anexo_solicitacao('demonstracao/b4000000-0000-0000-0000-000000000001/b7000000-0000-0000-0000-000000000002-peca.step'),
  'Cliente pode enviar anexo para a propria solicitacao'
);
select ok(
  not pode_enviar_anexo_solicitacao('demonstracao/b4000000-0000-0000-0000-000000000002/b7000000-0000-0000-0000-000000000002-peca.step'),
  'Cliente nao pode enviar anexo para solicitacao de outra empresa'
);
select lives_ok(
  $$select registrar_anexo_solicitacao_cliente_demonstrativa(
    'b4000000-0000-0000-0000-000000000001',
    'demonstracao/b4000000-0000-0000-0000-000000000001/b7000000-0000-0000-0000-000000000001-desenho.pdf',
    'desenho.pdf', 'application/pdf', 120
  )$$,
  'Cliente registra metadados do arquivo privado ja armazenado'
);
select is(
  (select count(*) from listar_anexos_solicitacao_cliente_demonstrativa('b4000000-0000-0000-0000-000000000001')),
  1::bigint,
  'Cliente lista o anexo vinculado ao trabalho selecionado'
);

select set_config('request.jwt.claim.sub', 'b1000000-0000-0000-0000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"b1000000-0000-0000-0000-000000000002","email":"anexo-outro@example.test","role":"authenticated"}', true);
select throws_ok(
  $$select * from listar_anexos_solicitacao_cliente_demonstrativa('b4000000-0000-0000-0000-000000000001')$$,
  '42501',
  'Solicitacao indisponivel para este Cliente.',
  'Outro Cliente nao lista anexos da empresa'
);

select set_config('request.jwt.claim.sub', 'b1000000-0000-0000-0000-000000000003', true);
select set_config('request.jwt.claims', '{"sub":"b1000000-0000-0000-0000-000000000003","email":"pdf-admin@example.test","role":"authenticated"}', true);
select ok(
  pode_gerenciar_pdf_pre_proposta_pendente('demonstracao/b6000000-0000-0000-0000-000000000001.pdf'),
  'Administrador reconhece o PDF orfao ainda nao congelado'
);
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'administrador remove pdf demonstrativo pendente'
      and cmd = 'DELETE'
  ),
  'Storage possui politica de remocao do PDF orfao pela API'
);
select is(
  (select count(*) from storage.objects where bucket_id = 'pre-propostas' and name = 'demonstracao/b6000000-0000-0000-0000-000000000001.pdf'),
  1::bigint,
  'Administrador consegue ler o PDF pendente antes da recuperacao pela API'
);
reset role;

update versoes_proposta
set pdf_caminho = 'demonstracao/b6000000-0000-0000-0000-000000000001.pdf',
    hash_conteudo = repeat('a', 64)
where id = 'b6000000-0000-0000-0000-000000000001';

set local role authenticated;
select set_config('request.jwt.claim.sub', 'b1000000-0000-0000-0000-000000000003', true);
select set_config('request.jwt.claims', '{"sub":"b1000000-0000-0000-0000-000000000003","email":"pdf-admin@example.test","role":"authenticated"}', true);
select ok(
  not pode_gerenciar_pdf_pre_proposta_pendente('demonstracao/b6000000-0000-0000-0000-000000000001.pdf'),
  'PDF congelado deixa de ser gerenciavel como pendente'
);
select ok(
  pode_ler_pdf_pre_proposta('demonstracao/b6000000-0000-0000-0000-000000000001.pdf'),
  'PDF congelado continua legivel para a equipe autorizada'
);
reset role;

select * from finish();
rollback;
