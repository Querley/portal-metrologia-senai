import { describe, expect, it } from 'vitest';
import { descricaoAceiteCliente, podeAceitarPreProposta, protocoloSolicitacaoCliente, situacaoEtapasCliente, tituloServicoCliente, type EtapaCliente } from './portal-cliente';

function etapa(parcial: Partial<EtapaCliente>): EtapaCliente {
  return {
    id: 'etapa',
    titulo: 'Digitalização',
    descricao: null,
    ordem: 1,
    estado: 'a_fazer',
    progresso: 0,
    atualizada_em: '2026-08-30T12:00:00.000Z',
    ...parcial,
  };
}

describe('resumo do portal do Cliente', () => {
  it('não considera uma lista vazia como serviço concluído', () => {
    expect(situacaoEtapasCliente([]).titulo).toBe('Aguardando triagem');
  });

  it('explica separadamente o aceite e a liberação do trabalho', () => {
    expect(situacaoEtapasCliente([], null, 'publicada').titulo).toBe('Aguardando sua decisão');
    expect(situacaoEtapasCliente([], null, 'aceita').titulo).toBe('Aceite registrado');
    expect(situacaoEtapasCliente([], 'em_execucao', 'aceita').titulo).toBe('Início confirmado');
    expect(situacaoEtapasCliente([etapa({ estado: 'a_fazer', progresso: 0 })], 'em_execucao', 'aceita').titulo).toBe('Trabalho liberado');
  });

  it('permite o aceite somente da pré-proposta emitida', () => {
    expect(podeAceitarPreProposta('publicada')).toBe(true);
    expect(podeAceitarPreProposta('aceita')).toBe(false);
    expect(podeAceitarPreProposta(null)).toBe(false);
  });

  it('distingue etapa em andamento de serviço concluído', () => {
    expect(situacaoEtapasCliente([etapa({ estado: 'em_andamento', progresso: 50 })])).toEqual({
      titulo: 'Digitalização',
      descricao: 'Etapa em andamento: 50% concluída.',
    });
    expect(situacaoEtapasCliente([etapa({ estado: 'concluida', progresso: 100 })]).titulo).toBe('Etapas concluídas');
  });

  it('prioriza o encerramento aprovado sobre o estado visual das etapas', () => {
    expect(situacaoEtapasCliente([
      etapa({ estado: 'concluida', progresso: 100 }),
    ], 'concluido', 'aceita')).toEqual({
      titulo: 'Serviço concluído',
      descricao: 'O trabalho foi concluído e o encerramento foi aprovado pela equipe do laboratório.',
    });
  });

  it('atualiza a mensagem do aceite conforme o trabalho avança', () => {
    const data = (valor: string) => valor.slice(0, 10);
    expect(descricaoAceiteCliente('2026-09-01T09:00:00Z', 'em_execucao', data)).toMatch(/está em execução/i);
    expect(descricaoAceiteCliente('2026-09-01T09:00:00Z', 'concluido', data)).toMatch(/concluído e encerrado/i);
  });

  it('traduz o slug técnico para o título público', () => {
    expect(tituloServicoCliente('escaneamento-3d-digitalizacao-pecas')).toBe('Escaneamento 3D e digitalização de peças');
  });

  it('preserva o protocolo público no acompanhamento', () => {
    expect(protocoloSolicitacaoCliente({ codigo: 5, protocolo: 'DEM-SOL-0005' })).toBe('DEM-SOL-0005');
    expect(protocoloSolicitacaoCliente({ codigo: 5 })).toBe('SOL-0005');
  });
});
