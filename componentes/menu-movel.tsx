import { Menu } from 'lucide-react';
import { acoesNavegacaoPublica, linksNavegacaoPublica } from '../lib/navegacao-publica';

export function MenuMovel() {
  return (
    <details className="menu-movel">
      <summary aria-label="Abrir menu"><Menu size={22} aria-hidden="true" /><span>Menu</span></summary>
      <nav aria-label="Navegação em telas pequenas">
        {linksNavegacaoPublica.map((item) => <a href={item.href} key={item.href}>{item.rotulo}</a>)}
        {acoesNavegacaoPublica.map((item) => <a className={'destaque' in item && item.destaque ? 'destaque' : ''} href={item.href} key={item.href}>{item.rotulo}</a>)}
      </nav>
    </details>
  );
}
