-- A verificacao estatica do PostgreSQL identificou ambiguidade entre o
-- parametro `versao` e colunas homonimas em uma instrucao da migration 022.
-- A diretiva torna explicita a precedencia do parametro sem mudar a API.

do $migration$
declare
  definicao text;
  atualizada text;
begin
  select pg_get_functiondef(
    'public.confirmar_inicio_trabalho_demonstrativo(uuid)'::regprocedure
  ) into definicao;

  atualizada := replace(
    definicao,
    'AS $function$',
    'AS $function$' || chr(10) || '#variable_conflict use_variable'
  );

  if atualizada is not distinct from definicao then
    raise exception 'Corpo esperado nao encontrado em confirmar_inicio_trabalho_demonstrativo(uuid).';
  end if;

  execute atualizada;
end;
$migration$;

comment on function confirmar_inicio_trabalho_demonstrativo(uuid) is
  'Cria ou inicia execucoes de pre-proposta aceita; usa precedencia explicita do parametro versao.';
