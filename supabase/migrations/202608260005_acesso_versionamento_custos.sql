-- Custos são administrativos, segregados pela origem ativa e sempre versionados.

create or replace function origem_ativa_atual()
returns origem_dado
language sql
stable
security definer
set search_path = public
as $$
  select origem_ativa
  from perfis
  where usuario_id = auth.uid()
    and perfil_interno is not null;
$$;

revoke all on function origem_ativa_atual() from public, anon;
grant execute on function origem_ativa_atual() to authenticated;

drop policy if exists "custos da origem para validador e administrador" on custos_equipamento;
create policy "custos da origem para validador e administrador"
on custos_equipamento for select to authenticated
using (
  perfil_interno_atual() in ('validador', 'administrador')
  and origem = origem_ativa_atual()
);

drop policy if exists "equipamentos para perfis internos" on equipamentos;
create policy "equipamentos para perfis internos"
on equipamentos for select to authenticated
using (usuario_interno());

grant select on table custos_equipamento to authenticated;
grant select on table equipamentos to authenticated;

create or replace function versionar_custo_equipamento(
  equipamento uuid,
  novo_custo_hora numeric,
  nova_vigencia date,
  fonte text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  perfil perfil_interno;
  origem_sessao origem_dado;
  custo_anterior custos_equipamento%rowtype;
  novo_id uuid;
begin
  select p.perfil_interno, p.origem_ativa
    into perfil, origem_sessao
  from perfis p
  where p.usuario_id = auth.uid();

  if perfil is distinct from 'administrador'::perfil_interno then
    raise exception 'Somente Administrador pode versionar custos.' using errcode = '42501';
  end if;

  if origem_sessao is null then
    raise exception 'Origem ativa não definida.' using errcode = '23514';
  end if;

  if novo_custo_hora is null or novo_custo_hora < 0 then
    raise exception 'Custo-hora inválido.' using errcode = '23514';
  end if;

  if nova_vigencia is null then
    raise exception 'Data de vigência obrigatória.' using errcode = '23514';
  end if;

  if nullif(trim(fonte), '') is null then
    raise exception 'Fonte do custo obrigatória.' using errcode = '23514';
  end if;

  if not exists (select 1 from equipamentos e where e.id = equipamento and e.ativo) then
    raise exception 'Equipamento ativo não encontrado.' using errcode = '23503';
  end if;

  select c.*
    into custo_anterior
  from custos_equipamento c
  where c.equipamento_id = equipamento
    and c.origem = origem_sessao
    and c.vigente_ate is null
  order by c.vigente_desde desc
  limit 1
  for update;

  if found and nova_vigencia <= custo_anterior.vigente_desde then
    raise exception 'A nova vigência deve ser posterior à vigente.' using errcode = '23514';
  end if;

  if found then
    update custos_equipamento
    set vigente_ate = nova_vigencia - 1
    where id = custo_anterior.id;
  end if;

  insert into custos_equipamento (
    equipamento_id,
    custo_hora,
    vigente_desde,
    origem_fonte,
    criado_por,
    origem
  ) values (
    equipamento,
    novo_custo_hora,
    nova_vigencia,
    trim(fonte),
    auth.uid(),
    origem_sessao
  )
  returning id into novo_id;

  insert into auditoria (origem, usuario_id, acao, entidade, entidade_id, dados)
  values (
    origem_sessao,
    auth.uid(),
    'versionar_custo',
    'custos_equipamento',
    novo_id,
    jsonb_build_object(
      'equipamento_id', equipamento,
      'vigente_desde', nova_vigencia,
      'custo_anterior_id', custo_anterior.id
    )
  );

  return novo_id;
end;
$$;

revoke all on function versionar_custo_equipamento(uuid, numeric, date, text) from public, anon;
grant execute on function versionar_custo_equipamento(uuid, numeric, date, text) to authenticated;

comment on function versionar_custo_equipamento(uuid, numeric, date, text) is
  'Encerra a vigência anterior e cria custo na origem ativa; somente Administrador, com auditoria.';
