'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { Activity, BookOpenCheck, CheckCircle2, Gauge, RefreshCw, Save, ShieldCheck, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatarDinheiro } from '../lib/calculos';
import type { PerfilInterno } from '../lib/contratos';
import { formatarDesvio, formatarHoras, podeFormalizarLicao, type IndicadorExecucaoPersistente, type RecomendacaoPersistente } from '../lib/conhecimento-persistente';
import { servicosOficiais } from '../lib/servicos';

function tituloServico(slug: string): string {
  return servicosOficiais.find((servico) => servico.slug === slug)?.titulo ?? slug;
}

function Metrica({ titulo, estimado, realizado, desvio, assertivo, moeda = false }: { titulo: string; estimado: number | string | null; realizado: number | string | null; desvio: number | string | null; assertivo: boolean | null; moeda?: boolean }) {
  const formatar = (valor: number | string | null) => valor === null ? '—' : moeda ? formatarDinheiro(valor) : formatarHoras(valor);
  return <div className="metrica-comparada"><small>{titulo}</small><strong>{formatar(estimado)} → {formatar(realizado)}</strong><span className={assertivo === false ? 'fora-faixa' : 'dentro-faixa'}>{formatarDesvio(desvio)}{assertivo === null ? '' : assertivo ? ' · dentro de ±15%' : ' · fora de ±15%'}</span></div>;
}

export function ConhecimentoPersistente({ cliente, perfil }: { cliente: SupabaseClient; perfil: PerfilInterno }) {
  const [indicadores, setIndicadores] = useState<IndicadorExecucaoPersistente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [processando, setProcessando] = useState('');
  const [resumos, setResumos] = useState<Record<string, string>>({});
  const [assuntos, setAssuntos] = useState<Record<string, string>>({});
  const [servicoId, setServicoId] = useState('');
  const [quantidade, setQuantidade] = useState('1');
  const [recomendacao, setRecomendacao] = useState<RecomendacaoPersistente | null>(null);
  const [mensagemRecomendacao, setMensagemRecomendacao] = useState('');

  const carregar = useCallback(async () => {
    setCarregando(true); setErro('');
    const resposta = await cliente.rpc('listar_indicadores_execucoes_demonstrativas');
    if (resposta.error) setErro('Não foi possível carregar indicadores e lições persistentes.');
    else {
      const dados = (resposta.data ?? []) as IndicadorExecucaoPersistente[];
      setIndicadores(dados);
      setServicoId((atual) => atual || dados[0]?.servico_id || '');
    }
    setCarregando(false);
  }, [cliente]);

  useEffect(() => { queueMicrotask(() => void carregar()); }, [carregar]);

  const formalizadas = indicadores.filter((item) => item.licao_estado === 'formalizada').length;
  const assertivas = indicadores.filter((item) => item.esforco_assertivo === true).length;
  const percentualAssertivo = indicadores.length ? Math.round(assertivas / indicadores.length * 100) : 0;
  const servicos = useMemo(() => [...new Map(indicadores.map((item) => [item.servico_id, item.servico_slug])).entries()], [indicadores]);

  async function criarLicao(indicador: IndicadorExecucaoPersistente) {
    const resumo = resumos[indicador.execucao_id]?.trim() ?? '';
    if (resumo.length < 5) { setErro('Descreva a lição em pelo menos cinco caracteres.'); return; }
    setProcessando(indicador.execucao_id); setErro('');
    const listaAssuntos = (assuntos[indicador.execucao_id] ?? '').split(',').map((item) => item.trim()).filter(Boolean);
    const resposta = await cliente.rpc('criar_licao_demonstrativa', { execucao: indicador.execucao_id, resumo, assuntos: listaAssuntos });
    if (resposta.error) setErro('A lição não pôde ser registrada. Verifique conteúdo e estado da execução.');
    else await carregar();
    setProcessando('');
  }

  async function formalizar(licaoId: string) {
    setProcessando(licaoId); setErro('');
    const resposta = await cliente.rpc('formalizar_licao_demonstrativa', { licao: licaoId });
    if (resposta.error) setErro('A lição não pôde ser formalizada.'); else await carregar();
    setProcessando('');
  }

  async function recomendar(evento: React.FormEvent) {
    evento.preventDefault(); setMensagemRecomendacao(''); setRecomendacao(null);
    const quantidadeNumerica = Number(quantidade);
    if (!servicoId || !Number.isFinite(quantidadeNumerica) || quantidadeNumerica <= 0) { setMensagemRecomendacao('Selecione o serviço e informe uma quantidade positiva.'); return; }
    const resposta = await cliente.rpc('recomendar_horas_demonstrativas', { servico: servicoId, quantidade_nova: quantidadeNumerica, equipamento: null });
    if (resposta.error) setMensagemRecomendacao('Não foi possível calcular a recomendação.'); else setRecomendacao(resposta.data as RecomendacaoPersistente);
  }

  if (carregando) return <div className="painel"><section className="bloco estado-vazio-execucao"><RefreshCw className="girando" /><h3>Carregando conhecimento persistente</h3></section></div>;

  return <div className="painel conhecimento-persistente">
    {erro && <p className="aviso-persistencia" role="alert">{erro}</p>}
    <section className="cards-kpi conhecimento-kpi">
      <article><span className="icone-kpi azul"><BookOpenCheck /></span><small>Lições formalizadas</small><strong>{formalizadas}</strong><p>{indicadores.filter((item) => item.licao_estado === 'em_validacao').length} aguardam validação</p></article>
      <article><span className="icone-kpi verde"><Gauge /></span><small>Assertividade de esforço</small><strong>{percentualAssertivo}%</strong><p>{assertivas} de {indicadores.length} dentro de ±15%</p></article>
      <article><span className="icone-kpi ciano"><Activity /></span><small>Execuções comparadas</small><strong>{indicadores.length}</strong><p>somente concluídas e demonstrativas</p></article>
    </section>
    <section className="bloco recomendador-persistente"><header><div><h2>Recomendação estatística</h2><p>Somente casos concluídos do mesmo serviço e com lição formalizada.</p></div><Sparkles /></header><form onSubmit={recomendar}><label>Serviço<select value={servicoId} onChange={(evento) => setServicoId(evento.target.value)}>{servicos.map(([id, slug]) => <option key={id} value={id}>{tituloServico(slug)}</option>)}</select></label><label>Quantidade<input type="number" min="0.01" step="0.01" value={quantidade} onChange={(evento) => setQuantidade(evento.target.value)} /></label><button type="submit"><Sparkles size={16} /> Recomendar</button></form>{mensagemRecomendacao && <p>{mensagemRecomendacao}</p>}{recomendacao && <div className="resultado-recomendacao"><strong>{recomendacao.horas_sugeridas === null ? 'Sem base elegível' : `${formatarHoras(recomendacao.horas_sugeridas)} sugeridas`}</strong><span>{recomendacao.quantidade_casos} casos · confiança {recomendacao.confianca}</span>{recomendacao.q1 !== null && <small>Faixa Q1–Q3: {formatarHoras(recomendacao.q1)} a {formatarHoras(recomendacao.q3)}. Estimativas fora desta faixa exigem justificativa.</small>}{recomendacao.fator_correcao !== null && <small>Fator de correção: {recomendacao.fator_correcao}×</small>}</div>}</section>
    <section className="bloco lista-indicadores"><header><div><h2>Estimado versus realizado</h2><p>Custos aparecem somente para Validador e Administrador.</p></div><button type="button" onClick={() => void carregar()}><RefreshCw size={15} /> Atualizar</button></header>
      {!indicadores.length && <div className="estado-vazio-execucao"><ShieldCheck /><h3>Nenhuma execução concluída</h3><p>O comparativo surgirá após o fechamento aprovado.</p></div>}
      {indicadores.map((item) => <article key={item.execucao_id} className="indicador-execucao"><header><div><strong>DEM-SOL-{String(item.solicitacao_codigo).padStart(4, '0')} · {item.empresa_nome}</strong><small>{tituloServico(item.servico_slug)} · concluída em {new Intl.DateTimeFormat('pt-BR').format(new Date(item.concluida_em))}</small></div>{item.licao_estado && <span className={`estado estado-${item.licao_estado.replace('_', '-')}`}>{item.licao_estado === 'formalizada' ? 'Formalizada' : 'Em validação'}</span>}</header><div className="metricas-comparadas"><Metrica titulo="Esforço" estimado={item.horas_estimadas} realizado={item.horas_realizadas} desvio={item.desvio_esforco} assertivo={item.esforco_assertivo} /><Metrica titulo="Duração" estimado={item.duracao_estimada_horas} realizado={item.duracao_realizada_horas} desvio={item.desvio_duracao} assertivo={item.duracao_assertiva} />{item.custo_estimado !== null && <Metrica titulo="Custo (BRL)" estimado={item.custo_estimado} realizado={item.custo_realizado} desvio={item.desvio_custo} assertivo={item.custo_assertivo} moeda />}</div>{item.licao_id ? <div className="licao-registrada"><BookOpenCheck size={18} /><div><strong>{item.licao_resumo}</strong><small>{item.licao_assuntos?.join(' · ') || 'Sem assuntos'}</small></div>{item.licao_estado === 'em_validacao' && podeFormalizarLicao(perfil) && <button type="button" disabled={processando === item.licao_id} onClick={() => void formalizar(item.licao_id!)}><CheckCircle2 size={15} /> Formalizar</button>}</div> : <div className="nova-licao"><label>Lição aprendida<textarea maxLength={2000} value={resumos[item.execucao_id] ?? ''} onChange={(evento) => setResumos((atual) => ({ ...atual, [item.execucao_id]: evento.target.value }))} placeholder="O que deve ser repetido ou evitado no próximo serviço?" /></label><label>Assuntos, separados por vírgula<input value={assuntos[item.execucao_id] ?? ''} onChange={(evento) => setAssuntos((atual) => ({ ...atual, [item.execucao_id]: evento.target.value }))} placeholder="fixação, CAD, estabilização" /></label><button type="button" disabled={processando === item.execucao_id} onClick={() => void criarLicao(item)}><Save size={15} /> Enviar para validação</button></div>}</article>)}
    </section>
  </div>;
}
