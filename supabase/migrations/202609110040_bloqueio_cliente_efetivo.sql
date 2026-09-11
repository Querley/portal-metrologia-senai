-- Faz o bloqueio administrativo negar efetivamente todo acesso externo.

create or replace function public.usuario_da_empresa(empresa uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from vinculos_empresa v join empresas e on e.id=v.empresa_id
    where v.usuario_id=auth.uid() and v.empresa_id=empresa and v.aprovado_em is not null
      and v.unico_ativo and e.bloqueada_em is null
  );
$$;

create or replace function public.obter_contexto_cliente()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'vinculo_id', v.id, 'empresa_id', e.id, 'empresa_nome', e.razao_social,
    'perfil', v.perfil, 'cargo', v.cargo, 'origem', e.origem,
    'usuario_nome', coalesce(p.nome, 'Cliente'), 'usuario_email', auth.jwt()->>'email',
    'aceite_privacidade_em', v.aceite_privacidade_em, 'versao_aviso_privacidade', v.versao_aviso_privacidade
  )
  from vinculos_empresa v join empresas e on e.id=v.empresa_id left join perfis p on p.usuario_id=v.usuario_id
  where v.usuario_id=auth.uid() and v.aprovado_em is not null and v.unico_ativo
    and e.origem='demonstracao' and e.bloqueada_em is null
  order by v.aprovado_em desc limit 1;
$$;

create or replace function public.pode_ler_anexo_solicitacao(caminho text)
returns boolean language sql stable security definer set search_path='' as $$
  select exists (
    select 1 from public.solicitacoes s
    where s.id=public.solicitacao_anexo_do_caminho(caminho) and s.origem='demonstracao'
      and (exists(select 1 from public.perfis p where p.usuario_id=auth.uid() and p.perfil_interno in ('tecnico','validador','administrador') and p.origem_ativa='demonstracao')
        or exists(select 1 from public.vinculos_empresa v join public.empresas e on e.id=v.empresa_id where v.usuario_id=auth.uid() and v.empresa_id=s.empresa_id and v.aprovado_em is not null and v.unico_ativo and e.bloqueada_em is null))
  );
$$;

create or replace function public.pode_enviar_anexo_solicitacao(caminho text)
returns boolean language sql stable security definer set search_path='' as $$
  select exists (
    select 1 from public.solicitacoes s join public.vinculos_empresa v on v.empresa_id=s.empresa_id and v.usuario_id=auth.uid() and v.aprovado_em is not null and v.unico_ativo
    join public.empresas e on e.id=v.empresa_id
    where s.id=public.solicitacao_anexo_do_caminho(caminho) and s.origem='demonstracao' and s.solicitante_id=auth.uid() and e.bloqueada_em is null
  );
$$;

do $$
declare assinatura regprocedure; definicao text; atualizada text;
begin
  foreach assinatura in array array[
    'public.criar_solicitacao_cliente_demonstrativa(jsonb)'::regprocedure,
    'public.atualizar_perfil_cliente_demonstrativo(text,text)'::regprocedure
  ] loop
    select pg_get_functiondef(assinatura) into definicao;
    atualizada := replace(definicao, 'and e.origem = ''demonstracao''', 'and e.origem = ''demonstracao'' and e.bloqueada_em is null');
    if atualizada=definicao then raise exception 'Definicao inesperada para %', assinatura; end if;
    execute atualizada;
  end loop;
end;
$$;

revoke all on function public.usuario_da_empresa(uuid), public.obter_contexto_cliente(), public.pode_ler_anexo_solicitacao(text), public.pode_enviar_anexo_solicitacao(text) from public, anon;
grant execute on function public.usuario_da_empresa(uuid), public.obter_contexto_cliente(), public.pode_ler_anexo_solicitacao(text), public.pode_enviar_anexo_solicitacao(text) to authenticated;
