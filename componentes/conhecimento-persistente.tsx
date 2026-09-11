'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { Activity, BookOpenCheck, CheckCircle2, Gauge, RefreshCw, Save, ShieldCheck, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatarDinheiro } from '../lib/calculos';
import { correspondeBusca, formatosDataParaBusca } from '../lib/busca-e-filtros';
import type { PerfilInterno } from '../lib/contratos';
import { formatarDesvio, formatarHoras, podeFormalizarLicao, type IndicadorExecucaoPersistente, type RecomendacaoPersistente } from '../lib/conhecimento-persistente';
import { servicosOficiais } from '../lib/servicos';
import { BarraBuscaFiltros } from './barra-busca-filtros';
import { NotificacaoFlutuante } from './notificacao-flutuante';

function tituloServico(slug: string): string {
  return servicosOficiais.find((servico) => servico.slug === slug)?.titulo ?? slug;
}

type InteligenciaOperacional = {
  servicos: Array<{ slug: string; quantidade: number; horas_medias: number | null; retrabalhos: number }>;
  materiais: Array<{ material: string; quantidade: number }>;
  assuntos: Array<{ assunto: string; quantidade: number }>;
};

function Metrica({ titulo, estimado, realizado, desvio, assertivo, moeda = false }: { titulo: string; estimado: number | string | null; realizado: number | string | null; desvio: number | string | null; assertivo: boolean | null; moeda?: boolean }) {
  const formatar = (valor: number | string | null) => (valor === null ? '—' : moeda ? formatarDinheiro(valor) : formatarHoras(valor));
  return (
    <div className="metrica-comparada">
      <small>{titulo}</small>
      <strong>
        {formatar(estimado)} → {formatar(realizado)}
      </strong>
      <span className={assertivo === false ? 'fora-faixa' : 'dentro-faixa'}>
        {formatarDesvio(desvio)}
        {assertivo === null ? '' : assertivo ? ' · dentro de ±15%' : ' · fora de ±15%'}
      </span>
    </div>
  );
}

export function ConhecimentoPersistente({ cliente, perfil, filtroInicial = '' }: { cliente: SupabaseClient; perfil: PerfilInterno; filtroInicial?: string }) {
  const [indicadores, setIndicadores] = useState<IndicadorExecucaoPersistente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [processando, setProcessando] = useState('');
  const [resumos, setResumos] = useState<Record<string, string>>({});
  const [assuntos, setAssuntos] = useState<Record<string, string>>({});
  const [servicoId, setServicoId] = useState('');
  const [quantidade, setQuantidade] = useState('1');
  const [recomendacao, setRecomendacao] = useState<RecomendacaoPersistente | null>(null);
  const [mensagemRecomendacao, setMensagemRecomendacao] = useState('');
  const [busca, setBusca] = useState('');
  const [filtroLicao, setFiltroLicao] = useState(filtroInicial === 'em_validacao' ? 'em_validacao' : 'todos');
  const [filtroAssertividade, setFiltroAssertividade] = useState(filtroInicial === 'assertivo' ? 'assertivo' : 'todos');
  const [inteligencia, setInteligencia] = useState<InteligenciaOperacional>({ servicos: [], materiais: [], assuntos: [] });

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    const [resposta, respostaInteligencia] = await Promise.all([
      cliente.rpc('listar_indicadores_execucoes_demonstrativas'),
      cliente.rpc('listar_inteligencia_operacional_demonstrativa'),
    ]);
    if (resposta.error || respostaInteligencia.error) setErro('Não foi possível carregar indicadores e conhecimento operacional.');
    else {
      const dados = (resposta.data ?? []) as IndicadorExecucaoPersistente[];
      setIndicadores(dados);
      setServicoId((atual) => atual || dados[0]?.servico_id || '');
      if (respostaInteligencia.data && typeof respostaInteligencia.data === 'object') setInteligencia(respostaInteligencia.data as InteligenciaOperacional);
    }
    setCarregando(false);
  }, [cliente]);

  useEffect(() => {
    queueMicrotask(() => void carregar());
  }, [carregar]);

  const formalizadas = indicadores.filter((item) => item.licao_estado === 'formalizada').length;
  const assertivas = indicadores.filter((item) => item.esforco_assertivo === true).length;
  const percentualAssertivo = indicadores.length ? Math.round((assertivas / indicadores.length) * 100) : 0;
  const servicos = useMemo(() => [...new Map(indicadores.map((item) => [item.servico_id, item.servico_slug])).entries()], [indicadores]);
  const indicadoresVisiveis = useMemo(() => indicadores.filter((item) => correspondeBusca(busca, item.solicitacao_codigo, item.empresa_nome, item.servico_slug, item.licao_resumo, item.licao_assuntos, formatosDataParaBusca(item.concluida_em)) && (filtroLicao === 'todos' || (filtroLicao === 'sem_licao' ? !item.licao_estado : item.licao_estado === filtroLicao)) && (filtroAssertividade === 'todos' || (filtroAssertividade === 'assertivo' ? item.esforco_assertivo === true : item.esforco_assertivo === false))), [busca, filtroAssertividade, filtroLicao, indicadores]);

  function abrirIndicadores(filtro: 'formalizada' | 'em_validacao' | 'assertivo' | 'todos') {
    if (filtro === 'assertivo') {
      setFiltroAssertividade('assertivo');
      setFiltroLicao('todos');
    } else {
      setFiltroLicao(filtro);
      setFiltroAssertividade('todos');
    }
    window.requestAnimationFrame(() => document.getElementById('indicadores-conhecimento')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  async function criarLicao(indicador: IndicadorExecucaoPersistente) {
    const resumo = resumos[indicador.execucao_id]?.trim() ?? '';
    if (resumo.length < 5) {
      setErro('Descreva a lição em pelo menos cinco caracteres.');
      return;
    }
    setProcessando(indicador.execucao_id);
    setErro('');
    const listaAssuntos = (assuntos[indicador.execucao_id] ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    const resposta = await cliente.rpc('criar_licao_demonstrativa', {
      execucao: indicador.execucao_id,
      resumo,
      assuntos: listaAssuntos,
    });
    if (resposta.error) setErro('A lição não pôde ser registrada. Verifique conteúdo e estado da execução.');
    else {
      setMensagem('Lição registrada e enviada para validação.');
      await carregar();
    }
    setProcessando('');
  }

  async function formalizar(licaoId: string) {
    setProcessando(licaoId);
    setErro('');
    const resposta = await cliente.rpc('formalizar_licao_demonstrativa', {
      licao: licaoId,
    });
    if (resposta.error) setErro('A lição não pôde ser formalizada.');
    else {
      setMensagem('Lição formalizada. Este caso agora pode alimentar recomendações.');
      await carregar();
    }
    setProcessando('');
  }

  async function recomendar(evento: React.FormEvent) {
    evento.preventDefault();
    setMensagemRecomendacao('');
    setRecomendacao(null);
    const quantidadeNumerica = Number(quantidade);
    if (!servicoId || !Number.isFinite(quantidadeNumerica) || quantidadeNumerica <= 0) {
      setMensagemRecomendacao('Selecione o serviço e informe uma quantidade positiva.');
      return;
    }
    const resposta = await cliente.rpc('recomendar_horas_demonstrativas', {
      servico: servicoId,
      quantidade_nova: quantidadeNumerica,
      equipamento: null,
    });
    if (resposta.error) setMensagemRecomendacao('Não foi possível calcular a recomendação.');
    else setRecomendacao(resposta.data as RecomendacaoPersistente);
  }

  if (carregando)
    return (
      <div className="painel">
        <section className="bloco estado-vazio-execucao">
          <RefreshCw className="girando" />
          <h3>Carregando conhecimento persistente</h3>
        </section>
      </div>
    );

  return (
    <div className="painel conhecimento-persistente">
      <NotificacaoFlutuante mensagem={erro || mensagemRecomendacao} tipo="erro" aoFechar={() => { setErro(''); setMensagemRecomendacao(''); }} />
      <NotificacaoFlutuante mensagem={mensagem} tipo="sucesso" aoFechar={() => setMensagem('')} />
      <section className="cards-kpi conhecimento-kpi cards-kpi-interativos">
        <button type="button" onClick={() => abrirIndicadores('formalizada')}>
          <span className="icone-kpi azul">
            <BookOpenCheck />
          </span>
          <small>Lições formalizadas</small>
          <strong>{formalizadas}</strong>
          <p>{indicadores.filter((item) => item.licao_estado === 'em_validacao').length} aguardam validação</p>
        </button>
        <button type="button" onClick={() => abrirIndicadores('assertivo')}>
          <span className="icone-kpi verde">
            <Gauge />
          </span>
          <small>Assertividade de esforço</small>
          <strong>{percentualAssertivo}%</strong>
          <p>
            {assertivas} de {indicadores.length} dentro de ±15%
          </p>
        </button>
        <button type="button" onClick={() => abrirIndicadores('todos')}>
          <span className="icone-kpi ciano">
            <Activity />
          </span>
          <small>Execuções comparadas</small>
          <strong>{indicadores.length}</strong>
          <p>somente concluídas e demonstrativas</p>
        </button>
      </section>
      <section className="bloco guia-conhecimento">
        <header><div><h2>Como usar esta página</h2><p>Transforme o encerramento dos serviços em referências auditáveis para os próximos trabalhos.</p></div><BookOpenCheck /></header>
        <ol>
          <li><strong>Compare</strong><span>Abra “Estimado versus realizado” e confira esforço, duração e custo de cada serviço concluído.</span></li>
          <li><strong>Registre</strong><span>Descreva o que deve ser repetido ou evitado e inclua assuntos que facilitem a pesquisa.</span></li>
          <li><strong>Valide</strong><span>Validador ou Administrador formaliza a lição. Antes disso, ela não influencia recomendações.</span></li>
          <li><strong>Recomende</strong><span>Escolha serviço e quantidade. O sistema calcula mediana e faixa Q1–Q3 somente com casos elegíveis.</span></li>
        </ol>
        <p><strong>Para testar:</strong> conclua uma execução, registre uma lição, formalize-a com Validador ou Administrador e volte ao recomendador. A confiança cresce de baixa para média a partir de cinco casos e para alta a partir de quinze.</p>
      </section>
      <section className="bloco recomendador-persistente">
        <header>
          <div>
            <h2>Recomendação estatística</h2>
            <p>Somente casos concluídos do mesmo serviço e com lição formalizada.</p>
          </div>
          <Sparkles />
        </header>
        <form onSubmit={recomendar}>
          <label>
            Serviço
            <select value={servicoId} onChange={(evento) => setServicoId(evento.target.value)}>
              {servicos.map(([id, slug]) => (
                <option key={id} value={id}>
                  {tituloServico(slug)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Quantidade
            <input type="number" min="0.01" step="0.01" value={quantidade} onChange={(evento) => setQuantidade(evento.target.value)} />
          </label>
          <button type="submit">
            <Sparkles size={16} /> Recomendar
          </button>
        </form>
        {recomendacao && (
          <div className="resultado-recomendacao">
            <strong>{recomendacao.horas_sugeridas === null ? 'Sem base elegível' : `${formatarHoras(recomendacao.horas_sugeridas)} sugeridas`}</strong>
            <span>
              {recomendacao.quantidade_casos} casos · confiança {recomendacao.confianca}
            </span>
            {recomendacao.q1 !== null && (
              <small>
                Faixa Q1–Q3: {formatarHoras(recomendacao.q1)} a {formatarHoras(recomendacao.q3)}. Estimativas fora desta faixa exigem justificativa.
              </small>
            )}
            {recomendacao.fator_correcao !== null && <small>Fator de correção: {recomendacao.fator_correcao}×</small>}
          </div>
        )}
      </section>
      <section className="bloco metodologia-conhecimento">
        <header>
          <div>
            <h2>Como o conhecimento é formado</h2>
            <p>Regra determinística e auditável; a IA não inventa valores.</p>
          </div>
          <ShieldCheck />
        </header>
        <ol>
          <li>
            <strong>0 casos</strong>
            <span>Sem faixa sugerida.</span>
          </li>
          <li>
            <strong>1–4 casos</strong>
            <span>Referência individual, confiança baixa.</span>
          </li>
          <li>
            <strong>5–14 casos</strong>
            <span>Mediana e faixa Q1–Q3, confiança média.</span>
          </li>
          <li>
            <strong>15+ casos</strong>
            <span>Faixa e fator de correção, confiança alta.</span>
          </li>
        </ol>
        <p>A lição formalizada torna o caso elegível e preserva o contexto para análise. Hoje o cálculo sugere horas; duração e custo já são comparados, mas ainda não geram recomendação automática.</p>
      </section>
      <section className="bloco inteligencia-operacional">
        <header><div><h2>Inteligência operacional</h2><p>Padrões consolidados dos trabalhos registrados; nenhum dado é inventado.</p></div><Activity /></header>
        <div className="grade-inteligencia-operacional">
          <article><h3>Serviços e produtos mais usados</h3>{inteligencia.servicos.length === 0 ? <p>Os padrões surgirão após as primeiras execuções.</p> : <ol>{inteligencia.servicos.slice(0, 8).map((item) => <li key={item.slug}><span><strong>{tituloServico(item.slug)}</strong><small>{item.quantidade} trabalho(s) · {item.retrabalhos} retrabalho(s)</small></span><b>{item.horas_medias == null ? '—' : `${item.horas_medias} h médias`}</b></li>)}</ol>}</article>
          <article><h3>Materiais recorrentes</h3>{inteligencia.materiais.length === 0 ? <p>Sem materiais suficientes para análise.</p> : <ol>{inteligencia.materiais.slice(0, 8).map((item) => <li key={item.material}><span><strong>{item.material}</strong><small>Vocabulário padronizado das solicitações</small></span><b>{item.quantidade}</b></li>)}</ol>}</article>
          <article><h3>Técnicas e estratégias aprendidas</h3>{inteligencia.assuntos.length === 0 ? <p>Formalize lições e seus assuntos para gerar dicas pesquisáveis.</p> : <ol>{inteligencia.assuntos.slice(0, 8).map((item) => <li key={item.assunto}><span><strong>{item.assunto}</strong><small>Presente em lições formalizadas</small></span><b>{item.quantidade}</b></li>)}</ol>}</article>
        </div>
        <p className="nota-inteligencia">Análises comerciais identificáveis por cliente ficam restritas ao Administrador, na área administrativa; Técnicos e Validadores recebem aqui somente padrões operacionais necessários ao trabalho.</p>
      </section>
      <section className="bloco lista-indicadores" id="indicadores-conhecimento">
        <header>
          <div>
            <h2>Estimado versus realizado</h2>
            <p>Custos aparecem somente para Validador e Administrador.</p>
          </div>
          <button type="button" onClick={() => void carregar()}>
            <RefreshCw size={15} /> Atualizar
          </button>
        </header>
        <BarraBuscaFiltros
          busca={busca}
          aoMudarBusca={setBusca}
          placeholder="Pesquisar protocolo, empresa, serviço, assunto ou data"
          total={indicadoresVisiveis.length}
          filtros={[
            {
              id: 'estado-licao',
              rotulo: 'Lição',
              valor: filtroLicao,
              aoMudar: setFiltroLicao,
              opcoes: [
                { valor: 'todos', rotulo: 'Todas as lições' },
                { valor: 'sem_licao', rotulo: 'Sem lição' },
                { valor: 'em_validacao', rotulo: 'Em validação' },
                { valor: 'formalizada', rotulo: 'Formalizadas' },
              ],
            },
            {
              id: 'assertividade',
              rotulo: 'Esforço',
              valor: filtroAssertividade,
              aoMudar: setFiltroAssertividade,
              opcoes: [
                { valor: 'todos', rotulo: 'Toda assertividade' },
                { valor: 'assertivo', rotulo: 'Dentro de ±15%' },
                { valor: 'fora', rotulo: 'Fora de ±15%' },
              ],
            },
          ]}
        />
        {!indicadores.length && (
          <div className="estado-vazio-execucao">
            <ShieldCheck />
            <h3>Nenhuma execução concluída</h3>
            <p>O comparativo surgirá após o fechamento aprovado.</p>
          </div>
        )}
        {indicadoresVisiveis.map((item) => (
          <article key={item.execucao_id} className="indicador-execucao">
            <header>
              <div>
                <strong>
                  DEM-SOL-{String(item.solicitacao_codigo).padStart(4, '0')} · {item.empresa_nome}
                </strong>
                <small>
                  {tituloServico(item.servico_slug)} · concluída em {new Intl.DateTimeFormat('pt-BR').format(new Date(item.concluida_em))}
                </small>
              </div>
              {item.licao_estado && <span className={`estado estado-${item.licao_estado.replace('_', '-')}`}>{item.licao_estado === 'formalizada' ? 'Formalizada' : 'Em validação'}</span>}
            </header>
            <div className="metricas-comparadas">
              <Metrica titulo="Esforço" estimado={item.horas_estimadas} realizado={item.horas_realizadas} desvio={item.desvio_esforco} assertivo={item.esforco_assertivo} />
              <Metrica titulo="Duração" estimado={item.duracao_estimada_horas} realizado={item.duracao_realizada_horas} desvio={item.desvio_duracao} assertivo={item.duracao_assertiva} />
              {item.custo_estimado !== null && <Metrica titulo="Custo (BRL)" estimado={item.custo_estimado} realizado={item.custo_realizado} desvio={item.desvio_custo} assertivo={item.custo_assertivo} moeda />}
            </div>
            {item.licao_id ? (
              <div className="licao-registrada">
                <BookOpenCheck size={18} />
                <div>
                  <strong>{item.licao_resumo}</strong>
                  <small>{item.licao_assuntos?.join(' · ') || 'Sem assuntos'}</small>
                </div>
                {item.licao_estado === 'em_validacao' && podeFormalizarLicao(perfil) && (
                  <button type="button" disabled={processando === item.licao_id} onClick={() => void formalizar(item.licao_id!)}>
                    <CheckCircle2 size={15} /> Formalizar
                  </button>
                )}
              </div>
            ) : (
              <div className="nova-licao">
                <label>
                  Lição aprendida
                  <textarea
                    required
                    minLength={5}
                    maxLength={2000}
                    value={resumos[item.execucao_id] ?? ''}
                    onChange={(evento) =>
                      setResumos((atual) => ({
                        ...atual,
                        [item.execucao_id]: evento.target.value,
                      }))
                    }
                    placeholder="O que deve ser repetido ou evitado no próximo serviço?"
                  />
                </label>
                <label>
                  Assuntos, separados por vírgula
                  <input
                    value={assuntos[item.execucao_id] ?? ''}
                    onChange={(evento) =>
                      setAssuntos((atual) => ({
                        ...atual,
                        [item.execucao_id]: evento.target.value,
                      }))
                    }
                    placeholder="fixação, CAD, estabilização"
                  />
                </label>
                <button type="button" disabled={processando === item.execucao_id} onClick={() => void criarLicao(item)}>
                  <Save size={15} /> Enviar para validação
                </button>
              </div>
            )}
          </article>
        ))}
      </section>
    </div>
  );
}
