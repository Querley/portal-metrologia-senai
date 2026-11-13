import type { SupabaseClient } from '@supabase/supabase-js';
import type { AnexoMensagem } from './anexos-mensagem';
import type { AnexoSolicitacaoCliente } from './anexos-solicitacao';
import { formatarDinheiro } from './calculos';
import { formatarDesvio, formatarHoras, type IndicadorExecucaoPersistente } from './conhecimento-persistente';
import type { PerfilInterno } from './contratos';
import { equipamentosPublicos, type MidiaEquipamento } from './equipamentos';
import { calcularProgressoExecucao, type ExecucaoInterna } from './execucoes-persistentes';
import type { IdiomaPublico } from './idioma-publico';
import type { ConversaInterna } from './mensagens-persistentes';
import { servicosOficiais, type ServicoOficial } from './servicos';
import { setoresIndustria } from './setores';
import type { SolicitacaoParaPreProposta } from './solicitacoes-persistentes';
import { traduzirTextoPublico } from './traducao-publica';

export type MensagemChatIa = {
  id: string;
  autor: 'usuario' | 'assistente';
  texto: string;
  fontes?: string[];
  criadaEm: string;
};

let contadorMensagemChatIa = 0;

export function criarMensagemChatIa(
  autor: 'usuario' | 'assistente',
  texto: string,
  idioma = 'pt-BR',
  fontes?: string[],
): MensagemChatIa {
  contadorMensagemChatIa += 1;
  return {
    id: `${autor}-${contadorMensagemChatIa}`,
    autor,
    texto,
    fontes,
    criadaEm: new Intl.DateTimeFormat(idioma, { hour: '2-digit', minute: '2-digit' }).format(new Date()),
  };
}

export type EventoLaboratorio = {
  tipo: 'recente' | 'agora' | 'proximo';
  data: string;
  titulo: string;
  resumo: string;
  midias?: MidiaEquipamento[];
};

export type OrcamentoResumoInterno = {
  versao_id: string;
  numero: number;
  estado: string;
  criada_em: string;
  descricao: string;
  servico_slug: string;
  equipamento_nome: string;
  horas: string | number;
  preco_final?: string | number | null;
  custo_congelado?: string | number | null;
  solicitacao_id: string;
  solicitacao_codigo: number;
  empresa_nome: string;
  destinatario?: string;
  prazo_pagamento_dias?: number;
  entrega_estimada?: string | null;
  recusa_motivo?: string | null;
  justificativa_estimativa?: string | null;
  ultima_justificativa_interna?: string | null;
  publicacao_pronta?: boolean;
};

export type ContextoOperacionalLaboratorio = {
  perfil: PerfilInterno;
  atualizadoEm: string;
  solicitacoes: SolicitacaoParaPreProposta[];
  anexosPorSolicitacao: Record<string, AnexoSolicitacaoCliente[]>;
  orcamentos: OrcamentoResumoInterno[];
  execucoes: ExecucaoInterna[];
  conversas: ConversaInterna[];
  indicadores: IndicadorExecucaoPersistente[];
};

export const ETAPAS_INSTRUCOES_POR_SERVICO: Record<string, string[]> = {
  'escaneamento-3d-digitalizacao-pecas': [
    '1. Planejamento (definição de área de medição, lentes e preparação superficial)',
    '2. Digitalização (captura óptica/laser com ZEISS ATOS Q 8M ou T-SCAN hawk 2)',
    '3. Tratamento do modelo 3D (poligonização, limpeza de malha STL e alinhamento)',
    '4. Validação metrológica da qualidade da malha',
    '5. Entrega dos arquivos 3D e relatório técnico',
  ],
  'engenharia-reversa-reconstrucao-cad': [
    '1. Planejamento e análise funcional da peça física',
    '2. Digitalização tridimensional de alta densidade',
    '3. Criação do modelo CAD paramétrico/superfícies',
    '4. Validação (mapa de desvios CAD reconstruído × malha digitalizada)',
    '5. Entrega do modelo CAD (STEP/IGES) e documentação',
  ],
  'nacionalizacao-desenvolvimento-componentes': [
    '1. Planejamento e levantamento de requisitos de operação',
    '2. Medição dimensional e geométrica da peça referência',
    '3. Criação do modelo técnico e especificação de tolerâncias (GD&T)',
    '4. Validação técnica e dimensional',
    '5. Entrega do pacote técnico para fabricação nacional',
  ],
  'metrologia-avancada-inspecao-dimensional': [
    '1. Planejamento e estratégia CNC / estabilização térmica',
    '2. Medições em CMM (ZEISS PRISMO VAST, DuraMax HTG ou O-INSPECT)',
    '3. Análise dos resultados e cotas GD&T',
    '4. Validação do relatório técnico de medição',
    '5. Entrega do relatório oficial ao cliente',
  ],
  'comparacao-cad-peca-fisica': [
    '1. Planejamento e verificação do modelo CAD nominal',
    '2. Medição/digitalização da peça física',
    '3. Alinhamento (Best-Fit / RPS) e mapa cromático de desvios CAD × peça',
    '4. Validação do relatório de desvios',
    '5. Entrega do diagnóstico visual e numérico',
  ],
  'mapa-desgaste': [
    '1. Planejamento e definição da referência sem desgaste',
    '2. Medições tridimensionais do componente em uso',
    '3. Análise de perda volumétrica e mapa de desgaste',
    '4. Validação do mapa e relatório de vida útil',
    '5. Entrega técnica',
  ],
  'tomografia-industrial': [
    '1. Planejamento radiográfico (material, espessura, energia e fixação)',
    '2. Escaneamento por raios X / tomografia (ZEISS BOSELLO MAX 80-150)',
    '3. Processamento das imagens e avaliação interna não destrutiva (porosidade, trincas, montagem)',
    '4. Validação do laudo e imagens internas',
    '5. Entrega do relatório não destrutivo',
  ],
  'analise-falhas-quebras-anomalias': [
    '1. Planejamento da investigação e histórico da ocorrência',
    '2. Medição dimensional, óptica e/ou radiográfica da região afetada',
    '3. Análise metrológica da causa/anomalia geométrica',
    '4. Validação do relatório de investigação',
    '5. Entrega das evidências técnicas',
  ],
  'arvore-equipamentos-pecas-criticas': [
    '1. Planejamento do ativo/linha industrial',
    '2. Coleta das informações e triagem de criticidade',
    '3. Organização hierárquica da árvore de equipamentos e peças',
    '4. Validação com a engenharia de manutenção',
    '5. Entrega da estrutura rastreável',
  ],
  'almoxarifado-virtual-biblioteca-digital': [
    '1. Planejamento do acervo de sobressalentes',
    '2. Digitalização 3D e catalogação dos itens',
    '3. Organização dos modelos digitais e metadados técnicos',
    '4. Validação de integridade do acervo',
    '5. Disponibilização da biblioteca digital',
  ],
};

export const EVENTOS_PADRAO_LABORATORIO: Record<IdiomaPublico, EventoLaboratorio[]> = {
  'pt-BR': [
    {
      tipo: 'recente',
      data: 'Agosto de 2026',
      titulo: 'Congresso SINDAG',
      resumo: 'O Centro apresentou suas capacidades e trocou experiências com profissionais do setor aeroagrícola e industrial durante o congresso.',
      midias: [
        {
          tipo: 'imagem',
          src: '/imagens/evento-congresso-sindag-2026.jpeg',
          alt: 'Equipe do Centro durante o Congresso SINDAG em agosto de 2026',
          legenda: 'Participação no Congresso SINDAG — agosto de 2026',
        },
      ],
    },
    {
      tipo: 'recente',
      data: 'Setembro de 2026',
      titulo: 'ExpoPeças 2026',
      resumo: 'A equipe participou da feira para aproximar a metrologia avançada ZEISS das demandas da indústria de componentes e reposição.',
      midias: [
        {
          tipo: 'imagem',
          src: '/imagens/evento-expopecas-2026.jpeg',
          alt: 'Equipe reunida durante a ExpoPeças em setembro de 2026',
          legenda: 'Participação na ExpoPeças — setembro de 2026',
        },
      ],
    },
    {
      tipo: 'agora',
      data: 'Em desenvolvimento',
      titulo: 'Portal de acompanhamento ampliado (Web & Mobile)',
      resumo: 'Plataforma integrada para solicitações, pré-propostas, execução em tempo real, conhecimento técnico e comunicação com o cliente.',
      midias: [
        {
          tipo: 'video',
          src: '/videos/portal-acompanhamento-servicos.mp4',
          alt: 'Demonstração do portal de acompanhamento dos serviços',
          legenda: 'Software para acompanhamento ampliado dos serviços',
        },
      ],
    },
    {
      tipo: 'proximo',
      data: 'Próximo passo',
      titulo: 'Caminho para a acreditação INMETRO',
      resumo: 'O Centro trabalha na preparação de processos, procedimentos e evidências técnicas para avançar rumo à acreditação.',
    },
  ],
  en: [
    {
      tipo: 'recente',
      data: 'August 2026',
      titulo: 'SINDAG Congress',
      resumo: 'The Center presented its metrology capabilities and exchanged experiences with industry professionals during the congress.',
      midias: [
        {
          tipo: 'imagem',
          src: '/imagens/evento-congresso-sindag-2026.jpeg',
          alt: 'Center team at the SINDAG Congress in August 2026',
          legenda: 'Participation in the SINDAG Congress — August 2026',
        },
      ],
    },
    {
      tipo: 'recente',
      data: 'September 2026',
      titulo: 'ExpoPeças 2026',
      resumo: 'The team attended the trade fair to connect advanced ZEISS metrology with the components and aftermarket industry.',
      midias: [
        {
          tipo: 'imagem',
          src: '/imagens/evento-expopecas-2026.jpeg',
          alt: 'Team gathered at ExpoPeças in September 2026',
          legenda: 'Participation in ExpoPeças — September 2026',
        },
      ],
    },
    {
      tipo: 'agora',
      data: 'In development',
      titulo: 'Expanded service tracking portal (Web & Mobile)',
      resumo: 'Integrated software connecting service requests, pre-proposals, real-time execution tracking and customer communication.',
      midias: [
        {
          tipo: 'video',
          src: '/videos/portal-acompanhamento-servicos.mp4',
          alt: 'Demonstration of the service tracking portal',
          legenda: 'Software for expanded service tracking',
        },
      ],
    },
    {
      tipo: 'proximo',
      data: 'Next step',
      titulo: 'Path toward INMETRO accreditation',
      resumo: 'The Center is preparing processes and technical evidence to advance toward official accreditation.',
    },
  ],
  de: [
    {
      tipo: 'recente',
      data: 'August 2026',
      titulo: 'SINDAG-Kongress',
      resumo: 'Das Zentrum stellte seine messtechnischen Kompetenzen vor und tauschte sich während des Kongresses mit Branchenfachleuten aus.',
      midias: [
        {
          tipo: 'imagem',
          src: '/imagens/evento-congresso-sindag-2026.jpeg',
          alt: 'Team des Zentrums auf dem SINDAG-Kongress im August 2026',
          legenda: 'Teilnahme am SINDAG-Kongress — August 2026',
        },
      ],
    },
    {
      tipo: 'recente',
      data: 'September 2026',
      titulo: 'ExpoPeças 2026',
      resumo: 'Das Team nahm an der Fachmesse teil, um moderne ZEISS-Messtechnik näher an die Komponentenindustrie zu bringen.',
      midias: [
        {
          tipo: 'imagem',
          src: '/imagens/evento-expopecas-2026.jpeg',
          alt: 'Team auf der ExpoPeças im September 2026',
          legenda: 'Teilnahme an der ExpoPeças — September 2026',
        },
      ],
    },
    {
      tipo: 'agora',
      data: 'In Entwicklung',
      titulo: 'Erweitertes Portal zur Auftragsverfolgung (Web & Mobile)',
      resumo: 'Integrierte Plattform für Anfragen, Vorangebote, Echtzeit-Ausführung und Kundenkommunikation.',
      midias: [
        {
          tipo: 'video',
          src: '/videos/portal-acompanhamento-servicos.mp4',
          alt: 'Demonstration des Portals zur Auftragsverfolgung',
          legenda: 'Software zur erweiterten Auftragsverfolgung',
        },
      ],
    },
    {
      tipo: 'proximo',
      data: 'Nächster Schritt',
      titulo: 'Weg zur INMETRO-Akkreditierung',
      resumo: 'Das Zentrum bereitet Prozesse und Nachweise vor, um die Akkreditierung voranzutreiben.',
    },
  ],
};

function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function encontrarServicosCitados(perguntaNormalizada: string): ServicoOficial[] {
  const apelidos: Record<string, string[]> = {
    'escaneamento-3d-digitalizacao-pecas': ['escaneamento', 'digitalizacao', 'scan 3d', 'scanner', 'nuvem de pontos', 'malha', 'digitalizacao-modelo-3d'],
    'engenharia-reversa-reconstrucao-cad': ['engenharia reversa', 'reconstrucao cad', 'reversa', 'modelo cad', 'engenharia-reversa-cad'],
    'nacionalizacao-desenvolvimento-componentes': ['nacionalizacao', 'desenvolvimento de componentes', 'peca importada', 'substituicao'],
    'metrologia-avancada-inspecao-dimensional': ['metrologia avancada', 'inspecao dimensional', 'medicao tridimensional', 'cmm', 'gd&t', 'dimensional', 'medicao-inspecao-dimensional'],
    'comparacao-cad-peca-fisica': ['comparacao cad', 'nominal', 'cad x peca', 'mapa de desvios', 'comparacao'],
    'mapa-desgaste': ['mapa de desgaste', 'desgaste', 'perda de material', 'vida util'],
    'tomografia-industrial': ['tomografia', 'raios x', 'raio x', 'raio-x', 'nao destrutiva', 'porosidade', 'inspecao interna', 'inspecao-interna-nao-destrutiva'],
    'analise-falhas-quebras-anomalias': ['analise de falhas', 'quebras', 'anomalias', 'falha', 'trinca', 'fratura', 'investigacao-falha-anomalia'],
    'arvore-equipamentos-pecas-criticas': ['arvore de equipamentos', 'pecas criticas', 'criticidade', 'ativos'],
    'almoxarifado-virtual-biblioteca-digital': ['almoxarifado virtual', 'biblioteca digital', 'acervo digital', 'orientacao-tecnica'],
  };

  return servicosOficiais.filter((servico) => {
    const tituloNorm = normalizarTexto(servico.titulo);
    const slugNorm = normalizarTexto(servico.slug.replaceAll('-', ' '));
    const listaApelidos = apelidos[servico.slug] ?? [];
    return (
      perguntaNormalizada.includes(tituloNorm) ||
      perguntaNormalizada.includes(slugNorm) ||
      listaApelidos.some((termo) => perguntaNormalizada.includes(normalizarTexto(termo)))
    );
  });
}

function mapearNecessidadeParaSlugServico(necessidade: string): string {
  const mapa: Record<string, string> = {
    'digitalizacao-modelo-3d': 'escaneamento-3d-digitalizacao-pecas',
    'engenharia-reversa-cad': 'engenharia-reversa-reconstrucao-cad',
    'medicao-inspecao-dimensional': 'metrologia-avancada-inspecao-dimensional',
    'inspecao-interna-nao-destrutiva': 'tomografia-industrial',
    'investigacao-falha-anomalia': 'analise-falhas-quebras-anomalias',
    'orientacao-tecnica': 'almoxarifado-virtual-biblioteca-digital',
  };
  return mapa[necessidade] ?? necessidade;
}

export function obterSugestoesChatbotPublico(idioma: IdiomaPublico = 'pt-BR'): string[] {
  if (idioma === 'en') {
    return [
      'What is the SENAI ZEISS Metrology Center?',
      'What events and news are happening at the Center?',
      'Which ZEISS equipment is installed in the lab?',
      'How do I request a metrology quote?',
    ];
  }
  if (idioma === 'de') {
    return [
      'Was ist das SENAI ZEISS Kompetenzzentrum für Messtechnik?',
      'Welche Veranstaltungen und Neuigkeiten gibt es im Zentrum?',
      'Welche ZEISS-Geräte sind im Labor installiert?',
      'Wie kann ich ein Angebot anfordern?',
    ];
  }
  return [
    'O que é o Centro de Excelência em Metrologia SENAI / ZEISS?',
    'Quais são os eventos e novidades do Centro?',
    'Quais equipamentos ZEISS o laboratório possui?',
    'Quais serviços vocês oferecem e como solicitar orçamento?',
  ];
}

export function obterSugestoesChatbotInterno(): string[] {
  return [
    'Resumo geral do laboratório (solicitações, execuções e alertas)',
    'Me fale tudo sobre o serviço de Metrologia Avançada e Inspeção Dimensional',
    'O que pediram, quais anexos/PDFs e mensagens temos em Escaneamento 3D?',
    'Quais problemas, retrabalhos ou mudanças de escopo aconteceram nas execuções?',
    'Quais mensagens os clientes enviaram recentemente e quais arquivos anexaram?',
    'Quais são as instruções/etapas e lições aprendidas de Tomografia Industrial?',
  ];
}

/**
 * Responde às dúvidas do Visitante na Área Pública (somente informações públicas sobre o laboratório,
 * eventos/novidades, parque de equipamentos ZEISS, catálogo de serviços, setores e como solicitar).
 */
export async function responderChatbotPublico(
  pergunta: string,
  idioma: IdiomaPublico = 'pt-BR',
  opcoes?: { eventosPublicados?: EventoLaboratorio[]; chaveGemini?: string },
): Promise<{ texto: string; fontes: string[] }> {
  const q = normalizarTexto(pergunta);
  const eventos = opcoes?.eventosPublicados?.length ? opcoes.eventosPublicados : EVENTOS_PADRAO_LABORATORIO[idioma];

  // Se houver chave Gemini configurada, tenta usar a API com contexto estritamente público
  if (opcoes?.chaveGemini?.trim()) {
    try {
      const contextoPublico = {
        idioma,
        laboratorio: 'Centro de Excelência em Metrologia SENAI (Parceria tecnológica ZEISS) — Goiânia/GO',
        eventosNovidades: eventos,
        equipamentos: equipamentosPublicos.map((e) => ({
          nome: e.nome,
          categoria: e.categoria,
          resumo: e.resumo,
          capacidades: e.capacidades,
          aplicacoes: e.aplicacoes,
        })),
        servicos: servicosOficiais.map((s) => ({
          titulo: s.titulo,
          resumo: s.resumo,
          etapas: ETAPAS_INSTRUCOES_POR_SERVICO[s.slug] ?? [],
        })),
        setores: setoresIndustria.map((st) => ({ titulo: st.titulo, resumo: st.resumo, exemplos: st.exemplos })),
      };
      const respostaGemini = await chamarGeminiTexto(
        opcoes.chaveGemini.trim(),
        `Você é o Assistente Público do Centro de Excelência em Metrologia SENAI / ZEISS. Responda APENAS no idioma ${idioma}, com base exclusivamente nas informações públicas abaixo (laboratório, eventos/novidades, equipamentos ZEISS, serviços, setores e como solicitar orçamento sem conta pela página Solicitar). Nunca invente preços nem exponha dados internos.\nContexto:\n${JSON.stringify(contextoPublico)}`,
        pergunta,
      );
      if (respostaGemini) {
        return {
          texto: respostaGemini,
          fontes: ['Catálogo Público SENAI / ZEISS', 'Novidades no Centro'],
        };
      }
    } catch {
      // Fallback determinístico imediato
    }
  }

  // 0. Perguntas conversacionais livres: "Como você funciona?", "Quem é você?", "O que você faz?", Saudações
  if (
    q.includes('como vc funciona') ||
    q.includes('como voce funciona') ||
    q.includes('como funciona o chat') ||
    q.includes('como funciona o assistente') ||
    q.includes('quem e vc') ||
    q.includes('quem e voce') ||
    q.includes('o que vc faz') ||
    q.includes('o que voce faz') ||
    q.includes('pode me ajudar') ||
    q.includes('me ajude') ||
    q === 'ajuda' ||
    q.includes('how do you work') ||
    q.includes('what can you do') ||
    q.includes('who are you') ||
    q.includes('help me') ||
    q.includes('wie funktionierst du') ||
    q.includes('was kannst du') ||
    q.includes('wer bist du') ||
    /^(oi|ola|bom dia|boa tarde|boa noite|opa|e ai|tudo bem|hello|hi|hey|hallo|guten tag)[?!.\s]*$/.test(q)
  ) {
    if (idioma === 'en') {
      return {
        texto:
          `Hello! I am the **Intelligent Assistant of the SENAI / ZEISS Metrology Center of Excellence**.\n\n` +
          `**How I work:**\n` +
          `You don't need to stick to preset buttons — you can ask me anything in plain language! For example:\n` +
          `• **Describe a technical challenge:** *"I need to inspect internal porosity without cutting the part"* or *"I have a broken gear without a 3D drawing"* and I will recommend the ideal service and ZEISS machine.\n` +
          `• **Ask practical questions:** *"Where is the lab located?"*, *"How much does a measurement cost?"*, *"What is the turnaround time?"*, or *"Which materials and CAD formats do you accept?"*.\n` +
          `• **Explore the Center:** Ask about our **6 ZEISS machines**, **10 official services**, **4 industrial sectors**, or **upcoming events (SINDAG, ExpoPeças, INMETRO)**.`,
        fontes: ['Conversational Assistant SENAI / ZEISS', 'Public Technical Guide'],
      };
    }
    if (idioma === 'de') {
      return {
        texto:
          `Hallo! Ich bin der **intelligente Assistent des SENAI / ZEISS Kompetenzzentrums für Messtechnik**.\n\n` +
          `**Wie ich funktioniere:**\n` +
          `Sie können mir freie Fragen in natürlicher Sprache stellen! Zum Beispiel:\n` +
          `• **Technisches Problem beschreiben:** *„Ich muss innere Porosität zerstörungsfrei prüfen“* oder *„Ich habe ein defektes Zahnrad ohne CAD-Modell“* — ich empfehle Ihnen die passende Leistung und das richtige ZEISS-System.\n` +
          `• **Praktische Fragen stellen:** *„Wo befindet sich das Labor?“*, *„Was kostet eine Messung?“*, *„Wie lange dauert die Durchführung?“* oder *„Welche Werkstoffe und CAD-Formate werden akzeptiert?“*.\n` +
          `• **Zentrum erkunden:** Fragen Sie nach unseren **6 ZEISS-Geräten**, **10 Dienstleistungen**, **4 Branchen** oder **Veranstaltungen**.`,
        fontes: ['Dialog-Assistent SENAI / ZEISS', 'Öffentlicher Leitfaden'],
      };
    }
    return {
      texto:
        `Olá! Eu funciono como o **Assistente Inteligente da Área Pública do Centro de Excelência em Metrologia SENAI / ZEISS**.\n\n` +
        `**Como você pode conversar comigo:**\n` +
        `Você **não precisa usar apenas os botões prontos** — pode digitar sua dúvida livremente! Por exemplo:\n` +
        `• **Descreva a sua peça ou problema:** digite *"minha peça quebrou e não tenho o desenho 3D"*, *"preciso ver se tem bolha/trinca interna sem cortar a peça"* ou *"quero medir um lote de 20 carcaças usinadas"* que eu indico na hora qual serviço e qual máquina ZEISS resolvem o seu caso.\n` +
        `• **Tire dúvidas práticas:** pergunte *"onde fica o laboratório?"*, *"quanto custa um serviço?"*, *"qual o prazo de entrega?"*, *"quais materiais vocês medem?"* ou *"preciso ter arquivo CAD?"*.\n` +
        `• **Consulte o laboratório:** pergunte sobre qualquer uma das **6 máquinas ZEISS**, os **10 serviços**, **eventos (SINDAG, ExpoPeças, INMETRO)** ou **como pedir orçamento**.`,
      fontes: ['Assistente Conversacional SENAI / ZEISS', 'Guia de Atendimento Técnico'],
    };
  }

  // 0.1. Localização / Endereço / Horário / Contato / Onde fica
  if (
    q.includes('onde fica') ||
    q.includes('endereco') ||
    q.includes('localiza') ||
    q.includes('cidade') ||
    q.includes('goiania') ||
    q.includes('goias') ||
    q.includes('fatesg') ||
    q.includes('horario') ||
    q.includes('telefone') ||
    q.includes('whatsapp') ||
    q.includes('visita') ||
    q.includes('where is') ||
    q.includes('location') ||
    q.includes('address') ||
    q.includes('wo ist') ||
    q.includes('wo befindet') ||
    q.includes('standort') ||
    q.includes('adresse')
  ) {
    if (idioma === 'en') {
      return {
        texto:
          `**Location & Operation — SENAI / ZEISS Metrology Center:**\n\n` +
          `• **Location:** Installed at **SENAI Fatesg (FIEG)** in **Goiânia — GO, Brazil**, operating as a national hub that receives industrial parts from all regions of the country.\n` +
          `• **Global Partnership:** It is one of only **5 laboratories of this standard in the world** structured in technological partnership with **ZEISS (Germany)**.\n` +
          `• **Controlled Environment:** Features a climate-controlled metrology room (**20 ± 0.5 °C**) with vibration isolation and INMETRO traceability.\n` +
          `• **How to start:** Use the **Request a quote** tab to register your demand and receive your tracking protocol.`,
        fontes: ['Institutional Profile SENAI / ZEISS', 'Laboratory Infrastructure'],
      };
    }
    if (idioma === 'de') {
      return {
        texto:
          `**Standort & Betrieb — SENAI / ZEISS Kompetenzzentrum für Messtechnik:**\n\n` +
          `• **Standort:** Ansässig bei **SENAI Fatesg (FIEG)** in **Goiânia — GO, Brasilien**, mit landesweiter Betreuung für Industriekunden.\n` +
          `• **Globale Partnerschaft:** Eines von weltweit nur **5 Laboren dieses Standards** in technologischer Partnerschaft mit **ZEISS**.\n` +
          `• **Klimatisierte Laborumgebung:** Streng kontrollierte Temperatur (**20 ± 0,5 °C**), Schwingungsisolierung und rückführbare Kalibrierung.\n` +
          `• **Kontakt & Anfrage:** Über den Reiter **Angebot anfordern** erhalten Sie sofort ein Tracking-Protokoll.`,
        fontes: ['Institutionelles Profil SENAI / ZEISS', 'Laborinfrastruktur'],
      };
    }
    return {
      texto:
        `**Localização e Estrutura do Laboratório SENAI / ZEISS:**\n\n` +
        `• **Onde fica:** O Centro de Excelência em Metrologia está sediado no **SENAI Fatesg (Sistema FIEG)**, em **Goiânia — GO**, atendendo indústrias de todo o Brasil (você pode enviar peças por transportadora ou entregar presencialmente após a abertura do protocolo).\n` +
        `• **Referência Mundial:** É um dos **5 laboratórios deste padrão no mundo** estruturados em cooperação direta com a **ZEISS (Alemanha)**.\n` +
        `• **Ambiente Climatizado:** Sala metrológica com controle rigoroso de temperatura (**20 ± 0,5 °C**), umidade controlada, isolamento vibracional e rastreabilidade RBC/INMETRO.\n` +
        `• **Atendimento:** Para agendar envio de peças ou falar diretamente com a engenharia do laboratório, basta registrar sua demanda na aba **Solicitar** — o sistema gera um protocolo imediato e abre um canal direto de mensagens com nossa equipe!`,
      fontes: ['Institucional SENAI Fatesg / FIEG', 'Infraestrutura do Centro de Excelência'],
    };
  }

  // 0.2. Preços / Valores / Custos / Formas de Pagamento
  if (
    q.includes('quanto custa') ||
    q.includes('qual o preco') ||
    q.includes('qual o valor') ||
    q.includes('tabela de preco') ||
    q.includes('caro') ||
    q.includes('barato') ||
    q.includes('custo') ||
    q.includes('pagamento') ||
    q.includes('boleto') ||
    q.includes('parcela') ||
    q.includes('how much') ||
    q.includes('price') ||
    q.includes('pricing') ||
    q.includes('payment') ||
    q.includes('was kostet') ||
    q.includes('preis') ||
    q.includes('kosten') ||
    q.includes('zahlung')
  ) {
    if (idioma === 'en') {
      return {
        texto:
          `**How Pricing and Pre-proposals Work:**\n\n` +
          `• **Custom Engineering Calculation:** Metrology services do not have a fixed shelf price because the effort depends on part geometry, material, quantity and required ZEISS machine.\n` +
          `• **Transparent Formula:** Each pre-proposal is calculated from **estimated machine-hours × official hourly rate** of the selected ZEISS equipment, cross-checked against our historical statistical quartiles (**Q1–Q3**).\n` +
          `• **Payment Terms:** When submitting a request, you can choose between **30, 45, 60 or 90 days** for payment.\n` +
          `• **Free Evaluation:** Opening a request in the **Request a quote** tab is free of charge — you only approve the pre-proposal after reviewing the scope and final value in the Client Portal.`,
        fontes: ['Commercial & Pre-proposal Policy SENAI'],
      };
    }
    if (idioma === 'de') {
      return {
        texto:
          `**Wie Preise und Vorangebote berechnet werden:**\n\n` +
          `• **Individuelle Kalkulation:** Der Aufwand richtet sich nach Bauteilgeometrie, Werkstoff, Stückzahl und dem eingesetzten ZEISS-System.\n` +
          `• **Transparente Formel:** Jedes Vorangebot basiert auf **geschätzten Maschinenstunden × offiziellem Stundensatz**, validiert durch unsere statistischen Quartile (**Q1–Q3**).\n` +
          `• **Zahlungsziele:** Sie können Zahlungsziele von **30, 45, 60 oder 90 Tagen** wählen.\n` +
          `• **Kostenlose Erstanfrage:** Die Anfrage über **Angebot anfordern** ist unverbindlich — Sie entscheiden erst nach Einsicht des vollständigen Vorangebots im Kundenportal.`,
        fontes: ['Kalkulationsrichtlinie SENAI'],
      };
    }
    return {
      texto:
        `**Como funcionam os Preços e Condições de Pagamento:**\n\n` +
        `• **Orçamento sob medida:** Na metrologia avançada não existe preço fixo de tabela, pois o tempo de máquina depende da geometria da peça, quantidade, tolerância exigida e de qual equipamento ZEISS será usado.\n` +
        `• **Cálculo transparente e auditável:** Nossa equipe calcula a **pré-proposta** multiplicando as **horas técnicas estimadas × custo-hora vigente do equipamento**, validando a estimativa com estatística histórica (**faixa Q1–Q3** de serviços similares já concluídos).\n` +
        `• **Prazos de pagamento:** No formulário de solicitação você pode escolher faturamento para **30, 45, 60 ou 90 dias**.\n` +
        `• **Triagem gratuita:** Enviar o pedido pela aba **Solicitar** não tem custo. Você receberá a pré-proposta em PDF na sua Área do Cliente e poderá **aceitar** ou **recusar justificadamente**.`,
      fontes: ['Política de Pré-propostas SENAI', 'Motor de Cálculo Auditável'],
    };
  }

  // 0.3. Prazos de entrega / Quanto tempo demora / Urgência
  if (
    q.includes('prazo de entrega') ||
    q.includes('quanto tempo') ||
    q.includes('demora') ||
    q.includes('urgente') ||
    q.includes('urgencia') ||
    q.includes('rapido') ||
    q.includes('quantos dias') ||
    q.includes('how long') ||
    q.includes('turnaround') ||
    q.includes('delivery time') ||
    q.includes('wie lange') ||
    q.includes('lieferzeit') ||
    q.includes('dauer')
  ) {
    if (idioma === 'en') {
      return {
        texto:
          `**Turnaround Time & Execution Stages:**\n\n` +
          `1. **Triage & Pre-proposal:** After you submit a request, our team analyzes the technical challenge and publishes a pre-proposal with the **estimated delivery date**.\n` +
          `2. **Thermal Stabilization:** Once the part arrives at the lab, it undergoes cleaning and thermal stabilization at **20 ± 0.5 °C** before precision measurement.\n` +
          `3. **Real-Time Tracking:** In the **Client Portal**, you can follow every stage of execution (*To Do → In Progress → Completed*) and message the technical team directly.`,
        fontes: ['Execution Workflow SENAI'],
      };
    }
    if (idioma === 'de') {
      return {
        texto:
          `**Durchlaufzeit & Ausführungsschritte:**\n\n` +
          `1. **Prüfung & Vorangebot:** Nach Ihrer Anfrage erstellt unser Team ein Vorangebot inklusive **geschätztem Liefertermin**.\n` +
          `2. **Thermische Stabilisierung:** Nach Eingang im Labor wird das Bauteil gereinigt und bei **20 ± 0,5 °C** temperiert.\n` +
          `3. **Live-Verfolgung:** Im **Kundenportal** sehen Sie den Fortschritt jeder einzelnen Etappe in Echtzeit.`,
        fontes: ['Ausführungsworkflow SENAI'],
      };
    }
    return {
      texto:
        `**Prazos de Execução e Acompanhamento:**\n\n` +
        `1. **Triagem rápida:** Assim que você registra a solicitação, nossa equipe avalia a complexidade e publica a **pré-proposta** já contendo a **data de entrega estimada**.\n` +
        `2. **Etapas técnicas no laboratório:** O tempo de bancada inclui recebimento, limpeza, **estabilização térmica da peça a 20 ± 0,5 °C**, medição/digitalização na máquina ZEISS e emissão do relatório/laudo técnico.\n` +
        `3. **Acompanhamento em tempo real:** Pela **Área do Cliente**, você acompanha a porcentagem de avanço de cada etapa (*A fazer → Em andamento → Concluída*) sem precisar ligar para perguntar o status!`,
      fontes: ['Fluxo Operacional de Execução SENAI'],
    };
  }

  // 0.4. Materiais aceitos / Arquivos CAD / Peças sem desenho
  if (
    q.includes('material') ||
    q.includes('materiais') ||
    q.includes('aco') ||
    q.includes('aluminio') ||
    q.includes('plastico') ||
    q.includes('polimero') ||
    q.includes('ceramica') ||
    q.includes('ferro') ||
    q.includes('step') ||
    q.includes('stl') ||
    q.includes('iges') ||
    q.includes('nao tenho desenho') ||
    q.includes('sem desenho') ||
    q.includes('nao tenho cad') ||
    q.includes('formato') ||
    q.includes('materials') ||
    q.includes('werkstoff')
  ) {
    if (idioma === 'en') {
      return {
        texto:
          `**Supported Materials & Technical Files:**\n\n` +
          `• **Materials:** We inspect and scan **Carbon Steel, Stainless Steel, Aluminum, Copper, Cast Iron, Polymers/Plastics, Ceramics and Composites**.\n` +
          `• **Accepted File Formats:** You can attach **PDF, JPEG, PNG, WEBP** (up to 10 MB) and 3D CAD files in **STEP, STP, IGES, IGS, STL, OBJ, DXF, DWG** (up to 50 MB).\n` +
          `• **Don't have a 3D CAD drawing?** No problem! With **3D Scanning** (*ZEISS ATOS Q* / *T-SCAN hawk 2*) and **Reverse Engineering**, we reconstruct the parametric 3D CAD directly from your physical part.`,
        fontes: ['Technical Standards & File Specifications'],
      };
    }
    if (idioma === 'de') {
      return {
        texto:
          `**Unterstützte Werkstoffe & Dateiformate:**\n\n` +
          `• **Werkstoffe:** Kohlenstoffstahl, Edelstahl, Aluminium, Kupfer, Gusseisen, Polymere/Kunststoffe, Keramik und Verbundwerkstoffe.\n` +
          `• **Dateiformate:** **PDF, JPEG, PNG, WEBP** (bis 10 MB) sowie CAD-Dateien in **STEP, STP, IGES, IGS, STL, OBJ, DXF, DWG** (bis 50 MB).\n` +
          `• **Kein CAD-Modell vorhanden?** Kein Problem! Über **3D-Digitalisierung** (*ZEISS ATOS Q* / *T-SCAN hawk 2*) und **Reverse Engineering** erstellen wir das 3D-CAD-Modell direkt vom physischen Bauteil.`,
        fontes: ['Technische Spezifikationen SENAI'],
      };
    }
    return {
      texto:
        `**Materiais Atendidos e Arquivos Técnicos (CAD / PDF):**\n\n` +
        `• **Materiais que medimos:** Aço carbono, Aço inoxidável, Alumínio, Cobre, Ferro fundido, Polímeros/Plásticos, Cerâmicas e Compósitos.\n` +
        `• **Formatos de arquivo aceitos:** Desenhos e imagens (**PDF, JPG, PNG, WEBP** até 10 MB) e modelos 3D (**STEP, STP, IGES, IGS, STL, OBJ, DXF, DWG** até 50 MB).\n` +
        `• **E se eu não tiver o desenho ou arquivo CAD da peça?** Sem problema! Nós realizamos o **Escaneamento 3D** (*ZEISS ATOS Q* ou *T-SCAN hawk 2*) e a **Engenharia Reversa** para gerar o modelo CAD 3D paramétrico a partir da sua peça física (mesmo que ela esteja gasta ou quebrada).`,
      fontes: ['Padrões de Entrada Técnica e Anexos'],
    };
  }

  // 0.5. Diagnóstico inteligente de problemas descritos livremente (peça quebrada, trinca interna, copiar peça, lote, tolerância)
  if (
    q.includes('quebr') ||
    q.includes('trinc') ||
    q.includes('rachad') ||
    q.includes('fissura') ||
    q.includes('defeito') ||
    q.includes('desgast') ||
    q.includes('bolha') ||
    q.includes('porosidade') ||
    q.includes('por dentro') ||
    q.includes('interna') ||
    q.includes('sem cortar') ||
    q.includes('sem destruir') ||
    q.includes('copiar') ||
    q.includes('reproduzir') ||
    q.includes('peca antiga') ||
    q.includes('reposicao') ||
    q.includes('importada') ||
    q.includes('desvio') ||
    q.includes('tolerancia') ||
    q.includes('gdt') ||
    q.includes('gd&t') ||
    q.includes('batimento') ||
    q.includes('planicidade') ||
    q.includes('engrenagem') ||
    q.includes('carcaca') ||
    q.includes('molde') ||
    q.includes('bico') ||
    q.includes('broken') ||
    q.includes('crack') ||
    q.includes('porosity') ||
    q.includes('tolerance') ||
    q.includes('riss') ||
    q.includes('porositat') ||
    q.includes('toleranz')
  ) {
    if (idioma === 'en') {
      return {
        texto:
          `**Technical Recommendation for your Challenge:**\n\n` +
          `Based on what you described, here is how our laboratory solves each case:\n` +
          `1. **Internal flaws, porosity, voids or cracks without cutting the part:** We use **Industrial Computed Tomography / X-Ray** on the **ZEISS BOSELLO MAX**.\n` +
          `2. **Broken, worn or imported part without drawings (reproduction/nationalization):** We use **3D Scanning + Reverse Engineering & CAD Reconstruction** with **ZEISS ATOS Q** or **T-SCAN hawk 2**.\n` +
          `3. **Tight dimensional tolerances (GD&T, flatness, position, runout in machined batches):** We use high-precision coordinate metrology on the **ZEISS PRISMO**, **ZEISS DuraMax**, or **ZEISS O-INSPECT**.\n\n` +
          `👉 Go to **Request a quote** and describe your part — our engineers will select the exact setup!`,
        fontes: ['Diagnostic Guide SENAI / ZEISS'],
      };
    }
    if (idioma === 'de') {
      return {
        texto:
          `**Technische Empfehlung für Ihre Aufgabenstellung:**\n\n` +
          `1. **Innere Fehlstellen, Porosität oder Risse zerstörungsfrei prüfen:** **Industrielle Computertomographie / Röntgenprüfung** mit dem **ZEISS BOSELLO MAX**.\n` +
          `2. **Gebrochenes, verschlissenes oder importiertes Bauteil ohne Zeichnung nachbauen:** **3D-Digitalisierung + Reverse Engineering** mit **ZEISS ATOS Q** oder **T-SCAN hawk 2**.\n` +
          `3. **Enge Form- und Lagetoleranzen (GD&T, Ebenheit, Position):** Hochpräzise Koordinatenmesstechnik auf **ZEISS PRISMO**, **ZEISS DuraMax** oder **ZEISS O-INSPECT**.\n\n` +
          `👉 Nutzen Sie den Reiter **Angebot anfordern**, um Ihr Bauteil einzureichen!`,
        fontes: ['Diagnoseleitfaden SENAI / ZEISS'],
      };
    }
    return {
      texto:
        `**Recomendação Técnica para o seu Caso:**\n\n` +
        `Pelo problema que você descreveu, veja qual solução do nosso laboratório é a ideal:\n` +
        `1. **Suspeita de trinca interna, porosidade, vazio de fundição ou montagem interna (sem cortar a peça):** recomendamos **Tomografia Industrial / Inspeção por Raios X** no equipamento **ZEISS BOSELLO MAX**.\n` +
        `2. **Peça quebrada, desgastada ou importada que você precisa reproduzir / nacionalizar:** recomendamos **Escaneamento 3D + Engenharia Reversa e Reconstrução CAD** usando o scanner de luz azul **ZEISS ATOS Q** ou o laser portátil **ZEISS T-SCAN hawk 2**.\n` +
        `3. **Controle de tolerâncias apertadas (GD&T, planicidade, posição de furos, batimento em lotes usinados):** recomendamos **Metrologia Avançada e Inspeção Dimensional** nas máquinas **ZEISS PRISMO** (altíssima exatidão), **ZEISS DuraMax** ou **ZEISS O-INSPECT** (óptico + tátil).\n\n` +
        `👉 Você pode abrir seu pedido agora mesmo na aba **Solicitar** escolhendo *"Preciso de orientação para escolher"* que nossa engenharia define o roteiro ideal!`,
      fontes: ['Diagnóstico Técnico de Aplicação SENAI / ZEISS'],
    };
  }

  // 1. Eventos / Novidades / Acontecimentos / INMETRO / SINDAG / ExpoPeças
  if (
    q.includes('evento') ||
    q.includes('novidade') ||
    q.includes('acontecimento') ||
    q.includes('sindag') ||
    q.includes('expopecas') ||
    q.includes('inmetro') ||
    q.includes('news') ||
    q.includes('event') ||
    q.includes('neuigkeit') ||
    q.includes('veranstaltung')
  ) {
    if (idioma === 'en') {
      const lista = eventos.map((ev) => `• **${ev.titulo}** (${ev.data}): ${ev.resumo}`).join('\n');
      return {
        texto: `Here are the latest **Events and News from the Metrology Center of Excellence**:\n\n${lista}`,
        fontes: ['News from the Center (CMS)', 'Institutional Schedule'],
      };
    }
    if (idioma === 'de') {
      const lista = eventos.map((ev) => `• **${ev.titulo}** (${ev.data}): ${ev.resumo}`).join('\n');
      return {
        texto: `Hier sind die aktuellen **Veranstaltungen und Neuigkeiten aus dem Kompetenzzentrum für Messtechnik**:\n\n${lista}`,
        fontes: ['Neuigkeiten aus dem Zentrum (CMS)'],
      };
    }
    const lista = eventos.map((ev) => `• **${ev.titulo}** (${ev.data}): ${ev.resumo}`).join('\n');
    return {
      texto: `Aqui estão os **Eventos e Novidades no Centro de Excelência em Metrologia SENAI**:\n\n${lista}\n\nVocê pode conferir fotos e vídeos desses marcos diretamente na seção **Novidades no Centro** da página inicial.`,
      fontes: ['Novidades no Centro (CMS)', 'Agenda Institucional SENAI'],
    };
  }

  // 2. Equipamento específico citado
  const equipamentoEncontrado = equipamentosPublicos.find((eq) => {
    const nomeNorm = normalizarTexto(eq.nome);
    const slugNorm = normalizarTexto(eq.slug.replaceAll('-', ' '));
    return (
      q.includes(nomeNorm) ||
      q.includes(slugNorm) ||
      (eq.slug === 'zeiss-duramax' && q.includes('duramax')) ||
      (eq.slug === 'zeiss-o-inspect' && (q.includes('o-inspect') || q.includes('oinspect') || q.includes('multissensor'))) ||
      (eq.slug === 'zeiss-prismo' && q.includes('prismo')) ||
      (eq.slug === 'zeiss-bosello-max-80' && (q.includes('bosello') || q.includes('raio x') || q.includes('raios x'))) ||
      (eq.slug === 'zeiss-atos-q' && (q.includes('atos') || q.includes('luz azul'))) ||
      (eq.slug === 'zeiss-t-scan-hawk-2' && (q.includes('t-scan') || q.includes('tscan') || q.includes('hawk')))
    );
  });

  if (equipamentoEncontrado) {
    const tr = (txt: string) => traduzirTextoPublico(txt, idioma);
    const rotuloCap = idioma === 'en' ? 'Technical capabilities' : idioma === 'de' ? 'Technische Fähigkeiten' : 'Capacidades técnicas';
    const rotuloApl = idioma === 'en' ? 'Frequent applications' : idioma === 'de' ? 'Häufige Anwendungen' : 'Aplicações frequentes';
    const rotuloTipos = idioma === 'en' ? 'Measurement types' : idioma === 'de' ? 'Messarten' : 'Tipos de medição';
    return {
      texto:
        `**${equipamentoEncontrado.nome}** (${tr(equipamentoEncontrado.categoria)})\n\n` +
        `${equipamentoEncontrado.descricao.map(tr).join(' ')}\n\n` +
        `**${rotuloCap}:**\n${equipamentoEncontrado.capacidades.map((c) => `• ${tr(c)}`).join('\n')}\n\n` +
        `**${rotuloApl}:**\n${equipamentoEncontrado.aplicacoes.map((a) => `• ${tr(a)}`).join('\n')}\n\n` +
        `**${rotuloTipos}:** ${equipamentoEncontrado.tiposMedicao.map(tr).join(', ')}.`,
      fontes: [`${equipamentoEncontrado.nome}`, 'ZEISS / SENAI'],
    };
  }

  // 3. Parque de equipamentos geral
  if (q.includes('equipamento') || q.includes('maquina') || q.includes('zeiss') || q.includes('parque') || q.includes('equipment') || q.includes('machine') || q.includes('ausrustung') || q.includes('gerat')) {
    const tr = (txt: string) => traduzirTextoPublico(txt, idioma);
    const resumoMaquinas = equipamentosPublicos
      .map((eq) => `• **${eq.nome}** (${tr(eq.categoria)}): ${tr(eq.resumo)}`)
      .join('\n');
    if (idioma === 'en') {
      return {
        texto: `The Center operates **6 official ZEISS metrology systems**:\n\n${resumoMaquinas}\n\nAsk me about any specific machine to see its measurement volume, sensors and applications!`,
        fontes: ['ZEISS Equipment Park (6 Systems)'],
      };
    }
    if (idioma === 'de') {
      return {
        texto: `Das Zentrum verfügt über **6 offizielle ZEISS-Messsysteme**:\n\n${resumoMaquinas}\n\nFragen Sie mich nach einem bestimmten Gerät für technische Details!`,
        fontes: ['ZEISS Gerätepark (6 Systeme)'],
      };
    }
    return {
      texto: `O Centro de Excelência em Metrologia SENAI conta com **6 equipamentos ZEISS de última geração** instalados no laboratório:\n\n${resumoMaquinas}\n\nSe quiser, pergunte pelo nome de qualquer um deles (ex: *PRISMO*, *DuraMax*, *O-INSPECT*, *BOSELLO*, *ATOS Q* ou *T-SCAN hawk 2*) para ver o volume de medição e capacidades detalhadas!`,
      fontes: ['Parque de Equipamentos ZEISS (6 máquinas)'],
    };
  }

  // 4. Serviço específico citado
  const servicosCitados = encontrarServicosCitados(q);
  if (servicosCitados.length > 0) {
    const tr = (txt: string) => traduzirTextoPublico(txt, idioma);
    const servico = servicosCitados[0];
    const etapasPublicas = ['Planejamento', 'Medição e inspeção', 'Validação', 'Entrega'];
    if (idioma === 'en') {
      return {
        texto:
          `**${tr(servico.titulo)}**\n\n` +
          `${tr(servico.resumo)}\n\n` +
          `**Workflow in the laboratory:** ${etapasPublicas.map((e) => tr(e)).join(' → ')}.\n\n` +
          `To request a quote or technical analysis for this service, go to the **Request a quote** tab (no prior account required).`,
        fontes: [`Service Catalog: ${tr(servico.titulo)}`],
      };
    }
    if (idioma === 'de') {
      return {
        texto:
          `**${tr(servico.titulo)}**\n\n` +
          `${tr(servico.resumo)}\n\n` +
          `**Ablauf im Labor:** ${etapasPublicas.map((e) => tr(e)).join(' → ')}.\n\n` +
          `Um ein Angebot für diese Leistung anzufordern, öffnen Sie den Reiter **Angebot anfordern**.`,
        fontes: [`Leistungskatalog: ${tr(servico.titulo)}`],
      };
    }
    return {
      texto:
        `**${servico.titulo}**\n\n` +
        `${servico.resumo}\n\n` +
        `**Fluxo no laboratório:** ${etapasPublicas.join(' → ')}.\n\n` +
        `Para contratar ou pedir análise técnica deste serviço, acesse **Solicitar orçamento** (não exige cadastro prévio).`,
      fontes: [`Catálogo de Serviços: ${servico.titulo}`],
    };
  }

  // 5. Setores atendidos
  if (q.includes('setor') || q.includes('automotivo') || q.includes('aeronautico') || q.includes('ferramentaria') || q.includes('industria') || q.includes('sector') || q.includes('branche')) {
    const tr = (txt: string) => traduzirTextoPublico(txt, idioma);
    const listaSetores = setoresIndustria
      .map((s) => `• **${tr(s.titulo)}**: ${tr(s.resumo)} (*${tr(s.exemplos)}*)`)
      .join('\n');
    if (idioma === 'en') {
      return {
        texto: `We organize our laboratory services across **4 major industrial sectors**:\n\n${listaSetores}`,
        fontes: ['Industrial Sectors Served — SENAI / ZEISS'],
      };
    }
    if (idioma === 'de') {
      return {
        texto: `Wir gliedern unsere Laborleistungen in **4 große Industriebranchen**:\n\n${listaSetores}`,
        fontes: ['Bediente Branchen — SENAI / ZEISS'],
      };
    }
    return {
      texto: `Organizamos o atendimento do laboratório em **4 grandes setores industriais**:\n\n${listaSetores}`,
      fontes: ['Setores Atendidos — Centro de Excelência em Metrologia'],
    };
  }

  // 6. Como solicitar orçamento / contato
  if (
    q.includes('orcamento') ||
    q.includes('solicita') ||
    q.includes('contato') ||
    q.includes('email') ||
    q.includes('como pedir') ||
    q.includes('contratar') ||
    q.includes('quote') ||
    q.includes('request') ||
    q.includes('angebot') ||
    q.includes('anfrage')
  ) {
    if (idioma === 'en') {
      return {
        texto:
          `**How to Request a Quote or Technical Analysis at SENAI:**\n\n` +
          `1. Open the **Request a quote** tab (no prior account is required).\n` +
          `2. Fill in your company details (CNPJ and company name), contact info, type of need (or select *"I need guidance to choose"*), main material, quantity and desired payment term.\n` +
          `3. The system immediately generates a **service protocol**.\n` +
          `4. After triage, our team activates your access to the **Client Portal**, where you can attach PDFs/CADs, message the lab team, and accept or decline the pre-proposal.`,
        fontes: ['Public Quote Request Workflow'],
      };
    }
    if (idioma === 'de') {
      return {
        texto:
          `**So fordern Sie ein Angebot oder eine technische Analyse bei SENAI an:**\n\n` +
          `1. Öffnen Sie den Reiter **Angebot anfordern** (kein vorheriges Konto erforderlich).\n` +
          `2. Geben Sie Ihre Unternehmensdaten, Kontaktinformationen, die Art des Bedarfs, Werkstoff, Stückzahl und Zahlungsziel an.\n` +
          `3. Das System erstellt sofort ein **Service-Protokoll**.\n` +
          `4. Nach der Sichtung schaltet unser Team Ihren Zugang zum **Kundenportal** frei, wo Sie Zeichnungen/CAD-Dateien anhängen und das Vorangebot prüfen können.`,
        fontes: ['Öffentlicher Anfrageprozess'],
      };
    }
    return {
      texto:
        `**Como solicitar um orçamento ou análise técnica no SENAI:**\n\n` +
        `1. Acesse a aba **Solicitar orçamento** (não é necessário criar conta previamente).\n` +
        `2. Informe os dados da empresa (CNPJ e razão social), seu contato, o tipo de necessidade (ou escolha *"Preciso de orientação para escolher"*), material, quantidade e prazo de pagamento desejado.\n` +
        `3. O sistema gera imediatamente um **protocolo de atendimento**.\n` +
        `4. Após a triagem, nossa equipe libera seu acesso à **Área do Cliente**, onde você poderá anexar desenhos/PDFs/CADs, conversar com o laboratório e aceitar ou pedir revisão da pré-proposta.\n\n` +
        `*Nota: os valores comerciais são calculados sob medida após a avaliação técnica da peça e não são estimados por chat.*`,
      fontes: ['Fluxo de Solicitação Pública', 'Guia de Atendimento SENAI'],
    };
  }

  // 7. Visão geral do Laboratório / Catálogo de Serviços / Perguntas abertas
  const tr = (txt: string) => traduzirTextoPublico(txt, idioma);
  const listaServicos = servicosOficiais.map((s) => `• **${tr(s.titulo)}**: ${tr(s.resumo)}`).join('\n');
  if (idioma === 'en') {
    return {
      texto:
        `Regarding your question (*"${pergunta.trim()}"*), here is how the **SENAI / ZEISS Metrology Center of Excellence** can help:\n\n` +
        `We operate **6 ZEISS metrology systems** (tactile CMMs, multisensor optical, blue-light 3D scanner, laser scanner and industrial X-ray) across **10 official services**:\n\n${listaServicos}\n\n` +
        `💡 *Tip: You can ask me specific questions like "How much does it cost?", "Where is the lab?", "How long does it take?", "I have a broken part without CAD", or ask about any specific ZEISS machine!*`,
      fontes: ['SENAI Metrology Portal', 'Service Catalog'],
    };
  }
  if (idioma === 'de') {
    return {
      texto:
        `Zu Ihrer Frage (*„${pergunta.trim()}“*) unterstützt Sie das **SENAI / ZEISS Kompetenzzentrum für Messtechnik** wie folgt:\n\n` +
        `Wir betreiben **6 ZEISS-Messsysteme** (taktile KMG, Multisensorik, Streifenlicht-/Laserscanner und Röntgen-CT) für **10 offizielle Dienstleistungen**:\n\n${listaServicos}\n\n` +
        `💡 *Tipp: Fragen Sie mich gerne direkt z. B. „Was kostet eine Messung?“, „Wo befindet sich das Labor?“, „Wie lange dauert es?“ oder beschreiben Sie Ihr Bauteil!*`,
      fontes: ['SENAI Messtechnik-Portal', 'Leistungskatalog'],
    };
  }

  return {
    texto:
      `Sobre a sua pergunta (*"${pergunta.trim()}"*), veja como o **Centro de Excelência em Metrologia SENAI / ZEISS** atua:\n\n` +
      `Contamos com **6 máquinas ZEISS** (medição por coordenadas tátil, multissensor óptico, escaneamento 3D por luz azul/laser e raio-X industrial) distribuídas em **10 serviços oficiais**:\n\n` +
      `${listaServicos}\n\n` +
      `💡 *Dica: você pode me perguntar coisas específicas como "Quanto custa?", "Qual o prazo de entrega?", "Onde fica o laboratório?", "Minha peça quebrou e não tenho desenho CAD" ou o nome de qualquer máquina ZEISS!*`,
    fontes: ['Centro de Excelência em Metrologia SENAI', 'Catálogo Oficial (10 Serviços e 6 Equipamentos)'],
  };
}

/**
 * Carrega todas as informações operacionais autorizadas para o perfil interno logado
 * (solicitações, anexos/PDFs, pré-propostas/orçamentos, execuções, problemas/retrabalhos,
 * mensagens de clientes e lições aprendidas) para alimentar o Chatbot Interno do Laboratório.
 */
export async function carregarContextoOperacionalLaboratorio(
  cliente: SupabaseClient | null | undefined,
  perfil: PerfilInterno = 'administrador',
): Promise<ContextoOperacionalLaboratorio> {
  if (!cliente) {
    return criarContextoDemonstrativoFallback(perfil);
  }

  try {
    const [
      resSolicitacoes,
      resOrcamentos,
      resExecucoes,
      resConversas,
      resIndicadores,
      resPrePropostas,
      resRecusas,
      resEntregas,
    ] = await Promise.all([
      cliente.rpc('listar_solicitacoes_publicas_demonstrativas'),
      cliente.rpc('listar_orcamentos_demonstrativos'),
      cliente.rpc('listar_execucoes_demonstrativas'),
      cliente.rpc('listar_conversas_demonstrativas'),
      cliente.rpc('listar_indicadores_execucoes_demonstrativas'),
      cliente.rpc('listar_dados_pre_proposta_demonstrativos'),
      cliente.rpc('listar_recusas_pre_proposta_demonstrativas'),
      cliente.rpc('listar_entregas_pre_proposta_demonstrativas'),
    ]);

    const solicitacoes = (Array.isArray(resSolicitacoes.data) ? resSolicitacoes.data : []) as SolicitacaoParaPreProposta[];
    const execucoes = (Array.isArray(resExecucoes.data) ? resExecucoes.data : []) as ExecucaoInterna[];
    const conversasBase = (Array.isArray(resConversas.data) ? resConversas.data : []) as ConversaInterna[];
    const indicadores = (Array.isArray(resIndicadores.data) ? resIndicadores.data : []) as IndicadorExecucaoPersistente[];

    const mapaPrePropostas = new Map(
      ((Array.isArray(resPrePropostas.data) ? resPrePropostas.data : []) as Array<{ versao_id: string; destinatario: string; prazo_pagamento_dias: number }>).map((item) => [item.versao_id, item]),
    );
    const mapaRecusas = new Map(
      ((Array.isArray(resRecusas.data) ? resRecusas.data : []) as Array<{ versao_id: string; recusa_motivo: string | null }>).map((item) => [item.versao_id, item]),
    );
    const mapaEntregas = new Map(
      ((Array.isArray(resEntregas.data) ? resEntregas.data : []) as Array<{ versao_id: string; entrega_estimada: string | null }>).map((item) => [item.versao_id, item]),
    );

    const orcamentosBrutos = (Array.isArray(resOrcamentos.data) ? resOrcamentos.data : []) as OrcamentoResumoInterno[];
    const orcamentos: OrcamentoResumoInterno[] = orcamentosBrutos.map((orc) => ({
      ...orc,
      destinatario: mapaPrePropostas.get(orc.versao_id)?.destinatario ?? orc.destinatario,
      prazo_pagamento_dias: mapaPrePropostas.get(orc.versao_id)?.prazo_pagamento_dias ?? orc.prazo_pagamento_dias,
      recusa_motivo: mapaRecusas.get(orc.versao_id)?.recusa_motivo ?? orc.recusa_motivo,
      entrega_estimada: mapaEntregas.get(orc.versao_id)?.entrega_estimada ?? orc.entrega_estimada,
      // Oculta valores comerciais para perfil Técnico conforme invariante de domínio
      preco_final: perfil === 'tecnico' ? null : orc.preco_final,
      custo_congelado: perfil === 'tecnico' ? null : orc.custo_congelado,
    }));

    // Busca anexos das solicitações ativadas e anexos das conversas (em paralelo, até 12 solicitações mais recentes)
    const idsSolicitacoes = [
      ...new Set(
        [
          ...solicitacoes.map((s) => s.solicitacao_id).filter((id): id is string => Boolean(id)),
          ...conversasBase.map((c) => c.solicitacao_id).filter(Boolean),
        ].slice(0, 12),
      ),
    ];

    const anexosPorSolicitacao: Record<string, AnexoSolicitacaoCliente[]> = {};
    const anexosMensagensPorSolicitacao: Record<string, AnexoMensagem[]> = {};

    await Promise.all(
      idsSolicitacoes.map(async (solId) => {
        const [anexosSol, anexosMsg] = await Promise.all([
          cliente.rpc('listar_anexos_solicitacao_demonstrativa', { solicitacao: solId }),
          cliente.rpc('listar_anexos_mensagens_demonstrativas', { solicitacao: solId }),
        ]);
        if (Array.isArray(anexosSol.data) && anexosSol.data.length > 0) {
          anexosPorSolicitacao[solId] = anexosSol.data as AnexoSolicitacaoCliente[];
        }
        if (Array.isArray(anexosMsg.data) && anexosMsg.data.length > 0) {
          anexosMensagensPorSolicitacao[solId] = anexosMsg.data as AnexoMensagem[];
        }
      }),
    );

    const conversas: ConversaInterna[] = conversasBase.map((conversa) => {
      const anexosDaConversa = anexosMensagensPorSolicitacao[conversa.solicitacao_id] ?? [];
      return {
        ...conversa,
        mensagens: conversa.mensagens.map((msg) => ({
          ...msg,
          anexos: anexosDaConversa.filter((anexo) => anexo.mensagem_id === msg.id),
        })),
      };
    });

    if (
      solicitacoes.length === 0 &&
      orcamentos.length === 0 &&
      execucoes.length === 0 &&
      conversas.length === 0 &&
      indicadores.length === 0
    ) {
      return criarContextoDemonstrativoFallback(perfil);
    }

    return {
      perfil,
      atualizadoEm: new Date().toISOString(),
      solicitacoes,
      anexosPorSolicitacao,
      orcamentos,
      execucoes,
      conversas,
      indicadores,
    };
  } catch {
    return criarContextoDemonstrativoFallback(perfil);
  }
}

export function criarContextoDemonstrativoFallback(perfil: PerfilInterno = 'administrador'): ContextoOperacionalLaboratorio {
  return {
    perfil,
    atualizadoEm: new Date().toISOString(),
    solicitacoes: [
      {
        id: 'sol-pub-0284',
        codigo: 284,
        nome: 'Camila Ferreira',
        email: 'camila.ferreira@metalforte.test',
        empresa: 'Metalforte Indústria',
        necessidade: 'medicao-inspecao-dimensional',
        estado: 'ativada',
        criado_em: '2026-09-10T12:30:00Z',
        solicitacao_id: 'sol-uuid-0284',
        servico_id: 'srv-metrologia',
        descricao: 'Inspeção dimensional completa de lote de carcaças usinadas em aço com controle de posição e planicidade (tolerância crítica de 0,01 mm).',
        quantidade: 20,
        prazo_pagamento_dias: 30,
        tem_pre_proposta: true,
        estado_pre_proposta: 'aceita',
        cliente_existente: true,
      },
      {
        id: 'sol-pub-0285',
        codigo: 285,
        nome: 'Bruno Almeida',
        email: 'bruno.almeida@aerotech.test',
        empresa: 'Aerotech Componentes',
        necessidade: 'inspecao-interna-nao-destrutiva',
        estado: 'ativada',
        criado_em: '2026-09-12T15:10:00Z',
        solicitacao_id: 'sol-uuid-0285',
        servico_id: 'srv-tomografia',
        descricao: 'Inspeção radiográfica e tomografia industrial para avaliação de porosidade interna em suporte aeronáutico fundido em alumínio sem corte da peça.',
        quantidade: 4,
        prazo_pagamento_dias: 45,
        tem_pre_proposta: true,
        estado_pre_proposta: 'publicada',
        cliente_existente: true,
      },
      {
        id: 'sol-pub-0286',
        codigo: 286,
        nome: 'Larissa Campos',
        email: 'larissa.campos@precision.test',
        empresa: 'Precision Ferramentaria',
        necessidade: 'engenharia-reversa-cad',
        estado: 'ativada',
        criado_em: '2026-09-14T09:40:00Z',
        solicitacao_id: 'sol-uuid-0286',
        servico_id: 'srv-reversa',
        descricao: 'Escaneamento 3D e engenharia reversa com reconstrução CAD paramétrica de engrenagem helicoidal e matriz com desgaste superficial.',
        quantidade: 2,
        prazo_pagamento_dias: 28,
        tem_pre_proposta: true,
        estado_pre_proposta: 'em_validacao',
        cliente_existente: true,
      },
    ],
    anexosPorSolicitacao: {
      'sol-uuid-0284': [
        {
          id: 'anx-0284-1',
          nome_original: 'desenho-tecnico-carcaca-metalforte-rev3.pdf',
          tipo_mime: 'application/pdf',
          tamanho_bytes: 1843200,
          caminho_storage: 'demonstracao/sol-uuid-0284/desenho.pdf',
          criado_em: '2026-09-10T12:35:00Z',
        },
        {
          id: 'anx-0284-2',
          nome_original: 'modelo-nominal-carcaca.step',
          tipo_mime: 'application/step',
          tamanho_bytes: 8420000,
          caminho_storage: 'demonstracao/sol-uuid-0284/modelo.step',
          criado_em: '2026-09-10T12:36:00Z',
        },
      ],
      'sol-uuid-0285': [
        {
          id: 'anx-0285-1',
          nome_original: 'especificacao-inspecao-raios-x-aerotech.pdf',
          tipo_mime: 'application/pdf',
          tamanho_bytes: 940000,
          caminho_storage: 'demonstracao/sol-uuid-0285/especificacao.pdf',
          criado_em: '2026-09-12T15:15:00Z',
        },
      ],
      'sol-uuid-0286': [
        {
          id: 'anx-0286-1',
          nome_original: 'fotos-engrenagem-matriz-precision.pdf',
          tipo_mime: 'application/pdf',
          tamanho_bytes: 2150000,
          caminho_storage: 'demonstracao/sol-uuid-0286/fotos.pdf',
          criado_em: '2026-09-14T09:45:00Z',
        },
      ],
    },
    orcamentos: [
      {
        versao_id: 'ver-0284',
        numero: 1,
        estado: 'aceita',
        criada_em: '2026-09-10T14:00:00Z',
        descricao: 'Inspeção dimensional em lote de 20 carcaças usinadas com relatório GD&T',
        servico_slug: 'metrologia-avancada-inspecao-dimensional',
        equipamento_nome: 'ZEISS PRISMO VAST 09/24/07 + ZEISS DuraMax HTG',
        horas: 14,
        preco_final: perfil === 'tecnico' ? null : 4850,
        custo_congelado: perfil === 'tecnico' ? null : 3880,
        solicitacao_id: 'sol-uuid-0284',
        solicitacao_codigo: 284,
        empresa_nome: 'Metalforte Indústria',
        destinatario: 'Camila Ferreira — Engenharia da Qualidade',
        prazo_pagamento_dias: 30,
        entrega_estimada: '2026-09-25',
        publicacao_pronta: true,
      },
      {
        versao_id: 'ver-0285',
        numero: 1,
        estado: 'publicada',
        criada_em: '2026-09-12T17:00:00Z',
        descricao: 'Inspeção não destrutiva por raios X e avaliação de porosidade em 4 suportes aeronáuticos',
        servico_slug: 'tomografia-industrial',
        equipamento_nome: 'ZEISS BOSELLO MAX 80-150',
        horas: 8,
        preco_final: perfil === 'tecnico' ? null : 3420,
        custo_congelado: perfil === 'tecnico' ? null : 2736,
        solicitacao_id: 'sol-uuid-0285',
        solicitacao_codigo: 285,
        empresa_nome: 'Aerotech Componentes',
        destinatario: 'Bruno Almeida — Engenharia Aeronáutica',
        prazo_pagamento_dias: 45,
        entrega_estimada: '2026-09-28',
        publicacao_pronta: true,
      },
      {
        versao_id: 'ver-0286',
        numero: 1,
        estado: 'em_validacao',
        criada_em: '2026-09-14T11:20:00Z',
        descricao: 'Digitalização óptica ATOS Q e reconstrução CAD de engrenagem e matriz',
        servico_slug: 'engenharia-reversa-reconstrucao-cad',
        equipamento_nome: 'ZEISS ATOS Q 8M',
        horas: 16,
        preco_final: perfil === 'tecnico' ? null : 5600,
        custo_congelado: perfil === 'tecnico' ? null : 4480,
        solicitacao_id: 'sol-uuid-0286',
        solicitacao_codigo: 286,
        empresa_nome: 'Precision Ferramentaria',
        destinatario: 'Larissa Campos — Desenvolvimento de Produto',
        prazo_pagamento_dias: 28,
        entrega_estimada: '2026-10-02',
        justificativa_estimativa: 'Geometria helicoidal com desgaste assimétrico exige reconstrução manual de superfícies de referência.',
        publicacao_pronta: false,
      },
    ],
    execucoes: [
      {
        execucao_id: 'exec-0284',
        estado: 'em_execucao',
        inicio_real: '2026-09-11T08:00:00Z',
        entrega_real: null,
        criada_em: '2026-09-11T08:00:00Z',
        solicitacao_codigo: 284,
        empresa_nome: 'Metalforte Indústria',
        servico_slug: 'metrologia-avancada-inspecao-dimensional',
        descricao: 'Inspeção dimensional em lote de 20 carcaças usinadas com relatório GD&T',
        responsavel_id: 'usr-joao',
        responsavel_nome: 'João Rodrigues',
        responsavel_atribuido_em: '2026-09-11T08:05:00Z',
        fechamento_estado: 'nao_iniciado',
        custos_extras_reais: 180,
        retrabalho: true,
        mudanca_escopo: false,
        causa_principal: 'Rebarba na face de referência de 3 peças do lote exigiu limpeza e repetição do alinhamento na PRISMO.',
        fechamento_observacoes: 'Etapas de planejamento e medição inicial concluídas; 3 peças apresentaram rebarba no furo guia e precisaram ser remedidas após ajuste de fixação.',
        fechamento_aprendizado: 'Incluir verificação visual obrigatória de rebarbas na face datum A antes de iniciar o programa automático CNC.',
        fechamento_enviado_em: null,
        fechamento_decidido_em: null,
        fechamento_justificativa: null,
        equipamentos: [
          { equipamento_id: 'eq-prismo', nome: 'ZEISS PRISMO VAST 09/24/07', horas_estimadas: 10, horas_reais: 11.5 },
          { equipamento_id: 'eq-duramax', nome: 'ZEISS DuraMax HTG 5/5/5', horas_estimadas: 4, horas_reais: 4 },
        ],
        etapas: [
          { id: 'et-1', ordem: 1, titulo: 'Planejamento', descricao: 'Definição de estratégia CNC e fixação', estado: 'concluida', progresso: 100, visivel_cliente: true, atualizada_em: '2026-09-11T10:00:00Z' },
          { id: 'et-2', ordem: 2, titulo: 'Medições', descricao: 'Execução nas CMMs PRISMO e DuraMax', estado: 'concluida', progresso: 100, visivel_cliente: true, atualizada_em: '2026-09-13T16:00:00Z' },
          { id: 'et-3', ordem: 3, titulo: 'Análise dos resultados', descricao: 'Avaliação de GD&T e desvios', estado: 'em_andamento', progresso: 65, visivel_cliente: true, atualizada_em: '2026-09-15T11:20:00Z' },
          { id: 'et-4', ordem: 4, titulo: 'Validação do relatório', descricao: 'Conferência técnica pelo Validador', estado: 'a_fazer', progresso: 0, visivel_cliente: true, atualizada_em: '2026-09-11T08:00:00Z' },
          { id: 'et-5', ordem: 5, titulo: 'Entrega', descricao: 'Disponibilização do laudo final', estado: 'a_fazer', progresso: 0, visivel_cliente: true, atualizada_em: '2026-09-11T08:00:00Z' },
        ],
      },
      {
        execucao_id: 'exec-0280',
        estado: 'concluido',
        inicio_real: '2026-09-01T08:00:00Z',
        entrega_real: '2026-09-05T17:30:00Z',
        criada_em: '2026-09-01T08:00:00Z',
        solicitacao_codigo: 280,
        empresa_nome: 'Aerotech Componentes',
        servico_slug: 'escaneamento-3d-digitalizacao-pecas',
        descricao: 'Escaneamento 3D de carcaça de turbina e comparação nominal-real com CAD',
        responsavel_id: 'usr-joao',
        responsavel_nome: 'João Rodrigues',
        responsavel_atribuido_em: '2026-09-01T08:15:00Z',
        fechamento_estado: 'aprovado',
        custos_extras_reais: 0,
        retrabalho: true,
        mudanca_escopo: true,
        causa_principal: 'Superfície polida reflexiva exigiu aplicação de spray opacificante e mudança de lente no ATOS Q, além de solicitação do cliente para incluir seção interna adicional.',
        fechamento_observacoes: 'Trabalho concluído com sucesso após combinação do ATOS Q 8M com o T-SCAN hawk 2 nas cavidades profundas.',
        fechamento_aprendizado: 'Para ligas aeronáuticas polidas com cavidades acima de 80 mm, prever combinação ATOS Q + T-SCAN hawk 2 desde a pré-proposta.',
        fechamento_enviado_em: '2026-09-05T16:00:00Z',
        fechamento_decidido_em: '2026-09-05T17:30:00Z',
        fechamento_justificativa: 'Fechamento aprovado pelo Validador Sebastião.',
        equipamentos: [
          { equipamento_id: 'eq-atos', nome: 'ZEISS ATOS Q 8M', horas_estimadas: 8, horas_reais: 9.5 },
          { equipamento_id: 'eq-tscan', nome: 'ZEISS T-SCAN hawk 2', horas_estimadas: 2, horas_reais: 3 },
        ],
        etapas: [
          { id: 'et-280-1', ordem: 1, titulo: 'Planejamento', descricao: null, estado: 'concluida', progresso: 100, visivel_cliente: true, atualizada_em: '2026-09-01T11:00:00Z' },
          { id: 'et-280-2', ordem: 2, titulo: 'Digitalização', descricao: null, estado: 'concluida', progresso: 100, visivel_cliente: true, atualizada_em: '2026-09-03T15:00:00Z' },
          { id: 'et-280-3', ordem: 3, titulo: 'Tratamento do modelo 3D', descricao: null, estado: 'concluida', progresso: 100, visivel_cliente: true, atualizada_em: '2026-09-04T16:00:00Z' },
          { id: 'et-280-4', ordem: 4, titulo: 'Validação', descricao: null, estado: 'concluida', progresso: 100, visivel_cliente: true, atualizada_em: '2026-09-05T14:00:00Z' },
          { id: 'et-280-5', ordem: 5, titulo: 'Entrega', descricao: null, estado: 'concluida', progresso: 100, visivel_cliente: true, atualizada_em: '2026-09-05T17:30:00Z' },
        ],
      },
    ],
    conversas: [
      {
        solicitacao_id: 'sol-uuid-0284',
        codigo: 284,
        empresa: 'Metalforte Indústria',
        contato_nome: 'Camila Ferreira',
        contato_email: 'camila.ferreira@metalforte.test',
        necessidade: 'medicao-inspecao-dimensional',
        criada_em: '2026-09-10T12:30:00Z',
        nao_lidas: 1,
        mensagens: [
          {
            id: 'msg-1',
            autor_nome: 'Camila Ferreira',
            autor_tipo: 'cliente',
            conteudo: 'Olá equipe! Enviei o desenho revisado (rev3) em PDF e o arquivo STEP da carcaça. A tolerância crítica de posição nos furos guia é de 0,01 mm.',
            criada_em: '2026-09-10T13:10:00Z',
            anexos: [
              {
                id: 'anx-msg-1',
                mensagem_id: 'msg-1',
                nome_original: 'tabela-cotas-criticas-metalforte.pdf',
                tipo_mime: 'application/pdf',
                tamanho_bytes: 512000,
                caminho_storage: 'demonstracao/msg-1/tabela-cotas.pdf',
                criado_em: '2026-09-10T13:10:00Z',
              },
            ],
          },
          {
            id: 'msg-2',
            autor_nome: 'João Rodrigues (Técnico)',
            autor_tipo: 'equipe',
            conteudo: 'Recebido, Camila! Já conferimos o PDF rev3. Identificamos rebarba leve na face datum de 3 peças e fizemos a limpeza antes de repetir o alinhamento na PRISMO.',
            criada_em: '2026-09-13T14:25:00Z',
          },
          {
            id: 'msg-3',
            autor_nome: 'Camila Ferreira',
            autor_tipo: 'cliente',
            conteudo: 'Perfeito! Por favor destaquem no relatório final quais foram essas 3 peças do lote para avisarmos a usinagem.',
            criada_em: '2026-09-14T10:05:00Z',
          },
        ],
      },
      {
        solicitacao_id: 'sol-uuid-0285',
        codigo: 285,
        empresa: 'Aerotech Componentes',
        contato_nome: 'Bruno Almeida',
        contato_email: 'bruno.almeida@aerotech.test',
        necessidade: 'inspecao-interna-nao-destrutiva',
        criada_em: '2026-09-12T15:10:00Z',
        nao_lidas: 0,
        mensagens: [
          {
            id: 'msg-285-1',
            autor_nome: 'Bruno Almeida',
            autor_tipo: 'cliente',
            conteudo: 'Boa tarde! Anexei o PDF com as regiões críticas do suporte fundido onde suspeitamos de microporosidade interna.',
            criada_em: '2026-09-12T15:30:00Z',
          },
        ],
      },
    ],
    indicadores: [
      {
        execucao_id: 'exec-0280',
        solicitacao_codigo: 280,
        empresa_nome: 'Aerotech Componentes',
        servico_id: 'srv-escaneamento',
        servico_slug: 'escaneamento-3d-digitalizacao-pecas',
        concluida_em: '2026-09-05T17:30:00Z',
        horas_estimadas: 10,
        horas_realizadas: 12.5,
        desvio_esforco: 0.25,
        esforco_assertivo: false,
        custo_estimado: perfil === 'tecnico' ? null : 3100,
        custo_realizado: perfil === 'tecnico' ? null : 3875,
        desvio_custo: perfil === 'tecnico' ? null : 0.25,
        custo_assertivo: perfil === 'tecnico' ? null : false,
        duracao_estimada_horas: 72,
        duracao_realizada_horas: 81.5,
        desvio_duracao: 0.132,
        duracao_assertiva: true,
        licao_id: 'lic-0280',
        licao_estado: 'formalizada',
        licao_resumo: 'Em superfícies metálicas reflexivas com cavidades profundas, reservar preparação com opacificante e uso combinado ATOS Q + T-SCAN hawk 2 para evitar subestimativa de horas.',
        licao_assuntos: ['escaneamento-3d', 'superficie-reflexiva', 'atos-q', 't-scan'],
      },
    ],
  };
}

/**
 * Responde às perguntas dos Membros do Laboratório (Técnico, Validador, Administrador)
 * consultando toda a base interna carregada (serviços, solicitações, anexos/PDFs, instruções/etapas,
 * problemas/retrabalhos, mensagens de clientes e lições aprendidas).
 */
export async function responderChatbotInternoLaboratorio(
  pergunta: string,
  contexto: ContextoOperacionalLaboratorio,
  opcoes?: { chaveGemini?: string },
): Promise<{ texto: string; fontes: string[] }> {
  const q = normalizarTexto(pergunta);
  const mostrarValores = contexto.perfil !== 'tecnico';

  // Se houver chave Gemini configurada, envia o contexto interno autorizado (sem valores financeiros se for Técnico)
  if (opcoes?.chaveGemini?.trim()) {
    try {
      const respostaGemini = await chamarGeminiTexto(
        opcoes.chaveGemini.trim(),
        `Você é o Chatbot Interno do Laboratório de Metrologia SENAI / ZEISS, auxiliando um membro da equipe com perfil "${contexto.perfil}".\n` +
          `Responda em português de forma clara, técnica, estruturada e direta, usando TODOS os dados operacionais abaixo (solicitações, o que pediram, PDFs/anexos enviados, instruções/etapas do serviço, execuções, problemas/retrabalhos/causas ocorridas, mensagens de clientes e lições aprendidas).\n` +
          `${mostrarValores ? '' : 'ATENÇÃO: O usuário é Técnico; NUNCA exiba preços, valores comerciais, custos ou margens.'}\n` +
          `Dados operacionais do sistema:\n${JSON.stringify({
            servicosEInstrucoes: ETAPAS_INSTRUCOES_POR_SERVICO,
            contexto,
          })}`,
        pergunta,
      );
      if (respostaGemini) {
        return {
          texto: respostaGemini,
          fontes: ['Base Operacional Interna (Supabase)', `Perfil: ${contexto.perfil.toUpperCase()}`],
        };
      }
    } catch {
      // Continua para o motor determinístico completo
    }
  }

  // 1. Verifica se o membro do laboratório perguntou sobre um SERVIÇO específico (ou empresa / protocolo)
  const servicosCitados = encontrarServicosCitados(q);
  const codigoMatch = q.match(/\b(?:dem-sol-|sol-)?0*(\d{2,5})\b/);
  const codigoCitado = codigoMatch ? Number(codigoMatch[1]) : null;

  // Empresas conhecidas nos registros
  const empresasNoContexto = [
    ...new Set([
      ...contexto.solicitacoes.map((s) => s.empresa),
      ...contexto.orcamentos.map((o) => o.empresa_nome),
      ...contexto.execucoes.map((e) => e.empresa_nome),
      ...contexto.conversas.map((c) => c.empresa),
    ]),
  ];
  const empresaCitada = empresasNoContexto.find((emp) => emp && q.includes(normalizarTexto(emp.split(' ')[0])));

  if (servicosCitados.length > 0 || codigoCitado !== null || empresaCitada) {
    return montarDossieCompletoFiltro({
      servicos: servicosCitados,
      codigo: codigoCitado,
      empresa: empresaCitada ?? null,
      contexto,
      mostrarValores,
    });
  }

  // 2. Perguntas sobre PROBLEMAS, RETRABALHOS, FALHAS, MUDANÇAS DE ESCOPO, OCORRÊNCIAS
  if (
    q.includes('problema') ||
    q.includes('retrabalho') ||
    q.includes('ocorrencia') ||
    q.includes('escopo') ||
    q.includes('causa') ||
    q.includes('atraso') ||
    q.includes('desvio') ||
    q.includes('dificuldade') ||
    q.includes('erro')
  ) {
    const execucoesComProblema = contexto.execucoes.filter(
      (ex) => ex.retrabalho || ex.mudanca_escopo || ex.causa_principal || ex.fechamento_observacoes,
    );
    const orcamentosRecusadosOuForaFaixa = contexto.orcamentos.filter(
      (orc) => orc.estado === 'recusada' || orc.recusa_motivo || orc.justificativa_estimativa || orc.ultima_justificativa_interna,
    );
    const indicadoresForaFaixa = contexto.indicadores.filter((ind) => ind.esforco_assertivo === false || ind.duracao_assertiva === false);

    const blocos: string[] = ['### Relatório de Problemas, Retrabalhos e Desvios Registrados no Sistema'];

    if (execucoesComProblema.length > 0) {
      blocos.push(
        '**1. Problemas e Ocorrências em Execução:**\n' +
          execucoesComProblema
            .map((ex) => {
              const tituloSrv = servicosOficiais.find((s) => s.slug === ex.servico_slug)?.titulo ?? ex.servico_slug;
              const flags = [
                ex.retrabalho ? '⚠️ **Houve Retrabalho**' : '',
                ex.mudanca_escopo ? '🔄 **Mudança de Escopo**' : '',
              ]
                .filter(Boolean)
                .join(' · ');
              return (
                `• **SOL-${String(ex.solicitacao_codigo).padStart(4, '0')} — ${ex.empresa_nome}** (*${tituloSrv}* | Resp.: ${ex.responsavel_nome || 'Não atribuído'}):\n` +
                `  - Status: \`${ex.estado}\` (${ flags || 'Observação técnica registrada' })\n` +
                (ex.causa_principal ? `  - **Causa principal:** ${ex.causa_principal}\n` : '') +
                (ex.fechamento_observacoes ? `  - **Observações / Detalhes:** ${ex.fechamento_observacoes}\n` : '') +
                (ex.fechamento_aprendizado ? `  - **Aprendizado técnico:** ${ex.fechamento_aprendizado}` : '')
              );
            })
            .join('\n\n'),
      );
    } else {
      blocos.push('• Nenhuma execução ativa possui flag de retrabalho ou mudança de escopo no momento.');
    }

    if (orcamentosRecusadosOuForaFaixa.length > 0) {
      blocos.push(
        '**2. Recusas de Clientes ou Justificativas de Estimativa (Orçamentos):**\n' +
          orcamentosRecusadosOuForaFaixa
            .map((orc) => {
              const tituloSrv = servicosOficiais.find((s) => s.slug === orc.servico_slug)?.titulo ?? orc.servico_slug;
              return (
                `• **SOL-${String(orc.solicitacao_codigo).padStart(4, '0')} (${orc.empresa_nome} — ${tituloSrv}):** estado \`${orc.estado}\`` +
                (orc.recusa_motivo ? `\n  - **Motivo da recusa do Cliente:** "${orc.recusa_motivo}"` : '') +
                (orc.justificativa_estimativa ? `\n  - **Justificativa de horas fora de Q1–Q3:** "${orc.justificativa_estimativa}"` : '') +
                (orc.ultima_justificativa_interna ? `\n  - **Revisão interna:** "${orc.ultima_justificativa_interna}"` : '')
              );
            })
            .join('\n'),
      );
    }

    if (indicadoresForaFaixa.length > 0) {
      blocos.push(
        '**3. Desvios de Esforço/Duração e Lições Aprendidas:**\n' +
          indicadoresForaFaixa
            .map(
              (ind) =>
                `• **SOL-${String(ind.solicitacao_codigo).padStart(4, '0')} (${ind.empresa_nome}):** Estimado ${formatarHoras(ind.horas_estimadas)} vs. Realizado ${formatarHoras(ind.horas_realizadas)} (Desvio: **${formatarDesvio(ind.desvio_esforco)}**). Lição: *${ind.licao_resumo ?? 'Pendente'}*`,
            )
            .join('\n'),
      );
    }

    return {
      texto: blocos.join('\n\n'),
      fontes: ['Execuções e Fechamentos', 'Histórico de Recusas e Estimativas', 'Indicadores de Conhecimento'],
    };
  }

  // 3. Perguntas sobre PDFS, ANEXOS, ARQUIVOS, DESENHOS, DOCUMENTOS
  if (
    q.includes('pdf') ||
    q.includes('anexo') ||
    q.includes('arquivo') ||
    q.includes('desenho') ||
    q.includes('step') ||
    q.includes('cad') ||
    q.includes('documento')
  ) {
    const linhasAnexosSol: string[] = [];
    for (const sol of contexto.solicitacoes) {
      const lista = sol.solicitacao_id ? (contexto.anexosPorSolicitacao[sol.solicitacao_id] ?? []) : [];
      if (lista.length > 0) {
        const tituloSrv = servicosOficiais.find((s) => s.slug === mapearNecessidadeParaSlugServico(sol.necessidade))?.titulo ?? sol.necessidade;
        linhasAnexosSol.push(
          `• **SOL-${String(sol.codigo).padStart(4, '0')} — ${sol.empresa}** (*${tituloSrv}*):\n` +
            lista.map((a) => `  - 📄 \`${a.nome_original}\` (${a.tipo_mime}, ${Math.ceil(a.tamanho_bytes / 1024)} KB)`).join('\n'),
        );
      }
    }

    const linhasAnexosMsg: string[] = [];
    for (const conv of contexto.conversas) {
      for (const msg of conv.mensagens) {
        if (msg.anexos && msg.anexos.length > 0) {
          linhasAnexosMsg.push(
            `• **Conversa SOL-${String(conv.codigo).padStart(4, '0')} (${conv.empresa})** — enviado por *${msg.autor_nome}*:\n` +
              msg.anexos.map((a) => `  - 📎 \`${a.nome_original}\` (${Math.ceil(a.tamanho_bytes / 1024)} KB)`).join('\n'),
          );
        }
      }
    }

    const linhasPdfProposta = contexto.orcamentos.map((orc) => {
      const tituloSrv = servicosOficiais.find((s) => s.slug === orc.servico_slug)?.titulo ?? orc.servico_slug;
      const statusPdf = orc.publicacao_pronta || ['publicada', 'aceita', 'recusada'].includes(orc.estado)
        ? '✅ PDF da Pré-proposta gerado e congelado com hash SHA-256'
        : '⏳ PDF comercial ainda não emitido/congelado';
      return `• **SOL-${String(orc.solicitacao_codigo).padStart(4, '0')} (${orc.empresa_nome} — ${tituloSrv}, v${orc.numero}):** ${statusPdf} (Estado: \`${orc.estado}\`)`;
    });

    return {
      texto:
        `### Arquivos, PDFs e Anexos Registrados no Sistema\n\n` +
        `**1. Arquivos e Desenhos anexados nas Solicitações:**\n` +
        (linhasAnexosSol.length ? linhasAnexosSol.join('\n') : '• Nenhum anexo de solicitação carregado.') +
        `\n\n**2. Arquivos enviados nas Mensagens (Chat com Clientes):**\n` +
        (linhasAnexosMsg.length ? linhasAnexosMsg.join('\n') : '• Nenhum anexo encontrado nas mensagens.') +
        `\n\n**3. PDFs de Pré-propostas Comerciais:**\n` +
        (linhasPdfProposta.length ? linhasPdfProposta.join('\n') : '• Nenhuma pré-proposta registrada.'),
      fontes: ['Bucket Privado: solicitacoes', 'Bucket Privado: mensagens', 'Bucket Privado: pre-propostas'],
    };
  }

  // 4. Perguntas sobre MENSAGENS DE CLIENTES / CONVERSAS / O QUE O CLIENTE DISSE
  if (q.includes('mensagem') || q.includes('mensagens') || q.includes('conversa') || q.includes('cliente disse') || q.includes('cliente pediu') || q.includes('chat')) {
    if (contexto.conversas.length === 0) {
      return {
        texto: 'Não há conversas com clientes registradas na origem demonstrativa no momento.',
        fontes: ['Módulo Interno de Mensagens'],
      };
    }

    const resumoConversas = contexto.conversas
      .map((conv) => {
        const tituloSrv = servicosOficiais.find((s) => s.slug === mapearNecessidadeParaSlugServico(conv.necessidade))?.titulo ?? conv.necessidade;
        const ultimas = conv.mensagens.slice(-4).map((m) => {
          const listaAnx = m.anexos?.length ? ` [Anexos: ${m.anexos.map((a) => a.nome_original).join(', ')}]` : '';
          return `  - **[${m.autor_tipo === 'cliente' ? 'Cliente' : 'Equipe'} — ${m.autor_nome}]:** "${m.conteudo}"${listaAnx}`;
        });
        return (
          `• **SOL-${String(conv.codigo).padStart(4, '0')} — ${conv.empresa}** (Contato: ${conv.contato_nome} | Serviço: *${tituloSrv}* | Não lidas: ${conv.nao_lidas ?? 0}):\n` +
          (ultimas.length ? ultimas.join('\n') : '  - Sem mensagens trocadas ainda.')
        );
      })
      .join('\n\n');

    return {
      texto: `### Histórico de Mensagens de Clientes e Atendimento\n\n${resumoConversas}`,
      fontes: ['Conversas Cliente-Equipe (Realtime)', 'Anexos de Mensagens'],
    };
  }

  // 5. Perguntas sobre INSTRUÇÕES / ETAPAS / ROTEIRO DE EXECUÇÃO
  if (q.includes('instruc') || q.includes('etapa') || q.includes('passo a passo') || q.includes('procedimento') || q.includes('roteiro')) {
    const lista = servicosOficiais
      .map((s) => {
        const etapas = ETAPAS_INSTRUCOES_POR_SERVICO[s.slug] ?? [];
        return `**${s.titulo}:**\n${etapas.map((e) => `  ${e}`).join('\n')}`;
      })
      .join('\n\n');
    return {
      texto: `### Instruções e Macroetapas Oficiais por Serviço\n\n${lista}\n\n*Dica: pergunte pelo nome de um serviço específico para ver também as execuções ativas, o progresso atual de cada etapa e os problemas registrados nele!*`,
      fontes: ['Modelos Versionados de Macroetapas (Migration 022)', 'Catálogo Técnico SENAI'],
    };
  }

  // 6. Perguntas sobre LIÇÕES APRENDIDAS / CONHECIMENTO / ESTATÍSTICA
  if (q.includes('licao') || q.includes('licoes') || q.includes('aprendizado') || q.includes('conhecimento') || q.includes('recomendacao') || q.includes('quartil')) {
    const linhas = contexto.indicadores.map((ind) => {
      const tituloSrv = servicosOficiais.find((s) => s.slug === ind.servico_slug)?.titulo ?? ind.servico_slug;
      const blocoCusto =
        mostrarValores && ind.custo_estimado !== null && ind.custo_realizado !== null
          ? ` | Custo: ${formatarDinheiro(ind.custo_estimado)} → ${formatarDinheiro(ind.custo_realizado)}`
          : '';
      return (
        `• **SOL-${String(ind.solicitacao_codigo).padStart(4, '0')} (${ind.empresa_nome} — ${tituloSrv}):**\n` +
        `  - Esforço: ${formatarHoras(ind.horas_estimadas)} estimado vs. ${formatarHoras(ind.horas_realizadas)} realizado (Desvio: ${formatarDesvio(ind.desvio_esforco)})${blocoCusto}\n` +
        `  - Estado da Lição: \`${ind.licao_estado ?? 'sem_licao'}\`\n` +
        `  - **Resumo da Lição:** ${ind.licao_resumo ?? 'Ainda não registrado'}\n` +
        (ind.licao_assuntos?.length ? `  - Tags: ${ind.licao_assuntos.join(', ')}` : '')
      );
    });

    return {
      texto:
        `### Base de Conhecimento, Lições Aprendidas e Desvios\n\n` +
        (linhas.length ? linhas.join('\n\n') : 'Nenhum indicador concluído disponível no momento.') +
        `\n\n**Regra de Recomendação Estatística:** Apenas casos concluídos com lição **formalizada** entram no cálculo de Mediana e Quartis (Q1–Q3). Com 5 ou mais casos elegíveis, estimativas fora de Q1–Q3 exigem justificativa técnica persistida.`,
      fontes: ['Área de Conhecimento Persistente', 'Motor de Recomendação Estatística'],
    };
  }

  // 6.1. Perguntas conversacionais sobre como o Chatbot Interno funciona / Quem é o responsável / Orçamentos / Busca livre por termos nas descrições
  if (
    q.includes('como vc funciona') ||
    q.includes('como voce funciona') ||
    q.includes('como funciona') ||
    q.includes('quem e vc') ||
    q.includes('o que vc faz') ||
    /^(oi|ola|bom dia|boa tarde|boa noite|opa|e ai|tudo bem)[?!.\s]*$/.test(q)
  ) {
    return {
      texto:
        `Olá! Sou o **Chatbot Operacional Interno do Laboratório SENAI / ZEISS** (ativo para seu perfil **${contexto.perfil.toUpperCase()}**).\n\n` +
        `**Como eu funciono na bancada:**\n` +
        `Tenho acesso em tempo real a todas as tabelas operacionais do laboratório. Você pode me perguntar livremente:\n` +
        `• **Pelo nome de qualquer serviço:** (ex.: *"Metrologia avançada"*, *"Tomografia industrial"*, *"Engenharia reversa"*) — eu monto o dossiê completo com o que o cliente pediu, PDFs anexados, instruções das etapas, problemas ocorridos e mensagens.\n` +
        `• **Por uma peça, material ou palavra-chave:** (ex.: *"quem pediu carcaça?"*, *"qual peça teve rebarba?"*, *"quem é o técnico responsável?"*, *"quais orçamentos temos?"*).\n` +
        `• **Por empresa ou protocolo:** (ex.: *"Metalforte"*, *"Aerotech"*, *"Precision"*, *"SOL-0284"*).`,
      fontes: ['Manual Operacional do Chatbot Interno'],
    };
  }

  // 6.2. Perguntas sobre ORÇAMENTOS, PRÉ-PROPOSTAS, VALORES, PREÇOS, PRAZOS DE PAGAMENTO
  if (q.includes('orcamento') || q.includes('proposta') || q.includes('preco') || q.includes('valor') || q.includes('pagamento') || q.includes('custo')) {
    const linhasOrc = contexto.orcamentos.map((o) => {
      const tituloSrv = servicosOficiais.find((s) => s.slug === o.servico_slug)?.titulo ?? o.servico_slug;
      const infoFinanceira =
        mostrarValores && o.preco_final !== null && o.preco_final !== undefined
          ? ` | **Valor:** ${formatarDinheiro(o.preco_final)} (Custo congelado: ${o.custo_congelado ? formatarDinheiro(o.custo_congelado) : '—'})`
          : ' | *(Valores comerciais restritos ao perfil Técnico)*';
      return (
        `• **SOL-${String(o.solicitacao_codigo).padStart(4, '0')} v${o.numero} — ${o.empresa_nome}** (*${tituloSrv}*):\n` +
        `  - Estado: \`${o.estado}\` | Equipamento: ${o.equipamento_nome} (${o.horas} h)${infoFinanceira}\n` +
        `  - Prazo pagto: ${o.prazo_pagamento_dias ?? 30} dias | Entrega estimada: ${o.entrega_estimada ?? 'A definir'}` +
        (o.recusa_motivo ? `\n  - ⚠️ Motivo de recusa: "${o.recusa_motivo}"` : '')
      );
    });
    return {
      texto: `### Pré-propostas e Orçamentos Registrados (${contexto.orcamentos.length})\n\n${linhasOrc.join('\n\n')}`,
      fontes: ['Módulo Interno de Orçamentos e Pré-propostas'],
    };
  }

  // 6.3. Busca livre por palavras-chave dentro de solicitações, execuções e mensagens (ex.: "carcaça", "engrenagem", "rebarba", "técnico", "responsável", "prismo")
  const palavrasChaveLivres = q
    .split(/\s+/)
    .map((p) => p.replace(/[^a-z0-9]/g, ''))
    .filter(
      (p) =>
        p.length >= 4 &&
        ![
          'qual',
          'quais',
          'como',
          'onde',
          'quem',
          'para',
          'sobre',
          'temos',
          'esta',
          'estao',
          'foram',
          'pelo',
          'pela',
          'diga',
          'fale',
          'mostre',
          'quero',
          'saber',
          'servico',
          'servicos',
          'laboratorio',
        ].includes(p),
    );

  if (palavrasChaveLivres.length > 0) {
    const codigosEncontrados = new Set<number>();
    for (const sol of contexto.solicitacoes) {
      const textoSol = normalizarTexto(`${sol.empresa} ${sol.nome} ${sol.descricao} ${sol.necessidade}`);
      if (palavrasChaveLivres.some((termo) => textoSol.includes(termo))) {
        codigosEncontrados.add(Number(sol.codigo));
      }
    }
    for (const ex of contexto.execucoes) {
      const textoEx = normalizarTexto(
        `${ex.empresa_nome} ${ex.descricao} ${ex.responsavel_nome} ${ex.causa_principal ?? ''} ${ex.fechamento_observacoes ?? ''} ${ex.fechamento_aprendizado ?? ''} ${ex.equipamentos.map((e) => e.nome).join(' ')}`,
      );
      if (palavrasChaveLivres.some((termo) => textoEx.includes(termo))) {
        codigosEncontrados.add(Number(ex.solicitacao_codigo));
      }
    }
    for (const conv of contexto.conversas) {
      const textoConv = normalizarTexto(
        `${conv.empresa} ${conv.contato_nome} ${conv.mensagens.map((m) => m.conteudo).join(' ')}`,
      );
      if (palavrasChaveLivres.some((termo) => textoConv.includes(termo))) {
        codigosEncontrados.add(Number(conv.codigo));
      }
    }

    if (codigosEncontrados.size === 1) {
      const [codigoUnico] = [...codigosEncontrados];
      return montarDossieCompletoFiltro({
        servicos: [],
        codigo: codigoUnico,
        empresa: null,
        contexto,
        mostrarValores,
      });
    }
  }

  // 7. Resumo Operacional Completo do Laboratório (Default / Visão Geral)
  const totalSolicitacoes = contexto.solicitacoes.length;
  const totalOrcamentos = contexto.orcamentos.length;
  const totalExecucoes = contexto.execucoes.length;
  const comRetrabalho = contexto.execucoes.filter((e) => e.retrabalho || e.mudanca_escopo).length;
  const totalMensagens = contexto.conversas.reduce((acc, c) => acc + c.mensagens.length, 0);

  const resumoSolicitacoes = contexto.solicitacoes
    .slice(0, 6)
    .map((s) => {
      const slug = mapearNecessidadeParaSlugServico(s.necessidade);
      const tituloSrv = servicosOficiais.find((srv) => srv.slug === slug)?.titulo ?? s.necessidade;
      const qtdAnexos = s.solicitacao_id ? (contexto.anexosPorSolicitacao[s.solicitacao_id]?.length ?? 0) : 0;
      return `• **SOL-${String(s.codigo).padStart(4, '0')} (${s.empresa})** — *${tituloSrv}*: "${s.descricao}" (Qtd: ${s.quantidade} | Pré-proposta: \`${s.estado_pre_proposta ?? 'sem proposta'}\` | Anexos: ${qtdAnexos})`;
    })
    .join('\n');

  const resumoExecucoes = contexto.execucoes
    .slice(0, 5)
    .map((ex) => {
      const tituloSrv = servicosOficiais.find((srv) => srv.slug === ex.servico_slug)?.titulo ?? ex.servico_slug;
      const prog = calcularProgressoExecucao(ex.etapas);
      const alerta = ex.retrabalho ? ' ⚠️ [Com Retrabalho]' : ex.mudanca_escopo ? ' 🔄 [Mudança de Escopo]' : '';
      return `• **SOL-${String(ex.solicitacao_codigo).padStart(4, '0')} (${ex.empresa_nome})** — *${tituloSrv}*: \`${ex.estado}\` (${prog}% concluído | Técnico: ${ex.responsavel_nome || 'Não atribuído'})${alerta}`;
    })
    .join('\n');

  return {
    texto:
      `### Painel Inteligente do Laboratório (Perfil: ${contexto.perfil.toUpperCase()})\n\n` +
      `Estou conectado aos dados internos do sistema:\n` +
      `• **${totalSolicitacoes}** solicitações registradas | **${totalOrcamentos}** pré-propostas | **${totalExecucoes}** execuções (${comRetrabalho} com ocorrência/retrabalho) | **${totalMensagens}** mensagens de clientes.\n\n` +
      `**Solicitações e Pedidos Recentes:**\n${resumoSolicitacoes || '• Nenhuma solicitação.'}\n\n` +
      `**Execuções Ativas e Concluídas:**\n${resumoExecucoes || '• Nenhuma execução.'}\n\n` +
      `💡 **Como consultar rapidamente:** Basta digitar o **nome de qualquer serviço** (ex.: *"Metrologia avançada"*, *"Escaneamento 3D"*, *"Tomografia industrial"*, *"Engenharia reversa"*), o **nome de uma empresa** (ex.: *"Metalforte"*, *"Aerotech"*, *"Precision"*) ou perguntar por **PDFs/anexos**, **problemas/retrabalhos**, **instruções/etapas** ou **mensagens de clientes**!`,
    fontes: [
      'Solicitações e Anexos',
      'Orçamentos e Pré-propostas',
      'Execuções, Etapas e Fechamentos',
      'Mensagens de Clientes e Lições Aprendidas',
    ],
  };
}

function montarDossieCompletoFiltro(params: {
  servicos: ServicoOficial[];
  codigo: number | null;
  empresa: string | null;
  contexto: ContextoOperacionalLaboratorio;
  mostrarValores: boolean;
}): { texto: string; fontes: string[] } {
  const { servicos, codigo, empresa, contexto, mostrarValores } = params;
  const slugsServicos = new Set(servicos.map((s) => s.slug));
  const empNorm = empresa ? normalizarTexto(empresa.split(' ')[0]) : null;

  const bateFiltro = (item: { slugServico?: string; necessidade?: string; codigo?: number | string; empresa?: string }) => {
    if (codigo !== null && Number(item.codigo) === codigo) return true;
    if (empNorm && item.empresa && normalizarTexto(item.empresa).includes(empNorm)) return true;
    if (slugsServicos.size > 0) {
      const slugReal = item.slugServico ?? (item.necessidade ? mapearNecessidadeParaSlugServico(item.necessidade) : '');
      if (slugsServicos.has(slugReal)) return true;
    }
    return false;
  };

  const solicitacoes = contexto.solicitacoes.filter((s) =>
    bateFiltro({ necessidade: s.necessidade, codigo: s.codigo, empresa: s.empresa }),
  );
  const orcamentos = contexto.orcamentos.filter((o) =>
    bateFiltro({ slugServico: o.servico_slug, codigo: o.solicitacao_codigo, empresa: o.empresa_nome }),
  );
  const execucoes = contexto.execucoes.filter((e) =>
    bateFiltro({ slugServico: e.servico_slug, codigo: e.solicitacao_codigo, empresa: e.empresa_nome }),
  );
  const conversas = contexto.conversas.filter((c) =>
    bateFiltro({ necessidade: c.necessidade, codigo: c.codigo, empresa: c.empresa }),
  );
  const indicadores = contexto.indicadores.filter((i) =>
    bateFiltro({ slugServico: i.servico_slug, codigo: i.solicitacao_codigo, empresa: i.empresa_nome }),
  );

  const secoes: string[] = [];
  const tituloAlvo =
    servicos.length > 0
      ? servicos.map((s) => s.titulo).join(' / ')
      : codigo !== null
        ? `Solicitação SOL-${String(codigo).padStart(4, '0')}`
        : `Empresa ${empresa}`;

  secoes.push(`### Dossiê Interno: ${tituloAlvo}`);

  // 1. Instruções / Macroetapas padrão do serviço (se houver serviço identificado)
  const servicosParaInstrucoes =
    servicos.length > 0
      ? servicos
      : servicosOficiais.filter((s) =>
          execucoes.some((e) => e.servico_slug === s.slug) ||
          orcamentos.some((o) => o.servico_slug === s.slug) ||
          solicitacoes.some((sol) => mapearNecessidadeParaSlugServico(sol.necessidade) === s.slug),
        );

  if (servicosParaInstrucoes.length > 0) {
    const srv = servicosParaInstrucoes[0];
    const etapasPadrao = ETAPAS_INSTRUCOES_POR_SERVICO[srv.slug] ?? [];
    secoes.push(
      `**1. Sobre o Serviço e Instruções Padrão (${srv.titulo}):**\n` +
        `${srv.resumo}\n` +
        etapasPadrao.map((e) => `  • ${e}`).join('\n'),
    );
  }

  // 2. O que pediram (Solicitações + Anexos/PDFs)
  if (solicitacoes.length > 0) {
    const textoSol = solicitacoes
      .map((s) => {
        const anexos = s.solicitacao_id ? (contexto.anexosPorSolicitacao[s.solicitacao_id] ?? []) : [];
        const listaAnx = anexos.length
          ? anexos.map((a) => `\`${a.nome_original}\` (${Math.ceil(a.tamanho_bytes / 1024)} KB)`).join(', ')
          : 'Nenhum anexo enviado na solicitação';
        return (
          `• **SOL-${String(s.codigo).padStart(4, '0')} — ${s.empresa}** (Contato: ${s.nome} · ${s.email}):\n` +
          `  - **O que pediram:** "${s.descricao}"\n` +
          `  - **Quantidade:** ${s.quantidade} un. | **Prazo pagto desejado:** ${s.prazo_pagamento_dias} dias | **Status:** \`${s.estado}\` (Pré-proposta: \`${s.estado_pre_proposta ?? 'pendente'}\`)\n` +
          `  - **PDFs / Arquivos anexados:** ${listaAnx}`
        );
      })
      .join('\n\n');
    secoes.push(`**2. Solicitações, Detalhes do Pedido e Anexos/PDFs:**\n${textoSol}`);
  } else {
    secoes.push(`**2. Solicitações:** Nenhuma solicitação ativa encontrada especificamente para este filtro.`);
  }

  // 3. Pré-propostas / Orçamentos
  if (orcamentos.length > 0) {
    const textoOrc = orcamentos
      .map((o) => {
        const infoFinanceira =
          mostrarValores && o.preco_final !== null && o.preco_final !== undefined
            ? ` | **Valor:** ${formatarDinheiro(o.preco_final)} (Custo congelado: ${o.custo_congelado ? formatarDinheiro(o.custo_congelado) : '—'})`
            : ' | *(Valores comerciais ocultos para perfil Técnico)*';
        return (
          `• **SOL-${String(o.solicitacao_codigo).padStart(4, '0')} v${o.numero} (${o.empresa_nome}):** Estado \`${o.estado}\`\n` +
          `  - **Equipamento(s):** ${o.equipamento_nome} (${o.horas} h estimadas)${infoFinanceira}\n` +
          `  - **Destinatário:** ${o.destinatario ?? '—'} | **Entrega estimada:** ${o.entrega_estimada ?? '—'}` +
          (o.recusa_motivo ? `\n  - ⚠️ **Motivo de recusa do cliente:** "${o.recusa_motivo}"` : '') +
          (o.justificativa_estimativa ? `\n  - 📌 **Justificativa estatística (fora de Q1–Q3):** "${o.justificativa_estimativa}"` : '')
        );
      })
      .join('\n\n');
    secoes.push(`**3. Pré-propostas e Orçamentos:**\n${textoOrc}`);
  }

  // 4. Execuções, Progresso das Etapas e Problemas Acontecidos
  if (execucoes.length > 0) {
    const textoExec = execucoes
      .map((ex) => {
        const progresso = calcularProgressoExecucao(ex.etapas);
        const resumoEtapas = ex.etapas
          .map((et) => `${et.ordem}. ${et.titulo}: ${et.progresso}% (${et.estado})`)
          .join(' | ');
        const resumoMaquinas = ex.equipamentos
          .map((eq) => `${eq.nome}: ${eq.horas_estimadas}h est. / ${eq.horas_reais ?? '—'}h reais`)
          .join('; ');
        return (
          `• **Execução SOL-${String(ex.solicitacao_codigo).padStart(4, '0')} (${ex.empresa_nome}):** Estado \`${ex.estado}\` (${progresso}% concluído)\n` +
          `  - **Técnico Responsável:** ${ex.responsavel_nome || 'Não atribuído'} | **Fechamento:** \`${ex.fechamento_estado}\`\n` +
          `  - **Máquinas e Horas:** ${resumoMaquinas}\n` +
          `  - **Andamento das Etapas:** ${resumoEtapas}\n` +
          `  - **Problemas / Ocorrências:** Retrabalho: **${ex.retrabalho ? 'SIM ⚠️' : 'Não'}** | Mudança de escopo: **${ex.mudanca_escopo ? 'SIM 🔄' : 'Não'}**\n` +
          (ex.causa_principal ? `  - **Causa principal registrada:** "${ex.causa_principal}"\n` : '') +
          (ex.fechamento_observacoes ? `  - **Observações técnicas:** "${ex.fechamento_observacoes}"\n` : '') +
          (ex.fechamento_aprendizado ? `  - **Aprendizado registrado:** "${ex.fechamento_aprendizado}"` : '')
        );
      })
      .join('\n\n');
    secoes.push(`**4. Execução, Etapas e Problemas Ocorridos:**\n${textoExec}`);
  }

  // 5. Mensagens de Clientes
  if (conversas.length > 0) {
    const textoConv = conversas
      .map((c) => {
        const msgs = c.mensagens
          .map((m) => {
            const anx = m.anexos?.length ? ` *(Anexos: ${m.anexos.map((a) => a.nome_original).join(', ')})*` : '';
            return `  - **[${m.autor_tipo === 'cliente' ? 'Cliente' : 'Equipe'} — ${m.autor_nome}]:** "${m.conteudo}"${anx}`;
          })
          .join('\n');
        return `• **Conversa SOL-${String(c.codigo).padStart(4, '0')} (${c.empresa}):**\n${msgs || '  - Sem mensagens.'}`;
      })
      .join('\n\n');
    secoes.push(`**5. Mensagens Trocadas com o Cliente:**\n${textoConv}`);
  }

  // 6. Lições Aprendidas e Conhecimento
  if (indicadores.length > 0) {
    const textoInd = indicadores
      .map(
        (ind) =>
          `• **SOL-${String(ind.solicitacao_codigo).padStart(4, '0')} (${ind.empresa_nome}):** Desvio de esforço ${formatarDesvio(ind.desvio_esforco)} (${formatarHoras(ind.horas_estimadas)} → ${formatarHoras(ind.horas_realizadas)}) | Lição (\`${ind.licao_estado ?? 'pendente'}\`): *"${ind.licao_resumo ?? 'Sem resumo'}"*`,
      )
      .join('\n');
    secoes.push(`**6. Lições Aprendidas e Histórico:**\n${textoInd}`);
  }

  return {
    texto: secoes.join('\n\n'),
    fontes: [
      `Dossiê do Serviço / Trabalho: ${tituloAlvo}`,
      `Acesso interno (${contexto.perfil})`,
    ],
  };
}

async function chamarGeminiTexto(apiKey: string, instrucaoSistema: string, perguntaUsuario: string): Promise<string | null> {
  const resposta = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: instrucaoSistema }] },
        contents: [{ role: 'user', parts: [{ text: perguntaUsuario }] }],
        generationConfig: { temperature: 0.25, maxOutputTokens: 900 },
      }),
    },
  );
  if (!resposta.ok) return null;
  const json = (await resposta.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null;
}
