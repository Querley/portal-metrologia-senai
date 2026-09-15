create table if not exists publicacoes_conteudo (
  conteudo_id uuid not null references conteudos(id) on delete cascade,
  idioma text not null check (idioma in ('pt-BR','en','de')),
  versao_conteudo_id uuid not null unique references versoes_conteudo(id) on delete restrict,
  publicada_por uuid references auth.users(id),
  publicada_em timestamptz not null default now(),
  primary key (conteudo_id, idioma)
);

alter table publicacoes_conteudo enable row level security;

create or replace function listar_conteudos_publicados(idioma_desejado text default 'pt-BR')
returns table (
  chave text,
  tipo text,
  idioma text,
  titulo text,
  corpo jsonb,
  numero integer,
  publicado_em timestamptz,
  usou_fallback boolean
)
language sql stable security definer set search_path = public as $$
  with idioma_validado as (
    select case when idioma_desejado in ('pt-BR','en','de') then idioma_desejado else 'pt-BR' end as valor
  )
  select c.chave,
         c.tipo,
         v.idioma,
         v.titulo,
         v.corpo,
         v.numero,
         pc.publicada_em,
         v.idioma <> i.valor
    from conteudos c
    cross join idioma_validado i
    cross join lateral (
      select p.*
        from publicacoes_conteudo p
       where p.conteudo_id = c.id
         and p.idioma in (i.valor, 'pt-BR')
       order by case when p.idioma = i.valor then 0 else 1 end
       limit 1
    ) pc
    join versoes_conteudo v on v.id = pc.versao_conteudo_id
   where c.estado = 'publicado'
   order by c.chave;
$$;

create or replace function listar_cms_demonstrativo()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if perfil_interno_atual() <> 'administrador' then
    raise exception 'Somente Administrador pode gerenciar o Conteúdo Público.';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', c.id,
      'chave', c.chave,
      'tipo', c.tipo,
      'estado', c.estado,
      'publicacoes', coalesce((
        select jsonb_object_agg(p.idioma, jsonb_build_object(
          'versao_id', v.id,
          'numero', v.numero,
          'titulo', v.titulo,
          'corpo', v.corpo,
          'publicada_em', p.publicada_em
        ))
          from publicacoes_conteudo p
          join versoes_conteudo v on v.id = p.versao_conteudo_id
         where p.conteudo_id = c.id
      ), '{}'::jsonb),
      'versoes', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', v.id,
          'numero', v.numero,
          'idioma', v.idioma,
          'titulo', v.titulo,
          'corpo', v.corpo,
          'criada_em', v.criada_em,
          'publicada', exists(select 1 from publicacoes_conteudo p where p.versao_conteudo_id = v.id)
        ) order by v.criada_em desc)
          from versoes_conteudo v
         where v.conteudo_id = c.id
      ), '[]'::jsonb)
    ) order by c.chave)
      from conteudos c
  ), '[]'::jsonb);
end;
$$;

create or replace function salvar_versao_conteudo_demonstrativo(
  chave_conteudo text,
  tipo_conteudo text,
  idioma_conteudo text,
  titulo_conteudo text,
  corpo_conteudo jsonb
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  conteudo_encontrado conteudos%rowtype;
  nova_versao versoes_conteudo%rowtype;
begin
  if perfil_interno_atual() <> 'administrador' then
    raise exception 'Somente Administrador pode editar o Conteúdo Público.';
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

  insert into versoes_conteudo(conteudo_id,numero,idioma,titulo,corpo,criada_por)
  select conteudo_encontrado.id,
         coalesce(max(numero),0)+1,
         idioma_conteudo,
         trim(titulo_conteudo),
         corpo_conteudo,
         auth.uid()
    from versoes_conteudo
   where conteudo_id=conteudo_encontrado.id and idioma=idioma_conteudo
  returning * into nova_versao;

  insert into auditoria(origem,usuario_id,acao,entidade,entidade_id,dados)
  values('demonstracao',auth.uid(),'criar_versao','conteudo',conteudo_encontrado.id,jsonb_build_object('chave',conteudo_encontrado.chave,'idioma',idioma_conteudo,'numero',nova_versao.numero));
  return nova_versao.id;
end;
$$;

create or replace function publicar_versao_conteudo_demonstrativo(versao uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  encontrada versoes_conteudo%rowtype;
begin
  if perfil_interno_atual() <> 'administrador' then
    raise exception 'Somente Administrador pode publicar o Conteúdo Público.';
  end if;
  select * into encontrada from versoes_conteudo where id=versao;
  if not found then raise exception 'Versão de conteúdo não encontrada.'; end if;

  insert into publicacoes_conteudo(conteudo_id,idioma,versao_conteudo_id,publicada_por,publicada_em)
  values(encontrada.conteudo_id,encontrada.idioma,encontrada.id,auth.uid(),now())
  on conflict(conteudo_id,idioma) do update
    set versao_conteudo_id=excluded.versao_conteudo_id,
        publicada_por=excluded.publicada_por,
        publicada_em=excluded.publicada_em;

  update conteudos
     set estado='publicado',
         versao_publicada_id=case when encontrada.idioma='pt-BR' then encontrada.id else versao_publicada_id end
   where id=encontrada.conteudo_id;

  insert into auditoria(origem,usuario_id,acao,entidade,entidade_id,dados)
  values('demonstracao',auth.uid(),'publicar_versao','conteudo',encontrada.conteudo_id,jsonb_build_object('idioma',encontrada.idioma,'numero',encontrada.numero));
end;
$$;

revoke all on function listar_conteudos_publicados(text) from public;
grant execute on function listar_conteudos_publicados(text) to anon, authenticated;
revoke all on function listar_cms_demonstrativo() from public;
grant execute on function listar_cms_demonstrativo() to authenticated;
revoke all on function salvar_versao_conteudo_demonstrativo(text,text,text,text,jsonb) from public;
grant execute on function salvar_versao_conteudo_demonstrativo(text,text,text,text,jsonb) to authenticated;
revoke all on function publicar_versao_conteudo_demonstrativo(uuid) from public;
grant execute on function publicar_versao_conteudo_demonstrativo(uuid) to authenticated;

do $$
declare
  item record;
  conteudo_id uuid;
  versao_id uuid;
begin
  for item in select * from (values
    ('catalogo.cabecalho','pt-BR','Serviços e equipamentos','Conheça as tecnologias disponíveis no Centro e encontre o caminho mais adequado para o seu desafio de medição.'),
    ('catalogo.cabecalho','en','Services and equipment','Explore the technologies available at the Center and find the best path for your measurement challenge.'),
    ('catalogo.cabecalho','de','Dienstleistungen und Ausrüstung','Entdecken Sie die Technologien des Zentrums und den passenden Weg für Ihre Messaufgabe.'),
    ('solicitar.cabecalho','pt-BR','Solicite uma análise sem criar uma conta','Conte o que sua empresa precisa e indique o prazo de pagamento desejado. O acesso será necessário somente depois, para acompanhar o trabalho e trocar mensagens com a equipe.'),
    ('solicitar.cabecalho','en','Request an analysis without creating an account','Tell us what your company needs and indicate the preferred payment term. Access will only be required later to track the work and exchange messages with the team.'),
    ('solicitar.cabecalho','de','Analyse ohne Konto anfragen','Beschreiben Sie den Bedarf Ihres Unternehmens und die gewünschte Zahlungsfrist. Ein Zugang ist erst später erforderlich, um den Auftrag zu verfolgen und Nachrichten mit dem Team auszutauschen.'),
    ('privacidade.cabecalho','pt-BR','Privacidade e uso seguro','Diretrizes da demonstração pública; o texto institucional definitivo será validado antes da operação com dados reais.'),
    ('privacidade.cabecalho','en','Privacy and safe use','Public demonstration guidelines; the final institutional notice will be validated before any operation with real data.'),
    ('privacidade.cabecalho','de','Datenschutz und sichere Nutzung','Hinweise zur öffentlichen Demonstration; der endgültige institutionelle Text wird vor dem Betrieb mit realen Daten freigegeben.')
  ) as sementes(chave,idioma,titulo,texto)
  loop
    insert into conteudos(chave,tipo,estado) values(item.chave,'cabecalho','publicado')
    on conflict(chave) do update set tipo='cabecalho',estado='publicado'
    returning id into conteudo_id;
    insert into versoes_conteudo(conteudo_id,numero,idioma,titulo,corpo)
    values(conteudo_id,1,item.idioma,item.titulo,jsonb_build_object('texto',item.texto))
    on conflict(conteudo_id,numero,idioma) do update set titulo=excluded.titulo,corpo=excluded.corpo
    returning id into versao_id;
    insert into publicacoes_conteudo(conteudo_id,idioma,versao_conteudo_id)
    values(conteudo_id,item.idioma,versao_id)
    on conflict(conteudo_id,idioma) do update set versao_conteudo_id=excluded.versao_conteudo_id,publicada_em=now();
    if item.idioma='pt-BR' then update conteudos set versao_publicada_id=versao_id where id=conteudo_id; end if;
  end loop;
end;
$$;

comment on table publicacoes_conteudo is 'Ponteiro publicado por conteúdo e idioma; permite PT-BR, inglês e alemão simultâneos.';
comment on function listar_conteudos_publicados(text) is 'Conteúdo público no idioma solicitado, com fallback explícito para PT-BR.';
