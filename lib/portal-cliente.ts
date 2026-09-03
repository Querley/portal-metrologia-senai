import { servicosOficiais } from './servicos';

export const VERSAO_AVISO_PRIVACIDADE = '2026-08-28-v1';
export const VERSAO_DECLARACAO_ACEITE_PRE_PROPOSTA = '2026-09-01-v1';

export type ContextoCliente = {
  vinculo_id: string;
  empresa_id: string;
  empresa_nome: string;
  perfil: 'contato' | 'gestor_empresa';
  origem: 'demonstracao';
  usuario_nome: string;
  usuario_email: string;
  aceite_privacidade_em: string | null;
  versao_aviso_privacidade: string | null;
};

export type EtapaCliente = {
  id: string;
  titulo: string;
  descricao: string | null;
  ordem: number;
  estado: 'a_fazer' | 'em_andamento' | 'concluida';
  progresso: number;
  atualizada_em: string;
};

export type SolicitacaoCliente = {
  id: string;
  codigo: number;
  protocolo?: string;
  estado: string;
  criada_em: string;
  servico: string;
  proposta_estado: string | null;
  valor_pre_proposta: number | null;
  prazo_pagamento_dias: number | null;
  aceita_em: string | null;
  recusada_em?: string | null;
  recusa_motivo?: string | null;
  execucao_estado: 'planejado' | 'em_execucao' | 'concluido' | 'cancelado' | null;
  etapas: EtapaCliente[];
};

export type MensagemCliente = {
  id: string;
  autor_proprio: boolean;
  conteudo: string;
  criada_em: string;
};

export function tituloServicoCliente(slug: string): string {
  return servicosOficiais.find((servico) => servico.slug === slug)?.titulo
    ?? slug.replaceAll('-', ' ');
}

export function protocoloSolicitacaoCliente(solicitacao: Pick<SolicitacaoCliente, 'codigo' | 'protocolo'>): string {
  return solicitacao.protocolo ?? `SOL-${String(solicitacao.codigo).padStart(4, '0')}`;
}

export function podeAceitarPreProposta(estado: string | null): boolean {
  return estado === 'publicada';
}

export function podeRecusarPreProposta(estado: string | null): boolean {
  return estado === 'publicada';
}

export function normalizarMotivoRecusa(valor: string): string | null {
  const motivo = valor.trim();
  return motivo.length >= 5 && motivo.length <= 1000 ? motivo : null;
}

export function situacaoEtapasCliente(
  etapas: EtapaCliente[],
  execucaoEstado: SolicitacaoCliente['execucao_estado'] = null,
  propostaEstado: string | null = null,
): { titulo: string; descricao: string } {
  if (execucaoEstado === 'concluido') {
    return {
      titulo: 'Serviço concluído',
      descricao: 'O trabalho foi concluído e o encerramento foi aprovado pela equipe do laboratório.',
    };
  }

  if (execucaoEstado === 'cancelado') {
    return {
      titulo: 'Serviço cancelado',
      descricao: 'Este trabalho foi cancelado. Fale com a equipe pelo canal de mensagens para mais informações.',
    };
  }

  if (etapas.length === 0) {
    if (execucaoEstado === 'em_execucao') {
      return {
        titulo: 'Início confirmado',
        descricao: 'O laboratório liberou o trabalho e está preparando as etapas de acompanhamento.',
      };
    }
    if (execucaoEstado === 'planejado') {
      return {
        titulo: 'Planejamento iniciado',
        descricao: 'O trabalho foi liberado e aguarda o início da primeira etapa.',
      };
    }
    if (propostaEstado === 'aceita') {
      return {
        titulo: 'Aceite registrado',
        descricao: 'Aguardando o Administrador confirmar a liberação do trabalho.',
      };
    }
    if (propostaEstado === 'publicada') {
      return {
        titulo: 'Aguardando sua decisão',
        descricao: 'Analise a pré-proposta emitida e informe se deseja prosseguir.',
      };
    }
    if (propostaEstado === 'recusada') {
      return {
        titulo: 'Revisão solicitada',
        descricao: 'A equipe recebeu sua decisão e poderá preparar uma nova pré-proposta para este trabalho.',
      };
    }
    return {
      titulo: 'Aguardando triagem',
      descricao: 'A equipe ainda não cadastrou as etapas deste trabalho.',
    };
  }

  const emAndamento = etapas.find((etapa) => etapa.estado === 'em_andamento');
  if (emAndamento) {
    return {
      titulo: emAndamento.titulo,
      descricao: `Etapa em andamento: ${emAndamento.progresso}% concluída.`,
    };
  }

  if (etapas.every((etapa) => etapa.estado === 'concluida')) {
    return {
      titulo: 'Etapas concluídas',
      descricao: 'A equipe concluiu as etapas visíveis e está preparando o encerramento do trabalho.',
    };
  }

  if (execucaoEstado === 'em_execucao' && etapas.every((etapa) => etapa.estado === 'a_fazer')) {
    return {
      titulo: 'Trabalho liberado',
      descricao: 'O laboratório confirmou o início; a primeira etapa ainda será iniciada pela equipe.',
    };
  }

  return {
    titulo: 'Aguardando início',
    descricao: 'As etapas foram planejadas, mas a execução ainda não começou.',
  };
}

export function descricaoAceiteCliente(
  aceitaEm: string | null,
  execucaoEstado: SolicitacaoCliente['execucao_estado'],
  formatarData: (valor: string) => string,
): string {
  const registro = aceitaEm ? `Registrado em ${formatarData(aceitaEm)}. ` : '';
  if (execucaoEstado === 'concluido') return `${registro}O trabalho foi concluído e encerrado pela equipe.`;
  if (execucaoEstado === 'em_execucao') return `${registro}O laboratório confirmou a liberação e o trabalho está em execução.`;
  if (execucaoEstado === 'cancelado') return `${registro}O trabalho foi cancelado; consulte a equipe pelo canal de mensagens.`;
  return `${registro}Agora o laboratório precisa confirmar a liberação do trabalho.`;
}

export const contextoClienteDemonstracao: ContextoCliente = {
  vinculo_id: 'demo-vinculo',
  empresa_id: 'demo-empresa',
  empresa_nome: 'Indústria Horizonte — demonstração',
  perfil: 'contato',
  origem: 'demonstracao',
  usuario_nome: 'Marina Costa',
  usuario_email: 'cliente.hml@example.test',
  aceite_privacidade_em: null,
  versao_aviso_privacidade: null,
};

export const solicitacoesClienteDemonstracao: SolicitacaoCliente[] = [
  {
    id: 'demo-solicitacao',
    codigo: 284,
    protocolo: 'DEM-SOL-0284',
    estado: 'em_execucao',
    criada_em: '2026-08-20T12:42:00.000Z',
    servico: 'Digitalização e engenharia reversa',
    proposta_estado: 'publicada',
    valor_pre_proposta: 12840,
    prazo_pagamento_dias: 45,
    aceita_em: null,
    recusada_em: null,
    recusa_motivo: null,
    execucao_estado: null,
    etapas: [
      { id: '1', titulo: 'Recebimento e preparação', descricao: 'Conferência dos arquivos e preparação da peça.', ordem: 1, estado: 'concluida', progresso: 100, atualizada_em: '2026-08-21T12:00:00.000Z' },
      { id: '2', titulo: 'Digitalização da peça', descricao: 'Captura da geometria e verificação da malha.', ordem: 2, estado: 'concluida', progresso: 100, atualizada_em: '2026-08-24T12:00:00.000Z' },
      { id: '3', titulo: 'Engenharia reversa e modelo STEP', descricao: 'Reconstrução do modelo tridimensional.', ordem: 3, estado: 'em_andamento', progresso: 50, atualizada_em: '2026-08-28T12:00:00.000Z' },
      { id: '4', titulo: 'Validação de qualidade', descricao: 'Comparação final e preparação dos entregáveis.', ordem: 4, estado: 'a_fazer', progresso: 0, atualizada_em: '2026-08-28T12:00:00.000Z' },
    ],
  },
];

export const mensagensClienteDemonstracao: MensagemCliente[] = [
  { id: 'm1', autor_proprio: false, conteudo: 'Olá! A digitalização foi concluída e iniciamos a reconstrução do modelo.', criada_em: '2026-08-27T13:40:00.000Z' },
  { id: 'm2', autor_proprio: true, conteudo: 'Perfeito, obrigado pela atualização.', criada_em: '2026-08-27T14:05:00.000Z' },
];
