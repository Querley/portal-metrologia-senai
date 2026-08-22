const chavesProibidas = new Set(['cliente', 'clienteId', 'empresa', 'empresaId', 'contato', 'email', 'telefone', 'preco', 'valor', 'margem', 'anexo', 'anexos']);

export type ResultadoSanitizacao = { conteudo: unknown; removidos: string[] };

export function sanitizarParaIa(entrada: unknown): ResultadoSanitizacao {
  const removidos: string[] = [];
  function visitar(valor: unknown, caminho: string): unknown {
    if (Array.isArray(valor)) return valor.map((item, indice) => visitar(item, `${caminho}[${indice}]`));
    if (valor && typeof valor === 'object') {
      return Object.fromEntries(Object.entries(valor as Record<string, unknown>).flatMap(([chave, item]) => {
        if (chavesProibidas.has(chave)) { removidos.push(caminho ? `${caminho}.${chave}` : chave); return []; }
        return [[chave, visitar(item, caminho ? `${caminho}.${chave}` : chave)]];
      }));
    }
    if (typeof valor === 'string') {
      return valor
        .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[email removido]')
        .replace(/(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?\d{4,5}[-\s]?\d{4}/g, '[telefone removido]');
    }
    return valor;
  }
  return { conteudo: visitar(entrada, ''), removidos };
}
