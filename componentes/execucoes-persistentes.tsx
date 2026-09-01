'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { Activity, CheckCircle2, Circle, Clock3, Eye, Play, RefreshCw, Save, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PerfilInterno } from '../lib/contratos';
import { calcularProgressoExecucao, normalizarAtualizacaoEtapa, podeOperarExecucoes, type EstadoEtapaExecucao, type ExecucaoInterna } from '../lib/execucoes-persistentes';
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
  const [progressos, setProgressos] = useState<Record<string, number>>({});
  const [carregando, setCarregando] = useState(true);
  const [processandoId, setProcessandoId] = useState('');
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');

  const carregar = useCallback(async () => {
    if (!podeOperarExecucoes(perfil)) return;
    setCarregando(true);
    setErro('');
    const { data, error } = await cliente.rpc('listar_execucoes_demonstrativas');
    if (error) {
      setErro('Não foi possível carregar as execuções de homologação.');
      setCarregando(false);
      return;
    }
    const lista = (Array.isArray(data) ? data : []) as ExecucaoInterna[];
    setExecucoes(lista);
    setSelecionadaId((atual) => lista.some((item) => item.execucao_id === atual) ? atual : lista[0]?.execucao_id ?? '');
    setProgressos(Object.fromEntries(lista.flatMap((execucao) => execucao.etapas.map((etapa) => [etapa.id, etapa.progresso]))));
    setCarregando(false);
  }, [cliente, perfil]);

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
      <aside className="lista-execucoes-internas"><h3>Trabalhos</h3>{execucoes.map((execucao) => <button key={execucao.execucao_id} type="button" className={execucao.execucao_id === selecionada.execucao_id ? 'ativo' : ''} onClick={() => setSelecionadaId(execucao.execucao_id)}><span>DEM-SOL-{String(execucao.solicitacao_codigo).padStart(4, '0')}</span><strong>{tituloServicoCliente(execucao.servico_slug)}</strong><small>{execucao.empresa_nome}</small><em>{calcularProgressoExecucao(execucao.etapas)}% concluído</em></button>)}</aside>

      <section className="bloco execucao-operacional">
        <header><div><p className="passo">DEM-SOL-{String(selecionada.solicitacao_codigo).padStart(4, '0')} · {selecionada.estado.replace('_', ' ').toUpperCase()}</p><h2>{tituloServicoCliente(selecionada.servico_slug)}</h2><span>{selecionada.empresa_nome} · responsável: {selecionada.responsavel_nome}</span></div><span className={`estado estado-${selecionada.estado.replace('_', '-')}`}>{selecionada.estado === 'concluido' ? 'Concluído' : 'Em execução'}</span></header>
        <div className="resumo-progresso-execucao"><div><small>Progresso geral</small><strong>{progressoGeral}%</strong></div><div className="barra-progresso"><i style={{ width: `${progressoGeral}%` }} /></div><small>Início confirmado em {dataHora(selecionada.inicio_real)}</small></div>

        <ol className="etapas-operacionais">{selecionada.etapas.map((etapa) => {
          const { rotulo, Icone } = apresentacaoEtapa[etapa.estado];
          const progressoEditado = progressos[etapa.id] ?? etapa.progresso;
          return <li key={etapa.id} className={`etapa-operacional-${etapa.estado}`}><span className="icone-etapa-operacional"><Icone size={19} /></span><div><header><div><strong>{etapa.ordem}. {etapa.titulo}</strong><span>{rotulo}{etapa.estado === 'em_andamento' ? ` · ${etapa.progresso}%` : ''}</span></div>{etapa.visivel_cliente && <small><Eye size={13} /> Visível ao Cliente</small>}</header>{etapa.descricao && <p>{etapa.descricao}</p>}<div className="barra-progresso"><i style={{ width: `${etapa.progresso}%` }} /></div>{selecionada.estado !== 'concluido' && <div className="acoes-etapa-operacional">{etapa.estado === 'a_fazer' && <button type="button" disabled={processandoId === etapa.id} onClick={() => void atualizarEtapa(etapa.id, 'em_andamento', 1)}><Play size={14} /> Iniciar etapa</button>}{etapa.estado === 'em_andamento' && <><label htmlFor={`progresso-${etapa.id}`}>Progresso<input id={`progresso-${etapa.id}`} type="number" min="1" max="99" step="1" value={progressoEditado} onChange={(evento) => setProgressos((atuais) => ({ ...atuais, [etapa.id]: Number(evento.target.value) }))} /><span>%</span></label><button type="button" disabled={processandoId === etapa.id} onClick={() => void atualizarEtapa(etapa.id, 'em_andamento', progressoEditado)}><Save size={14} /> Salvar</button><button className="concluir" type="button" disabled={processandoId === etapa.id} onClick={() => void atualizarEtapa(etapa.id, 'concluida', 100)}><CheckCircle2 size={14} /> Concluir</button></>}</div>}<small>Atualizada em {dataHora(etapa.atualizada_em)}</small></div></li>;
        })}</ol>
      </section>
    </div>}
  </div>;
}
