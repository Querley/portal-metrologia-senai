import type { CasoHistorico } from './recomendacao';

export const equipamentosDemonstracao = [
  { id: 'duramax', nome: 'CMM DuraMax', custoHora: '173.665147' },
  { id: 'o-inspect', nome: 'CMM O-INSPECT', custoHora: '201.444063' },
  { id: 'prismo', nome: 'CMM PRISMO', custoHora: '311.979689' },
  { id: 'max-80', nome: 'BOSELLO MAX 80', custoHora: '273.809147' },
  { id: 'atos-q', nome: 'ATOS Q 8M', custoHora: '177.155759' },
  { id: 't-scan', nome: 'T-SCAN hawk 2', custoHora: '162.234162' },
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
