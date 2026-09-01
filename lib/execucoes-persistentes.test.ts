import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { calcularProgressoExecucao, normalizarAtualizacaoEtapa, podeOperarExecucoes, type EtapaExecucaoInterna } from './execucoes-persistentes';

function etapa(progresso: number): EtapaExecucaoInterna {
  return {
    id: crypto.randomUUID(),
    ordem: 1,
    titulo: 'Planejamento',
    descricao: null,
    estado: progresso === 100 ? 'concluida' : progresso === 0 ? 'a_fazer' : 'em_andamento',
    progresso,
    visivel_cliente: true,
    atualizada_em: '2026-09-01T12:00:00.000Z',
  };
}

describe('execuções persistentes', () => {
  it('mantém a hierarquia cumulativa na operação', () => {
    expect(podeOperarExecucoes('consulta')).toBe(false);
    expect(podeOperarExecucoes('tecnico')).toBe(true);
    expect(podeOperarExecucoes('validador')).toBe(true);
    expect(podeOperarExecucoes('administrador')).toBe(true);
  });

  it('calcula o progresso médio das macroetapas', () => {
    expect(calcularProgressoExecucao([])).toBe(0);
    expect(calcularProgressoExecucao([etapa(100), etapa(50), etapa(0)])).toBe(50);
  });

  it('aceita somente combinações coerentes de estado e progresso', () => {
    expect(normalizarAtualizacaoEtapa('a_fazer', 0)).toEqual({ estado: 'a_fazer', progresso: 0 });
    expect(normalizarAtualizacaoEtapa('em_andamento', 50)).toEqual({ estado: 'em_andamento', progresso: 50 });
    expect(normalizarAtualizacaoEtapa('concluida', 100)).toEqual({ estado: 'concluida', progresso: 100 });
    expect(normalizarAtualizacaoEtapa('em_andamento', 100)).toBeNull();
    expect(normalizarAtualizacaoEtapa('concluida', 80)).toBeNull();
  });

  it('restringe escrita direta e audita atualizações no servidor', () => {
    const migracao = readFileSync(new URL('../supabase/migrations/202609010022_etapas_execucao_por_servico.sql', import.meta.url), 'utf8');
    expect(migracao).toContain('revoke insert, update, delete on table etapas_execucao from authenticated');
    expect(migracao).toContain("perfil = 'tecnico' and autor_proposta is distinct from usuario");
    expect(migracao).toContain("'atualizar_etapa_execucao_demonstrativa'");
    expect(migracao).not.toMatch(/delete\s+from/i);
  });
});
