import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CabecalhoPublico } from '../../../componentes/cabecalho-publico';
import { CarrosselMidia } from '../../../componentes/carrossel-midia';
import { RodapePublico } from '../../../componentes/rodape-publico';
import { encontrarEquipamento, equipamentosPublicos } from '../../../lib/equipamentos';
import '../../publico.css';

type Propriedades = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return equipamentosPublicos.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Propriedades): Promise<Metadata> {
  const equipamento = encontrarEquipamento((await params).slug);
  if (!equipamento) return {};
  return { title: `${equipamento.nome} — Portal de Metrologia SENAI`, description: equipamento.resumo };
}

export default async function PaginaEquipamento({ params }: Propriedades) {
  const equipamento = encontrarEquipamento((await params).slug);
  if (!equipamento) notFound();

  return (
    <main>
      <CabecalhoPublico titulo={equipamento.nome} texto={equipamento.resumo} />
      <article className="pagina-equipamento">
        <nav className="migalhas" aria-label="Caminho"><a href="/">Início</a><span>/</span><a href="/catalogo#equipamentos">Equipamentos</a><span>/</span><strong>{equipamento.nome}</strong></nav>
        <div className="introducao-equipamento">
          <div><p className="sobrelinha"><span /> {equipamento.categoria.toUpperCase()}</p><h2>O equipamento e seu papel no Centro</h2>{equipamento.descricao.map((paragrafo) => <p key={paragrafo}>{paragrafo}</p>)}</div>
          <aside><strong>Antes de solicitar</strong><p>{equipamento.referenciaTecnica}</p><a href={equipamento.fonteFabricante} target="_blank" rel="noreferrer">Consultar referência técnica da ZEISS <span aria-hidden="true">↗</span></a></aside>
        </div>

        <CarrosselMidia midias={equipamento.midias} rotulo={`Fotos e vídeos de ${equipamento.nome}`} />

        <div className="grade-informacoes-equipamento">
          <ListaTecnica titulo="Aplicações frequentes" itens={equipamento.aplicacoes} />
          <ListaTecnica titulo="Capacidades" itens={equipamento.capacidades} />
          <ListaTecnica titulo="Medições e entregáveis" itens={equipamento.tiposMedicao} />
          <ListaTecnica titulo="Diferenciais" itens={equipamento.diferenciais} />
        </div>

        <section className="fluxo-solicitacao-equipamento"><div><p className="sobrelinha"><span /> ANÁLISE TÉCNICA</p><h2>Confirme a melhor estratégia para sua peça.</h2><p>Envie dimensões, material, tolerâncias, quantidade, finalidade e, se possível, desenho ou modelo CAD. A equipe valida equipamento, preparação, prazo e entregáveis.</p></div><a className="botao" href={`/solicitar?equipamento=${equipamento.slug}`}>Solicitar análise com este equipamento <span aria-hidden="true">→</span></a></section>
      </article>
      <RodapePublico />
    </main>
  );
}

function ListaTecnica({ titulo, itens }: { titulo: string; itens: string[] }) {
  return <section><h2>{titulo}</h2><ul>{itens.map((item) => <li key={item}>{item}</li>)}</ul></section>;
}
