import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { EstadoPropostaSchema } from './contratos';
import { calcularPreviaOrcamento, normalizarEntradaOrcamento, normalizarJustificativaDecisao, podeAprovarOrcamento, podeConsultarOrcamentos, podeCriarRascunhoOrcamento, podeDecidirOrcamento, podePublicarOrcamento } from './orcamentos-persistentes';

describe('autorização de orçamentos persistentes', () => {
  it('mantém a hierarquia cumulativa para consulta e criação', () => {
    expect(podeConsultarOrcamentos('consulta')).toBe(false);
    expect(podeConsultarOrcamentos('tecnico')).toBe(true);
    expect(podeConsultarOrcamentos('validador')).toBe(true);
    expect(podeConsultarOrcamentos('administrador')).toBe(true);
    expect(podeCriarRascunhoOrcamento('consulta')).toBe(false);
    expect(podeCriarRascunhoOrcamento('tecnico')).toBe(true);
    expect(podeCriarRascunhoOrcamento('validador')).toBe(true);
    expect(podeCriarRascunhoOrcamento('administrador')).toBe(true);
  });

  it('reserva a aprovação para Validador e Administrador', () => {
    expect(podeAprovarOrcamento('consulta')).toBe(false);
    expect(podeAprovarOrcamento('tecnico')).toBe(false);
    expect(podeAprovarOrcamento('validador')).toBe(true);
    expect(podeAprovarOrcamento('administrador')).toBe(true);
  });

  it('distingue aprovação de publicação no contrato de estados', () => {
    expect(EstadoPropostaSchema.parse('aprovada')).toBe('aprovada');
    expect(EstadoPropostaSchema.parse('devolvida')).toBe('devolvida');
    expect(EstadoPropostaSchema.parse('rejeitada')).toBe('rejeitada');
  });

  it('reserva decisões para Validador e Administrador e publicação para Administrador', () => {
    expect(podeDecidirOrcamento('tecnico')).toBe(false);
    expect(podeDecidirOrcamento('validador')).toBe(true);
    expect(podeDecidirOrcamento('administrador')).toBe(true);
    expect(podePublicarOrcamento('validador')).toBe(false);
    expect(podePublicarOrcamento('administrador')).toBe(true);
  });

  it('exige justificativa útil para devolver ou rejeitar', () => {
    expect(normalizarJustificativaDecisao('  Corrigir horas estimadas.  ')).toBe('Corrigir horas estimadas.');
    expect(normalizarJustificativaDecisao('não')).toBeNull();
    expect(normalizarJustificativaDecisao('x'.repeat(501))).toBeNull();
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
    const migracao = readFileSync(new URL('../supabase/migrations/202608270009_fluxo_aprovacao_orcamento.sql', import.meta.url), 'utf8');
    expect(migracao).toContain("perfil not in ('tecnico', 'validador', 'administrador')");
    expect(migracao).toContain("origem_sessao is distinct from 'demonstracao'::origem_dado");
    expect(migracao).toContain('custo_hora_congelado');
    expect(migracao).toContain("'criar_orcamento_demonstrativo'");
    expect(migracao).not.toMatch(/delete\s+from/i);
  });

  it('restringe envio ao autor e aprovação a Validador ou Administrador', () => {
    const migracao = readFileSync(new URL('../supabase/migrations/202608270009_fluxo_aprovacao_orcamento.sql', import.meta.url), 'utf8');
    expect(migracao).toContain('Somente o autor pode enviar este orçamento.');
    expect(migracao).toContain("perfil not in ('validador', 'administrador')");
    expect(migracao).toContain("estado_atual is distinct from 'rascunho'::estado_proposta");
    expect(migracao).toContain("estado_atual is distinct from 'em_validacao'::estado_proposta");
    expect(migracao).toContain("'enviar_orcamento_validacao'");
    expect(migracao).toContain("'aprovar_orcamento_demonstrativo'");
  });

  it('protege devolução, rejeição e publicação no servidor', () => {
    const estados = readFileSync(new URL('../supabase/migrations/202608270010_estados_decisao_orcamento.sql', import.meta.url), 'utf8');
    const fluxo = readFileSync(new URL('../supabase/migrations/202608270011_decisao_publicacao_orcamento.sql', import.meta.url), 'utf8');
    expect(estados).toContain("add value if not exists 'devolvida'");
    expect(estados).toContain("add value if not exists 'rejeitada'");
    expect(fluxo).toContain("perfil not in ('validador', 'administrador')");
    expect(fluxo).toContain('A justificativa deve ter entre 5 e 500 caracteres.');
    expect(fluxo).toContain("perfil is distinct from 'administrador'::perfil_interno");
    expect(fluxo).toContain('A publicação exige PDF privado e hash imutável.');
    expect(fluxo).toContain("estado_atual not in ('rascunho'::estado_proposta, 'devolvida'::estado_proposta)");
    expect(fluxo).not.toMatch(/delete\s+from/i);
  });

  it('isola por tabela a validação de origem compartilhada', () => {
    const migracao = readFileSync(new URL('../supabase/migrations/202608260007_corrige_gatilho_origem.sql', import.meta.url), 'utf8');
    expect(migracao).toContain("if tg_table_name = 'versoes_proposta' then");
    expect(migracao).toContain("elsif tg_table_name = 'itens_proposta' then");
    expect(migracao).toContain("else\n    raise exception 'Tabela não suportada");
    expect(migracao).not.toMatch(/delete\s+from/i);
  });
});
