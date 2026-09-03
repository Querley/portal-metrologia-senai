import { CabecalhoPublico } from '../../componentes/cabecalho-publico';
import { ContatoEmail } from '../../componentes/contato-email';
import { FormularioSolicitacao } from '../../componentes/formulario-solicitacao';
import { RodapePublico } from '../../componentes/rodape-publico';
import { servicosOficiais } from '../../lib/servicos';
import '../publico.css';

export const metadata = { title: 'Solicitar orçamento — Portal de Metrologia SENAI' };
export default async function Solicitar({ searchParams }: { searchParams: Promise<{ servico?: string; equipamento?: string }> }) {
  const parametros = await searchParams;
  const servicoInformado = parametros.servico && servicosOficiais.some(({ slug }) => slug === parametros.servico) ? parametros.servico : '';
  const servicoInicial = parametros.equipamento ? 'avaliacao-equipamento' : parametros.servico === 'outro' ? 'outro' : servicoInformado;
  return <main><CabecalhoPublico titulo="Solicite uma análise sem criar uma conta" texto="Conte o que sua empresa precisa e indique o prazo de pagamento desejado. O acesso será necessário somente depois, para acompanhar o trabalho e trocar mensagens com a equipe." /><section className="conteudo-publico pagina-form"><FormularioSolicitacao servicoInicial={servicoInicial} /></section><ContatoEmail /><RodapePublico /></main>;
}
