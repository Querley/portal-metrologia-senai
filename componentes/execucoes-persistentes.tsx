'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { Activity, CheckCircle2, Circle, ClipboardCheck, Clock3, Eye, Play, RefreshCw, RotateCcw, Save, Send, ShieldCheck, UserRoundCog } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PerfilInterno } from '../lib/contratos';
import { calcularProgressoExecucao, etapasConcluidas, normalizarAtualizacaoEtapa, podeAtribuirResponsavel, podeDecidirFechamento, podeOperarExecucoes, validarFechamento, type EstadoEtapaExecucao, type ExecucaoInterna, type ResponsavelOperacional } from '../lib/execucoes-persistentes';
import { tituloServicoCliente } from '../lib/portal-cliente';

const apresentacaoEtapa = {
  a_fazer: { rotulo: 'A fazer', Icone: Circle },
  em_andamento: { rotulo: 'Em andamento', Icone: Clock3 },
  concluida: { rotulo: 'Concluída', Icone: CheckCircle2 },
} as const;

function dataHora(valor: string | null): string {
  if (!valor) return '—';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(valor));
}

export function ExecucoesPersistentes({ cliente, perfil }: { cliente: SupabaseClient; perfil: PerfilInterno }) {
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
  const [observacoes, setObservacoes] = useState('');
  const [aprendizado, setAprendizado] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [responsaveis, setResponsaveis] = useState<ResponsavelOperacional[]>([]);
  const [responsavelSelecionado, setResponsavelSelecionado] = useState('');

  const preencherFormulario = useCallback((execucao: ExecucaoInterna) => {
    setHorasReais(Object.fromEntries(execucao.equipamentos.map((item) => [item.equipamento_id, Number(item.horas_reais ?? item.horas_estimadas)])));
    setCustosExtras(Number(execucao.custos_extras_reais ?? 0));
    setRetrabalho(Boolean(execucao.retrabalho));
    setMudancaEscopo(Boolean(execucao.mudanca_escopo));
    setCausa(execucao.causa_principal ?? '');
    setObservacoes(execucao.fechamento_observacoes ?? '');
    setAprendizado(execucao.fechamento_aprendizado ?? '');
    setJustificativa('');
  }, []);

  const carregar = useCallback(async () => {
    if (!podeOperarExecucoes(perfil)) return;
    setCarregando(true);
    setErro('');
    const [respostaExecucoes, respostaResponsaveis] = await Promise.all([
      cliente.rpc('listar_execucoes_demonstrativas'),
      podeAtribuirResponsavel(perfil)
        ? cliente.rpc('listar_responsaveis_demonstrativos')
        : Promise.resolve({ data: [], error: null }),
    ]);
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

  useEffect(() => { queueMicrotask(() => void carregar()); }, [carregar]);
  useEffect(() => {
    if (!podeOperarExecucoes(perfil)) return;
    const canal = cliente
      .channel('etapas-execucao-equipe')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'etapas_execucao' }, () => void carregar())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'etapas_execucao' }, () => void carregar())
      .subscribe();
    return () => { void cliente.removeChannel(canal); };
  }, [carregar, cliente, perfil]);

  const selecionada = useMemo(() => execucoes.find((item) => item.execucao_id === selecionadaId) ?? execucoes[0], [execucoes, selecionadaId]);
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
    setProcessandoId('atribuicao'); setErro(''); setMensagem('');
    const { error } = await cliente.rpc('atribuir_responsavel_execucao_demonstrativa', {
      execucao: selecionada.execucao_id,
      responsavel: responsavelSelecionado,
    });
    if (error) {
      setErro(error.code === '42501'
        ? 'Somente o Administrador pode atribuir o responsável.'
        : 'Não foi possível atribuir o Técnico. Confirme o estado da execução e tente novamente.');
    } else {
      setMensagem('Responsável Técnico atribuído com registro na auditoria.');
      await carregar();
    }
    setProcessandoId('');
  }

  async function atualizarEtapa(etapaId: string, estado: EstadoEtapaExecucao, progresso: number) {
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
      setErro(error.code === '42501'
        ? 'Seu perfil não pode atualizar esta execução.'
        : 'A etapa mudou ou não pôde ser atualizada. Atualize e tente novamente.');
    } else {
      setMensagem(normalizada.estado === 'concluida'
        ? 'Etapa concluída e acompanhamento do Cliente atualizado.'
        : 'Progresso salvo e acompanhamento do Cliente atualizado.');
      await carregar();
    }
    setProcessandoId('');
  }

  async function enviarFechamento() {
    if (!selecionada) return;
    const validacao = validarFechamento({ equipamentos: selecionada.equipamentos, horas: horasReais, custosExtras, retrabalho, mudancaEscopo, causa, observacoes, aprendizado });
    if (validacao) { setErro(validacao); return; }
    setProcessandoId('fechamento'); setErro(''); setMensagem('');
    const { error } = await cliente.rpc('registrar_fechamento_demonstrativo', {
      execucao: selecionada.execucao_id,
      equipamentos_horas: selecionada.equipamentos.map((item) => ({ equipamento_id: item.equipamento_id, horas: horasReais[item.equipamento_id] })),
      custos_extras: custosExtras,
      houve_retrabalho: retrabalho,
      houve_mudanca_escopo: mudancaEscopo,
      causa: causa.trim() || null,
      observacoes: observacoes.trim(),
      aprendizado: aprendizado.trim() || null,
    });
    if (error) setErro('O fechamento não pôde ser enviado. Confirme se todas as etapas continuam concluídas.');
    else { setMensagem('Fechamento enviado para Validador ou Administrador.'); await carregar(); }
    setProcessandoId('');
  }

  async function decidirFechamento(decisao: 'aprovar' | 'devolver') {
    if (!selecionada) return;
    if (decisao === 'devolver' && justificativa.trim().length < 5) { setErro('Explique em pelo menos 5 caracteres o que o Técnico deve corrigir.'); return; }
    setProcessandoId(`decisao-${decisao}`); setErro(''); setMensagem('');
    const { error } = await cliente.rpc('decidir_fechamento_demonstrativo', {
      execucao: selecionada.execucao_id,
      decisao,
      justificativa: decisao === 'devolver' ? justificativa.trim() : null,
    });
    if (error) setErro('A decisão não pôde ser registrada. Atualize e tente novamente.');
    else { setMensagem(decisao === 'aprovar' ? 'Fechamento aprovado e trabalho concluído.' : 'Fechamento devolvido para correção.'); await carregar(); }
    setProcessandoId('');
  }

  if (!podeOperarExecucoes(perfil)) {
    return <div className="painel"><section className="aviso-custos" role="alert"><ShieldCheck size={20} /><div><strong>Acesso não autorizado</strong><p>Execuções estão disponíveis para Técnico, Validador e Administrador.</p></div></section></div>;
  }

  return <div className="painel painel-execucoes-persistentes">
    <section className="cabecalho-custos">
      <div><span><Activity size={17} /> Operação demonstrativa</span><h2>Execução dos trabalhos</h2><p>Atualize macroetapas simples; somente informações marcadas como visíveis aparecem para o Cliente.</p></div>
      <button type="button" onClick={() => void carregar()} disabled={carregando}><RefreshCw size={16} /> Atualizar</button>
    </section>

    {erro && <section className="aviso-custos erro" role="alert"><ShieldCheck size={20} /><div><strong>Não foi possível concluir</strong><p>{erro}</p></div></section>}
    {mensagem && <section className="aviso-custos sucesso" role="status"><CheckCircle2 size={20} /><div><strong>Alteração registrada</strong><p>{mensagem}</p></div></section>}
    {carregando && <section className="aviso-custos" role="status"><RefreshCw size={20} /><div><strong>Carregando execuções</strong><p>Consultando somente registros demonstrativos permitidos ao seu perfil.</p></div></section>}

    {!carregando && execucoes.length === 0 && <section className="bloco estado-vazio-execucao"><Activity size={28} /><h3>Nenhum trabalho em execução</h3><p>Uma execução aparecerá depois que o Cliente aceitar a pré-proposta e o Administrador confirmar o início.</p></section>}

    {!carregando && selecionada && <div className="grade-execucoes-persistentes">
      <aside className="lista-execucoes-internas"><h3>Trabalhos</h3>{execucoes.map((execucao) => <button key={execucao.execucao_id} type="button" className={execucao.execucao_id === selecionada.execucao_id ? 'ativo' : ''} onClick={() => selecionarExecucao(execucao)}><span>DEM-SOL-{String(execucao.solicitacao_codigo).padStart(4, '0')}</span><strong>{tituloServicoCliente(execucao.servico_slug)}</strong><small>{execucao.empresa_nome}</small><em>{calcularProgressoExecucao(execucao.etapas)}% concluído</em></button>)}</aside>

      <section className="bloco execucao-operacional">
        <header><div><p className="passo">DEM-SOL-{String(selecionada.solicitacao_codigo).padStart(4, '0')} · {selecionada.estado.replace('_', ' ').toUpperCase()}</p><h2>{tituloServicoCliente(selecionada.servico_slug)}</h2><span>{selecionada.empresa_nome} · responsável: {selecionada.responsavel_nome}</span></div><span className={`estado estado-${selecionada.estado.replace('_', '-')}`}>{selecionada.estado === 'concluido' ? 'Concluído' : 'Em execução'}</span></header>
        {podeAtribuirResponsavel(perfil) && selecionada.estado !== 'concluido' && selecionada.estado !== 'cancelado' && <div className="atribuicao-responsavel-execucao"><UserRoundCog size={18} /><label htmlFor="responsavel-execucao">Responsável Técnico<select id="responsavel-execucao" value={responsavelSelecionado} onChange={(evento) => setResponsavelSelecionado(evento.target.value)}><option value="">Selecione um Técnico</option>{responsaveis.map((responsavel) => <option key={responsavel.usuario_id} value={responsavel.usuario_id}>{responsavel.nome}</option>)}</select></label><button type="button" disabled={!responsavelSelecionado || responsavelSelecionado === selecionada.responsavel_id || processandoId === 'atribuicao'} onClick={() => void atribuirResponsavel()}>{processandoId === 'atribuicao' ? 'Atribuindo…' : selecionada.responsavel_id ? 'Reatribuir' : 'Atribuir'}</button></div>}
        <div className="resumo-progresso-execucao"><div><small>Progresso geral</small><strong>{progressoGeral}%</strong></div><div className="barra-progresso"><i style={{ width: `${progressoGeral}%` }} /></div><small>Início confirmado em {dataHora(selecionada.inicio_real)}</small></div>

        <ol className="etapas-operacionais">{selecionada.etapas.map((etapa) => {
          const { rotulo, Icone } = apresentacaoEtapa[etapa.estado];
          const progressoEditado = progressos[etapa.id] ?? etapa.progresso;
          return <li key={etapa.id} className={`etapa-operacional-${etapa.estado}`}><span className="icone-etapa-operacional"><Icone size={19} /></span><div><header><div><strong>{etapa.ordem}. {etapa.titulo}</strong><span>{rotulo}{etapa.estado === 'em_andamento' ? ` · ${etapa.progresso}%` : ''}</span></div>{etapa.visivel_cliente && <small><Eye size={13} /> Visível ao Cliente</small>}</header>{etapa.descricao && <p>{etapa.descricao}</p>}<div className="barra-progresso"><i style={{ width: `${etapa.progresso}%` }} /></div>{selecionada.estado !== 'concluido' && <div className="acoes-etapa-operacional">{etapa.estado === 'a_fazer' && <button type="button" disabled={processandoId === etapa.id} onClick={() => void atualizarEtapa(etapa.id, 'em_andamento', 1)}><Play size={14} /> Iniciar etapa</button>}{etapa.estado === 'em_andamento' && <><label htmlFor={`progresso-${etapa.id}`}>Progresso<input id={`progresso-${etapa.id}`} type="number" min="1" max="99" step="1" value={progressoEditado} onChange={(evento) => setProgressos((atuais) => ({ ...atuais, [etapa.id]: Number(evento.target.value) }))} /><span>%</span></label><button type="button" disabled={processandoId === etapa.id} onClick={() => void atualizarEtapa(etapa.id, 'em_andamento', progressoEditado)}><Save size={14} /> Salvar</button><button className="concluir" type="button" disabled={processandoId === etapa.id} onClick={() => void atualizarEtapa(etapa.id, 'concluida', 100)}><CheckCircle2 size={14} /> Concluir</button></>}</div>}<small>Atualizada em {dataHora(etapa.atualizada_em)}</small></div></li>;
        })}</ol>

        <section className={`fechamento-execucao fechamento-${selecionada.fechamento_estado}`}>
          <header><div><span><ClipboardCheck size={16} /> Fechamento do trabalho</span><h3>{selecionada.fechamento_estado === 'aprovado' ? 'Fechamento aprovado' : selecionada.fechamento_estado === 'em_validacao' ? 'Aguardando validação' : selecionada.fechamento_estado === 'devolvido' ? 'Correção solicitada' : 'Registrar realizado'}</h3></div><strong>{selecionada.fechamento_estado.replace('_', ' ')}</strong></header>

          {!podeFechar && selecionada.fechamento_estado === 'nao_iniciado' && <p className="orientacao-fechamento">Conclua as cinco etapas para liberar o registro de horas reais, ocorrências e aprendizado.</p>}
          {selecionada.fechamento_estado === 'devolvido' && <div className="devolucao-fechamento"><RotateCcw size={18} /><p><strong>Devolvido por Validador ou Administrador</strong>{selecionada.fechamento_justificativa}</p></div>}

          {podeFechar && ['nao_iniciado', 'devolvido'].includes(selecionada.fechamento_estado) && <div className="formulario-fechamento">
            <div className="grade-horas-fechamento">{selecionada.equipamentos.map((item) => <label key={item.equipamento_id}><span>{item.nome}<small>Estimativa: {Number(item.horas_estimadas).toLocaleString('pt-BR')} h</small></span><input type="number" min="0" step="0.25" value={horasReais[item.equipamento_id] ?? 0} onChange={(evento) => setHorasReais((atuais) => ({ ...atuais, [item.equipamento_id]: Number(evento.target.value) }))} /><em>horas reais</em></label>)}</div>
            <label className="campo-fechamento"><span>Custos extras realizados (R$)</span><input type="number" min="0" step="0.01" value={custosExtras} onChange={(evento) => setCustosExtras(Number(evento.target.value))} /></label>
            <div className="marcadores-fechamento"><label><input type="checkbox" checked={retrabalho} onChange={(evento) => setRetrabalho(evento.target.checked)} /> Houve retrabalho</label><label><input type="checkbox" checked={mudancaEscopo} onChange={(evento) => setMudancaEscopo(evento.target.checked)} /> Houve mudança de escopo</label></div>
            {(retrabalho || mudancaEscopo) && <label className="campo-fechamento"><span>Causa principal</span><input value={causa} maxLength={500} onChange={(evento) => setCausa(evento.target.value)} placeholder="O que causou a diferença?" /></label>}
            <label className="campo-fechamento"><span>Resumo do realizado</span><textarea value={observacoes} maxLength={2000} onChange={(evento) => setObservacoes(evento.target.value)} placeholder="Descreva o que foi entregue e ocorrências relevantes." /></label>
            <label className="campo-fechamento"><span>Aprendizado para trabalhos futuros <small>(opcional)</small></span><textarea value={aprendizado} maxLength={2000} onChange={(evento) => setAprendizado(evento.target.value)} placeholder="O que vale repetir ou melhorar?" /></label>
            <button className="enviar-fechamento" type="button" disabled={processandoId === 'fechamento'} onClick={() => void enviarFechamento()}><Send size={15} /> Enviar para validação</button>
          </div>}

          {selecionada.fechamento_estado === 'em_validacao' && <div className="resumo-fechamento"><dl><div><dt>Enviado em</dt><dd>{dataHora(selecionada.fechamento_enviado_em)}</dd></div><div><dt>Custos extras</dt><dd>{Number(selecionada.custos_extras_reais ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</dd></div><div><dt>Retrabalho</dt><dd>{selecionada.retrabalho ? 'Sim' : 'Não'}</dd></div><div><dt>Mudança de escopo</dt><dd>{selecionada.mudanca_escopo ? 'Sim' : 'Não'}</dd></div></dl><p><strong>Resumo:</strong> {selecionada.fechamento_observacoes}</p>{selecionada.fechamento_aprendizado && <p><strong>Aprendizado:</strong> {selecionada.fechamento_aprendizado}</p>}{podeDecidirFechamento(perfil) && <div className="decisao-fechamento"><label><span>Justificativa para devolução</span><textarea value={justificativa} maxLength={500} onChange={(evento) => setJustificativa(evento.target.value)} placeholder="Preencha apenas se for devolver." /></label><div><button type="button" className="devolver" disabled={processandoId.startsWith('decisao-')} onClick={() => void decidirFechamento('devolver')}><RotateCcw size={15} /> Devolver</button><button type="button" className="aprovar" disabled={processandoId.startsWith('decisao-')} onClick={() => void decidirFechamento('aprovar')}><CheckCircle2 size={15} /> Aprovar e concluir</button></div></div>}</div>}

          {selecionada.fechamento_estado === 'aprovado' && <div className="aprovacao-fechamento"><CheckCircle2 size={24} /><div><strong>Trabalho concluído definitivamente</strong><p>Aprovado em {dataHora(selecionada.fechamento_decidido_em)}. As etapas e o realizado permanecem congelados para o histórico.</p></div></div>}
        </section>
      </section>
    </div>}
  </div>;
}
