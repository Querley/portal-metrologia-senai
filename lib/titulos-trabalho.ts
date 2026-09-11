export function resumirTexto(valor: string, limite = 42): string {
  const limpo = valor.replace(/\s+/g, ' ').trim();
  return limpo.length <= limite ? limpo : `${limpo.slice(0, limite - 1).trimEnd()}…`;
}

export function tituloDescritivoTrabalho(entrada: { quantidade?: number | string | null; descricao: string; servico: string; empresa: string }): string {
  const quantidade = entrada.quantidade == null || entrada.quantidade === '' ? '' : `${String(entrada.quantidade).replace('.', ',')}× `;
  return `${quantidade}${resumirTexto(entrada.descricao)} · ${resumirTexto(entrada.servico, 30)} · ${resumirTexto(entrada.empresa, 30)}`;
}
