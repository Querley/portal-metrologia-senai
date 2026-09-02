-- Substitui o acesso temporario de todos os Tecnicos por atribuicao formal.
-- Validador e Administrador mantem visibilidade de supervisao; somente o
-- Tecnico atribuido pode operar diretamente a execucao demonstrativa.

alter table execucoes_servico
  add column if not exists responsavel_id uuid references perfis(usuario_id),
  add column if not exists responsavel_atribuido_por uuid references auth.users(id),
  add column if not exists responsavel_atribuido_em timestamptz;

create index if not exists execucoes_responsavel_idx
  on execucoes_servico (responsavel_id, origem, estado);

-- Preserva continuidade apenas quando o autor da proposta ja e um Tecnico
-- ativo da mesma origem. Os demais trabalhos ficam explicitamente sem dono
-- ate a atribuicao do Administrador.
update execucoes_servico ex
set responsavel_id = p.criado_por,
    responsavel_atribuido_por = p.criado_por,
    responsavel_atribuido_em = coalesce(ex.inicio_real, ex.criado_em)
from itens_proposta ip
join versoes_proposta vp on vp.id = ip.versao_proposta_id
join propostas p on p.id = vp.proposta_id
join perfis pf on pf.usuario_id = p.criado_por
where ex.item_proposta_id = ip.id
  and ex.origem = 'demonstracao'
  and ex.responsavel_id is null
  and pf.perfil_interno = 'tecnico'
  and pf.origem_ativa = ex.origem;

create or replace function atribuir_responsavel_inicial_execucao()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  autor uuid;
begin
  if new.origem = 'demonstracao' and new.responsavel_id is null then
    select p.criado_por into autor
    from itens_proposta ip
    join versoes_proposta vp on vp.id = ip.versao_proposta_id
    join propostas p on p.id = vp.proposta_id
    join perfis pf
      on pf.usuario_id = p.criado_por
     and pf.perfil_interno = 'tecnico'
     and pf.origem_ativa = new.origem
    where ip.id = new.item_proposta_id;

    if autor is not null then
      new.responsavel_id := autor;
      new.responsavel_atribuido_por := autor;
      new.responsavel_atribuido_em := now();
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists execucoes_atribuem_responsavel_inicial on execucoes_servico;
create trigger execucoes_atribuem_responsavel_inicial
before insert on execucoes_servico
for each row execute function atribuir_responsavel_inicial_execucao();

create or replace function validar_tecnico_responsavel_execucao()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  perfil perfil_interno;
  origem_sessao origem_dado;
  execucao_alvo uuid;
  responsavel uuid;
begin
  select pf.perfil_interno, pf.origem_ativa
    into perfil, origem_sessao
  from perfis pf
  where pf.usuario_id = auth.uid();

  if perfil is distinct from 'tecnico'::perfil_interno then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if tg_table_name = 'execucoes_servico' then
    responsavel := old.responsavel_id;
    origem_sessao := old.origem;
  elsif tg_table_name = 'etapas_execucao' then
    execucao_alvo := coalesce(new.execucao_id, old.execucao_id);
    select ex.responsavel_id, ex.origem
      into responsavel, origem_sessao
    from execucoes_servico ex
    where ex.id = execucao_alvo;
  elsif tg_table_name = 'horas_reais_equipamento' then
    execucao_alvo := coalesce(new.execucao_id, old.execucao_id);
    select ex.responsavel_id, ex.origem
      into responsavel, origem_sessao
    from execucoes_servico ex
    where ex.id = execucao_alvo;
  end if;

  if origem_sessao is distinct from 'demonstracao'::origem_dado
     or responsavel is distinct from auth.uid() then
    raise exception 'Tecnico pode operar somente execucao demonstrativa atribuida a ele.'
      using errcode = '42501';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists execucoes_validam_tecnico_responsavel on execucoes_servico;
create trigger execucoes_validam_tecnico_responsavel
before update or delete on execucoes_servico
for each row execute function validar_tecnico_responsavel_execucao();

drop trigger if exists etapas_validam_tecnico_responsavel on etapas_execucao;
create trigger etapas_validam_tecnico_responsavel
before insert or update or delete on etapas_execucao
for each row execute function validar_tecnico_responsavel_execucao();

drop trigger if exists horas_reais_validam_tecnico_responsavel on horas_reais_equipamento;
create trigger horas_reais_validam_tecnico_responsavel
before insert or update or delete on horas_reais_equipamento
for each row execute function validar_tecnico_responsavel_execucao();

create or replace function listar_responsaveis_demonstrativos()
returns table (usuario_id uuid, nome text, perfil perfil_interno)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  perfil_atual perfil_interno;
  origem_sessao origem_dado;
begin
  select pf.perfil_interno, pf.origem_ativa
    into perfil_atual, origem_sessao
  from perfis pf
  where pf.usuario_id = auth.uid();

  if perfil_atual is distinct from 'administrador'::perfil_interno then
    raise exception 'Somente Administrador consulta responsaveis atribuiveis.' using errcode = '42501';
  end if;
  if origem_sessao is distinct from 'demonstracao'::origem_dado then
    raise exception 'Esta funcao aceita somente a origem demonstracao.' using errcode = '23514';
  end if;

  return query
  select pf.usuario_id, pf.nome, pf.perfil_interno
  from perfis pf
  where pf.origem_ativa = origem_sessao
    and pf.perfil_interno = 'tecnico'
  order by pf.nome;
end;
$$;

create or replace function atribuir_responsavel_execucao_demonstrativa(
  execucao uuid,
  responsavel uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  usuario uuid := auth.uid();
  perfil perfil_interno;
  origem_sessao origem_dado;
  estado_atual estado_servico;
  responsavel_anterior uuid;
begin
  select pf.perfil_interno, pf.origem_ativa
    into perfil, origem_sessao
  from perfis pf
  where pf.usuario_id = usuario;

  if perfil is distinct from 'administrador'::perfil_interno then
    raise exception 'Somente Administrador atribui o responsavel.' using errcode = '42501';
  end if;
  if origem_sessao is distinct from 'demonstracao'::origem_dado then
    raise exception 'Esta funcao aceita somente a origem demonstracao.' using errcode = '23514';
  end if;
  if not exists (
    select 1 from perfis pf
    where pf.usuario_id = responsavel
      and pf.perfil_interno = 'tecnico'
      and pf.origem_ativa = origem_sessao
  ) then
    raise exception 'Responsavel deve ser Tecnico ativo da origem demonstracao.' using errcode = '23503';
  end if;

  select ex.estado, ex.responsavel_id
    into estado_atual, responsavel_anterior
  from execucoes_servico ex
  where ex.id = execucao and ex.origem = origem_sessao
  for update;

  if not found then
    raise exception 'Execucao nao encontrada na origem ativa.' using errcode = '23503';
  end if;
  if estado_atual in ('concluido', 'cancelado') then
    raise exception 'Execucao concluida ou cancelada nao pode ser reatribuida.' using errcode = '23514';
  end if;

  update execucoes_servico
  set responsavel_id = responsavel,
      responsavel_atribuido_por = usuario,
      responsavel_atribuido_em = now()
  where id = execucao;

  insert into auditoria (origem, usuario_id, acao, entidade, entidade_id, dados)
  values (
    origem_sessao,
    usuario,
    'atribuir_responsavel_execucao_demonstrativa',
    'execucoes_servico',
    execucao,
    jsonb_build_object('responsavel_anterior', responsavel_anterior, 'responsavel_novo', responsavel)
  );
end;
$$;

create or replace function listar_execucoes_demonstrativas()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  usuario uuid := auth.uid();
  perfil perfil_interno;
  origem_sessao origem_dado;
  resultado jsonb;
begin
  select pf.perfil_interno, pf.origem_ativa
    into perfil, origem_sessao
  from perfis pf
  where pf.usuario_id = usuario;

  if perfil is null or perfil not in ('tecnico', 'validador', 'administrador') then
    raise exception 'Perfil sem acesso as execucoes.' using errcode = '42501';
  end if;
  if origem_sessao is distinct from 'demonstracao'::origem_dado then
    raise exception 'Esta funcao aceita somente a origem demonstracao.' using errcode = '23514';
  end if;

  select coalesce(jsonb_agg(registro order by (registro->>'criada_em') desc), '[]'::jsonb)
    into resultado
  from (
    select jsonb_build_object(
      'execucao_id', ex.id,
      'estado', ex.estado,
      'inicio_real', ex.inicio_real,
      'entrega_real', ex.entrega_real,
      'criada_em', ex.criado_em,
      'solicitacao_codigo', coalesce(sp.codigo, s.codigo),
      'empresa_nome', emp.razao_social,
      'servico_slug', sc.slug,
      'descricao', ip.descricao,
      'responsavel_id', ex.responsavel_id,
      'responsavel_nome', coalesce(responsavel.nome, 'Nao atribuido'),
      'responsavel_atribuido_em', ex.responsavel_atribuido_em,
      'fechamento_estado', ex.fechamento_estado,
      'custos_extras_reais', ex.custos_extras_reais,
      'retrabalho', ex.retrabalho,
      'mudanca_escopo', ex.mudanca_escopo,
      'causa_principal', ex.causa_principal,
      'fechamento_observacoes', ex.fechamento_observacoes,
      'fechamento_aprendizado', ex.fechamento_aprendizado,
      'fechamento_enviado_em', ex.fechamento_enviado_em,
      'fechamento_decidido_em', ex.fechamento_decidido_em,
      'fechamento_justificativa', ex.fechamento_justificativa,
      'equipamentos', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'equipamento_id', uso.equipamento_id,
          'nome', uso.nome,
          'horas_estimadas', uso.horas_estimadas,
          'horas_reais', hr.horas
        ) order by uso.nome), '[]'::jsonb)
        from (
          select ue.equipamento_id, eq.nome, sum(ue.horas) as horas_estimadas
          from usos_equipamento_proposta ue
          join equipamentos eq on eq.id = ue.equipamento_id
          where ue.item_proposta_id = ip.id
          group by ue.equipamento_id, eq.nome
        ) uso
        left join horas_reais_equipamento hr
          on hr.execucao_id = ex.id
         and hr.equipamento_id = uso.equipamento_id
         and hr.origem = origem_sessao
      ),
      'etapas', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', et.id,
          'ordem', et.ordem,
          'titulo', et.titulo,
          'descricao', et.descricao,
          'estado', et.estado,
          'progresso', et.progresso,
          'visivel_cliente', et.visivel_cliente,
          'atualizada_em', et.atualizada_em
        ) order by et.ordem), '[]'::jsonb)
        from etapas_execucao et
        where et.execucao_id = ex.id and et.origem = origem_sessao
      )
    ) as registro
    from execucoes_servico ex
    join itens_proposta ip on ip.id = ex.item_proposta_id
    join versoes_proposta vp on vp.id = ip.versao_proposta_id
    join propostas p on p.id = vp.proposta_id
    join solicitacoes s on s.id = p.solicitacao_id
    join empresas emp on emp.id = p.empresa_id
    join servicos_catalogo sc on sc.id = ip.servico_catalogo_id
    left join perfis responsavel on responsavel.usuario_id = ex.responsavel_id
    left join solicitacoes_publicas sp on sp.solicitacao_id = s.id and sp.origem = origem_sessao
    where ex.origem = origem_sessao
      and ip.origem = origem_sessao
      and vp.origem = origem_sessao
      and p.origem = origem_sessao
      and s.origem = origem_sessao
      and emp.origem = origem_sessao
      and (perfil in ('validador', 'administrador') or ex.responsavel_id = usuario)
  ) dados;

  return resultado;
end;
$$;

-- A leitura direta segue a mesma regra das RPCs. O Cliente continua vendo
-- apenas o proprio trabalho e somente etapas explicitamente publicas.
create or replace function pode_ver_execucao_demonstrativa(
  execucao uuid,
  cliente_permitido boolean
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from execucoes_servico ex
    join itens_proposta ip on ip.id = ex.item_proposta_id
    join versoes_proposta vp on vp.id = ip.versao_proposta_id
    join propostas p on p.id = vp.proposta_id
    where ex.id = execucao
      and ex.origem = 'demonstracao'
      and ip.origem = ex.origem
      and vp.origem = ex.origem
      and p.origem = ex.origem
      and (
        (cliente_permitido and usuario_da_empresa(p.empresa_id))
        or (
          origem_ativa_atual() = ex.origem
          and (
            perfil_interno_atual() in ('validador', 'administrador')
            or (perfil_interno_atual() = 'tecnico' and ex.responsavel_id = auth.uid())
          )
        )
      )
  );
$$;

drop policy if exists "execucao interna ou cliente" on execucoes_servico;
create policy "execucao atribuida ou cliente"
on execucoes_servico for select to authenticated
using (pode_ver_execucao_demonstrativa(id, true));

drop policy if exists "etapas visiveis aos participantes" on etapas_execucao;
create policy "etapas visiveis aos participantes"
on etapas_execucao for select to authenticated
using (origem = 'demonstracao' and pode_ver_execucao_demonstrativa(execucao_id, visivel_cliente));

revoke all on function listar_responsaveis_demonstrativos() from public, anon;
revoke all on function atribuir_responsavel_execucao_demonstrativa(uuid, uuid) from public, anon;
revoke all on function pode_ver_execucao_demonstrativa(uuid, boolean) from public, anon;
grant execute on function listar_responsaveis_demonstrativos() to authenticated;
grant execute on function atribuir_responsavel_execucao_demonstrativa(uuid, uuid) to authenticated;
grant execute on function pode_ver_execucao_demonstrativa(uuid, boolean) to authenticated;
grant select on table execucoes_servico to authenticated;

comment on column execucoes_servico.responsavel_id is
  'Tecnico formalmente atribuido; somente ele opera a execucao, sob supervisao de Validador e Administrador.';
comment on function listar_execucoes_demonstrativas() is
  'Lista execucoes atribuidas ao Tecnico; Validador e Administrador supervisionam toda a origem demonstracao.';
comment on function atribuir_responsavel_execucao_demonstrativa(uuid, uuid) is
  'Administrador atribui ou reatribui Tecnico demonstrativo, com trilha de auditoria.';
