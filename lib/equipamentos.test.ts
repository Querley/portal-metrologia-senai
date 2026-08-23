import { describe, expect, it } from 'vitest';
import { equipamentosPublicos, encontrarEquipamento } from './equipamentos';

describe('catálogo público de equipamentos', () => {
  it('publica somente os seis equipamentos atuais', () => {
    expect(equipamentosPublicos).toHaveLength(6);
    expect(equipamentosPublicos.some(({ nome }) => nome.toLowerCase().includes('contura'))).toBe(false);
  });

  it('mantém página, mídia e referência técnica para cada equipamento', () => {
    for (const equipamento of equipamentosPublicos) {
      expect(encontrarEquipamento(equipamento.slug)).toBe(equipamento);
      expect(equipamento.midias.length).toBeGreaterThan(1);
      expect(equipamento.fonteFabricante).toMatch(/^https:\/\/www\.zeiss\.com\//);
      expect(equipamento.aplicacoes.length).toBeGreaterThanOrEqual(4);
    }
  });
});
