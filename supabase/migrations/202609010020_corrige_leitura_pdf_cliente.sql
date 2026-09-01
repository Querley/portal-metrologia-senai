-- Corrige a leitura do PDF pelo Cliente sem tornar o bucket público.
-- A autorização precisa atravessar as RLS internas de propostas e versões.

create or replace function public.pode_ler_pdf_pre_proposta(caminho text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.versoes_proposta v
    join public.propostas p on p.id = v.proposta_id
    where v.id = public.versao_pdf_do_caminho(caminho)
      and v.origem = 'demonstracao'
      and p.origem = 'demonstracao'
      and v.pdf_caminho = caminho
      and v.hash_conteudo is not null
      and (
        exists (
          select 1
          from public.perfis perfil
          where perfil.usuario_id = auth.uid()
            and perfil.perfil_interno in ('tecnico', 'validador', 'administrador')
            and perfil.origem_ativa = 'demonstracao'
        )
        or (
          v.estado in ('publicada', 'aceita')
          and exists (
            select 1
            from public.vinculos_empresa vinculo
            where vinculo.usuario_id = auth.uid()
              and vinculo.empresa_id = p.empresa_id
              and vinculo.aprovado_em is not null
              and vinculo.unico_ativo
          )
        )
      )
  );
$$;

revoke all on function public.pode_ler_pdf_pre_proposta(text) from public, anon;
grant execute on function public.pode_ler_pdf_pre_proposta(text) to authenticated;

drop policy if exists "participantes leem pdf autorizado" on storage.objects;
create policy "participantes leem pdf autorizado"
on storage.objects for select to authenticated
using (
  bucket_id = 'pre-propostas'
  and public.pode_ler_pdf_pre_proposta(name)
);

comment on function public.pode_ler_pdf_pre_proposta(text) is
  'Autoriza equipe demonstrativa ou Cliente vinculado a ler somente PDF congelado e emitido da própria empresa.';
