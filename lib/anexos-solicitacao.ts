export const EXTENSOES_CAD = ['step', 'stp', 'iges', 'igs', 'stl', 'obj', 'dxf', 'dwg'] as const;
export const TIPOS_ANEXO_VISUAL = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'] as const;
export const MAXIMO_ANEXOS_SOLICITACAO = 5;

export type AnexoSolicitacaoCliente = {
  id: string;
  caminho_storage: string;
  nome_original: string;
  tipo_mime: string;
  tamanho_bytes: number;
  criado_em: string;
};

function extensao(nome: string): string {
  return nome.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? '';
}

export function tipoMimeArmazenado(arquivo: Pick<File, 'name' | 'type'>): string | null {
  const tipo = arquivo.type.toLowerCase();
  const extensaoArquivo = extensao(arquivo.name);
  if (TIPOS_ANEXO_VISUAL.includes(tipo as (typeof TIPOS_ANEXO_VISUAL)[number])) return tipo;
  if (EXTENSOES_CAD.includes(extensaoArquivo as (typeof EXTENSOES_CAD)[number])) return 'application/octet-stream';
  return null;
}

export function validarAnexosSolicitacao(arquivos: File[]): string | null {
  if (arquivos.length > MAXIMO_ANEXOS_SOLICITACAO) return 'Envie no máximo cinco arquivos por solicitação.';
  for (const arquivo of arquivos) {
    const tipo = tipoMimeArmazenado(arquivo);
    if (!tipo) return `O formato de ${arquivo.name} não é aceito. Use PDF, imagem ou arquivo CAD.`;
    const limite = tipo === 'application/octet-stream' ? 50 : 10;
    if (arquivo.size <= 0 || arquivo.size > limite * 1024 * 1024) {
      return `${arquivo.name} excede o limite de ${limite} MB.`;
    }
  }
  return null;
}

export function nomeSeguroAnexo(nome: string): string {
  const limpo = nome
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '');
  return (limpo || 'arquivo').slice(-140);
}

export function caminhoAnexoSolicitacao(solicitacaoId: string, arquivo: Pick<File, 'name'>, identificador = crypto.randomUUID()): string {
  return `demonstracao/${solicitacaoId}/${identificador}-${nomeSeguroAnexo(arquivo.name)}`;
}
