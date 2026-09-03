import { describe, expect, it } from 'vitest';
import { correspondeBusca, normalizarBusca } from './busca-e-filtros';

describe('busca e filtros', () => {
  it('ignora acentos, caixa e pontuação', () => {
    expect(normalizarBusca('  Medição — Óptica 3D ')).toBe('medicao optica 3d');
  });

  it('encontra todos os termos em campos diferentes', () => {
    expect(correspondeBusca('empresa 0042', 'Empresa Árvore', 'DEM-SOL-0042')).toBe(true);
    expect(correspondeBusca('empresa 0043', 'Empresa Árvore', 'DEM-SOL-0042')).toBe(false);
  });

  it('não restringe quando a pesquisa está vazia', () => {
    expect(correspondeBusca('   ', 'qualquer conteúdo')).toBe(true);
  });
});
