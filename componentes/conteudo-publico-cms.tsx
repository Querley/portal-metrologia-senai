'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { CheckCircle2, FileCheck2, Languages, Pencil, Plus, RefreshCw, Save } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { IdiomaPublico } from '../lib/idioma-publico';
import { idiomasPublicos, rotulosIdiomaPublico } from '../lib/idioma-publico';
import { BarraBuscaFiltros } from './barra-busca-filtros';
import { NotificacaoFlutuante } from './notificacao-flutuante';

type VersaoCms = { id: string; numero: number; idioma: IdiomaPublico; titulo: string; corpo: { texto?: string }; criada_em: string; publicada: boolean };
type PublicacaoCms = Partial<Record<IdiomaPublico, { versao_id: string; numero: number; titulo: string; corpo: { texto?: string }; publicada_em: string }>>;
type ConteudoCms = { id: string; chave: string; tipo: string; estado: 'rascunho' | 'publicado' | 'arquivado'; publicacoes: PublicacaoCms; versoes: VersaoCms[] };

const idiomaInicial: IdiomaPublico = 'pt-BR';

export function ConteudoPublicoCms({ cliente }: { cliente: SupabaseClient }) {
  const [conteudos, setConteudos] = useState<ConteudoCms[]>([]);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [selecionadoId, setSelecionadoId] = useState('');
  const [idioma, setIdioma] = useState<IdiomaPublico>(idiomaInicial);
  const [chave, setChave] = useState('');
  const [tipo, setTipo] = useState('secao');
  const [titulo, setTitulo] = useState('');
  const [texto, setTexto] = useState('');
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
    return corresponde && (filtro === 'todos' || item.estado === filtro || (filtro === 'incompletos' && idiomasPublicos.some((codigo) => !item.publicacoes[codigo])));
  }), [busca, conteudos, filtro]);
  const selecionado = conteudos.find((item) => item.id === selecionadoId);
  const publicadas = conteudos.filter((item) => item.estado === 'publicado').length;
  const completas = conteudos.filter((item) => idiomasPublicos.every((codigo) => item.publicacoes[codigo])).length;

  function editar(item: ConteudoCms, codigo: IdiomaPublico = idiomaInicial) {
    const versao = item.versoes.find((registro) => registro.idioma === codigo) ?? item.publicacoes[codigo];
    setSelecionadoId(item.id);
    setIdioma(codigo);
    setChave(item.chave);
    setTipo(item.tipo);
    setTitulo(versao?.titulo ?? '');
    setTexto(versao?.corpo.texto ?? '');
  }

  function trocarIdioma(codigo: IdiomaPublico) {
    setIdioma(codigo);
    if (!selecionado) return;
    const versao = selecionado.versoes.find((registro) => registro.idioma === codigo) ?? selecionado.publicacoes[codigo];
    setTitulo(versao?.titulo ?? '');
    setTexto(versao?.corpo.texto ?? '');
  }

  function novo() {
    setSelecionadoId('novo');
    setIdioma(idiomaInicial);
    setChave('');
    setTipo('secao');
    setTitulo('');
    setTexto('');
  }

  async function salvar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setSalvando(true);
    setErro('');
    const { data, error } = await cliente.rpc('salvar_versao_conteudo_demonstrativo', {
      chave_conteudo: chave.trim(),
      tipo_conteudo: tipo.trim(),
      idioma_conteudo: idioma,
      titulo_conteudo: titulo.trim(),
      corpo_conteudo: { texto: texto.trim() },
    });
    if (error || !data) setErro(error?.message || 'Não foi possível salvar a versão.');
    else {
      setMensagem('Nova versão salva como rascunho. Revise e publique quando estiver pronta.');
      await carregar();
    }
    setSalvando(false);
  }

  async function publicar() {
    const atual = conteudos.find((item) => item.chave === chave)?.versoes.find((registro) => registro.idioma === idioma);
    if (!atual) return setErro('Salve uma versão neste idioma antes de publicar.');
    setSalvando(true);
    setErro('');
    const { error } = await cliente.rpc('publicar_versao_conteudo_demonstrativo', { versao: atual.id });
    if (error) setErro(error.message || 'Não foi possível publicar a versão.');
    else {
      setMensagem(`${rotulosIdiomaPublico[idioma]} publicado. A página pública passa a consumir esta versão.`);
      await carregar();
    }
    setSalvando(false);
  }

  return <div className="painel painel-cms">
    <NotificacaoFlutuante mensagem={erro} tipo="erro" aoFechar={() => setErro('')} />
    <NotificacaoFlutuante mensagem={mensagem} tipo="sucesso" aoFechar={() => setMensagem('')} />
    <section className="bloco status-conteudo-publico">
      <header><div><h2>Conteúdo público</h2><p>CMS versionado para publicar PT-BR, inglês e alemão sem alterar o código.</p></div><FileCheck2 /></header>
      <div className="cards-operacionais cards-cms"><button type="button" onClick={() => setFiltro('todos')}><small>Conteúdos</small><strong>{conteudos.length}</strong><span>Ver inventário</span></button><button type="button" onClick={() => setFiltro('publicado')}><small>Publicados</small><strong>{publicadas}</strong><span>Filtrar publicados</span></button><button type="button" onClick={() => setFiltro('incompletos')}><small>3 idiomas publicados</small><strong>{completas}</strong><span>Localizar traduções pendentes</span></button></div>
      <div><p><strong>Fluxo:</strong> escolha um conteúdo e idioma, salve uma nova versão, revise e publique. A versão anterior permanece no histórico e o público recebe PT-BR como fallback quando a tradução pedida ainda não existir.</p></div>
    </section>
    <section className="grade-cms">
      <div className="bloco lista-cms">
        <header><div><h2>Páginas e seções</h2><p>{visiveis.length} item(ns) visível(is)</p></div><button type="button" onClick={novo}><Plus size={16} /> Novo</button></header>
        <BarraBuscaFiltros busca={busca} aoMudarBusca={setBusca} placeholder="Pesquisar chave, página ou título" total={visiveis.length} filtros={[{ id: 'estado-cms', rotulo: 'Situação', valor: filtro, aoMudar: setFiltro, opcoes: [{ valor: 'todos', rotulo: 'Todos' }, { valor: 'publicado', rotulo: 'Publicados' }, { valor: 'rascunho', rotulo: 'Rascunhos' }, { valor: 'incompletos', rotulo: 'Traduções pendentes' }] }]} />
        {carregando ? <p className="estado-vazio">Carregando conteúdo…</p> : visiveis.length === 0 ? <p className="estado-vazio">Nenhum conteúdo corresponde aos filtros.</p> : <div className="itens-cms">{visiveis.map((item) => <button type="button" className={item.id === selecionadoId ? 'ativo' : ''} onClick={() => editar(item)} key={item.id}><FileCheck2 size={18} /><span><strong>{item.publicacoes['pt-BR']?.titulo ?? item.chave}</strong><small>{item.chave} · {item.tipo}</small></span><span className="idiomas-cms">{idiomasPublicos.map((codigo) => <b className={item.publicacoes[codigo] ? 'publicado' : ''} key={codigo}>{rotulosIdiomaPublico[codigo]}</b>)}</span><Pencil size={15} /></button>)}</div>}
      </div>
      <form className="bloco editor-cms" onSubmit={salvar}>
        <header><div><h2>{selecionadoId ? 'Editor de versão' : 'Selecione um conteúdo'}</h2><p>Publicar é uma ação separada de salvar.</p></div><Languages /></header>
        {selecionadoId ? <div className="campos-cms">
          <label>Chave técnica<input required pattern="[a-z0-9.-]{3,100}" title="Use letras minúsculas, números, ponto ou hífen." value={chave} onChange={(evento) => setChave(evento.target.value.toLowerCase())} readOnly={selecionadoId !== 'novo'} /></label>
          <label>Tipo<input required minLength={3} maxLength={40} value={tipo} onChange={(evento) => setTipo(evento.target.value)} /></label>
          <label>Idioma<select value={idioma} onChange={(evento) => trocarIdioma(evento.target.value as IdiomaPublico)}>{idiomasPublicos.map((codigo) => <option value={codigo} key={codigo}>{rotulosIdiomaPublico[codigo]}</option>)}</select></label>
          <label>Título<input required minLength={3} maxLength={180} value={titulo} onChange={(evento) => setTitulo(evento.target.value)} /></label>
          <label>Texto<textarea required minLength={10} maxLength={5000} rows={9} value={texto} onChange={(evento) => setTexto(evento.target.value)} /></label>
          <div className="acoes-editor-cms"><button type="submit" disabled={salvando}><Save size={16} /> {salvando ? 'Salvando…' : 'Salvar nova versão'}</button><button type="button" className="botao-publicar-cms" disabled={salvando} onClick={() => void publicar()}><CheckCircle2 size={16} /> Publicar</button><button type="button" className="botao-atualizar-cms" disabled={salvando} onClick={() => void carregar()}><RefreshCw size={16} /> Atualizar</button></div>
          {selecionado && <div className="historico-cms"><strong>Histórico</strong>{selecionado.versoes.slice(0, 6).map((versao) => <span key={versao.id}>v{versao.numero} · {rotulosIdiomaPublico[versao.idioma]} · {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(versao.criada_em))}{versao.publicada ? ' · publicada' : ''}</span>)}</div>}
        </div> : <p className="estado-vazio">Escolha um item ao lado ou crie um novo conteúdo.</p>}
      </form>
    </section>
  </div>;
}
