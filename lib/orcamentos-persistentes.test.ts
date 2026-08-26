import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { calcularPreviaOrcamento, normalizarEntradaOrcamento, podeConsultarOrcamentos, podeCriarRascunhoOrcamento } from './orcamentos-persistentes';

describe('autorização de orçamentos persistentes', () => {
  it('permite consulta para Validador e Administrador', () => {
    expect(podeConsultarOrcamentos('consulta')).toBe(false);
    expect(podeConsultarOrcamentos('tecnico')).toBe(false);
    expect(podeConsultarOrcamentos('validador')).toBe(true);
    expect(podeConsultarOrcamentos('administrador')).toBe(true);
  });

  it('mantém criação de rascunho exclusiva do Administrador', () => {
    expect(podeCriarRascunhoOrcamento('validador')).toBe(false);
    expect(podeCriarRascunhoOrcamento('administrador')).toBe(true);
  });
});

describe('cálculo e persistência do orçamento', () => {
  it('normaliza a entrada e calcula a prévia com precisão decimal', () => {
    const entrada = normalizarEntradaOrcamento({ descricao: ' Inspeção de lote ', quantidade: '20', horas: '2,5', custosExtras: '10,25', percentualLucro: '20' });
    expect(entrada).toEqual({ descricao: 'Inspeção de lote', quantidade: '20', horas: '2.5', custosExtras: '10.25', percentualLucro: '20' });
    const previa = calcularPreviaOrcamento(entrada!, '100.005');
    expect(previa?.custo.toString()).toBe('260.2625');
    expect(previa?.precoFinal.toDecimalPlaces(2).toString()).toBe('312.32');
  });

  it('recusa quantidade nula, valores negativos e margem de -100%', () => {
    expect(normalizarEntradaOrcamento({ descricao: 'Teste', quantidade: '0', horas: '1', custosExtras: '0', percentualLucro: '10' })).toBeNull();
    expect(normalizarEntradaOrcamento({ descricao: 'Teste', quantidade: '1', horas: '-1', custosExtras: '0', percentualLucro: '10' })).toBeNull();
    expect(normalizarEntradaOrcamento({ descricao: 'Teste', quantidade: '1', horas: '1', custosExtras: '0', percentualLucro: '-100' })).toBeNull();
  });

  it('protege criação, congela custo vigente e registra auditoria no servidor', () => {
    const migracao = readFileSync(new URL('../supabase/migrations/202608260006_orcamento_demonstrativo_persistente.sql', import.meta.url), 'utf8');
    expect(migracao).toContain("perfil is distinct from 'administrador'::perfil_interno");
    expect(migracao).toContain("origem_sessao is distinct from 'demonstracao'::origem_dado");
    expect(migracao).toContain('custo_hora_congelado');
    expect(migracao).toContain("'criar_orcamento_demonstrativo'");
    expect(migracao).not.toMatch(/delete\s+from/i);
  });

  it('isola por tabela a validação de origem compartilhada', () => {
    const migracao = readFileSync(new URL('../supabase/migrations/202608260007_corrige_gatilho_origem.sql', import.meta.url), 'utf8');
    expect(migracao).toContain("if tg_table_name = 'versoes_proposta' then");
    expect(migracao).toContain("elsif tg_table_name = 'itens_proposta' then");
    expect(migracao).toContain("else\n    raise exception 'Tabela não suportada");
    expect(migracao).not.toMatch(/delete\s+from/i);
  });
});
