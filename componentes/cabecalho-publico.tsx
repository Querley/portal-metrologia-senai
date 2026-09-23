'use client';

import { MarcaOficial } from './marca-oficial';
import { MenuMovel } from './menu-movel';
import { CabecalhoCms } from './cabecalho-cms';
import { SeletorIdioma } from './seletor-idioma';
import { acoesNavegacaoPublica, linksNavegacaoPublica } from '../lib/navegacao-publica';
import { useTraducaoPublica } from '../lib/traducao-publica';

export function CabecalhoPublico({ titulo, texto, chaveCms }: { titulo: string; texto: string; chaveCms?: string }) {
  const { t } = useTraducaoPublica();
  return (
    <header className="cabecalho-publico">
      <div className="navegacao-simples">
        <a className="marca" href="/" aria-label={t('Centro de Excelência em Metrologia — início')}><MarcaOficial /></a>
        <nav aria-label={t('Navegação principal')}>{linksNavegacaoPublica.map((item) => <a href={item.href} key={item.href}>{t(item.rotulo)}</a>)}</nav>
        <div className="acoes-cabecalho-publico"><SeletorIdioma />{acoesNavegacaoPublica.map((item) => <a className={'destaque' in item && item.destaque ? 'botao botao-menor' : 'entrar'} href={item.href} key={item.href}>{t(item.rotulo)}</a>)}</div>
        <MenuMovel />
      </div>
      <div className="cabecalho-publico-conteudo">
        {chaveCms ? <CabecalhoCms chave={chaveCms} tituloPadrao={t(titulo)} textoPadrao={t(texto)} /> : <><h1>{t(titulo)}</h1><p>{t(texto)}</p></>}
      </div>
    </header>
  );
}
