import { describe, expect, it } from 'vitest';
import { agruparLinhasOrcamento } from './agrupar-orcamentos';

describe('agrupamento visual de orçamentos', () => {
  it('mantém uma proposta e reúne seus equipamentos na ordem recebida', () => {
    const linhas = agruparLinhasOrcamento([
      { versao_id: 'v1', equipamento_nome: 'DuraMax', horas: 13, custo_hora_congelado: 120, estado: 'rascunho' },
      { versao_id: 'v1', equipamento_nome: 'PRISMO', horas: 12, custo_hora_congelado: 160, estado: 'rascunho' },
    ]);

    expect(linhas).toHaveLength(1);
    expect(linhas[0].usos_equipamentos).toEqual([
      { equipamento_nome: 'DuraMax', horas: 13, custo_hora_congelado: 120 },
      { equipamento_nome: 'PRISMO', horas: 12, custo_hora_congelado: 160 },
    ]);
  });

  it('não combina versões diferentes', () => {
    const linhas = agruparLinhasOrcamento([
      { versao_id: 'v1', equipamento_nome: 'DuraMax', horas: 3, custo_hora_congelado: null },
      { versao_id: 'v2', equipamento_nome: 'ATOS Q', horas: 4, custo_hora_congelado: null },
    ]);
    expect(linhas.map((item) => item.versao_id)).toEqual(['v1', 'v2']);
  });
});
