import { describe, expect, it } from 'vitest';
import { apresentarEstadoSolicitacao, podeConsultarSolicitacoes } from './solicitacoes-persistentes';

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
});
