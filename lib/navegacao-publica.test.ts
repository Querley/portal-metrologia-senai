import { describe, expect, it } from 'vitest';
import { acoesNavegacaoPublica, linksNavegacaoPublica } from './navegacao-publica';

describe('navegação pública', () => {
  it('mantém apenas destinos úteis e iguais para desktop e mobile', () => {
    const rotulos = [...linksNavegacaoPublica, ...acoesNavegacaoPublica].map((item) => item.rotulo);

    expect(rotulos).toEqual([
      'Início',
      'Serviços',
      'Como funciona',
      'Equipamentos',
      'Entrar',
      'Solicitar orçamento',
    ]);
    expect(rotulos).not.toContain('Institucional');
    expect(rotulos).not.toContain('Privacidade');
  });
});
