import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { equipamentosDemonstracao } from './dados-demonstracao';

describe('segregação da massa demonstrativa', () => {
  it('identifica custos locais como sintéticos e demonstrativos', () => {
    for (const equipamento of equipamentosDemonstracao) {
      expect(equipamento.origem).toBe('demonstracao');
      expect(equipamento.origemFonte).toBe('massa_sintetica_v1');
      expect(equipamento.custoHora).toMatch(/^\d+\.00$/);
    }
  });

  it('não copia a fonte restrita para o seed versionado', () => {
    const seed = readFileSync(new URL('../supabase/seed.sql', import.meta.url), 'utf8');
    expect(seed).toContain("'massa_sintetica_v1'");
    expect(seed).not.toContain('Hora_custos_máquina.xls');
  });
});
