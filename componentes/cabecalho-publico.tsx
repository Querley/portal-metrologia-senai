import Link from 'next/link';
import { MarcaOficial } from './marca-oficial';
import { MenuMovel } from './menu-movel';

export function CabecalhoPublico({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <header className="cabecalho-publico">
      <div className="navegacao-simples">
        <Link className="marca marca-fundo-claro" href="/" aria-label="Centro de Excelência em Metrologia — início"><MarcaOficial /></Link>
        <nav aria-label="Navegação principal"><Link href="/">Início</Link><Link href="/catalogo">Serviços e equipamentos</Link><Link href="/solicitar">Contato</Link><Link href="/portal">Entrar</Link></nav>
        <MenuMovel />
      </div>
      <h1>{titulo}</h1>
      <p>{texto}</p>
    </header>
  );
}
