-- Seções editáveis da página inicial e proteção do conteúdo técnico imutável.

alter table public.conteudos drop constraint if exists conteudos_escopo_editorial_check;
alter table public.conteudos add constraint conteudos_escopo_editorial_check
  check (chave !~ '^equipamentos[.]');

do $$
declare
  item record;
  conteudo_encontrado_id uuid;
  versao_id uuid;
begin
  for item in
    select * from (values
      ('inicio.hero','pt-BR','Precisão para medir. Inteligência para evoluir.','Serviços de metrologia avançada com propostas transparentes, acompanhamento digital e conhecimento acumulado a cada projeto.','/videos/centro-metrologia-apresentacao.mp4','video','Apresentação em vídeo do Centro de Excelência em Metrologia SENAI ZEISS'),
      ('inicio.hero','en','Precision to measure. Intelligence to improve.','Advanced metrology services with transparent proposals, digital tracking and knowledge accumulated with every project.','/videos/centro-metrologia-apresentacao.mp4','video','Video presentation of the SENAI ZEISS Metrology Center of Excellence'),
      ('inicio.hero','de','Präzision zum Messen. Intelligenz zur Weiterentwicklung.','Fortschrittliche Messtechnik mit transparenten Angeboten, digitaler Auftragsverfolgung und Wissen aus jedem Projekt.','/videos/centro-metrologia-apresentacao.mp4','video','Videopräsentation des SENAI ZEISS Kompetenzzentrums für Messtechnik'),
      ('inicio.diferencial','pt-BR','Por que escolher o laboratório ZEISS?','Integramos uma rede extremamente rara de centros de excelência, com estrutura avançada e atendimento próximo à indústria latino-americana.',null,null,null),
      ('inicio.diferencial','en','Why choose the ZEISS laboratory?','We are part of an exceptionally rare network of centers of excellence, with advanced infrastructure close to Latin American industry.',null,null,null),
      ('inicio.diferencial','de','Warum das ZEISS-Labor wählen?','Wir sind Teil eines außergewöhnlich seltenen Netzwerks von Kompetenzzentren mit moderner Infrastruktur für die lateinamerikanische Industrie.',null,null,null),
      ('inicio.estrutura','pt-BR','Um centro de excelência preparado para medir o que importa.','O laboratório reúne medição por coordenadas, inspeção por raios X e digitalização óptica em um ambiente dedicado à precisão.','/imagens/laboratorio-prismo.jpeg','imagem','ZEISS PRISMO instalada no Centro'),
      ('inicio.estrutura','en','A center of excellence ready to measure what matters.','The laboratory brings together coordinate measurement, X-ray inspection and optical scanning in an environment dedicated to precision.','/imagens/laboratorio-prismo.jpeg','imagem','ZEISS PRISMO installed at the Center'),
      ('inicio.estrutura','de','Ein Kompetenzzentrum, das misst, was zählt.','Das Labor vereint Koordinatenmesstechnik, Röntgenprüfung und optisches Scannen in einer auf Präzision ausgerichteten Umgebung.','/imagens/laboratorio-prismo.jpeg','imagem','ZEISS PRISMO im Zentrum'),
      ('inicio.chamada','pt-BR','Tem um desafio de medição?','Conte o que você precisa. Nossa equipe analisa os dados e prepara uma proposta sob medida.',null,null,null),
      ('inicio.chamada','en','Do you have a measurement challenge?','Tell us what you need. Our team analyzes the data and prepares a tailored proposal.',null,null,null),
      ('inicio.chamada','de','Haben Sie eine Messaufgabe?','Beschreiben Sie Ihren Bedarf. Unser Team analysiert die Daten und erstellt ein passendes Angebot.',null,null,null)
    ) as sementes(chave,idioma,titulo,texto,midia_url,midia_tipo,midia_alt)
  loop
    insert into public.conteudos(chave,tipo,estado)
    values(item.chave,'secao','publicado')
    on conflict(chave) do update set tipo='secao',estado='publicado'
    returning id into conteudo_encontrado_id;

    insert into public.versoes_conteudo(conteudo_id,numero,idioma,titulo,corpo,estado_revisao)
    select conteudo_encontrado_id,coalesce(max(numero),0)+1,item.idioma,item.titulo,
      jsonb_strip_nulls(jsonb_build_object('texto',item.texto,'midia_url',item.midia_url,'midia_tipo',item.midia_tipo,'midia_alt',item.midia_alt)),
      'aprovada'
    from public.versoes_conteudo where versoes_conteudo.conteudo_id=conteudo_encontrado_id and versoes_conteudo.idioma=item.idioma
    returning id into versao_id;

    insert into public.publicacoes_conteudo(conteudo_id,idioma,versao_conteudo_id,publicada_em)
    values(conteudo_encontrado_id,item.idioma,versao_id,now())
    on conflict(conteudo_id,idioma) do update set versao_conteudo_id=excluded.versao_conteudo_id,publicada_em=now();
    if item.idioma='pt-BR' then
      update public.conteudos set versao_publicada_id=versao_id where id=conteudo_encontrado_id;
    end if;
  end loop;
end;
$$;

comment on constraint conteudos_escopo_editorial_check on public.conteudos is
  'Mantém páginas técnicas de equipamentos fora do CMS editorial da página inicial.';
