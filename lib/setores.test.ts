import { describe, expect, it } from 'vitest';
import { setoresIndustria } from './setores';
import { servicosOficiais } from './servicos';

describe('setores da indústria', () => {
  it('oferece o recorte simplificado acordado', () => {
    expect(setoresIndustria.map((setor) => setor.slug)).toEqual([
      'industria-geral',
      'automotivo-mobilidade',
      'aeronautico',
      'ferramentaria-produto',
    ]);
  });

  it('não perde nenhum serviço técnico oficial', () => {
    const mapeados = new Set(setoresIndustria.flatMap((setor) => setor.servicos));
    expect(servicosOficiais.every((servico) => mapeados.has(servico.slug))).toBe(true);
  });

  it('não referencia serviço inexistente', () => {
    const oficiais = new Set(servicosOficiais.map((servico) => servico.slug));
    expect(setoresIndustria.flatMap((setor) => setor.servicos).every((slug) => oficiais.has(slug))).toBe(true);
  });
});
