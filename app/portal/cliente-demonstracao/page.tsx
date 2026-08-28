import { PortalCliente } from '../../../componentes/portal-cliente';
import '../portal.css';

export const metadata = { title: 'Demonstração da área do cliente — Portal de Metrologia SENAI' };

export default function PaginaClienteDemonstracao() {
  return <PortalCliente demonstracao />;
}
