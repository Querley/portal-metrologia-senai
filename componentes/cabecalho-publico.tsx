import { MarcaOficial } from './marca-oficial';
import { MenuMovel } from './menu-movel';

export function CabecalhoPublico({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <header className="cabecalho-publico">
      <div className="navegacao-simples">
        <a className="marca" href="/" aria-label="Centro de Excelência em Metrologia — início"><MarcaOficial /></a>
        <nav aria-label="Navegação principal"><a href="/">Início</a><a href="/catalogo">Serviços</a><a href="/catalogo#equipamentos">Equipamentos</a><a href="/#institucional">Institucional</a></nav>
        <div className="acoes-cabecalho-publico"><a className="entrar" href="/portal">Entrar</a><a className="botao botao-menor" href="/solicitar">Solicitar orçamento</a></div>
        <MenuMovel />
      </div>
      <div className="cabecalho-publico-conteudo">
        <h1>{titulo}</h1>
        <p>{texto}</p>
      </div>
    </header>
  );
}
