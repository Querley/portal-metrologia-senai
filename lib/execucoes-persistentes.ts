import type { PerfilInterno } from './contratos';

export type EstadoEtapaExecucao = 'a_fazer' | 'em_andamento' | 'concluida';
export type EstadoFechamento = 'nao_iniciado' | 'em_validacao' | 'devolvido' | 'aprovado';

export type EquipamentoExecucao = {
  equipamento_id: string;
  nome: string;
  horas_estimadas: number;
  horas_reais: number | null;
};

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
  fechamento_estado: EstadoFechamento;
  custos_extras_reais: number | null;
  retrabalho: boolean | null;
  mudanca_escopo: boolean | null;
  causa_principal: string | null;
  fechamento_observacoes: string | null;
  fechamento_aprendizado: string | null;
  fechamento_enviado_em: string | null;
  fechamento_decidido_em: string | null;
  fechamento_justificativa: string | null;
  equipamentos: EquipamentoExecucao[];
  etapas: EtapaExecucaoInterna[];
};

export function podeOperarExecucoes(perfil: PerfilInterno): boolean {
  return perfil === 'tecnico' || perfil === 'validador' || perfil === 'administrador';
}

export function podeDecidirFechamento(perfil: PerfilInterno): boolean {
  return perfil === 'validador' || perfil === 'administrador';
}

export function etapasConcluidas(etapas: EtapaExecucaoInterna[]): boolean {
  return etapas.length > 0 && etapas.every((etapa) => etapa.estado === 'concluida' && etapa.progresso === 100);
}

export function validarFechamento(entrada: {
  equipamentos: EquipamentoExecucao[];
  horas: Record<string, number>;
  custosExtras: number;
  retrabalho: boolean;
  mudancaEscopo: boolean;
  causa: string;
  observacoes: string;
  aprendizado: string;
}): string | null {
  if (!Number.isFinite(entrada.custosExtras) || entrada.custosExtras < 0) return 'Informe custos extras válidos.';
  if (entrada.equipamentos.some((item) => !Number.isFinite(entrada.horas[item.equipamento_id]) || entrada.horas[item.equipamento_id] < 0)) return 'Informe as horas reais de todos os equipamentos.';
  if (entrada.observacoes.trim().length < 5 || entrada.observacoes.trim().length > 2000) return 'Descreva o fechamento em pelo menos 5 caracteres.';
  if (entrada.aprendizado.trim() && (entrada.aprendizado.trim().length < 5 || entrada.aprendizado.trim().length > 2000)) return 'O aprendizado deve ter pelo menos 5 caracteres.';
  if ((entrada.retrabalho || entrada.mudancaEscopo) && (entrada.causa.trim().length < 5 || entrada.causa.trim().length > 500)) return 'Informe a causa principal do retrabalho ou da mudança de escopo.';
  return null;
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
