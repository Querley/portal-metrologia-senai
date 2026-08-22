import { equipamentosDemonstracao } from '../../lib/dados-demonstracao';
import Image from 'next/image';
import Link from 'next/link';
import { MarcaOficial } from '../../componentes/marca-oficial';
import '../publico.css';

const servicos = [
  { titulo:'Medição tridimensional', imagem:'/imagens/zeiss-prismo.webp', texto:'Inspeção de dimensões e geometrias com rastreabilidade e alta precisão.', itens:['CMM DuraMax','CMM O-INSPECT','CMM PRISMO','CMM CONTURA'] },
  { titulo:'Tomografia industrial', imagem:'/imagens/zeiss-bosello-max-produto.webp', texto:'Visualização não destrutiva de estruturas internas, poros e inclusões.', itens:['BOSELLO MAX 80','Análise volumétrica','Comparação com modelo CAD'] },
  { titulo:'Digitalização óptica', imagem:'/imagens/zeiss-atos-q.webp', texto:'Nuvens de pontos e malhas para inspeção e engenharia reversa.', itens:['ATOS Q 8M','T-SCAN hawk 2','Relatório de desvios'] },
];

export default function Catalogo() { return <main><Cabecalho titulo="Catálogo de serviços" texto="Tecnologias de medição para transformar requisitos técnicos em decisões confiáveis." /><section className="conteudo-publico"><div className="catalogo-grade">{servicos.map((servico) => <article key={servico.titulo}><div className="imagem-servico"><Image src={servico.imagem} fill sizes="(max-width: 800px) 100vw, 33vw" alt={`Equipamento para ${servico.titulo}`} /></div><div className="conteudo-card-servico"><p className="sobrelinha"><span /> SERVIÇO</p><h2>{servico.titulo}</h2><p>{servico.texto}</p><ul>{servico.itens.map((item) => <li key={item}>{item}</li>)}</ul><a className="botao" href="/solicitar">Solicitar análise <span>→</span></a></div></article>)}</div><section className="equipamentos" id="equipamentos"><p className="sobrelinha"><span /> INFRAESTRUTURA</p><h2>Sete equipamentos especializados</h2><p>Capacidades e disponibilidade são confirmadas pela equipe durante a análise de cada solicitação.</p><div className="equipamentos-grid">{equipamentosDemonstracao.map((equipamento) => <span key={equipamento.id}>{equipamento.nome}</span>)}</div><figure className="foto-equipamentos"><Image src="/imagens/laboratorio-fachada-interna.jpeg" fill sizes="100vw" alt="Visão geral dos equipamentos do Centro de Excelência em Metrologia" /><figcaption>Estrutura do Centro de Excelência em Metrologia SENAI ZEISS</figcaption></figure></section></section></main>; }

function Cabecalho({ titulo, texto }: { titulo:string; texto:string }) { return <header className="cabecalho-publico"><div className="navegacao-simples"><Link className="marca marca-fundo-claro" href="/"><MarcaOficial /></Link><nav><Link href="/">Início</Link><a href="/catalogo">Serviços</a><a href="/solicitar">Contato</a><a href="/portal">Entrar</a></nav></div><h1>{titulo}</h1><p>{texto}</p></header>; }
