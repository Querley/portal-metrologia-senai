-- Mídia pública gerenciada pelo CMS e edição restrita às seções já cadastradas.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'conteudo-publico', 'conteudo-publico', true, 83886080,
  array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "cms le midia publica" on storage.objects;
create policy "cms le midia publica" on storage.objects for select
  using (bucket_id = 'conteudo-publico');

drop policy if exists "cms envia midia" on storage.objects;
create policy "cms envia midia" on storage.objects for insert to authenticated
  with check (bucket_id = 'conteudo-publico' and public.perfil_interno_atual() in ('validador','administrador'));

drop policy if exists "cms atualiza midia" on storage.objects;
create policy "cms atualiza midia" on storage.objects for update to authenticated
  using (bucket_id = 'conteudo-publico' and public.perfil_interno_atual() in ('validador','administrador'))
  with check (bucket_id = 'conteudo-publico' and public.perfil_interno_atual() in ('validador','administrador'));

drop policy if exists "cms remove midia" on storage.objects;
create policy "cms remove midia" on storage.objects for delete to authenticated
  using (bucket_id = 'conteudo-publico' and public.perfil_interno_atual() in ('validador','administrador'));

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
  if char_length(trim(titulo_conteudo)) not between 3 and 180 then raise exception 'O título deve ter de 3 a 180 caracteres.'; end if;
  if jsonb_typeof(corpo_conteudo) <> 'object' or char_length(trim(coalesce(corpo_conteudo->>'texto',''))) < 10 then
    raise exception 'O corpo deve possuir o campo texto com ao menos 10 caracteres.';
  end if;

  select * into conteudo_encontrado from conteudos where chave = trim(chave_conteudo);
  if not found then
    raise exception 'Por enquanto, o CMS permite editar somente as seções existentes.' using errcode = '23514';
  end if;
  if conteudo_encontrado.chave ~ '^equipamentos[.]' then
    raise exception 'As páginas técnicas de equipamentos não pertencem ao CMS editorial.' using errcode = '23514';
  end if;

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

update public.versoes_conteudo v set titulo = case v.idioma
  when 'pt-BR' then 'Novidades no Centro'
  when 'en' then 'News from the Center'
  when 'de' then 'Neuigkeiten aus dem Zentrum'
end
from public.publicacoes_conteudo p
join public.conteudos c on c.id = p.conteudo_id
where p.versao_conteudo_id = v.id
  and c.chave = 'inicio.acontecimentos'
  and v.idioma in ('pt-BR','en','de');

comment on function public.salvar_versao_conteudo_demonstrativo(text,text,text,text,jsonb) is
  'Cria versão de uma seção editorial existente; novas seções permanecem desabilitadas.';
