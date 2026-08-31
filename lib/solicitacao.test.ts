import { describe, expect, it } from 'vitest';
import { cnpjValido, formatarCnpj, necessidadeInicial, necessidadesCliente, prazosPagamento, rotuloNecessidadeCliente } from './solicitacao';

describe('solicitação pública', () => {
  it('formata e valida CNPJ sem consultar fonte externa', () => {
    expect(formatarCnpj('11222333000181')).toBe('11.222.333/0001-81');
    expect(cnpjValido('11.222.333/0001-81')).toBe(true);
    expect(cnpjValido('11.111.111/1111-11')).toBe(false);
  });

  it('expõe opções simples e prazos usuais', () => {
    expect(necessidadesCliente.length).toBeGreaterThanOrEqual(5);
    expect(prazosPagamento).toEqual([30, 45, 60, 90]);
  });

  it('traduz o serviço técnico para uma necessidade compreensível', () => {
    expect(necessidadeInicial('tomografia-industrial')).toBe('inspecao-interna-nao-destrutiva');
    expect(necessidadeInicial('outro')).toBe('outro');
    expect(rotuloNecessidadeCliente('analise-falha-desgaste')).toBe('Análise de falha ou desgaste');
    expect(rotuloNecessidadeCliente('valor-desconhecido')).toBe('Necessidade não classificada');
  });
});
