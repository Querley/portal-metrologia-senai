'use client';

import Image from 'next/image';
import { equipamentosPublicos } from '../lib/equipamentos';
import { useTraducaoPublica } from '../lib/traducao-publica';
import { CabecalhoPublico } from './cabecalho-publico';
import { RodapePublico } from './rodape-publico';
import { SetoresIndustria } from './setores-industria';
import { VideoPublico } from './video-publico';

const servicos = [
  { titulo: 'Medição tridimensional', imagem: '/imagens/recorte-zeiss-prismo-v2.png', texto: 'Inspeção tátil ou multissensor de dimensões, forma e posição, com programação e relatórios técnicos.', itens: ['DuraMax HTG 5/5/5', 'O-INSPECT 5/4/3', 'PRISMO VAST 09/24/07'] },
  { titulo: 'Raios X industrial', imagem: '/imagens/recorte-zeiss-bosello-max-v3.png', texto: 'Investigação não destrutiva de estruturas internas, montagem, porosidade e outras descontinuidades.', itens: ['ZEISS BOSELLO MAX 80-150', 'Inspeção radiográfica 2D', 'Análise técnica de falhas'] },
  { titulo: 'Digitalização óptica 3D', imagem: '/imagens/recorte-zeiss-atos-q-v2.png', texto: 'Captura de superfícies para inspeção, comparação nominal-real e reconstrução geométrica.', itens: ['ZEISS ATOS Q 8M', 'ZEISS T-SCAN hawk 2', 'Engenharia reversa e comparação CAD'] },
];

export function CatalogoPublico() {
  const { t } = useTraducaoPublica();
  return <main><CabecalhoPublico chaveCms="catalogo.cabecalho" titulo="Serviços e equipamentos" texto="Conheça as tecnologias disponíveis no Centro e encontre o caminho mais adequado para o seu desafio de medição." /><section className="conteudo-publico"><SetoresIndustria />
    <section className="tecnologias-centro" aria-labelledby="titulo-tecnologias"><div className="cabecalho-tecnologias"><p className="sobrelinha"><span /> {t('TECNOLOGIAS')}</p><h2 id="titulo-tecnologias">{t('Três áreas tecnológicas apoiam esse portfólio.')}</h2></div><div className="catalogo-grade">{servicos.map((servico) => <article key={servico.titulo}><div className="imagem-servico"><Image src={servico.imagem} fill sizes="(max-width: 800px) 100vw, 33vw" alt={t(servico.titulo)} /></div><div className="conteudo-card-servico"><p className="sobrelinha"><span /> {t('CAPACIDADE')}</p><h2>{t(servico.titulo)}</h2><p>{t(servico.texto)}</p><ul>{servico.itens.map((item) => <li key={item}>{t(item)}</li>)}</ul><a className="botao" href="/solicitar">{t('Solicitar análise')} <span aria-hidden="true">→</span></a></div></article>)}</div></section>
    <section className="equipamentos" id="equipamentos"><div className="titulo-equipamentos"><div><p className="sobrelinha"><span /> {t('INFRAESTRUTURA ATUAL')}</p><h2>{t('Seis equipamentos e aplicações complementares.')}</h2></div><p>{t('Capacidades e disponibilidade de cada equipamento são confirmadas pela equipe antes da proposta.')}</p></div><div className="grade-equipamentos-detalhada">{equipamentosPublicos.map((equipamento) => <article key={equipamento.slug}><a className="foto-card-equipamento" href={`/equipamentos/${equipamento.slug}`}><Image src={equipamento.imagemPrincipal} fill sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw" alt={equipamento.nome} /></a><div><p>{t(equipamento.categoria)}</p><h3><a href={`/equipamentos/${equipamento.slug}`}>{equipamento.nome}</a></h3><span>{t(equipamento.resumo)}</span><a className="link-equipamento" href={`/equipamentos/${equipamento.slug}`}>{t('Conhecer equipamento')} <b aria-hidden="true">→</b></a></div></article>)}</div><figure className="foto-equipamentos"><VideoPublico src="/videos/estrutura-centro-metrologia.mp4" poster="/imagens/laboratorio-fachada-interna.jpeg" rotulo="Centro de Excelência em Metrologia SENAI ZEISS" /><figcaption>Centro de Excelência em Metrologia SENAI ZEISS</figcaption></figure></section>
    <section className="servico-personalizado"><div><p className="sobrelinha"><span /> {t('DEMANDA ABERTA')}</p><h2>{t('Seu desafio combina serviços ou exige outra abordagem?')}</h2><p>{t('Descreva livremente a necessidade, a peça, o objetivo e o resultado esperado. A equipe poderá indicar a combinação mais adequada de tecnologias e entregáveis.')}</p></div><a className="botao" href="/solicitar?servico=outro">{t('Criar solicitação personalizada')} <span aria-hidden="true">→</span></a></section>
  </section><RodapePublico /></main>;
}
