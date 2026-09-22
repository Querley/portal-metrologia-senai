import type { MidiaEquipamento } from './equipamentos';
import type { ServicoOficial } from './servicos';

export type SetorIndustria = {
  slug: string;
  titulo: string;
  resumo: string;
  exemplos: string;
  servicos: ServicoOficial['slug'][];
  midias: MidiaEquipamento[];
};

export const setoresIndustria: SetorIndustria[] = [
  {
    slug: 'industria-geral',
    titulo: 'Indústria e processos produtivos',
    resumo: 'Apoio a fábricas, plantas de processo e operações de manutenção que precisam medir, diagnosticar ou reproduzir componentes.',
    exemplos: 'Alimentos, mineração, papel e celulose, bens de consumo e indústria de base.',
    servicos: [
      'escaneamento-3d-digitalizacao-pecas',
      'engenharia-reversa-reconstrucao-cad',
      'nacionalizacao-desenvolvimento-componentes',
      'metrologia-avancada-inspecao-dimensional',
      'comparacao-cad-peca-fisica',
      'mapa-desgaste',
      'tomografia-industrial',
      'analise-falhas-quebras-anomalias',
      'arvore-equipamentos-pecas-criticas',
      'almoxarifado-virtual-biblioteca-digital',
    ],
    midias: [
      { tipo: 'video', src: '/videos/setor-industria-medicao-bomba-tomate.mp4', alt: 'Medição dos cilindros internos de uma bomba de extrato de tomate', legenda: 'Verificação dimensional dos cilindros internos de uma bomba industrial' },
      { tipo: 'imagem', src: '/imagens/setor-industria-bombas-tomate-componentes.jpeg', alt: 'Componentes desmontados de bombas de extrato de tomate organizados para inspeção', legenda: 'Componentes de bombas industriais preparados para medição' },
      { tipo: 'imagem', src: '/imagens/setor-industria-bombas-tomate-conjunto.jpeg', alt: 'Conjunto de bombas de extrato de tomate após o trabalho dimensional', legenda: 'Conjunto industrial atendido pelo Centro de Excelência em Metrologia' },
    ],
  },
  {
    slug: 'automotivo-mobilidade',
    titulo: 'Automotivo e mobilidade',
    resumo: 'Inspeção, digitalização e comparação de componentes, conjuntos, ferramentas e protótipos do setor de mobilidade.',
    exemplos: 'Fabricantes, sistemistas, preparadores, custom shops e fornecedores de componentes.',
    servicos: [
      'escaneamento-3d-digitalizacao-pecas',
      'engenharia-reversa-reconstrucao-cad',
      'nacionalizacao-desenvolvimento-componentes',
      'metrologia-avancada-inspecao-dimensional',
      'comparacao-cad-peca-fisica',
      'mapa-desgaste',
      'tomografia-industrial',
      'analise-falhas-quebras-anomalias',
    ],
    midias: [
      { tipo: 'video', src: '/videos/setor-automotivo-borboleta-scan-cad.mp4', alt: 'Digitalização de uma borboleta de admissão para reconstrução CAD', legenda: 'Da peça física ao CAD em uma aplicação automotiva' },
      { tipo: 'imagem', src: '/imagens/setor-automotivo-veiculo.png', alt: 'Automóvel clássico que recebeu o conjunto de admissão analisado', legenda: 'Aplicação automotiva do projeto de engenharia reversa' },
      { tipo: 'imagem', src: '/imagens/setor-automotivo-borboleta-instalada.png', alt: 'Borboleta de admissão instalada no motor do automóvel', legenda: 'Componente de admissão instalado no veículo' },
      { tipo: 'imagem', src: '/imagens/setor-automotivo-borboleta-admissao.png', alt: 'Borboleta de admissão automotiva isolada em fundo branco', legenda: 'Geometria da borboleta de admissão usada no projeto' },
    ],
  },
  {
    slug: 'aeronautico',
    titulo: 'Aeronáutico',
    resumo: 'Metrologia para componentes de alta complexidade, documentação dimensional, inspeção interna e apoio à engenharia.',
    exemplos: 'Fabricantes, manutenção aeronáutica e fornecedores de peças e subconjuntos.',
    servicos: [
      'escaneamento-3d-digitalizacao-pecas',
      'engenharia-reversa-reconstrucao-cad',
      'nacionalizacao-desenvolvimento-componentes',
      'metrologia-avancada-inspecao-dimensional',
      'comparacao-cad-peca-fisica',
      'mapa-desgaste',
      'tomografia-industrial',
      'analise-falhas-quebras-anomalias',
    ],
    midias: [
      { tipo: 'video', src: '/videos/setor-aeronautico-peca-aviao.mp4', alt: 'Inspeção de uma peça aeronáutica no Centro', legenda: 'Metrologia aplicada a um componente aeronáutico' },
      { tipo: 'video', src: '/videos/setor-aeronautico-aviao.mp4', alt: 'Aeronave relacionada à aplicação de metrologia', legenda: 'Contexto de aplicação no setor aeronáutico' },
    ],
  },
  {
    slug: 'ferramentaria-produto',
    titulo: 'Ferramentaria e desenvolvimento de produto',
    resumo: 'Um caminho direto para quem desenvolve moldes, dispositivos, protótipos ou precisa reconstruir geometrias existentes.',
    exemplos: 'Ferramentarias, usinagem, manufatura aditiva, engenharia e desenvolvimento de produto.',
    servicos: [
      'escaneamento-3d-digitalizacao-pecas',
      'engenharia-reversa-reconstrucao-cad',
      'nacionalizacao-desenvolvimento-componentes',
      'metrologia-avancada-inspecao-dimensional',
      'comparacao-cad-peca-fisica',
      'mapa-desgaste',
      'almoxarifado-virtual-biblioteca-digital',
    ],
    midias: [
      { tipo: 'video', src: '/videos/setor-ferramentaria-engenharia-reversa-engrenagem.mp4', alt: 'Engenharia reversa de uma engrenagem para ferramentaria', legenda: 'Reconstrução digital de engrenagem para desenvolvimento de produto' },
    ],
  },
];
