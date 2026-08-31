-- PDF privado e imutável da pré-proposta demonstrativa.
-- A proposta oficial continua sendo produzida no Nectar, sem integração.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pre-propostas', 'pre-propostas', false, 2097152, array['application/pdf'])
on conflict (id) do update
set public = false,
    file_size_limit = 2097152,
    allowed_mime_types = array['application/pdf'];

create or replace function versao_pdf_do_caminho(caminho text)
returns uuid
language plpgsql
immutable
set search_path = public
as $$
begin
  if caminho ~ '^demonstracao/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$' then
    return split_part(split_part(caminho, '/', 2), '.', 1)::uuid;
  end if;
  return null;
exception when invalid_text_representation then
  return null;
end;
$$;

drop policy if exists "equipe envia pdf demonstrativo" on storage.objects;
create policy "equipe envia pdf demonstrativo"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'pre-propostas'
  and perfil_interno_atual() = 'administrador'
  and origem_ativa_atual() = 'demonstracao'
  and versao_pdf_do_caminho(name) is not null
  and exists (
    select 1 from versoes_proposta v
    where v.id = versao_pdf_do_caminho(name)
      and v.origem = 'demonstracao'
      and v.estado = 'aprovada'
  )
);

drop policy if exists "administrador atualiza pdf demonstrativo" on storage.objects;
create policy "administrador atualiza pdf demonstrativo"
on storage.objects for update to authenticated
using (
  bucket_id = 'pre-propostas'
  and perfil_interno_atual() = 'administrador'
  and origem_ativa_atual() = 'demonstracao'
  and versao_pdf_do_caminho(name) is not null
  and exists (
    select 1 from versoes_proposta v
    where v.id = versao_pdf_do_caminho(name)
      and v.origem = 'demonstracao'
      and v.estado = 'aprovada'
  )
)
with check (
  bucket_id = 'pre-propostas'
  and perfil_interno_atual() = 'administrador'
  and origem_ativa_atual() = 'demonstracao'
  and versao_pdf_do_caminho(name) is not null
  and exists (
    select 1 from versoes_proposta v
    where v.id = versao_pdf_do_caminho(name)
      and v.origem = 'demonstracao'
      and v.estado = 'aprovada'
  )
);

drop policy if exists "participantes leem pdf autorizado" on storage.objects;
create policy "participantes leem pdf autorizado"
on storage.objects for select to authenticated
using (
  bucket_id = 'pre-propostas'
  and versao_pdf_do_caminho(name) is not null
  and exists (
    select 1
    from versoes_proposta v
    join propostas p on p.id = v.proposta_id
    where v.id = versao_pdf_do_caminho(name)
      and v.origem = 'demonstracao'
      and p.origem = 'demonstracao'
      and (
        (origem_ativa_atual() = 'demonstracao' and perfil_interno_atual() in ('tecnico', 'validador', 'administrador'))
        or (v.estado in ('publicada', 'aceita') and usuario_da_empresa(p.empresa_id))
      )
  )
);

create or replace function registrar_pdf_pre_proposta_demonstrativa(
  versao uuid,
  caminho text,
  hash_sha256 text,
  tamanho_bytes integer
)
returns void
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  usuario uuid := auth.uid();
  perfil perfil_interno;
  origem_sessao origem_dado;
  estado_atual estado_proposta;
  origem_versao origem_dado;
  caminho_esperado text := 'demonstracao/' || versao::text || '.pdf';
begin
  select p.perfil_interno, p.origem_ativa
    into perfil, origem_sessao
  from public.perfis p
  where p.usuario_id = usuario;

  if perfil is distinct from 'administrador'::perfil_interno then
    raise exception 'Somente Administrador pode gerar o PDF final.' using errcode = '42501';
  end if;
  if origem_sessao is distinct from 'demonstracao'::origem_dado then
    raise exception 'Esta função aceita somente a origem demonstracao.' using errcode = '23514';
  end if;
  if caminho is distinct from caminho_esperado then
    raise exception 'Caminho privado do PDF inválido.' using errcode = '23514';
  end if;
  if hash_sha256 !~ '^[a-f0-9]{64}$' then
    raise exception 'Hash SHA-256 inválido.' using errcode = '23514';
  end if;
  if tamanho_bytes is null or tamanho_bytes not between 1 and 2097152 then
    raise exception 'Tamanho do PDF fora do limite permitido.' using errcode = '23514';
  end if;

  select v.estado, v.origem
    into estado_atual, origem_versao
  from public.versoes_proposta v
  where v.id = versao
  for update;

  if not found or origem_versao is distinct from origem_sessao then
    raise exception 'Pré-proposta não encontrada na origem ativa.' using errcode = '23503';
  end if;
  if estado_atual is distinct from 'aprovada'::estado_proposta then
    raise exception 'O PDF final exige pré-proposta aprovada.' using errcode = '23514';
  end if;
  if not exists (
    select 1
    from storage.objects o
    where o.bucket_id = 'pre-propostas'
      and o.name = caminho_esperado
      and coalesce(o.metadata->>'mimetype', '') = 'application/pdf'
  ) then
    raise exception 'Arquivo PDF privado não encontrado no Storage.' using errcode = '23503';
  end if;

  update public.versoes_proposta
  set pdf_caminho = caminho_esperado,
      hash_conteudo = hash_sha256
  where id = versao;

  insert into public.auditoria (origem, usuario_id, acao, entidade, entidade_id, dados)
  values (
    origem_sessao,
    usuario,
    'registrar_pdf_pre_proposta',
    'versoes_proposta',
    versao,
    jsonb_build_object('hash_conteudo', hash_sha256, 'tamanho_bytes', tamanho_bytes)
  );
end;
$$;

create or replace function obter_pdf_pre_proposta_cliente(solicitacao uuid)
returns table (caminho text, hash_sha256 text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from solicitacoes s
    where s.id = solicitacao
      and s.origem = 'demonstracao'
      and usuario_da_empresa(s.empresa_id)
  ) then
    raise exception 'Solicitação não disponível para este Cliente.' using errcode = '42501';
  end if;

  return query
  select v.pdf_caminho, v.hash_conteudo
  from propostas p
  join versoes_proposta v on v.proposta_id = p.id
  where p.solicitacao_id = solicitacao
    and p.origem = 'demonstracao'
    and v.origem = 'demonstracao'
    and v.estado in ('publicada', 'aceita')
    and v.pdf_caminho is not null
    and v.hash_conteudo is not null
  order by v.numero desc
  limit 1;

  if not found then
    raise exception 'PDF emitido ainda não disponível.' using errcode = '23503';
  end if;
end;
$$;

revoke all on function registrar_pdf_pre_proposta_demonstrativa(uuid, text, text, integer) from public, anon;
revoke all on function obter_pdf_pre_proposta_cliente(uuid) from public, anon;

grant execute on function registrar_pdf_pre_proposta_demonstrativa(uuid, text, text, integer) to authenticated;
grant execute on function obter_pdf_pre_proposta_cliente(uuid) to authenticated;

comment on function registrar_pdf_pre_proposta_demonstrativa(uuid, text, text, integer) is
  'Congela caminho e hash do PDF privado de uma pré-proposta aprovada; somente Administrador na origem demonstracao.';
comment on function obter_pdf_pre_proposta_cliente(uuid) is
  'Retorna somente o PDF de pré-proposta emitida pertencente à empresa autenticada.';
