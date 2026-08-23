import { Menu } from 'lucide-react';
import Link from 'next/link';

export function MenuMovel() {
  return (
    <details className="menu-movel">
      <summary aria-label="Abrir menu"><Menu size={22} aria-hidden="true" /><span>Menu</span></summary>
      <nav aria-label="Navegação em telas pequenas">
        <Link href="/">Início</Link>
        <Link href="/catalogo">Serviços e equipamentos</Link>
        <Link href="/solicitar">Solicitar orçamento</Link>
        <Link href="/privacidade">Privacidade</Link>
        <Link href="/portal">Entrar na demonstração</Link>
      </nav>
    </details>
  );
}
