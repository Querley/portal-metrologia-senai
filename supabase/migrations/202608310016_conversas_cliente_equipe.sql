-- Conversas persistentes entre a equipe interna e Clientes da homologação.
-- Apenas solicitações sintéticas ativadas são expostas por estas funções.

create or replace function listar_conversas_demonstrativas()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  perfil perfil_interno;
  origem_sessao origem_dado;
  resultado jsonb;
begin
  select p.perfil_interno, p.origem_ativa
    into perfil, origem_sessao
  from perfis p
  where p.usuario_id = auth.uid();

  if perfil is null or perfil not in ('tecnico', 'validador', 'administrador') then
    raise exception 'Perfil sem acesso às conversas.' using errcode = '42501';
  end if;
  if origem_sessao is distinct from 'demonstracao'::origem_dado then
    raise exception 'Esta função aceita somente a origem demonstracao.' using errcode = '23514';
  end if;

  select coalesce(jsonb_agg(conversa order by ordenacao desc), '[]'::jsonb)
    into resultado
  from (
    select
      greatest(sp.criado_em, coalesce(max(m.criada_em), sp.criado_em)) as ordenacao,
      jsonb_build_object(
        'solicitacao_id', s.id,
        'codigo', sp.codigo,
        'empresa', sp.empresa_nome,
        'contato_nome', sp.nome,
        'contato_email', sp.email_normalizado,
        'necessidade', sp.necessidade,
        'criada_em', s.criado_em,
        'mensagens', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'id', mensagem.id,
            'conteudo', mensagem.conteudo,
            'criada_em', mensagem.criada_em,
            'autor_nome', coalesce(autor.nome, sp.nome, 'Participante'),
            'autor_tipo', case when autor.perfil_interno is null then 'cliente' else 'equipe' end
          ) order by mensagem.criada_em), '[]'::jsonb)
          from mensagens mensagem
          left join perfis autor on autor.usuario_id = mensagem.autor_id
          where mensagem.solicitacao_id = s.id
            and mensagem.origem = 'demonstracao'
        )
      ) as conversa
    from solicitacoes_publicas sp
    join solicitacoes s on s.id = sp.solicitacao_id
    left join mensagens m on m.solicitacao_id = s.id and m.origem = 'demonstracao'
    where sp.origem = 'demonstracao'
      and sp.estado = 'ativada'
      and s.origem = 'demonstracao'
    group by sp.id, s.id
  ) conversas;

  return resultado;
end;
$$;

create or replace function enviar_mensagem_interna_demonstrativa(solicitacao uuid, conteudo text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  perfil perfil_interno;
  origem_sessao origem_dado;
  mensagem_id uuid;
  conteudo_normalizado text := trim(coalesce(conteudo, ''));
begin
  select p.perfil_interno, p.origem_ativa
    into perfil, origem_sessao
  from perfis p
  where p.usuario_id = auth.uid();

  if perfil is null or perfil not in ('tecnico', 'validador', 'administrador') then
    raise exception 'Perfil sem autorização para responder ao Cliente.' using errcode = '42501';
  end if;
  if origem_sessao is distinct from 'demonstracao'::origem_dado then
    raise exception 'Esta função aceita somente a origem demonstracao.' using errcode = '23514';
  end if;
  if char_length(conteudo_normalizado) not between 1 and 5000 then
    raise exception 'Mensagem deve ter entre 1 e 5000 caracteres.' using errcode = '23514';
  end if;
  if not exists (
    select 1
    from solicitacoes_publicas sp
    join solicitacoes s on s.id = sp.solicitacao_id
    where s.id = solicitacao
      and s.origem = 'demonstracao'
      and sp.origem = 'demonstracao'
      and sp.estado = 'ativada'
  ) then
    raise exception 'Solicitação ativada não encontrada na homologação.' using errcode = '23503';
  end if;

  insert into mensagens (origem, visibilidade, solicitacao_id, autor_id, conteudo)
  values ('demonstracao', 'restrito', solicitacao, auth.uid(), conteudo_normalizado)
  returning id into mensagem_id;

  return mensagem_id;
end;
$$;

revoke all on function listar_conversas_demonstrativas() from public, anon;
revoke all on function enviar_mensagem_interna_demonstrativa(uuid, text) from public, anon;

grant execute on function listar_conversas_demonstrativas() to authenticated;
grant execute on function enviar_mensagem_interna_demonstrativa(uuid, text) to authenticated;

comment on function listar_conversas_demonstrativas() is
  'Lista conversas de solicitações sintéticas ativadas somente para Técnico, Validador e Administrador.';
comment on function enviar_mensagem_interna_demonstrativa(uuid, text) is
  'Registra resposta interna restrita em solicitação Cliente ativada da origem demonstracao.';
