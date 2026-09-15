import { MarcaOficial } from './marca-oficial';
import { MenuMovel } from './menu-movel';
import { CabecalhoCms } from './cabecalho-cms';
import { SeletorIdioma } from './seletor-idioma';
import { acoesNavegacaoPublica, linksNavegacaoPublica } from '../lib/navegacao-publica';

export function CabecalhoPublico({ titulo, texto, chaveCms }: { titulo: string; texto: string; chaveCms?: string }) {
  return (
    <header className="cabecalho-publico">
      <div className="navegacao-simples">
        <a className="marca" href="/" aria-label="Centro de Excelência em Metrologia — início"><MarcaOficial /></a>
        <nav aria-label="Navegação principal">{linksNavegacaoPublica.map((item) => <a href={item.href} key={item.href}>{item.rotulo}</a>)}</nav>
        <div className="acoes-cabecalho-publico"><SeletorIdioma compacto />{acoesNavegacaoPublica.map((item) => <a className={'destaque' in item && item.destaque ? 'botao botao-menor' : 'entrar'} href={item.href} key={item.href}>{item.rotulo}</a>)}</div>
        <MenuMovel />
      </div>
      <div className="cabecalho-publico-conteudo">
        {chaveCms ? <CabecalhoCms chave={chaveCms} tituloPadrao={titulo} textoPadrao={texto} /> : <><h1>{titulo}</h1><p>{texto}</p></>}
      </div>
    </header>
  );
}
