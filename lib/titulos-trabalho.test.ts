import { describe, expect, it } from 'vitest';
import { resumirTexto, tituloDescritivoTrabalho } from './titulos-trabalho';

describe('títulos dos trabalhos', () => {
  it('combina quantidade, peça, serviço e empresa', () => {
    expect(tituloDescritivoTrabalho({ quantidade: 3, descricao: 'Engrenagens helicoidais', servico: 'Inspeção dimensional', empresa: 'Empresa X' })).toBe('3× Engrenagens helicoidais · Inspeção dimensional · Empresa X');
  });
  it('encurta descrições longas sem perder o contexto', () => {
    expect(resumirTexto('a'.repeat(60), 20)).toBe(`${'a'.repeat(19)}…`);
  });
});
