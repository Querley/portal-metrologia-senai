-- Permite somente ao Administrador ativar ou desativar equipamentos (ex.: CONTURA) na aba de Custos.
create or replace function public.alterar_ativo_equipamento_demonstrativo(
  equipamento uuid,
  novo_ativo boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  usuario uuid := auth.uid();
  perfil_atual public.perfil_interno;
begin
  if usuario is null then
    raise exception 'Usuario nao autenticado.' using errcode = '42501';
  end if;

  select p.perfil_interno
    into perfil_atual
    from public.perfis p
   where p.usuario_id = usuario
     and p.origem_ativa = 'demonstracao';

  if perfil_atual is distinct from 'administrador' then
    raise exception 'Somente Administrador pode ativar ou desativar equipamentos.' using errcode = '42501';
  end if;

  if not exists (select 1 from public.equipamentos e where e.id = equipamento) then
    raise exception 'Equipamento nao encontrado.' using errcode = '23503';
  end if;

  update public.equipamentos
     set ativo = novo_ativo
   where id = equipamento;

  return novo_ativo;
end;
$$;

revoke all on function public.alterar_ativo_equipamento_demonstrativo(uuid, boolean) from public, anon;
grant execute on function public.alterar_ativo_equipamento_demonstrativo(uuid, boolean) to authenticated;

comment on function public.alterar_ativo_equipamento_demonstrativo(uuid, boolean) is
  'Permite exclusivamente ao Administrador ativar ou desativar um equipamento (como a CONTURA).';
