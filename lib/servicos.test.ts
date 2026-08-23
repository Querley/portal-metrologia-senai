import { describe, expect, it } from 'vitest';
import { servicosOficiais } from './servicos';

describe('catálogo oficial de serviços', () => {
  it('mantém os dez serviços informados pelo Centro', () => {
    expect(servicosOficiais).toHaveLength(10);
    expect(new Set(servicosOficiais.map(({ slug }) => slug)).size).toBe(10);
  });

  it('inclui tomografia, nacionalização e biblioteca digital', () => {
    const titulos = servicosOficiais.map(({ titulo }) => titulo).join(' ');
    expect(titulos).toContain('Tomografia industrial');
    expect(titulos).toContain('Nacionalização');
    expect(titulos).toContain('almoxarifado virtual');
  });
});
