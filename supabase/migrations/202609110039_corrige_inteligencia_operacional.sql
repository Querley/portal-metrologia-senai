-- Corrige a agregacao dos assuntos formalizados sem alterar migrations aplicadas.

create or replace function public.listar_inteligencia_operacional_demonstrativa()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare resultado jsonb;
begin
  if perfil_interno_atual() not in ('tecnico','validador','administrador') or origem_ativa_atual() <> 'demonstracao' then
    raise exception 'Perfil sem acesso ao conhecimento operacional.' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'servicos', coalesce((select jsonb_agg(jsonb_build_object('slug', q.slug, 'quantidade', q.quantidade, 'horas_medias', q.horas_medias, 'retrabalhos', q.retrabalhos) order by q.quantidade desc) from (
      select sc.slug, count(*) quantidade, round(avg(hr.total),2) horas_medias, count(*) filter (where ex.retrabalho) retrabalhos
      from execucoes_servico ex join itens_proposta ip on ip.id=ex.item_proposta_id join servicos_catalogo sc on sc.id=ip.servico_catalogo_id
      left join lateral (select sum(h.horas) total from horas_reais_equipamento h where h.execucao_id=ex.id) hr on true
      where ex.origem='demonstracao' group by sc.slug
    ) q), '[]'::jsonb),
    'materiais', coalesce((select jsonb_agg(jsonb_build_object('material', m.material, 'quantidade', m.quantidade) order by m.quantidade desc) from (
      select coalesce(nullif(trim(s.respostas->>'material'),''),'Nao informado') material, count(*) quantidade
      from solicitacoes s where s.origem='demonstracao' group by 1
    ) m), '[]'::jsonb),
    'assuntos', coalesce((select jsonb_agg(jsonb_build_object('assunto', a.assunto, 'quantidade', a.quantidade) order by a.quantidade desc) from (
      select assunto, count(*) quantidade from licoes l join revisoes_licao r on r.licao_id=l.id
      cross join lateral unnest(r.assuntos) assunto
      where l.origem='demonstracao' and l.estado='formalizada' and r.numero=l.revisao_atual group by assunto
    ) a), '[]'::jsonb)
  ) into resultado;
  return resultado;
end;
$$;

revoke all on function public.listar_inteligencia_operacional_demonstrativa() from public, anon;
grant execute on function public.listar_inteligencia_operacional_demonstrativa() to authenticated;
