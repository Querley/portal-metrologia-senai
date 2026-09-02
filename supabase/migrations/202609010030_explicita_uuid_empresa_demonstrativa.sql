-- Elimina a conversao implicita apontada pelo analisador estatico sem alterar
-- o identificador sintetico usado pelos rascunhos internos sem solicitacao.

do $migration$
declare
  definicao text;
  atualizada text;
begin
  select pg_get_functiondef(
    'public.criar_orcamento_demonstrativo(uuid,uuid,text,numeric,numeric,numeric,numeric)'::regprocedure
  ) into definicao;

  atualizada := replace(
    definicao,
    'empresa_demo constant uuid := ''40000000-0000-0000-0000-000000000001'';',
    'empresa_demo constant uuid := ''40000000-0000-0000-0000-000000000001''::uuid;'
  );

  if atualizada is not distinct from definicao then
    raise exception 'Constante esperada nao encontrada em criar_orcamento_demonstrativo.';
  end if;

  execute atualizada;
end;
$migration$;
