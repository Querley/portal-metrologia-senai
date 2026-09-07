-- Reforca invariantes descobertos na homologacao: telefone valido, pre-proposta
-- obrigatoriamente vinculada, motivo de recusa visivel e macroetapas sequenciais.

alter table solicitacoes_publicas
  drop constraint if exists solicitacoes_publicas_telefone_formato;
alter table solicitacoes_publicas
  add constraint solicitacoes_publicas_telefone_formato
  check (
    telefone is null or (
      telefone ~ '^\+?[0-9 ()-]{8,30}$'
      and char_length(regexp_replace(telefone, '[^0-9]', '', 'g')) >= 8
    )
  ) not valid;
alter table solicitacoes_publicas validate constraint solicitacoes_publicas_telefone_formato;

-- A aplicacao nao pode criar um rascunho comercial sem uma solicitacao real.
-- As rotinas vinculadas continuam chamando a funcao-base como proprietarias.
revoke execute on function criar_pre_proposta_demonstrativa(uuid, uuid, text, numeric, numeric, numeric, numeric, text, integer) from authenticated;

create or replace function listar_recusas_pre_propostas_demonstrativas()
returns table (versao_id uuid, recusa_motivo text, recusada_em timestamptz)
language plpgsql stable security definer set search_path = public
as $$
begin
  if perfil_interno_atual() not in ('tecnico', 'validador', 'administrador') then
    raise exception 'Perfil sem acesso as recusas.' using errcode = '42501';
  end if;
  if origem_ativa_atual() is distinct from 'demonstracao'::origem_dado then
    raise exception 'Esta funcao aceita somente a origem demonstracao.' using errcode = '23514';
  end if;
  return query
  select v.id, v.recusa_motivo, v.recusada_em
  from versoes_proposta v
  join propostas p on p.id = v.proposta_id
  where v.origem = 'demonstracao' and p.origem = 'demonstracao'
    and v.recusa_motivo is not null;
end;
$$;
revoke all on function listar_recusas_pre_propostas_demonstrativas() from public, anon;
grant execute on function listar_recusas_pre_propostas_demonstrativas() to authenticated;

create or replace function validar_ordem_etapa_execucao()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.estado <> 'a_fazer' and exists (
    select 1 from etapas_execucao anterior
    where anterior.execucao_id = new.execucao_id
      and anterior.ordem < new.ordem
      and (anterior.estado <> 'concluida' or anterior.progresso <> 100)
  ) then
    raise exception 'Conclua as etapas anteriores antes de avançar.' using errcode = '23514';
  end if;

  if old.estado = 'concluida' and new.estado <> 'concluida' and exists (
    select 1 from etapas_execucao posterior
    where posterior.execucao_id = new.execucao_id
      and posterior.ordem > new.ordem
      and posterior.estado <> 'a_fazer'
  ) then
    raise exception 'Não é possível reabrir uma etapa com etapas posteriores iniciadas.' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists etapas_execucao_ordem_obrigatoria on etapas_execucao;
create trigger etapas_execucao_ordem_obrigatoria
before update of estado, progresso on etapas_execucao
for each row execute function validar_ordem_etapa_execucao();

comment on function validar_ordem_etapa_execucao() is 'Impede iniciar ou concluir macroetapas fora da ordem definida para a execução.';

create or replace function listar_usuarios_internos_demonstrativos()
returns table (usuario_id uuid, nome text, perfil_interno perfil_interno)
language plpgsql stable security definer set search_path = public as $$
begin
  if perfil_interno_atual() <> 'administrador' or origem_ativa_atual() <> 'demonstracao' then
    raise exception 'Somente o Administrador pode gerenciar usuários.' using errcode = '42501';
  end if;
  return query select p.usuario_id, p.nome, p.perfil_interno from perfis p
    where p.origem_ativa = 'demonstracao' order by p.nome;
end;
$$;

create or replace function alterar_perfil_interno_demonstrativo(alvo uuid, novo_perfil perfil_interno)
returns void language plpgsql security definer set search_path = public as $$
declare perfil_anterior perfil_interno;
begin
  if perfil_interno_atual() <> 'administrador' or origem_ativa_atual() <> 'demonstracao' then
    raise exception 'Somente o Administrador pode alterar funções.' using errcode = '42501';
  end if;
  if alvo = auth.uid() then
    raise exception 'Use outro Administrador para alterar sua própria função.' using errcode = '23514';
  end if;
  select p.perfil_interno into perfil_anterior from perfis p
    where p.usuario_id = alvo and p.origem_ativa = 'demonstracao' for update;
  if not found then raise exception 'Usuário interno não encontrado.' using errcode = '23503'; end if;
  update perfis set perfil_interno = novo_perfil where usuario_id = alvo;
  insert into auditoria (origem, usuario_id, acao, entidade, entidade_id, dados)
  values ('demonstracao', auth.uid(), 'alterar_perfil_interno_demonstrativo', 'perfis', alvo,
    jsonb_build_object('perfil_anterior', perfil_anterior, 'perfil_novo', novo_perfil));
end;
$$;

revoke all on function listar_usuarios_internos_demonstrativos() from public, anon;
revoke all on function alterar_perfil_interno_demonstrativo(uuid, perfil_interno) from public, anon;
grant execute on function listar_usuarios_internos_demonstrativos() to authenticated;
grant execute on function alterar_perfil_interno_demonstrativo(uuid, perfil_interno) to authenticated;

alter table versoes_proposta add column if not exists entrega_estimada date;
alter table versoes_proposta drop constraint if exists versoes_proposta_entrega_estimada_valida;
alter table versoes_proposta add constraint versoes_proposta_entrega_estimada_valida
  check (entrega_estimada is null or entrega_estimada >= criada_em::date) not valid;
alter table versoes_proposta validate constraint versoes_proposta_entrega_estimada_valida;

create or replace function criar_nova_pre_proposta_multiequipamento_demonstrativa(
  solicitacao uuid, servico uuid, equipamentos_horas jsonb, descricao text, quantidade numeric,
  custos_extras numeric, percentual_lucro numeric, destinatario text,
  prazo_pagamento_dias integer, entrega_estimada date
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  versao_id uuid; item_id uuid; primeiro jsonb; uso jsonb; custo numeric(18,6);
  custo_total numeric(18,6); preco_total numeric(18,6);
begin
  if jsonb_typeof(equipamentos_horas) <> 'array' or jsonb_array_length(equipamentos_horas) not between 1 and 10 then
    raise exception 'Informe de um a dez equipamentos.' using errcode = '23514';
  end if;
  if entrega_estimada is null or entrega_estimada < current_date then
    raise exception 'A entrega estimada não pode estar no passado.' using errcode = '23514';
  end if;
  if exists (select 1 from jsonb_array_elements(equipamentos_horas) x group by x->>'equipamento_id' having count(*) > 1) then
    raise exception 'Não repita o mesmo equipamento.' using errcode = '23514';
  end if;
  primeiro := equipamentos_horas->0;
  versao_id := criar_nova_pre_proposta_para_solicitacao_demonstrativa(
    solicitacao, servico, (primeiro->>'equipamento_id')::uuid, descricao, quantidade,
    (primeiro->>'horas')::numeric, custos_extras, percentual_lucro, destinatario, prazo_pagamento_dias
  );
  select id into item_id from itens_proposta where versao_proposta_id = versao_id;
  for uso in select value from jsonb_array_elements(equipamentos_horas) with ordinality e(value, ordem) where ordem > 1 loop
    if (uso->>'horas')::numeric < 0 then raise exception 'Horas inválidas.' using errcode = '23514'; end if;
    select c.custo_hora into custo from custos_equipamento c
      join equipamentos eq on eq.id = c.equipamento_id
      where c.equipamento_id = (uso->>'equipamento_id')::uuid and eq.ativo
        and c.origem = 'demonstracao' and c.vigente_desde <= current_date
        and (c.vigente_ate is null or c.vigente_ate >= current_date)
      order by c.vigente_desde desc limit 1;
    if custo is null then raise exception 'Equipamento sem custo vigente.' using errcode = '23514'; end if;
    insert into usos_equipamento_proposta (item_proposta_id, equipamento_id, horas, custo_hora_congelado)
      values (item_id, (uso->>'equipamento_id')::uuid, (uso->>'horas')::numeric, custo);
  end loop;
  select round(sum(u.horas * u.custo_hora_congelado) + ip.custos_extras, 6)
    into custo_total from itens_proposta ip join usos_equipamento_proposta u on u.item_proposta_id = ip.id
    where ip.id = item_id group by ip.custos_extras;
  preco_total := round(custo_total * (1 + percentual_lucro / 100), 6);
  update itens_proposta set custo_congelado = custo_total, preco_antes_ajuste = preco_total, preco_final = preco_total where id = item_id;
  update versoes_proposta set total_brl = preco_total, total_moeda = preco_total, entrega_estimada = criar_nova_pre_proposta_multiequipamento_demonstrativa.entrega_estimada where id = versao_id;
  insert into auditoria (origem, usuario_id, acao, entidade, entidade_id, dados)
    values ('demonstracao', auth.uid(), 'registrar_multiplos_equipamentos_e_entrega', 'versoes_proposta', versao_id,
      jsonb_build_object('quantidade_equipamentos', jsonb_array_length(equipamentos_horas), 'entrega_estimada', entrega_estimada));
  return versao_id;
end;
$$;

create or replace function listar_entregas_pre_propostas_demonstrativas()
returns table (versao_id uuid, entrega_estimada date)
language plpgsql stable security definer set search_path = public as $$
begin
  if perfil_interno_atual() not in ('tecnico','validador','administrador') then raise exception 'Perfil sem acesso.' using errcode = '42501'; end if;
  return query select v.id, v.entrega_estimada from versoes_proposta v where v.origem = 'demonstracao';
end;
$$;
revoke all on function criar_nova_pre_proposta_multiequipamento_demonstrativa(uuid,uuid,jsonb,text,numeric,numeric,numeric,text,integer,date) from public, anon;
revoke all on function listar_entregas_pre_propostas_demonstrativas() from public, anon;
grant execute on function criar_nova_pre_proposta_multiequipamento_demonstrativa(uuid,uuid,jsonb,text,numeric,numeric,numeric,text,integer,date) to authenticated;
grant execute on function listar_entregas_pre_propostas_demonstrativas() to authenticated;
