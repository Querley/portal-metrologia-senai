-- Anexos privados de solicitações recorrentes e recuperação segura de PDF pendente.
-- Todo o recorte permanece exclusivo da origem demonstracao.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'solicitacoes', 'solicitacoes', false, 52428800,
  array['application/pdf','image/jpeg','image/png','image/webp','application/octet-stream']
)
on conflict (id) do update
set public = false,
    file_size_limit = 52428800,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.solicitacao_anexo_do_caminho(caminho text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  if caminho ~ '^demonstracao/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-[^/]{1,180}$' then
    return split_part(caminho, '/', 2)::uuid;
  end if;
  return null;
exception when invalid_text_representation then
  return null;
end;
$$;

create or replace function public.pode_ler_anexo_solicitacao(caminho text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.solicitacoes s
    where s.id = public.solicitacao_anexo_do_caminho(caminho)
      and s.origem = 'demonstracao'
      and (
        exists (
          select 1 from public.perfis p
          where p.usuario_id = auth.uid()
            and p.perfil_interno in ('tecnico', 'validador', 'administrador')
            and p.origem_ativa = 'demonstracao'
        )
        or exists (
          select 1 from public.vinculos_empresa v
          where v.usuario_id = auth.uid()
            and v.empresa_id = s.empresa_id
            and v.aprovado_em is not null
            and v.unico_ativo
        )
      )
  );
$$;

create or replace function public.pode_enviar_anexo_solicitacao(caminho text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.solicitacoes s
    join public.vinculos_empresa v
      on v.empresa_id = s.empresa_id
     and v.usuario_id = auth.uid()
     and v.aprovado_em is not null
     and v.unico_ativo
    where s.id = public.solicitacao_anexo_do_caminho(caminho)
      and s.origem = 'demonstracao'
      and s.solicitante_id = auth.uid()
  );
$$;

create or replace function public.pode_remover_anexo_pendente(caminho text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.pode_enviar_anexo_solicitacao(caminho)
    and not exists (
      select 1 from public.anexos_solicitacao a
      where a.caminho_storage = caminho
    );
$$;

drop policy if exists "arquivos autenticados por caminho" on storage.objects;
drop policy if exists "participantes leem anexos de solicitacao" on storage.objects;
create policy "participantes leem anexos de solicitacao"
on storage.objects for select to authenticated
using (
  bucket_id = 'solicitacoes'
  and public.pode_ler_anexo_solicitacao(name)
);

drop policy if exists "cliente envia anexo da propria solicitacao" on storage.objects;
create policy "cliente envia anexo da propria solicitacao"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'solicitacoes'
  and public.pode_enviar_anexo_solicitacao(name)
);

drop policy if exists "cliente remove anexo pendente da propria solicitacao" on storage.objects;
create policy "cliente remove anexo pendente da propria solicitacao"
on storage.objects for delete to authenticated
using (
  bucket_id = 'solicitacoes'
  and public.pode_remover_anexo_pendente(name)
);

create or replace function public.registrar_anexo_solicitacao_cliente_demonstrativa(
  solicitacao uuid,
  caminho text,
  nome_original text,
  tipo_mime text,
  tamanho_bytes bigint
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  usuario uuid := auth.uid();
  solicitacao_alvo uuid := solicitacao;
  anexo_id uuid;
  nome_normalizado text := trim(coalesce(nome_original, ''));
  tipo_normalizado text := lower(trim(coalesce(tipo_mime, '')));
  extensao text := lower(substring(nome_normalizado from '\.([^.]+)$'));
begin
  if usuario is null or not public.pode_enviar_anexo_solicitacao(caminho) then
    raise exception 'Solicitacao indisponivel para envio de anexo.' using errcode = '42501';
  end if;
  if public.solicitacao_anexo_do_caminho(caminho) is distinct from solicitacao_alvo then
    raise exception 'Caminho privado do anexo invalido.' using errcode = '23514';
  end if;
  if char_length(nome_normalizado) not between 1 and 255 or nome_normalizado ~ '[\\/]' then
    raise exception 'Nome original do anexo invalido.' using errcode = '23514';
  end if;
  if tipo_normalizado not in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/octet-stream') then
    raise exception 'Tipo de anexo nao permitido.' using errcode = '23514';
  end if;
  if (tipo_normalizado = 'application/pdf' and extensao <> 'pdf')
    or (tipo_normalizado = 'image/jpeg' and extensao not in ('jpg', 'jpeg'))
    or (tipo_normalizado = 'image/png' and extensao <> 'png')
    or (tipo_normalizado = 'image/webp' and extensao <> 'webp')
    or (tipo_normalizado = 'application/octet-stream' and extensao not in ('step','stp','iges','igs','stl','obj','dxf','dwg')) then
    raise exception 'Extensao e tipo do anexo sao divergentes.' using errcode = '23514';
  end if;
  if tamanho_bytes is null or tamanho_bytes <= 0
    or (tipo_normalizado = 'application/octet-stream' and tamanho_bytes > 52428800)
    or (tipo_normalizado <> 'application/octet-stream' and tamanho_bytes > 10485760) then
    raise exception 'Tamanho do anexo fora do limite permitido.' using errcode = '23514';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(solicitacao_alvo::text, 0));
  if (select count(*) from public.anexos_solicitacao a where a.solicitacao_id = solicitacao_alvo) >= 5 then
    raise exception 'A solicitacao ja possui cinco anexos.' using errcode = '23514';
  end if;
  if not exists (
    select 1
    from storage.objects o
    where o.bucket_id = 'solicitacoes'
      and o.name = caminho
      and coalesce(o.metadata->>'mimetype', '') = tipo_normalizado
      and case
        when coalesce(o.metadata->>'size', '') ~ '^[0-9]+$' then (o.metadata->>'size')::bigint = tamanho_bytes
        else true
      end
  ) then
    raise exception 'Arquivo privado nao encontrado ou divergente no Storage.' using errcode = '23503';
  end if;

  insert into public.anexos_solicitacao (
    solicitacao_id, origem, caminho_storage, nome_original, tipo_mime, tamanho_bytes
  ) values (
    solicitacao_alvo, 'demonstracao', caminho, nome_normalizado, tipo_normalizado, tamanho_bytes
  ) returning id into anexo_id;

  insert into public.auditoria (origem, usuario_id, acao, entidade, entidade_id, dados)
  values (
    'demonstracao', usuario, 'registrar_anexo_solicitacao_cliente', 'anexos_solicitacao', anexo_id,
    jsonb_build_object('solicitacao_id', solicitacao_alvo, 'tipo_mime', tipo_normalizado, 'tamanho_bytes', tamanho_bytes)
  );

  return anexo_id;
end;
$$;

create or replace function public.listar_anexos_solicitacao_cliente_demonstrativa(solicitacao uuid)
returns table (
  id uuid,
  caminho_storage text,
  nome_original text,
  tipo_mime text,
  tamanho_bytes bigint,
  criado_em timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.solicitacoes s
    join public.vinculos_empresa v
      on v.empresa_id = s.empresa_id
     and v.usuario_id = auth.uid()
     and v.aprovado_em is not null
     and v.unico_ativo
    where s.id = solicitacao
      and s.origem = 'demonstracao'
  ) then
    raise exception 'Solicitacao indisponivel para este Cliente.' using errcode = '42501';
  end if;

  return query
  select a.id, a.caminho_storage, a.nome_original, a.tipo_mime, a.tamanho_bytes, a.criado_em
  from public.anexos_solicitacao a
  where a.solicitacao_id = solicitacao
    and a.origem = 'demonstracao'
  order by a.criado_em, a.id;
end;
$$;

-- Um PDF enviado antes de uma falha de registro precisa poder ser removido e reenviado.
-- Depois que caminho e hash são congelados, estas permissões deixam de valer.
create or replace function public.pode_gerenciar_pdf_pre_proposta_pendente(caminho text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.versoes_proposta v
    join public.perfis p on p.usuario_id = auth.uid()
    where v.id = public.versao_pdf_do_caminho(caminho)
      and v.origem = 'demonstracao'
      and v.estado = 'aprovada'
      and v.pdf_caminho is null
      and v.hash_conteudo is null
      and p.perfil_interno = 'administrador'
      and p.origem_ativa = 'demonstracao'
  );
$$;

drop policy if exists "administrador le pdf demonstrativo pendente" on storage.objects;
create policy "administrador le pdf demonstrativo pendente"
on storage.objects for select to authenticated
using (
  bucket_id = 'pre-propostas'
  and public.pode_gerenciar_pdf_pre_proposta_pendente(name)
);

drop policy if exists "administrador remove pdf demonstrativo pendente" on storage.objects;
create policy "administrador remove pdf demonstrativo pendente"
on storage.objects for delete to authenticated
using (
  bucket_id = 'pre-propostas'
  and public.pode_gerenciar_pdf_pre_proposta_pendente(name)
);

revoke all on function public.solicitacao_anexo_do_caminho(text) from public, anon;
revoke all on function public.pode_ler_anexo_solicitacao(text) from public, anon;
revoke all on function public.pode_enviar_anexo_solicitacao(text) from public, anon;
revoke all on function public.pode_remover_anexo_pendente(text) from public, anon;
revoke all on function public.registrar_anexo_solicitacao_cliente_demonstrativa(uuid, text, text, text, bigint) from public, anon;
revoke all on function public.listar_anexos_solicitacao_cliente_demonstrativa(uuid) from public, anon;
revoke all on function public.pode_gerenciar_pdf_pre_proposta_pendente(text) from public, anon;

grant execute on function public.solicitacao_anexo_do_caminho(text) to authenticated;
grant execute on function public.pode_ler_anexo_solicitacao(text) to authenticated;
grant execute on function public.pode_enviar_anexo_solicitacao(text) to authenticated;
grant execute on function public.pode_remover_anexo_pendente(text) to authenticated;
grant execute on function public.registrar_anexo_solicitacao_cliente_demonstrativa(uuid, text, text, text, bigint) to authenticated;
grant execute on function public.listar_anexos_solicitacao_cliente_demonstrativa(uuid) to authenticated;
grant execute on function public.pode_gerenciar_pdf_pre_proposta_pendente(text) to authenticated;

comment on function public.registrar_anexo_solicitacao_cliente_demonstrativa(uuid, text, text, text, bigint) is
  'Registra metadados de ate cinco anexos privados enviados pelo Cliente para a propria solicitacao demonstrativa.';
comment on function public.pode_gerenciar_pdf_pre_proposta_pendente(text) is
  'Permite ao Administrador recuperar somente o arquivo orfao de uma pre-proposta aprovada ainda nao congelada.';
