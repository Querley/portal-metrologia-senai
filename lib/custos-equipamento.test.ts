import { describe, expect, it } from 'vitest';
import { dataPosterior, normalizarCustoHora, podeConsultarCustos, podeVersionarCustos } from './custos-equipamento';

describe('permissões de custos-hora', () => {
  it('permite consulta somente para Validador e Administrador', () => {
    expect(podeConsultarCustos('consulta')).toBe(false);
    expect(podeConsultarCustos('tecnico')).toBe(false);
    expect(podeConsultarCustos('validador')).toBe(true);
    expect(podeConsultarCustos('administrador')).toBe(true);
  });

  it('permite versionamento somente para Administrador', () => {
    expect(podeVersionarCustos('validador')).toBe(false);
    expect(podeVersionarCustos('administrador')).toBe(true);
  });
});

describe('entrada de custos-hora', () => {
  it('normaliza decimais sem perder precisão', () => {
    expect(normalizarCustoHora(' 123,456789 ')).toBe('123.456789');
    expect(normalizarCustoHora('0')).toBe('0');
  });

  it('recusa valores negativos, excedentes e inválidos', () => {
    expect(normalizarCustoHora('-1')).toBeNull();
    expect(normalizarCustoHora('1234567890123')).toBeNull();
    expect(normalizarCustoHora('1.1234567')).toBeNull();
    expect(normalizarCustoHora('texto')).toBeNull();
  });

  it('calcula a primeira data posterior à vigência atual', () => {
    expect(dataPosterior('2026-08-31')).toBe('2026-09-01');
  });
});

