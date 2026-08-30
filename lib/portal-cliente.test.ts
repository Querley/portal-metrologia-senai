import { describe, expect, it } from 'vitest';
import { situacaoEtapasCliente, tituloServicoCliente, type EtapaCliente } from './portal-cliente';

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

  it('distingue etapa em andamento de serviço concluído', () => {
    expect(situacaoEtapasCliente([etapa({ estado: 'em_andamento', progresso: 50 })])).toEqual({
      titulo: 'Digitalização',
      descricao: 'Etapa em andamento: 50% concluída.',
    });
    expect(situacaoEtapasCliente([etapa({ estado: 'concluida', progresso: 100 })]).titulo).toBe('Serviço concluído');
  });

  it('traduz o slug técnico para o título público', () => {
    expect(tituloServicoCliente('escaneamento-3d-digitalizacao-pecas')).toBe('Escaneamento 3D e digitalização de peças');
  });
});
