export type UsoEquipamentoOrcamento = {
  equipamento_nome: string;
  horas: string | number;
  custo_hora_congelado: string | number | null;
};

type LinhaOrcamento = UsoEquipamentoOrcamento & { versao_id: string };

export function agruparLinhasOrcamento<T extends LinhaOrcamento>(linhas: T[]): Array<T & { usos_equipamentos: UsoEquipamentoOrcamento[] }> {
  const agrupadas = new Map<string, T & { usos_equipamentos: UsoEquipamentoOrcamento[] }>();

  for (const linha of linhas) {
    const uso = {
      equipamento_nome: linha.equipamento_nome,
      horas: linha.horas,
      custo_hora_congelado: linha.custo_hora_congelado,
    };
    const existente = agrupadas.get(linha.versao_id);
    if (existente) existente.usos_equipamentos.push(uso);
    else agrupadas.set(linha.versao_id, { ...linha, usos_equipamentos: [uso] });
  }

  return [...agrupadas.values()];
}
