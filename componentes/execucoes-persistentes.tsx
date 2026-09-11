'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { Activity, CheckCircle2, Circle, ClipboardCheck, Clock3, Eye, Play, RefreshCw, RotateCcw, Save, Send, ShieldCheck, UserRoundCog } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PerfilInterno } from '../lib/contratos';
import { correspondeBusca, formatosDataParaBusca } from '../lib/busca-e-filtros';
import { MOTIVOS_RETRABALHO } from '../lib/campos-padronizados';
import { calcularProgressoExecucao, etapasConcluidas, etapaPodeAvancar, normalizarAtualizacaoEtapa, podeAtribuirResponsavel, podeDecidirFechamento, podeOperarExecucoes, validarFechamento, type EstadoEtapaExecucao, type ExecucaoInterna, type ResponsavelOperacional } from '../lib/execucoes-persistentes';
import { tituloServicoCliente } from '../lib/portal-cliente';
import { BarraBuscaFiltros } from './barra-busca-filtros';
import { NotificacaoFlutuante } from './notificacao-flutuante';
import { tituloDescritivoTrabalho } from '../lib/titulos-trabalho';

const apresentacaoEtapa = {
  a_fazer: { rotulo: 'A fazer', Icone: Circle },
  em_andamento: { rotulo: 'Em andamento', Icone: Clock3 },
  concluida: { rotulo: 'Concluída', Icone: CheckCircle2 },
} as const;

function dataHora(valor: string | null): string {
  if (!valor) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(valor));
}

export function ExecucoesPersistentes({ cliente, perfil, filtroEstadoInicial = '' }: { cliente: SupabaseClient; perfil: PerfilInterno; filtroEstadoInicial?: string }) {
  const [execucoes, setExecucoes] = useState<ExecucaoInterna[]>([]);
  const [selecionadaId, setSelecionadaId] = useState('');
  const selecionadaIdRef = useRef('');
  const [progressos, setProgressos] = useState<Record<string, number>>({});
  const [carregando, setCarregando] = useState(true);
  const [processandoId, setProcessandoId] = useState('');
  const [horasReais, setHorasReais] = useState<Record<string, number>>({});
  const [custosExtras, setCustosExtras] = useState(0);
  const [retrabalho, setRetrabalho] = useState(false);
  const [mudancaEscopo, setMudancaEscopo] = useState(false);
  const [causa, setCausa] = useState('');
  const [causaPadronizada, setCausaPadronizada] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [aprendizado, setAprendizado] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [responsaveis, setResponsaveis] = useState<ResponsavelOperacional[]>([]);
  const [responsavelSelecionado, setResponsavelSelecionado] = useState('');
  const [busca, setBusca] = useState('');
  const [filtroEstado, setFiltroEstado] = useState(filtroEstadoInicial || 'todos');
  const [filtroFechamento, setFiltroFechamento] = useState('todos');
  const [retornoAberto, setRetornoAberto] = useState('');
  const [motivoRetorno, setMotivoRetorno] = useState('');

  const preencherFormulario = useCallback((execucao: ExecucaoInterna) => {
    setHorasReais(Object.fromEntries(execucao.equipamentos.map((item) => [item.equipamento_id, Number(item.horas_reais ?? item.horas_estimadas)])));
    setCustosExtras(Number(execucao.custos_extras_reais ?? 0));
    setRetrabalho(Boolean(execucao.retrabalho));
    setMudancaEscopo(Boolean(execucao.mudanca_escopo));
    setCausa(execucao.causa_principal ?? '');
    setCausaPadronizada(MOTIVOS_RETRABALHO.includes(execucao.causa_principal as (typeof MOTIVOS_RETRABALHO)[number]) ? (execucao.causa_principal ?? '') : execucao.causa_principal ? 'Outros' : '');
    setObservacoes(execucao.fechamento_observacoes ?? '');
    setAprendizado(execucao.fechamento_aprendizado ?? '');
    setJustificativa('');
  }, []);

  const carregar = useCallback(async () => {
    if (!podeOperarExecucoes(perfil)) return;
    setCarregando(true);
    setErro('');
    const [respostaExecucoes, respostaResponsaveis] = await Promise.all([cliente.rpc('listar_execucoes_demonstrativas'), podeAtribuirResponsavel(perfil) ? cliente.rpc('listar_responsaveis_demonstrativos') : Promise.resolve({ data: [], error: null })]);
    if (respostaExecucoes.error || respostaResponsaveis.error) {
      setErro('Não foi possível carregar as execuções de homologação.');
      setCarregando(false);
      return;
    }
    const lista = (Array.isArray(respostaExecucoes.data) ? respostaExecucoes.data : []) as ExecucaoInterna[];
    const tecnicos = (respostaResponsaveis.data ?? []) as ResponsavelOperacional[];
    setExecucoes(lista);
    setResponsaveis(tecnicos);
    const alvo = lista.find((item) => item.execucao_id === selecionadaIdRef.current) ?? lista[0];
    selecionadaIdRef.current = alvo?.execucao_id ?? '';
    setSelecionadaId(selecionadaIdRef.current);
    if (alvo) {
      preencherFormulario(alvo);
      setResponsavelSelecionado(alvo.responsavel_id ?? tecnicos[0]?.usuario_id ?? '');
    }
    setProgressos(Object.fromEntries(lista.flatMap((execucao) => execucao.etapas.map((etapa) => [etapa.id, etapa.progresso]))));
    setCarregando(false);
  }, [cliente, perfil, preencherFormulario]);

  useEffect(() => {
    queueMicrotask(() => void carregar());
  }, [carregar]);
  useEffect(() => {
    if (!podeOperarExecucoes(perfil)) return;
    const canal = cliente
      .channel('etapas-execucao-equipe')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'etapas_execucao' }, () => void carregar())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'etapas_execucao' }, () => void carregar())
      .subscribe();
    return () => {
      void cliente.removeChannel(canal);
    };
  }, [carregar, cliente, perfil]);

  const execucoesVisiveis = useMemo(() => execucoes.filter((execucao) => correspondeBusca(busca, execucao.solicitacao_codigo, execucao.empresa_nome, execucao.servico_slug, execucao.descricao, execucao.responsavel_nome, execucao.estado, execucao.fechamento_estado, formatosDataParaBusca(execucao.criada_em)) && (filtroEstado === 'todos' || execucao.estado === filtroEstado) && (filtroFechamento === 'todos' || execucao.fechamento_estado === filtroFechamento)), [busca, execucoes, filtroEstado, filtroFechamento]);
  const selecionada = useMemo(() => execucoesVisiveis.find((item) => item.execucao_id === selecionadaId) ?? execucoesVisiveis[0], [execucoesVisiveis, selecionadaId]);
  const progressoGeral = selecionada ? calcularProgressoExecucao(selecionada.etapas) : 0;
  const podeFechar = selecionada ? etapasConcluidas(selecionada.etapas) : false;

  function selecionarExecucao(execucao: ExecucaoInterna) {
    selecionadaIdRef.current = execucao.execucao_id;
    setSelecionadaId(execucao.execucao_id);
    preencherFormulario(execucao);
    setResponsavelSelecionado(execucao.responsavel_id ?? responsaveis[0]?.usuario_id ?? '');
  }

  async function atribuirResponsavel() {
    if (!selecionada || !responsavelSelecionado || !podeAtribuirResponsavel(perfil)) return;
    setProcessandoId('atribuicao');
    setErro('');
    setMensagem('');
    const { error } = await cliente.rpc('atribuir_responsavel_execucao_demonstrativa', {
      execucao: selecionada.execucao_id,
      responsavel: responsavelSelecionado,
    });
    if (error) {
      setErro(error.code === '42501' ? 'Somente o Administrador pode atribuir o responsável.' : 'Não foi possível atribuir o Técnico. Confirme o estado da execução e tente novamente.');
    } else {
      setMensagem('Responsável Técnico atribuído com registro na auditoria.');
      await carregar();
    }
    setProcessandoId('');
  }

  async function atualizarEtapa(etapaId: string, estado: EstadoEtapaExecucao, progresso: number) {
    if (selecionada && estado !== 'a_fazer' && !etapaPodeAvancar(selecionada.etapas, etapaId)) {
      setErro('Conclua as etapas anteriores antes de avançar esta etapa.');
      return;
    }
    const normalizada = normalizarAtualizacaoEtapa(estado, progresso);
    if (!normalizada) {
      setErro('Use 1% a 99% para uma etapa em andamento. A conclusão corresponde a 100%.');
      return;
    }
    setProcessandoId(etapaId);
    setErro('');
    setMensagem('');
    const { error } = await cliente.rpc('atualizar_etapa_execucao_demonstrativa', {
      etapa: etapaId,
      novo_estado: normalizada.estado,
      novo_progresso: normalizada.progresso,
    });
    if (error) {
      setErro(error.code === '42501' ? 'Seu perfil não pode atualizar esta execução.' : 'A etapa mudou ou não pôde ser atualizada. Atualize e tente novamente.');
    } else {
      setMensagem(normalizada.estado === 'concluida' ? 'Etapa concluída e acompanhamento do Cliente atualizado.' : 'Progresso salvo e acompanhamento do Cliente atualizado.');
      await carregar();
    }
    setProcessandoId('');
  }

  function atualizarPelaBarra(evento: React.MouseEvent<HTMLButtonElement>, etapaId: string) {
    const limites = evento.currentTarget.getBoundingClientRect();
    const percentual = Math.max(0, Math.min(100, Math.round(((evento.clientX - limites.left) / limites.width) * 100)));
    const estado: EstadoEtapaExecucao = percentual === 0 ? 'a_fazer' : percentual === 100 ? 'concluida' : 'em_andamento';
    void atualizarEtapa(etapaId, estado, percentual);
  }

  async function retornarParaEtapa(etapaId: string) {
    if (!selecionada) return;
    const motivo = motivoRetorno.trim();
    if (motivo.length < 10 || motivo.length > 1000) {
      setErro('Explique em 10 a 1000 caracteres por que o trabalho precisa retornar.');
      return;
    }
    setProcessandoId(`retorno-${etapaId}`);
    setErro('');
    setMensagem('');
    const { error } = await cliente.rpc('retornar_execucao_etapa_demonstrativa', { execucao: selecionada.execucao_id, etapa_destino: etapaId, motivo });
    if (error) setErro(error.message || 'Não foi possível retornar o trabalho para esta etapa.');
    else {
      setMensagem('Trabalho retornado para a etapa selecionada. As etapas posteriores foram reiniciadas e o motivo foi auditado.');
      setRetornoAberto('');
      setMotivoRetorno('');
      await carregar();
    }
    setProcessandoId('');
  }

  async function enviarFechamento() {
    if (!selecionada) return;
    const validacao = validarFechamento({
      equipamentos: selecionada.equipamentos,
      horas: horasReais,
      custosExtras,
      retrabalho,
      mudancaEscopo,
      causa,
      observacoes,
      aprendizado,
    });
    if (validacao) {
      setErro(validacao);
      return;
    }
    setProcessandoId('fechamento');
    setErro('');
    setMensagem('');
    const { error } = await cliente.rpc('registrar_fechamento_demonstrativo', {
      execucao: selecionada.execucao_id,
      equipamentos_horas: selecionada.equipamentos.map((item) => ({
        equipamento_id: item.equipamento_id,
        horas: horasReais[item.equipamento_id],
      })),
      custos_extras: custosExtras,
      houve_retrabalho: retrabalho,
      houve_mudanca_escopo: mudancaEscopo,
      causa: causa.trim() || null,
      observacoes: observacoes.trim(),
      aprendizado: aprendizado.trim() || null,
    });
    if (error) setErro('O fechamento não pôde ser enviado. Confirme se todas as etapas continuam concluídas.');
    else {
      setMensagem('Fechamento enviado para Validador ou Administrador.');
      await carregar();
    }
    setProcessandoId('');
  }

  async function decidirFechamento(decisao: 'aprovar' | 'devolver') {
    if (!selecionada) return;
    if (decisao === 'devolver' && justificativa.trim().length < 5) {
      setErro('Explique em pelo menos 5 caracteres o que o Técnico deve corrigir.');
      return;
    }
    setProcessandoId(`decisao-${decisao}`);
    setErro('');
    setMensagem('');
    const { error } = await cliente.rpc('decidir_fechamento_demonstrativo', {
      execucao: selecionada.execucao_id,
      decisao,
      justificativa: decisao === 'devolver' ? justificativa.trim() : null,
    });
    if (error) setErro('A decisão não pôde ser registrada. Atualize e tente novamente.');
    else {
      setMensagem(decisao === 'aprovar' ? 'Fechamento aprovado e trabalho concluído.' : 'Fechamento devolvido para correção.');
      await carregar();
    }
    setProcessandoId('');
  }

  if (!podeOperarExecucoes(perfil)) {
    return (
      <div className="painel">
        <section className="aviso-custos" role="alert">
          <ShieldCheck size={20} />
          <div>
            <strong>Acesso não autorizado</strong>
            <p>Execuções estão disponíveis para Técnico, Validador e Administrador.</p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="painel painel-execucoes-persistentes">
      <NotificacaoFlutuante mensagem={mensagem} tipo="sucesso" aoFechar={() => setMensagem('')} />
      <NotificacaoFlutuante mensagem={erro} tipo="erro" aoFechar={() => setErro('')} />
      <section className="cabecalho-custos">
        <div>
          <span>
            <Activity size={17} /> Operação demonstrativa
          </span>
          <h2>Execução dos trabalhos</h2>
          <p>Atualize macroetapas simples; somente informações marcadas como visíveis aparecem para o Cliente.</p>
        </div>
        <button type="button" onClick={() => void carregar()} disabled={carregando}>
          <RefreshCw size={16} /> Atualizar
        </button>
      </section>

      {carregando && (
        <section className="aviso-custos" role="status">
          <RefreshCw size={20} />
          <div>
            <strong>Carregando execuções</strong>
            <p>Consultando somente registros demonstrativos permitidos ao seu perfil.</p>
          </div>
        </section>
      )}

      {!carregando && execucoes.length === 0 && (
        <section className="bloco estado-vazio-execucao">
          <Activity size={28} />
          <h3>Nenhum trabalho em execução</h3>
          <p>Uma execução aparecerá depois que o Cliente aceitar a pré-proposta e o Administrador confirmar o início.</p>
        </section>
      )}

      {!carregando && execucoes.length > 0 && (
        <>
        <section className="cards-operacionais" aria-label="Resumo e filtros das execuções">
          {[
            { rotulo: 'Planejados', valor: execucoes.filter((item) => item.estado === 'planejado').length, filtro: 'planejado', fechamento: 'todos' },
            { rotulo: 'Em execução', valor: execucoes.filter((item) => item.estado === 'em_execucao' && item.fechamento_estado !== 'aprovado').length, filtro: 'em_execucao', fechamento: 'todos' },
            { rotulo: 'Fechamentos em validação', valor: execucoes.filter((item) => item.fechamento_estado === 'em_validacao').length, filtro: 'todos', fechamento: 'em_validacao' },
            { rotulo: 'Finalizados', valor: execucoes.filter((item) => item.estado === 'concluido' || item.fechamento_estado === 'aprovado').length, filtro: 'concluido', fechamento: 'todos' },
          ].map((indicador) => (
            <button key={indicador.rotulo} type="button" onClick={() => { setFiltroEstado(indicador.filtro); setFiltroFechamento(indicador.fechamento); window.requestAnimationFrame(() => document.getElementById('lista-execucoes')?.scrollIntoView({ behavior: 'smooth', block: 'start' })); }}>
              <small>{indicador.rotulo}</small><strong>{indicador.valor}</strong><span>Ver trabalhos</span>
            </button>
          ))}
        </section>
        <div id="lista-execucoes" />
        <BarraBuscaFiltros
          busca={busca}
          aoMudarBusca={setBusca}
          placeholder="Pesquisar protocolo, empresa, serviço, responsável ou data"
          total={execucoesVisiveis.length}
          filtros={[
            {
              id: 'estado-execucao',
              rotulo: 'Serviço',
              valor: filtroEstado,
              aoMudar: setFiltroEstado,
              opcoes: [
                { valor: 'todos', rotulo: 'Todos os serviços' },
                { valor: 'planejado', rotulo: 'Planejados' },
                { valor: 'em_execucao', rotulo: 'Em execução' },
                { valor: 'concluido', rotulo: 'Concluídos' },
                { valor: 'cancelado', rotulo: 'Cancelados' },
              ],
            },
            {
              id: 'estado-fechamento',
              rotulo: 'Fechamento',
              valor: filtroFechamento,
              aoMudar: setFiltroFechamento,
              opcoes: [
                { valor: 'todos', rotulo: 'Todos os fechamentos' },
                { valor: 'nao_iniciado', rotulo: 'Não iniciado' },
                { valor: 'em_validacao', rotulo: 'Em validação' },
                { valor: 'devolvido', rotulo: 'Devolvido' },
                { valor: 'aprovado', rotulo: 'Aprovado' },
              ],
            },
          ]}
        />
        </>
      )}
      {!carregando && execucoesVisiveis.length > 0 && !selecionada && (
        <section className="bloco estado-vazio-execucao">
          <Activity size={24} />
          <h3>Selecione um trabalho</h3>
          <p>Escolha um dos resultados filtrados para abrir os detalhes operacionais.</p>
        </section>
      )}
      {!carregando && selecionada && (
        <div className="grade-execucoes-persistentes">
          <aside className="lista-execucoes-internas">
            <h3>Trabalhos</h3>
            {execucoesVisiveis.map((execucao) => (
              <button key={execucao.execucao_id} type="button" className={execucao.execucao_id === selecionada.execucao_id ? 'ativo' : ''} onClick={() => selecionarExecucao(execucao)}>
                <span>DEM-SOL-{String(execucao.solicitacao_codigo).padStart(4, '0')}</span>
                <strong>{tituloDescritivoTrabalho({ descricao: execucao.descricao, servico: tituloServicoCliente(execucao.servico_slug), empresa: execucao.empresa_nome })}</strong>
                <small>{execucao.empresa_nome}</small>
                <em>{calcularProgressoExecucao(execucao.etapas)}% concluído</em>
              </button>
            ))}
            {execucoesVisiveis.length === 0 && <p className="sem-resultados-filtro">Nenhum trabalho encontrado.</p>}
          </aside>

          <section className="bloco execucao-operacional">
            <header>
              <div>
                <p className="passo">
                  DEM-SOL-
                  {String(selecionada.solicitacao_codigo).padStart(4, '0')} · {selecionada.estado.replace('_', ' ').toUpperCase()}
                </p>
                <h2>{tituloServicoCliente(selecionada.servico_slug)}</h2>
                <span>
                  {selecionada.empresa_nome} · responsável: {selecionada.responsavel_nome}
                </span>
              </div>
              <span className={`estado estado-${selecionada.estado.replace('_', '-')}`}>{selecionada.estado === 'concluido' ? 'Concluído' : 'Em execução'}</span>
            </header>
            {podeAtribuirResponsavel(perfil) && selecionada.estado !== 'concluido' && selecionada.estado !== 'cancelado' && (
              <div className="atribuicao-responsavel-execucao">
                <UserRoundCog size={18} />
                <label htmlFor="responsavel-execucao">
                  Responsável Técnico
                  <select id="responsavel-execucao" value={responsavelSelecionado} onChange={(evento) => setResponsavelSelecionado(evento.target.value)}>
                    <option value="">Selecione um Técnico</option>
                    {responsaveis.map((responsavel) => (
                      <option key={responsavel.usuario_id} value={responsavel.usuario_id}>
                        {responsavel.nome}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="button" disabled={!responsavelSelecionado || responsavelSelecionado === selecionada.responsavel_id || processandoId === 'atribuicao'} onClick={() => void atribuirResponsavel()}>
                  {processandoId === 'atribuicao' ? 'Atribuindo…' : selecionada.responsavel_id ? 'Reatribuir' : 'Atribuir'}
                </button>
              </div>
            )}
            <div className="resumo-progresso-execucao">
              <div>
                <small>Progresso geral</small>
                <strong>{progressoGeral}%</strong>
              </div>
              <div className="barra-progresso">
                <i style={{ width: `${progressoGeral}%` }} />
              </div>
              <small>Início confirmado em {dataHora(selecionada.inicio_real)}</small>
            </div>

            <ol className="etapas-operacionais">
              {selecionada.etapas.map((etapa) => {
                const { rotulo, Icone } = apresentacaoEtapa[etapa.estado];
                const progressoEditado = progressos[etapa.id] ?? etapa.progresso;
                const ordemLiberada = etapaPodeAvancar(selecionada.etapas, etapa.id);
                const possuiEtapaPosteriorIniciada = selecionada.etapas.some((item) => item.ordem > etapa.ordem && item.progresso > 0);
                return (
                  <li key={etapa.id} className={`etapa-operacional-${etapa.estado}`}>
                    <span className="icone-etapa-operacional">
                      <Icone size={19} />
                    </span>
                    <div>
                      <header>
                        <div>
                          <strong>
                            {etapa.ordem}. {etapa.titulo}
                          </strong>
                          <span>
                            {rotulo}
                            {etapa.estado === 'em_andamento' ? ` · ${etapa.progresso}%` : ''}
                          </span>
                        </div>
                        {etapa.visivel_cliente && (
                          <small>
                            <Eye size={13} /> Visível ao Cliente
                          </small>
                        )}
                      </header>
                      {etapa.descricao && <p>{etapa.descricao}</p>}
                      <button
                        type="button"
                        className="barra-progresso barra-progresso-editavel"
                        disabled={processandoId === etapa.id || !ordemLiberada || possuiEtapaPosteriorIniciada}
                        onClick={(evento) => atualizarPelaBarra(evento, etapa.id)}
                        aria-label={`Definir diretamente o progresso de ${etapa.titulo}. Atual: ${etapa.progresso}%`}
                        title={possuiEtapaPosteriorIniciada ? 'Use “Retornar para esta etapa” para preservar a rastreabilidade.' : 'Clique na posição correspondente à porcentagem desejada.'}
                      >
                        <i style={{ width: `${etapa.progresso}%` }} />
                      </button>
                      {selecionada.estado !== 'concluido' && (
                        <div className="acoes-etapa-operacional">
                          {etapa.estado === 'a_fazer' && (
                            <button type="button" disabled={processandoId === etapa.id || !ordemLiberada} title={!ordemLiberada ? 'Conclua a etapa anterior' : undefined} onClick={() => void atualizarEtapa(etapa.id, 'em_andamento', 1)}>
                              <Play size={14} /> Iniciar etapa
                            </button>
                          )}
                          {etapa.estado === 'em_andamento' && (
                            <>
                              <label htmlFor={`progresso-${etapa.id}`}>
                                Progresso
                                <input
                                  id={`progresso-${etapa.id}`}
                                  type="number"
                                  min="1"
                                  max="99"
                                  step="1"
                                  value={progressoEditado}
                                  onChange={(evento) =>
                                    setProgressos((atuais) => ({
                                      ...atuais,
                                      [etapa.id]: Number(evento.target.value),
                                    }))
                                  }
                                />
                                <span>%</span>
                              </label>
                              <button type="button" disabled={processandoId === etapa.id} onClick={() => void atualizarEtapa(etapa.id, 'em_andamento', progressoEditado)}>
                                <Save size={14} /> Salvar
                              </button>
                              <button className="concluir" type="button" disabled={processandoId === etapa.id} onClick={() => void atualizarEtapa(etapa.id, 'concluida', 100)}>
                                <CheckCircle2 size={14} /> Concluir
                              </button>
                            </>
                          )}
                          {possuiEtapaPosteriorIniciada && (
                            <button className="retornar-etapa" type="button" onClick={() => { setRetornoAberto(etapa.id); setMotivoRetorno(''); }}>
                              <RotateCcw size={14} /> Retornar para esta etapa
                            </button>
                          )}
                        </div>
                      )}
                      {retornoAberto === etapa.id && (
                        <div className="confirmar-retorno-etapa">
                          <label htmlFor={`motivo-retorno-${etapa.id}`}>Motivo do retorno</label>
                          <textarea id={`motivo-retorno-${etapa.id}`} required minLength={10} maxLength={1000} value={motivoRetorno} onChange={(evento) => setMotivoRetorno(evento.target.value)} placeholder="Explique a mudança solicitada ou a correção necessária." />
                          <div><button type="button" onClick={() => setRetornoAberto('')}>Cancelar</button><button type="button" disabled={processandoId === `retorno-${etapa.id}`} onClick={() => void retornarParaEtapa(etapa.id)}>Confirmar retorno</button></div>
                        </div>
                      )}
                      <small>Atualizada em {dataHora(etapa.atualizada_em)}</small>
                    </div>
                  </li>
                );
              })}
            </ol>

            <section className={`fechamento-execucao fechamento-${selecionada.fechamento_estado}`}>
              <header>
                <div>
                  <span>
                    <ClipboardCheck size={16} /> Fechamento do trabalho
                  </span>
                  <h3>{selecionada.fechamento_estado === 'aprovado' ? 'Fechamento aprovado' : selecionada.fechamento_estado === 'em_validacao' ? 'Aguardando validação' : selecionada.fechamento_estado === 'devolvido' ? 'Correção solicitada' : 'Registrar realizado'}</h3>
                </div>
                <strong>{selecionada.fechamento_estado.replace('_', ' ')}</strong>
              </header>

              {!podeFechar && selecionada.fechamento_estado === 'nao_iniciado' && <p className="orientacao-fechamento">Conclua as cinco etapas para liberar o registro de horas reais, ocorrências e aprendizado.</p>}
              {selecionada.fechamento_estado === 'devolvido' && (
                <div className="devolucao-fechamento">
                  <RotateCcw size={18} />
                  <p>
                    <strong>Devolvido por Validador ou Administrador</strong>
                    {selecionada.fechamento_justificativa}
                  </p>
                </div>
              )}

              {podeFechar && ['nao_iniciado', 'devolvido'].includes(selecionada.fechamento_estado) && (
                <div className="formulario-fechamento">
                  <div className="grade-horas-fechamento">
                    {selecionada.equipamentos.map((item) => (
                      <label key={item.equipamento_id}>
                        <span>
                          {item.nome}
                          <small>Estimativa: {Number(item.horas_estimadas).toLocaleString('pt-BR')} h</small>
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.25"
                          value={horasReais[item.equipamento_id] ?? 0}
                          onChange={(evento) =>
                            setHorasReais((atuais) => ({
                              ...atuais,
                              [item.equipamento_id]: Number(evento.target.value),
                            }))
                          }
                        />
                        <em>horas reais</em>
                      </label>
                    ))}
                  </div>
                  <label className="campo-fechamento">
                    <span>Custos extras realizados (R$)</span>
                    <input type="number" min="0" step="0.01" value={custosExtras} onChange={(evento) => setCustosExtras(Number(evento.target.value))} />
                  </label>
                  <div className="marcadores-fechamento">
                    <label>
                      <input type="checkbox" checked={retrabalho} onChange={(evento) => setRetrabalho(evento.target.checked)} /> Houve retrabalho
                    </label>
                    <label>
                      <input type="checkbox" checked={mudancaEscopo} onChange={(evento) => setMudancaEscopo(evento.target.checked)} /> Houve mudança de escopo
                    </label>
                  </div>
                  {(retrabalho || mudancaEscopo) && (
                    <>
                      <label className="campo-fechamento">
                        <span>Causa principal</span>
                        <select
                          value={causaPadronizada}
                          required
                          onChange={(evento) => {
                            const valor = evento.target.value;
                            setCausaPadronizada(valor);
                            setCausa(valor === 'Outros' ? '' : valor);
                          }}
                        >
                          <option value="" disabled>
                            Selecione
                          </option>
                          {MOTIVOS_RETRABALHO.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                      </label>
                      {causaPadronizada === 'Outros' && (
                        <label className="campo-fechamento">
                          <span>Outra causa</span>
                          <input required value={causa} minLength={5} maxLength={500} onChange={(evento) => setCausa(evento.target.value)} placeholder="Descreva a causa" />
                        </label>
                      )}
                    </>
                  )}
                  <label className="campo-fechamento">
                    <span>Resumo do realizado</span>
                    <textarea required minLength={10} value={observacoes} maxLength={2000} onChange={(evento) => setObservacoes(evento.target.value)} placeholder="Descreva o que foi entregue e ocorrências relevantes." />
                  </label>
                  <label className="campo-fechamento">
                    <span>
                      Aprendizado para trabalhos futuros <small>(opcional)</small>
                    </span>
                    <textarea value={aprendizado} maxLength={2000} onChange={(evento) => setAprendizado(evento.target.value)} placeholder="O que vale repetir ou melhorar?" />
                  </label>
                  <button className="enviar-fechamento" type="button" disabled={processandoId === 'fechamento'} onClick={() => void enviarFechamento()}>
                    <Send size={15} /> Enviar para validação
                  </button>
                </div>
              )}

              {selecionada.fechamento_estado === 'em_validacao' && (
                <div className="resumo-fechamento">
                  <dl>
                    <div>
                      <dt>Enviado em</dt>
                      <dd>{dataHora(selecionada.fechamento_enviado_em)}</dd>
                    </div>
                    <div>
                      <dt>Custos extras</dt>
                      <dd>
                        {Number(selecionada.custos_extras_reais ?? 0).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </dd>
                    </div>
                    <div>
                      <dt>Retrabalho</dt>
                      <dd>{selecionada.retrabalho ? 'Sim' : 'Não'}</dd>
                    </div>
                    <div>
                      <dt>Mudança de escopo</dt>
                      <dd>{selecionada.mudanca_escopo ? 'Sim' : 'Não'}</dd>
                    </div>
                  </dl>
                  <p>
                    <strong>Resumo:</strong> {selecionada.fechamento_observacoes}
                  </p>
                  {selecionada.fechamento_aprendizado && (
                    <p>
                      <strong>Aprendizado:</strong> {selecionada.fechamento_aprendizado}
                    </p>
                  )}
                  {podeDecidirFechamento(perfil) && (
                    <div className="decisao-fechamento">
                      <label>
                        <span>Justificativa para devolução</span>
                        <textarea value={justificativa} maxLength={500} onChange={(evento) => setJustificativa(evento.target.value)} placeholder="Preencha apenas se for devolver." />
                      </label>
                      <div>
                        <button type="button" className="devolver" disabled={processandoId.startsWith('decisao-')} onClick={() => void decidirFechamento('devolver')}>
                          <RotateCcw size={15} /> Devolver
                        </button>
                        <button type="button" className="aprovar" disabled={processandoId.startsWith('decisao-')} onClick={() => void decidirFechamento('aprovar')}>
                          <CheckCircle2 size={15} /> Aprovar e concluir
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selecionada.fechamento_estado === 'aprovado' && (
                <div className="aprovacao-fechamento">
                  <CheckCircle2 size={24} />
                  <div>
                    <strong>Trabalho concluído definitivamente</strong>
                    <p>Aprovado em {dataHora(selecionada.fechamento_decidido_em)}. As etapas e o realizado permanecem congelados para o histórico.</p>
                  </div>
                </div>
              )}
            </section>
          </section>
        </div>
      )}
    </div>
  );
}
