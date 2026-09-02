import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { calcularProgressoExecucao, etapasConcluidas, normalizarAtualizacaoEtapa, podeAtribuirResponsavel, podeDecidirFechamento, podeOperarExecucoes, validarFechamento, type EtapaExecucaoInterna } from './execucoes-persistentes';

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

  it('reserva a decisão do fechamento ao Validador e Administrador', () => {
    expect(podeDecidirFechamento('tecnico')).toBe(false);
    expect(podeDecidirFechamento('validador')).toBe(true);
    expect(podeDecidirFechamento('administrador')).toBe(true);
  });

  it('reserva a atribuição formal ao Administrador', () => {
    expect(podeAtribuirResponsavel('tecnico')).toBe(false);
    expect(podeAtribuirResponsavel('validador')).toBe(false);
    expect(podeAtribuirResponsavel('administrador')).toBe(true);
  });

  it('só libera fechamento depois de todas as etapas', () => {
    expect(etapasConcluidas([])).toBe(false);
    expect(etapasConcluidas([etapa(100)])).toBe(true);
    expect(etapasConcluidas([etapa(100), etapa(40)])).toBe(false);
  });

  it('valida horas, observação e causa condicional', () => {
    const base = {
      equipamentos: [{ equipamento_id: 'eq-1', nome: 'Equipamento', horas_estimadas: 2, horas_reais: null }],
      horas: { 'eq-1': 2.5 }, custosExtras: 0, retrabalho: false, mudancaEscopo: false,
      causa: '', observacoes: 'Serviço executado conforme o plano.', aprendizado: '',
    };
    expect(validarFechamento(base)).toBeNull();
    expect(validarFechamento({ ...base, retrabalho: true })).toMatch(/causa principal/i);
    expect(validarFechamento({ ...base, horas: { 'eq-1': -1 } })).toMatch(/horas reais/i);
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

  it('fecha somente por decisão de Validador ou Administrador no servidor', () => {
    const migracao = readFileSync(new URL('../supabase/migrations/202609010023_fechamento_execucao_aprovado.sql', import.meta.url), 'utf8');
    expect(migracao).toContain("perfil not in ('validador', 'administrador')");
    expect(migracao).toContain("fechamento_estado = case when decisao = 'aprovar' then 'aprovado' else 'devolvido' end");
    expect(migracao).toContain("estado = case when decisao = 'aprovar' then 'concluido'::estado_servico else estado end");
  });

  it('restringe Técnico à execução atribuída em RPC, gatilhos e RLS', () => {
    const migracao = readFileSync(new URL('../supabase/migrations/202609010028_atribuicao_responsavel_execucao.sql', import.meta.url), 'utf8');
    expect(migracao).toContain("perfil in ('validador', 'administrador') or ex.responsavel_id = usuario");
    expect(migracao).toContain('Tecnico pode operar somente execucao demonstrativa atribuida a ele.');
    expect(migracao).toContain("perfil_interno_atual() = 'tecnico' and ex.responsavel_id = auth.uid()");
    expect(migracao).toContain('pode_ver_execucao_demonstrativa(execucao_id, visivel_cliente)');
    expect(migracao).toContain("perfil_atual is distinct from 'administrador'::perfil_interno");
    expect(migracao).toContain("pf.perfil_interno = 'tecnico'");
  });
});
