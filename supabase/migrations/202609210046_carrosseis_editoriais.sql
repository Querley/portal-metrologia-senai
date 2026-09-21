-- Carrosséis editoriais da página inicial, com estrutura validada no banco.

create or replace function public.validar_corpo_cms_editorial()
returns trigger
language plpgsql
set search_path = public as $$
declare
  chave_conteudo text;
  setor jsonb;
  item jsonb;
  midia jsonb;
begin
  select chave into chave_conteudo from conteudos where id = new.conteudo_id;

  if chave_conteudo = 'inicio.setores' then
    if jsonb_typeof(new.corpo->'setores') <> 'array' or jsonb_array_length(new.corpo->'setores') <> 4 then
      raise exception 'A seção de setores deve conter exatamente os quatro setores editoriais.' using errcode = '23514';
    end if;
    if (select count(distinct elemento->>'slug') from jsonb_array_elements(new.corpo->'setores') elemento
        where elemento->>'slug' in ('industria-geral','automotivo-mobilidade','aeronautico','ferramentaria-produto')) <> 4 then
      raise exception 'Os quatro setores editoriais devem ser únicos e reconhecidos.' using errcode = '23514';
    end if;
    for setor in select value from jsonb_array_elements(new.corpo->'setores') loop
      if jsonb_typeof(setor->'midias') <> 'array' or jsonb_array_length(setor->'midias') = 0 then
        raise exception 'Cada setor deve possuir ao menos uma mídia.' using errcode = '23514';
      end if;
      for midia in select value from jsonb_array_elements(setor->'midias') loop
        if midia->>'tipo' not in ('imagem','video')
          or char_length(trim(coalesce(midia->>'src',''))) = 0
          or char_length(trim(coalesce(midia->>'alt',''))) = 0
          or char_length(trim(coalesce(midia->>'legenda',''))) = 0 then
          raise exception 'Cada mídia de setor deve ter tipo, arquivo, texto alternativo e legenda.' using errcode = '23514';
        end if;
      end loop;
    end loop;
  elsif chave_conteudo = 'inicio.acontecimentos' then
    if jsonb_typeof(new.corpo->'itens') <> 'array' or jsonb_array_length(new.corpo->'itens') = 0 then
      raise exception 'A seção de novidades deve possuir ao menos um acontecimento.' using errcode = '23514';
    end if;
    for item in select value from jsonb_array_elements(new.corpo->'itens') loop
      if item ? 'midias' then
        if jsonb_typeof(item->'midias') <> 'array' then
          raise exception 'As mídias de cada acontecimento devem formar uma lista.' using errcode = '23514';
        end if;
        for midia in select value from jsonb_array_elements(item->'midias') loop
          if midia->>'tipo' not in ('imagem','video')
            or char_length(trim(coalesce(midia->>'src',''))) = 0
            or char_length(trim(coalesce(midia->>'alt',''))) = 0
            or char_length(trim(coalesce(midia->>'legenda',''))) = 0 then
            raise exception 'Cada mídia de novidade deve ter tipo, arquivo, texto alternativo e legenda.' using errcode = '23514';
          end if;
        end loop;
      end if;
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists validar_corpo_cms_editorial on public.versoes_conteudo;
create trigger validar_corpo_cms_editorial
before insert or update of corpo, conteudo_id on public.versoes_conteudo
for each row execute function public.validar_corpo_cms_editorial();

do $$
declare
  item record;
  conteudo_id_encontrado uuid;
  versao_id_encontrada uuid;
begin
  insert into conteudos(chave,tipo,estado)
  values('inicio.setores','setores','publicado')
  on conflict(chave) do update set tipo='setores', estado='publicado'
  returning id into conteudo_id_encontrado;

  for item in select * from (values
    ('pt-BR','Soluções organizadas por setor','Escolha o cenário mais próximo da sua empresa e navegue pelas mídias de cada contexto.',
      '[{"slug":"industria-geral","midias":[{"tipo":"video","src":"/videos/zeiss-duramax-operacao.mp4","alt":"Medição dimensional para a indústria em geral","legenda":"Metrologia dimensional aplicada à indústria em geral"}]},{"slug":"automotivo-mobilidade","midias":[{"tipo":"video","src":"/videos/zeiss-atos-q-operacao.mp4","alt":"Digitalização óptica de componente automotivo","legenda":"Digitalização e inspeção para o setor automotivo e de mobilidade"}]},{"slug":"aeronautico","midias":[{"tipo":"video","src":"/videos/zeiss-bosello-max-operacao.mp4","alt":"Inspeção interna não destrutiva de componente","legenda":"Inspeção de alta precisão para aplicações aeronáuticas"}]},{"slug":"ferramentaria-produto","midias":[{"tipo":"imagem","src":"/imagens/laboratorio-prismo-panoramica.jpeg","alt":"Laboratório de medição para ferramentaria e desenvolvimento de produto","legenda":"Medição e engenharia reversa para ferramentaria e produto"}]}]'::jsonb),
    ('en','Solutions organized by industry','Choose the context closest to your company and browse the media for each industry.',
      '[{"slug":"industria-geral","midias":[{"tipo":"video","src":"/videos/zeiss-duramax-operacao.mp4","alt":"Dimensional measurement for general industry","legenda":"Dimensional metrology applied to general industry"}]},{"slug":"automotivo-mobilidade","midias":[{"tipo":"video","src":"/videos/zeiss-atos-q-operacao.mp4","alt":"Optical scanning of an automotive component","legenda":"Scanning and inspection for automotive and mobility"}]},{"slug":"aeronautico","midias":[{"tipo":"video","src":"/videos/zeiss-bosello-max-operacao.mp4","alt":"Non-destructive internal inspection of a component","legenda":"High-precision inspection for aerospace applications"}]},{"slug":"ferramentaria-produto","midias":[{"tipo":"imagem","src":"/imagens/laboratorio-prismo-panoramica.jpeg","alt":"Measurement laboratory for tooling and product development","legenda":"Measurement and reverse engineering for tooling and products"}]}]'::jsonb),
    ('de','Lösungen nach Branchen','Wählen Sie den passenden Kontext für Ihr Unternehmen und sehen Sie die Medien der jeweiligen Branche an.',
      '[{"slug":"industria-geral","midias":[{"tipo":"video","src":"/videos/zeiss-duramax-operacao.mp4","alt":"Dimensionale Messung für die allgemeine Industrie","legenda":"Dimensionale Messtechnik für die allgemeine Industrie"}]},{"slug":"automotivo-mobilidade","midias":[{"tipo":"video","src":"/videos/zeiss-atos-q-operacao.mp4","alt":"Optische Digitalisierung eines Fahrzeugbauteils","legenda":"Digitalisierung und Prüfung für Automobilindustrie und Mobilität"}]},{"slug":"aeronautico","midias":[{"tipo":"video","src":"/videos/zeiss-bosello-max-operacao.mp4","alt":"Zerstörungsfreie Innenprüfung eines Bauteils","legenda":"Hochpräzise Prüfung für Luft- und Raumfahrtanwendungen"}]},{"slug":"ferramentaria-produto","midias":[{"tipo":"imagem","src":"/imagens/laboratorio-prismo-panoramica.jpeg","alt":"Messlabor für Werkzeugbau und Produktentwicklung","legenda":"Messung und Reverse Engineering für Werkzeugbau und Produkte"}]}]'::jsonb)
  ) sementes(idioma,titulo,texto,setores)
  loop
    insert into versoes_conteudo(conteudo_id,numero,idioma,titulo,corpo,estado_revisao)
    select conteudo_id_encontrado,coalesce(max(numero),0)+1,item.idioma,item.titulo,
      jsonb_build_object('texto',item.texto,'setores',item.setores),'aprovada'
    from versoes_conteudo where conteudo_id=conteudo_id_encontrado and idioma=item.idioma
    returning id into versao_id_encontrada;
    insert into publicacoes_conteudo(conteudo_id,idioma,versao_conteudo_id,publicada_em)
    values(conteudo_id_encontrado,item.idioma,versao_id_encontrada,now())
    on conflict(conteudo_id,idioma) do update set versao_conteudo_id=excluded.versao_conteudo_id,publicada_em=now();
    if item.idioma='pt-BR' then update conteudos set versao_publicada_id=versao_id_encontrada where id=conteudo_id_encontrado; end if;
  end loop;
end;
$$;

-- Acrescenta uma mídia inicial a cada novidade existente sem apagar o histórico editorial.
do $$
declare
  publicacao record;
  corpo_novo jsonb;
  versao_nova uuid;
begin
  for publicacao in
    select p.conteudo_id,p.idioma,v.titulo,v.corpo
    from publicacoes_conteudo p
    join conteudos c on c.id=p.conteudo_id and c.chave='inicio.acontecimentos'
    join versoes_conteudo v on v.id=p.versao_conteudo_id
  loop
    select jsonb_set(publicacao.corpo,'{itens}',jsonb_agg(
      case when elemento ? 'midias' and jsonb_array_length(coalesce(elemento->'midias','[]'::jsonb)) > 0 then elemento
      else elemento || jsonb_build_object('midias',jsonb_build_array(jsonb_build_object(
        'tipo','imagem',
        'src',case elemento->>'tipo' when 'recente' then '/imagens/laboratorio-centro-excelencia.jpeg' when 'agora' then '/imagens/laboratorio-o-inspect.jpeg' else '/imagens/laboratorio-fachada-interna.jpeg' end,
        'alt',elemento->>'titulo','legenda',elemento->>'titulo'
      ))) end order by ordem
    )) into corpo_novo
    from jsonb_array_elements(publicacao.corpo->'itens') with ordinality itens(elemento,ordem);

    insert into versoes_conteudo(conteudo_id,numero,idioma,titulo,corpo,estado_revisao)
    select publicacao.conteudo_id,coalesce(max(numero),0)+1,publicacao.idioma,publicacao.titulo,corpo_novo,'aprovada'
    from versoes_conteudo where conteudo_id=publicacao.conteudo_id and idioma=publicacao.idioma
    returning id into versao_nova;
    update publicacoes_conteudo set versao_conteudo_id=versao_nova,publicada_em=now()
      where conteudo_id=publicacao.conteudo_id and idioma=publicacao.idioma;
    if publicacao.idioma='pt-BR' then update conteudos set versao_publicada_id=versao_nova where id=publicacao.conteudo_id; end if;
  end loop;
end;
$$;

comment on function public.validar_corpo_cms_editorial() is
  'Valida no banco a estrutura, a legenda e o texto alternativo dos carrosséis editoriais.';
