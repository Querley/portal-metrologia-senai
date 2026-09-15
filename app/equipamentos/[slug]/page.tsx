import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PaginaEquipamentoPublica } from '../../../componentes/pagina-equipamento-publica';
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

  return <PaginaEquipamentoPublica equipamento={equipamento} />;
}
