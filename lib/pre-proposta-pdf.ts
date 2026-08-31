export type DadosPdfPreProposta = {
  protocolo: string;
  versao: number;
  empresa: string;
  destinatario: string;
  servico: string;
  descricao: string;
  valor: string;
  prazoPagamentoDias: number;
  emitidaEm: Date;
};

const mapaWinAnsi: Record<string, number> = {
  '€': 128,
  '‚': 130,
  'ƒ': 131,
  '„': 132,
  '…': 133,
  '†': 134,
  '‡': 135,
  'ˆ': 136,
  '‰': 137,
  'Š': 138,
  '‹': 139,
  'Œ': 140,
  'Ž': 142,
  '‘': 145,
  '’': 146,
  '“': 147,
  '”': 148,
  '•': 149,
  '–': 150,
  '—': 151,
  '˜': 152,
  '™': 153,
  'š': 154,
  '›': 155,
  'œ': 156,
  'ž': 158,
  'Ÿ': 159,
};

function normalizarTexto(valor: string): string {
  return valor
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/[\u00a0\t\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function bytesWinAnsi(valor: string): Uint8Array {
  const bytes: number[] = [];
  for (const caractere of valor) {
    const codigo = caractere.codePointAt(0) ?? 63;
    if (codigo <= 255) bytes.push(codigo);
    else bytes.push(mapaWinAnsi[caractere] ?? 63);
  }
  return Uint8Array.from(bytes);
}

function concatenar(partes: Uint8Array[]): Uint8Array {
  const total = partes.reduce((soma, parte) => soma + parte.length, 0);
  const resultado = new Uint8Array(total);
  let deslocamento = 0;
  for (const parte of partes) {
    resultado.set(parte, deslocamento);
    deslocamento += parte.length;
  }
  return resultado;
}

function escaparTextoPdf(valor: string): string {
  return normalizarTexto(valor).replace(/([\\()])/g, '\\$1');
}

function quebrarTexto(valor: string, limite = 82): string[] {
  const palavras = normalizarTexto(valor).split(' ').filter(Boolean);
  const linhas: string[] = [];
  let atual = '';
  for (const palavra of palavras) {
    if (!atual) atual = palavra;
    else if (`${atual} ${palavra}`.length <= limite) atual += ` ${palavra}`;
    else {
      linhas.push(atual);
      atual = palavra;
    }
  }
  if (atual) linhas.push(atual);
  return linhas.length ? linhas : ['-'];
}

function comandoTexto(texto: string, x: number, y: number, tamanho: number, negrito = false, cor = '0.08 0.20 0.28'): string {
  return `BT /${negrito ? 'F2' : 'F1'} ${tamanho} Tf ${cor} rg 1 0 0 1 ${x} ${y} Tm (${escaparTextoPdf(texto)}) Tj ET`;
}

export function gerarPdfPreProposta(dados: DadosPdfPreProposta): Uint8Array {
  const comandos = [
    'q 0.02 0.35 0.63 rg 0 760 595 82 re f Q',
    comandoTexto('CENTRO DE EXCELENCIA EM METROLOGIA - SENAI ZEISS', 42, 810, 10, true, '1 1 1'),
    comandoTexto('PRE-PROPOSTA DO LABORATORIO', 42, 786, 19, true, '1 1 1'),
    comandoTexto('Documento demonstrativo de homologacao', 42, 769, 8, false, '0.82 0.92 1'),
    'q 0.92 0.97 0.99 rg 42 704 511 38 re f Q',
    comandoTexto('Esta pre-proposta e informal. A proposta oficial do SENAI e produzida no Nectar.', 54, 726, 9, true),
    comandoTexto('O Nectar nao possui integracao com este portal.', 54, 712, 8),
    comandoTexto('IDENTIFICACAO', 42, 677, 9, true, '0.02 0.35 0.63'),
    comandoTexto(`Protocolo: ${dados.protocolo}`, 42, 657, 10, true),
    comandoTexto(`Versao: ${dados.versao}`, 330, 657, 10),
    comandoTexto(`Empresa: ${dados.empresa}`, 42, 637, 10),
    comandoTexto(`Destinatario: ${dados.destinatario}`, 42, 617, 10),
    comandoTexto('SERVICO', 42, 579, 9, true, '0.02 0.35 0.63'),
    comandoTexto(dados.servico, 42, 557, 13, true),
  ];

  let yDescricao = 535;
  for (const linha of quebrarTexto(dados.descricao).slice(0, 5)) {
    comandos.push(comandoTexto(linha, 42, yDescricao, 9));
    yDescricao -= 14;
  }

  comandos.push(
    'q 0.97 0.98 0.99 rg 42 390 511 104 re f Q',
    comandoTexto('CONDICOES DA PRE-PROPOSTA', 56, 472, 9, true, '0.02 0.35 0.63'),
    comandoTexto('Valor estimado', 56, 446, 9),
    comandoTexto(dados.valor, 56, 420, 20, true, '0.02 0.35 0.63'),
    comandoTexto('Prazo de pagamento desejado pelo Cliente', 330, 446, 9),
    comandoTexto(`${dados.prazoPagamentoDias} dias`, 330, 420, 15, true),
    comandoTexto(`Emitida em: ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(dados.emitidaEm)}`, 42, 350, 9),
    'q 0.84 0.89 0.92 rg 42 98 511 1 re f Q',
    comandoTexto('Portal de Metrologia SENAI - Ambiente de homologacao - Dados sinteticos', 42, 78, 8),
    comandoTexto('Este PDF e protegido por hash e nao substitui o documento comercial oficial.', 42, 63, 8),
    comandoTexto('Pagina 1 de 1', 483, 45, 8),
  );

  const conteudo = bytesWinAnsi(comandos.join('\n'));
  const objetos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
  ].map(bytesWinAnsi);
  objetos.push(concatenar([
    bytesWinAnsi(`<< /Length ${conteudo.length} >>\nstream\n`),
    conteudo,
    bytesWinAnsi('\nendstream'),
  ]));
  objetos.push(bytesWinAnsi(`<< /Title (${escaparTextoPdf(`Pre-proposta ${dados.protocolo}`)}) /Author (Portal de Metrologia SENAI) /Creator (Portal de Metrologia SENAI) >>`));

  const partes: Uint8Array[] = [bytesWinAnsi('%PDF-1.4\n%âãÏÓ\n')];
  const offsets = [0];
  let posicao = partes[0].length;
  objetos.forEach((objeto, indice) => {
    offsets.push(posicao);
    const bloco = concatenar([bytesWinAnsi(`${indice + 1} 0 obj\n`), objeto, bytesWinAnsi('\nendobj\n')]);
    partes.push(bloco);
    posicao += bloco.length;
  });

  const inicioXref = posicao;
  const linhasXref = ['xref', `0 ${objetos.length + 1}`, '0000000000 65535 f '];
  for (let indice = 1; indice <= objetos.length; indice += 1) {
    linhasXref.push(`${String(offsets[indice]).padStart(10, '0')} 00000 n `);
  }
  partes.push(bytesWinAnsi(`${linhasXref.join('\n')}\ntrailer\n<< /Size ${objetos.length + 1} /Root 1 0 R /Info 7 0 R >>\nstartxref\n${inicioXref}\n%%EOF\n`));
  return concatenar(partes);
}

export async function calcularSha256Hex(bytes: Uint8Array): Promise<string> {
  const copia = new Uint8Array(bytes);
  const resumo = await crypto.subtle.digest('SHA-256', copia.buffer);
  return Array.from(new Uint8Array(resumo), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
