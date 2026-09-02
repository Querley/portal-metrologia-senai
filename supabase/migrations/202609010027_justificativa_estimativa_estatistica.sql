-- Persiste a justificativa de estimativas fora da faixa estatistica e impede
-- o envio para validacao quando a base elegivel ja possui ao menos cinco casos.

alter table versoes_proposta
  add column if not exists justificativa_estimativa text;

alter table versoes_proposta
  drop constraint if exists versoes_justificativa_estimativa_valida;

alter table versoes_proposta
  add constraint versoes_justificativa_estimativa_valida
  check (
    justificativa_estimativa is null
    or char_length(trim(justificativa_estimativa)) between 5 and 1000
  ) not valid;

alter table versoes_proposta validate constraint versoes_justificativa_estimativa_valida;

create or replace function estimativa_fora_faixa_demonstrativa(
  servico uuid,
  quantidade_nova numeric,
  horas_novas numeric
)
returns boolean
language sql
stable
set search_path = public
as $$
  with casos as (
    select round(
      coalesce((
        select sum(hr.horas)
        from horas_reais_equipamento hr
        where hr.execucao_id = ex.id
          and hr.origem = 'demonstracao'
      ), 0) / ip.quantidade * quantidade_nova,
      6
    ) as horas_normalizadas
    from execucoes_servico ex
    join itens_proposta ip
      on ip.id = ex.item_proposta_id
     and ip.origem = 'demonstracao'
    join licoes l
      on l.execucao_id = ex.id
     and l.origem = 'demonstracao'
     and l.estado = 'formalizada'
    join revisoes_licao rl
      on rl.licao_id = l.id
     and rl.numero = l.revisao_atual
     and rl.validada_em is not null
    where ex.origem = 'demonstracao'
      and ex.estado = 'concluido'
      and ip.servico_catalogo_id = servico
      and ip.quantidade > 0
  ), estatisticas as (
    select
      count(*) as total,
      percentile_cont(0.25) within group (order by horas_normalizadas) as q1,
      percentile_cont(0.75) within group (order by horas_normalizadas) as q3
    from casos
  )
  select coalesce(total >= 5 and (horas_novas < q1 or horas_novas > q3), false)
  from estatisticas;
$$;

create or replace function validar_justificativa_estimativa_para_validacao()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.origem = 'demonstracao'
     and new.estado = 'em_validacao'
     and old.estado is distinct from new.estado
     and exists (
       select 1
       from itens_proposta ip
       where ip.versao_proposta_id = new.id
         and ip.origem = new.origem
         and estimativa_fora_faixa_demonstrativa(
           ip.servico_catalogo_id,
           ip.quantidade,
           coalesce((
             select sum(ue.horas)
             from usos_equipamento_proposta ue
             where ue.item_proposta_id = ip.id
           ), 0)
         )
     )
     and char_length(trim(coalesce(new.justificativa_estimativa, ''))) not between 5 and 1000 then
    raise exception 'Estimativa fora da faixa Q1-Q3 exige justificativa entre 5 e 1000 caracteres.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists versoes_exigem_justificativa_estimativa on versoes_proposta;
create trigger versoes_exigem_justificativa_estimativa
before update of estado on versoes_proposta
for each row execute function validar_justificativa_estimativa_para_validacao();

create or replace function registrar_justificativa_estimativa_demonstrativa(
  versao uuid,
  justificativa text
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
  estado_atual estado_proposta;
  autor_proposta uuid;
  justificativa_normalizada text := nullif(trim(coalesce(justificativa, '')), '');
begin
  select pf.perfil_interno, pf.origem_ativa
    into perfil, origem_sessao
  from perfis pf
  where pf.usuario_id = usuario;

  if perfil is null or perfil not in ('tecnico', 'validador', 'administrador') then
    raise exception 'Perfil sem permissao para justificar estimativas.' using errcode = '42501';
  end if;
  if origem_sessao is distinct from 'demonstracao'::origem_dado then
    raise exception 'Esta funcao aceita somente a origem demonstracao.' using errcode = '23514';
  end if;
  if justificativa_normalizada is not null
     and char_length(justificativa_normalizada) not between 5 and 1000 then
    raise exception 'A justificativa deve ter entre 5 e 1000 caracteres.' using errcode = '23514';
  end if;

  select v.estado, p.criado_por
    into estado_atual, autor_proposta
  from versoes_proposta v
  join propostas p on p.id = v.proposta_id
  where v.id = versao
    and v.origem = origem_sessao
    and p.origem = origem_sessao
  for update of v;

  if not found then
    raise exception 'Versao nao encontrada na origem ativa.' using errcode = '23503';
  end if;
  if autor_proposta is distinct from usuario then
    raise exception 'Somente o autor pode justificar esta estimativa.' using errcode = '42501';
  end if;
  if estado_atual not in ('rascunho', 'devolvida') then
    raise exception 'Somente rascunho ou proposta devolvida pode receber justificativa.' using errcode = '23514';
  end if;

  update versoes_proposta
  set justificativa_estimativa = justificativa_normalizada
  where id = versao;

  insert into auditoria (origem, usuario_id, acao, entidade, entidade_id, dados)
  values (
    origem_sessao,
    usuario,
    'registrar_justificativa_estimativa_demonstrativa',
    'versoes_proposta',
    versao,
    jsonb_build_object('justificativa_informada', justificativa_normalizada is not null)
  );
end;
$$;

create or replace function listar_justificativas_estimativa_demonstrativas()
returns table (versao_id uuid, justificativa_estimativa text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  usuario uuid := auth.uid();
  perfil perfil_interno;
  origem_sessao origem_dado;
begin
  select pf.perfil_interno, pf.origem_ativa
    into perfil, origem_sessao
  from perfis pf
  where pf.usuario_id = usuario;

  if perfil is null or perfil not in ('tecnico', 'validador', 'administrador') then
    raise exception 'Perfil sem acesso as justificativas.' using errcode = '42501';
  end if;
  if origem_sessao is distinct from 'demonstracao'::origem_dado then
    raise exception 'Esta funcao aceita somente a origem demonstracao.' using errcode = '23514';
  end if;

  return query
  select v.id, v.justificativa_estimativa
  from versoes_proposta v
  join propostas p on p.id = v.proposta_id
  where v.origem = origem_sessao
    and p.origem = origem_sessao
    and (perfil in ('validador', 'administrador') or p.criado_por = usuario)
  order by v.criada_em desc;
end;
$$;

revoke all on function estimativa_fora_faixa_demonstrativa(uuid, numeric, numeric) from public, anon, authenticated;
revoke all on function registrar_justificativa_estimativa_demonstrativa(uuid, text) from public, anon;
revoke all on function listar_justificativas_estimativa_demonstrativas() from public, anon;

grant execute on function registrar_justificativa_estimativa_demonstrativa(uuid, text) to authenticated;
grant execute on function listar_justificativas_estimativa_demonstrativas() to authenticated;

comment on column versoes_proposta.justificativa_estimativa is
  'Motivo auditavel para estimativa fora de Q1-Q3; obrigatorio no envio quando existem cinco ou mais casos elegiveis.';
comment on function registrar_justificativa_estimativa_demonstrativa(uuid, text) is
  'Persiste ou limpa a justificativa do autor enquanto a versao demonstrativa ainda e editavel.';
