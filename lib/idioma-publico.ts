export const idiomasPublicos = ['pt-BR', 'en', 'de'] as const;
export type IdiomaPublico = (typeof idiomasPublicos)[number];

export const rotulosIdiomaPublico: Record<IdiomaPublico, string> = {
  'pt-BR': 'PT-BR',
  en: 'EN',
  de: 'DE',
};

export function idiomaPublicoValido(valor: unknown): valor is IdiomaPublico {
  return typeof valor === 'string' && idiomasPublicos.includes(valor as IdiomaPublico);
}

export function resolverIdiomaPublico(url: string, preferenciaSalva?: string | null): IdiomaPublico {
  try {
    const informado = new URL(url, 'https://portal.local').searchParams.get('lang');
    if (idiomaPublicoValido(informado)) return informado;
  } catch {
    // Uma URL inválida usa a preferência salva ou o idioma canônico.
  }
  return idiomaPublicoValido(preferenciaSalva) ? preferenciaSalva : 'pt-BR';
}

export function urlComIdioma(url: string, idioma: IdiomaPublico): string {
  const destino = new URL(url, 'https://portal.local');
  if (idioma === 'pt-BR') destino.searchParams.delete('lang');
  else destino.searchParams.set('lang', idioma);
  return `${destino.pathname}${destino.search}${destino.hash}`;
}
