import { Menu } from 'lucide-react';

export function MenuMovel() {
  return (
    <details className="menu-movel">
      <summary aria-label="Abrir menu"><Menu size={22} aria-hidden="true" /><span>Menu</span></summary>
      <nav aria-label="Navegação em telas pequenas">
        <a href="/">Início</a>
        <a href="/catalogo">Serviços e equipamentos</a>
        <a href="/solicitar">Solicitar orçamento</a>
        <a href="/privacidade">Privacidade</a>
        <a href="/portal">Entrar na demonstração</a>
      </nav>
    </details>
  );
}
