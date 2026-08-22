import { describe, expect, it } from 'vitest';
import { calcularProposta, converterDeBrl, desvio, estaAssertivo, margem } from './calculos';
import { casosDemonstracao } from './dados-demonstracao';
import { exigeJustificativa, quartis, recomendarHoras } from './recomendacao';
import { sanitizarParaIa } from './seguranca-ia';

describe('cálculos de orçamento', () => {
  it('calcula custo, lucro e rateia ajuste preservando o total', () => {
    const itens = calcularProposta([
      { servicoId: 'a', descricao: 'Item A', quantidade: '1', usos: [{ maquinaId: 'm1', horas: '2', custoHora: '100.005' }], custosExtras: '50', percentualLucro: '20' },
      { servicoId: 'b', descricao: 'Item B', quantidade: '1', usos: [{ maquinaId: 'm2', horas: '1', custoHora: '200' }], custosExtras: '0', percentualLucro: '10' },
    ], '-20');
    expect(itens[0].custo.toString()).toBe('250.01');
    expect(itens.reduce((soma, item) => soma.plus(item.ajusteRateado), itens[0].ajusteRateado.minus(itens[0].ajusteRateado)).toString()).toBe('-20');
    expect(itens.reduce((soma, item) => soma.plus(item.precoFinal), itens[0].precoFinal.minus(itens[0].precoFinal)).toDecimalPlaces(2).toString()).toBe('500.01');
  });

  it('converte cotação congelada e trata divisões por zero', () => {
    expect(converterDeBrl('500', '5').toString()).toBe('100');
    expect(margem(0, 10)).toBeNull();
    expect(desvio(10, 0)).toBeNull();
  });

  it('avalia tolerância inclusiva de 15%', () => {
    expect(estaAssertivo(115, 100, 15)).toBe(true);
    expect(estaAssertivo(115.01, 100, 15)).toBe(false);
  });
});

describe('recomendação determinística', () => {
  it('calcula quartis e níveis por volume', () => {
    const resumo = quartis([1, 2, 3, 4, 5]);
    expect(resumo?.mediana.toString()).toBe('3');
    expect(recomendarHoras({ origem: 'demonstracao', servicoId: 'medicao-tridimensional', quantidade: 20, caracteristicas: ['aco'], recursos: ['duramax'] }, casosDemonstracao).confianca).toBe('alta');
  });

  it('ignora origem diferente e lição não formalizada', () => {
    const alterado = casosDemonstracao.map((caso) => ({ ...caso, origem: 'real' as const, licaoFormalizada: false }));
    expect(recomendarHoras({ origem: 'demonstracao', servicoId: 'medicao-tridimensional', quantidade: 1, caracteristicas: [], recursos: [] }, alterado).quantidadeCasos).toBe(0);
  });

  it('exige justificativa fora de Q1–Q3 quando há base suficiente', () => {
    const recomendacao = recomendarHoras({ origem: 'demonstracao', servicoId: 'medicao-tridimensional', quantidade: 20, caracteristicas: [], recursos: [] }, casosDemonstracao);
    expect(exigeJustificativa(999, recomendacao)).toBe(true);
  });
});

describe('sanitização para IA', () => {
  it('remove campos proibidos e identificadores em texto', () => {
    const resultado = sanitizarParaIa({ cliente: 'Empresa X', margem: 0.4, licao: 'Falar com maria@empresa.com ou (11) 99999-0000' });
    expect(resultado.removidos).toEqual(['cliente', 'margem']);
    expect(JSON.stringify(resultado.conteudo)).not.toContain('maria@empresa.com');
    expect(JSON.stringify(resultado.conteudo)).not.toContain('99999-0000');
  });
});
