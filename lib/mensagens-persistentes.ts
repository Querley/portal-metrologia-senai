import type { PerfilInterno } from './contratos';

export type MensagemInterna = {
  id: string;
  conteudo: string;
  criada_em: string;
  autor_nome: string;
  autor_tipo: 'cliente' | 'equipe';
};

export type ConversaInterna = {
  solicitacao_id: string;
  codigo: number;
  empresa: string;
  contato_nome: string;
  contato_email: string;
  necessidade: string;
  criada_em: string;
  mensagens: MensagemInterna[];
};

export function podeAcessarConversas(perfil: PerfilInterno): boolean {
  return perfil === 'tecnico' || perfil === 'validador' || perfil === 'administrador';
}

export function iniciaisEmpresa(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  return partes.slice(0, 2).map((parte) => parte[0]).join('').toUpperCase() || 'CL';
}
