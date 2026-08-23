-- Consolida o portfólio oficial informado pelo Centro em 23 de agosto de 2026.
update servicos_catalogo
set slug = 'metrologia-avancada-inspecao-dimensional',
    perguntas = '[{"chave":"material","rotulo":"Material da peça","obrigatoria":true},{"chave":"quantidade","rotulo":"Quantidade","obrigatoria":true}]'::jsonb,
    ativo = true
where id = '10000000-0000-0000-0000-000000000001';

update servicos_catalogo
set perguntas = '[{"chave":"dimensoes","rotulo":"Dimensões máximas","obrigatoria":true}]'::jsonb,
    ativo = true
where id = '10000000-0000-0000-0000-000000000002';

update servicos_catalogo
set slug = 'escaneamento-3d-digitalizacao-pecas',
    perguntas = '[{"chave":"finalidade","rotulo":"Finalidade da digitalização","obrigatoria":true}]'::jsonb,
    ativo = true
where id = '10000000-0000-0000-0000-000000000003';

insert into servicos_catalogo (id, slug, perguntas, ativo) values
  ('10000000-0000-0000-0000-000000000004','engenharia-reversa-reconstrucao-cad','[{"chave":"formato_saida","rotulo":"Formato de saída esperado","obrigatoria":true}]',true),
  ('10000000-0000-0000-0000-000000000005','nacionalizacao-desenvolvimento-componentes','[{"chave":"objetivo","rotulo":"Objetivo do desenvolvimento","obrigatoria":true}]',true),
  ('10000000-0000-0000-0000-000000000006','comparacao-cad-peca-fisica','[{"chave":"cad_disponivel","rotulo":"Modelo CAD disponível","obrigatoria":true}]',true),
  ('10000000-0000-0000-0000-000000000007','mapa-desgaste','[{"chave":"referencia","rotulo":"Referência para comparação","obrigatoria":true}]',true),
  ('10000000-0000-0000-0000-000000000008','analise-falhas-quebras-anomalias','[{"chave":"ocorrencia","rotulo":"Descrição da ocorrência","obrigatoria":true}]',true),
  ('10000000-0000-0000-0000-000000000009','arvore-equipamentos-pecas-criticas','[{"chave":"escopo_ativos","rotulo":"Escopo de ativos","obrigatoria":true}]',true),
  ('10000000-0000-0000-0000-000000000010','almoxarifado-virtual-biblioteca-digital','[{"chave":"volume_acervo","rotulo":"Volume estimado do acervo","obrigatoria":true}]',true)
on conflict (slug) do update
set perguntas = excluded.perguntas,
    ativo = true;
