import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { formatarDinheiro } from '@lib/calculos';
import { MOTIVOS_RETRABALHO } from '@lib/campos-padronizados';
import {
  carregarContextoOperacionalLaboratorio,
  criarContextoDemonstrativoFallback,
  criarMensagemChatIa,
  ETAPAS_INSTRUCOES_POR_SERVICO,
  obterSugestoesChatbotInterno,
  responderChatbotInternoLaboratorio,
  type ContextoOperacionalLaboratorio,
  type MensagemChatIa,
} from '@lib/chatbot-metrologia';
import { formatarDesvio, formatarHoras } from '@lib/conhecimento-persistente';
import type { PerfilInterno } from '@lib/contratos';
import { equipamentosPublicos } from '@lib/equipamentos';
import {
  calcularProgressoExecucao,
  type EstadoEtapaExecucao,
} from '@lib/execucoes-persistentes';
import {
  calcularPreviaOrcamento,
  podeAprovarOrcamento,
} from '@lib/orcamentos-persistentes';
import { quartis } from '@lib/recomendacao';
import { sanitizarParaIa } from '@lib/seguranca-ia';
import { servicosOficiais } from '@lib/servicos';
import { BarraLateralMobile } from '../components/BarraLateralMobile';
import { obterSupabaseMobile } from '../supabase';
import { CORES, estilosComuns } from '../theme';

type AbaInterna =
  | 'visao-geral'
  | 'solicitacoes'
  | 'orcamentos'
  | 'execucao'
  | 'conhecimento'
  | 'mensagens'
  | 'chatbot-ia';

const HISTORICO_AMOSTRAS_RECOMENDACAO = [4, 5, 6, 6, 7, 8, 9, 10, 12];

export function InternalLabScreen({
  nomeUsuario,
  emailUsuario,
  perfilInicial,
  aoSair,
}: {
  nomeUsuario: string;
  emailUsuario: string;
  perfilInicial: PerfilInterno;
  aoSair: () => void;
}) {
  const [perfil] = useState<PerfilInterno>(perfilInicial);
  const [aba, setAba] = useState<AbaInterna>('chatbot-ia');
  const [contexto, setContexto] = useState<ContextoOperacionalLaboratorio>(() =>
    criarContextoDemonstrativoFallback(perfilInicial),
  );
  const [carregandoDados, setCarregandoDados] = useState(false);
  const [avisoOperacional, setAvisoOperacional] = useState('');

  // Estado da calculadora de pré-proposta (Orçamentos)
  const [servicoCalcSlug, setServicoCalcSlug] = useState<string>(servicosOficiais[0].slug);
  const [maquinaCalcSlug, setMaquinaCalcSlug] = useState<string>(equipamentosPublicos[0].slug);
  const [horasEstimadas, setHorasEstimadas] = useState('8');
  const [custoHoraBase, setCustoHoraBase] = useState('230');
  const [margemPercentual, setMargemPercentual] = useState('18');
  const [custosExtras, setCustosExtras] = useState('0');
  const [justificativaTecnica, setJustificativaTecnica] = useState(
    'Inspeção dimensional completa em sala climatizada 20 ± 0,5 °C com emissão de laudo GD&T.',
  );

  // Estado de Mensagens Internas
  const [conversaSelecionadaId, setConversaSelecionadaId] = useState<string>('');
  const [textoNovaMensagemInterna, setTextoNovaMensagemInterna] = useState('');

  // Estado do Chatbot Interno do Laboratório
  const [perguntaChat, setPerguntaChat] = useState('');
  const [carregandoChat, setCarregandoChat] = useState(false);
  const [mensagensChat, setMensagensChat] = useState<MensagemChatIa[]>(() => [
    criarMensagemChatIa(
      'assistente',
      `Olá, ${nomeUsuario}! Sou o **Chatbot Interno do Laboratório SENAI / ZEISS**.\n\nTenho acesso integral às **solicitações, detalhes pedidos pelos clientes, PDFs e anexos técnicos, pré-propostas, instruções de execução, problemas/retrabalhos registrados, mensagens de clientes e lições aprendidas**.\n\nBasta tocar no **nome de um serviço** abaixo ou perguntar diretamente sobre qualquer serviço, protocolo ou empresa!`,
      'pt-BR',
      ['Base operacional unificada do laboratório'],
    ),
  ]);

  // Estado do Assistente Interno Sanitizado original (mantido conforme solicitado)
  const [modalSanitizadoAberto, setModalSanitizadoAberto] = useState(false);
  const [perguntaSanitizada, setPerguntaSanitizada] = useState(
    'Resuma os cuidados de fixação para metalforte@empresa.com.br no telefone (62) 99999-1234.',
  );

  const recarregarContexto = useCallback(
    async (perfilAlvo: PerfilInterno) => {
      setCarregandoDados(true);
      try {
        const supabase = obterSupabaseMobile();
        const novoContexto = await carregarContextoOperacionalLaboratorio(supabase, perfilAlvo);
        setContexto(novoContexto);
        if (!conversaSelecionadaId && novoContexto.conversas[0]) {
          setConversaSelecionadaId(novoContexto.conversas[0].solicitacao_id);
        }
      } finally {
        setCarregandoDados(false);
      }
    },
    [conversaSelecionadaId],
  );

  useEffect(() => {
    void recarregarContexto(perfil);
  }, [perfil, recarregarContexto]);

  const exibeCustos = perfil !== 'tecnico';
  const podeAprovar = podeAprovarOrcamento(perfil);

  const resultadoCalculo = useMemo(() => {
    const previa = calcularPreviaOrcamento(
      {
        descricao: justificativaTecnica || 'Serviço metrológico',
        quantidade: '1',
        horas: horasEstimadas || '8',
        custosExtras: custosExtras || '0',
        percentualLucro: margemPercentual || '18',
      },
      custoHoraBase || '230',
    );
    return previa;
  }, [justificativaTecnica, horasEstimadas, custosExtras, margemPercentual, custoHoraBase]);

  const recomendacaoEstatistica = useMemo(() => {
    const resumoQuartis = quartis(HISTORICO_AMOSTRAS_RECOMENDACAO);
    const h = Number(horasEstimadas.replace(',', '.')) || 8;
    const q1 = resumoQuartis ? resumoQuartis.q1.toNumber() : 6;
    const mediana = resumoQuartis ? resumoQuartis.mediana.toNumber() : 7;
    const q3 = resumoQuartis ? resumoQuartis.q3.toNumber() : 9;
    const classificacao =
      h >= q1 && h <= q3
        ? 'Dentro da faixa histórica Q1–Q3'
        : 'Fora da faixa Q1–Q3 (exige justificativa técnica)';
    return { q1, mediana, q3, classificacao };
  }, [horasEstimadas]);

  const previaSanitizada = useMemo(
    () =>
      sanitizarParaIa({
        empresa: 'Metalforte Indústria',
        email: 'contato@metalforte.test',
        preco: '2162.00',
        observacaoTecnica: perguntaSanitizada,
      }),
    [perguntaSanitizada],
  );

  async function enviarPerguntaChatbotInterno(textoExplicito?: string) {
    const texto = (textoExplicito ?? perguntaChat).trim();
    if (!texto || carregandoChat) return;

    const msgUsuario = criarMensagemChatIa('usuario', texto);
    setMensagensChat((atual) => [...atual, msgUsuario]);
    if (!textoExplicito) setPerguntaChat('');
    setCarregandoChat(true);

    try {
      const chaveGemini = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
      const resposta = await responderChatbotInternoLaboratorio(texto, contexto, { chaveGemini });
      const msgAssistente = criarMensagemChatIa(
        'assistente',
        resposta.texto,
        'pt-BR',
        resposta.fontes,
      );
      setMensagensChat((atual) => [...atual, msgAssistente]);
    } finally {
      setCarregandoChat(false);
    }
  }

  async function alternarEtapaExecucao(execucaoId: string, ordemEtapa: number) {
    const execAlvo = contexto.execucoes.find((e) => e.execucao_id === execucaoId);
    const etapaAlvo = execAlvo?.etapas.find((et) => et.ordem === ordemEtapa);
    if (!execAlvo || !etapaAlvo) return;

    const pendenteAnterior = execAlvo.etapas.some(
      (et) => et.ordem < ordemEtapa && et.estado !== 'concluida',
    );
    if (pendenteAnterior) {
      setAvisoOperacional('Conclua as etapas anteriores antes de avançar esta fase.');
      return;
    }

    const posteriorIniciada = execAlvo.etapas.some(
      (et) => et.ordem > ordemEtapa && et.estado !== 'a_fazer',
    );
    if (etapaAlvo.estado === 'concluida' && posteriorIniciada) {
      setAvisoOperacional(
        'Não é possível reiniciar esta etapa porque a fase seguinte já foi iniciada.',
      );
      return;
    }

    const proximoEstado: EstadoEtapaExecucao =
      etapaAlvo.estado === 'a_fazer'
        ? 'em_andamento'
        : etapaAlvo.estado === 'em_andamento'
          ? 'concluida'
          : 'a_fazer';
    const proximoProgresso =
      proximoEstado === 'concluida' ? 100 : proximoEstado === 'em_andamento' ? 50 : 0;

    const supabase = obterSupabaseMobile();
    if (supabase && etapaAlvo.id) {
      try {
        const { error } = await supabase.rpc('atualizar_etapa_execucao_demonstrativa', {
          etapa: etapaAlvo.id,
          novo_estado: proximoEstado,
          novo_progresso: proximoProgresso,
        });
        if (!error) {
          await recarregarContexto(perfil);
          setAvisoOperacional('Etapa atualizada no sistema.');
          return;
        }
        setAvisoOperacional(
          error.code === '42501'
            ? 'Seu perfil não tem permissão para alterar esta etapa.'
            : /failed to fetch|network/i.test(error.message)
              ? 'Sem conexão com o Supabase (verifique se o projeto está ativo).'
              : error.message,
        );
        return;
      } catch {
        setAvisoOperacional('Sem conexão com o Supabase para salvar a etapa.');
        return;
      }
    }

    setContexto((atual) => ({
      ...atual,
      execucoes: atual.execucoes.map((exec) => {
        if (exec.execucao_id !== execucaoId) return exec;
        return {
          ...exec,
          etapas: exec.etapas.map((etapa) =>
            etapa.ordem === ordemEtapa
              ? { ...etapa, estado: proximoEstado, progresso: proximoProgresso }
              : etapa,
          ),
        };
      }),
    }));
    setAvisoOperacional('Etapa atualizada.');
  }

  async function registrarProblemaExecucao(execucaoId: string) {
    const execAlvo = contexto.execucoes.find((e) => e.execucao_id === execucaoId);
    const motivo =
      'Retrabalho registrado no aplicativo móvel: necessidade de estabilização térmica complementar e nova verificação dimensional.';

    setContexto((atual) => ({
      ...atual,
      execucoes: atual.execucoes.map((exec) => {
        if (exec.execucao_id !== execucaoId) return exec;
        return {
          ...exec,
          retrabalho: true,
          causa_principal: exec.causa_principal ?? MOTIVOS_RETRABALHO[0],
          fechamento_observacoes: exec.fechamento_observacoes || motivo,
        };
      }),
    }));

    const supabase = obterSupabaseMobile();
    const etapaRetorno =
      execAlvo?.etapas.find((et) => et.estado === 'em_andamento') ?? execAlvo?.etapas[0];
    if (supabase && etapaRetorno?.id) {
      const { error } = await supabase.rpc('retornar_execucao_etapa_demonstrativa', {
        execucao: execucaoId,
        etapa_destino: etapaRetorno.id,
        motivo,
      });
      if (!error) {
        await recarregarContexto(perfil);
        setAvisoOperacional(
          'Ocorrência / retrabalho registrado no Supabase e sincronizado com o Chatbot Interno.',
        );
        return;
      }
    }
    setAvisoOperacional(
      'Ocorrência / retrabalho registrado na execução e sincronizado com o Chatbot Interno.',
    );
  }

  async function enviarMensagemInternaParaCliente() {
    const texto = textoNovaMensagemInterna.trim();
    if (!texto) return;
    const idAlvo = conversaSelecionadaId || contexto.conversas[0]?.solicitacao_id;
    if (!idAlvo) return;

    const supabase = obterSupabaseMobile();
    if (supabase) {
      try {
        const { error } = await supabase.rpc('enviar_mensagem_interna_demonstrativa', {
          solicitacao: idAlvo,
          conteudo: texto,
        });
        if (!error) {
          setTextoNovaMensagemInterna('');
          await recarregarContexto(perfil);
          setAvisoOperacional('Mensagem enviada ao cliente.');
          return;
        }
        setAvisoOperacional(
          /failed to fetch|network/i.test(error.message)
            ? 'Sem conexão com o Supabase (verifique se o projeto está ativo no painel).'
            : `Não foi possível enviar: ${error.message}`,
        );
        return;
      } catch {
        setAvisoOperacional('Sem conexão com o Supabase para enviar a mensagem.');
        return;
      }
    }

    setContexto((atual) => ({
      ...atual,
      conversas: atual.conversas.map((conv) => {
        if (conv.solicitacao_id !== idAlvo) return conv;
        return {
          ...conv,
          mensagens: [
            ...conv.mensagens,
            {
              id: `msg-mobile-${conv.mensagens.length + 1}`,
              autor_tipo: 'equipe' as const,
              autor_nome: `${nomeUsuario} (${perfil})`,
              conteudo: texto,
              criada_em: new Date().toISOString(),
              anexos: [],
            },
          ],
        };
      }),
    }));
    setTextoNovaMensagemInterna('');
    setAvisoOperacional('Mensagem técnica registrada na conversa do protocolo (modo local).');
  }

  async function aprovarOuPublicarOrcamento(orc: ContextoOperacionalLaboratorio['orcamentos'][number]) {
    const supabase = obterSupabaseMobile();
    if (!supabase) {
      setAvisoOperacional(
        `Versão V${orc.numero} do protocolo #${orc.solicitacao_codigo} marcada como aprovada (modo local).`,
      );
      return;
    }
    const rpcNome =
      orc.estado === 'aprovado' ? 'publicar_orcamento_demonstrativo' : 'aprovar_orcamento_demonstrativo';
    try {
      const { error } = await supabase.rpc(rpcNome, { versao: orc.versao_id });
      if (error) {
        setAvisoOperacional(
          error.code === '42501'
            ? 'Seu perfil não tem autorização para aprovar/publicar esta versão.'
            : /failed to fetch|network/i.test(error.message)
              ? 'Sem conexão com o Supabase (verifique se o projeto está ativo no painel).'
              : `Não foi possível concluir: ${error.message}`,
        );
        return;
      }
      await recarregarContexto(perfil);
      setAvisoOperacional(
        `Versão V${orc.numero} do protocolo #${orc.solicitacao_codigo} atualizada!`,
      );
    } catch {
      setAvisoOperacional('Sem conexão com o Supabase para aprovar o orçamento.');
    }
  }

  async function abrirAnexoStorage(bucket: 'solicitacoes' | 'mensagens', caminho: string, nome: string) {
    if (!caminho) {
      setAvisoOperacional(`Arquivo "${nome}" sem caminho de armazenamento vinculado.`);
      return;
    }
    const supabase = obterSupabaseMobile();
    if (!supabase) {
      setAvisoOperacional(`Conecte-se ao Supabase para baixar "${nome}".`);
      return;
    }
    try {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(caminho, 300);
      if (error || !data?.signedUrl) {
        const msg = error?.message ?? 'arquivo indisponível';
        setAvisoOperacional(
          /failed to fetch|network/i.test(msg)
            ? `Sem conexão com o Supabase para abrir "${nome}".`
            : `Não foi possível abrir "${nome}": ${msg}.`,
        );
        return;
      }
      await Linking.openURL(data.signedUrl);
    } catch {
      setAvisoOperacional(`Sem conexão com o Supabase para abrir "${nome}".`);
    }
  }

  const conversaAtiva =
    contexto.conversas.find((c) => c.solicitacao_id === conversaSelecionadaId) ??
    contexto.conversas[0];

  return (
    <View style={estilosComuns.container}>
      {/* Barra de Identificação do Membro do Laboratório */}
      <View style={styles.topoInterno}>
        <View style={{ flex: 1 }}>
          <Text style={styles.topoSubtitulo}>
            PORTAL INTERNO • {perfil.toUpperCase()}
          </Text>
          <Text style={styles.topoNome}>
            {nomeUsuario}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.botaoSanitizado}
          onPress={() => setModalSanitizadoAberto(true)}
        >
          <Text style={styles.botaoSanitizadoTexto}>Assistente</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.botaoSair} onPress={aoSair}>
          <Text style={styles.botaoSairTexto}>Sair</Text>
        </TouchableOpacity>
      </View>

      {avisoOperacional ? (
        <View style={styles.bannerAviso}>
          <Text style={styles.bannerAvisoTexto}>{avisoOperacional}</Text>
        </View>
      ) : null}

      {/* Corpo com Gaveta Lateral Deslizante + Barra Inferior Nativa */}
      <BarraLateralMobile
        tituloMenu="Portal Interno"
        ativoId={aba}
        aoSelecionar={(novaAba) => {
          setAvisoOperacional('');
          setAba(novaAba);
        }}
        itens={[
          {
            id: 'chatbot-ia',
            icone: '🤖',
            rotuloCurto: 'Chatbot',
            rotuloCompleto: 'Chatbot IA do Lab',
          },
          {
            id: 'visao-geral',
            icone: '📊',
            rotuloCurto: 'Visão',
            rotuloCompleto: 'Visão Geral & KPIs',
          },
          {
            id: 'solicitacoes',
            icone: '📄',
            rotuloCurto: 'PDFs',
            rotuloCompleto: 'Solicitações & PDFs',
            badge: contexto.solicitacoes.length,
          },
          {
            id: 'orcamentos',
            icone: '💰',
            rotuloCurto: 'Orçam.',
            rotuloCompleto: 'Orçamentos & Q1-Q3',
            badge: contexto.orcamentos.length,
          },
          {
            id: 'execucao',
            icone: '⚙️',
            rotuloCurto: 'Execução',
            rotuloCompleto: 'Execução & Problemas',
            badge: contexto.execucoes.length,
          },
          {
            id: 'conhecimento',
            icone: '💡',
            rotuloCurto: 'Lições',
            rotuloCompleto: 'Conhecimento & Lições',
          },
          {
            id: 'mensagens',
            icone: '💬',
            rotuloCurto: 'Mensag.',
            rotuloCompleto: 'Mensagens Clientes',
            badge: contexto.conversas.length,
          },
        ]}
      >
        <ScrollView style={{ flex: 1 }} contentContainerStyle={estilosComuns.conteudoScroll}>
        {/* ABA 1: CHATBOT INTERNO DO LABORATÓRIO */}
        {aba === 'chatbot-ia' && (
          <View style={estilosComuns.card}>
            <View style={estilosComuns.linhaEntre}>
              <View style={{ flex: 1 }}>
                <Text style={estilosComuns.badge}>IA OPERACIONAL INTERNA • DOSSIÊ POR SERVIÇO</Text>
                <Text style={estilosComuns.tituloSecao}>Chatbot Interno do Laboratório</Text>
              </View>
              <TouchableOpacity
                style={estilosComuns.botaoSecundario}
                onPress={() => void recarregarContexto(perfil)}
              >
                <Text style={estilosComuns.textoBotaoSecundario}>
                  {carregandoDados ? 'Sincronizando...' : 'Atualizar'}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={estilosComuns.subtituloSecao}>
              Toque em qualquer serviço abaixo ou digite uma pergunta livre para abrir na hora os pedidos, PDFs/anexos, instruções, problemas/retrabalhos e mensagens.
              {!exibeCustos ? ' (Valores financeiros ocultos para perfil Técnico).' : ''}
            </Text>

            <Text style={styles.rotuloSecaoChips}>
              1. Toque no nome do serviço para abrir o dossiê completo:
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {servicosOficiais.map((srv) => (
                <TouchableOpacity
                  key={srv.slug}
                  style={styles.chipServicoChat}
                  onPress={() => void enviarPerguntaChatbotInterno(srv.titulo)}
                >
                  <Text style={styles.chipServicoChatTexto}>🔎 {srv.titulo}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.rotuloSecaoChips}>2. Consultas transversais rápidas:</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {obterSugestoesChatbotInterno().map((sug) => (
                <TouchableOpacity
                  key={sug}
                  style={[estilosComuns.chip, { marginRight: 0, marginBottom: 2 }]}
                  onPress={() => void enviarPerguntaChatbotInterno(sug)}
                >
                  <Text style={estilosComuns.chipTexto}>⚡ {sug}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Histórico de mensagens do Chatbot Interno em ordem cronológica */}
            <View style={styles.areaMensagensChat}>
              {mensagensChat.map((msg, idx) => {
                const ehUltimaResposta =
                  idx === mensagensChat.length - 1 && msg.autor === 'assistente';
                return (
                  <View
                    key={msg.id}
                    style={[
                      styles.bolhaChat,
                      msg.autor === 'usuario' ? styles.bolhaUsuario : styles.bolhaAssistente,
                      ehUltimaResposta ? { borderColor: CORES.ciano, borderWidth: 2 } : null,
                    ]}
                  >
                    <View style={estilosComuns.linhaEntre}>
                      <Text
                        style={[
                          styles.autorBolha,
                          msg.autor === 'usuario' && { color: CORES.branco },
                        ]}
                      >
                        {msg.autor === 'usuario'
                          ? `Pergunta de ${nomeUsuario} (${perfil})`
                          : ehUltimaResposta
                            ? '✓ DOSSIÊ / RESPOSTA ATUAL DO LABORATÓRIO'
                            : 'Assistente Operacional do Laboratório'}
                      </Text>
                      <Text
                        style={[
                          styles.horaBolha,
                          msg.autor === 'usuario' && { color: '#DBEAFE' },
                        ]}
                      >
                        {msg.criadaEm}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.textoBolha,
                        msg.autor === 'usuario' && { color: CORES.branco },
                      ]}
                    >
                      {msg.texto}
                    </Text>
                    {msg.fontes && msg.fontes.length > 0 ? (
                      <View style={styles.fontesContainer}>
                        {msg.fontes.map((f) => (
                          <Text key={f} style={styles.fonteTag}>
                            Fonte: {f}
                          </Text>
                        ))}
                      </View>
                    ) : null}
                  </View>
                );
              })}

              {carregandoChat ? (
                <Text style={styles.digitandoTexto}>
                  ⏳ Consultando solicitações, anexos PDF, execuções, retrabalhos e mensagens...
                </Text>
              ) : null}

              <View nativeID="fim-chat-mobile" style={{ height: 4 }} />
            </View>

            {/* Campo de pergunta livre logo abaixo das mensagens */}
            <View style={[styles.caixaEntradaChat, { marginTop: 8 }]}>
              <TextInput
                style={[estilosComuns.input, { flex: 1, marginTop: 0, marginBottom: 0 }]}
                value={perguntaChat}
                onChangeText={setPerguntaChat}
                onSubmitEditing={() => void enviarPerguntaChatbotInterno()}
                placeholder="Pergunte sobre um serviço, protocolo, empresa ou dúvida..."
                placeholderTextColor={CORES.textoSuave}
              />
              <TouchableOpacity
                style={estilosComuns.botaoPrimario}
                onPress={() => void enviarPerguntaChatbotInterno()}
              >
                <Text style={estilosComuns.textoBotaoPrimario}>Perguntar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ABA 2: VISÃO GERAL */}
        {aba === 'visao-geral' && (
          <View>
            <View style={estilosComuns.card}>
              <Text style={estilosComuns.badge}>INDICADORES OPERACIONAIS EM TEMPO REAL</Text>
              <Text style={estilosComuns.tituloSecao}>Resumo do Laboratório</Text>
              <Text style={estilosComuns.subtituloSecao}>
                Visão consolidada de solicitações, pré-propostas, execuções na bancada e lições aprendidas.
              </Text>

              <View style={styles.gradeKpis}>
                <View style={styles.cardKpi}>
                  <Text style={styles.kpiValor}>{contexto.solicitacoes.length}</Text>
                  <Text style={styles.kpiRotulo}>Solicitações ativas</Text>
                </View>
                <View style={styles.cardKpi}>
                  <Text style={styles.kpiValor}>{contexto.orcamentos.length}</Text>
                  <Text style={styles.kpiRotulo}>Pré-propostas</Text>
                </View>
                <View style={styles.cardKpi}>
                  <Text style={styles.kpiValor}>{contexto.execucoes.length}</Text>
                  <Text style={styles.kpiRotulo}>Execuções técnicas</Text>
                </View>
                <View style={styles.cardKpi}>
                  <Text style={styles.kpiValor}>
                    {contexto.execucoes.filter((e) => Boolean(e.retrabalho)).length}
                  </Text>
                  <Text style={styles.kpiRotulo}>Com retrabalho / alerta</Text>
                </View>
              </View>
            </View>

            <View style={estilosComuns.card}>
              <Text style={estilosComuns.tituloSecao}>Acesso Rápido por Serviço no Chatbot</Text>
              <Text style={estilosComuns.subtituloSecao}>
                Toque em qualquer serviço para abrir o Chatbot Interno já com o dossiê completo daquele serviço:
              </Text>
              {servicosOficiais.map((srv) => (
                <TouchableOpacity
                  key={srv.slug}
                  style={styles.itemListaServico}
                  onPress={() => {
                    setAba('chatbot-ia');
                    void enviarPerguntaChatbotInterno(srv.titulo);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemListaTitulo}>{srv.titulo}</Text>
                    <Text style={styles.itemListaSub}>{srv.resumo}</Text>
                  </View>
                  <Text style={styles.itemListaAcao}>Consultar IA →</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ABA 3: SOLICITAÇÕES & ANEXOS PDF/CAD */}
        {aba === 'solicitacoes' && (
          <View>
            <View style={estilosComuns.card}>
              <Text style={estilosComuns.badge}>FILA DE ENTRADA E ARQUIVOS TÉCNICOS</Text>
              <Text style={estilosComuns.tituloSecao}>
                Solicitações de Clientes ({contexto.solicitacoes.length})
              </Text>
              <Text style={estilosComuns.subtituloSecao}>
                Veja o que cada cliente pediu, quantidades, desenhos PDF/CAD anexados e inicie a pré-proposta.
              </Text>
            </View>

            {contexto.solicitacoes.map((sol) => {
              const chaveAnexo = sol.solicitacao_id ?? sol.id;
              const anexos =
                contexto.anexosPorSolicitacao[chaveAnexo] ??
                contexto.anexosPorSolicitacao[sol.id] ??
                [];
              return (
                <View key={sol.id} style={estilosComuns.card}>
                  <View style={estilosComuns.linhaEntre}>
                    <Text style={estilosComuns.badge}>PROTOCOLO #{sol.codigo}</Text>
                    <Text style={styles.tagEstado}>{sol.estado}</Text>
                  </View>
                  <Text style={styles.cardTituloItem}>
                    {sol.empresa} — {sol.necessidade}
                  </Text>
                  <Text style={styles.cardDetalhe}>
                    Solicitante: {sol.nome} ({sol.email})
                  </Text>
                  <Text style={styles.cardDetalhe}>
                    Quantidade: {sol.quantidade} pç(s) • Condição de pagamento: {sol.prazo_pagamento_dias} dias
                  </Text>
                  <View style={styles.caixaPedidoCliente}>
                    <Text style={styles.caixaPedidoRotulo}>O que o cliente pediu:</Text>
                    <Text style={styles.caixaPedidoTexto}>{sol.descricao}</Text>
                  </View>

                  <Text style={styles.subtituloBlocoInterno}>
                    Arquivos e PDFs anexados ({anexos.length}):
                  </Text>
                  {anexos.length === 0 ? (
                    <Text style={styles.textoVazio}>Nenhum arquivo anexado até o momento.</Text>
                  ) : (
                    anexos.map((arq) => (
                      <TouchableOpacity
                        key={arq.id}
                        style={styles.itemAnexo}
                        onPress={() =>
                          void abrirAnexoStorage(
                            'solicitacoes',
                            arq.caminho_storage ?? '',
                            arq.nome_original,
                          )
                        }
                      >
                        <Text style={styles.itemAnexoNome}>📄 {arq.nome_original} (abrir)</Text>
                        <Text style={styles.itemAnexoMeta}>
                          {arq.tipo_mime} • {(arq.tamanho_bytes / 1024).toFixed(0)} KB
                        </Text>
                      </TouchableOpacity>
                    ))
                  )}

                  <View style={[estilosComuns.linha, { marginTop: 12 }]}>
                    <TouchableOpacity
                      style={estilosComuns.botaoPrimario}
                      onPress={() => setAba('orcamentos')}
                    >
                      <Text style={estilosComuns.textoBotaoPrimario}>Elaborar Pré-proposta</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={estilosComuns.botaoSecundario}
                      onPress={() => {
                        setAba('chatbot-ia');
                        void enviarPerguntaChatbotInterno(`Protocolo #${sol.codigo}`);
                      }}
                    >
                      <Text style={estilosComuns.textoBotaoSecundario}>Dossiê no Chatbot</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ABA 4: ORÇAMENTOS E PRÉ-PROPOSTAS */}
        {aba === 'orcamentos' && (
          <View>
            <View style={estilosComuns.card}>
              <Text style={estilosComuns.badge}>MOTOR DECIMAL.JS + RECOMENDAÇÃO Q1–Q3</Text>
              <Text style={estilosComuns.tituloSecao}>Calculadora de Pré-proposta</Text>
              <Text style={estilosComuns.subtituloSecao}>
                {exibeCustos
                  ? 'Cálculo auditável com custo congelado por versão e faixa estatística recomendada.'
                  : 'Perfil Técnico: você estima as horas técnicas e consulta a recomendação estatística; preços e margens ficam restritos a Validadores e Administradores.'}
              </Text>

              <Text style={estilosComuns.rotuloCampo}>Serviço catalogado</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 10 }}
              >
                {servicosOficiais.map((srv) => (
                  <TouchableOpacity
                    key={srv.slug}
                    style={[
                      estilosComuns.chip,
                      servicoCalcSlug === srv.slug && estilosComuns.chipAtivo,
                      { marginRight: 6 },
                    ]}
                    onPress={() => setServicoCalcSlug(srv.slug)}
                  >
                    <Text
                      style={[
                        estilosComuns.chipTexto,
                        servicoCalcSlug === srv.slug && estilosComuns.chipTextoAtivo,
                      ]}
                    >
                      {srv.titulo}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={estilosComuns.rotuloCampo}>Equipamento ZEISS</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 10 }}
              >
                {equipamentosPublicos.map((eq) => (
                  <TouchableOpacity
                    key={eq.slug}
                    style={[
                      estilosComuns.chip,
                      maquinaCalcSlug === eq.slug && estilosComuns.chipAtivo,
                      { marginRight: 6 },
                    ]}
                    onPress={() => setMaquinaCalcSlug(eq.slug)}
                  >
                    <Text
                      style={[
                        estilosComuns.chipTexto,
                        maquinaCalcSlug === eq.slug && estilosComuns.chipTextoAtivo,
                      ]}
                    >
                      {eq.nome}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={estilosComuns.linha}>
                <View style={{ flex: 1 }}>
                  <Text style={estilosComuns.rotuloCampo}>Horas técnicas estimadas</Text>
                  <TextInput
                    style={estilosComuns.input}
                    keyboardType="numeric"
                    value={horasEstimadas}
                    onChangeText={setHorasEstimadas}
                  />
                </View>
                {exibeCustos ? (
                  <View style={{ flex: 1 }}>
                    <Text style={estilosComuns.rotuloCampo}>Custo/hora base (R$)</Text>
                    <TextInput
                      style={estilosComuns.input}
                      keyboardType="numeric"
                      value={custoHoraBase}
                      onChangeText={setCustoHoraBase}
                    />
                  </View>
                ) : null}
              </View>

              {exibeCustos ? (
                <View style={[estilosComuns.linha, { marginTop: 10 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={estilosComuns.rotuloCampo}>Margem (%)</Text>
                    <TextInput
                      style={estilosComuns.input}
                      keyboardType="numeric"
                      value={margemPercentual}
                      onChangeText={setMargemPercentual}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={estilosComuns.rotuloCampo}>Custos extras (R$)</Text>
                    <TextInput
                      style={estilosComuns.input}
                      keyboardType="numeric"
                      value={custosExtras}
                      onChangeText={setCustosExtras}
                    />
                  </View>
                </View>
              ) : null}

              <Text style={[estilosComuns.rotuloCampo, { marginTop: 10 }]}>
                Justificativa técnica da estimativa
              </Text>
              <TextInput
                style={[estilosComuns.input, { minHeight: 64 }]}
                multiline
                value={justificativaTecnica}
                onChangeText={setJustificativaTecnica}
              />

              {/* Resultado Estatístico e Comercial */}
              <View style={styles.caixaResultadoOrcamento}>
                <Text style={styles.resultadoTitulo}>
                  Recomendação Estatística (Q1–Q3): {recomendacaoEstatistica.q1}h a{' '}
                  {recomendacaoEstatistica.q3}h (Mediana: {recomendacaoEstatistica.mediana}h)
                </Text>
                <Text style={styles.resultadoSub}>
                  Classificação da estimativa atual: {recomendacaoEstatistica.classificacao}
                </Text>
                {exibeCustos && resultadoCalculo ? (
                  <View style={{ marginTop: 8 }}>
                    <Text style={styles.resultadoFinanceiro}>
                      Custo Direto: {formatarDinheiro(resultadoCalculo.custo)} • Preço antes de ajuste:{' '}
                      {formatarDinheiro(resultadoCalculo.precoAntesAjuste)}
                    </Text>
                    <Text style={styles.resultadoPrecoFinal}>
                      Preço Final da Pré-proposta: {formatarDinheiro(resultadoCalculo.precoFinal)}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.avisoRestricaoTecnico}>
                    🔒 Valores monetários, custo/hora e margens ocultos para o perfil Técnico.
                  </Text>
                )}
              </View>
            </View>

            {/* Lista de Pré-propostas registradas */}
            <View style={estilosComuns.card}>
              <Text style={estilosComuns.tituloSecao}>
                Pré-propostas Registradas ({contexto.orcamentos.length})
              </Text>
              {contexto.orcamentos.map((orc) => (
                <View key={orc.versao_id} style={styles.itemOrcamento}>
                  <View style={estilosComuns.linhaEntre}>
                    <Text style={estilosComuns.badge}>
                      PROTOCOLO #{orc.solicitacao_codigo} • V{orc.numero}
                    </Text>
                    <Text style={styles.tagEstado}>{orc.estado}</Text>
                  </View>
                  <Text style={styles.cardTituloItem}>
                    {orc.empresa_nome} — {orc.descricao}
                  </Text>
                  <Text style={styles.cardDetalhe}>
                    Equipamento: {orc.equipamento_nome} • Horas: {orc.horas}h • Entrega estimada:{' '}
                    {orc.entrega_estimada ?? 'A definir'}
                  </Text>
                  {exibeCustos && orc.preco_final != null ? (
                    <Text style={styles.precoDestaqueItem}>
                      Valor comercial: {formatarDinheiro(Number(orc.preco_final))} (Custo congelado:{' '}
                      {formatarDinheiro(Number(orc.custo_congelado ?? 0))})
                    </Text>
                  ) : (
                    <Text style={styles.avisoRestricaoTecnico}>
                      Valor comercial restrito a Validador / Administrador
                    </Text>
                  )}
                  {orc.justificativa_estimativa ? (
                    <Text style={styles.cardDetalhe}>
                      Justificativa: {orc.justificativa_estimativa}
                    </Text>
                  ) : null}
                  {orc.recusa_motivo ? (
                    <Text style={styles.alertaProblemaTexto}>
                      ⚠️ Motivo de recusa do cliente: {orc.recusa_motivo}
                    </Text>
                  ) : null}
                  {podeAprovar ? (
                    <View style={[estilosComuns.linha, { marginTop: 8 }]}>
                      <TouchableOpacity
                        style={estilosComuns.botaoPrimario}
                        onPress={() => void aprovarOuPublicarOrcamento(orc)}
                      >
                        <Text style={estilosComuns.textoBotaoPrimario}>
                          {orc.estado === 'aprovado' ? 'Publicar para Cliente' : 'Aprovar Pré-proposta'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ABA 5: EXECUÇÃO TÉCNICA, INSTRUÇÕES E PROBLEMAS */}
        {aba === 'execucao' && (
          <View>
            <View style={estilosComuns.card}>
              <Text style={estilosComuns.badge}>EXECUÇÕES TÉCNICAS</Text>
              <Text style={estilosComuns.tituloSecao}>
                Execuções e Ocorrências ({contexto.execucoes.length})
              </Text>
            </View>

            {contexto.execucoes.map((exec) => {
              const percentual = calcularProgressoExecucao(exec.etapas);
              const instrucoes = ETAPAS_INSTRUCOES_POR_SERVICO[exec.servico_slug] ?? [];
              const nomesMaquinas =
                exec.equipamentos.map((e) => e.nome).join(', ') || 'Equipamento ZEISS';
              return (
                <View key={exec.execucao_id} style={estilosComuns.card}>
                  <View style={estilosComuns.linhaEntre}>
                    <Text style={estilosComuns.badge}>PROTOCOLO #{exec.solicitacao_codigo}</Text>
                    <Text style={styles.tagEstado}>
                      {exec.estado} • {percentual}%
                    </Text>
                  </View>
                  <Text style={styles.cardTituloItem}>
                    {exec.empresa_nome} — {exec.descricao}
                  </Text>
                  <Text style={styles.cardDetalhe}>
                    Equipamento(s): {nomesMaquinas} • Responsável: {exec.responsavel_nome}
                  </Text>

                  {instrucoes.length > 0 ? (
                    <View style={styles.caixaInstrucoes}>
                      <Text style={styles.caixaPedidoRotulo}>
                        Instruções operacionais padrão deste serviço:
                      </Text>
                      {instrucoes.map((inst, idx) => (
                        <Text key={inst} style={styles.instrucaoItem}>
                          {idx + 1}. {inst}
                        </Text>
                      ))}
                    </View>
                  ) : null}

                  <Text style={styles.subtituloBlocoInterno}>
                    Etapas da execução (toque para alternar estado):
                  </Text>
                  {exec.etapas.map((etapa) => (
                    <TouchableOpacity
                      key={etapa.ordem}
                      style={styles.etapaLinha}
                      onPress={() => alternarEtapaExecucao(exec.execucao_id, etapa.ordem)}
                    >
                      <Text style={styles.etapaIcone}>
                        {etapa.estado === 'concluida'
                          ? '✅'
                          : etapa.estado === 'em_andamento'
                            ? '🔄'
                            : '⏳'}
                      </Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.etapaNome}>
                          {etapa.ordem}. {etapa.titulo} ({etapa.estado})
                        </Text>
                        <Text style={styles.etapaHoras}>
                          Progresso: {etapa.progresso}% {etapa.descricao ? `• ${etapa.descricao}` : ''}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}

                  {/* Problemas, retrabalho e observações */}
                  <View style={styles.caixaProblemas}>
                    <Text style={styles.caixaPedidoRotulo}>
                      Registro de Problemas, Retrabalho e Encerramento:
                    </Text>
                    <Text style={styles.cardDetalhe}>
                      Retrabalho: {exec.retrabalho ? 'SIM' : 'NÃO'} • Mudança de escopo:{' '}
                      {exec.mudanca_escopo ? 'SIM' : 'NÃO'}
                    </Text>
                    {exec.causa_principal ? (
                      <Text style={styles.alertaProblemaTexto}>
                        Causa raiz: {exec.causa_principal}
                      </Text>
                    ) : null}
                    {exec.fechamento_observacoes ? (
                      <Text style={styles.cardDetalhe}>
                        Observações técnicas: {exec.fechamento_observacoes}
                      </Text>
                    ) : null}
                    {exec.fechamento_aprendizado ? (
                      <Text style={styles.licaoTexto}>
                        💡 Lição aprendida: {exec.fechamento_aprendizado}
                      </Text>
                    ) : null}
                  </View>

                  <View style={[estilosComuns.linha, { marginTop: 10 }]}>
                    <TouchableOpacity
                      style={estilosComuns.botaoSecundario}
                      onPress={() => registrarProblemaExecucao(exec.execucao_id)}
                    >
                      <Text style={estilosComuns.textoBotaoSecundario}>
                        Registrar Ocorrência / Retrabalho
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ABA 6: CONHECIMENTO E LIÇÕES APRENDIDAS */}
        {aba === 'conhecimento' && (
          <View>
            <View style={estilosComuns.card}>
              <Text style={estilosComuns.badge}>MEMÓRIA TÉCNICA</Text>
              <Text style={estilosComuns.tituloSecao}>
                Planejado vs Realizado ({contexto.indicadores.length})
              </Text>
            </View>

            {contexto.indicadores.map((ind) => (
              <View key={ind.execucao_id} style={estilosComuns.card}>
                <View style={estilosComuns.linhaEntre}>
                  <Text style={estilosComuns.badge}>PROTOCOLO #{ind.solicitacao_codigo}</Text>
                  <Text style={styles.tagEstado}>
                    {ind.esforco_assertivo ? 'Assertivo' : 'Com desvio'}
                  </Text>
                </View>
                <Text style={styles.cardTituloItem}>
                  {ind.empresa_nome} — {ind.servico_slug}
                </Text>
                <Text style={styles.cardDetalhe}>
                  Esforço: {formatarHoras(ind.horas_estimadas)} planejadas vs{' '}
                  {formatarHoras(ind.horas_realizadas)} reais (Desvio:{' '}
                  {formatarDesvio(ind.desvio_esforco)})
                </Text>
                {exibeCustos && ind.custo_estimado != null && ind.custo_realizado != null ? (
                  <Text style={styles.precoDestaqueItem}>
                    Custo estimado: {formatarDinheiro(ind.custo_estimado)} vs Custo realizado:{' '}
                    {formatarDinheiro(ind.custo_realizado)}
                  </Text>
                ) : null}
                {ind.licao_resumo ? (
                  <View style={styles.caixaInstrucoes}>
                    <Text style={styles.licaoTexto}>💡 Lição: {ind.licao_resumo}</Text>
                    {ind.licao_assuntos.length > 0 ? (
                      <Text style={styles.cardDetalhe}>
                        Assuntos: {ind.licao_assuntos.join(', ')}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        )}

        {/* ABA 7: MENSAGENS COM CLIENTES */}
        {aba === 'mensagens' && (
          <View style={estilosComuns.card}>
            <Text style={estilosComuns.badge}>HISTÓRICO AUDITÁVEL POR PROTOCOLO</Text>
            <Text style={estilosComuns.tituloSecao}>Mensagens com Clientes</Text>
            <Text style={estilosComuns.subtituloSecao}>
              Selecione o protocolo para ler as mensagens enviadas pelo cliente e responder pela bancada.
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 12 }}
            >
              {contexto.conversas.map((conv) => {
                const ativo = conversaAtiva?.solicitacao_id === conv.solicitacao_id;
                return (
                  <TouchableOpacity
                    key={conv.solicitacao_id}
                    style={[
                      estilosComuns.chip,
                      ativo && estilosComuns.chipAtivo,
                      { marginRight: 8 },
                    ]}
                    onPress={() => setConversaSelecionadaId(conv.solicitacao_id)}
                  >
                    <Text
                      style={[
                        estilosComuns.chipTexto,
                        ativo && estilosComuns.chipTextoAtivo,
                      ]}
                    >
                      #{conv.codigo} • {conv.empresa}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {conversaAtiva ? (
              <View>
                <Text style={styles.cardTituloItem}>
                  Protocolo #{conversaAtiva.codigo} — {conversaAtiva.empresa}
                </Text>
                <View style={styles.areaMensagensChat}>
                  {conversaAtiva.mensagens.map((m) => (
                    <View
                      key={m.id}
                      style={[
                        styles.bolhaChat,
                        m.autor_tipo === 'equipe' ? styles.bolhaUsuario : styles.bolhaAssistente,
                      ]}
                    >
                      <Text
                        style={[
                          styles.autorBolha,
                          m.autor_tipo === 'equipe' && { color: CORES.branco },
                        ]}
                      >
                        {m.autor_nome} ({m.autor_tipo})
                      </Text>
                      <Text
                        style={[
                          styles.textoBolha,
                          m.autor_tipo === 'equipe' && { color: CORES.branco },
                        ]}
                      >
                        {m.conteudo}
                      </Text>
                      {m.anexos && m.anexos.length > 0 ? (
                        <View style={styles.fontesContainer}>
                          {m.anexos.map((an) => (
                            <TouchableOpacity
                              key={an.id}
                              onPress={() =>
                                void abrirAnexoStorage(
                                  'mensagens',
                                  an.caminho_storage ?? '',
                                  an.nome_original,
                                )
                              }
                            >
                              <Text style={styles.fonteTag}>📎 {an.nome_original}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  ))}
                </View>

                <View style={styles.caixaEntradaChat}>
                  <TextInput
                    style={[estilosComuns.input, { flex: 1 }]}
                    value={textoNovaMensagemInterna}
                    onChangeText={setTextoNovaMensagemInterna}
                    placeholder="Responder ao cliente neste protocolo..."
                    placeholderTextColor={CORES.textoSuave}
                  />
                  <TouchableOpacity
                    style={estilosComuns.botaoPrimario}
                    onPress={enviarMensagemInternaParaCliente}
                  >
                    <Text style={estilosComuns.textoBotaoPrimario}>Enviar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
          </View>
        )}
        </ScrollView>
      </BarraLateralMobile>

      {/* MODAL DO ASSISTENTE INTERNO SANITIZADO ORIGINAL (MANTIDO INTACTO) */}
      <Modal visible={modalSanitizadoAberto} animationType="slide" transparent>
        <View style={styles.modalFundo}>
          <View style={styles.modalCard}>
            <View style={estilosComuns.linhaEntre}>
              <Text style={estilosComuns.badge}>PRÉVIA SANITIZADA • LGPD</Text>
              <TouchableOpacity onPress={() => setModalSanitizadoAberto(false)}>
                <Text style={{ fontWeight: '700', color: CORES.azulSenai }}>Fechar</Text>
              </TouchableOpacity>
            </View>
            <Text style={estilosComuns.tituloSecao}>Assistente Interno (Prévia Sanitizada)</Text>
            <Text style={estilosComuns.subtituloSecao}>
              Mascara automaticamente e-mails, empresas, telefones e valores monetários antes de envio externo, e nunca altera o cálculo determinístico.
            </Text>

            <Text style={estilosComuns.rotuloCampo}>Texto de entrada</Text>
            <TextInput
              style={[estilosComuns.input, { minHeight: 70 }]}
              multiline
              value={perguntaSanitizada}
              onChangeText={setPerguntaSanitizada}
            />

            <View style={styles.caixaResultadoOrcamento}>
              <Text style={styles.resultadoTitulo}>Payload Sanitizado:</Text>
              <Text style={styles.cardDetalhe}>
                {JSON.stringify(previaSanitizada.conteudo)}
              </Text>
              <Text style={[styles.resultadoSub, { marginTop: 6 }]}>
                Campos removidos ({previaSanitizada.removidos.length}):{' '}
                {previaSanitizada.removidos.join(', ')} • Eu apenas explico e organizo o rascunho; não altero o cálculo determinístico da proposta.
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  topoInterno: {
    backgroundColor: CORES.azulEscuro,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topoSubtitulo: {
    color: '#93C5FD',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  topoNome: {
    color: CORES.branco,
    fontSize: 14,
    fontWeight: '700',
  },
  botaoSanitizado: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  botaoSanitizadoTexto: {
    color: '#DBEAFE',
    fontSize: 11,
    fontWeight: '700',
  },
  botaoSair: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  botaoSairTexto: {
    color: CORES.branco,
    fontSize: 12,
    fontWeight: '700',
  },
  barraPerfil: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: CORES.borda,
  },
  barraPerfilRotulo: {
    fontSize: 12,
    fontWeight: '700',
    color: CORES.textoPrincipal,
  },
  chipPerfil: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: CORES.borda,
    backgroundColor: CORES.branco,
  },
  chipPerfilAtivo: {
    backgroundColor: CORES.azulSenai,
    borderColor: CORES.azulSenai,
  },
  chipPerfilTexto: {
    fontSize: 11,
    fontWeight: '700',
    color: CORES.textoSecundario,
  },
  chipPerfilTextoAtivo: {
    color: CORES.branco,
  },
  barraAbas: {
    backgroundColor: CORES.branco,
    borderBottomWidth: 1,
    borderBottomColor: CORES.borda,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  abaItem: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    marginRight: 6,
    backgroundColor: CORES.fundoClaro,
  },
  abaItemAtiva: {
    backgroundColor: CORES.azulSenai,
  },
  abaTexto: {
    fontSize: 13,
    fontWeight: '700',
    color: CORES.textoSecundario,
  },
  abaTextoAtivo: {
    color: CORES.branco,
  },
  bannerAviso: {
    backgroundColor: CORES.verdeSucessoFundo,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#A7F3D0',
  },
  bannerAvisoTexto: {
    color: CORES.verdeSucesso,
    fontSize: 12,
    fontWeight: '700',
  },
  rotuloSecaoChips: {
    fontSize: 12,
    fontWeight: '700',
    color: CORES.textoPrincipal,
    marginBottom: 6,
  },
  chipServicoChat: {
    backgroundColor: CORES.azulClaroFundo,
    borderColor: '#93C5FD',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 8,
  },
  chipServicoChatTexto: {
    color: CORES.azulSenai,
    fontSize: 12,
    fontWeight: '700',
  },
  areaMensagensChat: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: CORES.borda,
    marginVertical: 10,
    gap: 10,
  },
  bolhaChat: {
    padding: 12,
    borderRadius: 12,
  },
  bolhaUsuario: {
    backgroundColor: CORES.azulSenai,
    alignSelf: 'flex-end',
    width: '90%',
  },
  bolhaAssistente: {
    backgroundColor: CORES.branco,
    borderWidth: 1,
    borderColor: CORES.borda,
    alignSelf: 'flex-start',
    width: '96%',
  },
  autorBolha: {
    fontSize: 11,
    fontWeight: '700',
    color: CORES.azulSenai,
    marginBottom: 4,
  },
  horaBolha: {
    fontSize: 10,
    color: CORES.textoSuave,
  },
  textoBolha: {
    fontSize: 13,
    lineHeight: 20,
    color: CORES.textoPrincipal,
  },
  fontesContainer: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: CORES.borda,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  fonteTag: {
    fontSize: 10,
    color: CORES.textoSecundario,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  digitandoTexto: {
    fontSize: 12,
    fontStyle: 'italic',
    color: CORES.textoSecundario,
  },
  caixaEntradaChat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  gradeKpis: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  cardKpi: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: CORES.borda,
  },
  kpiValor: {
    fontSize: 22,
    fontWeight: '800',
    color: CORES.azulSenai,
  },
  kpiRotulo: {
    fontSize: 12,
    color: CORES.textoSecundario,
    marginTop: 2,
  },
  itemListaServico: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: CORES.borda,
    gap: 8,
  },
  itemListaTitulo: {
    fontSize: 14,
    fontWeight: '700',
    color: CORES.textoPrincipal,
  },
  itemListaSub: {
    fontSize: 12,
    color: CORES.textoSecundario,
  },
  itemListaAcao: {
    fontSize: 12,
    fontWeight: '700',
    color: CORES.azulSenai,
  },
  tagEstado: {
    fontSize: 11,
    fontWeight: '700',
    color: CORES.textoSecundario,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cardTituloItem: {
    fontSize: 15,
    fontWeight: '800',
    color: CORES.textoPrincipal,
    marginTop: 6,
    marginBottom: 4,
  },
  cardDetalhe: {
    fontSize: 13,
    color: CORES.textoSecundario,
    lineHeight: 18,
    marginBottom: 4,
  },
  caixaPedidoCliente: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: CORES.azulSenai,
    marginVertical: 8,
  },
  caixaPedidoRotulo: {
    fontSize: 12,
    fontWeight: '700',
    color: CORES.textoPrincipal,
    marginBottom: 4,
  },
  caixaPedidoTexto: {
    fontSize: 13,
    color: CORES.textoPrincipal,
    lineHeight: 19,
  },
  subtituloBlocoInterno: {
    fontSize: 12,
    fontWeight: '700',
    color: CORES.textoPrincipal,
    marginTop: 8,
    marginBottom: 4,
  },
  textoVazio: {
    fontSize: 12,
    fontStyle: 'italic',
    color: CORES.textoSuave,
  },
  itemAnexo: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
  },
  itemAnexoNome: {
    fontSize: 13,
    fontWeight: '700',
    color: CORES.azulSenai,
  },
  itemAnexoMeta: {
    fontSize: 11,
    color: CORES.textoSecundario,
  },
  caixaResultadoOrcamento: {
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  resultadoTitulo: {
    fontSize: 13,
    fontWeight: '800',
    color: CORES.azulSenai,
  },
  resultadoSub: {
    fontSize: 12,
    color: CORES.textoSecundario,
    marginTop: 2,
  },
  resultadoFinanceiro: {
    fontSize: 13,
    color: CORES.textoPrincipal,
  },
  resultadoPrecoFinal: {
    fontSize: 16,
    fontWeight: '800',
    color: CORES.verdeSucesso,
    marginTop: 4,
  },
  avisoRestricaoTecnico: {
    fontSize: 12,
    fontWeight: '700',
    color: CORES.amareloAlerta,
    marginTop: 6,
  },
  itemOrcamento: {
    borderTopWidth: 1,
    borderTopColor: CORES.borda,
    paddingTop: 12,
    marginTop: 12,
  },
  precoDestaqueItem: {
    fontSize: 14,
    fontWeight: '800',
    color: CORES.verdeSucesso,
    marginVertical: 4,
  },
  alertaProblemaTexto: {
    fontSize: 12,
    fontWeight: '700',
    color: CORES.vermelhoErro,
    marginVertical: 2,
  },
  caixaInstrucoes: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: CORES.borda,
  },
  instrucaoItem: {
    fontSize: 12,
    color: CORES.textoSecundario,
    lineHeight: 18,
  },
  etapaLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  etapaIcone: {
    fontSize: 16,
  },
  etapaNome: {
    fontSize: 13,
    fontWeight: '700',
    color: CORES.textoPrincipal,
  },
  etapaHoras: {
    fontSize: 11,
    color: CORES.textoSecundario,
  },
  caixaProblemas: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  licaoTexto: {
    fontSize: 12,
    fontWeight: '700',
    color: CORES.azulSenai,
    marginTop: 4,
  },
  modalFundo: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: CORES.branco,
    borderRadius: 16,
    padding: 18,
  },
});
