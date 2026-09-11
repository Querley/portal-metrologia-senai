begin;

create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('c1000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','admin@empresa.com.br','',now(),'{}','{}',now(),now()),
('c1000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','tecnico@empresa.com.br','',now(),'{}','{}',now(),now()),
('c1000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','cliente@empresa.com.br','',now(),'{}','{}',now(),now());

insert into perfis(usuario_id,nome,perfil_interno,origem_ativa) values
('c1000000-0000-0000-0000-000000000001','Administrador Real','administrador','demonstracao'),
('c1000000-0000-0000-0000-000000000002','Tecnico Real','tecnico','demonstracao'),
('c1000000-0000-0000-0000-000000000003','Cliente Real',null,'demonstracao');
insert into empresas(id,origem,razao_social) values('c2000000-0000-0000-0000-000000000001','demonstracao','Empresa Cliente');
insert into vinculos_empresa(empresa_id,usuario_id,perfil,aprovado_em,aprovado_por,unico_ativo,cargo) values('c2000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000003','gestor_empresa',now(),'c1000000-0000-0000-0000-000000000001',true,'Comprador');
insert into servicos_catalogo(id,slug,ativo,perguntas) values('c3000000-0000-0000-0000-000000000001','inspecao-teste',true,'[]');
insert into solicitacoes(id,origem,empresa_id,solicitante_id,servico_catalogo_id,respostas) values('c4000000-0000-0000-0000-000000000001','demonstracao','c2000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000003','c3000000-0000-0000-0000-000000000001','{"material":"Aluminio"}');
insert into mensagens(id,origem,solicitacao_id,autor_id,conteudo,criada_em) values
('c5000000-0000-0000-0000-000000000001','demonstracao','c4000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000003','Arquivo enviado',now()-interval '1 minute');
insert into storage.objects(bucket_id,name,metadata) values('mensagens','demonstracao/c5000000-0000-0000-0000-000000000001/c6000000-0000-0000-0000-000000000001-desenho.pdf','{"mimetype":"application/pdf","size":120}');

set local role authenticated;
select set_config('request.jwt.claim.sub','c1000000-0000-0000-0000-000000000001',true);
select lives_ok($$select alterar_perfil_interno_demonstrativo('c1000000-0000-0000-0000-000000000002','validador')$$,'Administrador altera perfil sem consultar colunas inexistentes');
select is((select perfil_interno::text from perfis where usuario_id='c1000000-0000-0000-0000-000000000002'),'validador','Nova funcao foi persistida');
select lives_ok($$select atualizar_email_proprio_demonstrativo('novo.admin@empresa.com.br')$$,'E-mail valido fora de example.test e aceito');
select is((select email from auth.users where id='c1000000-0000-0000-0000-000000000001'),'novo.admin@empresa.com.br','E-mail de acesso foi atualizado');
select ok(jsonb_typeof(listar_painel_administrativo_demonstrativo()->'clientes')='array','Painel administrativo retorna clientes');
select ok(jsonb_typeof(listar_inteligencia_operacional_demonstrativa()->'materiais')='array','Conhecimento retorna materiais consolidados');
select ok(pode_ler_anexo_mensagem('demonstracao/c5000000-0000-0000-0000-000000000001/c6000000-0000-0000-0000-000000000001-desenho.pdf'),'Administrador pode ler anexo da conversa');
select is((select nao_lidas from resumo_mensagens_nao_lidas_demonstrativas() where solicitacao_id='c4000000-0000-0000-0000-000000000001'),1::bigint,'Mensagem do Cliente começa não lida para Administrador');
select lives_ok($$select marcar_conversa_lida_demonstrativa('c4000000-0000-0000-0000-000000000001')$$,'Administrador marca conversa como lida');
select is((select nao_lidas from resumo_mensagens_nao_lidas_demonstrativas() where solicitacao_id='c4000000-0000-0000-0000-000000000001'),0::bigint,'Contador zera depois da leitura');
select lives_ok($$select alterar_bloqueio_empresa_demonstrativa('c2000000-0000-0000-0000-000000000001',true,'Solicitacao administrativa de teste')$$,'Administrador bloqueia empresa com motivo auditado');

select * from finish();
rollback;
