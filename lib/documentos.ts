export function documentoPodeSerVisualizado(tipo: string, nome: string) {
  return tipo === 'application/pdf' || tipo.startsWith('image/') || /\.(pdf|png|jpe?g|webp)$/i.test(nome);
}
