import Decimal from 'decimal.js';
import type { Origem } from './contratos';
import { decimal } from './calculos';

export type CasoHistorico = {
  id: string;
  origem: Origem;
  servicoId: string;
  quantidade: number;
  horasEstimadas: number;
  horasRealizadas: number;
  caracteristicas: string[];
  recursos: string[];
  servicoConcluido: boolean;
  licaoFormalizada: boolean;
};

export type Recomendacao = {
  quantidadeCasos: number;
  confianca: 'sem_base' | 'baixa' | 'media' | 'alta';
  q1: Decimal | null;
  mediana: Decimal | null;
  q3: Decimal | null;
  fatorCorrecao: Decimal | null;
  horasSugeridas: Decimal | null;
  casos: CasoHistorico[];
};

function medianaOrdenada(valores: Decimal[]): Decimal {
  const meio = Math.floor(valores.length / 2);
  return valores.length % 2 ? valores[meio] : valores[meio - 1].plus(valores[meio]).div(2);
}

export function quartis(valores: Decimal.Value[]): { q1: Decimal; mediana: Decimal; q3: Decimal } | null {
  if (!valores.length) return null;
  const ordenados = valores.map(decimal).sort((a, b) => a.comparedTo(b));
  const meio = Math.floor(ordenados.length / 2);
  const inferior = ordenados.slice(0, meio || 1);
  const superior = ordenados.slice(ordenados.length % 2 ? meio + 1 : meio);
  return { q1: medianaOrdenada(inferior), mediana: medianaOrdenada(ordenados), q3: medianaOrdenada(superior.length ? superior : inferior) };
}

export function recomendarHoras(entrada: { origem: Origem; servicoId: string; quantidade: number; caracteristicas: string[]; recursos: string[] }, todos: CasoHistorico[]): Recomendacao {
  const elegiveis = todos.filter((caso) => caso.origem === entrada.origem && caso.servicoId === entrada.servicoId && caso.servicoConcluido && caso.licaoFormalizada && caso.quantidade > 0);
  const pontuar = (caso: CasoHistorico) => caso.caracteristicas.filter((item) => entrada.caracteristicas.includes(item)).length * 2 + caso.recursos.filter((item) => entrada.recursos.includes(item)).length;
  const casos = [...elegiveis].sort((a, b) => pontuar(b) - pontuar(a) || a.id.localeCompare(b.id));
  const normalizadas = casos.map((caso) => decimal(caso.horasRealizadas).div(caso.quantidade).times(entrada.quantidade));
  const razoes = casos.filter((caso) => caso.horasEstimadas > 0).map((caso) => decimal(caso.horasRealizadas).div(caso.horasEstimadas));
  if (!casos.length) return { quantidadeCasos: 0, confianca: 'sem_base', q1: null, mediana: null, q3: null, fatorCorrecao: null, horasSugeridas: null, casos: [] };
  const resumo = quartis(normalizadas)!;
  const confianca = casos.length < 5 ? 'baixa' : casos.length < 15 ? 'media' : 'alta';
  const fatorCorrecao = casos.length >= 15 && razoes.length ? quartis(razoes)!.mediana : null;
  return { quantidadeCasos: casos.length, confianca, ...resumo, fatorCorrecao, horasSugeridas: resumo.mediana, casos };
}

export function exigeJustificativa(estimativa: Decimal.Value, recomendacao: Recomendacao): boolean {
  if (!recomendacao.q1 || !recomendacao.q3 || recomendacao.quantidadeCasos < 5) return false;
  const valor = decimal(estimativa);
  return valor.lt(recomendacao.q1) || valor.gt(recomendacao.q3);
}
