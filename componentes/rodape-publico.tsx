import Link from 'next/link';
import { MarcaOficial } from './marca-oficial';

export function RodapePublico() {
  return <footer><Link href="/" aria-label="Centro de Excelência em Metrologia — início"><MarcaOficial classe="marca-rodape" /></Link><p>Portal para gestão de serviços e conhecimento em orçamentação.</p><nav aria-label="Links do rodapé"><Link href="/catalogo">Serviços e equipamentos</Link><Link href="/privacidade">Privacidade</Link><Link href="/solicitar">Contato</Link></nav></footer>;
}
