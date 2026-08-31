import { describe, expect, it } from 'vitest';
import { iniciaisEmpresa, podeAcessarConversas } from './mensagens-persistentes';

describe('conversas persistentes', () => {
  it('respeita a hierarquia cumulativa interna', () => {
    expect(podeAcessarConversas('consulta')).toBe(false);
    expect(podeAcessarConversas('tecnico')).toBe(true);
    expect(podeAcessarConversas('validador')).toBe(true);
    expect(podeAcessarConversas('administrador')).toBe(true);
  });

  it('gera iniciais estáveis para a lista de empresas', () => {
    expect(iniciaisEmpresa('Indústria Horizonte')).toBe('IH');
    expect(iniciaisEmpresa('  Empresa  ')).toBe('E');
    expect(iniciaisEmpresa('')).toBe('CL');
  });
});
