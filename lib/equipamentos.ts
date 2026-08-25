export type MidiaEquipamento = {
  tipo: 'imagem' | 'video';
  src: string;
  alt: string;
  legenda: string;
  poster?: string;
};

export type EquipamentoPublico = {
  slug: string;
  nome: string;
  categoria: string;
  resumo: string;
  descricao: string[];
  imagemPrincipal: string;
  midias: MidiaEquipamento[];
  aplicacoes: string[];
  capacidades: string[];
  tiposMedicao: string[];
  diferenciais: string[];
  referenciaTecnica: string;
  fonteFabricante: string;
};

export const equipamentosPublicos: EquipamentoPublico[] = [
  {
    slug: 'zeiss-duramax',
    nome: 'ZEISS DuraMax HTG 5/5/5',
    categoria: 'Medição tridimensional tátil',
    resumo: 'CMM compacta e robusta para inspeções dimensionais próximas ao ambiente produtivo.',
    descricao: [
      'A configuração instalada no Centro é a DuraMax HTG 5/5/5, uma máquina de medição por coordenadas compacta com construção aberta e acesso direto à mesa.',
      'O sensor ZEISS VAST XXT permite medições rápidas de ponto único e digitalização tátil de contornos e superfícies livres. A mesa rotativa amplia o fluxo para medições em quatro eixos.',
    ],
    imagemPrincipal: '/imagens/recorte-zeiss-duramax-v3.png',
    midias: [
      { tipo: 'imagem', src: '/imagens/recorte-zeiss-duramax-v3.png', alt: 'Máquina de medição por coordenadas ZEISS DuraMax HTG 5/5/5 em fundo branco', legenda: 'Equipamento em fundo branco' },
      { tipo: 'imagem', src: '/imagens/laboratorio-duramax.jpeg', alt: 'ZEISS DuraMax instalada no Centro de Excelência em Metrologia', legenda: 'Equipamento instalado no Centro' },
      { tipo: 'video', src: '/videos/zeiss-duramax-operacao.mp4', alt: 'Vídeo da ZEISS DuraMax em operação', legenda: 'Equipamento em operação', poster: '/imagens/laboratorio-duramax.jpeg' },
    ],
    aplicacoes: ['Inspeção de peças usinadas', 'Controle de recebimento e processo', 'Validação de dispositivos e ferramentais', 'Medição de geometrias e elementos dimensionais'],
    capacidades: ['Volume de medição instalado: 500 × 500 × 500 mm', 'Sensor ZEISS VAST XXT para ponto único e digitalização de contornos', 'Medição em quatro eixos com mesa rotativa', 'Escala Zerodur e sensores para correção da temperatura da peça'],
    tiposMedicao: ['Dimensões lineares e angulares', 'Forma e posição', 'Perfis e contornos', 'Comparação com modelo CAD'],
    diferenciais: ['Construção aberta correspondente ao modelo real do Centro', 'Baixa expansão térmica da escala Zerodur', 'Correção de temperatura da peça de trabalho', 'Fluxos programáveis e relatórios rastreáveis'],
    referenciaTecnica: 'Configuração identificada no Centro: DuraMax HTG 5/5/5, volume 500 × 500 × 500 mm, sensor VAST XXT e mesa rotativa. A incerteza aplicável e as condições da medição são confirmadas na análise técnica.',
    fonteFabricante: 'https://www.zeiss.com/metrology/en/systems/cmms/shop-floor-cmms/duramax.html',
  },
  {
    slug: 'zeiss-o-inspect',
    nome: 'ZEISS O-INSPECT 5/4/3',
    categoria: 'Medição óptica e multissensor',
    resumo: 'Sistema multissensor para medições ópticas e táteis de peças com geometrias delicadas ou de difícil acesso.',
    descricao: [
      'A configuração O-INSPECT 5/4/3 instalada no Centro reúne medição óptica e por contato em um único sistema, em conformidade declarada no cartaz técnico com a ISO 10360.',
      'O volume de medição de 500 × 400 × 300 mm atende peças com características delicadas, contornos e elementos que exigem combinar estratégias sem contato e táteis.',
    ],
    imagemPrincipal: '/imagens/recorte-zeiss-o-inspect-v2.png',
    midias: [
      { tipo: 'imagem', src: '/imagens/recorte-zeiss-o-inspect-v2.png', alt: 'Máquina multissensor ZEISS O-INSPECT em fundo branco', legenda: 'Equipamento em fundo branco' },
      { tipo: 'imagem', src: '/imagens/laboratorio-o-inspect.jpeg', alt: 'ZEISS O-INSPECT instalada no laboratório', legenda: 'Equipamento instalado no Centro' },
      { tipo: 'video', src: '/videos/zeiss-o-inspect-operacao.mp4', alt: 'Vídeo da ZEISS O-INSPECT em operação', legenda: 'Equipamento em operação', poster: '/imagens/laboratorio-o-inspect.jpeg' },
    ],
    aplicacoes: ['Peças plásticas, estampadas e eletrônicas', 'Componentes com detalhes pequenos', 'Controle de contornos e bordas', 'Inspeção de peças sensíveis ao contato'],
    capacidades: ['Volume de medição instalado: 500 × 400 × 300 mm', 'Medição óptica e por contato no mesmo sistema', 'MPE(E) longitudinal informado em 1D: 1,4 µm + L/250', 'MPE(E) longitudinal informado em 2D: 1,6 µm + L/250; em 3D: 1,9 µm + L/250'],
    tiposMedicao: ['Contornos e arestas', 'Dimensões 2D e 3D', 'Forma e posição', 'Medição de altura e superfícies'],
    diferenciais: ['Flexibilidade multissensor', 'Troca de estratégia sem reposicionar a peça', 'Apoio a medições sem contato', 'Programação e avaliação no ecossistema ZEISS'],
    referenciaTecnica: 'Configuração identificada no Centro: O-INSPECT 5/4/3, volume 500 × 400 × 300 mm. As expressões de MPE(E) reproduzem o cartaz local e devem ser interpretadas conforme a ISO 10360 e as condições válidas para a medição.',
    fonteFabricante: 'https://www.zeiss.com/metrology/en/systems/cmms/vmms/o-inspect.html',
  },
  {
    slug: 'zeiss-prismo',
    nome: 'ZEISS PRISMO VAST 09/24/07',
    categoria: 'Medição tridimensional de alta precisão',
    resumo: 'CMM de alta precisão para geometrias complexas, scanning e inspeções dimensionais exigentes.',
    descricao: [
      'A configuração instalada é a PRISMO VAST 09/24/07, voltada a medições de alta precisão em peças grandes e geometrias complexas.',
      'Além da medição tátil, o recurso LineScan permite capturar superfícies como nuvens de pontos, apoiando inspeção de forma e comparação com modelos CAD.',
    ],
    imagemPrincipal: '/imagens/recorte-zeiss-prismo-v2.png',
    midias: [
      { tipo: 'imagem', src: '/imagens/recorte-zeiss-prismo-v2.png', alt: 'Máquina de medição por coordenadas ZEISS PRISMO em fundo branco', legenda: 'Equipamento em fundo branco' },
      { tipo: 'imagem', src: '/imagens/laboratorio-prismo.jpeg', alt: 'ZEISS PRISMO instalada no Centro', legenda: 'Equipamento instalado no Centro' },
    ],
    aplicacoes: ['Componentes automotivos e de precisão', 'Medição de engrenagens e superfícies complexas', 'Validação de protótipos e ferramentais', 'Inspeções com tolerâncias rigorosas'],
    capacidades: ['Configuração instalada: PRISMO VAST 09/24/07', 'Medição de alta precisão para peças grandes e complexas', 'LineScan para captura de superfícies em nuvens de pontos', 'Escalas de vitrocerâmica Robax com resolução informada de 200 nm'],
    tiposMedicao: ['Dimensão, forma e posição', 'Perfis de linha e superfície', 'Geometrias livres', 'Avaliação de desvios em relação ao CAD'],
    diferenciais: ['Alta precisão e estabilidade', 'Varredura ativa com sensores VAST', 'Produtividade em programas complexos', 'Ampla flexibilidade de sensores e acessórios'],
    referenciaTecnica: 'O cartaz local identifica a configuração PRISMO VAST 09/24/07 e informa uma expressão de precisão com L/350 µm. A fórmula completa, os sensores disponíveis e as condições de validade devem ser confirmados com a equipe antes de constarem na proposta.',
    fonteFabricante: 'https://www.zeiss.com/metrology/en/systems/cmms/bridge-type-cmms/prismo-family.html',
  },
  {
    slug: 'zeiss-bosello-max-80',
    nome: 'ZEISS BOSELLO MAX 80-150',
    categoria: 'Raios X e inspeção não destrutiva',
    resumo: 'Sistema de raios X para detectar e avaliar descontinuidades internas sem seccionar a peça.',
    descricao: [
      'A configuração instalada no Centro é a BOSELLO MAX 80-150, um sistema de raios X 2D para inspeção não destrutiva de peças e conjuntos.',
      'O equipamento examina estruturas internas sem danificar a peça, apoia reconhecimento automático de defeitos e é preparado para adquirir conjuntos de imagens destinados à geração de modelos 3D de peças fundidas.',
    ],
    imagemPrincipal: '/imagens/recorte-zeiss-bosello-max-v3.png',
    midias: [
      { tipo: 'imagem', src: '/imagens/recorte-zeiss-bosello-max-v3.png', alt: 'Sistema de raios X ZEISS BOSELLO MAX 80-150 completo em fundo branco', legenda: 'Equipamento em fundo branco' },
      { tipo: 'imagem', src: '/imagens/laboratorio-bosello.jpeg', alt: 'ZEISS BOSELLO MAX instalada no Centro', legenda: 'Equipamento instalado no Centro' },
      { tipo: 'video', src: '/videos/zeiss-bosello-max-operacao.mp4', alt: 'Vídeo da ZEISS BOSELLO MAX em operação', legenda: 'Equipamento em operação', poster: '/imagens/laboratorio-bosello.jpeg' },
    ],
    aplicacoes: ['Fundidos e componentes automotivos', 'Peças montadas e conjuntos', 'Investigação de porosidade e inclusões', 'Análise de falhas internas'],
    capacidades: ['Inspeção radiográfica por raios X 2D', 'Exame interno sem danificar a peça', 'Reconhecimento automático de defeitos para diferentes aplicações', 'Sistema CT-ready para adquirir imagens destinadas a modelos 3D de fundidos'],
    tiposMedicao: ['Detecção de descontinuidades', 'Avaliação de montagem interna', 'Investigação de falhas', 'Comparação qualitativa e dimensional de projeções'],
    diferenciais: ['Ensaio não destrutivo', 'Visualização de características ocultas', 'Configuração adaptável à aplicação', 'Apoio a triagem e investigação de causa'],
    referenciaTecnica: 'Configuração identificada no Centro: BOSELLO MAX 80-150. A viabilidade radiográfica e a geração de modelos 3D dependem de material, espessura, geometria, energia e estratégia de aquisição.',
    fonteFabricante: 'https://www.zeiss.com/metrology/us/systems/ct_x-ray/2d-x-ray/bosello-max.html',
  },
  {
    slug: 'zeiss-atos-q',
    nome: 'ZEISS ATOS Q 8M',
    categoria: 'Digitalização óptica 3D',
    resumo: 'Scanner industrial de luz azul estruturada para captura de superfícies, inspeção e engenharia reversa.',
    descricao: [
      'O ATOS Q digitaliza superfícies sem contato e gera dados tridimensionais densos para inspeção de forma, comparação nominal-real e documentação dimensional.',
      'Seu formato compacto favorece aplicações manuais ou semiautomatizadas, atendendo peças pequenas e médias com diferentes áreas de medição.',
    ],
    imagemPrincipal: '/imagens/recorte-zeiss-atos-q-v2.png',
    midias: [
      { tipo: 'imagem', src: '/imagens/recorte-zeiss-atos-q-v2.png', alt: 'Scanner industrial ZEISS ATOS Q em fundo branco', legenda: 'Equipamento em fundo branco' },
      { tipo: 'imagem', src: '/imagens/laboratorio-atos-q.jpeg', alt: 'ZEISS ATOS Q instalada no Centro', legenda: 'Equipamento instalado no Centro' },
      { tipo: 'video', src: '/videos/zeiss-atos-q-operacao.mp4', alt: 'Vídeo do ZEISS ATOS Q em operação', legenda: 'Equipamento em operação', poster: '/imagens/laboratorio-atos-q.jpeg' },
    ],
    aplicacoes: ['Inspeção de peças plásticas, fundidas e estampadas', 'Engenharia reversa', 'Desenvolvimento de produto e try-out', 'Controle de manufatura aditiva'],
    capacidades: ['Aquisição de até 8 milhões de pontos por varredura na versão 8M', 'Áreas de medição intercambiáveis', 'Luz azul estruturada e princípio Triple Scan', 'Fluxo de inspeção e relatórios no ZEISS INSPECT'],
    tiposMedicao: ['Mapa de desvios nominal-real', 'GD&T em dados de superfície', 'Espessuras, seções e recortes', 'Malha poligonal para engenharia reversa'],
    diferenciais: ['Medição de campo completo sem contato', 'Mobilidade e configuração flexível', 'Monitoramento da qualidade dos dados', 'Boa cobertura de geometrias complexas'],
    referenciaTecnica: 'A versão instalada é ATOS Q 8M. Área de medição, lentes, preparação superficial e estratégia são definidas conforme o tamanho, acabamento e precisão requerida.',
    fonteFabricante: 'https://www.zeiss.com/metrology/us/systems/optical-3d/3d-scanning/atos/atos-q.html',
  },
  {
    slug: 'zeiss-t-scan-hawk-2',
    nome: 'ZEISS T-SCAN hawk 2',
    categoria: 'Scanner laser 3D portátil',
    resumo: 'Scanner laser manual para capturar peças e estruturas no local, com mobilidade e precisão metrológica.',
    descricao: [
      'O T-SCAN hawk 2 permite digitalização 3D portátil em peças que não podem ser levadas a uma máquina fixa ou que exigem liberdade de acesso.',
      'Modos de captura para detalhes, cavidades e objetos maiores apoiam inspeção, manutenção e engenharia reversa em diferentes ambientes.',
    ],
    imagemPrincipal: '/imagens/recorte-zeiss-t-scan-hawk-2-v3.png',
    midias: [
      { tipo: 'imagem', src: '/imagens/recorte-zeiss-t-scan-hawk-2-v3.png', alt: 'Scanner portátil ZEISS T-SCAN hawk 2 completo em fundo branco', legenda: 'Equipamento em fundo branco' },
      { tipo: 'imagem', src: '/imagens/laboratorio-t-scan-hawk-2.jpeg', alt: 'ZEISS T-SCAN hawk 2 em sua maleta no Centro', legenda: 'Equipamento instalado no Centro' },
    ],
    aplicacoes: ['Engenharia reversa de peças e estruturas', 'Inspeção no local', 'Manutenção, reparo e revisão', 'Digitalização de geometrias grandes ou de difícil acesso'],
    capacidades: ['Scanner laser azul de classe 2', 'Operação manual com aproximadamente 1 kg', 'Modo satélite para objetos maiores', 'Captura de detalhes e cavidades profundas'],
    tiposMedicao: ['Nuvem de pontos e malha 3D', 'Comparação com CAD', 'Inspeção de superfície', 'Aquisição para reconstrução geométrica'],
    diferenciais: ['Portabilidade', 'Controle do fluxo pelo próprio scanner', 'Uso em peças de diferentes portes', 'Rapidez de preparação e aquisição'],
    referenciaTecnica: 'Precisão, quantidade de marcadores e estratégia dependem do volume e das condições de captura. A equipe confirma a abordagem após analisar a peça e a finalidade.',
    fonteFabricante: 'https://www.zeiss.com/metrology/en/about-us/newsroom/2023/t-scan-hawk-2.html',
  },
];

export function encontrarEquipamento(slug: string) {
  return equipamentosPublicos.find((equipamento) => equipamento.slug === slug);
}
