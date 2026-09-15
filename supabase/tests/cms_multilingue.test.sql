begin;

create extension if not exists pgtap with schema extensions;
select plan(10);

select is((select count(*) from listar_conteudos_publicados('pt-BR'))::integer,3,'CMS entrega os três cabeçalhos iniciais em português');
select is((select idioma from listar_conteudos_publicados('de') where chave='catalogo.cabecalho'),'de','CMS entrega a publicação alemã solicitada');
select is((select titulo from listar_conteudos_publicados('en') where chave='solicitar.cabecalho'),'Request an analysis without creating an account','CMS entrega o título inglês publicado');

delete from publicacoes_conteudo where conteudo_id=(select id from conteudos where chave='privacidade.cabecalho') and idioma='de';
select ok((select usou_fallback from listar_conteudos_publicados('de') where chave='privacidade.cabecalho'),'CMS sinaliza fallback para português quando falta tradução');

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('d1000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','admin.cms@empresa.com.br','',now(),'{}','{}',now(),now()),
('d1000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','tecnico.cms@empresa.com.br','',now(),'{}','{}',now(),now());
insert into perfis(usuario_id,nome,perfil_interno,origem_ativa) values
('d1000000-0000-0000-0000-000000000001','Administrador CMS','administrador','demonstracao'),
('d1000000-0000-0000-0000-000000000002','Tecnico CMS','tecnico','demonstracao');

set local role authenticated;
select set_config('request.jwt.claim.sub','d1000000-0000-0000-0000-000000000001',true);
select lives_ok($$select salvar_versao_conteudo_demonstrativo('inicio.teste','secao','pt-BR','Conteúdo de teste','{"texto":"Texto público sintético criado para validar o CMS."}'::jsonb)$$,'Administrador salva nova versão');
select lives_ok($$select publicar_versao_conteudo_demonstrativo((select (versao->>'id')::uuid from jsonb_array_elements(listar_cms_demonstrativo()) conteudo cross join lateral jsonb_array_elements(conteudo->'versoes') versao where conteudo->>'chave'='inicio.teste' order by (versao->>'criada_em')::timestamptz desc limit 1))$$,'Administrador publica nova versão');
select ok(jsonb_array_length(listar_cms_demonstrativo()) >= 4,'Administrador recebe inventário e histórico do CMS');
reset role;

select is((select titulo from listar_conteudos_publicados('pt-BR') where chave='inicio.teste'),'Conteúdo de teste','Conteúdo recém-publicado fica disponível ao público');
select ok(exists(select 1 from auditoria where entidade='conteudo' and acao='publicar_versao'),'Publicação gera auditoria');

set local role authenticated;
select set_config('request.jwt.claim.sub','d1000000-0000-0000-0000-000000000002',true);
select throws_ok($$select salvar_versao_conteudo_demonstrativo('inicio.negado','secao','pt-BR','Conteúdo negado','{"texto":"Texto que não deve ser gravado pelo perfil técnico."}'::jsonb)$$,'Somente Administrador pode editar o Conteúdo Público.','Técnico não edita o CMS');

select * from finish();
rollback;
