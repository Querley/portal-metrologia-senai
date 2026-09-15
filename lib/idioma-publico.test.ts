import { describe, expect, it } from 'vitest';
import { resolverIdiomaPublico, urlComIdioma } from './idioma-publico';

describe('idioma público', () => {
  it('prioriza o idioma válido informado na URL', () => {
    expect(resolverIdiomaPublico('https://portal.test/catalogo?lang=de', 'en')).toBe('de');
  });

  it('usa a preferência salva e volta ao português para valores inválidos', () => {
    expect(resolverIdiomaPublico('/catalogo', 'en')).toBe('en');
    expect(resolverIdiomaPublico('/catalogo?lang=fr', 'fr')).toBe('pt-BR');
  });

  it('preserva rota e fragmento ao alternar idioma', () => {
    expect(urlComIdioma('/catalogo?servico=raios-x#equipamentos', 'de')).toBe('/catalogo?servico=raios-x&lang=de#equipamentos');
    expect(urlComIdioma('/catalogo?lang=en#equipamentos', 'pt-BR')).toBe('/catalogo#equipamentos');
  });
});
