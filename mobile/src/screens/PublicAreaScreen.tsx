import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MATERIAIS_PECA } from '@lib/campos-padronizados';
import {
  criarMensagemChatIa,
  EVENTOS_PADRAO_LABORATORIO,
  obterSugestoesChatbotPublico,
  responderChatbotPublico,
  type MensagemChatIa,
} from '@lib/chatbot-metrologia';
import {
  equipamentosPublicos,
  type EquipamentoPublico,
  type MidiaEquipamento,
} from '@lib/equipamentos';
import type { IdiomaPublico } from '@lib/idioma-publico';
import { servicosOficiais } from '@lib/servicos';
import { setoresIndustria } from '@lib/setores';
import { cnpjValido, formatarCnpj, necessidadesCliente } from '@lib/solicitacao';
import { traduzirTextoPublico } from '@lib/traducao-publica';
import { BarraLateralMobile } from '../components/BarraLateralMobile';
import { CarrosselMidiaMobile, MidiaLockedMobile } from '../components/CarrosselMidiaMobile';
import { obterSupabaseMobile } from '../supabase';
import { CORES, estilosComuns } from '../theme';

const MIDIAS_LABORATORIO: MidiaEquipamento[] = [
  {
    tipo: 'imagem',
    src: '/imagens/laboratorio-prismo.jpeg',
    alt: 'ZEISS PRISMO instalada no Centro',
    legenda: 'ZEISS PRISMO no Centro',
  },
  {
    tipo: 'imagem',
    src: '/imagens/laboratorio-t-scan-hawk-2-close-up.jpeg',
    alt: 'Close-up do ZEISS T-SCAN hawk 2 no Centro',
    legenda: 'ZEISS T-SCAN hawk 2 no Centro',
  },
  {
    tipo: 'imagem',
    src: '/imagens/laboratorio-o-inspect.jpeg',
    alt: 'ZEISS O-INSPECT instalada no Centro',
    legenda: 'ZEISS O-INSPECT no Centro',
  },
  {
    tipo: 'imagem',
    src: '/imagens/laboratorio-duramax.jpeg',
    alt: 'ZEISS DuraMax instalada no Centro',
    legenda: 'ZEISS DuraMax no Centro',
  },
  {
    tipo: 'imagem',
    src: '/imagens/laboratorio-bosello.jpeg',
    alt: 'ZEISS BOSELLO MAX instalada no Centro',
    legenda: 'ZEISS BOSELLO MAX no Centro',
  },
  {
    tipo: 'imagem',
    src: '/imagens/laboratorio-atos-q.jpeg',
    alt: 'ZEISS ATOS Q instalada no Centro',
    legenda: 'ZEISS ATOS Q no Centro',
  },
  {
    tipo: 'imagem',
    src: '/imagens/laboratorio-fachada-interna.jpeg',
    alt: 'Vista externa do Centro de Excelência em Metrologia',
    legenda: 'Centro de Excelência em Metrologia',
  },
];

const AREAS_TECNOLOGICAS = [
  {
    titulo: 'Medição tridimensional',
    imagem: '/imagens/recorte-zeiss-prismo-v2.png',
    texto:
      'Inspeção tátil ou multissensor de dimensões, forma e posição, com programação e relatórios técnicos.',
    itens: ['DuraMax HTG 5/5/5', 'O-INSPECT 5/4/3', 'PRISMO VAST 09/24/07'],
  },
  {
    titulo: 'Raios X industrial',
    imagem: '/imagens/recorte-zeiss-bosello-max-v3.png',
    texto:
      'Investigação não destrutiva de estruturas internas, montagem, porosidade e outras descontinuidades.',
    itens: ['ZEISS BOSELLO MAX 80-150', 'Inspeção radiográfica 2D', 'Análise técnica de falhas'],
  },
  {
    titulo: 'Digitalização óptica 3D',
    imagem: '/imagens/recorte-zeiss-atos-q-v2.png',
    texto:
      'Captura de superfícies para inspeção, comparação nominal-real e reconstrução geométrica.',
    itens: ['ZEISS ATOS Q 8M', 'ZEISS T-SCAN hawk 2', 'Engenharia reversa e comparação CAD'],
  },
] as const;

type AbaPublica = 'inicio' | 'catalogo' | 'solicitar' | 'chatbot';

export function PublicAreaScreen({ aoIrParaLogin }: { aoIrParaLogin: () => void }) {
  const [idioma, setIdioma] = useState<IdiomaPublico>('pt-BR');
  const [aba, setAba] = useState<AbaPublica>('inicio');
  const [setorAtivo, setSetorAtivo] = useState(setoresIndustria[0].slug);
  const [equipamentoDetalhe, setEquipamentoDetalhe] = useState<EquipamentoPublico | null>(null);

  // Estado do formulário público de solicitação
  const [nome, setNome] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [necessidade, setNecessidade] = useState<string>(necessidadesCliente[0].valor);
  const [material, setMaterial] = useState<string>(MATERIAIS_PECA[0]);
  const [quantidade, setQuantidade] = useState('1');
  const [prazoPagamento, setPrazoPagamento] = useState('30');
  const [descricao, setDescricao] = useState('');
  const [erroForm, setErroForm] = useState('');
  const [protocoloGerado, setProtocoloGerado] = useState('');
  const [enviandoForm, setEnviandoForm] = useState(false);

  // Estado do Chatbot Público (somente informações do lab, eventos, equipamentos e serviços)
  const [perguntaChat, setPerguntaChat] = useState('');
  const [carregandoChat, setCarregandoChat] = useState(false);
  const [mensagensChat, setMensagensChat] = useState<MensagemChatIa[]>([]);

  const t = (chave: string) => traduzirTextoPublico(chave, idioma);
  const setorSelecionado = setoresIndustria.find((s) => s.slug === setorAtivo) ?? setoresIndustria[0];
  const eventos = EVENTOS_PADRAO_LABORATORIO[idioma];

  async function enviarSolicitacaoPublica() {
    setErroForm('');
    setProtocoloGerado('');

    if (nome.trim().length < 2) {
      setErroForm(t('Informe seu nome completo (mínimo 2 caracteres).'));
      return;
    }
    if (empresa.trim().length < 2) {
      setErroForm(t('Informe o nome da empresa.'));
      return;
    }
    if (!cnpjValido(cnpj)) {
      setErroForm(t('Informe um CNPJ válido com 14 dígitos verificadores.'));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErroForm(t('Informe um e-mail corporativo válido.'));
      return;
    }
    if (descricao.trim().length < 10) {
      setErroForm(t('Descreva o desafio técnico em pelo menos 10 caracteres.'));
      return;
    }

    setEnviandoForm(true);
    try {
      const supabase = obterSupabaseMobile();
      if (supabase) {
        const { data, error } = await supabase.rpc('registrar_solicitacao_publica_demonstracao', {
          nome_contato: nome.trim(),
          email_contato: email.trim(),
          telefone_contato: telefone.trim() || null,
          nome_empresa: empresa.trim(),
          cnpj_empresa: cnpj,
          necessidade_principal: necessidade,
          material_peca: material,
          dimensoes_aproximadas: 'Conforme descrição',
          quantidade_pecas: Math.max(1, Number(quantidade) || 1),
          prazo_desejado: null,
          prazo_pagamento_dias: Math.max(1, Number(prazoPagamento) || 30),
          possui_modelo_cad: 'nao_sei',
          descricao_desafio: descricao.trim(),
          consentimento_lgpd: true,
        });
        if (!error && data && typeof data === 'object' && 'protocolo' in data) {
          setProtocoloGerado(String((data as { protocolo: string }).protocolo));
          return;
        }
      }
      setProtocoloGerado(`DEM-SOL-0${Math.floor(290 + Math.random() * 90)}`);
    } finally {
      setEnviandoForm(false);
    }
  }

  async function enviarPerguntaChatbot(texto: string) {
    const limpa = texto.trim();
    if (!limpa || carregandoChat) return;

    const msgUsr = criarMensagemChatIa('usuario', limpa, idioma);
    setMensagensChat((atuais) => [...atuais, msgUsr]);
    setPerguntaChat('');
    setCarregandoChat(true);

    try {
      const resp = await responderChatbotPublico(limpa, idioma);
      const msgBot = criarMensagemChatIa('assistente', resp.texto, idioma, resp.fontes);
      setMensagensChat((atuais) => [...atuais, msgBot]);
    } finally {
      setCarregandoChat(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Barra de Idiomas e Acesso */}
      <View style={styles.barraIdioma}>
        <View style={styles.idiomasRow}>
          {(['pt-BR', 'en', 'de'] as const).map((cod) => (
            <TouchableOpacity
              key={cod}
              style={[styles.botaoIdioma, idioma === cod && styles.botaoIdiomaAtivo]}
              onPress={() => setIdioma(cod)}
            >
              <Text style={[styles.textoIdioma, idioma === cod && styles.textoIdiomaAtivo]}>
                {cod.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.botaoEntrarTopo} onPress={aoIrParaLogin}>
          <Text style={styles.botaoEntrarTopoTexto}>{t('Entrar')} →</Text>
        </TouchableOpacity>
      </View>

      {/* Corpo principal com Gaveta Lateral Deslizante + Barra Inferior Nativa */}
      <BarraLateralMobile
        tituloMenu={t('Área Pública')}
        rotuloBotaoMenu={t('Menu')}
        ativoId={aba}
        aoSelecionar={(novaAba) => setAba(novaAba)}
        itens={[
          {
            id: 'inicio',
            icone: '🏠',
            rotuloCurto: idioma === 'en' ? 'Home' : idioma === 'de' ? 'Start' : 'Início',
            rotuloCompleto:
              idioma === 'en' ? 'Home & Events' : idioma === 'de' ? 'Start & Events' : 'Início & Eventos',
          },
          {
            id: 'catalogo',
            icone: '🔬',
            rotuloCurto: idioma === 'en' ? 'Catalog' : idioma === 'de' ? 'Katalog' : 'Catálogo',
            rotuloCompleto:
              idioma === 'en' ? 'Catalog & ZEISS' : idioma === 'de' ? 'Katalog & ZEISS' : 'Catálogo & ZEISS',
            badge: 10,
          },
          {
            id: 'solicitar',
            icone: '📋',
            rotuloCurto: idioma === 'en' ? 'Quote' : idioma === 'de' ? 'Anfrage' : 'Solicitar',
            rotuloCompleto: t('Solicitar orçamento'),
          },
          {
            id: 'chatbot',
            icone: '🤖',
            rotuloCurto: 'Chatbot',
            rotuloCompleto:
              idioma === 'en' ? 'Lab Chatbot' : idioma === 'de' ? 'Labor-Bot' : 'Chatbot do Lab',
          },
        ]}
      >
        {aba === 'inicio' && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Hero */}
            <View style={styles.heroCard}>
              <Text style={styles.heroSobrelinha}>{t('METROLOGIA QUE GERA CONHECIMENTO')}</Text>
              <Text style={styles.heroTitulo}>
                {t('Precisão para medir.')} {t('Inteligência para evoluir.')}
              </Text>
              <Text style={styles.heroSubtitulo}>
                {t(
                  'Serviços de metrologia avançada com propostas transparentes, acompanhamento digital e conhecimento acumulado a cada projeto.',
                )}
              </Text>
              <View style={styles.selosRow}>
                <View style={styles.seloItem}>
                  <Text style={styles.seloNumero}>6</Text>
                  <Text style={styles.seloRotulo}>{t('equipamentos disponíveis')}</Text>
                </View>
                <View style={styles.seloItem}>
                  <Text style={styles.seloNumero}>5</Text>
                  <Text style={styles.seloRotulo}>{t('laboratórios como este no mundo')}</Text>
                </View>
                <View style={styles.seloItem}>
                  <Text style={styles.seloNumero}>1</Text>
                  <Text style={styles.seloRotulo}>{t('o único da América Latina')}</Text>
                </View>
              </View>
              <View style={styles.heroBotoes}>
                <TouchableOpacity
                  style={[estilosComuns.botaoPrimario, { flex: 1 }]}
                  onPress={() => setAba('solicitar')}
                >
                  <Text style={estilosComuns.botaoPrimarioTexto}>{t('Solicitar orçamento')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[estilosComuns.botaoSecundario, { flex: 1 }]}
                  onPress={() => setAba('chatbot')}
                >
                  <Text style={estilosComuns.botaoSecundarioTexto}>{t('💬 Chatbot do Lab')}</Text>
                </TouchableOpacity>
              </View>

              {/* Vídeo de apresentação do Hero em proporção travada 16:9, autoplay e mudo */}
              <View style={{ marginTop: 14, borderRadius: 10, overflow: 'hidden' }}>
                <MidiaLockedMobile
                  idioma={idioma}
                  midia={{
                    tipo: 'video',
                    src: '/videos/centro-metrologia-apresentacao.mp4',
                    poster: '/imagens/laboratorio-centro-excelencia.jpeg',
                    alt: 'Apresentação em vídeo do Centro de Excelência em Metrologia SENAI ZEISS',
                    legenda: 'Centro de Excelência em Metrologia SENAI ZEISS',
                  }}
                />
              </View>
            </View>

            {/* Estrutura Real do Laboratório (Carrossel de fotos oficiais do Centro) */}
            <View style={estilosComuns.cartao}>
              <Text style={estilosComuns.sobrelinha}>{t('ESTRUTURA REAL')}</Text>
              <Text style={estilosComuns.tituloSecao}>
                {t('Um centro de excelência preparado para medir o que importa.')}
              </Text>
              <Text style={[estilosComuns.paragrafo, { marginBottom: 8 }]}>
                {t(
                  'O laboratório reúne medição por coordenadas, inspeção por raios X e digitalização óptica em um ambiente dedicado à precisão.',
                )}
              </Text>
              <CarrosselMidiaMobile midias={MIDIAS_LABORATORIO} idioma={idioma} />
              <TouchableOpacity
                style={{ marginTop: 6 }}
                onPress={() => setAba('catalogo')}
              >
                <Text style={styles.verFichaLink}>{t('Conheça os equipamentos')} →</Text>
              </TouchableOpacity>
            </View>

            {/* Setores Atendidos com Vídeos e Imagens em Proporção 16:9 */}
            <View style={estilosComuns.cartao}>
              <Text style={estilosComuns.sobrelinha}>{t('ONDE ATUAMOS')}</Text>
              <Text style={estilosComuns.tituloSecao}>{t('Soluções organizadas por setor')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 10 }}>
                {setoresIndustria.map((st) => (
                  <TouchableOpacity
                    key={st.slug}
                    style={[
                      styles.chipSetor,
                      setorAtivo === st.slug && styles.chipSetorAtivo,
                    ]}
                    onPress={() => setSetorAtivo(st.slug)}
                  >
                    <Text
                      style={[
                        styles.chipSetorTexto,
                        setorAtivo === st.slug && styles.chipSetorTextoAtivo,
                      ]}
                    >
                      {t(st.titulo)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={styles.boxSetorDetalhe}>
                <Text style={styles.setorTitulo}>{t(setorSelecionado.titulo)}</Text>
                <Text style={estilosComuns.paragrafo}>{t(setorSelecionado.resumo)}</Text>
                <Text style={styles.setorExemplos}>
                  {t('Exemplos:')} {t(setorSelecionado.exemplos)}
                </Text>

                {/* Carrossel de vídeos (autoPlay + mudo) e fotos do setor selecionado */}
                <CarrosselMidiaMobile midias={setorSelecionado.midias} idioma={idioma} />

                <Text style={[estilosComuns.label, { marginTop: 10, marginBottom: 6 }]}>
                  {t('Serviços mais procurados neste setor')} ({setorSelecionado.servicos.length}):
                </Text>
                {setorSelecionado.servicos.map((slugSrv) => {
                  const srv = servicosOficiais.find((s) => s.slug === slugSrv);
                  if (!srv) return null;
                  return (
                    <TouchableOpacity
                      key={slugSrv}
                      style={styles.itemServicoSetor}
                      onPress={() => {
                        setDescricao(`${t(srv.titulo)}: `);
                        setAba('solicitar');
                      }}
                    >
                      <Text style={styles.itemServicoSetorTexto}>• {t(srv.titulo)}</Text>
                      <Text style={{ color: CORES.azulPrincipal, fontWeight: '800' }}>→</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Novidades e Eventos no Centro com Fotos e Vídeos */}
            <View style={estilosComuns.cartao}>
              <Text style={estilosComuns.sobrelinha}>{t('NEWSROOM · EVENTOS')}</Text>
              <Text style={estilosComuns.tituloSecao}>{t('Novidades no Centro')}</Text>
              {eventos.map((ev, idx) => (
                <View key={idx} style={styles.cardEvento}>
                  <View style={styles.badgeEvento}>
                    <Text style={styles.badgeEventoTexto}>{ev.data}</Text>
                  </View>
                  <Text style={styles.eventoTitulo}>{ev.titulo}</Text>
                  <Text style={estilosComuns.paragrafo}>{ev.resumo}</Text>
                  {ev.midias && ev.midias.length > 0 ? (
                    <CarrosselMidiaMobile midias={ev.midias} idioma={idioma} />
                  ) : null}
                </View>
              ))}
            </View>
          </ScrollView>
        )}

        {aba === 'catalogo' && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Três Áreas Tecnológicas (com imagens oficiais recortadas em proporção travada) */}
            <View style={estilosComuns.cartao}>
              <Text style={estilosComuns.sobrelinha}>{t('TECNOLOGIAS')}</Text>
              <Text style={estilosComuns.tituloSecao}>
                {t('Três áreas tecnológicas apoiam esse portfólio.')}
              </Text>
              {AREAS_TECNOLOGICAS.map((area) => (
                <View key={area.titulo} style={styles.cardEquipamento}>
                  <View style={{ borderRadius: 8, overflow: 'hidden', marginBottom: 10 }}>
                    <MidiaLockedMobile
                      idioma={idioma}
                      fundoClaro
                      midia={{
                        tipo: 'imagem',
                        src: area.imagem,
                        alt: area.titulo,
                        legenda: area.titulo,
                      }}
                    />
                  </View>
                  <Text style={estilosComuns.sobrelinha}>{t('CAPACIDADE')}</Text>
                  <Text style={styles.nomeEquipamento}>{t(area.titulo)}</Text>
                  <Text style={estilosComuns.paragrafo}>{t(area.texto)}</Text>
                  <View style={{ marginTop: 6 }}>
                    {area.itens.map((it) => (
                      <Text key={it} style={styles.etapaLinha}>
                        • {t(it)}
                      </Text>
                    ))}
                  </View>
                  <TouchableOpacity
                    style={{ marginTop: 8 }}
                    onPress={() => {
                      setDescricao(`${t(area.titulo)}: `);
                      setAba('solicitar');
                    }}
                  >
                    <Text style={styles.verFichaLink}>{t('Solicitar análise')} →</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Parque Tecnológico ZEISS (6 Equipamentos com imagens + vídeo institucional) */}
            <View style={estilosComuns.cartao}>
              <Text style={estilosComuns.sobrelinha}>{t('PARQUE TECNOLÓGICO ZEISS')}</Text>
              <Text style={estilosComuns.tituloSecao}>
                {t('Seis equipamentos instalados no Centro de Excelência em Metrologia.')}
              </Text>
              <Text style={[estilosComuns.paragrafo, { marginBottom: 12 }]}>
                {t(
                  'Toque em qualquer equipamento para consultar volume de medição, sensores, incerteza e aplicações.',
                )}
              </Text>
              {equipamentosPublicos.map((eq) => (
                <TouchableOpacity
                  key={eq.slug}
                  style={styles.cardEquipamento}
                  onPress={() => setEquipamentoDetalhe(eq)}
                >
                  <View style={{ borderRadius: 8, overflow: 'hidden', marginBottom: 10 }}>
                    <MidiaLockedMobile
                      idioma={idioma}
                      fundoClaro
                      midia={{
                        tipo: 'imagem',
                        src: eq.imagemPrincipal,
                        alt: eq.nome,
                        legenda: eq.nome,
                      }}
                    />
                  </View>
                  <Text style={estilosComuns.sobrelinha}>{t(eq.categoria)}</Text>
                  <Text style={styles.nomeEquipamento}>{eq.nome}</Text>
                  <Text style={estilosComuns.paragrafo}>{t(eq.resumo)}</Text>
                  <Text style={styles.verFichaLink}>{t('Ver especificações e aplicações')} →</Text>
                </TouchableOpacity>
              ))}

              {/* Vídeo da estrutura do Centro de Metrologia em proporção 16:9, autoplay e mudo */}
              <View style={{ marginTop: 6, borderRadius: 10, overflow: 'hidden' }}>
                <MidiaLockedMobile
                  idioma={idioma}
                  midia={{
                    tipo: 'video',
                    src: '/videos/estrutura-centro-metrologia.mp4',
                    poster: '/imagens/laboratorio-fachada-interna.jpeg',
                    alt: 'Centro de Excelência em Metrologia SENAI ZEISS',
                    legenda: 'Centro de Excelência em Metrologia SENAI ZEISS',
                  }}
                />
              </View>
            </View>

            {/* Portfólio Oficial de 10 Serviços (sem os stages de execução interna!) */}
            <View style={estilosComuns.cartao}>
              <Text style={estilosComuns.sobrelinha}>{t('PORTFÓLIO OFICIAL')}</Text>
              <Text style={estilosComuns.tituloSecao}>
                {t('10 Serviços de Metrologia e Engenharia')}
              </Text>
              {servicosOficiais.map((srv, idx) => (
                <TouchableOpacity
                  key={srv.slug}
                  style={styles.cardServicoCatalogo}
                  onPress={() => {
                    setDescricao(`${t(srv.titulo)}: `);
                    setAba('solicitar');
                  }}
                >
                  <Text style={styles.numeroServico}>
                    {idx + 1 < 10 ? `0${idx + 1}` : String(idx + 1)}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.nomeEquipamento}>{t(srv.titulo)}</Text>
                    <Text style={estilosComuns.paragrafo}>{t(srv.resumo)}</Text>
                    <Text style={styles.verFichaLink}>{t('Solicitar orçamento')} →</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}

        {aba === 'solicitar' && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={estilosComuns.cartao}>
              <Text style={estilosComuns.sobrelinha}>{t('TRIAGEM TÉCNICA SEM LOGIN')}</Text>
              <Text style={estilosComuns.tituloSecao}>
                {t('Solicite uma análise sem criar uma conta')}
              </Text>
              <Text style={[estilosComuns.paragrafo, { marginBottom: 14 }]}>
                {t(
                  'Ambiente de homologação: utilize apenas dados fictícios/demonstrativos. O protocolo gerado permite ativar o acompanhamento na Área do Cliente.',
                )}
              </Text>

              {protocoloGerado ? (
                <View style={styles.confirmacaoBox}>
                  <Text style={styles.confirmacaoTitulo}>{t('Solicitação Registrada!')}</Text>
                  <Text style={styles.confirmacaoProtocolo}>
                    {t('Protocolo')}: {protocoloGerado}
                  </Text>
                  <Text style={estilosComuns.paragrafo}>
                    {t(
                      'Nossa equipe do laboratório analisará a demanda e preparará a pré-proposta vinculada à sua empresa.',
                    )}
                  </Text>
                  <TouchableOpacity
                    style={[estilosComuns.botaoPrimario, { marginTop: 14 }]}
                    onPress={() => {
                      setProtocoloGerado('');
                      setDescricao('');
                    }}
                  >
                    <Text style={estilosComuns.botaoPrimarioTexto}>
                      {t('Enviar outra solicitação')}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {erroForm ? (
                    <View style={styles.erroBox}>
                      <Text style={styles.erroTexto}>{erroForm}</Text>
                    </View>
                  ) : null}

                  <Text style={estilosComuns.label}>{t('Nome completo')}</Text>
                  <TextInput
                    style={estilosComuns.input}
                    value={nome}
                    onChangeText={setNome}
                    placeholder="Ex.: Camila Ferreira"
                  />

                  <Text style={estilosComuns.label}>{t('Empresa')}</Text>
                  <TextInput
                    style={estilosComuns.input}
                    value={empresa}
                    onChangeText={setEmpresa}
                    placeholder="Ex.: Metalforte Indústria"
                  />

                  <Text style={estilosComuns.label}>{t('CNPJ (14 dígitos válidos)')}</Text>
                  <TextInput
                    style={estilosComuns.input}
                    value={cnpj}
                    onChangeText={(v) => setCnpj(formatarCnpj(v))}
                    placeholder="11.222.333/0001-81"
                    keyboardType="numeric"
                  />

                  <Text style={estilosComuns.label}>{t('E-mail para acesso do cliente')}</Text>
                  <TextInput
                    style={estilosComuns.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder={t('nome@empresa.com.br')}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />

                  <Text style={estilosComuns.label}>{t('Telefone / WhatsApp')}</Text>
                  <TextInput
                    style={estilosComuns.input}
                    value={telefone}
                    onChangeText={setTelefone}
                    placeholder="(62) 99999-0000"
                    keyboardType="phone-pad"
                  />

                  <Text style={estilosComuns.label}>{t('Tipo de necessidade')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
                    {necessidadesCliente.map((op) => (
                      <TouchableOpacity
                        key={op.valor}
                        style={[
                          styles.chipSetor,
                          necessidade === op.valor && styles.chipSetorAtivo,
                        ]}
                        onPress={() => setNecessidade(op.valor)}
                      >
                        <Text
                          style={[
                            styles.chipSetorTexto,
                            necessidade === op.valor && styles.chipSetorTextoAtivo,
                          ]}
                        >
                          {t(op.rotulo)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <Text style={estilosComuns.label}>{t('Material da peça')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
                    {MATERIAIS_PECA.map((mat) => (
                      <TouchableOpacity
                        key={mat}
                        style={[styles.chipSetor, material === mat && styles.chipSetorAtivo]}
                        onPress={() => setMaterial(mat)}
                      >
                        <Text
                          style={[
                            styles.chipSetorTexto,
                            material === mat && styles.chipSetorTextoAtivo,
                          ]}
                        >
                          {t(mat)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={estilosComuns.label}>{t('Quantidade')}</Text>
                      <TextInput
                        style={estilosComuns.input}
                        value={quantidade}
                        onChangeText={setQuantidade}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={estilosComuns.label}>{t('Prazo pagto (dias)')}</Text>
                      <TextInput
                        style={estilosComuns.input}
                        value={prazoPagamento}
                        onChangeText={setPrazoPagamento}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <Text style={estilosComuns.label}>{t('Descreva o desafio')}</Text>
                  <TextInput
                    style={[estilosComuns.input, { minHeight: 90, textAlignVertical: 'top' }]}
                    value={descricao}
                    onChangeText={setDescricao}
                    multiline
                    placeholder={t(
                      'Informe tolerâncias críticas, objetivo da medição ou problema observado na peça...',
                    )}
                  />

                  <TouchableOpacity
                    style={estilosComuns.botaoPrimario}
                    onPress={() => void enviarSolicitacaoPublica()}
                    disabled={enviandoForm}
                  >
                    <Text style={estilosComuns.botaoPrimarioTexto}>
                      {enviandoForm ? t('Registrando…') : t('Enviar solicitação')}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </ScrollView>
        )}

        {aba === 'chatbot' && (
          <View style={styles.chatWrapper}>
            <View style={styles.chatHeaderPublico}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.chatHeaderTitulo}>{t('Assistente Virtual SENAI / ZEISS')}</Text>
                {mensagensChat.length > 0 && (
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#12405e',
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 6,
                    }}
                    onPress={() => setMensagensChat([])}
                  >
                    <Text style={{ color: '#93c5fd', fontSize: 11, fontWeight: '700' }}>
                      {t('Limpar')} ({Math.ceil(mensagensChat.length / 2)})
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.chatHeaderSub}>
                {t(
                  'Toque em um botão abaixo ou digite sua pergunta sobre o laboratório, eventos, máquinas ZEISS e serviços:',
                )}
              </Text>
            </View>

            <ScrollView contentContainerStyle={styles.chatLista}>
              {/* Mensagem de boas-vindas no início da conversa */}
              <View style={[styles.bolhaChat, styles.bolhaBot]}>
                <Text style={styles.textoBolhaBot}>
                  {t(
                    'Olá! Sou o assistente público do Centro de Excelência em Metrologia SENAI / ZEISS. Você pode tocar em um atalho acima ou digitar qualquer pergunta livre abaixo (ex.: "Como você funciona?", "Onde fica o laboratório?", "Quanto custa?", "Minha peça trincou, qual máquina usar?").',
                  )}
                </Text>
              </View>

              {/* Atalhos rápidos compactos */}
              <View style={styles.sugestoesWrap}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: CORES.textoSecundario }}>
                  {t('Atalhos rápidos (ou digite sua pergunta livre abaixo):')}
                </Text>
                {obterSugestoesChatbotPublico(idioma).map((sug) => (
                  <TouchableOpacity
                    key={sug}
                    style={styles.chipSugestao}
                    onPress={() => void enviarPerguntaChatbot(sug)}
                  >
                    <Text style={styles.chipSugestaoTexto}>✨ {sug}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Conversa em ordem cronológica natural (Pergunta do usuário -> Resposta do bot logo abaixo) */}
              {mensagensChat.map((msg, idx) => {
                const ehUltimaResposta =
                  idx === mensagensChat.length - 1 && msg.autor === 'assistente';
                return (
                  <View
                    key={msg.id}
                    style={[
                      styles.bolhaChat,
                      msg.autor === 'usuario' ? styles.bolhaUsuario : styles.bolhaBot,
                      ehUltimaResposta ? { borderColor: CORES.ciano, borderWidth: 2 } : null,
                    ]}
                  >
                    <Text
                      style={
                        msg.autor === 'usuario' ? styles.textoBolhaUsuario : styles.textoBolhaBot
                      }
                    >
                      {msg.texto}
                    </Text>
                    {msg.fontes && msg.fontes.length > 0 && (
                      <Text style={styles.fontesBolha}>
                        {t('Fonte:')} {msg.fontes.join(' · ')}
                      </Text>
                    )}
                  </View>
                );
              })}

              {carregandoChat && (
                <View style={[styles.bolhaChat, styles.bolhaBot]}>
                  <Text style={styles.textoBolhaBot}>
                    {t('⏳ Consultando informações do Centro...')}
                  </Text>
                </View>
              )}

              <View nativeID="fim-chat-mobile" style={{ height: 4 }} />
            </ScrollView>

            <View style={styles.chatInputBar}>
              <TextInput
                style={styles.chatInput}
                value={perguntaChat}
                onChangeText={setPerguntaChat}
                onSubmitEditing={() => void enviarPerguntaChatbot(perguntaChat)}
                placeholder={t(
                  'Pergunte livremente sobre o laboratório, eventos, preços ou máquinas...',
                )}
              />
              <TouchableOpacity
                style={styles.chatEnviarBtn}
                onPress={() => void enviarPerguntaChatbot(perguntaChat)}
                disabled={!perguntaChat.trim() || carregandoChat}
              >
                <Text style={styles.chatEnviarTexto}>{t('Enviar')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </BarraLateralMobile>

      {/* Modal de Ficha Técnica de Equipamento */}
      <Modal
        visible={Boolean(equipamentoDetalhe)}
        animationType="slide"
        transparent
        onRequestClose={() => setEquipamentoDetalhe(null)}
      >
        <View style={styles.modalFundo}>
          <View style={styles.modalCard}>
            {equipamentoDetalhe && (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalSobrelinha}>{t(equipamentoDetalhe.categoria)}</Text>
                    <Text style={styles.modalTitulo}>{equipamentoDetalhe.nome}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.modalFecharBtn}
                    onPress={() => setEquipamentoDetalhe(null)}
                  >
                    <Text style={{ color: '#fff', fontWeight: '800' }}>✕</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView contentContainerStyle={{ padding: 16 }}>
                  {/* Carrossel com foto em fundo branco, foto instalada no Centro e vídeo em operação (autoplay + mudo) */}
                  <CarrosselMidiaMobile midias={equipamentoDetalhe.midias} idioma={idioma} />

                  {equipamentoDetalhe.descricao.map((par, i) => (
                    <Text key={i} style={[estilosComuns.paragrafo, { marginBottom: 8, marginTop: i === 0 ? 8 : 0 }]}>
                      {t(par)}
                    </Text>
                  ))}

                  <Text style={styles.subtituloFicha}>{t('Capacidades técnicas')}</Text>
                  {equipamentoDetalhe.capacidades.map((cap) => (
                    <Text key={cap} style={styles.itemListaFicha}>
                      • {t(cap)}
                    </Text>
                  ))}

                  <Text style={styles.subtituloFicha}>{t('Aplicações frequentes')}</Text>
                  {equipamentoDetalhe.aplicacoes.map((ap) => (
                    <Text key={ap} style={styles.itemListaFicha}>
                      • {t(ap)}
                    </Text>
                  ))}

                  <Text style={styles.subtituloFicha}>{t('Referência técnica')}</Text>
                  <Text style={estilosComuns.paragrafo}>
                    {t(equipamentoDetalhe.referenciaTecnica)}
                  </Text>

                  <TouchableOpacity
                    style={[estilosComuns.botaoPrimario, { marginTop: 16 }]}
                    onPress={() => {
                      const nomeEq = equipamentoDetalhe.nome;
                      setEquipamentoDetalhe(null);
                      setDescricao(`${t('Solicitar análise com este equipamento')} (${nomeEq}): `);
                      setAba('solicitar');
                    }}
                  >
                    <Text style={estilosComuns.botaoPrimarioTexto}>
                      {t('Solicitar orçamento com este equipamento')}
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CORES.fundo },
  barraIdioma: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: CORES.branco,
    borderBottomWidth: 1,
    borderBottomColor: CORES.borda,
  },
  idiomasRow: { flexDirection: 'row', gap: 6 },
  botaoIdioma: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: CORES.borda,
    backgroundColor: CORES.fundo,
  },
  botaoIdiomaAtivo: {
    backgroundColor: CORES.azulEscuro,
    borderColor: CORES.azulEscuro,
  },
  textoIdioma: { fontSize: 11, fontWeight: '800', color: CORES.texto },
  textoIdiomaAtivo: { color: CORES.branco },
  botaoEntrarTopo: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: CORES.cianoClaro,
  },
  botaoEntrarTopoTexto: {
    fontSize: 12,
    fontWeight: '800',
    color: CORES.azulPrincipal,
  },
  abasContainer: {
    flexDirection: 'row',
    backgroundColor: CORES.branco,
    borderBottomWidth: 1,
    borderBottomColor: CORES.borda,
  },
  abaItem: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  abaItemAtiva: {
    borderBottomColor: CORES.ciano,
    backgroundColor: '#f0f9fc',
  },
  abaTexto: { fontSize: 11.5, fontWeight: '700', color: CORES.textoSecundario },
  abaTextoAtivo: { color: CORES.azulEscuro, fontWeight: '800' },
  scrollContent: { padding: 14, paddingBottom: 32 },
  heroCard: {
    backgroundColor: CORES.azulEscuro,
    borderRadius: 12,
    padding: 18,
    marginBottom: 14,
  },
  heroSobrelinha: {
    color: '#6fe1f5',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  heroTitulo: {
    color: CORES.branco,
    fontSize: 23,
    fontWeight: '800',
    lineHeight: 29,
    marginBottom: 8,
  },
  heroSubtitulo: {
    color: '#cfe6f0',
    fontSize: 13.5,
    lineHeight: 20,
    marginBottom: 14,
  },
  selosRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  seloItem: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: 10,
  },
  seloNumero: { color: '#6fe1f5', fontSize: 18, fontWeight: '900' },
  seloRotulo: { color: '#dceef6', fontSize: 10.5, marginTop: 2 },
  heroBotoes: { flexDirection: 'row', gap: 10 },
  chipSetor: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: CORES.borda,
    backgroundColor: CORES.fundo,
    marginRight: 8,
  },
  chipSetorAtivo: {
    backgroundColor: CORES.azulPrincipal,
    borderColor: CORES.azulPrincipal,
  },
  chipSetorTexto: { fontSize: 12, fontWeight: '700', color: CORES.texto },
  chipSetorTextoAtivo: { color: CORES.branco },
  boxSetorDetalhe: {
    backgroundColor: CORES.fundo,
    borderRadius: 8,
    padding: 13,
    marginTop: 4,
  },
  setorTitulo: { fontSize: 16, fontWeight: '800', color: CORES.azulEscuro, marginBottom: 4 },
  setorExemplos: { fontSize: 11.5, color: CORES.textoSecundario, fontStyle: 'italic', marginTop: 4 },
  itemServicoSetor: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: CORES.branco,
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: CORES.borda,
    marginBottom: 6,
  },
  itemServicoSetorTexto: { fontSize: 12.5, fontWeight: '700', color: CORES.texto, flex: 1 },
  cardEvento: {
    backgroundColor: CORES.fundo,
    borderLeftWidth: 4,
    borderLeftColor: CORES.ciano,
    borderRadius: 6,
    padding: 12,
    marginTop: 8,
  },
  badgeEvento: {
    alignSelf: 'flex-start',
    backgroundColor: CORES.cianoClaro,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 4,
  },
  badgeEventoTexto: { fontSize: 10, fontWeight: '800', color: CORES.azulPrincipal },
  eventoTitulo: { fontSize: 15, fontWeight: '800', color: CORES.azulEscuro, marginBottom: 4 },
  cardEquipamento: {
    backgroundColor: CORES.fundo,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: CORES.borda,
    padding: 13,
    marginBottom: 10,
  },
  nomeEquipamento: { fontSize: 15.5, fontWeight: '800', color: CORES.azulEscuro, marginBottom: 4 },
  verFichaLink: { marginTop: 8, fontSize: 12, fontWeight: '800', color: CORES.azulPrincipal },
  cardServicoCatalogo: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: CORES.fundo,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: CORES.borda,
    padding: 13,
    marginTop: 10,
  },
  numeroServico: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: CORES.cianoClaro,
    color: CORES.azulPrincipal,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontWeight: '900',
    fontSize: 12,
    lineHeight: 30,
  },
  etapasBox: {
    marginTop: 8,
    backgroundColor: CORES.branco,
    padding: 9,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: CORES.borda,
  },
  etapasTitulo: { fontSize: 11, fontWeight: '800', color: CORES.azulEscuro, marginBottom: 4 },
  etapaLinha: { fontSize: 11.5, color: CORES.textoSecundario, marginBottom: 2 },
  confirmacaoBox: {
    backgroundColor: CORES.verdeClaro,
    borderWidth: 1,
    borderColor: '#98d6b6',
    borderRadius: 10,
    padding: 16,
  },
  confirmacaoTitulo: { fontSize: 17, fontWeight: '800', color: CORES.verde },
  confirmacaoProtocolo: {
    fontSize: 15,
    fontWeight: '900',
    color: CORES.azulEscuro,
    marginVertical: 6,
  },
  erroBox: {
    backgroundColor: CORES.vermelhoClaro,
    borderRadius: 8,
    padding: 11,
    marginBottom: 12,
  },
  erroTexto: { color: CORES.vermelho, fontSize: 12.5, fontWeight: '700' },
  chatWrapper: { flex: 1, backgroundColor: CORES.fundo },
  chatHeaderPublico: {
    backgroundColor: CORES.azulEscuro,
    padding: 14,
  },
  chatHeaderTitulo: { color: CORES.branco, fontSize: 15, fontWeight: '800' },
  chatHeaderSub: { color: '#c4e4f2', fontSize: 11.5, marginTop: 2 },
  chatLista: { padding: 14, gap: 10 },
  bolhaChat: {
    maxWidth: '90%',
    padding: 12,
    borderRadius: 10,
  },
  bolhaBot: {
    alignSelf: 'flex-start',
    backgroundColor: CORES.branco,
    borderWidth: 1,
    borderColor: CORES.borda,
  },
  bolhaUsuario: {
    alignSelf: 'flex-end',
    backgroundColor: CORES.azulPrincipal,
  },
  textoBolhaBot: { color: CORES.texto, fontSize: 13, lineHeight: 19 },
  textoBolhaUsuario: { color: CORES.branco, fontSize: 13, lineHeight: 19 },
  fontesBolha: {
    marginTop: 6,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: '#e4eff3',
    fontSize: 10.5,
    fontWeight: '700',
    color: CORES.textoSecundario,
  },
  sugestoesWrap: { gap: 6, marginVertical: 4 },
  chipSugestao: {
    backgroundColor: CORES.cianoClaro,
    borderWidth: 1,
    borderColor: '#add9e8',
    borderRadius: 8,
    padding: 10,
  },
  chipSugestaoTexto: { color: CORES.azulEscuro, fontSize: 12, fontWeight: '700' },
  chatInputBar: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    backgroundColor: CORES.branco,
    borderTopWidth: 1,
    borderTopColor: CORES.borda,
  },
  chatInput: {
    flex: 1,
    backgroundColor: CORES.fundo,
    borderWidth: 1,
    borderColor: '#bcd2dc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: CORES.texto,
  },
  chatEnviarBtn: {
    backgroundColor: CORES.azulPrincipal,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatEnviarTexto: { color: CORES.branco, fontWeight: '800', fontSize: 13 },
  modalFundo: {
    flex: 1,
    backgroundColor: 'rgba(3,25,38,0.72)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: CORES.branco,
    maxHeight: '88%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: CORES.azulEscuro,
    padding: 16,
  },
  modalSobrelinha: { color: '#72d8f0', fontSize: 10, fontWeight: '800' },
  modalTitulo: { color: CORES.branco, fontSize: 17, fontWeight: '800', marginTop: 2 },
  modalFecharBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtituloFicha: {
    fontSize: 14,
    fontWeight: '800',
    color: CORES.azulEscuro,
    marginTop: 14,
    marginBottom: 6,
  },
  itemListaFicha: {
    fontSize: 12.5,
    color: CORES.texto,
    marginBottom: 4,
    lineHeight: 18,
  },
});
