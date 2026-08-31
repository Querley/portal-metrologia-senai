-- Impede a substituição do PDF depois que caminho e hash forem congelados.
-- A migration 018 permanece imutável porque já foi aplicada em homologação.

drop policy if exists "administrador atualiza pdf demonstrativo" on storage.objects;
drop policy if exists "administrador atualiza pdf demonstrativo pendente" on storage.objects;
create policy "administrador atualiza pdf demonstrativo pendente"
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
      and v.pdf_caminho is null
      and v.hash_conteudo is null
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
      and v.pdf_caminho is null
      and v.hash_conteudo is null
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
  pdf_atual text;
  hash_atual text;
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

  select v.estado, v.origem, v.pdf_caminho, v.hash_conteudo
    into estado_atual, origem_versao, pdf_atual, hash_atual
  from public.versoes_proposta v
  where v.id = versao
  for update;

  if not found or origem_versao is distinct from origem_sessao then
    raise exception 'Pré-proposta não encontrada na origem ativa.' using errcode = '23503';
  end if;
  if estado_atual is distinct from 'aprovada'::estado_proposta then
    raise exception 'O PDF final exige pré-proposta aprovada.' using errcode = '23514';
  end if;
  if pdf_atual is not null or hash_atual is not null then
    raise exception 'O PDF desta versão já foi congelado e não pode ser substituído.' using errcode = '23514';
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
  where id = versao
    and pdf_caminho is null
    and hash_conteudo is null;

  if not found then
    raise exception 'O PDF desta versão já foi congelado e não pode ser substituído.' using errcode = '23514';
  end if;

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

revoke all on function registrar_pdf_pre_proposta_demonstrativa(uuid, text, text, integer) from public, anon;
grant execute on function registrar_pdf_pre_proposta_demonstrativa(uuid, text, text, integer) to authenticated;

comment on function registrar_pdf_pre_proposta_demonstrativa(uuid, text, text, integer) is
  'Congela uma única vez o caminho e o hash do PDF privado; somente Administrador na origem demonstracao.';
