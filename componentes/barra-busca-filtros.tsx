'use client';

import { Funnel, Search, SlidersHorizontal, X } from 'lucide-react';

export type FiltroBusca = {
  id: string;
  rotulo: string;
  valor: string;
  opcoes: Array<{ valor: string; rotulo: string }>;
  aoMudar: (valor: string) => void;
};

export function BarraBuscaFiltros({
  busca,
  aoMudarBusca,
  placeholder = 'Pesquisar',
  filtros = [],
  total,
  ordenacao,
}: {
  busca: string;
  aoMudarBusca: (valor: string) => void;
  placeholder?: string;
  filtros?: FiltroBusca[];
  total?: number;
  ordenacao?: { valor: string; aoMudar: (valor: string) => void; opcoes: Array<{ valor: string; rotulo: string }>; padrao?: string };
}) {
  const temFiltro = Boolean(busca.trim()) || filtros.some((filtro) => filtro.valor !== 'todos') || Boolean(ordenacao && ordenacao.valor !== (ordenacao.padrao ?? ordenacao.opcoes[0]?.valor));

  function limpar() {
    aoMudarBusca('');
    filtros.forEach((filtro) => filtro.aoMudar('todos'));
    if (ordenacao) ordenacao.aoMudar(ordenacao.padrao ?? ordenacao.opcoes[0]?.valor ?? '');
  }

  return <section className="barra-busca-filtros" aria-label="Pesquisa e filtros">
    <label className="campo-busca-lista"><Search size={17} aria-hidden="true" /><span className="sr-only">Pesquisar</span><input type="search" value={busca} onChange={(evento) => aoMudarBusca(evento.target.value)} placeholder={placeholder} /></label>
    {filtros.map((filtro) => <label className="campo-filtro-lista" key={filtro.id}><SlidersHorizontal size={15} aria-hidden="true" /><span>{filtro.rotulo}</span><select value={filtro.valor} onChange={(evento) => filtro.aoMudar(evento.target.value)}>{filtro.opcoes.map((opcao) => <option key={opcao.valor} value={opcao.valor}>{opcao.rotulo}</option>)}</select></label>)}
    {ordenacao && <label className="campo-filtro-lista campo-ordenacao-lista"><Funnel size={15} aria-hidden="true" /><span>Ordenar</span><select value={ordenacao.valor} onChange={(evento) => ordenacao.aoMudar(evento.target.value)}>{ordenacao.opcoes.map((opcao) => <option key={opcao.valor} value={opcao.valor}>{opcao.rotulo}</option>)}</select></label>}
    {typeof total === 'number' && <output className="total-resultados-filtro" aria-live="polite">{total} {total === 1 ? 'resultado' : 'resultados'}</output>}
    {temFiltro && <button className="limpar-filtros" type="button" onClick={limpar}><X size={15} /> Limpar</button>}
  </section>;
}
