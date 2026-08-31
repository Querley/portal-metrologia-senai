import type { PerfilInterno } from './contratos';

export type EstadoSolicitacaoPublica = 'recebida' | 'ativada' | 'descartada';

export type SolicitacaoParaPreProposta = {
  id: string;
  codigo: number;
  nome: string;
  email: string;
  empresa: string;
  necessidade: string;
  estado: EstadoSolicitacaoPublica;
  criado_em: string;
  solicitacao_id: string | null;
  servico_id: string | null;
  descricao: string;
  quantidade: number;
  prazo_pagamento_dias: number;
  tem_pre_proposta: boolean;
  estado_pre_proposta: string | null;
};

const apresentacoes = {
  recebida: {
    rotulo: 'Aguardando ativação',
    descricao: 'O Cliente ainda não vinculou a solicitação à própria conta.',
    classe: 'estado-em-analise',
  },
  ativada: {
    rotulo: 'Portal ativado',
    descricao: 'A solicitação já está vinculada à área protegida do Cliente.',
    classe: 'estado-formalizada',
  },
  descartada: {
    rotulo: 'Descartada',
    descricao: 'A entrada foi encerrada sem ativação do acompanhamento.',
    classe: 'estado-rejeitada',
  },
} as const;

export function podeConsultarSolicitacoes(perfil: PerfilInterno): boolean {
  return perfil === 'tecnico' || perfil === 'validador' || perfil === 'administrador';
}

export function podeCriarPrePropostaDaSolicitacao(solicitacao: SolicitacaoParaPreProposta): boolean {
  return solicitacao.estado === 'ativada'
    && Boolean(solicitacao.solicitacao_id)
    && !solicitacao.tem_pre_proposta;
}

export function apresentarEstadoSolicitacao(estado: string) {
  return apresentacoes[estado as EstadoSolicitacaoPublica] ?? {
    rotulo: 'Estado desconhecido',
    descricao: 'Atualize a página antes de continuar o atendimento.',
    classe: 'estado-rascunho',
  };
}
