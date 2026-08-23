import { CabecalhoPublico } from '../../componentes/cabecalho-publico';
import { FormularioSolicitacao } from '../../componentes/formulario-solicitacao';
import { RodapePublico } from '../../componentes/rodape-publico';
import '../publico.css';

export const metadata = { title: 'Solicitar orçamento — Portal de Metrologia SENAI' };
export default async function Solicitar({ searchParams }: { searchParams: Promise<{ servico?: string; equipamento?: string }> }) {
  const parametros = await searchParams;
  const servicoInicial = parametros.equipamento ? 'avaliacao-equipamento' : parametros.servico === 'outro' ? 'outro' : '';
  return <main><CabecalhoPublico titulo="Solicite uma análise" texto="Escolha uma capacidade do catálogo ou descreva uma necessidade personalizada. Nesta prévia, o envio é demonstrativo e não persiste informações." /><section className="conteudo-publico pagina-form"><FormularioSolicitacao servicoInicial={servicoInicial} /></section><RodapePublico /></main>;
}
