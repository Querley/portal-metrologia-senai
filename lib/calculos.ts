import Decimal from 'decimal.js';
import type { ItemOrcamentoEntrada } from './contratos';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export type ItemCalculado = {
  custo: Decimal;
  precoAntesAjuste: Decimal;
  ajusteRateado: Decimal;
  precoFinal: Decimal;
};

export const decimal = (valor: Decimal.Value) => new Decimal(valor);
export const centavos = (valor: Decimal.Value) => decimal(valor).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

export function calcularCustoItem(item: ItemOrcamentoEntrada): Decimal {
  return item.usos.reduce(
    (total, uso) => total.plus(decimal(uso.horas).times(uso.custoHora)),
    decimal(item.custosExtras),
  );
}

export function calcularProposta(itens: ItemOrcamentoEntrada[], ajusteComercial: Decimal.Value = 0): ItemCalculado[] {
  if (itens.length === 0) return [];
  const preliminares = itens.map((item) => {
    const custo = calcularCustoItem(item);
    return { custo, precoAntesAjuste: custo.times(decimal(1).plus(decimal(item.percentualLucro).div(100))) };
  });
  const subtotal = preliminares.reduce((soma, item) => soma.plus(item.precoAntesAjuste), decimal(0));
  const ajuste = decimal(ajusteComercial);
  let restante = ajuste;
  return preliminares.map((item, indice) => {
    const ultimo = indice === preliminares.length - 1;
    const rateado = ultimo ? restante : subtotal.eq(0) ? decimal(0) : ajuste.times(item.precoAntesAjuste).div(subtotal);
    restante = restante.minus(rateado);
    return { ...item, ajusteRateado: rateado, precoFinal: item.precoAntesAjuste.plus(rateado) };
  });
}

export function converterDeBrl(valorBrl: Decimal.Value, cotacaoBrl: Decimal.Value): Decimal {
  const cotacao = decimal(cotacaoBrl);
  if (cotacao.lte(0)) throw new Error('A cotação deve ser positiva.');
  return decimal(valorBrl).div(cotacao);
}

export function margem(valor: Decimal.Value, custo: Decimal.Value): Decimal | null {
  const valorDecimal = decimal(valor);
  return valorDecimal.eq(0) ? null : valorDecimal.minus(custo).div(valorDecimal);
}

export function desvio(realizado: Decimal.Value, estimado: Decimal.Value): Decimal | null {
  const estimadoDecimal = decimal(estimado);
  return estimadoDecimal.eq(0) ? null : decimal(realizado).minus(estimadoDecimal).div(estimadoDecimal);
}

export function estaAssertivo(realizado: Decimal.Value, estimado: Decimal.Value, toleranciaPercentual = 15): boolean | null {
  const valor = desvio(realizado, estimado);
  return valor === null ? null : valor.abs().lte(decimal(toleranciaPercentual).div(100));
}

export function formatarDinheiro(valor: Decimal.Value, moeda: 'BRL' | 'USD' | 'EUR' = 'BRL', idioma = 'pt-BR'): string {
  return new Intl.NumberFormat(idioma, { style: 'currency', currency: moeda, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(centavos(valor).toNumber());
}
