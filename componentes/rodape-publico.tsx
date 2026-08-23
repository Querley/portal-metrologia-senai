import { MarcaOficial } from './marca-oficial';

export function RodapePublico() {
  return <footer><a href="/" aria-label="Centro de Excelência em Metrologia — início"><MarcaOficial classe="marca-rodape" /></a><p>Portal para gestão de serviços e conhecimento em orçamentação.</p><nav aria-label="Links do rodapé"><a href="/catalogo">Serviços e equipamentos</a><a href="/privacidade">Privacidade</a><a href="/solicitar">Contato</a></nav></footer>;
}
