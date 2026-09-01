import Decimal from 'decimal.js';
import type { PerfilInterno } from './contratos';
import { calcularProposta } from './calculos';

export type EntradaOrcamentoPersistente = {
  descricao: string;
  quantidade: string;
  horas: string;
  custosExtras: string;
  percentualLucro: string;
};

export function podeConsultarOrcamentos(perfil: PerfilInterno): boolean {
  return perfil === 'tecnico' || perfil === 'validador' || perfil === 'administrador';
}

export function podeCriarRascunhoOrcamento(perfil: PerfilInterno): boolean {
  return perfil === 'tecnico' || perfil === 'validador' || perfil === 'administrador';
}

export function podeAprovarOrcamento(perfil: PerfilInterno): boolean {
  return perfil === 'validador' || perfil === 'administrador';
}

export function podeDecidirOrcamento(perfil: PerfilInterno): boolean {
  return perfil === 'validador' || perfil === 'administrador';
}

export function podePublicarOrcamento(perfil: PerfilInterno): boolean {
  return perfil === 'administrador';
}

export function podeConfirmarInicioTrabalho(
  perfil: PerfilInterno,
  estadoProposta: string,
  estadoExecucao: string | null,
): boolean {
  return perfil === 'administrador'
    && estadoProposta === 'aceita'
    && estadoExecucao === null;
}

export function normalizarJustificativaDecisao(valor: string): string | null {
  const justificativa = valor.trim();
  return justificativa.length >= 5 && justificativa.length <= 500 ? justificativa : null;
}

function normalizarDecimal(valor: string, maximoInteiros: number): string | null {
  const candidato = valor.trim().replace(',', '.');
  const expressao = new RegExp(`^-?\\d{1,${maximoInteiros}}(?:\\.\\d{1,6})?$`);
  if (!expressao.test(candidato)) return null;
  const decimal = new Decimal(candidato);
  return decimal.toFixed(decimal.decimalPlaces());
}

export function normalizarEntradaOrcamento(entrada: EntradaOrcamentoPersistente): EntradaOrcamentoPersistente | null {
  const descricao = entrada.descricao.trim();
  const quantidade = normalizarDecimal(entrada.quantidade, 12);
  const horas = normalizarDecimal(entrada.horas, 12);
  const custosExtras = normalizarDecimal(entrada.custosExtras, 12);
  const percentualLucro = normalizarDecimal(entrada.percentualLucro, 3);

  if (descricao.length < 3 || descricao.length > 500 || !quantidade || !horas || !custosExtras || !percentualLucro) return null;
  if (new Decimal(quantidade).lte(0) || new Decimal(horas).lt(0) || new Decimal(custosExtras).lt(0)) return null;
  if (new Decimal(percentualLucro).lte(-100)) return null;

  return { descricao, quantidade, horas, custosExtras, percentualLucro };
}

export function calcularPreviaOrcamento(entrada: EntradaOrcamentoPersistente, custoHora: string | number) {
  const normalizada = normalizarEntradaOrcamento(entrada);
  if (!normalizada) return null;
  return calcularProposta([{
    servicoId: 'previa',
    descricao: normalizada.descricao,
    quantidade: normalizada.quantidade,
    usos: [{ maquinaId: 'previa', horas: normalizada.horas, custoHora: String(custoHora) }],
    custosExtras: normalizada.custosExtras,
    percentualLucro: normalizada.percentualLucro,
  }])[0];
}
