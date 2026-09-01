import type { PerfilInterno } from './contratos';

export type EstadoEtapaExecucao = 'a_fazer' | 'em_andamento' | 'concluida';

export type EtapaExecucaoInterna = {
  id: string;
  ordem: number;
  titulo: string;
  descricao: string | null;
  estado: EstadoEtapaExecucao;
  progresso: number;
  visivel_cliente: boolean;
  atualizada_em: string;
};

export type ExecucaoInterna = {
  execucao_id: string;
  estado: 'planejado' | 'em_execucao' | 'concluido' | 'cancelado';
  inicio_real: string | null;
  entrega_real: string | null;
  criada_em: string;
  solicitacao_codigo: number;
  empresa_nome: string;
  servico_slug: string;
  descricao: string;
  responsavel_nome: string;
  etapas: EtapaExecucaoInterna[];
};

export function podeOperarExecucoes(perfil: PerfilInterno): boolean {
  return perfil === 'tecnico' || perfil === 'validador' || perfil === 'administrador';
}

export function calcularProgressoExecucao(etapas: EtapaExecucaoInterna[]): number {
  if (etapas.length === 0) return 0;
  const total = etapas.reduce((soma, etapa) => soma + etapa.progresso, 0);
  return Math.round(total / etapas.length);
}

export function normalizarAtualizacaoEtapa(
  estado: EstadoEtapaExecucao,
  progresso: number,
): { estado: EstadoEtapaExecucao; progresso: number } | null {
  if (!Number.isInteger(progresso)) return null;
  if (estado === 'a_fazer' && progresso === 0) return { estado, progresso };
  if (estado === 'em_andamento' && progresso >= 1 && progresso <= 99) return { estado, progresso };
  if (estado === 'concluida' && progresso === 100) return { estado, progresso };
  return null;
}
