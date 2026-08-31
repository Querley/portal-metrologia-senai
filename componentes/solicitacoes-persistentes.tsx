'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { BriefcaseBusiness, RefreshCw, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { PerfilInterno } from '../lib/contratos';
import { rotuloNecessidadeCliente } from '../lib/solicitacao';
import { apresentarEstadoSolicitacao, podeConsultarSolicitacoes } from '../lib/solicitacoes-persistentes';

type SolicitacaoPersistente = {
  id: string;
  codigo: number;
  nome: string;
  email: string;
  empresa: string;
  necessidade: string;
  estado: string;
  criado_em: string;
};

function formatarDataHora(valor: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(valor));
}

export function SolicitacoesPersistentes({ cliente, perfil }: { cliente: SupabaseClient; perfil: PerfilInterno }) {
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoPersistente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    if (!podeConsultarSolicitacoes(perfil)) {
      setCarregando(false);
      return;
    }

    setCarregando(true);
    setErro('');
    const { data, error } = await cliente.rpc('listar_solicitacoes_publicas_demonstrativas');
    if (error) {
      setErro(error.code === '42501'
        ? 'Seu perfil não tem autorização para consultar solicitações.'
        : 'Não foi possível consultar as solicitações da homologação.');
    } else {
      setSolicitacoes((data ?? []) as SolicitacaoPersistente[]);
    }
    setCarregando(false);
  }, [cliente, perfil]);

  useEffect(() => { queueMicrotask(() => void carregar()); }, [carregar]);

  if (!podeConsultarSolicitacoes(perfil)) {
    return <div className="painel"><section className="aviso-custos" role="alert"><ShieldCheck size={20} /><div><strong>Acesso não autorizado</strong><p>Solicitações restritas estão disponíveis para Técnico, Validador e Administrador.</p></div></section></div>;
  }

  return <div className="painel painel-solicitacoes-persistentes">
    <section className="cabecalho-custos">
      <div><span><BriefcaseBusiness size={17} /> Origem: demonstração</span><h2>Solicitações recebidas pelo site</h2><p>Entradas sintéticas persistidas pelo formulário público e separadas de qualquer futuro dado real.</p></div>
      <button type="button" onClick={() => void carregar()} disabled={carregando}><RefreshCw size={16} /> Atualizar</button>
    </section>

    {erro && <section className="aviso-custos erro" role="alert"><ShieldCheck size={20} /><div><strong>Falha na consulta</strong><p>{erro}</p></div></section>}
    {carregando && <section className="aviso-custos" role="status"><RefreshCw size={20} /><div><strong>Carregando solicitações</strong><p>Consultando somente registros sintéticos da homologação.</p></div></section>}

    {!carregando && !erro && <section className="bloco tabela-solicitacoes-persistentes">
      <header><div><h2>Fila de atendimento</h2><p>{solicitacoes.length} {solicitacoes.length === 1 ? 'solicitação encontrada' : 'solicitações encontradas'}.</p></div><span className="estado estado-formalizada">Acesso protegido</span></header>
      <div className="tabela-wrap"><table><thead><tr><th>Protocolo</th><th>Empresa e contato</th><th>Necessidade</th><th>Recebida</th><th>Acesso do Cliente</th></tr></thead><tbody>{solicitacoes.map((solicitacao) => {
        const estado = apresentarEstadoSolicitacao(solicitacao.estado);
        return <tr key={solicitacao.id}><td><strong>DEM-SOL-{String(solicitacao.codigo).padStart(4, '0')}</strong></td><td><strong>{solicitacao.empresa}</strong><small>{solicitacao.nome} · {solicitacao.email}</small></td><td>{rotuloNecessidadeCliente(solicitacao.necessidade)}</td><td>{formatarDataHora(solicitacao.criado_em)}</td><td><span className={`estado ${estado.classe}`}>{estado.rotulo}</span><small>{estado.descricao}</small></td></tr>;
      })}</tbody></table></div>
      {solicitacoes.length === 0 && <div className="estado-vazio"><BriefcaseBusiness size={18} /><span>Nenhuma solicitação sintética foi recebida nesta origem.</span></div>}
    </section>}
  </div>;
}
