import { MarcaOficial } from './marca-oficial';
import { MenuMovel } from './menu-movel';
import { acoesNavegacaoPublica, linksNavegacaoPublica } from '../lib/navegacao-publica';

export function CabecalhoPublico({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <header className="cabecalho-publico">
      <div className="navegacao-simples">
        <a className="marca" href="/" aria-label="Centro de Excelência em Metrologia — início"><MarcaOficial /></a>
        <nav aria-label="Navegação principal">{linksNavegacaoPublica.map((item) => <a href={item.href} key={item.href}>{item.rotulo}</a>)}</nav>
        <div className="acoes-cabecalho-publico">{acoesNavegacaoPublica.map((item) => <a className={'destaque' in item && item.destaque ? 'botao botao-menor' : 'entrar'} href={item.href} key={item.href}>{item.rotulo}</a>)}</div>
        <MenuMovel />
      </div>
      <div className="cabecalho-publico-conteudo">
        <h1>{titulo}</h1>
        <p>{texto}</p>
      </div>
    </header>
  );
}
