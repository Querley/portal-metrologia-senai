export type ServicoOficial = {
  slug: string;
  titulo: string;
  resumo: string;
  grupo: 'digitalizacao' | 'inspecao' | 'engenharia' | 'gestao';
};

export const servicosOficiais: ServicoOficial[] = [
  {
    slug: 'escaneamento-3d-digitalizacao-pecas',
    titulo: 'Escaneamento 3D e digitalização de peças',
    resumo: 'Captura da geometria de peças e conjuntos para gerar dados tridimensionais utilizáveis em inspeção, documentação e engenharia.',
    grupo: 'digitalizacao',
  },
  {
    slug: 'engenharia-reversa-reconstrucao-cad',
    titulo: 'Engenharia reversa e reconstrução CAD',
    resumo: 'Reconstrução de modelos digitais a partir da peça física, apoiando manutenção, reprodução, melhoria e documentação técnica.',
    grupo: 'engenharia',
  },
  {
    slug: 'nacionalizacao-desenvolvimento-componentes',
    titulo: 'Nacionalização e desenvolvimento de componentes',
    resumo: 'Apoio técnico para compreender, documentar e desenvolver componentes equivalentes ou adaptados às necessidades da indústria.',
    grupo: 'engenharia',
  },
  {
    slug: 'metrologia-avancada-inspecao-dimensional',
    titulo: 'Metrologia avançada ZEISS e inspeção dimensional',
    resumo: 'Medição de dimensões, forma, posição e geometrias complexas com tecnologias ZEISS e relatórios técnicos.',
    grupo: 'inspecao',
  },
  {
    slug: 'comparacao-cad-peca-fisica',
    titulo: 'Comparação CAD × peça física',
    resumo: 'Comparação nominal-real para localizar, visualizar e quantificar desvios entre o projeto digital e o componente produzido.',
    grupo: 'inspecao',
  },
  {
    slug: 'mapa-desgaste',
    titulo: 'Mapa de desgaste',
    resumo: 'Mapeamento de alterações geométricas e perda de material para apoiar diagnóstico, manutenção e acompanhamento de vida útil.',
    grupo: 'inspecao',
  },
  {
    slug: 'tomografia-industrial',
    titulo: 'Tomografia industrial para inspeção interna não destrutiva',
    resumo: 'Investigação de características internas sem seccionar a peça, conforme viabilidade técnica do material e da geometria.',
    grupo: 'inspecao',
  },
  {
    slug: 'analise-falhas-quebras-anomalias',
    titulo: 'Análise de falhas, quebras e anomalias',
    resumo: 'Apoio metrológico à investigação de ocorrências, desvios e mecanismos de falha em componentes e conjuntos.',
    grupo: 'engenharia',
  },
  {
    slug: 'arvore-equipamentos-pecas-criticas',
    titulo: 'Estruturação de árvore de equipamentos e peças críticas',
    resumo: 'Organização hierárquica de ativos, subconjuntos e componentes críticos para facilitar rastreabilidade e gestão técnica.',
    grupo: 'gestao',
  },
  {
    slug: 'almoxarifado-virtual-biblioteca-digital',
    titulo: 'Apoio na criação de almoxarifado virtual e biblioteca digital de peças',
    resumo: 'Estruturação de um acervo digital de peças, modelos e informações técnicas para consulta, reposição e continuidade operacional.',
    grupo: 'gestao',
  },
];
