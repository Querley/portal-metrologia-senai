'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import Image from 'next/image';
import { CheckCircle2, Eye, FileCheck2, Image as ImageIcon, Languages, Pencil, Plus, RefreshCw, Save, Send, Trash2, Undo2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PerfilInterno } from '../lib/contratos';
import type { IdiomaPublico } from '../lib/idioma-publico';
import { idiomasPublicos, rotulosIdiomaPublico } from '../lib/idioma-publico';
import { BarraBuscaFiltros } from './barra-busca-filtros';
import { NotificacaoFlutuante } from './notificacao-flutuante';

type EstadoRevisao = 'rascunho' | 'em_validacao' | 'aprovada' | 'devolvida';
type ItemAcontecimento = { tipo: 'recente' | 'agora' | 'proximo'; data: string; titulo: string; resumo: string };
type CorpoCms = { texto?: string; midia_url?: string; midia_tipo?: 'imagem' | 'video'; midia_alt?: string; itens?: ItemAcontecimento[] };
type VersaoCms = { id: string; numero: number; idioma: IdiomaPublico; titulo: string; corpo: CorpoCms; criada_em: string; publicada: boolean; estado_revisao: EstadoRevisao; decisao_justificativa?: string | null };
type PublicacaoCms = Partial<Record<IdiomaPublico, { versao_id: string; numero: number; titulo: string; corpo: CorpoCms; publicada_em: string }>>;
type ConteudoCms = { id: string; chave: string; tipo: string; estado: 'rascunho' | 'publicado' | 'arquivado'; publicacoes: PublicacaoCms; versoes: VersaoCms[] };

const idiomaInicial: IdiomaPublico = 'pt-BR';
const itensIniciais: ItemAcontecimento[] = [
  { tipo: 'recente', data: '', titulo: '', resumo: '' },
  { tipo: 'agora', data: '', titulo: '', resumo: '' },
  { tipo: 'proximo', data: '', titulo: '', resumo: '' },
];

function urlMidiaSegura(url: string) {
  const limpa = url.trim();
  return limpa.startsWith('/') || /^https:\/\//i.test(limpa) ? limpa : '';
}

function rotuloEstado(estado: EstadoRevisao) {
  return { rascunho: 'Rascunho', em_validacao: 'Aguardando Administrador', aprovada: 'Aprovada', devolvida: 'Devolvida' }[estado];
}

export function ConteudoPublicoCms({ cliente, perfil }: { cliente: SupabaseClient; perfil: Extract<PerfilInterno, 'validador' | 'administrador'> }) {
  const [conteudos, setConteudos] = useState<ConteudoCms[]>([]);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [selecionadoId, setSelecionadoId] = useState('');
  const [versaoAtivaId, setVersaoAtivaId] = useState('');
  const [idioma, setIdioma] = useState<IdiomaPublico>(idiomaInicial);
  const [chave, setChave] = useState('');
  const [tipo, setTipo] = useState('secao');
  const [titulo, setTitulo] = useState('');
  const [texto, setTexto] = useState('');
  const [midiaUrl, setMidiaUrl] = useState('');
  const [midiaTipo, setMidiaTipo] = useState<'imagem' | 'video'>('imagem');
  const [midiaAlt, setMidiaAlt] = useState('');
  const [itens, setItens] = useState<ItemAcontecimento[]>(itensIniciais);
  const [justificativa, setJustificativa] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    setCarregando(true);
    const { data, error } = await cliente.rpc('listar_cms_demonstrativo');
    if (error) setErro(error.message || 'Não foi possível carregar o CMS.');
    else setConteudos(Array.isArray(data) ? data as ConteudoCms[] : []);
    setCarregando(false);
  }, [cliente]);

  useEffect(() => { queueMicrotask(() => void carregar()); }, [carregar]);

  const visiveis = useMemo(() => conteudos.filter((item) => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    const corresponde = !termo || `${item.chave} ${item.tipo} ${Object.values(item.publicacoes).map((publicacao) => publicacao?.titulo).join(' ')}`.toLocaleLowerCase('pt-BR').includes(termo);
    const temPendente = item.versoes.some((versao) => versao.estado_revisao === 'em_validacao');
    return corresponde && (filtro === 'todos' || item.estado === filtro || (filtro === 'incompletos' && idiomasPublicos.some((codigo) => !item.publicacoes[codigo])) || (filtro === 'pendentes' && temPendente));
  }), [busca, conteudos, filtro]);
  const selecionado = conteudos.find((item) => item.id === selecionadoId);
  const versaoAtiva = selecionado?.versoes.find((item) => item.id === versaoAtivaId);
  const publicadas = conteudos.filter((item) => item.estado === 'publicado').length;
  const completas = conteudos.filter((item) => idiomasPublicos.every((codigo) => item.publicacoes[codigo])).length;
  const pendentes = conteudos.flatMap((item) => item.versoes).filter((item) => item.estado_revisao === 'em_validacao').length;
  const ehAcontecimentos = tipo === 'acontecimentos' || chave === 'inicio.acontecimentos';
  const secoesInicio = useMemo(() => {
    const ordem = ['inicio.hero', 'inicio.diferencial', 'inicio.estrutura', 'inicio.acontecimentos', 'inicio.chamada'];
    return ordem.map((chaveInicio) => conteudos.find((item) => item.chave === chaveInicio)).filter((item): item is ConteudoCms => Boolean(item));
  }, [conteudos]);

  function carregarCampos(item: ConteudoCms, codigo: IdiomaPublico) {
    const versao = item.versoes.find((registro) => registro.idioma === codigo) ?? item.publicacoes[codigo];
    const corpo = versao?.corpo ?? {};
    setSelecionadoId(item.id);
    setVersaoAtivaId(versao && 'id' in versao ? versao.id : '');
    setIdioma(codigo); setChave(item.chave); setTipo(item.tipo); setTitulo(versao?.titulo ?? ''); setTexto(corpo.texto ?? '');
    setMidiaUrl(corpo.midia_url ?? ''); setMidiaTipo(corpo.midia_tipo ?? 'imagem'); setMidiaAlt(corpo.midia_alt ?? '');
    setItens(corpo.itens?.length ? corpo.itens : itensIniciais); setJustificativa('');
  }

  function editar(item: ConteudoCms, codigo: IdiomaPublico = idiomaInicial) { carregarCampos(item, codigo); }
  function trocarIdioma(codigo: IdiomaPublico) { if (selecionado) carregarCampos(selecionado, codigo); else setIdioma(codigo); }
  function novo() {
    setSelecionadoId('novo'); setVersaoAtivaId(''); setIdioma(idiomaInicial); setChave(''); setTipo('secao'); setTitulo(''); setTexto(''); setMidiaUrl(''); setMidiaTipo('imagem'); setMidiaAlt(''); setItens(itensIniciais); setJustificativa('');
  }
  function alterarItem(indice: number, campo: keyof ItemAcontecimento, valor: string) {
    setItens((atuais) => atuais.map((item, posicao) => posicao === indice ? { ...item, [campo]: valor } : item));
  }

  async function salvar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (ehAcontecimentos && itens.some((item) => item.titulo.trim().length < 3 || item.resumo.trim().length < 10 || item.data.trim().length < 2)) {
      setErro('Preencha data, título e resumo adequado em todos os acontecimentos.'); return;
    }
    setSalvando(true); setErro('');
    const corpo: CorpoCms = { texto: texto.trim() };
    if (midiaUrl.trim()) Object.assign(corpo, { midia_url: midiaUrl.trim(), midia_tipo: midiaTipo, midia_alt: midiaAlt.trim() || titulo.trim() });
    if (ehAcontecimentos) corpo.itens = itens;
    const { data, error } = await cliente.rpc('salvar_versao_conteudo_demonstrativo', { chave_conteudo: chave.trim(), tipo_conteudo: tipo.trim(), idioma_conteudo: idioma, titulo_conteudo: titulo.trim(), corpo_conteudo: corpo });
    if (error || !data) setErro(error?.message || 'Não foi possível salvar a versão.');
    else { setVersaoAtivaId(String(data)); setMensagem('Versão salva como rascunho. Envie para validação quando estiver pronta.'); await carregar(); }
    setSalvando(false);
  }

  async function executarAcao(acao: 'enviar' | 'aprovar' | 'devolver' | 'publicar') {
    if (!versaoAtiva) { setErro('Salve ou selecione uma versão antes de continuar.'); return; }
    if (acao === 'devolver' && justificativa.trim().length < 5) { setErro('Explique o motivo da devolução em pelo menos cinco caracteres.'); return; }
    setSalvando(true); setErro('');
    const chamada = acao === 'enviar'
      ? cliente.rpc('enviar_versao_conteudo_validacao_demonstrativa', { versao: versaoAtiva.id })
      : acao === 'publicar'
        ? cliente.rpc('publicar_versao_conteudo_demonstrativo', { versao: versaoAtiva.id })
        : cliente.rpc('decidir_versao_conteudo_demonstrativa', { versao: versaoAtiva.id, aprovar: acao === 'aprovar', justificativa: acao === 'devolver' ? justificativa.trim() : null });
    const { error } = await chamada;
    if (error) setErro(error.message || 'Não foi possível concluir a ação editorial.');
    else { setMensagem({ enviar: 'Versão enviada ao Administrador.', aprovar: 'Versão aprovada e pronta para publicação.', devolver: 'Versão devolvida ao editor com justificativa.', publicar: `${rotulosIdiomaPublico[idioma]} publicado no site.` }[acao]); await carregar(); }
    setSalvando(false);
  }

  return <div className="painel painel-cms">
    <NotificacaoFlutuante mensagem={erro} tipo="erro" aoFechar={() => setErro('')} />
    <NotificacaoFlutuante mensagem={mensagem} tipo="sucesso" aoFechar={() => setMensagem('')} />
    <section className="bloco status-conteudo-publico">
      <header><div><h2>Conteúdo público</h2><p>Editor visual versionado para PT-BR, inglês e alemão.</p></div><FileCheck2 /></header>
      <div className="cards-operacionais cards-cms"><button type="button" onClick={() => setFiltro('todos')}><small>Conteúdos</small><strong>{conteudos.length}</strong><span>Ver inventário</span></button><button type="button" onClick={() => setFiltro('publicado')}><small>Publicados</small><strong>{publicadas}</strong><span>Filtrar publicados</span></button><button type="button" onClick={() => setFiltro('pendentes')}><small>Aguardando decisão</small><strong>{pendentes}</strong><span>Revisar pendências</span></button><button type="button" onClick={() => setFiltro('incompletos')}><small>3 idiomas publicados</small><strong>{completas}</strong><span>Localizar traduções pendentes</span></button></div>
      <div className="fluxo-editorial-cms"><strong>Fluxo editorial</strong><span>Validador ou Administrador edita e envia</span><b>→</b><span>Administrador aprova ou devolve</span><b>→</b><span>Administrador publica</span></div>
    </section>
    <section className="bloco previa-site-cms">
      <header><div><h2>Prévia clicável da página inicial</h2><p>Selecione o idioma e clique diretamente na seção que deseja alterar. O bloco aberto mostra as mudanças enquanto você digita; o site público só muda depois da aprovação e publicação.</p></div><Eye /></header>
      <div className="idiomas-previa-cms" role="group" aria-label="Idioma da prévia">{idiomasPublicos.map((codigo) => <button type="button" className={codigo === idioma ? 'ativo' : ''} onClick={() => trocarIdioma(codigo)} key={codigo}>{rotulosIdiomaPublico[codigo]}</button>)}</div>
      <div className="moldura-site-cms">
        <div className="barra-site-cms"><strong>Centro de Excelência em Metrologia</strong><span>Início · Serviços · Acontece no Centro · Equipamentos</span></div>
        <div className="pagina-miniatura-cms">{secoesInicio.map((item) => {
          const publicada = item.publicacoes[idioma] ?? item.publicacoes['pt-BR'] ?? item.versoes.find((versao) => versao.idioma === idioma) ?? item.versoes[0];
          const estaEditando = item.id === selecionadoId;
          const tituloPrevia = estaEditando ? titulo : publicada?.titulo ?? 'Sem título';
          const textoPrevia = estaEditando ? texto : publicada?.corpo.texto ?? 'Sem texto publicado.';
          const urlPrevia = urlMidiaSegura(estaEditando ? midiaUrl : publicada?.corpo.midia_url ?? '');
          const tipoPrevia = estaEditando ? midiaTipo : publicada?.corpo.midia_tipo ?? 'imagem';
          return <button type="button" className={`secao-miniatura-cms ${item.chave.replace('.', '-')}${estaEditando ? ' ativo' : ''}`} onClick={() => editar(item, idioma)} key={item.id}>
            <small>{item.chave}</small><strong>{tituloPrevia}</strong><span>{textoPrevia}</span>
            {urlPrevia && <span className="midia-miniatura-cms">{tipoPrevia === 'video' ? <video src={urlPrevia} muted /> : <Image src={urlPrevia} alt="" width={360} height={150} unoptimized />}</span>}
            <em><Pencil size={13} /> Editar esta seção</em>
          </button>;
        })}</div>
      </div>
    </section>
    <section className="grade-cms">
      <div className="bloco lista-cms">
        <header><div><h2>Prévia das páginas</h2><p>Clique no bloco que deseja editar.</p></div><button type="button" onClick={novo}><Plus size={16} /> Novo</button></header>
        <BarraBuscaFiltros busca={busca} aoMudarBusca={setBusca} placeholder="Pesquisar página, seção ou título" total={visiveis.length} filtros={[{ id: 'estado-cms', rotulo: 'Situação', valor: filtro, aoMudar: setFiltro, opcoes: [{ valor: 'todos', rotulo: 'Todos' }, { valor: 'publicado', rotulo: 'Publicados' }, { valor: 'rascunho', rotulo: 'Rascunhos' }, { valor: 'pendentes', rotulo: 'Aguardando decisão' }, { valor: 'incompletos', rotulo: 'Traduções pendentes' }] }]} />
        {carregando ? <p className="estado-vazio">Carregando conteúdo…</p> : visiveis.length === 0 ? <p className="estado-vazio">Nenhum conteúdo corresponde aos filtros.</p> : <div className="paginas-previa-cms">{visiveis.map((item) => {
          const previa = item.publicacoes['pt-BR'] ?? item.versoes[0]; const src = urlMidiaSegura(previa?.corpo.midia_url ?? '');
          return <button type="button" className={item.id === selecionadoId ? 'ativo' : ''} onClick={() => editar(item)} key={item.id}><span className="miniatura-cms">{src ? (previa?.corpo.midia_tipo === 'video' ? <video src={src} muted /> : <Image src={src} alt="" width={104} height={74} unoptimized />) : <Eye />}</span><span><small>{item.chave}</small><strong>{previa?.titulo ?? 'Sem título publicado'}</strong><em>{previa?.corpo.texto ?? 'Clique para incluir o conteúdo desta seção.'}</em></span><span className="idiomas-cms">{idiomasPublicos.map((codigo) => <b className={item.publicacoes[codigo] ? 'publicado' : ''} key={codigo}>{rotulosIdiomaPublico[codigo]}</b>)}</span><Pencil size={16} /></button>;
        })}</div>}
      </div>
      <form className="bloco editor-cms" onSubmit={salvar}>
        <header><div><h2>{selecionadoId ? 'Editor visual' : 'Selecione uma seção'}</h2><p>Textos e mídia desta versão podem variar por idioma.</p></div><Languages /></header>
        {selecionadoId ? <div className="campos-cms">
          <div className="linha-editor-cms"><label>Chave técnica<input required pattern="(?!equipamentos\.)[a-z0-9.-]{3,100}" title="Use letras minúsculas, números, ponto ou hífen. Páginas técnicas de equipamentos não pertencem ao CMS." value={chave} onChange={(evento) => setChave(evento.target.value.toLowerCase())} readOnly={selecionadoId !== 'novo'} /></label><label>Tipo<select value={tipo} onChange={(evento) => setTipo(evento.target.value)}><option value="secao">Seção de texto</option><option value="cabecalho">Cabeçalho</option><option value="acontecimentos">Acontecimentos</option></select></label></div>
          <label>Idioma<select value={idioma} onChange={(evento) => trocarIdioma(evento.target.value as IdiomaPublico)}>{idiomasPublicos.map((codigo) => <option value={codigo} key={codigo}>{rotulosIdiomaPublico[codigo]}</option>)}</select></label>
          <label>Título<input required minLength={3} maxLength={180} value={titulo} onChange={(evento) => setTitulo(evento.target.value)} /></label>
          <label>Texto de apresentação<textarea required minLength={10} maxLength={5000} rows={5} value={texto} onChange={(evento) => setTexto(evento.target.value)} /></label>
          <fieldset className="midia-editor-cms"><legend><ImageIcon size={16} /> Mídia desta versão</legend><div className="linha-editor-cms"><label>Tipo<select value={midiaTipo} onChange={(evento) => setMidiaTipo(evento.target.value as 'imagem' | 'video')}><option value="imagem">Imagem</option><option value="video">Vídeo</option></select></label><label>Endereço do arquivo<input placeholder="https://… ou /imagens/arquivo.jpg" value={midiaUrl} onChange={(evento) => setMidiaUrl(evento.target.value)} /></label></div><label>Descrição acessível<input maxLength={240} value={midiaAlt} onChange={(evento) => setMidiaAlt(evento.target.value)} /></label>{urlMidiaSegura(midiaUrl) && <div className="previa-midia-cms">{midiaTipo === 'video' ? <video controls src={urlMidiaSegura(midiaUrl)} /> : <Image src={urlMidiaSegura(midiaUrl)} alt={midiaAlt || titulo} width={720} height={400} unoptimized />}</div>}</fieldset>
          {ehAcontecimentos && <fieldset className="editor-acontecimentos-cms"><legend>Acontecimentos exibidos na página inicial</legend>{itens.map((item, indice) => <article key={`${indice}-${item.tipo}`}><div className="linha-editor-cms"><label>Momento<select value={item.tipo} onChange={(evento) => alterarItem(indice, 'tipo', evento.target.value)}><option value="recente">Aconteceu</option><option value="agora">Está acontecendo</option><option value="proximo">Vai acontecer</option></select></label><label>Data ou período<input required value={item.data} onChange={(evento) => alterarItem(indice, 'data', evento.target.value)} /></label></div><label>Título<input required minLength={3} value={item.titulo} onChange={(evento) => alterarItem(indice, 'titulo', evento.target.value)} /></label><label>Resumo<textarea required minLength={10} rows={3} value={item.resumo} onChange={(evento) => alterarItem(indice, 'resumo', evento.target.value)} /></label>{itens.length > 1 && <button type="button" className="remover-item-cms" onClick={() => setItens((atuais) => atuais.filter((_, posicao) => posicao !== indice))}><Trash2 size={15} /> Remover</button>}</article>)}<button type="button" className="adicionar-item-cms" onClick={() => setItens((atuais) => [...atuais, { tipo: 'proximo', data: '', titulo: '', resumo: '' }])}><Plus size={15} /> Adicionar acontecimento</button></fieldset>}
          <div className="acoes-editor-cms"><button type="submit" disabled={salvando}><Save size={16} /> {salvando ? 'Salvando…' : 'Salvar rascunho'}</button>{versaoAtiva?.estado_revisao === 'rascunho' || versaoAtiva?.estado_revisao === 'devolvida' ? <button type="button" className="botao-enviar-cms" disabled={salvando} onClick={() => void executarAcao('enviar')}><Send size={16} /> Enviar para aprovação</button> : null}{perfil === 'administrador' && versaoAtiva?.estado_revisao === 'em_validacao' && <><button type="button" className="botao-publicar-cms" disabled={salvando} onClick={() => void executarAcao('aprovar')}><CheckCircle2 size={16} /> Aprovar</button><button type="button" className="botao-devolver-cms" disabled={salvando} onClick={() => void executarAcao('devolver')}><Undo2 size={16} /> Devolver</button></>}{perfil === 'administrador' && versaoAtiva?.estado_revisao === 'aprovada' && <button type="button" className="botao-publicar-cms" disabled={salvando} onClick={() => void executarAcao('publicar')}><CheckCircle2 size={16} /> Publicar no site</button>}<button type="button" className="botao-atualizar-cms" disabled={salvando} onClick={() => void carregar()}><RefreshCw size={16} /> Atualizar</button></div>
          {perfil === 'administrador' && versaoAtiva?.estado_revisao === 'em_validacao' && <label className="justificativa-cms">Motivo caso devolva<textarea minLength={5} maxLength={1000} rows={3} value={justificativa} onChange={(evento) => setJustificativa(evento.target.value)} placeholder="Explique ao editor o que deve ser ajustado." /></label>}
          {versaoAtiva && <div className={`estado-revisao-cms estado-revisao-${versaoAtiva.estado_revisao}`}><strong>{rotuloEstado(versaoAtiva.estado_revisao)}</strong>{versaoAtiva.decisao_justificativa && <span>Motivo: {versaoAtiva.decisao_justificativa}</span>}</div>}
          {selecionado && <div className="historico-cms"><strong>Histórico versionado</strong>{selecionado.versoes.slice(0, 8).map((versao) => <button type="button" onClick={() => { setVersaoAtivaId(versao.id); setIdioma(versao.idioma); setTitulo(versao.titulo); setTexto(versao.corpo.texto ?? ''); setMidiaUrl(versao.corpo.midia_url ?? ''); setMidiaTipo(versao.corpo.midia_tipo ?? 'imagem'); setMidiaAlt(versao.corpo.midia_alt ?? ''); setItens(versao.corpo.itens?.length ? versao.corpo.itens : itensIniciais); }} key={versao.id}>v{versao.numero} · {rotulosIdiomaPublico[versao.idioma]} · {rotuloEstado(versao.estado_revisao)} · {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(versao.criada_em))}{versao.publicada ? ' · publicada' : ''}</button>)}</div>}
        </div> : <p className="estado-vazio">Escolha uma prévia ao lado ou crie uma nova seção editável.</p>}
      </form>
    </section>
  </div>;
}
