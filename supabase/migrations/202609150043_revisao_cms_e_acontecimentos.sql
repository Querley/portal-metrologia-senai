-- Fluxo editorial Validador -> Administrador, mídia localizada e seção de acontecimentos.

alter table public.versoes_conteudo
  add column if not exists estado_revisao text not null default 'rascunho',
  add column if not exists enviada_validacao_em timestamptz,
  add column if not exists decidida_por uuid references auth.users(id),
  add column if not exists decidida_em timestamptz,
  add column if not exists decisao_justificativa text;

alter table public.versoes_conteudo drop constraint if exists versoes_conteudo_estado_revisao_check;
alter table public.versoes_conteudo add constraint versoes_conteudo_estado_revisao_check
  check (estado_revisao in ('rascunho','em_validacao','aprovada','devolvida'));
alter table public.versoes_conteudo drop constraint if exists versoes_conteudo_decisao_justificativa_check;
alter table public.versoes_conteudo add constraint versoes_conteudo_decisao_justificativa_check
  check (decisao_justificativa is null or char_length(trim(decisao_justificativa)) between 5 and 1000);

update public.versoes_conteudo v
   set estado_revisao = 'aprovada',
       decidida_em = coalesce(v.decidida_em, p.publicada_em),
       decidida_por = coalesce(v.decidida_por, p.publicada_por)
  from public.publicacoes_conteudo p
 where p.versao_conteudo_id = v.id;

create or replace function public.listar_cms_demonstrativo()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if perfil_interno_atual() not in ('validador','administrador') then
    raise exception 'Somente Validador ou Administrador pode acessar o Conteúdo Público.' using errcode = '42501';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', c.id,
      'chave', c.chave,
      'tipo', c.tipo,
      'estado', c.estado,
      'publicacoes', coalesce((
        select jsonb_object_agg(p.idioma, jsonb_build_object(
          'versao_id', v.id, 'numero', v.numero, 'titulo', v.titulo, 'corpo', v.corpo,
          'publicada_em', p.publicada_em
        ))
          from publicacoes_conteudo p join versoes_conteudo v on v.id = p.versao_conteudo_id
         where p.conteudo_id = c.id
      ), '{}'::jsonb),
      'versoes', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', v.id, 'numero', v.numero, 'idioma', v.idioma, 'titulo', v.titulo,
          'corpo', v.corpo, 'criada_em', v.criada_em, 'criada_por', v.criada_por,
          'estado_revisao', v.estado_revisao, 'enviada_validacao_em', v.enviada_validacao_em,
          'decidida_em', v.decidida_em, 'decisao_justificativa', v.decisao_justificativa,
          'publicada', exists(select 1 from publicacoes_conteudo p where p.versao_conteudo_id = v.id)
        ) order by v.criada_em desc)
          from versoes_conteudo v where v.conteudo_id = c.id
      ), '[]'::jsonb)
    ) order by c.chave) from conteudos c
  ), '[]'::jsonb);
end;
$$;

create or replace function public.salvar_versao_conteudo_demonstrativo(
  chave_conteudo text, tipo_conteudo text, idioma_conteudo text,
  titulo_conteudo text, corpo_conteudo jsonb
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  conteudo_encontrado conteudos%rowtype;
  nova_versao versoes_conteudo%rowtype;
begin
  if perfil_interno_atual() not in ('validador','administrador') then
    raise exception 'Somente Validador ou Administrador pode editar o Conteúdo Público.' using errcode = '42501';
  end if;
  if idioma_conteudo not in ('pt-BR','en','de') then raise exception 'Idioma inválido.'; end if;
  if char_length(trim(chave_conteudo)) not between 3 and 100 or chave_conteudo !~ '^[a-z0-9.-]+$' then
    raise exception 'Use uma chave de 3 a 100 caracteres com letras minúsculas, números, ponto ou hífen.';
  end if;
  if char_length(trim(tipo_conteudo)) not between 3 and 40 then raise exception 'Tipo de conteúdo inválido.'; end if;
  if char_length(trim(titulo_conteudo)) not between 3 and 180 then raise exception 'O título deve ter de 3 a 180 caracteres.'; end if;
  if jsonb_typeof(corpo_conteudo) <> 'object' or char_length(trim(coalesce(corpo_conteudo->>'texto',''))) < 10 then
    raise exception 'O corpo deve possuir o campo texto com ao menos 10 caracteres.';
  end if;

  insert into conteudos(chave,tipo,estado)
  values(trim(chave_conteudo),trim(tipo_conteudo),'rascunho')
  on conflict(chave) do update set tipo=excluded.tipo
  returning * into conteudo_encontrado;

  insert into versoes_conteudo(conteudo_id,numero,idioma,titulo,corpo,criada_por,estado_revisao)
  select conteudo_encontrado.id, coalesce(max(numero),0)+1, idioma_conteudo,
         trim(titulo_conteudo), corpo_conteudo, auth.uid(), 'rascunho'
    from versoes_conteudo where conteudo_id=conteudo_encontrado.id and idioma=idioma_conteudo
  returning * into nova_versao;

  insert into auditoria(origem,usuario_id,acao,entidade,entidade_id,dados)
  values('demonstracao',auth.uid(),'criar_versao','conteudo',conteudo_encontrado.id,
    jsonb_build_object('chave',conteudo_encontrado.chave,'idioma',idioma_conteudo,'numero',nova_versao.numero));
  return nova_versao.id;
end;
$$;

create or replace function public.enviar_versao_conteudo_validacao_demonstrativa(versao uuid)
returns void language plpgsql security definer set search_path = public as $$
declare encontrada versoes_conteudo%rowtype;
begin
  if perfil_interno_atual() not in ('validador','administrador') then raise exception 'Perfil sem acesso editorial.' using errcode='42501'; end if;
  select * into encontrada from versoes_conteudo where id=versao for update;
  if not found then raise exception 'Versão não encontrada.'; end if;
  if encontrada.estado_revisao not in ('rascunho','devolvida') then raise exception 'Somente rascunho ou versão devolvida pode ser enviada.'; end if;
  update versoes_conteudo set estado_revisao='em_validacao', enviada_validacao_em=now(), decidida_por=null, decidida_em=null, decisao_justificativa=null where id=versao;
  insert into auditoria(origem,usuario_id,acao,entidade,entidade_id,dados)
  values('demonstracao',auth.uid(),'enviar_validacao','conteudo',encontrada.conteudo_id,jsonb_build_object('versao_id',versao,'idioma',encontrada.idioma,'numero',encontrada.numero));
end;
$$;

create or replace function public.decidir_versao_conteudo_demonstrativa(versao uuid, aprovar boolean, justificativa text default null)
returns void language plpgsql security definer set search_path = public as $$
declare encontrada versoes_conteudo%rowtype;
begin
  if perfil_interno_atual() <> 'administrador' then raise exception 'Somente Administrador decide a revisão editorial.' using errcode='42501'; end if;
  select * into encontrada from versoes_conteudo where id=versao for update;
  if not found or encontrada.estado_revisao <> 'em_validacao' then raise exception 'Versão não está em validação.'; end if;
  if not aprovar and char_length(trim(coalesce(justificativa,''))) not between 5 and 1000 then raise exception 'Informe o motivo da devolução.'; end if;
  update versoes_conteudo set estado_revisao=case when aprovar then 'aprovada' else 'devolvida' end,
    decidida_por=auth.uid(), decidida_em=now(), decisao_justificativa=case when aprovar then null else trim(justificativa) end
    where id=versao;
  insert into auditoria(origem,usuario_id,acao,entidade,entidade_id,dados)
  values('demonstracao',auth.uid(),case when aprovar then 'aprovar_versao' else 'devolver_versao' end,'conteudo',encontrada.conteudo_id,
    jsonb_build_object('versao_id',versao,'idioma',encontrada.idioma,'numero',encontrada.numero,'justificativa',case when aprovar then null else trim(justificativa) end));
end;
$$;

create or replace function public.publicar_versao_conteudo_demonstrativo(versao uuid)
returns void language plpgsql security definer set search_path = public as $$
declare encontrada versoes_conteudo%rowtype;
begin
  if perfil_interno_atual() <> 'administrador' then raise exception 'Somente Administrador pode publicar o Conteúdo Público.' using errcode='42501'; end if;
  select * into encontrada from versoes_conteudo where id=versao;
  if not found then raise exception 'Versão de conteúdo não encontrada.'; end if;
  if encontrada.estado_revisao <> 'aprovada' then raise exception 'A versão precisa ser aprovada antes da publicação.'; end if;
  insert into publicacoes_conteudo(conteudo_id,idioma,versao_conteudo_id,publicada_por,publicada_em)
  values(encontrada.conteudo_id,encontrada.idioma,encontrada.id,auth.uid(),now())
  on conflict(conteudo_id,idioma) do update set versao_conteudo_id=excluded.versao_conteudo_id,publicada_por=excluded.publicada_por,publicada_em=excluded.publicada_em;
  update conteudos set estado='publicado',versao_publicada_id=case when encontrada.idioma='pt-BR' then encontrada.id else versao_publicada_id end where id=encontrada.conteudo_id;
  insert into auditoria(origem,usuario_id,acao,entidade,entidade_id,dados)
  values('demonstracao',auth.uid(),'publicar_versao','conteudo',encontrada.conteudo_id,jsonb_build_object('idioma',encontrada.idioma,'numero',encontrada.numero));
end;
$$;

revoke all on function public.enviar_versao_conteudo_validacao_demonstrativa(uuid) from public, anon;
revoke all on function public.decidir_versao_conteudo_demonstrativa(uuid,boolean,text) from public, anon;
grant execute on function public.enviar_versao_conteudo_validacao_demonstrativa(uuid) to authenticated;
grant execute on function public.decidir_versao_conteudo_demonstrativa(uuid,boolean,text) to authenticated;

do $$
declare item record; conteudo_semente_id uuid; versao_semente_id uuid;
begin
  for item in select * from (values
    ('pt-BR','Acontece no Centro','Eventos, novidades e marcos recentes do Centro de Excelência em Metrologia.',
      '[{"tipo":"recente","data":"Setembro de 2026","titulo":"Portal de acompanhamento ampliado","resumo":"Clientes e equipe passam a acompanhar solicitações, propostas e execução em uma experiência integrada."},{"tipo":"agora","data":"Em destaque","titulo":"Conhecimento aplicado à metrologia","resumo":"Lições formalizadas e comparativos tornam o planejamento dos próximos trabalhos mais consistente."},{"tipo":"proximo","data":"Próximos passos","titulo":"Novos conteúdos e eventos","resumo":"A equipe poderá publicar aqui participações, encontros técnicos e novidades do Centro."}]'::jsonb),
    ('en','What is happening at the Center','Events, news and recent milestones from the Metrology Center of Excellence.',
      '[{"tipo":"recente","data":"September 2026","titulo":"Expanded tracking portal","resumo":"Customers and staff can now track requests, proposals and execution through one integrated experience."},{"tipo":"agora","data":"Featured","titulo":"Knowledge applied to metrology","resumo":"Formalized lessons and comparisons make planning for future work more consistent."},{"tipo":"proximo","data":"Coming next","titulo":"New content and events","resumo":"The team will publish participation in events, technical meetings and news from the Center here."}]'::jsonb),
    ('de','Aktuelles aus dem Zentrum','Veranstaltungen, Neuigkeiten und aktuelle Meilensteine des Kompetenzzentrums für Messtechnik.',
      '[{"tipo":"recente","data":"September 2026","titulo":"Erweitertes Auftragsportal","resumo":"Kunden und Mitarbeitende verfolgen Anfragen, Angebote und Ausführung jetzt in einer integrierten Umgebung."},{"tipo":"agora","data":"Im Fokus","titulo":"Wissen für die Messtechnik","resumo":"Freigegebene Erkenntnisse und Vergleiche verbessern die Planung zukünftiger Aufträge."},{"tipo":"proximo","data":"Als Nächstes","titulo":"Neue Inhalte und Veranstaltungen","resumo":"Hier veröffentlicht das Team künftig Veranstaltungen, Fachtreffen und Neuigkeiten aus dem Zentrum."}]'::jsonb)
  ) sementes(idioma,titulo,texto,itens)
  loop
    insert into conteudos(chave,tipo,estado) values('inicio.acontecimentos','acontecimentos','publicado')
    on conflict(chave) do update set tipo='acontecimentos',estado='publicado' returning id into conteudo_semente_id;
    insert into versoes_conteudo(conteudo_id,numero,idioma,titulo,corpo,estado_revisao)
    select conteudo_semente_id,coalesce(max(numero),0)+1,item.idioma,item.titulo,
      jsonb_build_object('texto',item.texto,'itens',item.itens,'midia_url','/imagens/laboratorio-centro-excelencia.jpeg','midia_tipo','imagem','midia_alt',item.titulo),
      'aprovada' from versoes_conteudo where versoes_conteudo.conteudo_id=conteudo_semente_id and idioma=item.idioma
    returning id into versao_semente_id;
    insert into publicacoes_conteudo(conteudo_id,idioma,versao_conteudo_id,publicada_em)
    values(conteudo_semente_id,item.idioma,versao_semente_id,now())
    on conflict(conteudo_id,idioma) do update set versao_conteudo_id=excluded.versao_conteudo_id,publicada_em=now();
    if item.idioma='pt-BR' then update conteudos set versao_publicada_id=versao_semente_id where id=conteudo_semente_id; end if;
  end loop;
end;
$$;

comment on function public.enviar_versao_conteudo_validacao_demonstrativa(uuid) is 'Validador ou Administrador envia rascunho editorial para decisão.';
comment on function public.decidir_versao_conteudo_demonstrativa(uuid,boolean,text) is 'Administrador aprova ou devolve versão editorial antes da publicação.';
