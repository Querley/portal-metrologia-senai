-- Anexos privados em mensagens e controle de leitura por conversa.

create table if not exists public.anexos_mensagem (
  id uuid primary key default gen_random_uuid(),
  mensagem_id uuid not null references public.mensagens(id) on delete cascade,
  origem origem_dado not null,
  caminho_storage text not null unique,
  nome_original text not null check (char_length(nome_original) between 1 and 255),
  tipo_mime text not null,
  tamanho_bytes bigint not null check (tamanho_bytes > 0 and tamanho_bytes <= 10485760),
  criado_em timestamptz not null default now()
);

create table if not exists public.leituras_conversa (
  solicitacao_id uuid not null references public.solicitacoes(id) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  origem origem_dado not null,
  lida_ate timestamptz not null default now(),
  primary key (solicitacao_id, usuario_id)
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('mensagens', 'mensagens', false, 10485760, array['application/pdf','image/jpeg','image/png','image/webp','application/octet-stream'])
on conflict (id) do update set public=false, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

create or replace function public.mensagem_anexo_do_caminho(caminho text)
returns uuid language plpgsql immutable set search_path='' as $$
begin
  if caminho ~ '^demonstracao/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-[^/]{1,180}$' then
    return split_part(caminho, '/', 2)::uuid;
  end if;
  return null;
exception when invalid_text_representation then return null;
end;
$$;

create or replace function public.pode_ler_anexo_mensagem(caminho text)
returns boolean language sql stable security definer set search_path='' as $$
  select exists (
    select 1 from public.mensagens m join public.solicitacoes s on s.id=m.solicitacao_id
    where m.id=public.mensagem_anexo_do_caminho(caminho) and m.origem='demonstracao' and s.origem='demonstracao'
      and (exists (select 1 from public.perfis p where p.usuario_id=auth.uid() and p.origem_ativa='demonstracao' and p.perfil_interno in ('tecnico','validador','administrador'))
        or exists (select 1 from public.vinculos_empresa v join public.empresas e on e.id=v.empresa_id where v.usuario_id=auth.uid() and v.empresa_id=s.empresa_id and v.unico_ativo and v.aprovado_em is not null and e.bloqueada_em is null))
  );
$$;

create or replace function public.pode_enviar_anexo_mensagem(caminho text)
returns boolean language sql stable security definer set search_path='' as $$
  select exists (select 1 from public.mensagens m where m.id=public.mensagem_anexo_do_caminho(caminho) and m.autor_id=auth.uid() and m.origem='demonstracao');
$$;

drop policy if exists "participantes leem anexos de mensagem" on storage.objects;
create policy "participantes leem anexos de mensagem" on storage.objects for select to authenticated
using (bucket_id='mensagens' and public.pode_ler_anexo_mensagem(name));
drop policy if exists "autor envia anexos de mensagem" on storage.objects;
create policy "autor envia anexos de mensagem" on storage.objects for insert to authenticated
with check (bucket_id='mensagens' and public.pode_enviar_anexo_mensagem(name));

create or replace function public.registrar_anexo_mensagem_demonstrativa(mensagem uuid, caminho text, nome_original text, tipo_mime text, tamanho_bytes bigint)
returns uuid language plpgsql security definer set search_path='' as $$
declare novo_id uuid; nome text:=trim(coalesce(nome_original,'')); tipo text:=lower(trim(coalesce(tipo_mime,'')));
begin
  if not public.pode_enviar_anexo_mensagem(caminho) or public.mensagem_anexo_do_caminho(caminho) is distinct from mensagem then raise exception 'Anexo indisponivel.' using errcode='42501'; end if;
  if char_length(nome) not between 1 and 255 or nome ~ '[\\/]' then raise exception 'Nome de arquivo invalido.' using errcode='23514'; end if;
  if tipo not in ('application/pdf','image/jpeg','image/png','image/webp','application/octet-stream') or tamanho_bytes not between 1 and 10485760 then raise exception 'Tipo ou tamanho de arquivo invalido.' using errcode='23514'; end if;
  if (select count(*) from public.anexos_mensagem a where a.mensagem_id=mensagem) >= 5 then raise exception 'A mensagem ja possui cinco anexos.' using errcode='23514'; end if;
  if not exists (select 1 from storage.objects o where o.bucket_id='mensagens' and o.name=caminho) then raise exception 'Arquivo nao encontrado no armazenamento.' using errcode='23503'; end if;
  insert into public.anexos_mensagem(mensagem_id,origem,caminho_storage,nome_original,tipo_mime,tamanho_bytes)
  values(mensagem,'demonstracao',caminho,nome,tipo,tamanho_bytes) returning id into novo_id;
  return novo_id;
end;
$$;

create or replace function public.listar_anexos_mensagens_demonstrativas(solicitacao uuid)
returns table(id uuid, mensagem_id uuid, caminho_storage text, nome_original text, tipo_mime text, tamanho_bytes bigint, criado_em timestamptz)
language plpgsql stable security definer set search_path='' as $$
begin
  if not exists (select 1 from public.mensagens m where m.solicitacao_id=solicitacao and public.pode_ler_anexo_mensagem('demonstracao/'||m.id::text||'/'||gen_random_uuid()::text||'-consulta'))
    and not exists (select 1 from public.solicitacoes s where s.id=solicitacao and (exists(select 1 from public.perfis p where p.usuario_id=auth.uid() and p.origem_ativa='demonstracao' and p.perfil_interno in ('tecnico','validador','administrador')) or public.usuario_da_empresa(s.empresa_id)))
  then raise exception 'Conversa indisponivel.' using errcode='42501'; end if;
  return query select a.id,a.mensagem_id,a.caminho_storage,a.nome_original,a.tipo_mime,a.tamanho_bytes,a.criado_em from public.anexos_mensagem a join public.mensagens m on m.id=a.mensagem_id where m.solicitacao_id=solicitacao and a.origem='demonstracao' order by a.criado_em;
end;
$$;

create or replace function public.marcar_conversa_lida_demonstrativa(solicitacao uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null or not exists (select 1 from solicitacoes s where s.id=solicitacao and s.origem='demonstracao' and (usuario_interno() or usuario_da_empresa(s.empresa_id))) then raise exception 'Conversa indisponivel.' using errcode='42501'; end if;
  insert into leituras_conversa(solicitacao_id,usuario_id,origem,lida_ate) values(solicitacao,auth.uid(),'demonstracao',now())
  on conflict(solicitacao_id,usuario_id) do update set lida_ate=excluded.lida_ate;
end;
$$;

create or replace function public.resumo_mensagens_nao_lidas_demonstrativas()
returns table(solicitacao_id uuid, nao_lidas bigint) language plpgsql stable security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'Autenticacao necessaria.' using errcode='42501'; end if;
  return query select s.id, count(m.id) filter(where m.autor_id<>auth.uid() and m.criada_em>coalesce(l.lida_ate,'epoch'::timestamptz))
  from solicitacoes s left join mensagens m on m.solicitacao_id=s.id and m.origem='demonstracao'
  left join leituras_conversa l on l.solicitacao_id=s.id and l.usuario_id=auth.uid()
  where s.origem='demonstracao' and (usuario_interno() or usuario_da_empresa(s.empresa_id)) group by s.id;
end;
$$;

revoke all on table public.anexos_mensagem, public.leituras_conversa from anon, authenticated;
revoke all on function public.mensagem_anexo_do_caminho(text), public.pode_ler_anexo_mensagem(text), public.pode_enviar_anexo_mensagem(text), public.registrar_anexo_mensagem_demonstrativa(uuid,text,text,text,bigint), public.listar_anexos_mensagens_demonstrativas(uuid), public.marcar_conversa_lida_demonstrativa(uuid), public.resumo_mensagens_nao_lidas_demonstrativas() from public, anon;
grant execute on function public.mensagem_anexo_do_caminho(text), public.pode_ler_anexo_mensagem(text), public.pode_enviar_anexo_mensagem(text), public.registrar_anexo_mensagem_demonstrativa(uuid,text,text,text,bigint), public.listar_anexos_mensagens_demonstrativas(uuid), public.marcar_conversa_lida_demonstrativa(uuid), public.resumo_mensagens_nao_lidas_demonstrativas() to authenticated;
