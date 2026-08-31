'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { Check, CheckCircle2, Circle, Clock3, FileText, LogOut, MessageSquareText, Pencil, RefreshCw, Save, Send, ShieldCheck, UserRound, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatarDinheiro } from '../lib/calculos';
import { contextoClienteDemonstracao, mensagensClienteDemonstracao, situacaoEtapasCliente, solicitacoesClienteDemonstracao, tituloServicoCliente, type ContextoCliente, type MensagemCliente, type SolicitacaoCliente, VERSAO_AVISO_PRIVACIDADE } from '../lib/portal-cliente';
import { MarcaOficial } from './marca-oficial';

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

  useEffect(() => { queueMicrotask(() => void carregar()); }, [carregar]);
  useEffect(() => { queueMicrotask(() => void carregarMensagens(selecionadaId)); }, [carregarMensagens, selecionadaId]);
  useEffect(() => {
    if (!cliente || demonstracao || !selecionadaId) return;
    const canal = cliente
      .channel(`mensagens-cliente-${selecionadaId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens', filter: `solicitacao_id=eq.${selecionadaId}` }, () => void carregarMensagens(selecionadaId))
      .subscribe();
    return () => { void cliente.removeChannel(canal); };
  }, [carregarMensagens, cliente, demonstracao, selecionadaId]);

  const selecionada = useMemo(() => solicitacoes.find((item) => item.id === selecionadaId) ?? solicitacoes[0], [selecionadaId, solicitacoes]);
  const situacaoAtual = useMemo(() => selecionada ? situacaoEtapasCliente(selecionada.etapas) : null, [selecionada]);

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

  return <main className="portal-cliente">
    <header className="topo-cliente"><a href="/" aria-label="Voltar ao site"><MarcaOficial /></a><div><span>{demonstracao ? 'DEMONSTRAÇÃO' : 'ÁREA DO CLIENTE'}</span><strong>{nomeCliente}</strong><small>{contexto.empresa_nome}</small></div><button type="button" onClick={() => aoSair ? void aoSair() : window.location.assign('/')}><LogOut size={17} /> Sair</button></header>
    <div className="conteudo-cliente">
      <section className="boas-vindas-cliente"><div><p className="sobrelinha"><span /> ACOMPANHAMENTO DIGITAL</p><h1>Veja o andamento sem termos complicados.</h1><p>A solicitação pode ser enviada sem login. Esta área protegida reúne apenas os trabalhos, etapas, pré-propostas e mensagens permitidos ao seu perfil Cliente.</p></div><aside className="resumo-acesso-cliente"><div className="selo-seguranca-cliente"><ShieldCheck size={22} /><span><strong>Acesso restrito à sua empresa</strong><small>Dados de homologação permanecem demonstrativos.</small></span></div><div className="perfil-cliente"><UserRound size={20} /><span><small>Perfil</small><strong>{contexto.perfil === 'gestor_empresa' ? 'Gestor da empresa' : 'Contato da empresa'}</strong><em>{contexto.usuario_email}</em></span><button type="button" onClick={() => setEditandoPerfil(true)} aria-label="Editar nome do perfil"><Pencil size={15} /></button></div>{editandoPerfil && <form className="editar-perfil-cliente" onSubmit={salvarPerfil}><label htmlFor="nome-cliente">Nome de exibição</label><input id="nome-cliente" required minLength={2} maxLength={120} value={nomeEmEdicao} onChange={(evento) => setNomeEmEdicao(evento.target.value)} /><div><button type="button" onClick={() => { setNomeEmEdicao(nomeCliente); setEditandoPerfil(false); }}><X size={15} /> Cancelar</button><button type="submit" disabled={salvandoPerfil}><Save size={15} /> {salvandoPerfil ? 'Salvando…' : 'Salvar'}</button></div></form>}</aside></section>

      {aviso && <div className="aviso-cliente sucesso" role="status">{aviso}<button type="button" onClick={() => setAviso('')} aria-label="Fechar aviso">×</button></div>}
      {erro && <div className="aviso-cliente erro" role="alert">{erro}</div>}
      {carregando && <div className="aviso-cliente" role="status"><RefreshCw size={18} /> Carregando acompanhamento…</div>}
      {!carregando && solicitacoes.length === 0 && <section className="vazio-cliente"><FileText size={30} /><h2>Nenhum trabalho disponível ainda</h2><p>Quando a equipe vincular uma solicitação à sua empresa, o acompanhamento aparecerá aqui.</p><a className="botao" href="/solicitar">Fazer uma solicitação</a></section>}

      {selecionada && <div className="grade-cliente">
        <aside className="lista-projetos-cliente"><h2>Seus trabalhos</h2>{solicitacoes.map((item) => <button key={item.id} type="button" className={item.id === selecionada.id ? 'ativo' : ''} onClick={() => setSelecionadaId(item.id)}><span>SOL-{String(item.codigo).padStart(4, '0')}</span><strong>{tituloServicoCliente(item.servico)}</strong><small>Recebida em {dataCurta(item.criada_em)}</small></button>)}</aside>
        <section className="detalhe-projeto-cliente">
          <header><div><span>SOL-{String(selecionada.codigo).padStart(4, '0')}</span><h2>{tituloServicoCliente(selecionada.servico)}</h2></div><button type="button" onClick={() => void carregar()}><RefreshCw size={15} /> Atualizar</button></header>
          <div className="resumo-projeto-cliente"><article><small>Pré-proposta comercial</small><strong>{selecionada.valor_pre_proposta === null ? 'Ainda não emitida' : formatarDinheiro(selecionada.valor_pre_proposta)}</strong><span>{selecionada.valor_pre_proposta === null ? 'Será exibida após análise e publicação pela equipe.' : (selecionada.prazo_pagamento_dias ? `Pagamento desejado: ${selecionada.prazo_pagamento_dias} dias` : 'Condição em análise')}</span></article><article><small>Andamento do serviço</small><strong>{situacaoAtual?.titulo}</strong><span>{situacaoAtual?.descricao}</span></article></div>
          <section className="acompanhamento-etapas"><div className="titulo-bloco-cliente"><div><h3>Etapas do trabalho</h3><p>A porcentagem indica o progresso da etapa atual, não do contrato inteiro.</p></div></div>{selecionada.etapas.length === 0 ? <div className="sem-etapas-cliente"><Clock3 size={22} /><div><strong>A equipe ainda está preparando o acompanhamento</strong><p>As etapas aparecerão aqui depois da triagem inicial da solicitação.</p></div></div> : <ol>{selecionada.etapas.map((etapa) => { const { rotulo, Icone } = estadoEtapa[etapa.estado]; return <li key={etapa.id} className={`etapa-${etapa.estado}`}><span className="icone-etapa"><Icone size={20} /></span><div><header><strong>{etapa.titulo}</strong><b>{rotulo}{etapa.estado === 'em_andamento' ? ` (${etapa.progresso}%)` : ''}</b></header>{etapa.descricao && <p>{etapa.descricao}</p>}<div className="barra-progresso" aria-label={`${etapa.progresso}% concluído`}><i style={{ width: `${etapa.progresso}%` }} /></div><small>Atualizado em {dataCurta(etapa.atualizada_em)}</small></div></li>; })}</ol>}</section>
          <section className="mensagens-cliente"><div className="titulo-bloco-cliente"><div><h3><MessageSquareText size={18} /> Mensagens</h3><p>Canal vinculado a esta solicitação.</p></div></div><div className="lista-mensagens-cliente">{mensagens.map((mensagem) => <p key={mensagem.id} className={mensagem.autor_proprio ? 'propria' : ''}>{mensagem.conteudo}<small>{dataCurta(mensagem.criada_em)}</small></p>)}</div><form onSubmit={enviarMensagem}><label htmlFor="mensagem-cliente" className="sr-only">Nova mensagem</label><input id="mensagem-cliente" required maxLength={5000} value={mensagemNova} onChange={(evento) => setMensagemNova(evento.target.value)} placeholder="Escreva uma mensagem para a equipe" /><button type="submit"><Send size={16} /> Enviar</button></form></section>
        </section>
      </div>}
    </div>

    {!aceitouPrivacidade && <div className="fundo-modal-privacidade" role="presentation"><section className="modal-privacidade" role="dialog" aria-modal="true" aria-labelledby="titulo-modal-privacidade"><span><ShieldCheck size={21} /> Proteção de dados</span><h2 id="titulo-modal-privacidade">Antes de acessar sua área</h2><p>Usamos seus dados para identificar a empresa, analisar solicitações, acompanhar trabalhos e manter este canal de mensagens. O acesso é restrito a usuários aprovados e à equipe autorizada.</p><ul><li>Não envie dados pessoais ou industriais que não sejam necessários ao serviço.</li><li>Arquivos e mensagens ficam vinculados à solicitação e protegidos por controle de acesso.</li><li>Você pode consultar a política completa e solicitar correção ou atendimento pelo canal informado nela.</li></ul><label><input type="checkbox" required checked readOnly /> Li e estou ciente deste aviso de privacidade.</label><div><a href="/privacidade" target="_blank" rel="noreferrer">Ler política completa</a><button type="button" onClick={() => void aceitarPrivacidade()} disabled={aceitando}><Check size={16} /> {aceitando ? 'Registrando…' : 'Continuar'}</button></div><small>Versão {VERSAO_AVISO_PRIVACIDADE} · texto de homologação sujeito à validação institucional.</small></section></div>}
  </main>;
}
