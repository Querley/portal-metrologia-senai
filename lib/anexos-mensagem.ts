import { nomeSeguroAnexo, tipoMimeArmazenado } from './anexos-solicitacao';

export type AnexoMensagem = { id: string; mensagem_id: string; caminho_storage: string; nome_original: string; tipo_mime: string; tamanho_bytes: number; criado_em: string };
export const MAXIMO_ANEXOS_MENSAGEM = 5;
export const LIMITE_ANEXO_MENSAGEM = 10 * 1024 * 1024;

export function validarAnexosMensagem(arquivos: File[]): string | null {
  if (arquivos.length > MAXIMO_ANEXOS_MENSAGEM) return 'Envie no máximo cinco arquivos por mensagem.';
  for (const arquivo of arquivos) {
    if (!tipoMimeArmazenado(arquivo)) return `${arquivo.name}: formato não permitido.`;
    if (arquivo.size <= 0 || arquivo.size > LIMITE_ANEXO_MENSAGEM) return `${arquivo.name}: o limite por arquivo é 10 MB.`;
  }
  return null;
}

export function caminhoAnexoMensagem(mensagemId: string, arquivo: File): string {
  return `demonstracao/${mensagemId}/${crypto.randomUUID()}-${nomeSeguroAnexo(arquivo.name)}`;
}
