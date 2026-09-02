import Decimal from 'decimal.js';
import type { PerfilInterno } from './contratos';

export type EstadoLicaoPersistente = 'em_validacao' | 'formalizada';

export type IndicadorExecucaoPersistente = {
  execucao_id: string;
  solicitacao_codigo: number | string;
  empresa_nome: string;
  servico_id: string;
  servico_slug: string;
  concluida_em: string;
  horas_estimadas: number | string;
  horas_realizadas: number | string;
  desvio_esforco: number | string | null;
  esforco_assertivo: boolean | null;
  custo_estimado: number | string | null;
  custo_realizado: number | string | null;
  desvio_custo: number | string | null;
  custo_assertivo: boolean | null;
  duracao_estimada_horas: number | string | null;
  duracao_realizada_horas: number | string | null;
  desvio_duracao: number | string | null;
  duracao_assertiva: boolean | null;
  licao_id: string | null;
  licao_estado: EstadoLicaoPersistente | null;
  licao_resumo: string | null;
  licao_assuntos: string[];
};

export type RecomendacaoPersistente = {
  quantidade_casos: number;
  confianca: 'sem_base' | 'baixa' | 'media' | 'alta';
  q1: number | string | null;
  mediana: number | string | null;
  q3: number | string | null;
  fator_correcao: number | string | null;
  horas_sugeridas: number | string | null;
  casos: Array<{ execucao_id: string; horas_normalizadas: number | string; mesmo_equipamento: boolean }>;
};

export function podeFormalizarLicao(perfil: PerfilInterno): boolean {
  return perfil === 'validador' || perfil === 'administrador';
}

export function formatarDesvio(valor: number | string | null): string {
  if (valor === null) return 'Não calculado';
  const percentual = new Decimal(valor).times(100).toDecimalPlaces(1);
  return `${percentual.isPositive() ? '+' : ''}${percentual.toString()}%`;
}

export function formatarHoras(valor: number | string | null): string {
  return valor === null ? '—' : `${new Decimal(valor).toDecimalPlaces(1).toString()} h`;
}

export function recomendacaoExigeJustificativa(horas: number | string, recomendacao: RecomendacaoPersistente | null): boolean {
  if (!recomendacao || recomendacao.quantidade_casos < 5 || recomendacao.q1 === null || recomendacao.q3 === null) return false;
  try {
    const valor = new Decimal(horas);
    return valor.lt(recomendacao.q1) || valor.gt(recomendacao.q3);
  } catch {
    return false;
  }
}

export function normalizarJustificativaEstimativa(valor: string): string | null {
  const normalizada = valor.trim();
  return normalizada.length >= 5 && normalizada.length <= 1000 ? normalizada : null;
}
