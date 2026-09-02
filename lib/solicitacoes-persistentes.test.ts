import { describe, expect, it } from 'vitest';
import { apresentarEstadoSolicitacao, podeConsultarSolicitacoes, podeCriarPrePropostaDaSolicitacao, type SolicitacaoParaPreProposta } from './solicitacoes-persistentes';

function solicitacao(parcial: Partial<SolicitacaoParaPreProposta> = {}): SolicitacaoParaPreProposta {
  return {
    id: 'publica',
    codigo: 17,
    nome: 'Cliente Demo',
    email: 'cliente@example.test',
    empresa: 'Empresa Demo',
    necessidade: 'medicao-inspecao-dimensional',
    estado: 'ativada',
    criado_em: '2026-08-31T00:00:00.000Z',
    solicitacao_id: 'solicitacao',
    servico_id: 'servico',
    descricao: 'Medição demonstrativa',
    quantidade: 2,
    prazo_pagamento_dias: 30,
    tem_pre_proposta: false,
    estado_pre_proposta: null,
    cliente_existente: true,
    ...parcial,
  };
}

describe('solicitações persistentes da homologação', () => {
  it('mantém a hierarquia cumulativa dos perfis internos', () => {
    expect(podeConsultarSolicitacoes('consulta')).toBe(false);
    expect(podeConsultarSolicitacoes('tecnico')).toBe(true);
    expect(podeConsultarSolicitacoes('validador')).toBe(true);
    expect(podeConsultarSolicitacoes('administrador')).toBe(true);
  });

  it('distingue entrada recebida de portal já ativado', () => {
    expect(apresentarEstadoSolicitacao('recebida').rotulo).toBe('Aguardando ativação');
    expect(apresentarEstadoSolicitacao('ativada').rotulo).toBe('Portal ativado');
    expect(apresentarEstadoSolicitacao('outro').rotulo).toBe('Estado desconhecido');
  });

  it('libera a pré-proposta apenas para solicitação ativada e ainda sem proposta', () => {
    expect(podeCriarPrePropostaDaSolicitacao(solicitacao())).toBe(true);
    expect(podeCriarPrePropostaDaSolicitacao(solicitacao({ estado: 'recebida', solicitacao_id: null }))).toBe(false);
    expect(podeCriarPrePropostaDaSolicitacao(solicitacao({ tem_pre_proposta: true, estado_pre_proposta: 'rascunho' }))).toBe(false);
  });
});
