-- Corrige a separacao entre acesso interno e Cliente, permite cargo empresarial
-- editavel, troca segura de e-mail sintético e retorno auditado de etapas.

alter table vinculos_empresa add column if not exists cargo text;

update vinculos_empresa
set cargo = case perfil when 'gestor_empresa' then 'Gestor da empresa' else 'Contato da empresa' end
where cargo is null;

alter table vinculos_empresa alter column cargo set not null;
alter table vinculos_empresa alter column cargo drop default;
alter table vinculos_empresa drop constraint if exists vinculos_empresa_cargo_valido;
alter table vinculos_empresa add constraint vinculos_empresa_cargo_valido
  check (char_length(trim(cargo)) between 2 and 120);

create or replace function preencher_cargo_vinculo_empresa()
returns trigger language plpgsql set search_path = public as $$
begin
  if nullif(trim(new.cargo), '') is null then
    new.cargo := case new.perfil when 'gestor_empresa' then 'Gestor da empresa' else 'Contato da empresa' end;
  end if;
  return new;
end;
$$;
drop trigger if exists vinculos_empresa_preenchem_cargo on vinculos_empresa;
create trigger vinculos_empresa_preenchem_cargo before insert on vinculos_empresa
for each row execute function preencher_cargo_vinculo_empresa();

-- Repara contas externas que tenham recebido um papel interno por engano.
update perfis p
set perfil_interno = null
where p.origem_ativa = 'demonstracao'
  and exists (
    select 1 from vinculos_empresa v
    join empresas e on e.id = v.empresa_id
    where v.usuario_id = p.usuario_id and v.unico_ativo and v.aprovado_em is not null
      and e.origem = 'demonstracao'
  );

create or replace function obter_contexto_cliente()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'vinculo_id', v.id, 'empresa_id', e.id, 'empresa_nome', e.razao_social,
    'perfil', v.perfil, 'cargo', v.cargo, 'origem', e.origem,
    'usuario_nome', coalesce(p.nome, 'Cliente'),
    'usuario_email', auth.jwt()->>'email',
    'aceite_privacidade_em', v.aceite_privacidade_em,
    'versao_aviso_privacidade', v.versao_aviso_privacidade
  )
  from vinculos_empresa v
  join empresas e on e.id = v.empresa_id
  left join perfis p on p.usuario_id = v.usuario_id
  where v.usuario_id = auth.uid() and v.aprovado_em is not null and v.unico_ativo
    and e.origem = 'demonstracao'
  order by v.aprovado_em desc limit 1;
$$;

create or replace function atualizar_perfil_cliente_demonstrativo(novo_nome text, novo_cargo text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  nome_normalizado text := trim(coalesce(novo_nome, ''));
  cargo_normalizado text := trim(coalesce(novo_cargo, ''));
  vinculo_atual uuid;
begin
  if char_length(nome_normalizado) not between 2 and 120 then
    raise exception 'O nome deve ter entre 2 e 120 caracteres.' using errcode = '23514';
  end if;
  if char_length(cargo_normalizado) not between 2 and 120 then
    raise exception 'O cargo deve ter entre 2 e 120 caracteres.' using errcode = '23514';
  end if;
  select v.id into vinculo_atual from vinculos_empresa v join empresas e on e.id = v.empresa_id
    where v.usuario_id = auth.uid() and v.aprovado_em is not null and v.unico_ativo
      and e.origem = 'demonstracao' for update of v;
  if not found then raise exception 'Vínculo de Cliente não encontrado.' using errcode = '42501'; end if;

  insert into perfis (usuario_id, nome, perfil_interno, origem_ativa)
  values (auth.uid(), nome_normalizado, null, 'demonstracao')
  on conflict (usuario_id) do update set nome = excluded.nome, perfil_interno = null;
  update vinculos_empresa set cargo = cargo_normalizado where id = vinculo_atual;
  insert into auditoria (origem, usuario_id, acao, entidade, entidade_id, dados)
  values ('demonstracao', auth.uid(), 'atualizar_perfil_cliente', 'vinculos_empresa', vinculo_atual,
    jsonb_build_object('cargo', cargo_normalizado));
  return jsonb_build_object('nome', nome_normalizado, 'cargo', cargo_normalizado);
end;
$$;

create or replace function atualizar_email_proprio_demonstrativo(novo_email text)
returns text language plpgsql security definer set search_path = public, auth as $$
declare email_normalizado text := lower(trim(coalesce(novo_email, '')));
begin
  if auth.uid() is null then raise exception 'Autenticação necessária.' using errcode = '42501'; end if;
  if email_normalizado !~ '^[a-z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-z0-9.-]+\.test$' then
    raise exception 'Na homologação, use um e-mail válido terminado em .test.' using errcode = '23514';
  end if;
  if not exists (select 1 from public.perfis p where p.usuario_id = auth.uid() and p.origem_ativa = 'demonstracao') then
    raise exception 'Perfil demonstrativo não encontrado.' using errcode = '42501';
  end if;
  if exists (select 1 from auth.users u where lower(u.email) = email_normalizado and u.id <> auth.uid()) then
    raise exception 'Este e-mail já está associado a outro usuário.' using errcode = '23505';
  end if;
  update auth.users set email = email_normalizado, email_confirmed_at = now(), updated_at = now()
    where id = auth.uid();
  update auth.identities
    set identity_data = jsonb_set(identity_data, '{email}', to_jsonb(email_normalizado), true), updated_at = now()
    where user_id = auth.uid() and provider = 'email';
  insert into public.auditoria (origem, usuario_id, acao, entidade, entidade_id, dados)
  values ('demonstracao', auth.uid(), 'atualizar_email_proprio', 'auth.users', auth.uid(),
    jsonb_build_object('email_novo', email_normalizado));
  return email_normalizado;
end;
$$;

create or replace function listar_usuarios_internos_demonstrativos()
returns table (usuario_id uuid, nome text, perfil_interno perfil_interno)
language plpgsql stable security definer set search_path = public as $$
begin
  if perfil_interno_atual() <> 'administrador' or origem_ativa_atual() <> 'demonstracao' then
    raise exception 'Somente o Administrador pode gerenciar usuários.' using errcode = '42501';
  end if;
  return query select p.usuario_id, p.nome, p.perfil_interno from perfis p
    where p.origem_ativa = 'demonstracao' and p.perfil_interno is not null
      and not exists (select 1 from vinculos_empresa v where v.usuario_id = p.usuario_id and v.unico_ativo and v.aprovado_em is not null)
    order by p.nome;
end;
$$;

create or replace function alterar_perfil_interno_demonstrativo(alvo uuid, novo_perfil perfil_interno)
returns void language plpgsql security definer set search_path = public as $$
declare perfil_anterior perfil_interno;
begin
  if perfil_interno_atual() <> 'administrador' or origem_ativa_atual() <> 'demonstracao' then
    raise exception 'Somente o Administrador pode alterar funções.' using errcode = '42501';
  end if;
  if alvo = auth.uid() then raise exception 'Use outro Administrador para alterar sua própria função.' using errcode = '23514'; end if;
  if exists (select 1 from vinculos_empresa v where v.usuario_id = alvo and v.unico_ativo and v.aprovado_em is not null) then
    raise exception 'Contas de Cliente não podem receber função interna.' using errcode = '23514';
  end if;
  select p.perfil_interno into perfil_anterior from perfis p
    where p.usuario_id = alvo and p.origem_ativa = 'demonstracao' and p.perfil_interno is not null for update;
  if not found then raise exception 'Usuário interno não encontrado.' using errcode = '23503'; end if;
  update perfis set perfil_interno = novo_perfil where usuario_id = alvo;
  insert into auditoria (origem, usuario_id, acao, entidade, entidade_id, dados)
  values ('demonstracao', auth.uid(), 'alterar_perfil_interno_demonstrativo', 'perfis', alvo,
    jsonb_build_object('perfil_anterior', perfil_anterior, 'perfil_novo', novo_perfil));
end;
$$;

create or replace function retornar_execucao_etapa_demonstrativa(execucao uuid, etapa_destino uuid, motivo text)
returns void language plpgsql security definer set search_path = public as $$
declare
  ordem_destino integer; estado_execucao estado_servico; motivo_normalizado text := trim(coalesce(motivo, ''));
  perfil perfil_interno := perfil_interno_atual(); origem_sessao origem_dado := origem_ativa_atual(); responsavel uuid;
  etapa_posterior record;
  fechamento_atual text;
begin
  if perfil not in ('tecnico','validador','administrador') or origem_sessao <> 'demonstracao' then
    raise exception 'Perfil sem permissão para retornar etapas.' using errcode = '42501';
  end if;
  if char_length(motivo_normalizado) not between 10 and 1000 then
    raise exception 'Explique o retorno em 10 a 1000 caracteres.' using errcode = '23514';
  end if;
  select ex.estado, ex.responsavel_id, ex.fechamento_estado into estado_execucao, responsavel, fechamento_atual
    from execucoes_servico ex where ex.id = execucao and ex.origem = 'demonstracao' for update;
  if not found then raise exception 'Execução não encontrada.' using errcode = '23503'; end if;
  if estado_execucao in ('concluido','cancelado') then raise exception 'Trabalho finalizado não pode retornar de etapa.' using errcode = '23514'; end if;
  if fechamento_atual not in ('nao_iniciado','devolvido') then raise exception 'Resolva o fechamento em validação antes de retornar etapas.' using errcode = '23514'; end if;
  if perfil = 'tecnico' and responsavel is distinct from auth.uid() then raise exception 'Técnico só pode alterar trabalho atribuído a ele.' using errcode = '42501'; end if;
  select et.ordem into ordem_destino from etapas_execucao et
    where et.id = etapa_destino and et.execucao_id = execucao and et.origem = 'demonstracao' for update;
  if not found then raise exception 'Etapa de destino não encontrada.' using errcode = '23503'; end if;
  if not exists (select 1 from etapas_execucao et where et.execucao_id = execucao and et.ordem > ordem_destino and et.progresso > 0) then
    raise exception 'O trabalho ainda não avançou além desta etapa.' using errcode = '23514';
  end if;

  -- Reinicia da última para a primeira para respeitar o gatilho sequencial.
  for etapa_posterior in
    select et.id from etapas_execucao et where et.execucao_id = execucao and et.ordem > ordem_destino order by et.ordem desc
  loop
    update etapas_execucao set estado = 'a_fazer', progresso = 0, atualizada_em = now()
      where id = etapa_posterior.id;
  end loop;
  update etapas_execucao set estado = 'em_andamento', progresso = 1, atualizada_em = now()
    where id = etapa_destino;
  update execucoes_servico set estado = 'em_execucao', entrega_real = null where id = execucao;
  insert into auditoria (origem, usuario_id, acao, entidade, entidade_id, dados)
  values ('demonstracao', auth.uid(), 'retornar_execucao_etapa', 'execucoes_servico', execucao,
    jsonb_build_object('etapa_destino', etapa_destino, 'ordem_destino', ordem_destino, 'motivo', motivo_normalizado));
end;
$$;

revoke all on function atualizar_perfil_cliente_demonstrativo(text,text) from public, anon;
revoke all on function atualizar_email_proprio_demonstrativo(text) from public, anon;
revoke all on function retornar_execucao_etapa_demonstrativa(uuid,uuid,text) from public, anon;
grant execute on function atualizar_perfil_cliente_demonstrativo(text,text) to authenticated;
grant execute on function atualizar_email_proprio_demonstrativo(text) to authenticated;
grant execute on function retornar_execucao_etapa_demonstrativa(uuid,uuid,text) to authenticated;

comment on function retornar_execucao_etapa_demonstrativa(uuid,uuid,text) is
  'Retorna trabalho não finalizado a uma etapa anterior, reinicia as posteriores e audita o motivo.';
