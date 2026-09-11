import { notFound } from 'next/navigation';
import { PortalCliente } from '../../../componentes/portal-cliente';
import { PortalDemonstracao } from '../../../componentes/portal-demonstracao';
import '../portal.css';

export default async function ValidacaoE2E({ searchParams }: { searchParams: Promise<{ area?: string }> }) {
  if (process.env.NEXT_PUBLIC_E2E_SCENARIO !== 'enabled') notFound();
  const parametros = await searchParams;
  if (parametros.area === 'orcamentos') return <main className="aplicacao"><div className="conteudo-interno"><section className="painel painel-orcamentos-persistentes"><section className="cards-operacionais">{['Rascunhos','Em validação','Aguardando Cliente','Aceitas'].map((rotulo) => <button type="button" key={rotulo}><small>{rotulo}</small><strong>1</strong><span>Ver registros</span></button>)}</section><section className="bloco tabela-orcamentos-persistentes"><div className="tabela-wrap"><table><thead><tr>{['Criação','Descrição','Equipamento','Horas','Custo-hora congelado','Preço','Estado','Ação'].map((titulo) => <th key={titulo}>{titulo}</th>)}</tr></thead><tbody><tr><td>11/09/2026</td><td>3× engrenagens · inspeção dimensional · Empresa X</td><td>ZEISS DuraMax</td><td>12 h</td><td>R$ 100,00</td><td>R$ 1.500,00</td><td>Aceita</td><td>Baixar PDF</td></tr></tbody></table></div></section></section></div></main>;
  return parametros.area === 'cliente' ? <PortalCliente demonstracao /> : <PortalDemonstracao />;
}
