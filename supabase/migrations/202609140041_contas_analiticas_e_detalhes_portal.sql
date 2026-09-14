-- Convites completos, painel administrativo analítico e identificação legível dos trabalhos.
alter table public.perfis
  add column if not exists cargo_profissional text,
  add column if not exists cnpj_empregador_sintetico text;

alter table public.perfis drop constraint if exists perfis_cargo_profissional_check;
alter table public.perfis add constraint perfis_cargo_profissional_check
  check (cargo_profissional is null or char_length(trim(cargo_profissional)) between 2 and 120);
alter table public.perfis drop constraint if exists perfis_cnpj_empregador_sintetico_check;
alter table public.perfis add constraint perfis_cnpj_empregador_sintetico_check
  check (cnpj_empregador_sintetico is null or cnpj_empregador_sintetico ~ '^[0-9]{14}$');

drop function if exists public.listar_usuarios_internos_demonstrativos();
create function public.listar_usuarios_internos_demonstrativos()
returns table (usuario_id uuid, nome text, email text, perfil_interno perfil_interno, cargo_profissional text, cnpj_empregador_sintetico text)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if perfil_interno_atual() <> 'administrador' or origem_ativa_atual() <> 'demonstracao' then
    raise exception 'Somente o Administrador pode gerenciar usuários.' using errcode = '42501';
  end if;
  return query select p.usuario_id, p.nome, u.email::text, p.perfil_interno, p.cargo_profissional, p.cnpj_empregador_sintetico
    from perfis p join auth.users u on u.id = p.usuario_id
    where p.origem_ativa = 'demonstracao' and p.perfil_interno is not null
      and not exists (select 1 from vinculos_empresa v where v.usuario_id = p.usuario_id and v.unico_ativo and v.aprovado_em is not null)
    order by p.nome;
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
      'cargo', p.cargo_profissional, 'cnpj', p.cnpj_empregador_sintetico,
      'atribuidos', (select count(*) from execucoes_servico ex where ex.responsavel_id = p.usuario_id and ex.origem = 'demonstracao'),
      'concluidos', (select count(*) from execucoes_servico ex where ex.responsavel_id = p.usuario_id and ex.origem = 'demonstracao' and ex.estado = 'concluido'),
      'em_execucao', (select count(*) from execucoes_servico ex where ex.responsavel_id = p.usuario_id and ex.origem = 'demonstracao' and ex.estado = 'em_execucao'),
      'retrabalhos', (select count(*) from execucoes_servico ex where ex.responsavel_id = p.usuario_id and ex.origem = 'demonstracao' and ex.retrabalho is true)
    ) order by p.nome) from perfis p join auth.users u on u.id = p.usuario_id
      where p.origem_ativa = 'demonstracao' and p.perfil_interno in ('tecnico','validador','administrador')), '[]'::jsonb),
    'clientes', coalesce((select jsonb_agg(jsonb_build_object(
      'empresa_id', e.id, 'empresa', e.razao_social,
      'cnpj', replace(coalesce(e.documento_cifrado,''), 'DEMONSTRACAO:', ''),
      'bloqueada', e.bloqueada_em is not null, 'bloqueio_motivo', e.bloqueio_motivo,
      'contatos', (select coalesce(jsonb_agg(jsonb_build_object('usuario_id', p.usuario_id, 'nome', p.nome, 'email', u.email, 'cargo', v.cargo)), '[]'::jsonb)
        from vinculos_empresa v join perfis p on p.usuario_id = v.usuario_id join auth.users u on u.id = v.usuario_id
        where v.empresa_id = e.id and v.unico_ativo and v.aprovado_em is not null),
      'solicitacoes', (select count(*) from solicitacoes s where s.empresa_id = e.id and s.origem = 'demonstracao'),
      'ultima_solicitacao', (select max(s.criado_em) from solicitacoes s where s.empresa_id=e.id and s.origem='demonstracao'),
      'concluidos', (select count(distinct ex.id) from propostas pr join versoes_proposta vp on vp.proposta_id=pr.id join itens_proposta ip on ip.versao_proposta_id=vp.id join execucoes_servico ex on ex.item_proposta_id=ip.id where pr.empresa_id=e.id and ex.origem='demonstracao' and ex.estado='concluido'),
      'em_execucao', (select count(distinct ex.id) from propostas pr join versoes_proposta vp on vp.proposta_id=pr.id join itens_proposta ip on ip.versao_proposta_id=vp.id join execucoes_servico ex on ex.item_proposta_id=ip.id where pr.empresa_id=e.id and ex.origem='demonstracao' and ex.estado='em_execucao'),
      'propostas_aceitas', (select count(*) from propostas pr join versoes_proposta vp on vp.proposta_id=pr.id where pr.empresa_id=e.id and vp.origem='demonstracao' and vp.estado='aceita'),
      'propostas_recusadas', (select count(*) from propostas pr join versoes_proposta vp on vp.proposta_id=pr.id where pr.empresa_id=e.id and vp.origem='demonstracao' and vp.estado='recusada'),
      'ticket_medio', (select round(avg(vp.total_brl),2) from propostas pr join versoes_proposta vp on vp.proposta_id=pr.id where pr.empresa_id=e.id and vp.origem='demonstracao' and vp.estado='aceita'),
      'valor_total', (select round(coalesce(sum(vp.total_brl),0),2) from propostas pr join versoes_proposta vp on vp.proposta_id=pr.id where pr.empresa_id=e.id and vp.origem='demonstracao' and vp.estado='aceita'),
      'servicos', (select coalesce(jsonb_agg(jsonb_build_object('slug', x.slug, 'quantidade', x.quantidade) order by x.quantidade desc), '[]'::jsonb) from (
        select sc.slug, count(*) quantidade from solicitacoes s join servicos_catalogo sc on sc.id=s.servico_catalogo_id where s.empresa_id=e.id and s.origem='demonstracao' group by sc.slug
      ) x)
    ) order by e.razao_social) from empresas e where e.origem = 'demonstracao'), '[]'::jsonb)
  ) into resultado;
  return resultado;
end;
$$;

create or replace function public.listar_portal_cliente()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(registro order by (registro->>'criada_em') desc), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'id', s.id, 'codigo', coalesce(sp.codigo, s.codigo),
      'protocolo', case when sp.codigo is not null then 'DEM-SOL-' || lpad(sp.codigo::text, 4, '0') else 'SOL-' || lpad(s.codigo::text, 4, '0') end,
      'estado', s.estado, 'criada_em', s.criado_em, 'servico', sc.slug,
      'descricao', coalesce(s.respostas->>'descricao',''), 'material', coalesce(s.respostas->>'material',''),
      'quantidade', coalesce(s.respostas->>'quantidade',''), 'prazo_servico', coalesce(s.respostas->>'prazo_servico',''),
      'proposta_estado', proposta_atual.estado, 'valor_pre_proposta', proposta_atual.total_moeda,
      'prazo_pagamento_dias', proposta_atual.prazo_pagamento_dias, 'aceita_em', proposta_atual.aceita_em,
      'recusada_em', proposta_atual.recusada_em, 'recusa_motivo', proposta_atual.recusa_motivo,
      'execucao_estado', (select case when bool_and(ex.estado = 'concluido') then 'concluido' when bool_or(ex.estado = 'em_execucao') then 'em_execucao' when bool_or(ex.estado = 'planejado') then 'planejado' when bool_or(ex.estado = 'cancelado') then 'cancelado' else null end from itens_proposta ip join execucoes_servico ex on ex.item_proposta_id = ip.id where ip.versao_proposta_id = proposta_atual.id),
      'etapas', (select coalesce(jsonb_agg(jsonb_build_object('id', et.id, 'titulo', et.titulo, 'descricao', et.descricao, 'ordem', et.ordem, 'estado', et.estado, 'progresso', et.progresso, 'atualizada_em', et.atualizada_em) order by et.ordem), '[]'::jsonb) from itens_proposta ip join execucoes_servico ex on ex.item_proposta_id = ip.id join etapas_execucao et on et.execucao_id = ex.id where ip.versao_proposta_id = proposta_atual.id and et.visivel_cliente and et.origem = 'demonstracao')
    ) registro
    from solicitacoes s join servicos_catalogo sc on sc.id = s.servico_catalogo_id
    left join solicitacoes_publicas sp on sp.solicitacao_id = s.id and sp.origem = 'demonstracao'
    left join lateral (select vp.id, vp.estado, vp.total_moeda, vp.prazo_pagamento_dias, vp.aceita_em, vp.recusada_em, vp.recusa_motivo from propostas p join versoes_proposta vp on vp.proposta_id = p.id where p.solicitacao_id = s.id and vp.estado in ('publicada', 'aceita', 'recusada') order by vp.criada_em desc limit 1) proposta_atual on true
    where s.origem = 'demonstracao' and usuario_da_empresa(s.empresa_id)
  ) dados;
$$;

revoke all on function public.listar_usuarios_internos_demonstrativos() from public, anon;
revoke all on function public.listar_painel_administrativo_demonstrativo() from public, anon;
revoke all on function public.listar_portal_cliente() from public, anon;
grant execute on function public.listar_usuarios_internos_demonstrativos() to authenticated;
grant execute on function public.listar_painel_administrativo_demonstrativo() to authenticated;
grant execute on function public.listar_portal_cliente() to authenticated;
