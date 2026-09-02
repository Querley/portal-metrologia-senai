import { describe, expect, it } from 'vitest';
import { caminhoAnexoSolicitacao, nomeSeguroAnexo, tipoMimeArmazenado, validarAnexosSolicitacao } from './anexos-solicitacao';

function arquivo(nome: string, tipo: string, tamanho: number): File {
  return new File([new Uint8Array(tamanho)], nome, { type: tipo });
}

describe('anexos privados da solicitação', () => {
  it('aceita PDF, imagem e CAD dentro dos limites', () => {
    expect(validarAnexosSolicitacao([
      arquivo('desenho.pdf', 'application/pdf', 120),
      arquivo('peca.webp', 'image/webp', 90),
      arquivo('modelo.step', '', 250),
    ])).toBeNull();
    expect(tipoMimeArmazenado(arquivo('modelo.STL', 'model/stl', 10))).toBe('application/octet-stream');
  });

  it('nega quantidade, formato e tamanho inválidos sem enfraquecer os limites', () => {
    expect(validarAnexosSolicitacao(Array.from({ length: 6 }, (_, indice) => arquivo(`${indice}.pdf`, 'application/pdf', 1)))).toMatch(/máximo cinco/i);
    expect(validarAnexosSolicitacao([arquivo('executavel.exe', 'application/octet-stream', 1)])).toMatch(/formato/i);
    expect(validarAnexosSolicitacao([arquivo('imagem.png', 'image/png', 10 * 1024 * 1024 + 1)])).toMatch(/10 MB/i);
  });

  it('produz caminho demonstrativo previsível sem aceitar separadores do nome original', () => {
    expect(nomeSeguroAnexo('../Peça crítica 01.STEP')).toBe('Peca-critica-01.STEP');
    expect(caminhoAnexoSolicitacao('11111111-1111-1111-1111-111111111111', { name: '../Peça crítica 01.STEP' }, '22222222-2222-2222-2222-222222222222'))
      .toBe('demonstracao/11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222-Peca-critica-01.STEP');
  });
});
