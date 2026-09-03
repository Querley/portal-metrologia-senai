export function normalizarBusca(valor: unknown): string {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function correspondeBusca(termo: string, ...valores: unknown[]): boolean {
  const consulta = normalizarBusca(termo);
  if (!consulta) return true;
  const conteudo = normalizarBusca(valores.flat().join(' '));
  return consulta.split(/\s+/).every((parte) => conteudo.includes(parte));
}
