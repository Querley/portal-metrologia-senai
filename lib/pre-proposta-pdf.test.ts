import { describe, expect, it } from 'vitest';
import { calcularSha256Hex, gerarPdfPreProposta, type DadosPdfPreProposta } from './pre-proposta-pdf';

const dados: DadosPdfPreProposta = {
  protocolo: 'DEM-SOL-0017',
  versao: 1,
  empresa: 'Indústria Demonstração',
  destinatario: 'Cliente Sintético',
  servico: 'Medição e inspeção dimensional',
  descricao: 'Inspeção dimensional demonstrativa com relatório técnico e comparação controlada.',
  valor: 'R$ 1.234,56',
  prazoPagamentoDias: 45,
  emitidaEm: new Date('2026-08-31T12:00:00.000Z'),
};

describe('PDF da pré-proposta', () => {
  it('gera um PDF determinístico de uma página com os dados essenciais', () => {
    const primeira = gerarPdfPreProposta(dados);
    const segunda = gerarPdfPreProposta(dados);
    expect(new TextDecoder('latin1').decode(primeira.slice(0, 8))).toBe('%PDF-1.4');
    expect(primeira.length).toBeGreaterThan(2000);
    expect(primeira).toEqual(segunda);
  });

  it('calcula hash SHA-256 estável para congelamento do documento', async () => {
    const hash = await calcularSha256Hex(gerarPdfPreProposta(dados));
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).toBe(await calcularSha256Hex(gerarPdfPreProposta(dados)));
  });
});
