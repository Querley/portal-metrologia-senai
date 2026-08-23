insert into servicos_catalogo (id, slug, perguntas) values
  ('10000000-0000-0000-0000-000000000001','metrologia-avancada-inspecao-dimensional','[{"chave":"material","rotulo":"Material da peça","obrigatoria":true},{"chave":"quantidade","rotulo":"Quantidade","obrigatoria":true}]'),
  ('10000000-0000-0000-0000-000000000002','tomografia-industrial','[{"chave":"dimensoes","rotulo":"Dimensões máximas","obrigatoria":true}]'),
  ('10000000-0000-0000-0000-000000000003','escaneamento-3d-digitalizacao-pecas','[{"chave":"finalidade","rotulo":"Finalidade da digitalização","obrigatoria":true}]'),
  ('10000000-0000-0000-0000-000000000004','engenharia-reversa-reconstrucao-cad','[{"chave":"formato_saida","rotulo":"Formato de saída esperado","obrigatoria":true}]'),
  ('10000000-0000-0000-0000-000000000005','nacionalizacao-desenvolvimento-componentes','[{"chave":"objetivo","rotulo":"Objetivo do desenvolvimento","obrigatoria":true}]'),
  ('10000000-0000-0000-0000-000000000006','comparacao-cad-peca-fisica','[{"chave":"cad_disponivel","rotulo":"Modelo CAD disponível","obrigatoria":true}]'),
  ('10000000-0000-0000-0000-000000000007','mapa-desgaste','[{"chave":"referencia","rotulo":"Referência para comparação","obrigatoria":true}]'),
  ('10000000-0000-0000-0000-000000000008','analise-falhas-quebras-anomalias','[{"chave":"ocorrencia","rotulo":"Descrição da ocorrência","obrigatoria":true}]'),
  ('10000000-0000-0000-0000-000000000009','arvore-equipamentos-pecas-criticas','[{"chave":"escopo_ativos","rotulo":"Escopo de ativos","obrigatoria":true}]'),
  ('10000000-0000-0000-0000-000000000010','almoxarifado-virtual-biblioteca-digital','[{"chave":"volume_acervo","rotulo":"Volume estimado do acervo","obrigatoria":true}]')
on conflict (slug) do nothing;

insert into equipamentos (id, codigo, nome, ativo) values
  ('20000000-0000-0000-0000-000000000001','duramax','CMM DuraMax',true),
  ('20000000-0000-0000-0000-000000000002','o-inspect','CMM O-INSPECT',true),
  ('20000000-0000-0000-0000-000000000003','prismo','CMM PRISMO',true),
  ('20000000-0000-0000-0000-000000000004','contura','CMM CONTURA',false),
  ('20000000-0000-0000-0000-000000000005','max-80','BOSELLO MAX 80',true),
  ('20000000-0000-0000-0000-000000000006','atos-q','ATOS Q 8M',true),
  ('20000000-0000-0000-0000-000000000007','t-scan-hawk-2','T-SCAN hawk 2',true)
on conflict (codigo) do nothing;

insert into custos_equipamento (equipamento_id,custo_hora,vigente_desde,origem_fonte) values
  ('20000000-0000-0000-0000-000000000001',173.665147,'2026-08-22','Hora_custos_máquina.xls'),
  ('20000000-0000-0000-0000-000000000002',201.444063,'2026-08-22','Hora_custos_máquina.xls'),
  ('20000000-0000-0000-0000-000000000003',311.979689,'2026-08-22','Hora_custos_máquina.xls'),
  ('20000000-0000-0000-0000-000000000004',196.622505,'2026-08-22','Hora_custos_máquina.xls'),
  ('20000000-0000-0000-0000-000000000005',273.809147,'2026-08-22','Hora_custos_máquina.xls'),
  ('20000000-0000-0000-0000-000000000006',177.155759,'2026-08-22','Hora_custos_máquina.xls'),
  ('20000000-0000-0000-0000-000000000007',162.234162,'2026-08-22','Hora_custos_máquina.xls')
on conflict (equipamento_id,vigente_desde) do nothing;

insert into conteudos (id,chave,tipo,estado) values
  ('30000000-0000-0000-0000-000000000001','inicio','pagina','publicado'),
  ('30000000-0000-0000-0000-000000000002','privacidade','pagina','rascunho')
on conflict (chave) do nothing;
