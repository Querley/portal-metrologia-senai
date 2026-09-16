'use client';

import { Menu } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { acoesNavegacaoPublica, linksNavegacaoPublica } from '../lib/navegacao-publica';
import { SeletorIdioma } from './seletor-idioma';
import { useTraducaoPublica } from '../lib/traducao-publica';

export function MenuMovel() {
  const { t } = useTraducaoPublica();
  const hidratado = useSyncExternalStore(() => () => undefined, () => true, () => false);
  return (
    <details className="menu-movel" data-hidratado={hidratado ? 'sim' : 'nao'}>
      <summary role="button" aria-label={t('Abrir menu')}><Menu size={22} aria-hidden="true" /><span>{t('Menu')}</span></summary>
      <nav aria-label={t('Navegação em telas pequenas')}>
        <SeletorIdioma compacto />
        {linksNavegacaoPublica.map((item) => <a href={item.href} key={item.href}>{t(item.rotulo)}</a>)}
        {acoesNavegacaoPublica.map((item) => <a className={'destaque' in item && item.destaque ? 'destaque' : ''} href={item.href} key={item.href}>{t(item.rotulo)}</a>)}
      </nav>
    </details>
  );
}
