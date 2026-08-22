insert into servicos_catalogo (id, slug, perguntas) values
  ('10000000-0000-0000-0000-000000000001','medicao-tridimensional','[{"chave":"material","rotulo":"Material da peça","obrigatoria":true},{"chave":"quantidade","rotulo":"Quantidade","obrigatoria":true}]'),
  ('10000000-0000-0000-0000-000000000002','tomografia-industrial','[{"chave":"dimensoes","rotulo":"Dimensões máximas","obrigatoria":true}]'),
  ('10000000-0000-0000-0000-000000000003','digitalizacao-optica','[{"chave":"finalidade","rotulo":"Finalidade da digitalização","obrigatoria":true}]')
on conflict (slug) do nothing;

insert into equipamentos (id, codigo, nome) values
  ('20000000-0000-0000-0000-000000000001','duramax','CMM DuraMax'),
  ('20000000-0000-0000-0000-000000000002','o-inspect','CMM O-INSPECT'),
  ('20000000-0000-0000-0000-000000000003','prismo','CMM PRISMO'),
  ('20000000-0000-0000-0000-000000000004','contura','CMM CONTURA'),
  ('20000000-0000-0000-0000-000000000005','max-80','BOSELLO MAX 80'),
  ('20000000-0000-0000-0000-000000000006','atos-q','ATOS Q 8M'),
  ('20000000-0000-0000-0000-000000000007','t-scan-hawk-2','T-SCAN hawk 2')
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
