'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { Activity, BookOpenCheck, BriefcaseBusiness, ChevronRight, FileCheck2, Gauge, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PerfilInterno } from '../lib/contratos';
import { NotificacaoFlutuante } from './notificacao-flutuante';

type SolicitacaoResumo = { id: string; codigo: number; empresa: string; necessidade: string; estado: string; criado_em: string; tem_pre_proposta: boolean; estado_pre_proposta: string | null };
type OrcamentoResumo = { estado: string };
type ExecucaoResumo = { estado: string; fechamento_estado?: string | null };
type IndicadorResumo = { licao_estado: string | null; esforco_assertivo: boolean | null };

type Destino = { secao: string; filtro?: string };

function dataHora(valor: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(valor));
}

export function VisaoGeralPersistente({ cliente, perfil, aoNavegar }: { cliente: SupabaseClient; perfil: PerfilInterno; aoNavegar: (destino: Destino) => void }) {
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoResumo[]>([]);
  const [orcamentos, setOrcamentos] = useState<OrcamentoResumo[]>([]);
  const [execucoes, setExecucoes] = useState<ExecucaoResumo[]>([]);
  const [indicadores, setIndicadores] = useState<IndicadorResumo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    const [s, o, e, i] = await Promise.all([
      cliente.rpc('listar_solicitacoes_publicas_demonstrativas'),
      cliente.rpc('listar_orcamentos_demonstrativos'),
      cliente.rpc('listar_execucoes_demonstrativas'),
      cliente.rpc('listar_indicadores_execucoes_demonstrativas'),
    ]);
    if (s.error || o.error || e.error || i.error) setErro('Não foi possível atualizar todos os indicadores da Visão Geral.');
    else {
      setSolicitacoes((s.data ?? []) as SolicitacaoResumo[]);
      setOrcamentos((o.data ?? []) as OrcamentoResumo[]);
      setExecucoes((e.data ?? []) as ExecucaoResumo[]);
      setIndicadores((i.data ?? []) as IndicadorResumo[]);
    }
    setCarregando(false);
  }, [cliente]);

  useEffect(() => { queueMicrotask(() => void carregar()); }, [carregar]);

  const dados = useMemo(() => {
    const abertas = solicitacoes.filter((item) => item.estado !== 'descartada' && !['aceita', 'recusada'].includes(item.estado_pre_proposta ?? '')).length;
    const semProposta = solicitacoes.filter((item) => item.estado === 'ativada' && !item.tem_pre_proposta).length;
    const emExecucao = execucoes.filter((item) => item.estado === 'em_execucao' && item.fechamento_estado !== 'aprovado').length;
    const aguardando = orcamentos.filter((item) => item.estado === 'em_validacao').length;
    const licoesPendentes = indicadores.filter((item) => item.licao_estado === 'em_validacao').length;
    const formalizadas = indicadores.filter((item) => item.licao_estado === 'formalizada').length;
    const concluidas = execucoes.filter((item) => item.estado === 'concluido' || item.fechamento_estado === 'aprovado').length;
    const comparaveis = indicadores.filter((item) => item.esforco_assertivo !== null);
    const assertivas = comparaveis.filter((item) => item.esforco_assertivo).length;
    const assertividade = comparaveis.length ? Math.round((assertivas / comparaveis.length) * 100) : 0;
    return { abertas, semProposta, emExecucao, aguardando, licoesPendentes, formalizadas, concluidas, assertividade, comparaveis: comparaveis.length };
  }, [execucoes, indicadores, orcamentos, solicitacoes]);

  const totalFluxo = dados.semProposta + dados.emExecucao + dados.licoesPendentes + dados.concluidas;
  const percentualConcluido = totalFluxo ? Math.round((dados.concluidas / totalFluxo) * 100) : 0;
  const cards = [
    { rotulo: 'Solicitações abertas', valor: dados.abertas, detalhe: `${dados.semProposta} aptas para proposta`, icone: BriefcaseBusiness, cor: 'azul', destino: { secao: 'solicitacoes', filtro: 'abertas' } },
    { rotulo: 'Em execução', valor: dados.emExecucao, detalhe: 'trabalhos em andamento', icone: Activity, cor: 'ciano', destino: { secao: 'servicos', filtro: 'em_execucao' } },
    { rotulo: 'Propostas aguardando', valor: dados.aguardando, detalhe: 'aguardando validação', icone: FileCheck2, cor: 'amarelo', destino: { secao: 'orcamentos', filtro: 'em_validacao' } },
    { rotulo: 'Assertividade', valor: `${dados.assertividade}%`, detalhe: `${dados.comparaveis} execuções comparadas`, icone: Gauge, cor: 'verde', destino: { secao: 'conhecimento', filtro: 'assertivo' } },
    { rotulo: 'Serviços finalizados', valor: dados.concluidas, detalhe: 'fechamentos aprovados', icone: BookOpenCheck, cor: 'verde', destino: { secao: 'servicos', filtro: 'concluido' } },
  ];

  if (carregando) return <div className="painel"><section className="bloco estado-vazio-execucao"><RefreshCw className="girando" /><h3>Atualizando a Visão Geral</h3><p>Calculando os indicadores com os registros autorizados do sistema.</p></section></div>;

  return (
    <div className="painel" data-perfil={perfil}>
      <NotificacaoFlutuante mensagem={erro} tipo="erro" aoFechar={() => setErro('')} />
      <section className="cards-kpi cards-kpi-interativos" aria-label="Indicadores principais">
        {cards.map(({ rotulo, valor, detalhe, icone: Icone, cor, destino }) => (
          <button type="button" key={rotulo} onClick={() => aoNavegar(destino)} aria-label={`${rotulo}: ${valor}. Abrir detalhes`}>
            <span className={`icone-kpi ${cor}`}><Icone size={20} /></span><small>{rotulo}</small><strong>{valor}</strong><p>{detalhe}</p><ChevronRight className="seta-kpi" size={18} />
          </button>
        ))}
      </section>
      <div className="grade-painel">
        <section className="bloco">
          <header><div><h2>Solicitações recentes</h2><p>Registros efetivamente recebidos na homologação.</p></div><button type="button" onClick={() => aoNavegar({ secao: 'solicitacoes' })}>Ver todas <ChevronRight size={15} /></button></header>
          <div className="tabela-wrap compacta"><table><thead><tr><th>Solicitação</th><th>Empresa</th><th>Necessidade</th><th>Recebida</th></tr></thead><tbody>
            {solicitacoes.slice(0, 5).map((item) => <tr key={item.id}><td><strong>DEM-SOL-{String(item.codigo).padStart(4, '0')}</strong></td><td>{item.empresa}</td><td>{item.necessidade.replaceAll('-', ' ')}</td><td>{dataHora(item.criado_em)}</td></tr>)}
          </tbody></table>{solicitacoes.length === 0 && <div className="estado-vazio"><span>Nenhuma solicitação registrada.</span></div>}</div>
        </section>
        <section className="bloco fluxo">
          <header><div><h2>Ciclo de valor</h2><p>Distribuição atual dos registros.</p></div></header>
          <div className="anel" style={{ background: `conic-gradient(#0875b7 ${percentualConcluido}%, #e4ecef 0)` }} aria-label={`${percentualConcluido}% dos itens do fluxo estão concluídos`}><span><strong>{percentualConcluido}%</strong><small>concluído</small></span></div>
          <ul><li><i className="cor-1" />A orçar <b>{dados.semProposta}</b></li><li><i className="cor-2" />Executar <b>{dados.emExecucao}</b></li><li><i className="cor-3" />Validar lição <b>{dados.licoesPendentes}</b></li><li><i className="cor-4" />Concluído <b>{dados.concluidas}</b></li></ul>
        </section>
      </div>
      <section className="alerta-conhecimento"><BookOpenCheck size={23} /><div><strong>{dados.licoesPendentes} lições aguardam validação</strong><p>{dados.formalizadas} lições já estão formalizadas e podem apoiar recomendações.</p></div><button type="button" onClick={() => aoNavegar({ secao: 'conhecimento', filtro: 'em_validacao' })}>Revisar lições</button></section>
    </div>
  );
}
