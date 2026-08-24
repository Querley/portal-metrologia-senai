import type { CasoHistorico } from './recomendacao';

export const equipamentosDemonstracao = [
  { id: 'duramax', nome: 'CMM DuraMax', origem: 'demonstracao', origemFonte: 'massa_sintetica_v1', custoHora: '120.00' },
  { id: 'o-inspect', nome: 'CMM O-INSPECT', origem: 'demonstracao', origemFonte: 'massa_sintetica_v1', custoHora: '140.00' },
  { id: 'prismo', nome: 'CMM PRISMO', origem: 'demonstracao', origemFonte: 'massa_sintetica_v1', custoHora: '160.00' },
  { id: 'max-80', nome: 'BOSELLO MAX 80', origem: 'demonstracao', origemFonte: 'massa_sintetica_v1', custoHora: '180.00' },
  { id: 'atos-q', nome: 'ATOS Q 8M', origem: 'demonstracao', origemFonte: 'massa_sintetica_v1', custoHora: '110.00' },
  { id: 't-scan-hawk-2', nome: 'T-SCAN hawk 2', origem: 'demonstracao', origemFonte: 'massa_sintetica_v1', custoHora: '100.00' },
] as const;

export const casosDemonstracao: CasoHistorico[] = Array.from({ length: 16 }, (_, indice) => ({
  id: `DEM-${String(indice + 1).padStart(3, '0')}`,
  origem: 'demonstracao',
  servicoId: 'medicao-tridimensional',
  quantidade: 10 + (indice % 4) * 5,
  horasEstimadas: 10 + indice * 0.45,
  horasRealizadas: 9.8 + indice * 0.55 + (indice % 3) * 0.4,
  caracteristicas: indice % 2 ? ['aco', 'geometria-complexa'] : ['aluminio', 'geometria-complexa'],
  recursos: indice % 3 ? ['duramax'] : ['prismo'],
  servicoConcluido: true,
  licaoFormalizada: true,
}));
