import Decimal from 'decimal.js';
import type { PerfilInterno } from './contratos';

export const ORIGEM_CUSTOS_HOMOLOGACAO = 'demonstracao' as const;

export function podeConsultarCustos(perfil: PerfilInterno): boolean {
  return perfil === 'validador' || perfil === 'administrador';
}

export function podeVersionarCustos(perfil: PerfilInterno): boolean {
  return perfil === 'administrador';
}

export function normalizarCustoHora(valor: string): string | null {
  const candidato = valor.trim().replace(',', '.');
  if (!/^\d{1,12}(\.\d{1,6})?$/.test(candidato)) return null;

  const custo = new Decimal(candidato);
  if (custo.isNegative()) return null;
  return custo.toFixed(custo.decimalPlaces());
}

export function dataPosterior(dataIso: string): string {
  const data = new Date(`${dataIso}T00:00:00Z`);
  data.setUTCDate(data.getUTCDate() + 1);
  return data.toISOString().slice(0, 10);
}

