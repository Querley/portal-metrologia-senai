import { MarcaOficial } from './marca-oficial';

export function RodapePublico() {
  return <footer><a href="/" aria-label="Centro de Excelência em Metrologia — início"><MarcaOficial classe="marca-rodape" /></a><div className="texto-rodape"><p>Portal para gestão de serviços e conhecimento em orçamentação.</p><small>© 2026 SENAI. Todos os direitos reservados.</small></div><nav aria-label="Links do rodapé"><a href="/catalogo">Serviços e equipamentos</a><a href="/privacidade">Privacidade</a><a href="/#contato">Contato</a></nav></footer>;
}
