'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { Activity, Ban, BriefcaseBusiness, Check, CheckCircle2, Circle, Clock3, Download, Eye, FileText, LogOut, MessageSquareText, Paperclip, Pencil, Plus, RefreshCw, Save, Send, ShieldCheck, UserRound, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { AnexoSolicitacaoCliente } from '../lib/anexos-solicitacao';
import { correspondeBusca, formatosDataParaBusca } from '../lib/busca-e-filtros';
import { formatarDinheiro } from '../lib/calculos';
import { calcularSha256Hex } from '../lib/pre-proposta-pdf';
import { contextoClienteDemonstracao, descricaoAceiteCliente, mensagensClienteDemonstracao, normalizarMotivoRecusa, podeAceitarPreProposta, podeRecusarPreProposta, protocoloSolicitacaoCliente, situacaoEtapasCliente, solicitacoesClienteDemonstracao, tituloServicoCliente, type ContextoCliente, type MensagemCliente, type SolicitacaoCliente, VERSAO_AVISO_PRIVACIDADE, VERSAO_DECLARACAO_ACEITE_PRE_PROPOSTA } from '../lib/portal-cliente';
import { BarraBuscaFiltros } from './barra-busca-filtros';
import { ContatoEmail } from './contato-email';
import { MarcaOficial } from './marca-oficial';
import { NovaSolicitacaoCliente, type DadosNovaSolicitacaoCliente } from './nova-solicitacao-cliente';
import { NotificacaoFlutuante } from './notificacao-flutuante';
import { caminhoAnexoMensagem, validarAnexosMensagem, type AnexoMensagem } from '../lib/anexos-mensagem';
import { tipoMimeArmazenado } from '../lib/anexos-solicitacao';
import { SeletorIdioma } from './seletor-idioma';
import { useTraducaoPublica } from '../lib/traducao-publica';
import { documentoPodeSerVisualizado, VisualizadorDocumento, type DocumentoVisualizavel } from './visualizador-documento';

type Propriedades = {
  cliente?: SupabaseClient;
  contexto?: ContextoCliente;
  demonstracao?: boolean;
  aoSair?: () => void | Promise<void>;
  mensagemInicial?: string;
};

const estadoEtapa = {
  concluida: { rotulo: 'Concluído', Icone: CheckCircle2 },
  em_andamento: { rotulo: 'Em andamento', Icone: Clock3 },
  a_fazer: { rotulo: 'A fazer', Icone: Circle },
} as const;

function dataCurta(valor: string, idioma = 'pt-BR') {
  return new Intl.DateTimeFormat(idioma, {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(valor));
}

export function PortalCliente({ cliente, contexto = contextoClienteDemonstracao, demonstracao = false, aoSair, mensagemInicial = '' }: Propriedades) {
  const { t, tm, idioma } = useTraducaoPublica();
  const formatarData = useCallback((valor: string) => dataCurta(valor, idioma), [idioma]);
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoCliente[]>(demonstracao ? solicitacoesClienteDemonstracao : []);
  const [selecionadaId, setSelecionadaId] = useState(demonstracao ? solicitacoesClienteDemonstracao[0].id : '');
  const [mensagens, setMensagens] = useState<MensagemCliente[]>(demonstracao ? mensagensClienteDemonstracao : []);
  const [mensagemNova, setMensagemNova] = useState('');
  const [carregando, setCarregando] = useState(!demonstracao);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState(mensagemInicial ? t(mensagemInicial) : '');
  const [aceitouPrivacidade, setAceitouPrivacidade] = useState(contexto.versao_aviso_privacidade === VERSAO_AVISO_PRIVACIDADE);
  const [aceitando, setAceitando] = useState(false);
  const [nomeCliente, setNomeCliente] = useState(contexto.usuario_nome);
  const [nomeEmEdicao, setNomeEmEdicao] = useState(contexto.usuario_nome);
  const [emailEmEdicao, setEmailEmEdicao] = useState(contexto.usuario_email);
  const [emailCliente, setEmailCliente] = useState(contexto.usuario_email);
  const [cargoCliente, setCargoCliente] = useState(contexto.cargo || t(contexto.perfil === 'gestor_empresa' ? 'Gestor da empresa' : 'Contato da empresa'));
  const [cargoEmEdicao, setCargoEmEdicao] = useState(contexto.cargo || t(contexto.perfil === 'gestor_empresa' ? 'Gestor da empresa' : 'Contato da empresa'));
  const [editandoPerfil, setEditandoPerfil] = useState(false);
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const [baixandoPdf, setBaixandoPdf] = useState(false);
  const [aceitandoPreProposta, setAceitandoPreProposta] = useState(false);
  const [confirmouAceite, setConfirmouAceite] = useState(false);
  const [recusandoPreProposta, setRecusandoPreProposta] = useState(false);
  const [motivoRecusa, setMotivoRecusa] = useState('');
  const [recusaAberta, setRecusaAberta] = useState(false);
  const [buscaTrabalho, setBuscaTrabalho] = useState('');
  const [filtroTrabalho, setFiltroTrabalho] = useState('todos');
  const [ordenacaoTrabalho, setOrdenacaoTrabalho] = useState('recentes');
  const [criandoSolicitacao, setCriandoSolicitacao] = useState(false);
  const [anexosPorSolicitacao, setAnexosPorSolicitacao] = useState<Record<string, AnexoSolicitacaoCliente[]>>({});
  const [baixandoAnexoId, setBaixandoAnexoId] = useState('');
  const [arquivosMensagem, setArquivosMensagem] = useState<File[]>([]);
  const [naoLidas, setNaoLidas] = useState<Record<string, number>>({});
  const [documento, setDocumento] = useState<DocumentoVisualizavel | null>(null);
  const hidratado = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  const carregar = useCallback(async () => {
    if (!cliente || demonstracao) return;
    setCarregando(true);
    setErro('');
    const { data, error } = await cliente.rpc('listar_portal_cliente');
    if (error) setErro(t('Não foi possível carregar seu acompanhamento. Tente novamente.'));
    else {
      const lista = (Array.isArray(data) ? data : []) as SolicitacaoCliente[];
      setSolicitacoes(lista);
      setSelecionadaId((atual) => atual || lista[0]?.id || '');
    }
    setCarregando(false);
  }, [cliente, demonstracao, t]);

  const carregarMensagens = useCallback(
    async (solicitacaoId: string) => {
      if (!cliente || demonstracao || !solicitacaoId) return;
      const [mensagensResposta, anexosResposta, leiturasResposta] = await Promise.all([
        cliente.rpc('listar_mensagens_cliente', { solicitacao: solicitacaoId }),
        cliente.rpc('listar_anexos_mensagens_demonstrativas', { solicitacao: solicitacaoId }),
        cliente.rpc('resumo_mensagens_nao_lidas_demonstrativas'),
      ]);
      if (!mensagensResposta.error && !anexosResposta.error) {
        const anexos = (anexosResposta.data ?? []) as AnexoMensagem[];
        setMensagens(((mensagensResposta.data ?? []) as MensagemCliente[]).map((mensagem) => ({ ...mensagem, anexos: anexos.filter((anexo) => anexo.mensagem_id === mensagem.id) })));
      }
      if (!leiturasResposta.error) setNaoLidas(Object.fromEntries(((leiturasResposta.data ?? []) as Array<{ solicitacao_id: string; nao_lidas: number }>).map((item) => [item.solicitacao_id, Number(item.nao_lidas)])));
      await cliente.rpc('marcar_conversa_lida_demonstrativa', { solicitacao: solicitacaoId });
      setNaoLidas((atuais) => ({ ...atuais, [solicitacaoId]: 0 }));
    },
    [cliente, demonstracao],
  );

  const carregarAnexos = useCallback(
    async (solicitacaoId: string) => {
      if (!cliente || demonstracao || !solicitacaoId) return;
      const { data, error } = await cliente.rpc('listar_anexos_solicitacao_cliente_demonstrativa', { solicitacao: solicitacaoId });
      if (!error)
        setAnexosPorSolicitacao((atuais) => ({
          ...atuais,
          [solicitacaoId]: (data ?? []) as AnexoSolicitacaoCliente[],
        }));
    },
    [cliente, demonstracao],
  );

  useEffect(() => {
    queueMicrotask(() => void carregar());
  }, [carregar]);
  useEffect(() => {
    if (!cliente || demonstracao) return;
    const canal = cliente
      .channel('etapas-portal-cliente')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'etapas_execucao' }, () => void carregar())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'etapas_execucao' }, () => void carregar())
      .subscribe();
    return () => {
      void cliente.removeChannel(canal);
    };
  }, [carregar, cliente, demonstracao]);

  const solicitacoesVisiveis = useMemo(
    () =>
      solicitacoes.filter((item) => {
        const corresponde = correspondeBusca(buscaTrabalho, protocoloSolicitacaoCliente(item), tituloServicoCliente(item.servico), item.descricao, item.material, item.quantidade, item.estado, item.proposta_estado, item.execucao_estado, formatosDataParaBusca(item.criada_em));
        if (!corresponde || filtroTrabalho === 'todos') return corresponde;
        if (filtroTrabalho === 'aguardando') return item.proposta_estado === 'publicada';
        if (filtroTrabalho === 'ativos') return item.execucao_estado === 'planejado' || item.execucao_estado === 'em_execucao';
        if (filtroTrabalho === 'concluidos') return item.execucao_estado === 'concluido';
        if (filtroTrabalho === 'recusados') return item.proposta_estado === 'recusada';
        if (filtroTrabalho === 'sem_proposta') return !item.proposta_estado;
        return true;
      }).sort((a, b) => ordenacaoTrabalho === 'antigas' ? +new Date(a.criada_em) - +new Date(b.criada_em) : ordenacaoTrabalho === 'maior_valor' ? Number(b.valor_pre_proposta || 0) - Number(a.valor_pre_proposta || 0) : ordenacaoTrabalho === 'servico' ? tituloServicoCliente(a.servico).localeCompare(tituloServicoCliente(b.servico), 'pt-BR') : +new Date(b.criada_em) - +new Date(a.criada_em)),
    [buscaTrabalho, filtroTrabalho, ordenacaoTrabalho, solicitacoes],
  );
  const selecionada = useMemo(() => solicitacoesVisiveis.find((item) => item.id === selecionadaId) ?? solicitacoesVisiveis[0], [selecionadaId, solicitacoesVisiveis]);
  const selecionadaIdEfetiva = selecionada?.id ?? '';
  useEffect(() => {
    queueMicrotask(() => void carregarMensagens(selecionadaIdEfetiva));
  }, [carregarMensagens, selecionadaIdEfetiva]);
  useEffect(() => {
    queueMicrotask(() => void carregarAnexos(selecionadaIdEfetiva));
  }, [carregarAnexos, selecionadaIdEfetiva]);
  useEffect(() => {
    if (!cliente || demonstracao || !selecionadaIdEfetiva) return;
    const canal = cliente
      .channel(`mensagens-cliente-${selecionadaIdEfetiva}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensagens',
          filter: `solicitacao_id=eq.${selecionadaIdEfetiva}`,
        },
        () => void carregarMensagens(selecionadaIdEfetiva),
      )
      .subscribe();
    return () => {
      void cliente.removeChannel(canal);
    };
  }, [carregarMensagens, cliente, demonstracao, selecionadaIdEfetiva]);
  const situacaoAtual = useMemo(() => (selecionada ? situacaoEtapasCliente(selecionada.etapas, selecionada.execucao_estado, selecionada.proposta_estado) : null), [selecionada]);
  const indicadores = useMemo(
    () => ({
      total: solicitacoes.length,
      emExecucao: solicitacoes.filter((item) => item.execucao_estado === 'em_execucao').length,
      aguardandoCliente: solicitacoes.filter((item) => item.proposta_estado === 'publicada').length,
      mensagens: Object.values(naoLidas).reduce((total, quantidade) => total + quantidade, 0),
    }),
    [naoLidas, solicitacoes],
  );

  function abrirTrabalhosComFiltro(filtro: string) {
    setBuscaTrabalho('');
    setFiltroTrabalho(filtro);
    window.requestAnimationFrame(() => document.getElementById('trabalhos-cliente')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  async function registrarNovaSolicitacao(resultado: { solicitacao_id: string; codigo: number; protocolo: string }, dados: DadosNovaSolicitacaoCliente, anexos: AnexoSolicitacaoCliente[]) {
    if (demonstracao) {
      setSolicitacoes((atuais) => [
        {
          id: resultado.solicitacao_id,
          codigo: resultado.codigo,
          protocolo: resultado.protocolo,
          estado: 'nova',
          criada_em: new Date().toISOString(),
          servico: dados.necessidade,
          proposta_estado: null,
          valor_pre_proposta: null,
          prazo_pagamento_dias: dados.prazo_pagamento_dias,
          descricao: dados.descricao,
          material: dados.material,
          quantidade: String(dados.quantidade),
          prazo_servico: dados.prazo_servico,
          aceita_em: null,
          execucao_estado: null,
          etapas: [],
        },
        ...atuais,
      ]);
    } else {
      await carregar();
    }
    setAnexosPorSolicitacao((atuais) => ({
      ...atuais,
      [resultado.solicitacao_id]: anexos,
    }));
    setSelecionadaId(resultado.solicitacao_id);
    setCriandoSolicitacao(false);
    setAviso(`${resultado.protocolo} ${t('registrada e vinculada à sua empresa. Você já pode alternar entre os trabalhos.')}`);
  }

  async function baixarAnexo(anexo: AnexoSolicitacaoCliente) {
    if (!cliente || demonstracao) {
      setAviso(t('Na demonstração local, o arquivo é apenas representativo. Use a homologação autenticada para testar o download privado.'));
      return;
    }
    setBaixandoAnexoId(anexo.id);
    setErro('');
    const { data, error } = await cliente.storage.from('solicitacoes').download(anexo.caminho_storage);
    if (error || !data) setErro(t('Não foi possível baixar este anexo protegido.'));
    else if (documentoPodeSerVisualizado(anexo.tipo_mime, anexo.nome_original)) {
      const url = URL.createObjectURL(data);
      setDocumento({ url, nome: anexo.nome_original, tipo: anexo.tipo_mime });
    } else {
      const url = URL.createObjectURL(data);
      const ancora = document.createElement('a');
      ancora.href = url;
      ancora.download = anexo.nome_original;
      ancora.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    }
    setBaixandoAnexoId('');
  }

  async function aceitarPrivacidade() {
    setAceitando(true);
    if (cliente && !demonstracao) {
      const { error } = await cliente.rpc('registrar_aceite_privacidade_cliente', { versao: VERSAO_AVISO_PRIVACIDADE });
      if (error) {
        setErro(t('Não foi possível registrar a ciência do aviso de privacidade.'));
        setAceitando(false);
        return;
      }
    }
    setAceitouPrivacidade(true);
    setAceitando(false);
  }

  async function enviarMensagem(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const conteudo = mensagemNova.trim();
    if (!conteudo || !selecionada) return;
    if (cliente && !demonstracao) {
      const { data: mensagemId, error } = await cliente.rpc('enviar_mensagem_cliente', {
        solicitacao: selecionada.id,
        conteudo,
      });
      if (error || !mensagemId) {
        setErro(t('Não foi possível enviar a mensagem.'));
        return;
      }
      for (const arquivo of arquivosMensagem) {
        const caminho = caminhoAnexoMensagem(String(mensagemId), arquivo);
        const tipo = tipoMimeArmazenado(arquivo) ?? 'application/octet-stream';
        const envio = await cliente.storage.from('mensagens').upload(caminho, arquivo, { contentType: tipo, upsert: false });
        if (envio.error) { setErro(`${t('A mensagem foi enviada, mas')} ${arquivo.name} ${t('não pôde ser anexado.')}`); break; }
        const registro = await cliente.rpc('registrar_anexo_mensagem_demonstrativa', { mensagem: mensagemId, caminho, nome_original: arquivo.name, tipo_mime: tipo, tamanho_bytes: arquivo.size });
        if (registro.error) { setErro(`${t('A mensagem foi enviada, mas')} ${arquivo.name} ${t('não pôde ser registrado.')}`); break; }
      }
      setArquivosMensagem([]);
      await carregarMensagens(selecionada.id);
    } else {
      setMensagens((atuais) => [
        ...atuais,
        {
          id: `demo-${Date.now()}`,
          autor_proprio: true,
          conteudo,
          criada_em: new Date().toISOString(),
        },
      ]);
    }
    setMensagemNova('');
  }

  function selecionarArquivosMensagem(lista: FileList | null) {
    const arquivos = [...arquivosMensagem, ...Array.from(lista ?? [])];
    const falha = validarAnexosMensagem(arquivos);
    if (falha) setErro(tm(falha));
    else { setErro(''); setArquivosMensagem(arquivos); }
  }

  async function baixarAnexoMensagem(anexo: AnexoMensagem) {
    if (!cliente || demonstracao) { setAviso(t('Use a área autenticada para baixar anexos de mensagens.')); return; }
    setBaixandoAnexoId(anexo.id);
    const { data, error } = await cliente.storage.from('mensagens').download(anexo.caminho_storage);
    if (error || !data) setErro(t('Não foi possível baixar o anexo protegido.'));
    else if (documentoPodeSerVisualizado(anexo.tipo_mime, anexo.nome_original)) {
      const url = URL.createObjectURL(data);
      setDocumento({ url, nome: anexo.nome_original, tipo: anexo.tipo_mime });
    } else {
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = anexo.nome_original;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    }
    setBaixandoAnexoId('');
  }

  async function salvarPerfil(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const nome = nomeEmEdicao.trim();
    const email = emailEmEdicao.trim().toLowerCase();
    const cargo = cargoEmEdicao.trim();
    if (nome.length < 2 || nome.length > 120) {
      setErro(t('Informe um nome entre 2 e 120 caracteres.'));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      setErro(t('Informe um endereço de e-mail válido.'));
      return;
    }
    if (cargo.length < 2 || cargo.length > 120) {
      setErro(t('Informe um cargo ou função entre 2 e 120 caracteres.'));
      return;
    }
    setSalvandoPerfil(true);
    setErro('');
    if (cliente && !demonstracao) {
      const { data, error } = await cliente.rpc('atualizar_perfil_cliente_demonstrativo', {
        novo_nome: nome,
        novo_cargo: cargo,
      });
      if (error || !data) {
        setErro(error?.message || t('Não foi possível atualizar nome e cargo do perfil.'));
        setSalvandoPerfil(false);
        return;
      }
      if (email !== emailCliente.toLowerCase()) {
        const { error: erroEmail } = await cliente.rpc('atualizar_email_proprio_demonstrativo', { novo_email: email });
        if (erroEmail) {
          setErro(erroEmail.message || t('Nome e cargo foram salvos, mas não foi possível alterar o e-mail.'));
          setSalvandoPerfil(false);
          return;
        }
        await cliente.auth.refreshSession();
      }
    }
    setNomeCliente(nome);
    setNomeEmEdicao(nome);
    const emailMudou = email !== emailCliente.toLowerCase();
    setEmailCliente(email);
    setCargoCliente(cargo);
    setCargoEmEdicao(cargo);
    setEditandoPerfil(false);
    setAviso(emailMudou ? t('Nome, cargo e e-mail de acesso atualizados.') : t('Nome e cargo do perfil atualizados. A empresa e as permissões permanecem protegidas.'));
    setSalvandoPerfil(false);
  }

  async function baixarPdfPreProposta() {
    if (!selecionada || selecionada.valor_pre_proposta === null) return;
    if (!cliente || demonstracao) {
      setAviso(t('Na demonstração local, o PDF não é persistido. Use a homologação autenticada para testar o download protegido.'));
      return;
    }
    setBaixandoPdf(true);
    setErro('');
    const { data: referencias, error: erroReferencia } = await cliente.rpc('obter_pdf_pre_proposta_cliente', { solicitacao: selecionada.id });
    const referencia = (referencias?.[0] ?? null) as {
      caminho: string;
      hash_sha256: string;
    } | null;
    if (erroReferencia || !referencia) {
      setErro(t('O PDF emitido ainda não está disponível para download.'));
      setBaixandoPdf(false);
      return;
    }
    const { data, error } = await cliente.storage.from('pre-propostas').download(referencia.caminho);
    if (error || !data) setErro(t('Não foi possível baixar o PDF protegido.'));
    else {
      const bytes = new Uint8Array(await data.arrayBuffer());
      const hashCalculado = await calcularSha256Hex(bytes);
      if (hashCalculado !== referencia.hash_sha256) {
        setErro(t('A verificação de integridade do PDF falhou. O download foi bloqueado; avise a equipe do laboratório.'));
        setBaixandoPdf(false);
        return;
      }
      const nome = `pre-proposta-SOL-${String(selecionada.codigo).padStart(4, '0')}.pdf`;
      const url = URL.createObjectURL(data);
      setDocumento({ url, nome, tipo: 'application/pdf' });
      setAviso(`${t('PDF verificado:')} ${referencia.hash_sha256.slice(0, 12)}…`);
    }
    setBaixandoPdf(false);
  }

  async function aceitarPreProposta() {
    if (!selecionada || !podeAceitarPreProposta(selecionada.proposta_estado) || !confirmouAceite) return;
    setAceitandoPreProposta(true);
    setErro('');
    setAviso('');

    if (cliente && !demonstracao) {
      const { error } = await cliente.rpc('aceitar_pre_proposta_cliente', {
        solicitacao: selecionada.id,
        declaracao_versao: VERSAO_DECLARACAO_ACEITE_PRE_PROPOSTA,
      });
      if (error) {
        setErro(t(error.code === '23514' ? 'Esta pré-proposta não pode mais ser aceita. Atualize a página ou fale com a equipe.' : 'Não foi possível registrar o aceite da pré-proposta. Tente novamente.'));
        setAceitandoPreProposta(false);
        return;
      }
      await carregar();
    } else {
      setSolicitacoes((atuais) =>
        atuais.map((item) =>
          item.id === selecionada.id
            ? {
                ...item,
                proposta_estado: 'aceita',
                aceita_em: new Date().toISOString(),
              }
            : item,
        ),
      );
    }

    setConfirmouAceite(false);
    setAviso(t('Aceite registrado. O trabalho começará somente após a liberação do Administrador.'));
    setAceitandoPreProposta(false);
  }

  async function recusarPreProposta(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const motivo = normalizarMotivoRecusa(motivoRecusa);
    if (!selecionada || !podeRecusarPreProposta(selecionada.proposta_estado) || !motivo) return;
    setRecusandoPreProposta(true);
    setErro('');
    setAviso('');

    if (cliente && !demonstracao) {
      const { error } = await cliente.rpc('recusar_pre_proposta_cliente', {
        solicitacao: selecionada.id,
        motivo,
      });
      if (error) {
        setErro(t(error.code === '23514' ? 'Esta pré-proposta não pode mais ser recusada. Atualize a página e confira o estado atual.' : 'Não foi possível registrar a recusa. Tente novamente.'));
        setRecusandoPreProposta(false);
        return;
      }
      await carregar();
    } else {
      setSolicitacoes((atuais) =>
        atuais.map((item) =>
          item.id === selecionada.id
            ? {
                ...item,
                proposta_estado: 'recusada',
                recusada_em: new Date().toISOString(),
                recusa_motivo: motivo,
              }
            : item,
        ),
      );
    }

    setMotivoRecusa('');
    setRecusaAberta(false);
    setAviso(t('Recusa registrada. A equipe poderá preparar e emitir uma nova pré-proposta para este trabalho.'));
    setRecusandoPreProposta(false);
  }

  return (
    <main className="portal-cliente" data-hidratado={hidratado ? 'sim' : 'nao'}>
      <NotificacaoFlutuante mensagem={aviso} tipo="sucesso" aoFechar={() => setAviso('')} />
      <NotificacaoFlutuante mensagem={erro} tipo="erro" aoFechar={() => setErro('')} />
      <header className="topo-cliente">
        <a href="/" aria-label={t('Voltar ao site')}>
          <MarcaOficial />
        </a>
        <div>
          <span>{demonstracao ? t('DEMONSTRAÇÃO') : t('ÁREA DO CLIENTE')}</span>
          <strong>{nomeCliente}</strong>
          <small>{contexto.empresa_nome}</small>
        </div>
        <div className="acoes-topo-cliente"><SeletorIdioma compacto /><button type="button" onClick={() => (aoSair ? void aoSair() : window.location.assign('/'))}><LogOut size={17} /> {t('Sair')}</button></div>
      </header>
      <div className="conteudo-cliente">
        <section className="boas-vindas-cliente">
          <div>
            <p className="sobrelinha">
              <span /> {t('CENTRAL DO CLIENTE')}
            </p>
            <h1>{t('Todos os trabalhos da sua empresa em um só lugar.')}</h1>
            <p>{t('Abra novas solicitações, acompanhe vários trabalhos ao mesmo tempo e alterne livremente entre pré-propostas, etapas e mensagens sem repetir cadastro ou ativação.')}</p>
            <button className="novo-trabalho-cliente" type="button" onClick={() => setCriandoSolicitacao(true)}>
              <Plus size={18} /> {t('Registrar novo trabalho')}
            </button>
          </div>
          <aside className="resumo-acesso-cliente">
            <div className="selo-seguranca-cliente">
              <ShieldCheck size={22} />
              <span>
                <strong>{t('Acesso restrito à sua empresa')}</strong>
                <small>{t('Dados de homologação permanecem demonstrativos.')}</small>
              </span>
            </div>
            <div className="perfil-cliente">
              <UserRound size={20} />
              <span>
                <small>{t('Perfil')}</small>
                <strong>{cargoCliente}</strong>
                <em>{emailCliente}</em>
              </span>
              <button type="button" onClick={() => setEditandoPerfil(true)} aria-label={t('Editar dados do perfil')}>
                <Pencil size={15} />
              </button>
            </div>
            {editandoPerfil && (
              <form className="editar-perfil-cliente" onSubmit={salvarPerfil}>
                <label htmlFor="nome-cliente">{t('Nome de exibição')}</label>
                <input id="nome-cliente" required minLength={2} maxLength={120} value={nomeEmEdicao} onChange={(evento) => setNomeEmEdicao(evento.target.value)} />
                <label htmlFor="email-cliente">{t('E-mail de acesso')}</label>
                <input id="email-cliente" type="email" required value={emailEmEdicao} onChange={(evento) => setEmailEmEdicao(evento.target.value)} />
                <label htmlFor="cargo-cliente">{t('Cargo ou função na empresa')}</label>
                <input id="cargo-cliente" required minLength={2} maxLength={120} value={cargoEmEdicao} onChange={(evento) => setCargoEmEdicao(evento.target.value)} placeholder={t('Ex.: Analista da qualidade')} />
                <small>{t('Este campo descreve sua função profissional e não altera suas permissões de acesso.')}</small>
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setNomeEmEdicao(nomeCliente);
                      setEmailEmEdicao(emailCliente);
                      setCargoEmEdicao(cargoCliente);
                      setEditandoPerfil(false);
                    }}
                  >
                    <X size={15} /> {t('Cancelar')}
                  </button>
                  <button type="submit" disabled={salvandoPerfil}>
                    <Save size={15} /> {salvandoPerfil ? t('Salvando…') : t('Salvar')}
                  </button>
                </div>
              </form>
            )}
          </aside>
        </section>

        <section className="indicadores-cliente" aria-label={t('Resumo dos trabalhos')}>
          <button type="button" onClick={() => abrirTrabalhosComFiltro('todos')}>
            <BriefcaseBusiness size={21} />
            <span>
              <small>{t('Trabalhos vinculados')}</small>
              <strong>{indicadores.total}</strong>
            </span>
          </button>
          <button type="button" onClick={() => abrirTrabalhosComFiltro('ativos')}>
            <Activity size={21} />
            <span>
              <small>{t('Em execução')}</small>
              <strong>{indicadores.emExecucao}</strong>
            </span>
          </button>
          <button type="button" onClick={() => abrirTrabalhosComFiltro('aguardando')}>
            <CheckCircle2 size={21} />
            <span>
              <small>{t('Aguardando sua decisão')}</small>
              <strong>{indicadores.aguardandoCliente}</strong>
            </span>
          </button>
          <button type="button" onClick={() => document.getElementById('mensagens-trabalho-cliente')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
            <MessageSquareText size={21} />
            <span><small>{t('Mensagens não lidas')}</small><strong>{indicadores.mensagens}</strong></span>
          </button>
        </section>

        <div id="trabalhos-cliente" />
        {solicitacoes.length > 0 && (
          <BarraBuscaFiltros
            busca={buscaTrabalho}
            aoMudarBusca={setBuscaTrabalho}
            placeholder={t('Pesquisar por protocolo, serviço, estado ou data')}
            total={solicitacoesVisiveis.length}
            traduzir={t}
            ordenacao={{ valor: ordenacaoTrabalho, aoMudar: setOrdenacaoTrabalho, opcoes: [{ valor: 'recentes', rotulo: t('Mais novos primeiro') }, { valor: 'antigas', rotulo: t('Mais antigos primeiro') }, { valor: 'maior_valor', rotulo: t('Maior valor') }, { valor: 'servico', rotulo: t('Tipo de serviço') }] }}
            filtros={[
              {
                id: 'estado-trabalho',
                rotulo: t('Situação'),
                valor: filtroTrabalho,
                aoMudar: setFiltroTrabalho,
                opcoes: [
                  { valor: 'todos', rotulo: t('Todos os trabalhos') },
                  { valor: 'aguardando', rotulo: t('Aguardando minha decisão') },
                  { valor: 'ativos', rotulo: t('Serviços ativos') },
                  { valor: 'concluidos', rotulo: t('Serviços concluídos') },
                  { valor: 'recusados', rotulo: t('Revisão solicitada') },
                  { valor: 'sem_proposta', rotulo: t('Ainda sem pré-proposta') },
                ],
              },
            ]}
          />
        )}

        {carregando && (
          <div className="aviso-cliente" role="status">
            <RefreshCw size={18} /> {t('Carregando acompanhamento…')}
          </div>
        )}
        {!carregando && solicitacoes.length === 0 && (
          <section className="vazio-cliente">
            <FileText size={30} />
            <h2>{t('Comece seu primeiro trabalho')}</h2>
            <p>{t('Registre a solicitação nesta área protegida. Ela já nascerá vinculada à sua empresa e aparecerá aqui imediatamente.')}</p>
            <button className="botao" type="button" onClick={() => setCriandoSolicitacao(true)}>
              {t('Registrar solicitação')}
            </button>
          </section>
        )}

        {selecionada && (
          <div className="grade-cliente">
            <aside className="lista-projetos-cliente">
              <header>
                <div>
                  <h2>{t('Seus trabalhos')}</h2>
                  <small>{t('Selecione o que deseja acompanhar')}</small>
                </div>
                <button className="adicionar-trabalho-lista" type="button" onClick={() => setCriandoSolicitacao(true)} aria-label={t('Registrar novo trabalho')}>
                  <Plus size={17} />
                </button>
              </header>
              {solicitacoesVisiveis.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={item.id === selecionada.id ? 'ativo' : ''}
                  onClick={() => {
                    setSelecionadaId(item.id);
                    setConfirmouAceite(false);
                    setRecusaAberta(false);
                    setMotivoRecusa('');
                  }}
                >
                  <span>{protocoloSolicitacaoCliente(item)}</span>
                  <strong>{t(tituloServicoCliente(item.servico))}</strong>
                  <small className="detalhes-necessidade-cliente">{item.quantidade ? `${item.quantidade} ${t('peça(s)')}` : t('Quantidade não informada')}{item.material ? ` · ${t(item.material)}` : ''}</small>
                  {item.descricao && <small className="descricao-necessidade-cliente" title={item.descricao}>{item.descricao}</small>}
                  <small>{t('Recebida em')} {formatarData(item.criada_em)}</small>
                </button>
              ))}
              {solicitacoesVisiveis.length === 0 && <p className="sem-resultados-filtro">{t('Nenhum trabalho corresponde à pesquisa e aos filtros.')}</p>}
            </aside>
            <section className="detalhe-projeto-cliente">
              <header>
                <div>
                  <span>{protocoloSolicitacaoCliente(selecionada)}</span>
                  <h2>{t(tituloServicoCliente(selecionada.servico))}</h2>
                </div>
                <button type="button" onClick={() => void carregar()}>
                  <RefreshCw size={15} /> {t('Atualizar')}
                </button>
              </header>
              <div className="resumo-projeto-cliente">
                <article>
                  <small>{t('Pré-proposta comercial')}</small>
                  <strong>{selecionada.valor_pre_proposta === null ? t('Ainda não emitida') : formatarDinheiro(selecionada.valor_pre_proposta, 'BRL', idioma)}</strong>
                  <span>{selecionada.valor_pre_proposta === null ? t('Será exibida após análise e publicação pela equipe.') : selecionada.prazo_pagamento_dias ? `${t('Pagamento desejado:')} ${selecionada.prazo_pagamento_dias} ${t('dias')}` : t('Condição em análise')}</span>
                  {selecionada.valor_pre_proposta !== null && (
                    <button className="baixar-pdf-cliente" type="button" onClick={() => void baixarPdfPreProposta()} disabled={baixandoPdf}>
                      <Eye size={15} /> {baixandoPdf ? t('Carregando…') : t('Visualizar PDF emitido')}
                    </button>
                  )}
                  {podeAceitarPreProposta(selecionada.proposta_estado) && (
                    <div className="aceite-pre-proposta-cliente">
                      <strong>{t('Qual é sua decisão?')}</strong>
                      <p>{t('O aceite manifesta interesse nesta pré-proposta do laboratório e não substitui a proposta oficial do Nectar. Se algo precisar mudar, recuse e explique o ajuste necessário; a equipe poderá emitir uma nova pré-proposta.')}</p>
                      <label>
                        <input type="checkbox" checked={confirmouAceite} onChange={(evento) => setConfirmouAceite(evento.target.checked)} /> {t('Li e desejo prosseguir com esta pré-proposta.')}
                      </label>
                      <div className="acoes-decisao-cliente">
                        <button type="button" onClick={() => void aceitarPreProposta()} disabled={!confirmouAceite || aceitandoPreProposta || recusandoPreProposta}>
                          <CheckCircle2 size={16} /> {aceitandoPreProposta ? t('Registrando…') : t('Aceitar pré-proposta')}
                        </button>
                        <button className="recusar-pre-proposta" type="button" onClick={() => setRecusaAberta((aberta) => !aberta)} disabled={aceitandoPreProposta || recusandoPreProposta}>
                          <Ban size={16} /> {t('Recusar e solicitar revisão')}
                        </button>
                      </div>
                      {recusaAberta && (
                        <form className="formulario-recusa-cliente" onSubmit={recusarPreProposta}>
                          <label htmlFor="motivo-recusa-cliente">
                            {t('O que precisa ser alterado?')}
                            <textarea id="motivo-recusa-cliente" required minLength={5} maxLength={1000} value={motivoRecusa} onChange={(evento) => setMotivoRecusa(evento.target.value)} placeholder={t('Ex.: prazo, escopo, quantidade ou condição comercial')} />
                          </label>
                          <div>
                            <button
                              type="button"
                              onClick={() => {
                                setRecusaAberta(false);
                                setMotivoRecusa('');
                              }}
                            >
                              {t('Cancelar')}
                            </button>
                            <button type="submit" disabled={!normalizarMotivoRecusa(motivoRecusa) || recusandoPreProposta}>
                              {recusandoPreProposta ? t('Registrando…') : t('Confirmar recusa')}
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}
                  {selecionada.proposta_estado === 'aceita' && (
                    <div className="aceite-pre-proposta-cliente confirmado">
                      <CheckCircle2 size={20} />
                      <div>
                        <strong>{t('Aceite registrado')}</strong>
                        <p>{tm(descricaoAceiteCliente(selecionada.aceita_em, selecionada.execucao_estado, formatarData))}</p>
                      </div>
                    </div>
                  )}
                  {selecionada.proposta_estado === 'recusada' && (
                    <div className="aceite-pre-proposta-cliente recusada">
                      <Ban size={20} />
                      <div>
                        <strong>{t('Revisão solicitada')}</strong>
                        <p>{selecionada.recusa_motivo || t('A equipe foi informada e poderá enviar uma nova pré-proposta.')}</p>
                        {selecionada.recusada_em && <small>{t('Registrada em')} {formatarData(selecionada.recusada_em)}</small>}
                      </div>
                    </div>
                  )}
                </article>
                <article>
                  <small>{t('Andamento do serviço')}</small>
                  <strong>{situacaoAtual ? t(situacaoAtual.titulo) : ''}</strong>
                  <span>{situacaoAtual ? tm(situacaoAtual.descricao) : ''}</span>
                </article>
              </div>
              <section className="anexos-trabalho-cliente">
                <div className="titulo-bloco-cliente">
                  <div>
                    <h3>
                      <Paperclip size={18} /> {t('Arquivos da solicitação')}
                    </h3>
                    <p>{t('Documentos privados vinculados somente a este trabalho.')}</p>
                  </div>
                </div>
                {(anexosPorSolicitacao[selecionada.id] ?? []).length === 0 ? (
                  <p className="sem-anexos-cliente">{t('Nenhum arquivo foi anexado a esta solicitação.')}</p>
                ) : (
                  <ul>
                    {(anexosPorSolicitacao[selecionada.id] ?? []).map((anexo) => (
                      <li key={anexo.id}>
                        <Paperclip size={17} />
                        <span>
                          <strong>{anexo.nome_original}</strong>
                          <small>
                            {(Number(anexo.tamanho_bytes) / 1024 / 1024).toFixed(2)} MB · {t('enviado em')} {formatarData(anexo.criado_em)}
                          </small>
                        </span>
                        <button type="button" onClick={() => void baixarAnexo(anexo)} disabled={baixandoAnexoId === anexo.id}>
                          {documentoPodeSerVisualizado(anexo.tipo_mime, anexo.nome_original) ? <Eye size={15} /> : <Download size={15} />} {baixandoAnexoId === anexo.id ? t('Carregando…') : documentoPodeSerVisualizado(anexo.tipo_mime, anexo.nome_original) ? t('Visualizar') : t('Baixar')}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <section className="acompanhamento-etapas">
                <div className="titulo-bloco-cliente">
                  <div>
                      <h3>{t('Etapas do trabalho')}</h3>
                    <p>{t('A porcentagem indica o progresso da etapa atual, não do contrato inteiro.')}</p>
                  </div>
                </div>
                {selecionada.etapas.length === 0 ? (
                  <div className="sem-etapas-cliente">
                    <Clock3 size={22} />
                    <div>
                      <strong>{t('A equipe ainda está preparando o acompanhamento')}</strong>
                      <p>{t('As etapas aparecerão aqui depois da triagem inicial da solicitação.')}</p>
                    </div>
                  </div>
                ) : (
                  <ol>
                    {selecionada.etapas.map((etapa) => {
                      const { rotulo, Icone } = estadoEtapa[etapa.estado];
                      return (
                        <li key={etapa.id} className={`etapa-${etapa.estado}`}>
                          <span className="icone-etapa">
                            <Icone size={20} />
                          </span>
                          <div>
                            <header>
                              <strong>{t(etapa.titulo)}</strong>
                              <b>
                                {t(rotulo)}
                                {etapa.estado === 'em_andamento' ? ` (${etapa.progresso}%)` : ''}
                              </b>
                            </header>
                            {etapa.descricao && <p>{t(etapa.descricao)}</p>}
                            <div className="barra-progresso" aria-label={`${etapa.progresso}% ${t('concluído')}`}>
                              <i style={{ width: `${etapa.progresso}%` }} />
                            </div>
                            <small>{t('Atualizado em')} {formatarData(etapa.atualizada_em)}</small>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </section>
              <section className="mensagens-cliente" id="mensagens-trabalho-cliente">
                <div className="titulo-bloco-cliente">
                  <div>
                    <h3>
                      <MessageSquareText size={18} /> {t('Mensagens')}
                    </h3>
                    <p>{t('Canal vinculado a esta solicitação.')}</p>
                  </div>
                </div>
                <div className="lista-mensagens-cliente">
                  {mensagens.map((mensagem) => (
                    <p key={mensagem.id} className={mensagem.autor_proprio ? 'propria' : ''}>
                      {mensagem.conteudo}
                      {mensagem.anexos?.map((anexo) => (
                        <button type="button" className="anexo-mensagem" key={anexo.id} onClick={() => void baixarAnexoMensagem(anexo)} disabled={baixandoAnexoId === anexo.id}>
                          <FileText size={14} /> {anexo.nome_original} <Download size={13} />
                        </button>
                      ))}
                      <small>{formatarData(mensagem.criada_em)}</small>
                    </p>
                  ))}
                </div>
                <form onSubmit={enviarMensagem}>
                  <label htmlFor="mensagem-cliente" className="sr-only">
                    {t('Nova mensagem')}
                  </label>
                  <input id="mensagem-cliente" required maxLength={5000} value={mensagemNova} onChange={(evento) => setMensagemNova(evento.target.value)} placeholder={t('Escreva uma mensagem para a equipe')} />
                  <label className="anexar-mensagem"><Paperclip size={16} /><span>{t('Anexar')}</span><input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,.step,.stp,.iges,.igs,.stl,.obj,.dxf,.dwg" onChange={(evento) => selecionarArquivosMensagem(evento.target.files)} /></label>
                  <button type="submit">
                    <Send size={16} /> {t('Enviar')}
                  </button>
                </form>
                {arquivosMensagem.length > 0 && <div className="arquivos-mensagem-selecionados">{arquivosMensagem.map((arquivo, indice) => <span key={`${arquivo.name}-${indice}`}>{arquivo.name}<button type="button" aria-label={`${t('Remover')} ${arquivo.name}`} onClick={() => setArquivosMensagem((atuais) => atuais.filter((_, posicao) => posicao !== indice))}><X size={12} /></button></span>)}</div>}
              </section>
            </section>
          </div>
        )}
        <ContatoEmail compacto contexto={selecionada ? protocoloSolicitacaoCliente(selecionada) : contexto.empresa_nome} />
      </div>

      {criandoSolicitacao && <NovaSolicitacaoCliente cliente={cliente} demonstracao={demonstracao} empresaNome={contexto.empresa_nome} aoFechar={() => setCriandoSolicitacao(false)} aoCriada={registrarNovaSolicitacao} />}
      {documento && <VisualizadorDocumento documento={documento} aoFechar={() => { URL.revokeObjectURL(documento.url); setDocumento(null); }} />}

      {!aceitouPrivacidade && (
        <div className="fundo-modal-privacidade" role="presentation">
          <section className="modal-privacidade" role="dialog" aria-modal="true" aria-labelledby="titulo-modal-privacidade">
            <span>
              <ShieldCheck size={21} /> {t('Proteção de dados')}
            </span>
            <h2 id="titulo-modal-privacidade">{t('Antes de acessar sua área')}</h2>
            <p>{t('Usamos seus dados para identificar a empresa, analisar solicitações, acompanhar trabalhos e manter este canal de mensagens. O acesso é restrito a usuários aprovados e à equipe autorizada.')}</p>
            <ul>
              <li>{t('Não envie dados pessoais ou industriais que não sejam necessários ao serviço.')}</li>
              <li>{t('Arquivos e mensagens ficam vinculados à solicitação e protegidos por controle de acesso.')}</li>
              <li>{t('Você pode consultar a política completa e solicitar correção ou atendimento pelo canal informado nela.')}</li>
            </ul>
            <label>
              <input type="checkbox" required checked readOnly /> {t('Li e estou ciente deste aviso de privacidade.')}
            </label>
            <div>
              <a href="/privacidade" target="_blank" rel="noreferrer">
                {t('Ler política completa')}
              </a>
              <button type="button" onClick={() => void aceitarPrivacidade()} disabled={aceitando}>
                <Check size={16} /> {aceitando ? t('Registrando…') : t('Continuar')}
              </button>
            </div>
            <small>{t('Versão')} {VERSAO_AVISO_PRIVACIDADE} · {t('texto de homologação sujeito à validação institucional.')}</small>
          </section>
        </div>
      )}
    </main>
  );
}
