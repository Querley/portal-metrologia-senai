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

export function formatosDataParaBusca(valor: string | null | undefined): string {
  if (!valor) return '';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return String(valor);
  return `${String(valor).slice(0, 10)} ${new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: valor.includes('T') ? 'short' : undefined,
  }).format(data)}`;
}
