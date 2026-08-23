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
    nome: 'ZEISS DuraMax HTG',
    categoria: 'Medição tridimensional tátil',
    resumo: 'CMM compacta e robusta para inspeções dimensionais próximas ao ambiente produtivo.',
    descricao: [
      'A DuraMax combina medição por coordenadas e digitalização tátil de contornos em uma estrutura compacta, com acesso facilitado à peça.',
      'É indicada para componentes pequenos e médios que exigem controle dimensional repetível, desde a primeira peça até verificações seriadas.',
    ],
    imagemPrincipal: '/imagens/recorte-zeiss-duramax-v1.png',
    midias: [
      { tipo: 'imagem', src: '/imagens/recorte-zeiss-duramax-v1.png', alt: 'Máquina de medição por coordenadas ZEISS DuraMax HTG sem fundo', legenda: 'Equipamento sem fundo' },
      { tipo: 'imagem', src: '/imagens/laboratorio-duramax.jpeg', alt: 'ZEISS DuraMax instalada no Centro de Excelência em Metrologia', legenda: 'Equipamento instalado no Centro' },
    ],
    aplicacoes: ['Inspeção de peças usinadas', 'Controle de recebimento e processo', 'Validação de dispositivos e ferramentais', 'Medição de geometrias e elementos dimensionais'],
    capacidades: ['Volume de referência da família: 500 × 500 × 500 mm', 'Medição tátil ponto a ponto e por varredura', 'Acesso para carregamento por três lados e por cima', 'Operação com ZEISS CALYPSO'],
    tiposMedicao: ['Dimensões lineares e angulares', 'Forma e posição', 'Perfis e contornos', 'Comparação com modelo CAD'],
    diferenciais: ['Construção voltada ao chão de fábrica', 'Boa relação entre volume de medição e área ocupada', 'Sensor VAST XXT para pontos e scanning', 'Fluxos programáveis e relatórios rastreáveis'],
    referenciaTecnica: 'Os valores acima descrevem a família DuraMax. Curso, sensores, incerteza e condições aplicáveis ao equipamento instalado são confirmados na análise técnica.',
    fonteFabricante: 'https://www.zeiss.com/metrology/en/systems/cmms/shop-floor-cmms/duramax.html',
  },
  {
    slug: 'zeiss-o-inspect',
    nome: 'ZEISS O-INSPECT',
    categoria: 'Medição óptica e multissensor',
    resumo: 'Sistema multissensor para medições ópticas e táteis de peças com geometrias delicadas ou de difícil acesso.',
    descricao: [
      'A O-INSPECT reúne sensores ópticos e táteis em um único fluxo, permitindo escolher a estratégia mais adequada para cada característica da peça.',
      'A medição sem contato favorece componentes sensíveis, enquanto o recurso tátil amplia a cobertura de geometrias e elementos funcionais.',
    ],
    imagemPrincipal: '/imagens/recorte-zeiss-o-inspect-v1.png',
    midias: [
      { tipo: 'imagem', src: '/imagens/recorte-zeiss-o-inspect-v1.png', alt: 'Máquina multissensor ZEISS O-INSPECT sem fundo', legenda: 'Equipamento sem fundo' },
      { tipo: 'imagem', src: '/imagens/laboratorio-o-inspect.jpeg', alt: 'ZEISS O-INSPECT instalada no laboratório', legenda: 'Equipamento instalado no Centro' },
    ],
    aplicacoes: ['Peças plásticas, estampadas e eletrônicas', 'Componentes com detalhes pequenos', 'Controle de contornos e bordas', 'Inspeção de peças sensíveis ao contato'],
    capacidades: ['Medição óptica e tátil no mesmo sistema', 'Família com diferentes volumes de medição', 'Câmera de alta resolução e iluminação controlada', 'Sensores adicionais conforme configuração'],
    tiposMedicao: ['Contornos e arestas', 'Dimensões 2D e 3D', 'Forma e posição', 'Medição de altura e superfícies'],
    diferenciais: ['Flexibilidade multissensor', 'Troca de estratégia sem reposicionar a peça', 'Apoio a medições sem contato', 'Programação e avaliação no ecossistema ZEISS'],
    referenciaTecnica: 'A O-INSPECT é uma família configurável. Volume, sensores e desempenho do equipamento do Centro devem ser confirmados antes da proposta.',
    fonteFabricante: 'https://www.zeiss.com/metrology/en/systems/cmms/vmms/o-inspect.html',
  },
  {
    slug: 'zeiss-prismo',
    nome: 'ZEISS PRISMO',
    categoria: 'Medição tridimensional de alta precisão',
    resumo: 'CMM de alta precisão para geometrias complexas, scanning e inspeções dimensionais exigentes.',
    descricao: [
      'A PRISMO é voltada a tarefas que combinam elevada precisão, estabilidade e produtividade, com medição tátil por varredura de alta velocidade.',
      'Sua arquitetura atende componentes complexos e permite construir programas de medição completos, com avaliação geométrica e comparação CAD.',
    ],
    imagemPrincipal: '/imagens/recorte-zeiss-prismo-v1.png',
    midias: [
      { tipo: 'imagem', src: '/imagens/recorte-zeiss-prismo-v1.png', alt: 'Máquina de medição por coordenadas ZEISS PRISMO sem fundo', legenda: 'Equipamento sem fundo' },
      { tipo: 'imagem', src: '/imagens/laboratorio-prismo.jpeg', alt: 'ZEISS PRISMO instalada no Centro', legenda: 'Equipamento instalado no Centro' },
    ],
    aplicacoes: ['Componentes automotivos e de precisão', 'Medição de engrenagens e superfícies complexas', 'Validação de protótipos e ferramentais', 'Inspeções com tolerâncias rigorosas'],
    capacidades: ['Scanning tátil de alta velocidade', 'Família com volumes para peças de diferentes portes', 'Estratégias automatizadas de medição', 'Integração com CAD e relatórios dimensionais'],
    tiposMedicao: ['Dimensão, forma e posição', 'Perfis de linha e superfície', 'Geometrias livres', 'Avaliação de desvios em relação ao CAD'],
    diferenciais: ['Alta precisão e estabilidade', 'Varredura ativa com sensores VAST', 'Produtividade em programas complexos', 'Ampla flexibilidade de sensores e acessórios'],
    referenciaTecnica: 'As especificações publicadas variam entre modelos da família PRISMO. A configuração instalada, os acessórios e a incerteza aplicável são validados caso a caso.',
    fonteFabricante: 'https://www.zeiss.com/metrology/en/systems/cmms/bridge-type-cmms/prismo-family.html',
  },
  {
    slug: 'zeiss-bosello-max-80',
    nome: 'ZEISS BOSELLO MAX 80',
    categoria: 'Raios X e inspeção não destrutiva',
    resumo: 'Sistema de raios X para detectar e avaliar descontinuidades internas sem seccionar a peça.',
    descricao: [
      'A BOSELLO MAX foi desenvolvida para inspeção radiográfica industrial e análise de estruturas internas, apoiando decisões de qualidade sem destruir o componente.',
      'O sistema pode revelar porosidades, inclusões, trincas, falhas de montagem e outras descontinuidades que não são visíveis externamente.',
    ],
    imagemPrincipal: '/imagens/recorte-zeiss-bosello-max-v1.png',
    midias: [
      { tipo: 'imagem', src: '/imagens/recorte-zeiss-bosello-max-v1.png', alt: 'Sistema de raios X ZEISS BOSELLO MAX sem fundo', legenda: 'Equipamento sem fundo' },
      { tipo: 'imagem', src: '/imagens/laboratorio-bosello.jpeg', alt: 'ZEISS BOSELLO MAX instalada no Centro', legenda: 'Equipamento instalado no Centro' },
    ],
    aplicacoes: ['Fundidos e componentes automotivos', 'Peças montadas e conjuntos', 'Investigação de porosidade e inclusões', 'Análise de falhas internas'],
    capacidades: ['Inspeção radiográfica 2D', 'Aquisição de diferentes projeções da peça', 'Sistema configurável para diferentes energias e portes', 'Avaliação digital de regiões internas'],
    tiposMedicao: ['Detecção de descontinuidades', 'Avaliação de montagem interna', 'Investigação de falhas', 'Comparação qualitativa e dimensional de projeções'],
    diferenciais: ['Ensaio não destrutivo', 'Visualização de características ocultas', 'Configuração adaptável à aplicação', 'Apoio a triagem e investigação de causa'],
    referenciaTecnica: 'A capacidade depende da energia, geometria, material e espessura atravessada. A viabilidade radiográfica é confirmada com os dados e amostras do projeto.',
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
    imagemPrincipal: '/imagens/recorte-zeiss-atos-q-v1.png',
    midias: [
      { tipo: 'imagem', src: '/imagens/recorte-zeiss-atos-q-v1.png', alt: 'Scanner industrial ZEISS ATOS Q sem fundo', legenda: 'Equipamento sem fundo' },
      { tipo: 'imagem', src: '/imagens/laboratorio-atos-q.jpeg', alt: 'ZEISS ATOS Q instalada no Centro', legenda: 'Equipamento instalado no Centro' },
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
    imagemPrincipal: '/imagens/recorte-zeiss-t-scan-hawk-2-v1.png',
    midias: [
      { tipo: 'imagem', src: '/imagens/recorte-zeiss-t-scan-hawk-2-v1.png', alt: 'Scanner portátil ZEISS T-SCAN hawk 2 sem fundo', legenda: 'Equipamento sem fundo' },
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
