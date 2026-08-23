import Image from 'next/image';
import { CabecalhoPublico } from '../../componentes/cabecalho-publico';
import { RodapePublico } from '../../componentes/rodape-publico';
import { equipamentosPublicos } from '../../lib/equipamentos';
import '../publico.css';

const servicos = [
  { titulo: 'Medição tridimensional', imagem: '/imagens/zeiss-prismo.webp', texto: 'Inspeção tátil ou multissensor de dimensões, forma e posição, com programação e relatórios técnicos.', itens: ['CMM DuraMax HTG', 'ZEISS O-INSPECT', 'ZEISS PRISMO'] },
  { titulo: 'Raios X industrial', imagem: '/imagens/zeiss-bosello-max-produto.webp', texto: 'Investigação não destrutiva de estruturas internas, montagem, porosidade e outras descontinuidades.', itens: ['ZEISS BOSELLO MAX 80', 'Inspeção radiográfica 2D', 'Análise técnica de falhas'] },
  { titulo: 'Digitalização óptica 3D', imagem: '/imagens/zeiss-atos-q.webp', texto: 'Captura de superfícies para inspeção, comparação nominal-real e reconstrução geométrica.', itens: ['ZEISS ATOS Q 8M', 'ZEISS T-SCAN hawk 2', 'Engenharia reversa e comparação CAD'] },
];

export const metadata = { title: 'Serviços e equipamentos — Portal de Metrologia SENAI' };

export default function Catalogo() {
  return (
    <main>
      <CabecalhoPublico titulo="Serviços e equipamentos" texto="Conheça as tecnologias disponíveis no Centro e encontre o caminho mais adequado para o seu desafio de medição." />
      <section className="conteudo-publico">
        <div className="catalogo-grade">
          {servicos.map((servico) => <article key={servico.titulo}><div className="imagem-servico"><Image src={servico.imagem} fill sizes="(max-width: 800px) 100vw, 33vw" alt={`Equipamento usado em ${servico.titulo}`} /></div><div className="conteudo-card-servico"><p className="sobrelinha"><span /> CAPACIDADE</p><h2>{servico.titulo}</h2><p>{servico.texto}</p><ul>{servico.itens.map((item) => <li key={item}>{item}</li>)}</ul><a className="botao" href="/solicitar">Solicitar análise <span aria-hidden="true">→</span></a></div></article>)}
        </div>

        <section className="equipamentos" id="equipamentos">
          <div className="titulo-equipamentos"><div><p className="sobrelinha"><span /> INFRAESTRUTURA ATUAL</p><h2>Seis equipamentos, páginas próprias e aplicações complementares.</h2></div><p>A CONTURA não integra o parque atual. Capacidades e disponibilidade de cada equipamento são confirmadas pela equipe antes da proposta.</p></div>
          <div className="grade-equipamentos-detalhada">
            {equipamentosPublicos.map((equipamento) => <article key={equipamento.slug}><a className="foto-card-equipamento" href={`/equipamentos/${equipamento.slug}`}><Image src={equipamento.imagemPrincipal} fill sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw" alt={equipamento.nome} /></a><div><p>{equipamento.categoria}</p><h3><a href={`/equipamentos/${equipamento.slug}`}>{equipamento.nome}</a></h3><span>{equipamento.resumo}</span><a className="link-equipamento" href={`/equipamentos/${equipamento.slug}`}>Conhecer equipamento <b aria-hidden="true">→</b></a></div></article>)}
          </div>
          <figure className="foto-equipamentos"><Image src="/imagens/laboratorio-fachada-interna.jpeg" fill sizes="100vw" alt="Visão geral dos equipamentos do Centro de Excelência em Metrologia" /><figcaption>Estrutura atual do Centro de Excelência em Metrologia SENAI ZEISS</figcaption></figure>
        </section>

        <section className="servico-personalizado">
          <div><p className="sobrelinha"><span /> DEMANDA ABERTA</p><h2>Seu serviço não aparece nesta lista?</h2><p>O catálogo continuará crescendo. Enquanto a relação completa de serviços é validada, você pode descrever livremente a necessidade, a peça, o objetivo e o resultado esperado.</p></div>
          <a className="botao" href="/solicitar?servico=outro">Criar solicitação personalizada <span aria-hidden="true">→</span></a>
        </section>
      </section>
      <RodapePublico />
    </main>
  );
}
