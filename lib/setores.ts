import type { ServicoOficial } from './servicos';

export type SetorIndustria = {
  slug: string;
  titulo: string;
  resumo: string;
  exemplos: string;
  servicos: ServicoOficial['slug'][];
  midia: {
    tipo: 'imagem' | 'video';
    src: string;
    poster?: string;
    alt: string;
    legenda: string;
  };
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
    midia: {
      tipo: 'video',
      src: '/videos/zeiss-duramax-operacao.mp4',
      poster: '/imagens/laboratorio-duramax.jpeg',
      alt: 'Operação metrológica no laboratório',
      legenda: 'Medição dimensional no acervo autorizado do laboratório',
    },
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
    midia: {
      tipo: 'video',
      src: '/videos/zeiss-atos-q-operacao.mp4',
      poster: '/imagens/laboratorio-atos-q.jpeg',
      alt: 'Digitalização óptica no laboratório',
      legenda: 'Digitalização óptica 3D no acervo autorizado do laboratório',
    },
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
    midia: {
      tipo: 'video',
      src: '/videos/zeiss-bosello-max-operacao.mp4',
      poster: '/imagens/laboratorio-bosello.jpeg',
      alt: 'Tomografia industrial com o equipamento ZEISS BOSELLO MAX',
      legenda: 'Tomografia industrial Bosello no acervo autorizado do laboratório',
    },
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
    midia: {
      tipo: 'imagem',
      src: '/imagens/laboratorio-prismo-panoramica.jpeg',
      alt: 'Máquina de medição por coordenadas no laboratório',
      legenda: 'Estrutura de metrologia dimensional do laboratório',
    },
  },
];
