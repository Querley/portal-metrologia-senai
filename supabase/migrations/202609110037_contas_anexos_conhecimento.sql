-- Consolida contas reais de acesso na homologacao, corrige perfis e amplia a leitura operacional.
-- Os dados de negocio continuam marcados como demonstracao e isolados dos dados reais.

do $$
declare
  definicao text;
  atualizada text;
begin
  select pg_get_functiondef('public.registrar_solicitacao_publica_demonstrativa(jsonb)'::regprocedure) into definicao;
  atualizada := replace(definicao, '\.test$', '\.[a-z0-9-]{2,63}$');
  atualizada := replace(atualizada, 'Na homologação, use somente um e-mail sintético terminado em .test.', 'Informe um endereço de e-mail válido.');
  if atualizada = definicao then raise exception 'Definicao de registro publico inesperada.'; end if;
  execute atualizada;

  select pg_get_functiondef('public.criar_solicitacao_cliente_demonstrativa(jsonb)'::regprocedure) into definicao;
  atualizada := replace(definicao, '\.test$', '\.[a-z0-9-]{2,63}$');
  atualizada := replace(atualizada, 'A homologacao aceita somente e-mail sintetico terminado em .test.', 'Informe um endereco de e-mail valido.');
  if atualizada = definicao then raise exception 'Definicao de solicitacao autenticada inesperada.'; end if;
  execute atualizada;
end;
$$;

create or replace function public.atualizar_email_proprio_demonstrativo(novo_email text)
returns text language plpgsql security definer set search_path = public, auth as $$
declare email_normalizado text := lower(trim(coalesce(novo_email, '')));
begin
  if auth.uid() is null then raise exception 'Autenticacao necessaria.' using errcode = '42501'; end if;
  if email_normalizado !~ '^[a-z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z0-9-]{2,63}$' then
    raise exception 'Informe um endereco de e-mail valido.' using errcode = '23514';
  end if;
  if not exists (select 1 from public.perfis p where p.usuario_id = auth.uid() and p.origem_ativa = 'demonstracao') then
    raise exception 'Perfil de homologacao nao encontrado.' using errcode = '42501';
  end if;
  if exists (select 1 from auth.users u where lower(u.email) = email_normalizado and u.id <> auth.uid()) then
    raise exception 'Este e-mail ja esta associado a outro usuario.' using errcode = '23505';
  end if;
  update auth.users set email = email_normalizado, email_confirmed_at = now(), updated_at = now()
    where id = auth.uid();
  update auth.identities
    set identity_data = jsonb_set(jsonb_set(identity_data, '{email}', to_jsonb(email_normalizado), true), '{email_verified}', 'true'::jsonb, true),
        updated_at = now()
    where user_id = auth.uid() and provider = 'email';
  insert into public.auditoria (origem, usuario_id, acao, entidade, entidade_id, dados)
  values ('demonstracao', auth.uid(), 'atualizar_email_proprio', 'auth.users', auth.uid(),
    jsonb_build_object('email_novo', email_normalizado));
  return email_normalizado;
end;
$$;

create or replace function public.alterar_perfil_interno_demonstrativo(alvo uuid, novo_perfil perfil_interno)
returns void language plpgsql security definer set search_path = public as $$
declare perfil_anterior perfil_interno;
begin
  if perfil_interno_atual() <> 'administrador' or origem_ativa_atual() <> 'demonstracao' then
    raise exception 'Somente Administrador de homologacao altera funcoes.' using errcode = '42501';
  end if;
  if novo_perfil not in ('tecnico', 'validador', 'administrador') then
    raise exception 'Selecione Tecnico, Validador ou Administrador.' using errcode = '23514';
  end if;
  if alvo = auth.uid() then
    raise exception 'O Administrador nao pode alterar a propria funcao nesta tela.' using errcode = '23514';
  end if;
  if exists (
    select 1 from vinculos_empresa v join empresas e on e.id = v.empresa_id
    where v.usuario_id = alvo and v.unico_ativo and v.aprovado_em is not null and e.origem = 'demonstracao'
  ) then
    raise exception 'Contas de Cliente devem ser administradas como contatos da empresa.' using errcode = '23514';
  end if;
  select p.perfil_interno into perfil_anterior from perfis p
    where p.usuario_id = alvo and p.origem_ativa = 'demonstracao' and p.perfil_interno is not null for update;
  if not found then raise exception 'Usuario interno nao encontrado.' using errcode = '23503'; end if;
  update perfis set perfil_interno = novo_perfil where usuario_id = alvo;
  insert into auditoria (origem, usuario_id, acao, entidade, entidade_id, dados)
  values ('demonstracao', auth.uid(), 'alterar_perfil_interno_demonstrativo', 'perfis', alvo,
    jsonb_build_object('perfil_anterior', perfil_anterior, 'perfil_novo', novo_perfil));
end;
$$;

create or replace function public.listar_anexos_solicitacao_demonstrativa(solicitacao uuid)
returns table (id uuid, caminho_storage text, nome_original text, tipo_mime text, tamanho_bytes bigint, criado_em timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.pode_ler_anexo_solicitacao('demonstracao/' || solicitacao::text || '/' || gen_random_uuid()::text || '-consulta') then
    raise exception 'Solicitacao indisponivel para este usuario.' using errcode = '42501';
  end if;
  return query select a.id, a.caminho_storage, a.nome_original, a.tipo_mime, a.tamanho_bytes, a.criado_em
    from public.anexos_solicitacao a where a.solicitacao_id = solicitacao and a.origem = 'demonstracao'
    order by a.criado_em, a.id;
end;
$$;

alter table public.empresas add column if not exists bloqueada_em timestamptz;
alter table public.empresas add column if not exists bloqueada_por uuid references auth.users(id);
alter table public.empresas add column if not exists bloqueio_motivo text;
alter table public.empresas drop constraint if exists empresas_bloqueio_coerente;
alter table public.empresas add constraint empresas_bloqueio_coerente check (
  (bloqueada_em is null and bloqueada_por is null and bloqueio_motivo is null)
  or (bloqueada_em is not null and bloqueada_por is not null and char_length(trim(bloqueio_motivo)) between 5 and 500)
) not valid;
alter table public.empresas validate constraint empresas_bloqueio_coerente;

create or replace function public.alterar_bloqueio_empresa_demonstrativa(empresa uuid, bloquear boolean, motivo text default null)
returns void language plpgsql security definer set search_path = public as $$
declare motivo_normalizado text := nullif(trim(coalesce(motivo, '')), '');
begin
  if perfil_interno_atual() <> 'administrador' or origem_ativa_atual() <> 'demonstracao' then
    raise exception 'Somente Administrador altera o bloqueio de Clientes.' using errcode = '42501';
  end if;
  if bloquear and (motivo_normalizado is null or char_length(motivo_normalizado) not between 5 and 500) then
    raise exception 'Informe o motivo do bloqueio entre 5 e 500 caracteres.' using errcode = '23514';
  end if;
  update empresas set bloqueada_em = case when bloquear then now() else null end,
    bloqueada_por = case when bloquear then auth.uid() else null end,
    bloqueio_motivo = case when bloquear then motivo_normalizado else null end
  where id = empresa and origem = 'demonstracao';
  if not found then raise exception 'Empresa nao encontrada.' using errcode = '23503'; end if;
  insert into auditoria (origem, usuario_id, acao, entidade, entidade_id, dados)
  values ('demonstracao', auth.uid(), case when bloquear then 'bloquear_cliente' else 'desbloquear_cliente' end,
    'empresas', empresa, jsonb_build_object('motivo', motivo_normalizado));
end;
$$;

create or replace function public.listar_painel_administrativo_demonstrativo()
returns jsonb language plpgsql stable security definer set search_path = public, auth as $$
declare resultado jsonb;
begin
  if perfil_interno_atual() <> 'administrador' or origem_ativa_atual() <> 'demonstracao' then
    raise exception 'Somente Administrador consulta este painel.' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'funcionarios', coalesce((select jsonb_agg(jsonb_build_object(
      'usuario_id', p.usuario_id, 'nome', p.nome, 'email', u.email, 'perfil', p.perfil_interno,
      'atribuidos', (select count(*) from execucoes_servico ex where ex.responsavel_id = p.usuario_id and ex.origem = 'demonstracao'),
      'concluidos', (select count(*) from execucoes_servico ex where ex.responsavel_id = p.usuario_id and ex.origem = 'demonstracao' and ex.estado = 'concluido'),
      'em_execucao', (select count(*) from execucoes_servico ex where ex.responsavel_id = p.usuario_id and ex.origem = 'demonstracao' and ex.estado = 'em_execucao'),
      'retrabalhos', (select count(*) from execucoes_servico ex where ex.responsavel_id = p.usuario_id and ex.origem = 'demonstracao' and ex.retrabalho is true)
    ) order by p.nome) from perfis p join auth.users u on u.id = p.usuario_id
      where p.origem_ativa = 'demonstracao' and p.perfil_interno in ('tecnico','validador','administrador')), '[]'::jsonb),
    'clientes', coalesce((select jsonb_agg(jsonb_build_object(
      'empresa_id', e.id, 'empresa', e.razao_social, 'bloqueada', e.bloqueada_em is not null,
      'bloqueio_motivo', e.bloqueio_motivo,
      'contatos', (select coalesce(jsonb_agg(jsonb_build_object('usuario_id', p.usuario_id, 'nome', p.nome, 'email', u.email, 'cargo', v.cargo)), '[]'::jsonb)
        from vinculos_empresa v join perfis p on p.usuario_id = v.usuario_id join auth.users u on u.id = v.usuario_id
        where v.empresa_id = e.id and v.unico_ativo and v.aprovado_em is not null),
      'solicitacoes', (select count(*) from solicitacoes s where s.empresa_id = e.id and s.origem = 'demonstracao'),
      'concluidos', (select count(*) from solicitacoes s join propostas pr on pr.solicitacao_id=s.id join versoes_proposta vp on vp.proposta_id=pr.id join itens_proposta ip on ip.versao_proposta_id=vp.id join execucoes_servico ex on ex.item_proposta_id=ip.id where s.empresa_id=e.id and ex.origem='demonstracao' and ex.estado='concluido'),
      'ticket_medio', (select round(avg(vp.total_brl),2) from propostas pr join versoes_proposta vp on vp.proposta_id=pr.id where pr.empresa_id=e.id and vp.origem='demonstracao' and vp.estado='aceita')
    ) order by e.razao_social) from empresas e where e.origem = 'demonstracao'), '[]'::jsonb)
  ) into resultado;
  return resultado;
end;
$$;

create or replace function public.listar_inteligencia_operacional_demonstrativa()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare resultado jsonb;
begin
  if perfil_interno_atual() not in ('tecnico','validador','administrador') or origem_ativa_atual() <> 'demonstracao' then
    raise exception 'Perfil sem acesso ao conhecimento operacional.' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'servicos', coalesce((select jsonb_agg(x order by (x->>'quantidade')::int desc) from (
      select jsonb_build_object('slug', sc.slug, 'quantidade', count(*), 'horas_medias', round(avg(hr.total),2), 'retrabalhos', count(*) filter (where ex.retrabalho)) x
      from execucoes_servico ex join itens_proposta ip on ip.id=ex.item_proposta_id join servicos_catalogo sc on sc.id=ip.servico_catalogo_id
      left join lateral (select sum(h.horas) total from horas_reais_equipamento h where h.execucao_id=ex.id) hr on true
      where ex.origem='demonstracao' group by sc.slug
    ) q), '[]'::jsonb),
    'materiais', coalesce((select jsonb_agg(jsonb_build_object('material', material, 'quantidade', quantidade) order by quantidade desc) from (
      select coalesce(nullif(trim(s.respostas->>'material'),''),'Nao informado') material, count(*) quantidade
      from solicitacoes s where s.origem='demonstracao' group by 1
    ) m), '[]'::jsonb),
    'assuntos', coalesce((select jsonb_agg(jsonb_build_object('assunto', assunto, 'quantidade', count(*)) order by count(*) desc) from licoes l join revisoes_licao r on r.licao_id=l.id cross join lateral unnest(r.assuntos) assunto where l.origem='demonstracao' and l.estado='formalizada' and r.numero=l.revisao_atual group by assunto), '[]'::jsonb)
  ) into resultado;
  return resultado;
end;
$$;

revoke all on function public.atualizar_email_proprio_demonstrativo(text) from public, anon;
revoke all on function public.alterar_perfil_interno_demonstrativo(uuid, perfil_interno) from public, anon;
revoke all on function public.listar_anexos_solicitacao_demonstrativa(uuid) from public, anon;
revoke all on function public.alterar_bloqueio_empresa_demonstrativa(uuid, boolean, text) from public, anon;
revoke all on function public.listar_painel_administrativo_demonstrativo() from public, anon;
revoke all on function public.listar_inteligencia_operacional_demonstrativa() from public, anon;
grant execute on function public.atualizar_email_proprio_demonstrativo(text) to authenticated;
grant execute on function public.alterar_perfil_interno_demonstrativo(uuid, perfil_interno) to authenticated;
grant execute on function public.listar_anexos_solicitacao_demonstrativa(uuid) to authenticated;
grant execute on function public.alterar_bloqueio_empresa_demonstrativa(uuid, boolean, text) to authenticated;
grant execute on function public.listar_painel_administrativo_demonstrativo() to authenticated;
grant execute on function public.listar_inteligencia_operacional_demonstrativa() to authenticated;
