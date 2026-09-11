'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { Download, FileText, MessageSquareText, Paperclip, RefreshCw, Send, ShieldCheck, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PerfilInterno } from '../lib/contratos';
import { correspondeBusca } from '../lib/busca-e-filtros';
import { iniciaisEmpresa, podeAcessarConversas, type ConversaInterna } from '../lib/mensagens-persistentes';
import { rotuloNecessidadeCliente } from '../lib/solicitacao';
import { BarraBuscaFiltros } from './barra-busca-filtros';
import { NotificacaoFlutuante } from './notificacao-flutuante';
import { caminhoAnexoMensagem, validarAnexosMensagem, type AnexoMensagem } from '../lib/anexos-mensagem';
import { tipoMimeArmazenado } from '../lib/anexos-solicitacao';

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
  const [mensagem, setMensagem] = useState('');
  const [busca, setBusca] = useState('');
  const [filtroConversa, setFiltroConversa] = useState('todos');
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [baixando, setBaixando] = useState('');

  const carregar = useCallback(async () => {
    if (!podeAcessarConversas(perfil)) {
      setCarregando(false);
      return;
    }
    setCarregando(true);
    setErro('');
    const [{ data, error }, anexosResposta, leiturasResposta] = await Promise.all([cliente.rpc('listar_conversas_demonstrativas'), selecionadaId ? cliente.rpc('listar_anexos_mensagens_demonstrativas', { solicitacao: selecionadaId }) : Promise.resolve({ data: [], error: null }), cliente.rpc('resumo_mensagens_nao_lidas_demonstrativas')]);
    if (error || anexosResposta.error || leiturasResposta.error) {
      setErro(error?.code === '42501' || anexosResposta.error?.code === '42501' || leiturasResposta.error?.code === '42501'
        ? 'Seu perfil não tem autorização para consultar conversas.'
        : 'Não foi possível carregar as conversas da homologação.');
    } else {
      const anexos = (anexosResposta.data ?? []) as AnexoMensagem[];
      const naoLidas = new Map(((leiturasResposta.data ?? []) as Array<{ solicitacao_id: string; nao_lidas: number }>).map((item) => [item.solicitacao_id, Number(item.nao_lidas)]));
      const lista = ((Array.isArray(data) ? data : []) as ConversaInterna[]).map((conversa) => ({ ...conversa, nao_lidas: naoLidas.get(conversa.solicitacao_id) ?? 0, mensagens: conversa.mensagens.map((mensagem) => ({ ...mensagem, anexos: anexos.filter((anexo) => anexo.mensagem_id === mensagem.id) })) }));
      setConversas(lista);
      setSelecionadaId((atual) => lista.some((item) => item.solicitacao_id === atual) ? atual : lista[0]?.solicitacao_id ?? '');
    }
    setCarregando(false);
  }, [cliente, perfil, selecionadaId]);

  useEffect(() => { queueMicrotask(() => void carregar()); }, [carregar]);

  const conversasVisiveis = useMemo(() => conversas.filter((conversa) => {
    if (!correspondeBusca(busca, conversa.codigo, conversa.empresa, conversa.contato_nome, conversa.contato_email, conversa.necessidade, conversa.mensagens.map((mensagem) => mensagem.conteudo))) return false;
    if (filtroConversa === 'nao_lidas') return Number(conversa.nao_lidas ?? 0) > 0;
    if (filtroConversa === 'com_mensagens') return conversa.mensagens.length > 0;
    if (filtroConversa === 'sem_mensagens') return conversa.mensagens.length === 0;
    return true;
  }), [busca, conversas, filtroConversa]);
  const selecionada = useMemo(() => conversasVisiveis.find((item) => item.solicitacao_id === selecionadaId) ?? conversasVisiveis[0], [conversasVisiveis, selecionadaId]);
  const selecionadaIdEfetiva = selecionada?.solicitacao_id ?? '';

  useEffect(() => {
    if (!selecionadaIdEfetiva) return;
    void cliente.rpc('marcar_conversa_lida_demonstrativa', { solicitacao: selecionadaIdEfetiva }).then(() => setConversas((atuais) => atuais.map((item) => item.solicitacao_id === selecionadaIdEfetiva ? { ...item, nao_lidas: 0 } : item)));
  }, [cliente, selecionadaIdEfetiva]);

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
    const { data: mensagemId, error } = await cliente.rpc('enviar_mensagem_interna_demonstrativa', {
      solicitacao: selecionada.solicitacao_id,
      conteudo,
    });
    if (error || !mensagemId) {
      setErro(error.code === '42501'
        ? 'Seu perfil não pode responder a esta conversa.'
        : 'Não foi possível enviar a mensagem.');
    } else {
      for (const arquivo of arquivos) {
        const caminho = caminhoAnexoMensagem(String(mensagemId), arquivo);
        const tipo = tipoMimeArmazenado(arquivo) ?? 'application/octet-stream';
        const envio = await cliente.storage.from('mensagens').upload(caminho, arquivo, { contentType: tipo, upsert: false });
        if (envio.error) { setErro(`A mensagem foi enviada, mas ${arquivo.name} não pôde ser anexado.`); break; }
        const registro = await cliente.rpc('registrar_anexo_mensagem_demonstrativa', { mensagem: mensagemId, caminho, nome_original: arquivo.name, tipo_mime: tipo, tamanho_bytes: arquivo.size });
        if (registro.error) { setErro(`A mensagem foi enviada, mas ${arquivo.name} não pôde ser registrado.`); break; }
      }
      setMensagemNova('');
      setArquivos([]);
      setMensagem('Mensagem enviada ao Cliente.');
      await carregar();
    }
    setEnviando(false);
  }

  function selecionarArquivos(lista: FileList | null) {
    const novos = [...arquivos, ...Array.from(lista ?? [])];
    const falha = validarAnexosMensagem(novos);
    if (falha) setErro(falha); else { setErro(''); setArquivos(novos); }
  }

  async function baixarAnexo(anexo: AnexoMensagem) {
    setBaixando(anexo.id);
    const { data, error } = await cliente.storage.from('mensagens').download(anexo.caminho_storage);
    if (error || !data) setErro('Não foi possível baixar o anexo protegido.');
    else { const url=URL.createObjectURL(data); const link=document.createElement('a'); link.href=url; link.download=anexo.nome_original; link.click(); window.setTimeout(()=>URL.revokeObjectURL(url),0); }
    setBaixando('');
  }

  if (!podeAcessarConversas(perfil)) {
    return <div className="painel"><section className="aviso-custos" role="alert"><ShieldCheck size={20} /><div><strong>Acesso não autorizado</strong><p>Conversas com Clientes estão disponíveis para Técnico, Validador e Administrador.</p></div></section></div>;
  }

  return <div className="painel painel-mensagens-persistentes">
    <NotificacaoFlutuante mensagem={erro} tipo="erro" aoFechar={() => setErro('')} />
    <NotificacaoFlutuante mensagem={mensagem} tipo="sucesso" aoFechar={() => setMensagem('')} />
    <section className="cabecalho-custos">
      <div><span><MessageSquareText size={17} /> Canal persistente</span><h2>Mensagens com Clientes</h2><p>Somente conversas de solicitações sintéticas ativadas na homologação.</p></div>
      <button type="button" onClick={() => void carregar()} disabled={carregando}><RefreshCw size={16} /> Atualizar</button>
    </section>
    {carregando && <section className="aviso-custos" role="status"><RefreshCw size={20} /><div><strong>Carregando conversas</strong><p>Consultando mensagens protegidas pela origem demonstrativa.</p></div></section>}
    {!carregando && !erro && conversas.length === 0 && <section className="bloco estado-vazio"><MessageSquareText size={18} /><span>Nenhuma solicitação ativada possui canal Cliente disponível.</span></section>}
    {!carregando && conversas.length > 0 && <section className="cards-operacionais cards-mensagens-internas"><button type="button" onClick={() => setFiltroConversa('nao_lidas')}><small>Mensagens não lidas</small><strong>{conversas.reduce((total, conversa) => total + Number(conversa.nao_lidas ?? 0), 0)}</strong><span>Ver conversas pendentes</span></button><button type="button" onClick={() => setFiltroConversa('todos')}><small>Conversas vinculadas</small><strong>{conversas.length}</strong><span>Ver todas</span></button></section>}
    {!carregando && conversas.length > 0 && <section className="bloco mensagens mensagens-reais">
      <aside><h2>Conversas</h2><BarraBuscaFiltros busca={busca} aoMudarBusca={setBusca} placeholder="Empresa, protocolo ou mensagem" total={conversasVisiveis.length} filtros={[{ id: 'mensagens-conversa', rotulo: 'Mensagens', valor: filtroConversa, aoMudar: setFiltroConversa, opcoes: [{ valor: 'todos', rotulo: 'Todas' }, { valor: 'nao_lidas', rotulo: 'Não lidas' }, { valor: 'com_mensagens', rotulo: 'Com mensagens' }, { valor: 'sem_mensagens', rotulo: 'Sem mensagens' }] }]} />{conversasVisiveis.map((conversa) => <button className={conversa.solicitacao_id === selecionada?.solicitacao_id ? 'ativo' : ''} type="button" key={conversa.solicitacao_id} onClick={() => setSelecionadaId(conversa.solicitacao_id)}><span>{iniciaisEmpresa(conversa.empresa)}</span><div><strong>{conversa.empresa}</strong><small>DEM-SOL-{String(conversa.codigo).padStart(4, '0')} · {conversa.contato_nome}</small></div>{Boolean(conversa.nao_lidas) && <b>{conversa.nao_lidas}</b>}</button>)}{conversasVisiveis.length === 0 && <p className="sem-resultados-filtro">Nenhuma conversa encontrada.</p>}</aside>
      {selecionada && <div className="conversa"><header><div><strong>{selecionada.empresa}</strong><small>DEM-SOL-{String(selecionada.codigo).padStart(4, '0')} · {rotuloNecessidadeCliente(selecionada.necessidade)}</small></div><span className="estado estado-formalizada">Cliente ativado</span></header><div className="baloes">{selecionada.mensagens.length === 0 && <div className="conversa-vazia"><MessageSquareText size={22} /><strong>Conversa iniciada</strong><p>Envie a primeira mensagem para este Cliente.</p></div>}{selecionada.mensagens.map((mensagem) => <p className={mensagem.autor_tipo === 'equipe' ? 'enviada' : 'recebida'} key={mensagem.id}>{mensagem.conteudo}{mensagem.anexos?.map((anexo) => <button type="button" className="anexo-mensagem" key={anexo.id} disabled={baixando===anexo.id} onClick={() => void baixarAnexo(anexo)}><FileText size={14}/>{anexo.nome_original}<Download size={13}/></button>)}<small>{mensagem.autor_nome} · {dataHora(mensagem.criada_em)}</small></p>)}</div><form onSubmit={enviar}><label className="sr-only" htmlFor={`mensagem-interna-${selecionada.solicitacao_id}`}>Mensagem para o Cliente</label><input id={`mensagem-interna-${selecionada.solicitacao_id}`} required maxLength={5000} value={mensagemNova} onChange={(evento) => setMensagemNova(evento.target.value)} placeholder="Escreva uma mensagem para o Cliente" /><label className="anexar-mensagem"><Paperclip size={16}/><span>Anexar</span><input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,.step,.stp,.iges,.igs,.stl,.obj,.dxf,.dwg" onChange={(e) => selecionarArquivos(e.target.files)}/></label><button type="submit" disabled={enviando || !mensagemNova.trim()}><Send size={15} /> {enviando ? 'Enviando…' : 'Enviar'}</button></form>{arquivos.length>0 && <div className="arquivos-mensagem-selecionados">{arquivos.map((arquivo,i)=><span key={`${arquivo.name}-${i}`}>{arquivo.name}<button type="button" aria-label={`Remover ${arquivo.name}`} onClick={()=>setArquivos((atuais)=>atuais.filter((_,indice)=>indice!==i))}><X size={12}/></button></span>)}</div>}</div>}
    </section>}
  </div>;
}
