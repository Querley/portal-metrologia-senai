import type { PerfilInterno } from './contratos';

export type EstadoSolicitacaoPublica = 'recebida' | 'ativada' | 'descartada';

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

export function apresentarEstadoSolicitacao(estado: string) {
  return apresentacoes[estado as EstadoSolicitacaoPublica] ?? {
    rotulo: 'Estado desconhecido',
    descricao: 'Atualize a página antes de continuar o atendimento.',
    classe: 'estado-rascunho',
  };
}
