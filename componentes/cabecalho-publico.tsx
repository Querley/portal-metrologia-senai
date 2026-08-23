import { MarcaOficial } from './marca-oficial';
import { MenuMovel } from './menu-movel';

export function CabecalhoPublico({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <header className="cabecalho-publico">
      <div className="navegacao-simples">
        <a className="marca marca-fundo-claro" href="/" aria-label="Centro de Excelência em Metrologia — início"><MarcaOficial /></a>
        <nav aria-label="Navegação principal"><a href="/">Início</a><a href="/catalogo">Serviços e equipamentos</a><a href="/solicitar">Contato</a><a href="/portal">Entrar</a></nav>
        <MenuMovel />
      </div>
      <h1>{titulo}</h1>
      <p>{texto}</p>
    </header>
  );
}
