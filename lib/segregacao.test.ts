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

  it('não apaga custos reais em migrações compartilhadas', () => {
    const migracao = readFileSync(new URL('../supabase/migrations/202608240004_perfil_interno_seguro.sql', import.meta.url), 'utf8');
    expect(migracao).not.toMatch(/delete\s+from\s+custos_equipamento/i);
  });

  it('restringe leitura e versionamento de custos por perfil e origem', () => {
    const migracao = readFileSync(new URL('../supabase/migrations/202608260005_acesso_versionamento_custos.sql', import.meta.url), 'utf8');
    expect(migracao).toContain("perfil_interno_atual() in ('validador', 'administrador')");
    expect(migracao).toContain('and origem = origem_ativa_atual()');
    expect(migracao).toContain("perfil is distinct from 'administrador'::perfil_interno");
    expect(migracao).toContain("'versionar_custo'");
    expect(migracao).not.toMatch(/delete\s+from\s+custos_equipamento/i);
  });
});
