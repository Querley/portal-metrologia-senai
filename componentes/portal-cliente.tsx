'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { Activity, Ban, BriefcaseBusiness, Check, CheckCircle2, Circle, Clock3, Download, FileText, LogOut, MessageSquareText, Paperclip, Pencil, Plus, RefreshCw, Save, Send, ShieldCheck, UserRound, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { AnexoSolicitacaoCliente } from '../lib/anexos-solicitacao';
import { correspondeBusca } from '../lib/busca-e-filtros';
import { formatarDinheiro } from '../lib/calculos';
import { calcularSha256Hex } from '../lib/pre-proposta-pdf';
import { contextoClienteDemonstracao, descricaoAceiteCliente, mensagensClienteDemonstracao, normalizarMotivoRecusa, podeAceitarPreProposta, podeRecusarPreProposta, protocoloSolicitacaoCliente, situacaoEtapasCliente, solicitacoesClienteDemonstracao, tituloServicoCliente, type ContextoCliente, type MensagemCliente, type SolicitacaoCliente, VERSAO_AVISO_PRIVACIDADE, VERSAO_DECLARACAO_ACEITE_PRE_PROPOSTA } from '../lib/portal-cliente';
import { BarraBuscaFiltros } from './barra-busca-filtros';
import { ContatoEmail } from './contato-email';
import { MarcaOficial } from './marca-oficial';
import { NovaSolicitacaoCliente, type DadosNovaSolicitacaoCliente } from './nova-solicitacao-cliente';

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

function dataCurta(valor: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(valor));
}

export function PortalCliente({ cliente, contexto = contextoClienteDemonstracao, demonstracao = false, aoSair, mensagemInicial = '' }: Propriedades) {
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoCliente[]>(demonstracao ? solicitacoesClienteDemonstracao : []);
  const [selecionadaId, setSelecionadaId] = useState(demonstracao ? solicitacoesClienteDemonstracao[0].id : '');
  const [mensagens, setMensagens] = useState<MensagemCliente[]>(demonstracao ? mensagensClienteDemonstracao : []);
  const [mensagemNova, setMensagemNova] = useState('');
  const [carregando, setCarregando] = useState(!demonstracao);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState(mensagemInicial);
  const [aceitouPrivacidade, setAceitouPrivacidade] = useState(contexto.versao_aviso_privacidade === VERSAO_AVISO_PRIVACIDADE);
  const [aceitando, setAceitando] = useState(false);
  const [nomeCliente, setNomeCliente] = useState(contexto.usuario_nome);
  const [nomeEmEdicao, setNomeEmEdicao] = useState(contexto.usuario_nome);
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
  const [criandoSolicitacao, setCriandoSolicitacao] = useState(false);
  const [anexosPorSolicitacao, setAnexosPorSolicitacao] = useState<Record<string, AnexoSolicitacaoCliente[]>>({});
  const [baixandoAnexoId, setBaixandoAnexoId] = useState('');
  const hidratado = useSyncExternalStore(() => () => undefined, () => true, () => false);

  const carregar = useCallback(async () => {
    if (!cliente || demonstracao) return;
    setCarregando(true);
    setErro('');
    const { data, error } = await cliente.rpc('listar_portal_cliente');
    if (error) setErro('Não foi possível carregar seu acompanhamento. Tente novamente.');
    else {
      const lista = (Array.isArray(data) ? data : []) as SolicitacaoCliente[];
      setSolicitacoes(lista);
      setSelecionadaId((atual) => atual || lista[0]?.id || '');
    }
    setCarregando(false);
  }, [cliente, demonstracao]);

  const carregarMensagens = useCallback(async (solicitacaoId: string) => {
    if (!cliente || demonstracao || !solicitacaoId) return;
    const { data, error } = await cliente.rpc('listar_mensagens_cliente', { solicitacao: solicitacaoId });
    if (!error) setMensagens((data ?? []) as MensagemCliente[]);
  }, [cliente, demonstracao]);

  const carregarAnexos = useCallback(async (solicitacaoId: string) => {
    if (!cliente || demonstracao || !solicitacaoId) return;
    const { data, error } = await cliente.rpc('listar_anexos_solicitacao_cliente_demonstrativa', { solicitacao: solicitacaoId });
    if (!error) setAnexosPorSolicitacao((atuais) => ({ ...atuais, [solicitacaoId]: (data ?? []) as AnexoSolicitacaoCliente[] }));
  }, [cliente, demonstracao]);

  useEffect(() => { queueMicrotask(() => void carregar()); }, [carregar]);
  useEffect(() => {
    if (!cliente || demonstracao) return;
    const canal = cliente
      .channel('etapas-portal-cliente')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'etapas_execucao' }, () => void carregar())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'etapas_execucao' }, () => void carregar())
      .subscribe();
    return () => { void cliente.removeChannel(canal); };
  }, [carregar, cliente, demonstracao]);

  const solicitacoesVisiveis = useMemo(() => solicitacoes.filter((item) => {
    const corresponde = correspondeBusca(buscaTrabalho, protocoloSolicitacaoCliente(item), tituloServicoCliente(item.servico), item.estado, item.proposta_estado, item.execucao_estado);
    if (!corresponde || filtroTrabalho === 'todos') return corresponde;
    if (filtroTrabalho === 'aguardando') return item.proposta_estado === 'publicada';
    if (filtroTrabalho === 'ativos') return item.execucao_estado === 'planejado' || item.execucao_estado === 'em_execucao';
    if (filtroTrabalho === 'concluidos') return item.execucao_estado === 'concluido';
    if (filtroTrabalho === 'recusados') return item.proposta_estado === 'recusada';
    if (filtroTrabalho === 'sem_proposta') return !item.proposta_estado;
    return true;
  }), [buscaTrabalho, filtroTrabalho, solicitacoes]);
  const selecionada = useMemo(() => solicitacoesVisiveis.find((item) => item.id === selecionadaId) ?? solicitacoesVisiveis[0], [selecionadaId, solicitacoesVisiveis]);
  const selecionadaIdEfetiva = selecionada?.id ?? '';
  useEffect(() => { queueMicrotask(() => void carregarMensagens(selecionadaIdEfetiva)); }, [carregarMensagens, selecionadaIdEfetiva]);
  useEffect(() => { queueMicrotask(() => void carregarAnexos(selecionadaIdEfetiva)); }, [carregarAnexos, selecionadaIdEfetiva]);
  useEffect(() => {
    if (!cliente || demonstracao || !selecionadaIdEfetiva) return;
    const canal = cliente
      .channel(`mensagens-cliente-${selecionadaIdEfetiva}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens', filter: `solicitacao_id=eq.${selecionadaIdEfetiva}` }, () => void carregarMensagens(selecionadaIdEfetiva))
      .subscribe();
    return () => { void cliente.removeChannel(canal); };
  }, [carregarMensagens, cliente, demonstracao, selecionadaIdEfetiva]);
  const situacaoAtual = useMemo(() => selecionada
    ? situacaoEtapasCliente(selecionada.etapas, selecionada.execucao_estado, selecionada.proposta_estado)
    : null, [selecionada]);
  const indicadores = useMemo(() => ({
    total: solicitacoes.length,
    emExecucao: solicitacoes.filter((item) => item.execucao_estado === 'em_execucao').length,
    aguardandoCliente: solicitacoes.filter((item) => item.proposta_estado === 'publicada').length,
  }), [solicitacoes]);

  async function registrarNovaSolicitacao(
    resultado: { solicitacao_id: string; codigo: number; protocolo: string },
    dados: DadosNovaSolicitacaoCliente,
    anexos: AnexoSolicitacaoCliente[],
  ) {
    if (demonstracao) {
      setSolicitacoes((atuais) => [{
        id: resultado.solicitacao_id,
        codigo: resultado.codigo,
        protocolo: resultado.protocolo,
        estado: 'nova',
        criada_em: new Date().toISOString(),
        servico: dados.necessidade,
        proposta_estado: null,
        valor_pre_proposta: null,
        prazo_pagamento_dias: dados.prazo_pagamento_dias,
        aceita_em: null,
        execucao_estado: null,
        etapas: [],
      }, ...atuais]);
    } else {
      await carregar();
    }
    setAnexosPorSolicitacao((atuais) => ({ ...atuais, [resultado.solicitacao_id]: anexos }));
    setSelecionadaId(resultado.solicitacao_id);
    setCriandoSolicitacao(false);
    setAviso(`${resultado.protocolo} registrada e vinculada à sua empresa. Você já pode alternar entre os trabalhos.`);
  }

  async function baixarAnexo(anexo: AnexoSolicitacaoCliente) {
    if (!cliente || demonstracao) {
      setAviso('Na demonstração local, o arquivo é apenas representativo. Use a homologação autenticada para testar o download privado.');
      return;
    }
    setBaixandoAnexoId(anexo.id);
    setErro('');
    const { data, error } = await cliente.storage.from('solicitacoes').download(anexo.caminho_storage);
    if (error || !data) setErro('Não foi possível baixar este anexo protegido.');
    else {
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
        setErro('Não foi possível registrar a ciência do aviso de privacidade.');
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
      const { error } = await cliente.rpc('enviar_mensagem_cliente', { solicitacao: selecionada.id, conteudo });
      if (error) {
        setErro('Não foi possível enviar a mensagem.');
        return;
      }
      await carregarMensagens(selecionada.id);
    } else {
      setMensagens((atuais) => [...atuais, { id: `demo-${Date.now()}`, autor_proprio: true, conteudo, criada_em: new Date().toISOString() }]);
    }
    setMensagemNova('');
  }

  async function salvarPerfil(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const nome = nomeEmEdicao.trim();
    if (nome.length < 2 || nome.length > 120) {
      setErro('Informe um nome entre 2 e 120 caracteres.');
      return;
    }
    setSalvandoPerfil(true);
    setErro('');
    if (cliente && !demonstracao) {
      const { data, error } = await cliente.rpc('atualizar_nome_cliente', { nome });
      if (error || typeof data !== 'string') {
        setErro('Não foi possível atualizar o nome do perfil.');
        setSalvandoPerfil(false);
        return;
      }
    }
    setNomeCliente(nome);
    setNomeEmEdicao(nome);
    setEditandoPerfil(false);
    setAviso('Nome do perfil atualizado. Função e empresa permanecem protegidas.');
    setSalvandoPerfil(false);
  }

  async function baixarPdfPreProposta() {
    if (!selecionada || selecionada.valor_pre_proposta === null) return;
    if (!cliente || demonstracao) {
      setAviso('Na demonstração local, o PDF não é persistido. Use a homologação autenticada para testar o download protegido.');
      return;
    }
    setBaixandoPdf(true);
    setErro('');
    const { data: referencias, error: erroReferencia } = await cliente.rpc('obter_pdf_pre_proposta_cliente', { solicitacao: selecionada.id });
    const referencia = (referencias?.[0] ?? null) as { caminho: string; hash_sha256: string } | null;
    if (erroReferencia || !referencia) {
      setErro('O PDF emitido ainda não está disponível para download.');
      setBaixandoPdf(false);
      return;
    }
    const { data, error } = await cliente.storage.from('pre-propostas').download(referencia.caminho);
    if (error || !data) setErro('Não foi possível baixar o PDF protegido.');
    else {
      const bytes = new Uint8Array(await data.arrayBuffer());
      const hashCalculado = await calcularSha256Hex(bytes);
      if (hashCalculado !== referencia.hash_sha256) {
        setErro('A verificação de integridade do PDF falhou. O download foi bloqueado; avise a equipe do laboratório.');
        setBaixandoPdf(false);
        return;
      }
      const url = URL.createObjectURL(data);
      const ancora = document.createElement('a');
      ancora.href = url;
      ancora.download = `pre-proposta-SOL-${String(selecionada.codigo).padStart(4, '0')}.pdf`;
      ancora.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      setAviso(`PDF verificado: ${referencia.hash_sha256.slice(0, 12)}…`);
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
        setErro(error.code === '23514'
          ? 'Esta pré-proposta não pode mais ser aceita. Atualize a página ou fale com a equipe.'
          : 'Não foi possível registrar o aceite da pré-proposta. Tente novamente.');
        setAceitandoPreProposta(false);
        return;
      }
      await carregar();
    } else {
      setSolicitacoes((atuais) => atuais.map((item) => item.id === selecionada.id
        ? { ...item, proposta_estado: 'aceita', aceita_em: new Date().toISOString() }
        : item));
    }

    setConfirmouAceite(false);
    setAviso('Aceite registrado. O trabalho começará somente após a liberação do Administrador.');
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
      const { error } = await cliente.rpc('recusar_pre_proposta_cliente', { solicitacao: selecionada.id, motivo });
      if (error) {
        setErro(error.code === '23514'
          ? 'Esta pré-proposta não pode mais ser recusada. Atualize a página e confira o estado atual.'
          : 'Não foi possível registrar a recusa. Tente novamente.');
        setRecusandoPreProposta(false);
        return;
      }
      await carregar();
    } else {
      setSolicitacoes((atuais) => atuais.map((item) => item.id === selecionada.id
        ? { ...item, proposta_estado: 'recusada', recusada_em: new Date().toISOString(), recusa_motivo: motivo }
        : item));
    }

    setMotivoRecusa('');
    setRecusaAberta(false);
    setAviso('Recusa registrada. A equipe poderá preparar e emitir uma nova pré-proposta para este trabalho.');
    setRecusandoPreProposta(false);
  }

  return <main className="portal-cliente" data-hidratado={hidratado ? 'sim' : 'nao'}>
    <header className="topo-cliente"><a href="/" aria-label="Voltar ao site"><MarcaOficial /></a><div><span>{demonstracao ? 'DEMONSTRAÇÃO' : 'ÁREA DO CLIENTE'}</span><strong>{nomeCliente}</strong><small>{contexto.empresa_nome}</small></div><button type="button" onClick={() => aoSair ? void aoSair() : window.location.assign('/')}><LogOut size={17} /> Sair</button></header>
    <div className="conteudo-cliente">
      <section className="boas-vindas-cliente"><div><p className="sobrelinha"><span /> CENTRAL DO CLIENTE</p><h1>Todos os trabalhos da sua empresa em um só lugar.</h1><p>Abra novas solicitações, acompanhe vários trabalhos ao mesmo tempo e alterne livremente entre pré-propostas, etapas e mensagens sem repetir cadastro ou ativação.</p><button className="novo-trabalho-cliente" type="button" onClick={() => setCriandoSolicitacao(true)}><Plus size={18} /> Registrar novo trabalho</button></div><aside className="resumo-acesso-cliente"><div className="selo-seguranca-cliente"><ShieldCheck size={22} /><span><strong>Acesso restrito à sua empresa</strong><small>Dados de homologação permanecem demonstrativos.</small></span></div><div className="perfil-cliente"><UserRound size={20} /><span><small>Perfil</small><strong>{contexto.perfil === 'gestor_empresa' ? 'Gestor da empresa' : 'Contato da empresa'}</strong><em>{contexto.usuario_email}</em></span><button type="button" onClick={() => setEditandoPerfil(true)} aria-label="Editar nome do perfil"><Pencil size={15} /></button></div>{editandoPerfil && <form className="editar-perfil-cliente" onSubmit={salvarPerfil}><label htmlFor="nome-cliente">Nome de exibição</label><input id="nome-cliente" required minLength={2} maxLength={120} value={nomeEmEdicao} onChange={(evento) => setNomeEmEdicao(evento.target.value)} /><div><button type="button" onClick={() => { setNomeEmEdicao(nomeCliente); setEditandoPerfil(false); }}><X size={15} /> Cancelar</button><button type="submit" disabled={salvandoPerfil}><Save size={15} /> {salvandoPerfil ? 'Salvando…' : 'Salvar'}</button></div></form>}</aside></section>

      <section className="indicadores-cliente" aria-label="Resumo dos trabalhos"><article><BriefcaseBusiness size={21} /><span><small>Trabalhos vinculados</small><strong>{indicadores.total}</strong></span></article><article><Activity size={21} /><span><small>Em execução</small><strong>{indicadores.emExecucao}</strong></span></article><article><CheckCircle2 size={21} /><span><small>Aguardando sua decisão</small><strong>{indicadores.aguardandoCliente}</strong></span></article></section>

      {solicitacoes.length > 0 && <BarraBuscaFiltros busca={buscaTrabalho} aoMudarBusca={setBuscaTrabalho} placeholder="Pesquisar por protocolo, serviço ou estado" total={solicitacoesVisiveis.length} filtros={[{ id: 'estado-trabalho', rotulo: 'Situação', valor: filtroTrabalho, aoMudar: setFiltroTrabalho, opcoes: [{ valor: 'todos', rotulo: 'Todos os trabalhos' }, { valor: 'aguardando', rotulo: 'Aguardando minha decisão' }, { valor: 'ativos', rotulo: 'Serviços ativos' }, { valor: 'concluidos', rotulo: 'Serviços concluídos' }, { valor: 'recusados', rotulo: 'Revisão solicitada' }, { valor: 'sem_proposta', rotulo: 'Ainda sem pré-proposta' }] }]} />}

      {aviso && <div className="aviso-cliente sucesso" role="status">{aviso}<button type="button" onClick={() => setAviso('')} aria-label="Fechar aviso">×</button></div>}
      {erro && <div className="aviso-cliente erro" role="alert">{erro}</div>}
      {carregando && <div className="aviso-cliente" role="status"><RefreshCw size={18} /> Carregando acompanhamento…</div>}
      {!carregando && solicitacoes.length === 0 && <section className="vazio-cliente"><FileText size={30} /><h2>Comece seu primeiro trabalho</h2><p>Registre a solicitação nesta área protegida. Ela já nascerá vinculada à sua empresa e aparecerá aqui imediatamente.</p><button className="botao" type="button" onClick={() => setCriandoSolicitacao(true)}>Registrar solicitação</button></section>}

      {selecionada && <div className="grade-cliente">
        <aside className="lista-projetos-cliente"><header><div><h2>Seus trabalhos</h2><small>Selecione o que deseja acompanhar</small></div><button className="adicionar-trabalho-lista" type="button" onClick={() => setCriandoSolicitacao(true)} aria-label="Registrar novo trabalho"><Plus size={17} /></button></header>{solicitacoesVisiveis.map((item) => <button key={item.id} type="button" className={item.id === selecionada.id ? 'ativo' : ''} onClick={() => { setSelecionadaId(item.id); setConfirmouAceite(false); setRecusaAberta(false); setMotivoRecusa(''); }}><span>{protocoloSolicitacaoCliente(item)}</span><strong>{tituloServicoCliente(item.servico)}</strong><small>Recebida em {dataCurta(item.criada_em)}</small></button>)}{solicitacoesVisiveis.length === 0 && <p className="sem-resultados-filtro">Nenhum trabalho corresponde à pesquisa e aos filtros.</p>}</aside>
        <section className="detalhe-projeto-cliente">
          <header><div><span>{protocoloSolicitacaoCliente(selecionada)}</span><h2>{tituloServicoCliente(selecionada.servico)}</h2></div><button type="button" onClick={() => void carregar()}><RefreshCw size={15} /> Atualizar</button></header>
          <div className="resumo-projeto-cliente"><article><small>Pré-proposta comercial</small><strong>{selecionada.valor_pre_proposta === null ? 'Ainda não emitida' : formatarDinheiro(selecionada.valor_pre_proposta)}</strong><span>{selecionada.valor_pre_proposta === null ? 'Será exibida após análise e publicação pela equipe.' : (selecionada.prazo_pagamento_dias ? `Pagamento desejado: ${selecionada.prazo_pagamento_dias} dias` : 'Condição em análise')}</span>{selecionada.valor_pre_proposta !== null && <button className="baixar-pdf-cliente" type="button" onClick={() => void baixarPdfPreProposta()} disabled={baixandoPdf}><Download size={15} /> {baixandoPdf ? 'Baixando…' : 'Baixar PDF emitido'}</button>}{podeAceitarPreProposta(selecionada.proposta_estado) && <div className="aceite-pre-proposta-cliente"><strong>Qual é sua decisão?</strong><p>O aceite manifesta interesse nesta pré-proposta do laboratório e não substitui a proposta oficial do Nectar. Se algo precisar mudar, recuse e explique o ajuste necessário; a equipe poderá emitir uma nova pré-proposta.</p><label><input type="checkbox" checked={confirmouAceite} onChange={(evento) => setConfirmouAceite(evento.target.checked)} /> Li e desejo prosseguir com esta pré-proposta.</label><div className="acoes-decisao-cliente"><button type="button" onClick={() => void aceitarPreProposta()} disabled={!confirmouAceite || aceitandoPreProposta || recusandoPreProposta}><CheckCircle2 size={16} /> {aceitandoPreProposta ? 'Registrando…' : 'Aceitar pré-proposta'}</button><button className="recusar-pre-proposta" type="button" onClick={() => setRecusaAberta((aberta) => !aberta)} disabled={aceitandoPreProposta || recusandoPreProposta}><Ban size={16} /> Recusar e solicitar revisão</button></div>{recusaAberta && <form className="formulario-recusa-cliente" onSubmit={recusarPreProposta}><label htmlFor="motivo-recusa-cliente">O que precisa ser alterado?<textarea id="motivo-recusa-cliente" required minLength={5} maxLength={1000} value={motivoRecusa} onChange={(evento) => setMotivoRecusa(evento.target.value)} placeholder="Ex.: prazo, escopo, quantidade ou condição comercial" /></label><div><button type="button" onClick={() => { setRecusaAberta(false); setMotivoRecusa(''); }}>Cancelar</button><button type="submit" disabled={!normalizarMotivoRecusa(motivoRecusa) || recusandoPreProposta}>{recusandoPreProposta ? 'Registrando…' : 'Confirmar recusa'}</button></div></form>}</div>}{selecionada.proposta_estado === 'aceita' && <div className="aceite-pre-proposta-cliente confirmado"><CheckCircle2 size={20} /><div><strong>Aceite registrado</strong><p>{descricaoAceiteCliente(selecionada.aceita_em, selecionada.execucao_estado, dataCurta)}</p></div></div>}{selecionada.proposta_estado === 'recusada' && <div className="aceite-pre-proposta-cliente recusada"><Ban size={20} /><div><strong>Revisão solicitada</strong><p>{selecionada.recusa_motivo || 'A equipe foi informada e poderá enviar uma nova pré-proposta.'}</p>{selecionada.recusada_em && <small>Registrada em {dataCurta(selecionada.recusada_em)}</small>}</div></div>}</article><article><small>Andamento do serviço</small><strong>{situacaoAtual?.titulo}</strong><span>{situacaoAtual?.descricao}</span></article></div>
          <section className="anexos-trabalho-cliente"><div className="titulo-bloco-cliente"><div><h3><Paperclip size={18} /> Arquivos da solicitação</h3><p>Documentos privados vinculados somente a este trabalho.</p></div></div>{(anexosPorSolicitacao[selecionada.id] ?? []).length === 0 ? <p className="sem-anexos-cliente">Nenhum arquivo foi anexado a esta solicitação.</p> : <ul>{(anexosPorSolicitacao[selecionada.id] ?? []).map((anexo) => <li key={anexo.id}><Paperclip size={17} /><span><strong>{anexo.nome_original}</strong><small>{(Number(anexo.tamanho_bytes) / 1024 / 1024).toFixed(2)} MB · enviado em {dataCurta(anexo.criado_em)}</small></span><button type="button" onClick={() => void baixarAnexo(anexo)} disabled={baixandoAnexoId === anexo.id}><Download size={15} /> {baixandoAnexoId === anexo.id ? 'Baixando…' : 'Baixar'}</button></li>)}</ul>}</section>
          <section className="acompanhamento-etapas"><div className="titulo-bloco-cliente"><div><h3>Etapas do trabalho</h3><p>A porcentagem indica o progresso da etapa atual, não do contrato inteiro.</p></div></div>{selecionada.etapas.length === 0 ? <div className="sem-etapas-cliente"><Clock3 size={22} /><div><strong>A equipe ainda está preparando o acompanhamento</strong><p>As etapas aparecerão aqui depois da triagem inicial da solicitação.</p></div></div> : <ol>{selecionada.etapas.map((etapa) => { const { rotulo, Icone } = estadoEtapa[etapa.estado]; return <li key={etapa.id} className={`etapa-${etapa.estado}`}><span className="icone-etapa"><Icone size={20} /></span><div><header><strong>{etapa.titulo}</strong><b>{rotulo}{etapa.estado === 'em_andamento' ? ` (${etapa.progresso}%)` : ''}</b></header>{etapa.descricao && <p>{etapa.descricao}</p>}<div className="barra-progresso" aria-label={`${etapa.progresso}% concluído`}><i style={{ width: `${etapa.progresso}%` }} /></div><small>Atualizado em {dataCurta(etapa.atualizada_em)}</small></div></li>; })}</ol>}</section>
          <section className="mensagens-cliente"><div className="titulo-bloco-cliente"><div><h3><MessageSquareText size={18} /> Mensagens</h3><p>Canal vinculado a esta solicitação.</p></div></div><div className="lista-mensagens-cliente">{mensagens.map((mensagem) => <p key={mensagem.id} className={mensagem.autor_proprio ? 'propria' : ''}>{mensagem.conteudo}<small>{dataCurta(mensagem.criada_em)}</small></p>)}</div><form onSubmit={enviarMensagem}><label htmlFor="mensagem-cliente" className="sr-only">Nova mensagem</label><input id="mensagem-cliente" required maxLength={5000} value={mensagemNova} onChange={(evento) => setMensagemNova(evento.target.value)} placeholder="Escreva uma mensagem para a equipe" /><button type="submit"><Send size={16} /> Enviar</button></form></section>
        </section>
      </div>}
      <ContatoEmail compacto contexto={selecionada ? protocoloSolicitacaoCliente(selecionada) : contexto.empresa_nome} />
    </div>

    {criandoSolicitacao && <NovaSolicitacaoCliente cliente={cliente} demonstracao={demonstracao} empresaNome={contexto.empresa_nome} aoFechar={() => setCriandoSolicitacao(false)} aoCriada={registrarNovaSolicitacao} />}

    {!aceitouPrivacidade && <div className="fundo-modal-privacidade" role="presentation"><section className="modal-privacidade" role="dialog" aria-modal="true" aria-labelledby="titulo-modal-privacidade"><span><ShieldCheck size={21} /> Proteção de dados</span><h2 id="titulo-modal-privacidade">Antes de acessar sua área</h2><p>Usamos seus dados para identificar a empresa, analisar solicitações, acompanhar trabalhos e manter este canal de mensagens. O acesso é restrito a usuários aprovados e à equipe autorizada.</p><ul><li>Não envie dados pessoais ou industriais que não sejam necessários ao serviço.</li><li>Arquivos e mensagens ficam vinculados à solicitação e protegidos por controle de acesso.</li><li>Você pode consultar a política completa e solicitar correção ou atendimento pelo canal informado nela.</li></ul><label><input type="checkbox" required checked readOnly /> Li e estou ciente deste aviso de privacidade.</label><div><a href="/privacidade" target="_blank" rel="noreferrer">Ler política completa</a><button type="button" onClick={() => void aceitarPrivacidade()} disabled={aceitando}><Check size={16} /> {aceitando ? 'Registrando…' : 'Continuar'}</button></div><small>Versão {VERSAO_AVISO_PRIVACIDADE} · texto de homologação sujeito à validação institucional.</small></section></div>}
  </main>;
}
