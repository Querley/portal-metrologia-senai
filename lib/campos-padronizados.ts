export const MATERIAIS_PECA = [
  'Aço carbono', 'Aço inoxidável', 'Alumínio', 'Cobre', 'Ferro fundido',
  'Polímero', 'Cerâmica', 'Compósito', 'Outros',
] as const;

export const MOTIVOS_RETRABALHO = [
  'Desvio dimensional', 'Falha de equipamento', 'Informação insuficiente',
  'Mudança de escopo', 'Preparação inadequada da peça', 'Repetição para confirmação', 'Outros',
] as const;

export function telefoneValido(valor: string): boolean {
  return /^\+?[0-9 ()-]{8,30}$/.test(valor.trim()) && valor.replace(/\D/g, '').length >= 8;
}

export function normalizarTelefoneDigitado(valor: string): string {
  return valor.replace(/[^0-9+ ()-]/g, '').slice(0, 30);
}

export function valorPadronizado(opcao: string, outro: string): string {
  return opcao === 'Outros' ? outro.trim() : opcao.trim();
}
