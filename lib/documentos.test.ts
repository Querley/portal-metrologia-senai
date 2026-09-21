import { describe, expect, it } from 'vitest';
import { documentoPodeSerVisualizado } from './documentos';

describe('visualização protegida de documentos', () => {
  it('abre PDF e imagens dentro do portal', () => {
    expect(documentoPodeSerVisualizado('application/pdf', 'relatorio.pdf')).toBe(true);
    expect(documentoPodeSerVisualizado('image/jpeg', 'peca.jpg')).toBe(true);
    expect(documentoPodeSerVisualizado('application/octet-stream', 'desenho.webp')).toBe(true);
  });

  it('mantém arquivos técnicos como download', () => {
    expect(documentoPodeSerVisualizado('application/octet-stream', 'modelo.step')).toBe(false);
    expect(documentoPodeSerVisualizado('application/zip', 'arquivos.zip')).toBe(false);
  });
});
