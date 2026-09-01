-- Corrige o acesso do Tecnico as execucoes demonstrativas.
-- Enquanto nao existe atribuicao formal de responsavel, todos os Tecnicos,
-- Validadores e Administradores podem visualizar e operar os trabalhos demo.
-- A autoria original da proposta e a auditoria de cada acao sao preservadas.

do $migration$
declare
  definicao text;
  atualizada text;
  restricao text;
begin
  select pg_get_functiondef('public.listar_execucoes_demonstrativas()'::regprocedure)
    into definicao;

  restricao := '      and (perfil in (''validador'', ''administrador'') or p.criado_por = usuario)';
  atualizada := replace(definicao, restricao, '');

  if atualizada is not distinct from definicao then
    raise exception 'Restricao esperada nao encontrada em listar_execucoes_demonstrativas().';
  end if;

  execute atualizada;

  select pg_get_functiondef(
    'public.atualizar_etapa_execucao_demonstrativa(uuid,text,integer)'::regprocedure
  ) into definicao;

  restricao := '  if perfil = ''tecnico'' and autor_proposta is distinct from usuario then
    raise exception ''Tecnico pode atualizar somente execucoes dos proprios trabalhos.'' using errcode = ''42501'';
  end if;
';
  atualizada := replace(definicao, restricao, '');

  if atualizada is not distinct from definicao then
    raise exception 'Restricao esperada nao encontrada em atualizar_etapa_execucao_demonstrativa().';
  end if;

  execute atualizada;

  select pg_get_functiondef(
    'public.registrar_fechamento_demonstrativo(uuid,jsonb,numeric,boolean,boolean,text,text,text)'::regprocedure
  ) into definicao;

  restricao := '  if perfil = ''tecnico'' and autor_proposta is distinct from usuario then
    raise exception ''Tecnico pode fechar somente os proprios trabalhos.'' using errcode = ''42501'';
  end if;
';
  atualizada := replace(definicao, restricao, '');

  if atualizada is not distinct from definicao then
    raise exception 'Restricao esperada nao encontrada em registrar_fechamento_demonstrativo().';
  end if;

  execute atualizada;
end;
$migration$;

comment on function listar_execucoes_demonstrativas() is
  'Lista todas as execucoes da origem demonstracao para Tecnico, Validador e Administrador; atribuicao individual sera uma evolucao posterior.';
comment on function atualizar_etapa_execucao_demonstrativa(uuid, text, integer) is
  'Permite atualizar etapas demonstrativas aos tres perfis operacionais e registra o autor real na auditoria.';
comment on function registrar_fechamento_demonstrativo(uuid, jsonb, numeric, boolean, boolean, text, text, text) is
  'Permite registrar fechamento demonstrativo aos tres perfis operacionais; decisao final permanece exclusiva de Validador ou Administrador.';
