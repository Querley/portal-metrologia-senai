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
import {
  carregarContextoOperacionalLaboratorio,
  criarContextoDemonstrativoFallback,
  criarMensagemChatIa,
  obterSugestoesChatbotInterno,
  responderChatbotInternoLaboratorio,
  type ContextoOperacionalLaboratorio,
  type MensagemChatIa,
} from '@lib/chatbot-metrologia';
import type { PerfilInterno } from '@lib/contratos';
import { ORIGEM_CUSTOS_HOMOLOGACAO, podeConsultarCustos } from '@lib/custos-equipamento';
import {
  normalizarAtualizacaoEtapa,
  podeAtribuirResponsavel,
  type EstadoEtapaExecucao,
} from '@lib/execucoes-persistentes';
import { calcularSha256Hex, gerarPdfPreProposta } from '@lib/pre-proposta-pdf';
import { sanitizarParaIa } from '@lib/seguranca-ia';
import { servicosOficiais } from '@lib/servicos';
import type { SolicitacaoParaPreProposta } from '@lib/solicitacoes-persistentes';
import { BarraLateralMobile } from '../components/BarraLateralMobile';
import { CmsTab, type VersaoCmsDb } from '../components/interno/CmsTab';
import { ConhecimentoTab } from '../components/interno/ConhecimentoTab';
import {
  CustosTab,
  type CustoEquipamentoDb,
  type EquipamentoDb,
} from '../components/interno/CustosTab';
import { ExecucoesTab, type ResponsavelDb } from '../components/interno/ExecucoesTab';
import { GraficosVisaoMobile } from '../components/interno/GraficosVisaoMobile';
import { OrcamentosTab, type ServicoCatalogoDb } from '../components/interno/OrcamentosTab';
import { SolicitacoesTab } from '../components/interno/SolicitacoesTab';
import { obterSupabaseMobile } from '../supabase';
import { CORES, estilosComuns } from '../theme';

type AbaInterna =
  | 'visao-geral'
  | 'solicitacoes'
  | 'orcamentos'
  | 'custos'
  | 'execucao'
  | 'conhecimento'
  | 'mensagens'
  | 'cms'
  | 'chatbot-ia';

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
  void emailUsuario;
  const [perfil] = useState<PerfilInterno>(perfilInicial);
  const [aba, setAba] = useState<AbaInterna>('visao-geral');
  const [contexto, setContexto] = useState<ContextoOperacionalLaboratorio>(() =>
    criarContextoDemonstrativoFallback(perfilInicial),
  );
  const [carregandoDados, setCarregandoDados] = useState(false);
  const [avisoOperacional, setAvisoOperacional] = useState('');

  // Dados auxiliares do Supabase para workflows completos
  const [servicosDb, setServicosDb] = useState<ServicoCatalogoDb[]>([]);
  const [equipamentosDb, setEquipamentosDb] = useState<EquipamentoDb[]>([]);
  const [custosDb, setCustosDb] = useState<CustoEquipamentoDb[]>([]);
  const [responsaveisDb, setResponsaveisDb] = useState<ResponsavelDb[]>([]);
  const [versoesCmsDb, setVersoesCmsDb] = useState<VersaoCmsDb[]>([]);

  // Filtros e seleções entre abas
  const [filtroSolicitacoesInicial, setFiltroSolicitacoesInicial] = useState('todos');
  const [filtroExecucaoInicial, setFiltroExecucaoInicial] = useState<'todos' | 'retrabalho'>('todos');
  const [solicitacaoParaOrcamento, setSolicitacaoParaOrcamento] =
    useState<SolicitacaoParaPreProposta | null>(null);

  // Mensagens internas
  const [conversaSelecionadaId, setConversaSelecionadaId] = useState<string>('');
  const [textoNovaMensagemInterna, setTextoNovaMensagemInterna] = useState('');

  // Chatbot Interno
  const [perguntaChat, setPerguntaChat] = useState('');
  const [carregandoChat, setCarregandoChat] = useState(false);
  const [mensagensChat, setMensagensChat] = useState<MensagemChatIa[]>(() => [
    criarMensagemChatIa(
      'assistente',
      `Olá, ${nomeUsuario}! Pergunte sobre qualquer protocolo, serviço, PDF ou ocorrência do laboratório.`,
      'pt-BR',
      ['Base operacional do laboratório'],
    ),
  ]);

  // Assistente Sanitizado
  const [modalSanitizadoAberto, setModalSanitizadoAberto] = useState(false);
  const [perguntaSanitizada, setPerguntaSanitizada] = useState(
    'Resuma os cuidados de fixação para metalforte@empresa.com.br no telefone (62) 99999-1234.',
  );

  const exibeCustos = podeConsultarCustos(perfil);
  const podeCms = perfil === 'validador' || perfil === 'administrador';

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

        if (supabase) {
          const [resSrv, resEq, resCustos, resResp, resCms] = await Promise.all([
            supabase.from('servicos_catalogo').select('id,slug,ativo').eq('ativo', true).order('slug'),
            supabase.from('equipamentos').select('id,codigo,nome,ativo').order('nome'),
            podeConsultarCustos(perfilAlvo)
              ? supabase
                  .from('custos_equipamento')
                  .select('id,equipamento_id,custo_hora,vigente_desde,vigente_ate')
                  .eq('origem', ORIGEM_CUSTOS_HOMOLOGACAO)
                  .order('vigente_desde', { ascending: false })
              : Promise.resolve({ data: [], error: null }),
            podeAtribuirResponsavel(perfilAlvo)
              ? supabase.rpc('listar_responsaveis_demonstrativos')
              : Promise.resolve({ data: [], error: null }),
            perfilAlvo === 'validador' || perfilAlvo === 'administrador'
              ? supabase.rpc('listar_cms_demonstrativo')
              : Promise.resolve({ data: [], error: null }),
          ]);

          if (!resSrv.error && Array.isArray(resSrv.data)) {
            setServicosDb(resSrv.data as ServicoCatalogoDb[]);
          }
          if (!resEq.error && Array.isArray(resEq.data)) {
            setEquipamentosDb(resEq.data as EquipamentoDb[]);
          }
          if (!resCustos.error && Array.isArray(resCustos.data)) {
            setCustosDb(resCustos.data as CustoEquipamentoDb[]);
          }
          if (!resResp.error && Array.isArray(resResp.data)) {
            setResponsaveisDb(resResp.data as ResponsavelDb[]);
          }
          if (!resCms.error && Array.isArray(resCms.data)) {
            setVersoesCmsDb(resCms.data as VersaoCmsDb[]);
          }
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
    setMensagensChat((atual) => [...atual, criarMensagemChatIa('usuario', texto)]);
    if (!textoExplicito) setPerguntaChat('');
    setCarregandoChat(true);
    try {
      const resposta = await responderChatbotInternoLaboratorio(texto, contexto);
      setMensagensChat((atual) => [
        ...atual,
        criarMensagemChatIa('assistente', resposta.texto, 'pt-BR', resposta.fontes),
      ]);
    } finally {
      setCarregandoChat(false);
    }
  }

  async function abrirAnexoStorage(bucket: 'solicitacoes' | 'mensagens', caminho: string, nome: string) {
    if (!caminho) {
      setAvisoOperacional(`Arquivo "${nome}" sem caminho de armazenamento.`);
      return;
    }
    const supabase = obterSupabaseMobile();
    if (!supabase) {
      setAvisoOperacional('Sem conexão com o Supabase.');
      return;
    }
    try {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(caminho, 300);
      if (error || !data?.signedUrl) {
        setAvisoOperacional(`Não foi possível abrir "${nome}": ${error?.message ?? 'erro'}`);
        return;
      }
      await Linking.openURL(data.signedUrl);
    } catch {
      setAvisoOperacional(`Falha de conexão ao abrir "${nome}".`);
    }
  }

  async function vincularSolicitacaoCliente(solicitacaoPublicaId: string) {
    const supabase = obterSupabaseMobile();
    if (!supabase) return;
    const { error } = await supabase.rpc('vincular_solicitacao_publica_cliente_existente', {
      solicitacao_publica: solicitacaoPublicaId,
    });
    if (error) {
      setAvisoOperacional(error.message || 'Não foi possível vincular a solicitação ao cliente.');
      return;
    }
    await recarregarContexto(perfil);
    setAvisoOperacional('Solicitação vinculada à área do Cliente!');
  }

  async function carregarOrcamentoParaEdicao(versaoId: string) {
    const supabase = obterSupabaseMobile();
    if (!supabase) return null;
    const [{ data, error }, resPre] = await Promise.all([
      supabase.rpc('obter_orcamento_demonstrativo_para_edicao', { versao: versaoId }),
      supabase.rpc('obter_dados_pre_proposta_demonstrativa', { versao: versaoId }),
    ]);
    const campos = Array.isArray(data) ? data[0] : null;
    const dados = Array.isArray(resPre.data) ? resPre.data[0] : null;
    if (error || resPre.error || !campos || !dados) {
      setAvisoOperacional(
        error?.code === '42501'
          ? 'Somente o autor pode revisar este orçamento.'
          : 'Não foi possível carregar os campos para revisão.',
      );
      return null;
    }
    return {
      servicoId: String(campos.servico_id),
      equipamentoId: String(campos.equipamento_id),
      descricao: String(campos.descricao ?? ''),
      quantidade: String(campos.quantidade ?? 1),
      horas: String(campos.horas ?? 8),
      custosExtras: String(campos.custos_extras ?? 0),
      percentualLucro: String(campos.percentual_lucro ?? 18),
      destinatario: String(dados.destinatario ?? ''),
      prazoPagamentoDias: Number(dados.prazo_pagamento_dias ?? 30),
    };
  }

  async function salvarPreProposta(payload: {
    versaoEmEdicao?: string;
    solicitacaoId: string;
    servicoId: string;
    equipamentoId: string;
    descricao: string;
    quantidade: string;
    horas: string;
    custosExtras: string;
    percentualLucro: string;
    destinatario: string;
    prazoPagamentoDias: number;
    entregaEstimada: string;
    justificativa: string;
  }): Promise<boolean> {
    const supabase = obterSupabaseMobile();
    if (!supabase) return false;
    const { data, error } = payload.versaoEmEdicao
      ? await supabase.rpc('revisar_pre_proposta_demonstrativa', {
          versao: payload.versaoEmEdicao,
          servico: payload.servicoId,
          equipamento: payload.equipamentoId,
          descricao: payload.descricao.trim(),
          quantidade: Number(payload.quantidade) || 1,
          horas: Number(payload.horas.replace(',', '.')) || 8,
          custos_extras: Number(payload.custosExtras.replace(',', '.')) || 0,
          percentual_lucro: Number(payload.percentualLucro.replace(',', '.')) || 18,
          destinatario: payload.destinatario.trim(),
          prazo_pagamento_dias: payload.prazoPagamentoDias,
        })
      : await supabase.rpc('criar_nova_pre_proposta_multiequipamento_demonstrativa', {
          solicitacao: payload.solicitacaoId,
          servico: payload.servicoId,
          equipamentos_horas: [
            {
              equipamento_id: payload.equipamentoId,
              horas: Number(payload.horas.replace(',', '.')) || 8,
            },
          ],
          descricao: payload.descricao.trim(),
          quantidade: Number(payload.quantidade) || 1,
          custos_extras: Number(payload.custosExtras.replace(',', '.')) || 0,
          percentual_lucro: Number(payload.percentualLucro.replace(',', '.')) || 18,
          destinatario: payload.destinatario.trim(),
          prazo_pagamento_dias: payload.prazoPagamentoDias,
          entrega_estimada: payload.entregaEstimada,
        });
    if (error) {
      setAvisoOperacional(error.message || 'Não foi possível salvar a pré-proposta.');
      return false;
    }
    const versaoId = payload.versaoEmEdicao || (data ? String(data) : '');
    const just = payload.justificativa.trim();
    if (just.length >= 5 && versaoId) {
      await supabase.rpc('registrar_justificativa_estimativa_demonstrativa', {
        versao: versaoId,
        justificativa: just,
      });
    }
    await recarregarContexto(perfil);
    setAvisoOperacional(
      payload.versaoEmEdicao
        ? 'Revisão salva! Você já pode reenviar para validação.'
        : 'Pré-proposta salva no banco como rascunho!',
    );
    return true;
  }

  async function alterarEstadoOrcamento(versaoId: string, acao: 'enviar' | 'aprovar') {
    const supabase = obterSupabaseMobile();
    if (!supabase) return;
    const rpc =
      acao === 'enviar' ? 'enviar_orcamento_para_validacao' : 'aprovar_orcamento_demonstrativo';
    const { error } = await supabase.rpc(rpc, { versao: versaoId });
    if (error) {
      setAvisoOperacional(error.message || 'Não foi possível alterar o estado da pré-proposta.');
      return;
    }
    await recarregarContexto(perfil);
    setAvisoOperacional(
      acao === 'enviar' ? 'Enviada para validação!' : 'Pré-proposta aprovada!',
    );
  }

  async function decidirOrcamento(
    versaoId: string,
    decisao: 'devolver' | 'rejeitar',
    justificativa: string,
  ) {
    const supabase = obterSupabaseMobile();
    if (!supabase) return;
    if (justificativa.trim().length < 5) {
      setAvisoOperacional('Informe justificativa com pelo menos 5 caracteres.');
      return;
    }
    const { error } = await supabase.rpc('decidir_orcamento_demonstrativo', {
      versao: versaoId,
      decisao,
      justificativa: justificativa.trim(),
    });
    if (error) {
      setAvisoOperacional(error.message || 'Erro ao registrar decisão.');
      return;
    }
    await recarregarContexto(perfil);
    setAvisoOperacional(
      decisao === 'devolver' ? 'Pré-proposta devolvida para revisão.' : 'Pré-proposta rejeitada.',
    );
  }

  async function publicarOrcamentoComPdf(
    orc: ContextoOperacionalLaboratorio['orcamentos'][number],
  ) {
    const supabase = obterSupabaseMobile();
    if (!supabase) return;
    try {
      const protocolo = `DEM-SOL-${String(orc.solicitacao_codigo).padStart(4, '0')}`;
      const bytes = gerarPdfPreProposta({
        protocolo,
        versao: orc.numero,
        empresa: orc.empresa_nome,
        destinatario: orc.destinatario ?? orc.empresa_nome,
        servico: orc.descricao,
        descricao: orc.descricao,
        valor: formatarDinheiro(Number(orc.preco_final ?? 0)),
        prazoPagamentoDias: orc.prazo_pagamento_dias ?? 30,
        entregaEstimada: orc.entrega_estimada ?? null,
        emitidaEm: new Date(),
      });
      const hash = await calcularSha256Hex(bytes);
      const caminho = `demonstracao/${orc.versao_id}.pdf`;
      const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      const blob = new Blob([buffer], { type: 'application/pdf' });
      const storage = supabase.storage.from('pre-propostas');
      await storage.remove([caminho]);
      const up = await storage.upload(caminho, blob, { contentType: 'application/pdf', upsert: false });
      if (up.error) {
        setAvisoOperacional(`Erro ao gerar PDF: ${up.error.message}`);
        return;
      }
      const reg = await supabase.rpc('registrar_pdf_pre_proposta_demonstrativa', {
        versao: orc.versao_id,
        caminho,
        hash_sha256: hash,
        tamanho_bytes: bytes.byteLength,
      });
      if (reg.error) {
        setAvisoOperacional(`Erro ao registrar PDF: ${reg.error.message}`);
        return;
      }
      const pub = await supabase.rpc('publicar_orcamento_demonstrativo', {
        versao: orc.versao_id,
      });
      if (pub.error) {
        setAvisoOperacional(`Erro ao publicar: ${pub.error.message}`);
        return;
      }
      await recarregarContexto(perfil);
      setAvisoOperacional('PDF gerado, registrado com SHA-256 e pré-proposta publicada para o cliente!');
    } catch {
      setAvisoOperacional('Falha ao gerar PDF e publicar pré-proposta.');
    }
  }

  async function visualizarPdfPrePropostaInterno(versaoId: string) {
    const supabase = obterSupabaseMobile();
    if (!supabase) return;
    const caminho = `demonstracao/${versaoId}.pdf`;
    const { data, error } = await supabase.storage.from('pre-propostas').createSignedUrl(caminho, 300);
    if (error || !data?.signedUrl) {
      setAvisoOperacional('O PDF desta pré-proposta ainda não foi gerado.');
      return;
    }
    await Linking.openURL(data.signedUrl);
  }

  async function confirmarInicioTrabalho(versaoId: string) {
    const supabase = obterSupabaseMobile();
    if (!supabase) return;
    const { error } = await supabase.rpc('confirmar_inicio_trabalho_demonstrativo', {
      versao: versaoId,
    });
    if (error) {
      setAvisoOperacional(error.message || 'Não foi possível iniciar a execução.');
      return;
    }
    await recarregarContexto(perfil);
    setAvisoOperacional('Início do trabalho confirmado! Execução técnica criada.');
  }

  async function alternarAtivoEquipamento(equipamentoId: string, novoAtivo: boolean) {
    const supabase = obterSupabaseMobile();
    if (!supabase) return;
    const { error } = await supabase.rpc('alterar_ativo_equipamento_demonstrativo', {
      equipamento: equipamentoId,
      novo_ativo: novoAtivo,
    });
    if (error) {
      setAvisoOperacional(error.message || 'Não foi possível alterar o status da máquina.');
      return;
    }
    await recarregarContexto(perfil);
    setAvisoOperacional(novoAtivo ? 'Máquina ativada com sucesso!' : 'Máquina desativada.');
  }

  async function salvarNovoCusto(params: {
    equipamentoId: string;
    novoCusto: string;
    vigencia: string;
    referencia: string;
  }): Promise<boolean> {
    const supabase = obterSupabaseMobile();
    if (!supabase) return false;
    const { error } = await supabase.rpc('versionar_custo_equipamento', {
      equipamento: params.equipamentoId,
      novo_custo_hora: params.novoCusto,
      nova_vigencia: params.vigencia,
      fonte: params.referencia,
    });
    if (error) {
      setAvisoOperacional(error.message || 'Não foi possível salvar novo custo.');
      return false;
    }
    await recarregarContexto(perfil);
    setAvisoOperacional('Custo-hora atualizado e aplicado às novas cotações!');
    return true;
  }

  async function definirProgressoEtapa(
    execucaoId: string,
    ordemEtapa: number,
    percentualBruto: number,
  ) {
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
    const percentual = Math.max(0, Math.min(100, Math.round(percentualBruto)));
    const estadoDesejado: EstadoEtapaExecucao =
      percentual === 0 ? 'a_fazer' : percentual === 100 ? 'concluida' : 'em_andamento';
    const posteriorIniciada = execAlvo.etapas.some(
      (et) => et.ordem > ordemEtapa && et.estado !== 'a_fazer',
    );
    if (estadoDesejado !== 'concluida' && posteriorIniciada) {
      setAvisoOperacional('Não é possível reduzir esta etapa porque a seguinte já começou.');
      return;
    }
    const normalizada = normalizarAtualizacaoEtapa(estadoDesejado, percentual);
    const supabase = obterSupabaseMobile();
    if (!supabase || !etapaAlvo.id || !normalizada) return;
    const { error } = await supabase.rpc('atualizar_etapa_execucao_demonstrativa', {
      etapa: etapaAlvo.id,
      novo_estado: normalizada.estado,
      novo_progresso: normalizada.progresso,
    });
    if (error) {
      setAvisoOperacional(error.message);
      return;
    }
    await recarregarContexto(perfil);
    setAvisoOperacional(`Etapa ${ordemEtapa} salva em ${normalizada.progresso}%.`);
  }

  async function retornarEtapa(execucaoId: string, etapaId: string, motivo: string): Promise<boolean> {
    const supabase = obterSupabaseMobile();
    if (!supabase || motivo.trim().length < 10) {
      setAvisoOperacional('Explique o motivo do retorno em pelo menos 10 caracteres.');
      return false;
    }
    const { error } = await supabase.rpc('retornar_execucao_etapa_demonstrativa', {
      execucao: execucaoId,
      etapa_destino: etapaId,
      motivo: motivo.trim(),
    });
    if (error) {
      setAvisoOperacional(error.message);
      return false;
    }
    await recarregarContexto(perfil);
    setAvisoOperacional('Trabalho retornado para a etapa selecionada.');
    return true;
  }

  async function atribuirResponsavel(execucaoId: string, responsavelId: string) {
    const supabase = obterSupabaseMobile();
    if (!supabase) return;
    const { error } = await supabase.rpc('atribuir_responsavel_execucao_demonstrativa', {
      execucao: execucaoId,
      responsavel: responsavelId,
    });
    if (error) {
      setAvisoOperacional(error.message);
      return;
    }
    await recarregarContexto(perfil);
    setAvisoOperacional('Responsável atribuído à execução.');
  }

  async function registrarFechamento(payload: {
    execucaoId: string;
    equipamentosHoras: Array<{ equipamento_id: string; horas: string }>;
    custosExtras: string;
    retrabalho: boolean;
    mudancaEscopo: boolean;
    causa: string;
    observacoes: string;
    aprendizado: string;
  }): Promise<boolean> {
    const supabase = obterSupabaseMobile();
    if (!supabase || payload.observacoes.trim().length < 5) {
      setAvisoOperacional('Preencha as observações técnicas do fechamento.');
      return false;
    }
    const { error } = await supabase.rpc('registrar_fechamento_demonstrativo', {
      execucao: payload.execucaoId,
      equipamentos_horas: payload.equipamentosHoras,
      custos_extras: payload.custosExtras,
      houve_retrabalho: payload.retrabalho,
      houve_mudanca_escopo: payload.mudancaEscopo,
      causa: payload.causa.trim() || null,
      observacoes: payload.observacoes.trim(),
      aprendizado: payload.aprendizado.trim() || null,
    });
    if (error) {
      setAvisoOperacional(error.message || 'Não foi possível enviar o fechamento.');
      return false;
    }
    await recarregarContexto(perfil);
    setAvisoOperacional('Fechamento enviado para aprovação!');
    return true;
  }

  async function decidirFechamento(
    execucaoId: string,
    decisao: 'aprovar' | 'devolver',
    justificativa: string,
  ) {
    const supabase = obterSupabaseMobile();
    if (!supabase) return;
    const { error } = await supabase.rpc('decidir_fechamento_demonstrativo', {
      execucao: execucaoId,
      decisao,
      justificativa: decisao === 'devolver' ? justificativa.trim() : null,
    });
    if (error) {
      setAvisoOperacional(error.message);
      return;
    }
    await recarregarContexto(perfil);
    setAvisoOperacional(
      decisao === 'aprovar' ? 'Fechamento aprovado e execução concluída!' : 'Fechamento devolvido.',
    );
  }

  async function criarLicao(execucaoId: string, resumo: string, assuntos: string[]): Promise<boolean> {
    const supabase = obterSupabaseMobile();
    if (!supabase || resumo.trim().length < 5) {
      setAvisoOperacional('Descreva a lição em pelo menos 5 caracteres.');
      return false;
    }
    const { error } = await supabase.rpc('criar_licao_demonstrativa', {
      execucao: execucaoId,
      resumo: resumo.trim(),
      assuntos,
    });
    if (error) {
      setAvisoOperacional(error.message);
      return false;
    }
    await recarregarContexto(perfil);
    setAvisoOperacional('Lição registrada para validação!');
    return true;
  }

  async function formalizarLicao(licaoId: string) {
    const supabase = obterSupabaseMobile();
    if (!supabase) return;
    const { error } = await supabase.rpc('formalizar_licao_demonstrativa', { licao: licaoId });
    if (error) {
      setAvisoOperacional(error.message);
      return;
    }
    await recarregarContexto(perfil);
    setAvisoOperacional('Lição formalizada!');
  }

  async function consultarRecomendacao(servicoId: string, quantidade: number): Promise<string> {
    const supabase = obterSupabaseMobile();
    if (!supabase) return 'Sem conexão com o Supabase.';
    const { data, error } = await supabase.rpc('recomendar_horas_demonstrativas', {
      servico: servicoId,
      quantidade_nova: quantidade,
      equipamento: null,
    });
    if (error || !data) return 'Sem histórico suficiente para este serviço.';
    const rec = data as { q1?: number; mediana?: number; q3?: number; amostra?: number };
    return `Faixa Q1–Q3: ${rec.q1 ?? '-'}h a ${rec.q3 ?? '-'}h • Mediana: ${rec.mediana ?? '-'}h (${rec.amostra ?? 0} casos)`;
  }

  async function salvarRascunhoCms(payload: {
    chave: string;
    tipo: string;
    idioma: string;
    titulo: string;
    corpo: string;
  }): Promise<boolean> {
    const supabase = obterSupabaseMobile();
    if (!supabase) return false;
    const { error } = await supabase.rpc('salvar_versao_conteudo_demonstrativo', {
      chave_conteudo: payload.chave.trim(),
      tipo_conteudo: payload.tipo.trim(),
      idioma_conteudo: payload.idioma,
      titulo_conteudo: payload.titulo.trim(),
      corpo_conteudo: payload.corpo,
    });
    if (error) {
      setAvisoOperacional(error.message);
      return false;
    }
    await recarregarContexto(perfil);
    setAvisoOperacional('Rascunho CMS salvo!');
    return true;
  }

  async function executarAcaoCms(
    versaoId: string,
    acao: 'enviar' | 'aprovar' | 'devolver' | 'publicar',
    justificativa?: string,
  ) {
    const supabase = obterSupabaseMobile();
    if (!supabase) return;
    const { error } =
      acao === 'enviar'
        ? await supabase.rpc('enviar_versao_conteudo_validacao_demonstrativa', { versao: versaoId })
        : acao === 'publicar'
          ? await supabase.rpc('publicar_versao_conteudo_demonstrativo', { versao: versaoId })
          : await supabase.rpc('decidir_versao_conteudo_demonstrativa', {
              versao: versaoId,
              aprovar: acao === 'aprovar',
              justificativa: acao === 'devolver' ? (justificativa ?? '').trim() : null,
            });
    if (error) {
      setAvisoOperacional(error.message);
      return;
    }
    await recarregarContexto(perfil);
    setAvisoOperacional('Ação de conteúdo concluída!');
  }

  async function enviarMensagemInternaParaCliente() {
    const texto = textoNovaMensagemInterna.trim();
    if (!texto) return;
    const idAlvo = conversaSelecionadaId || contexto.conversas[0]?.solicitacao_id;
    const supabase = obterSupabaseMobile();
    if (!idAlvo || !supabase) return;
    const { error } = await supabase.rpc('enviar_mensagem_interna_demonstrativa', {
      solicitacao: idAlvo,
      conteudo: texto,
    });
    if (error) {
      setAvisoOperacional(error.message);
      return;
    }
    setTextoNovaMensagemInterna('');
    await recarregarContexto(perfil);
    setAvisoOperacional('Mensagem enviada ao cliente!');
  }

  const conversaAtiva =
    contexto.conversas.find((c) => c.solicitacao_id === conversaSelecionadaId) ??
    contexto.conversas[0];

  return (
    <View style={estilosComuns.container}>
      <View style={styles.topoInterno}>
        <View style={{ flex: 1 }}>
          <Text style={styles.topoSubtitulo}>PORTAL INTERNO • {perfil.toUpperCase()}</Text>
          <Text style={styles.topoNome}>{nomeUsuario}</Text>
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

      <BarraLateralMobile
        tituloMenu="Portal Interno"
        ativoId={aba}
        aoSelecionar={(novaAba) => {
          setAvisoOperacional('');
          setAba(novaAba as AbaInterna);
        }}
        itens={[
          { id: 'visao-geral', icone: '📊', rotuloCurto: 'Visão', rotuloCompleto: 'Visão Geral' },
          {
            id: 'solicitacoes',
            icone: '📄',
            rotuloCurto: 'Solicit.',
            rotuloCompleto: 'Solicitações & PDFs',
            badge: contexto.solicitacoes.length,
          },
          {
            id: 'orcamentos',
            icone: '💰',
            rotuloCurto: 'Orçam.',
            rotuloCompleto: 'Orçamentos & Propostas',
            badge: contexto.orcamentos.length,
          },
          {
            id: 'execucao',
            icone: '⚙️',
            rotuloCurto: 'Exec.',
            rotuloCompleto: 'Execuções & Fechamento',
            badge: contexto.execucoes.length,
          },
          { id: 'conhecimento', icone: '💡', rotuloCurto: 'Lições', rotuloCompleto: 'Conhecimento & Q1-Q3' },
          {
            id: 'mensagens',
            icone: '💬',
            rotuloCurto: 'Mensag.',
            rotuloCompleto: 'Mensagens Clientes',
            badge: contexto.conversas.length,
          },
          ...(exibeCustos
            ? [{ id: 'custos', icone: '🏷️', rotuloCurto: 'Custos', rotuloCompleto: 'Custos por Máquina' }]
            : []),
          ...(podeCms
            ? [{ id: 'cms', icone: '📝', rotuloCurto: 'CMS', rotuloCompleto: 'Conteúdo Público' }]
            : []),
          { id: 'chatbot-ia', icone: '🤖', rotuloCurto: 'Chatbot', rotuloCompleto: 'Chatbot IA' },
        ]}
      >
        <ScrollView style={{ flex: 1 }} contentContainerStyle={estilosComuns.conteudoScroll}>
          {aba === 'visao-geral' && (
            <View>
              <View style={estilosComuns.card}>
                <View style={estilosComuns.linhaEntre}>
                  <Text style={estilosComuns.tituloSecao}>Resumo do Laboratório</Text>
                  <TouchableOpacity onPress={() => void recarregarContexto(perfil)}>
                    <Text style={styles.linkAcao}>{carregandoDados ? 'Atualizando...' : '↻ Atualizar'}</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.gradeKpis}>
                  <TouchableOpacity
                    style={styles.cardKpi}
                    onPress={() => {
                      setFiltroSolicitacoesInicial('abertas');
                      setAba('solicitacoes');
                    }}
                  >
                    <Text style={styles.kpiValor}>{contexto.solicitacoes.length}</Text>
                    <Text style={styles.kpiRotulo}>Solicitações →</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cardKpi}
                    onPress={() => setAba('orcamentos')}
                  >
                    <Text style={styles.kpiValor}>{contexto.orcamentos.length}</Text>
                    <Text style={styles.kpiRotulo}>Pré-propostas →</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cardKpi}
                    onPress={() => {
                      setFiltroExecucaoInicial('todos');
                      setAba('execucao');
                    }}
                  >
                    <Text style={styles.kpiValor}>{contexto.execucoes.length}</Text>
                    <Text style={styles.kpiRotulo}>Execuções →</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cardKpi}
                    onPress={() => {
                      setFiltroExecucaoInicial('retrabalho');
                      setAba('execucao');
                    }}
                  >
                    <Text style={styles.kpiValor}>
                      {contexto.execucoes.filter((e) => Boolean(e.retrabalho)).length}
                    </Text>
                    <Text style={styles.kpiRotulo}>Retrabalhos →</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <GraficosVisaoMobile
                contexto={contexto}
                perfil={perfil}
                aoNavegar={(destino, filtro) => {
                  if (destino === 'solicitacoes' && filtro) {
                    setFiltroSolicitacoesInicial(filtro);
                  }
                  setAba(destino);
                }}
              />
            </View>
          )}

          {aba === 'solicitacoes' && (
            <SolicitacoesTab
              contexto={contexto}
              perfil={perfil}
              filtroInicial={filtroSolicitacoesInicial}
              aoVincularCliente={vincularSolicitacaoCliente}
              aoElaborarPreProposta={(sol) => {
                setSolicitacaoParaOrcamento(sol);
                setAba('orcamentos');
              }}
              aoAbrirChatbotProtocolo={(codigo) => {
                setAba('chatbot-ia');
                void enviarPerguntaChatbotInterno(`Protocolo #${codigo}`);
              }}
              aoAbrirAnexo={abrirAnexoStorage}
            />
          )}

          {aba === 'orcamentos' && (
            <OrcamentosTab
              contexto={contexto}
              perfil={perfil}
              servicosDb={servicosDb}
              equipamentosDb={equipamentosDb}
              custosDb={custosDb}
              solicitacaoSelecionada={solicitacaoParaOrcamento}
              aoSelecionarSolicitacao={setSolicitacaoParaOrcamento}
              aoCarregarParaEdicao={carregarOrcamentoParaEdicao}
              aoSalvarPreProposta={salvarPreProposta}
              aoAlterarEstado={alterarEstadoOrcamento}
              aoDecidirOrcamento={decidirOrcamento}
              aoPublicarComPdf={publicarOrcamentoComPdf}
              aoVisualizarPdf={visualizarPdfPrePropostaInterno}
              aoConfirmarInicioTrabalho={confirmarInicioTrabalho}
            />
          )}

          {aba === 'custos' && exibeCustos && (
            <CustosTab
              perfil={perfil}
              equipamentosDb={equipamentosDb}
              custosDb={custosDb}
              aoSalvarNovoCusto={salvarNovoCusto}
              aoAlternarAtivoEquipamento={alternarAtivoEquipamento}
            />
          )}

          {aba === 'execucao' && (
            <ExecucoesTab
              contexto={contexto}
              perfil={perfil}
              responsaveis={responsaveisDb}
              filtroInicial={filtroExecucaoInicial}
              aoDefinirProgressoEtapa={definirProgressoEtapa}
              aoRetornarEtapa={retornarEtapa}
              aoAtribuirResponsavel={atribuirResponsavel}
              aoRegistrarFechamento={registrarFechamento}
              aoDecidirFechamento={decidirFechamento}
            />
          )}

          {aba === 'conhecimento' && (
            <ConhecimentoTab
              contexto={contexto}
              perfil={perfil}
              servicosDb={servicosDb}
              aoCriarLicao={criarLicao}
              aoFormalizarLicao={formalizarLicao}
              aoConsultarRecomendacao={consultarRecomendacao}
            />
          )}

          {aba === 'mensagens' && (
            <View style={estilosComuns.card}>
              <Text style={estilosComuns.tituloSecao}>Mensagens com Clientes</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 10 }}>
                {contexto.conversas.map((conv) => {
                  const ativo = conversaAtiva?.solicitacao_id === conv.solicitacao_id;
                  return (
                    <TouchableOpacity
                      key={conv.solicitacao_id}
                      style={[estilosComuns.chip, ativo && estilosComuns.chipAtivo, { marginRight: 6 }]}
                      onPress={() => setConversaSelecionadaId(conv.solicitacao_id)}
                    >
                      <Text style={[estilosComuns.chipTexto, ativo && estilosComuns.chipTextoAtivo]}>
                        #{conv.codigo} • {conv.empresa}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {conversaAtiva ? (
                <View>
                  <View style={styles.areaMensagensChat}>
                    {conversaAtiva.mensagens.map((m) => (
                      <View
                        key={m.id}
                        style={[
                          styles.bolhaChat,
                          m.autor_tipo === 'equipe' ? styles.bolhaUsuario : styles.bolhaAssistente,
                        ]}
                      >
                        <Text style={[styles.autorBolha, m.autor_tipo === 'equipe' && { color: CORES.branco }]}>
                          {m.autor_nome} ({m.autor_tipo})
                        </Text>
                        <Text style={[styles.textoBolha, m.autor_tipo === 'equipe' && { color: CORES.branco }]}>
                          {m.conteudo}
                        </Text>
                        {m.anexos?.map((an) => (
                          <TouchableOpacity
                            key={an.id}
                            onPress={() =>
                              void abrirAnexoStorage('mensagens', an.caminho_storage ?? '', an.nome_original)
                            }
                          >
                            <Text style={styles.fonteTag}>📎 {an.nome_original}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ))}
                  </View>
                  <View style={styles.caixaEntradaChat}>
                    <TextInput
                      style={[estilosComuns.input, { flex: 1, marginTop: 0, marginBottom: 0 }]}
                      value={textoNovaMensagemInterna}
                      onChangeText={setTextoNovaMensagemInterna}
                      onSubmitEditing={() => void enviarMensagemInternaParaCliente()}
                      placeholder="Responder ao cliente..."
                    />
                    <TouchableOpacity
                      style={estilosComuns.botaoPrimario}
                      onPress={() => void enviarMensagemInternaParaCliente()}
                    >
                      <Text style={estilosComuns.textoBotaoPrimario}>Enviar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <Text style={styles.textoVazio}>Nenhuma conversa registrada.</Text>
              )}
            </View>
          )}

          {aba === 'cms' && podeCms && (
            <CmsTab
              perfil={perfil}
              versoes={versoesCmsDb}
              aoSalvarRascunho={salvarRascunhoCms}
              aoExecutarAcao={executarAcaoCms}
            />
          )}

          {aba === 'chatbot-ia' && (
            <View style={estilosComuns.card}>
              <Text style={estilosComuns.tituloSecao}>Chatbot Interno</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
                {servicosOficiais.map((srv) => (
                  <TouchableOpacity
                    key={srv.slug}
                    style={[estilosComuns.chip, { marginRight: 6 }]}
                    onPress={() => void enviarPerguntaChatbotInterno(srv.titulo)}
                  >
                    <Text style={estilosComuns.chipTexto}>🔎 {srv.titulo}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                {obterSugestoesChatbotInterno().map((sug) => (
                  <TouchableOpacity
                    key={sug}
                    style={[estilosComuns.chip, { marginRight: 6 }]}
                    onPress={() => void enviarPerguntaChatbotInterno(sug)}
                  >
                    <Text style={estilosComuns.chipTexto}>⚡ {sug}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.areaMensagensChat}>
                {mensagensChat.map((msg) => (
                  <View
                    key={msg.id}
                    style={[
                      styles.bolhaChat,
                      msg.autor === 'usuario' ? styles.bolhaUsuario : styles.bolhaAssistente,
                    ]}
                  >
                    <Text style={[styles.textoBolha, msg.autor === 'usuario' && { color: CORES.branco }]}>
                      {msg.texto}
                    </Text>
                  </View>
                ))}
                {carregandoChat ? <Text style={styles.textoVazio}>Consultando...</Text> : null}
              </View>

              <View style={styles.caixaEntradaChat}>
                <TextInput
                  style={[estilosComuns.input, { flex: 1, marginTop: 0, marginBottom: 0 }]}
                  value={perguntaChat}
                  onChangeText={setPerguntaChat}
                  onSubmitEditing={() => void enviarPerguntaChatbotInterno()}
                  placeholder="Pergunte sobre protocolo, serviço ou problema..."
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
        </ScrollView>
      </BarraLateralMobile>

      <Modal
        visible={modalSanitizadoAberto}
        animationType="slide"
        transparent
        onRequestClose={() => setModalSanitizadoAberto(false)}
      >
        <View style={styles.modalFundo}>
          <View style={styles.modalConteudo}>
            <Text style={estilosComuns.tituloSecao}>Assistente Sanitizado</Text>
            <TextInput
              style={[estilosComuns.input, { minHeight: 70, marginVertical: 10 }]}
              multiline
              value={perguntaSanitizada}
              onChangeText={setPerguntaSanitizada}
            />
            <View style={styles.caixaPreviewSanitizado}>
              <Text style={styles.previewTexto}>
                {JSON.stringify(previaSanitizada.conteudo, null, 2)}
              </Text>
            </View>
            <TouchableOpacity
              style={[estilosComuns.botaoPrimario, { marginTop: 12 }]}
              onPress={() => setModalSanitizadoAberto(false)}
            >
              <Text style={estilosComuns.textoBotaoPrimario}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  topoInterno: {
    backgroundColor: CORES.azulEscuro,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topoSubtitulo: { color: '#93C5FD', fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  topoNome: { color: CORES.branco, fontSize: 13.5, fontWeight: '800' },
  botaoSanitizado: {
    backgroundColor: '#1E40AF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  botaoSanitizadoTexto: { color: CORES.branco, fontSize: 11, fontWeight: '700' },
  botaoSair: {
    backgroundColor: CORES.vermelho,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  botaoSairTexto: { color: CORES.branco, fontSize: 11.5, fontWeight: '800' },
  bannerAviso: {
    backgroundColor: '#ECFDF5',
    borderBottomWidth: 1,
    borderBottomColor: '#A7F3D0',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  bannerAvisoTexto: { color: '#065F46', fontSize: 12, fontWeight: '700' },
  linkAcao: { fontSize: 12, fontWeight: '800', color: CORES.azulPrincipal },
  gradeKpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  cardKpi: {
    width: '48%',
    backgroundColor: CORES.fundoClaro,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: CORES.borda,
  },
  kpiValor: { fontSize: 20, fontWeight: '900', color: CORES.azulEscuro },
  kpiRotulo: { fontSize: 11.5, color: CORES.textoSecundario, marginTop: 2, fontWeight: '700' },
  areaMensagensChat: { gap: 8, marginBottom: 10 },
  bolhaChat: { borderRadius: 10, padding: 10, borderWidth: 1 },
  bolhaUsuario: {
    backgroundColor: CORES.azulPrincipal,
    borderColor: CORES.azulPrincipal,
    alignSelf: 'flex-end',
    maxWidth: '90%',
  },
  bolhaAssistente: {
    backgroundColor: CORES.fundoClaro,
    borderColor: CORES.borda,
    alignSelf: 'stretch',
  },
  autorBolha: { fontSize: 10.5, fontWeight: '800', color: CORES.azulEscuro, marginBottom: 2 },
  textoBolha: { fontSize: 12.5, lineHeight: 18, color: CORES.textoPrincipal },
  fonteTag: {
    fontSize: 11,
    fontWeight: '700',
    color: CORES.azulPrincipal,
    marginTop: 4,
    textDecorationLine: 'underline',
  },
  caixaEntradaChat: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  textoVazio: { fontSize: 12.5, color: CORES.textoSuave, fontStyle: 'italic' },
  modalFundo: {
    flex: 1,
    backgroundColor: 'rgba(11, 37, 65, 0.72)',
    justifyContent: 'center',
    padding: 16,
  },
  modalConteudo: { backgroundColor: CORES.branco, borderRadius: 14, padding: 16 },
  caixaPreviewSanitizado: {
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#6EE7B7',
  },
  previewTexto: { fontSize: 12.5, color: '#065F46' },
});
