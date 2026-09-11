import { describe, expect, it } from 'vitest';
import { LIMITE_ANEXO_MENSAGEM, validarAnexosMensagem } from './anexos-mensagem';

function arquivo(nome: string, tipo: string, tamanho: number): File {
  return { name: nome, type: tipo, size: tamanho } as File;
}

describe('anexos de mensagens', () => {
  it('aceita PDF dentro do limite', () => expect(validarAnexosMensagem([arquivo('desenho.pdf', 'application/pdf', 1024)])).toBeNull());
  it('rejeita sexto arquivo', () => expect(validarAnexosMensagem(Array.from({ length: 6 }, (_, indice) => arquivo(`${indice}.pdf`, 'application/pdf', 10)))).toContain('cinco'));
  it('rejeita arquivo maior que 10 MB', () => expect(validarAnexosMensagem([arquivo('grande.pdf', 'application/pdf', LIMITE_ANEXO_MENSAGEM + 1)])).toContain('10 MB'));
});
