import Image from 'next/image';
import { CabecalhoPublico } from '../../componentes/cabecalho-publico';
import { RodapePublico } from '../../componentes/rodape-publico';
import { equipamentosPublicos } from '../../lib/equipamentos';
import { servicosOficiais } from '../../lib/servicos';
import '../publico.css';

const servicos = [
  { titulo: 'Medição tridimensional', imagem: '/imagens/recorte-zeiss-prismo-v2.png', texto: 'Inspeção tátil ou multissensor de dimensões, forma e posição, com programação e relatórios técnicos.', itens: ['DuraMax HTG 5/5/5', 'O-INSPECT 5/4/3', 'PRISMO VAST 09/24/07'] },
  { titulo: 'Raios X industrial', imagem: '/imagens/recorte-zeiss-bosello-max-v3.png', texto: 'Investigação não destrutiva de estruturas internas, montagem, porosidade e outras descontinuidades.', itens: ['ZEISS BOSELLO MAX 80-150', 'Inspeção radiográfica 2D', 'Análise técnica de falhas'] },
  { titulo: 'Digitalização óptica 3D', imagem: '/imagens/recorte-zeiss-atos-q-v2.png', texto: 'Captura de superfícies para inspeção, comparação nominal-real e reconstrução geométrica.', itens: ['ZEISS ATOS Q 8M', 'ZEISS T-SCAN hawk 2', 'Engenharia reversa e comparação CAD'] },
];

export const metadata = { title: 'Serviços e equipamentos — Portal de Metrologia SENAI' };

export default function Catalogo() {
  return (
    <main>
      <CabecalhoPublico titulo="Serviços e equipamentos" texto="Conheça as tecnologias disponíveis no Centro e encontre o caminho mais adequado para o seu desafio de medição." />
      <section className="conteudo-publico">
        <section className="servicos-oficiais" aria-labelledby="titulo-servicos-oficiais">
          <div className="cabecalho-lista-servicos"><div><p className="sobrelinha"><span /> PORTFÓLIO DO CENTRO</p><h2 id="titulo-servicos-oficiais">Serviços do Centro de Excelência em Metrologia SENAI ZEISS</h2></div><p>Selecione uma necessidade para iniciar a solicitação. Caso o desafio combine mais de um serviço, descreva o objetivo completo no formulário.</p></div>
          <div className="grade-servicos-oficiais">{servicosOficiais.map((servico, indice) => <article key={servico.slug}><span>{String(indice + 1).padStart(2, '0')}</span><div><h3>{servico.titulo}</h3><p>{servico.resumo}</p><a href={`/solicitar?servico=${servico.slug}`}>Solicitar este serviço <b aria-hidden="true">→</b></a></div></article>)}</div>
        </section>

        <section className="tecnologias-centro" aria-labelledby="titulo-tecnologias">
          <div className="cabecalho-tecnologias"><p className="sobrelinha"><span /> TECNOLOGIAS</p><h2 id="titulo-tecnologias">Três áreas tecnológicas apoiam esse portfólio.</h2></div>
        <div className="catalogo-grade">
          {servicos.map((servico) => <article key={servico.titulo}><div className="imagem-servico"><Image src={servico.imagem} fill sizes="(max-width: 800px) 100vw, 33vw" alt={`Equipamento usado em ${servico.titulo}`} /></div><div className="conteudo-card-servico"><p className="sobrelinha"><span /> CAPACIDADE</p><h2>{servico.titulo}</h2><p>{servico.texto}</p><ul>{servico.itens.map((item) => <li key={item}>{item}</li>)}</ul><a className="botao" href="/solicitar">Solicitar análise <span aria-hidden="true">→</span></a></div></article>)}
        </div>
        </section>

        <section className="equipamentos" id="equipamentos">
          <div className="titulo-equipamentos"><div><p className="sobrelinha"><span /> INFRAESTRUTURA ATUAL</p><h2>Seis equipamentos, páginas próprias e aplicações complementares.</h2></div><p>A CONTURA não integra o parque atual. Capacidades e disponibilidade de cada equipamento são confirmadas pela equipe antes da proposta.</p></div>
          <div className="grade-equipamentos-detalhada">
            {equipamentosPublicos.map((equipamento) => <article key={equipamento.slug}><a className="foto-card-equipamento" href={`/equipamentos/${equipamento.slug}`}><Image src={equipamento.imagemPrincipal} fill sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw" alt={equipamento.nome} /></a><div><p>{equipamento.categoria}</p><h3><a href={`/equipamentos/${equipamento.slug}`}>{equipamento.nome}</a></h3><span>{equipamento.resumo}</span><a className="link-equipamento" href={`/equipamentos/${equipamento.slug}`}>Conhecer equipamento <b aria-hidden="true">→</b></a></div></article>)}
          </div>
          <figure className="foto-equipamentos"><Image src="/imagens/laboratorio-fachada-interna.jpeg" fill sizes="100vw" alt="Visão geral dos equipamentos do Centro de Excelência em Metrologia" /><figcaption>Estrutura atual do Centro de Excelência em Metrologia SENAI ZEISS</figcaption></figure>
        </section>

        <section className="servico-personalizado">
          <div><p className="sobrelinha"><span /> DEMANDA ABERTA</p><h2>Seu desafio combina serviços ou exige outra abordagem?</h2><p>Descreva livremente a necessidade, a peça, o objetivo e o resultado esperado. A equipe poderá indicar a combinação mais adequada de tecnologias e entregáveis.</p></div>
          <a className="botao" href="/solicitar?servico=outro">Criar solicitação personalizada <span aria-hidden="true">→</span></a>
        </section>
      </section>
      <RodapePublico />
    </main>
  );
}
