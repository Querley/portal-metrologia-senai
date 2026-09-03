'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { MessageSquareText, RefreshCw, Send, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PerfilInterno } from '../lib/contratos';
import { correspondeBusca } from '../lib/busca-e-filtros';
import { iniciaisEmpresa, podeAcessarConversas, type ConversaInterna } from '../lib/mensagens-persistentes';
import { rotuloNecessidadeCliente } from '../lib/solicitacao';
import { BarraBuscaFiltros } from './barra-busca-filtros';

function dataHora(valor: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(valor));
}

export function MensagensPersistentes({ cliente, perfil }: { cliente: SupabaseClient; perfil: PerfilInterno }) {
  const [conversas, setConversas] = useState<ConversaInterna[]>([]);
  const [selecionadaId, setSelecionadaId] = useState('');
  const [mensagemNova, setMensagemNova] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [filtroConversa, setFiltroConversa] = useState('todos');

  const carregar = useCallback(async () => {
    if (!podeAcessarConversas(perfil)) {
      setCarregando(false);
      return;
    }
    setCarregando(true);
    setErro('');
    const { data, error } = await cliente.rpc('listar_conversas_demonstrativas');
    if (error) {
      setErro(error.code === '42501'
        ? 'Seu perfil não tem autorização para consultar conversas.'
        : 'Não foi possível carregar as conversas da homologação.');
    } else {
      const lista = (Array.isArray(data) ? data : []) as ConversaInterna[];
      setConversas(lista);
      setSelecionadaId((atual) => lista.some((item) => item.solicitacao_id === atual) ? atual : lista[0]?.solicitacao_id ?? '');
    }
    setCarregando(false);
  }, [cliente, perfil]);

  useEffect(() => { queueMicrotask(() => void carregar()); }, [carregar]);

  const conversasVisiveis = useMemo(() => conversas.filter((conversa) => {
    if (!correspondeBusca(busca, conversa.codigo, conversa.empresa, conversa.contato_nome, conversa.contato_email, conversa.necessidade, conversa.mensagens.map((mensagem) => mensagem.conteudo))) return false;
    if (filtroConversa === 'com_mensagens') return conversa.mensagens.length > 0;
    if (filtroConversa === 'sem_mensagens') return conversa.mensagens.length === 0;
    return true;
  }), [busca, conversas, filtroConversa]);
  const selecionada = useMemo(() => conversasVisiveis.find((item) => item.solicitacao_id === selecionadaId) ?? conversasVisiveis[0], [conversasVisiveis, selecionadaId]);
  const selecionadaIdEfetiva = selecionada?.solicitacao_id ?? '';

  useEffect(() => {
    if (!selecionadaIdEfetiva || !podeAcessarConversas(perfil)) return;
    const canal = cliente
      .channel(`mensagens-internas-${selecionadaIdEfetiva}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens', filter: `solicitacao_id=eq.${selecionadaIdEfetiva}` }, () => void carregar())
      .subscribe();
    return () => { void cliente.removeChannel(canal); };
  }, [carregar, cliente, perfil, selecionadaIdEfetiva]);

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const conteudo = mensagemNova.trim();
    if (!selecionada || !conteudo || !podeAcessarConversas(perfil)) return;
    setEnviando(true);
    setErro('');
    const { error } = await cliente.rpc('enviar_mensagem_interna_demonstrativa', {
      solicitacao: selecionada.solicitacao_id,
      conteudo,
    });
    if (error) {
      setErro(error.code === '42501'
        ? 'Seu perfil não pode responder a esta conversa.'
        : 'Não foi possível enviar a mensagem.');
    } else {
      setMensagemNova('');
      await carregar();
    }
    setEnviando(false);
  }

  if (!podeAcessarConversas(perfil)) {
    return <div className="painel"><section className="aviso-custos" role="alert"><ShieldCheck size={20} /><div><strong>Acesso não autorizado</strong><p>Conversas com Clientes estão disponíveis para Técnico, Validador e Administrador.</p></div></section></div>;
  }

  return <div className="painel painel-mensagens-persistentes">
    <section className="cabecalho-custos">
      <div><span><MessageSquareText size={17} /> Canal persistente</span><h2>Mensagens com Clientes</h2><p>Somente conversas de solicitações sintéticas ativadas na homologação.</p></div>
      <button type="button" onClick={() => void carregar()} disabled={carregando}><RefreshCw size={16} /> Atualizar</button>
    </section>
    {erro && <section className="aviso-custos erro" role="alert"><ShieldCheck size={20} /><div><strong>Falha na conversa</strong><p>{erro}</p></div></section>}
    {carregando && <section className="aviso-custos" role="status"><RefreshCw size={20} /><div><strong>Carregando conversas</strong><p>Consultando mensagens protegidas pela origem demonstrativa.</p></div></section>}
    {!carregando && !erro && conversas.length === 0 && <section className="bloco estado-vazio"><MessageSquareText size={18} /><span>Nenhuma solicitação ativada possui canal Cliente disponível.</span></section>}
    {!carregando && conversas.length > 0 && <section className="bloco mensagens mensagens-reais">
      <aside><h2>Conversas</h2><BarraBuscaFiltros busca={busca} aoMudarBusca={setBusca} placeholder="Empresa, protocolo ou mensagem" total={conversasVisiveis.length} filtros={[{ id: 'mensagens-conversa', rotulo: 'Mensagens', valor: filtroConversa, aoMudar: setFiltroConversa, opcoes: [{ valor: 'todos', rotulo: 'Todas' }, { valor: 'com_mensagens', rotulo: 'Com mensagens' }, { valor: 'sem_mensagens', rotulo: 'Sem mensagens' }] }]} />{conversasVisiveis.map((conversa) => <button className={conversa.solicitacao_id === selecionada?.solicitacao_id ? 'ativo' : ''} type="button" key={conversa.solicitacao_id} onClick={() => setSelecionadaId(conversa.solicitacao_id)}><span>{iniciaisEmpresa(conversa.empresa)}</span><div><strong>{conversa.empresa}</strong><small>DEM-SOL-{String(conversa.codigo).padStart(4, '0')} · {conversa.contato_nome}</small></div></button>)}{conversasVisiveis.length === 0 && <p className="sem-resultados-filtro">Nenhuma conversa encontrada.</p>}</aside>
      {selecionada && <div className="conversa"><header><div><strong>{selecionada.empresa}</strong><small>DEM-SOL-{String(selecionada.codigo).padStart(4, '0')} · {rotuloNecessidadeCliente(selecionada.necessidade)}</small></div><span className="estado estado-formalizada">Cliente ativado</span></header><div className="baloes">{selecionada.mensagens.length === 0 && <div className="conversa-vazia"><MessageSquareText size={22} /><strong>Conversa iniciada</strong><p>Envie a primeira mensagem para este Cliente.</p></div>}{selecionada.mensagens.map((mensagem) => <p className={mensagem.autor_tipo === 'equipe' ? 'enviada' : 'recebida'} key={mensagem.id}>{mensagem.conteudo}<small>{mensagem.autor_nome} · {dataHora(mensagem.criada_em)}</small></p>)}</div><form onSubmit={enviar}><label className="sr-only" htmlFor={`mensagem-interna-${selecionada.solicitacao_id}`}>Mensagem para o Cliente</label><input id={`mensagem-interna-${selecionada.solicitacao_id}`} required maxLength={5000} value={mensagemNova} onChange={(evento) => setMensagemNova(evento.target.value)} placeholder="Escreva uma mensagem para o Cliente" /><button type="submit" disabled={enviando || !mensagemNova.trim()}><Send size={15} /> {enviando ? 'Enviando…' : 'Enviar'}</button></form></div>}
    </section>}
  </div>;
}
