import { describe, expect, it } from 'vitest';
import { equipamentosPublicos, encontrarEquipamento } from './equipamentos';

describe('catálogo público de equipamentos', () => {
  it('publica somente os seis equipamentos atuais', () => {
    expect(equipamentosPublicos).toHaveLength(6);
    expect(equipamentosPublicos.some(({ nome }) => nome.toLowerCase().includes('contura'))).toBe(false);
  });

  it('mantém página, imagem em fundo branco e referência técnica para cada equipamento', () => {
    for (const equipamento of equipamentosPublicos) {
      expect(encontrarEquipamento(equipamento.slug)).toBe(equipamento);
      expect(equipamento.midias.length).toBeGreaterThanOrEqual(1);
      expect(equipamento.imagemPrincipal).toMatch(/^\/imagens\/recorte-.+-v[23]\.png$/);
      expect(equipamento.midias[0].src).toBe(equipamento.imagemPrincipal);
      expect(equipamento.midias[0].legenda).toBe('Equipamento em fundo branco');
      expect(equipamento.fonteFabricante).toMatch(/^https:\/\/www\.zeiss\.com\//);
      expect(equipamento.aplicacoes.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('não substitui mídias pendentes por material ilustrativo', () => {
    const comVideo = equipamentosPublicos.filter(({ midias }) => midias.some(({ tipo }) => tipo === 'video'));
    expect(comVideo.map(({ slug }) => slug).sort()).toEqual([
      'zeiss-atos-q',
      'zeiss-bosello-max-80',
      'zeiss-duramax',
      'zeiss-o-inspect',
      'zeiss-prismo',
      'zeiss-t-scan-hawk-2',
    ]);
    expect(encontrarEquipamento('zeiss-prismo')?.midias[1].src).toBe('/videos/zeiss-prismo-operacao-real.mp4');
    expect(encontrarEquipamento('zeiss-t-scan-hawk-2')?.midias[1].src).toBe('/videos/zeiss-t-scan-hawk-2-operacao-real.mp4');
  });
});
