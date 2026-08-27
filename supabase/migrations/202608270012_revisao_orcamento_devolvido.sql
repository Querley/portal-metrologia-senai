-- O autor corrige rascunho ou proposta devolvida sem receber o custo-hora protegido.
-- O servidor reaplica o custo vigente, recalcula os totais e audita a revisão.

create or replace function obter_orcamento_demonstrativo_para_edicao(versao uuid)
returns table (
  servico_id uuid,
  equipamento_id uuid,
  descricao text,
  quantidade numeric,
  horas numeric,
  custos_extras numeric,
  percentual_lucro numeric
)
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
  select p.perfil_interno, p.origem_ativa
    into perfil, origem_sessao
  from perfis p
  where p.usuario_id = usuario;

  if perfil is null or perfil not in ('tecnico', 'validador', 'administrador') then
    raise exception 'Perfil sem autorização para editar orçamento.' using errcode = '42501';
  end if;

  if origem_sessao is distinct from 'demonstracao'::origem_dado then
    raise exception 'Esta função aceita somente a origem demonstracao.' using errcode = '23514';
  end if;

  return query
  select
    i.servico_catalogo_id,
    u.equipamento_id,
    i.descricao,
    i.quantidade,
    u.horas,
    i.custos_extras,
    i.percentual_lucro
  from versoes_proposta v
  join propostas p on p.id = v.proposta_id
  join itens_proposta i on i.versao_proposta_id = v.id
  join usos_equipamento_proposta u on u.item_proposta_id = i.id
  where v.id = versao
    and v.origem = origem_sessao
    and p.origem = origem_sessao
    and p.criado_por = usuario
    and v.estado in ('rascunho', 'devolvida');

  if not found then
    raise exception 'Orçamento editável não encontrado para o autor.' using errcode = '23503';
  end if;
end;
$$;

create or replace function revisar_orcamento_demonstrativo(
  versao uuid,
  servico uuid,
  equipamento uuid,
  descricao text,
  quantidade numeric,
  horas numeric,
  custos_extras numeric,
  percentual_lucro numeric
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
  criador uuid;
  origem_orcamento origem_dado;
  item_id uuid;
  custo_hora_vigente numeric(18,6);
  custo_calculado numeric(18,6);
  preco_calculado numeric(18,6);
begin
  select p.perfil_interno, p.origem_ativa
    into perfil, origem_sessao
  from perfis p
  where p.usuario_id = usuario;

  if perfil is null or perfil not in ('tecnico', 'validador', 'administrador') then
    raise exception 'Perfil sem autorização para editar orçamento.' using errcode = '42501';
  end if;

  if origem_sessao is distinct from 'demonstracao'::origem_dado then
    raise exception 'Esta função aceita somente a origem demonstracao.' using errcode = '23514';
  end if;

  select v.estado, p.criado_por, v.origem
    into estado_atual, criador, origem_orcamento
  from versoes_proposta v
  join propostas p on p.id = v.proposta_id
  where v.id = versao
  for update of v;

  if not found or origem_orcamento is distinct from origem_sessao then
    raise exception 'Orçamento não encontrado na origem ativa.' using errcode = '23503';
  end if;

  if criador is distinct from usuario then
    raise exception 'Somente o autor pode editar este orçamento.' using errcode = '42501';
  end if;

  if estado_atual not in ('rascunho'::estado_proposta, 'devolvida'::estado_proposta) then
    raise exception 'Somente rascunho ou orçamento devolvido pode ser editado.' using errcode = '23514';
  end if;

  if nullif(trim(descricao), '') is null or char_length(trim(descricao)) not between 3 and 500 then
    raise exception 'Descrição deve ter entre 3 e 500 caracteres.' using errcode = '23514';
  end if;

  if quantidade is null or quantidade <= 0
     or horas is null or horas < 0
     or custos_extras is null or custos_extras < 0
     or percentual_lucro is null or percentual_lucro <= -100
     or quantidade > 999999999999.999999
     or horas > 999999999999.999999
     or custos_extras > 999999999999.999999
     or percentual_lucro > 999.999999 then
    raise exception 'Valores numéricos do orçamento são inválidos.' using errcode = '23514';
  end if;

  if not exists (select 1 from servicos_catalogo s where s.id = servico and s.ativo) then
    raise exception 'Serviço ativo não encontrado.' using errcode = '23503';
  end if;

  if not exists (select 1 from equipamentos e where e.id = equipamento and e.ativo) then
    raise exception 'Equipamento ativo não encontrado.' using errcode = '23503';
  end if;

  select c.custo_hora
    into custo_hora_vigente
  from custos_equipamento c
  where c.equipamento_id = equipamento
    and c.origem = origem_sessao
    and c.vigente_desde <= current_date
    and (c.vigente_ate is null or c.vigente_ate >= current_date)
  order by c.vigente_desde desc
  limit 1;

  if custo_hora_vigente is null then
    raise exception 'Equipamento sem custo vigente na origem ativa.' using errcode = '23514';
  end if;

  custo_calculado := round(custo_hora_vigente * horas + custos_extras, 6);
  preco_calculado := round(custo_calculado * (1 + percentual_lucro / 100), 6);

  if custo_calculado > 999999999999.999999 or preco_calculado < 0 or preco_calculado > 999999999999.999999 then
    raise exception 'Total calculado fora do limite permitido.' using errcode = '22003';
  end if;

  select i.id
    into item_id
  from itens_proposta i
  where i.versao_proposta_id = versao
    and i.origem = origem_sessao;

  if item_id is null then
    raise exception 'Item demonstrativo não encontrado.' using errcode = '23503';
  end if;

  update itens_proposta
  set servico_catalogo_id = revisar_orcamento_demonstrativo.servico,
      descricao = trim(revisar_orcamento_demonstrativo.descricao),
      quantidade = revisar_orcamento_demonstrativo.quantidade,
      custos_extras = revisar_orcamento_demonstrativo.custos_extras,
      percentual_lucro = revisar_orcamento_demonstrativo.percentual_lucro,
      custo_congelado = custo_calculado,
      preco_antes_ajuste = preco_calculado,
      ajuste_rateado = 0,
      preco_final = preco_calculado
  where id = item_id;

  update usos_equipamento_proposta
  set equipamento_id = revisar_orcamento_demonstrativo.equipamento,
      horas = revisar_orcamento_demonstrativo.horas,
      custo_hora_congelado = custo_hora_vigente
  where item_proposta_id = item_id;

  update versoes_proposta
  set total_brl = preco_calculado,
      total_moeda = preco_calculado,
      pdf_caminho = null,
      hash_conteudo = null,
      publicada_em = null
  where id = versao;

  insert into auditoria (origem, usuario_id, acao, entidade, entidade_id, dados)
  values (
    origem_sessao,
    usuario,
    'revisar_orcamento_demonstrativo',
    'versoes_proposta',
    versao,
    jsonb_build_object(
      'estado', estado_atual,
      'equipamento_id', equipamento,
      'servico_id', servico,
      'quantidade', quantidade,
      'horas', horas
    )
  );
end;
$$;

revoke all on function obter_orcamento_demonstrativo_para_edicao(uuid) from public, anon;
revoke all on function revisar_orcamento_demonstrativo(uuid, uuid, uuid, text, numeric, numeric, numeric, numeric) from public, anon;

grant execute on function obter_orcamento_demonstrativo_para_edicao(uuid) to authenticated;
grant execute on function revisar_orcamento_demonstrativo(uuid, uuid, uuid, text, numeric, numeric, numeric, numeric) to authenticated;

comment on function obter_orcamento_demonstrativo_para_edicao(uuid) is
  'Retorna ao autor os campos editáveis, sem expor custo-hora protegido.';
comment on function revisar_orcamento_demonstrativo(uuid, uuid, uuid, text, numeric, numeric, numeric, numeric) is
  'Recalcula e salva a revisão do próprio autor em rascunho ou devolvida, com auditoria.';
