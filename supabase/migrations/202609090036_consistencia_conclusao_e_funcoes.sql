-- Mantem conclusao e perfis operacionais coerentes na homologacao.

update execucoes_servico
set estado = 'concluido',
    entrega_real = coalesce(entrega_real, fechamento_decidido_em, now())
where origem = 'demonstracao'
  and fechamento_estado = 'aprovado'
  and (estado <> 'concluido' or entrega_real is null);

alter table execucoes_servico
  drop constraint if exists execucoes_fechamento_aprovado_concluido;

alter table execucoes_servico
  add constraint execucoes_fechamento_aprovado_concluido
  check (fechamento_estado <> 'aprovado' or (estado = 'concluido' and entrega_real is not null)) not valid;

alter table execucoes_servico validate constraint execucoes_fechamento_aprovado_concluido;

create or replace function alterar_perfil_interno_demonstrativo(alvo uuid, novo_perfil perfil_interno)
returns void language plpgsql security definer set search_path = public as $$
declare perfil_anterior perfil_interno;
begin
  if perfil_interno_atual() <> 'administrador' or origem_ativa_atual() <> 'demonstracao' then
    raise exception 'Somente Administrador demonstrativo altera funcoes.' using errcode = '42501';
  end if;
  if novo_perfil not in ('tecnico', 'validador', 'administrador') then
    raise exception 'Selecione Tecnico, Validador ou Administrador.' using errcode = '23514';
  end if;
  if alvo = auth.uid() then
    raise exception 'O Administrador nao pode alterar a propria funcao nesta tela.' using errcode = '23514';
  end if;
  if exists (select 1 from vinculos_empresa where usuario_id = alvo and ativo and origem = 'demonstracao') then
    raise exception 'Contas de Cliente devem ser administradas como contatos da empresa, nao como equipe interna.' using errcode = '23514';
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

revoke all on function alterar_perfil_interno_demonstrativo(uuid, perfil_interno) from public, anon;
grant execute on function alterar_perfil_interno_demonstrativo(uuid, perfil_interno) to authenticated;

comment on constraint execucoes_fechamento_aprovado_concluido on execucoes_servico is
  'Fechamento aprovado representa servico concluido e exige data real de entrega.';
