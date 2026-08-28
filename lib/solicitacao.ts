export const necessidadesCliente = [
  { valor: 'digitalizacao-modelo-3d', rotulo: 'Digitalização e criação de modelo 3D' },
  { valor: 'medicao-inspecao-dimensional', rotulo: 'Medição e inspeção dimensional' },
  { valor: 'inspecao-interna-nao-destrutiva', rotulo: 'Inspeção interna sem destruir a peça' },
  { valor: 'engenharia-reversa-adequacao', rotulo: 'Engenharia reversa e adequação técnica' },
  { valor: 'analise-falha-desgaste', rotulo: 'Análise de falha ou desgaste' },
  { valor: 'orientacao-tecnica', rotulo: 'Preciso de orientação para escolher' },
  { valor: 'outro', rotulo: 'Outra necessidade' },
] as const;

export const prazosPagamento = [30, 45, 60, 90] as const;

const necessidadePorServicoTecnico: Record<string, typeof necessidadesCliente[number]['valor']> = {
  'escaneamento-3d-digitalizacao-pecas': 'digitalizacao-modelo-3d',
  'engenharia-reversa-reconstrucao-cad': 'engenharia-reversa-adequacao',
  'nacionalizacao-desenvolvimento-componentes': 'engenharia-reversa-adequacao',
  'metrologia-avancada-inspecao-dimensional': 'medicao-inspecao-dimensional',
  'comparacao-cad-peca-fisica': 'medicao-inspecao-dimensional',
  'mapa-desgaste': 'analise-falha-desgaste',
  'tomografia-industrial': 'inspecao-interna-nao-destrutiva',
  'analise-falhas-quebras-anomalias': 'analise-falha-desgaste',
  'arvore-equipamentos-pecas-criticas': 'orientacao-tecnica',
  'almoxarifado-virtual-biblioteca-digital': 'orientacao-tecnica',
  'avaliacao-equipamento': 'orientacao-tecnica',
};

export function necessidadeInicial(valor: string): typeof necessidadesCliente[number]['valor'] | '' {
  if (necessidadesCliente.some((item) => item.valor === valor)) return valor as typeof necessidadesCliente[number]['valor'];
  return necessidadePorServicoTecnico[valor] ?? '';
}

export function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, '');
}

export function formatarCnpj(valor: string): string {
  return somenteDigitos(valor)
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export function cnpjValido(valor: string): boolean {
  const cnpj = somenteDigitos(valor);
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;

  const calcularDigito = (base: string, pesos: number[]) => {
    const soma = base.split('').reduce((total, digito, indice) => total + Number(digito) * pesos[indice], 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const primeiro = calcularDigito(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const segundo = calcularDigito(`${cnpj.slice(0, 12)}${primeiro}`, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return cnpj.endsWith(`${primeiro}${segundo}`);
}
