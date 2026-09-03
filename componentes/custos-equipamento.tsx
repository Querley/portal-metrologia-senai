'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { CircleDollarSign, RefreshCw, Save, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PerfilInterno } from '../lib/contratos';
import { correspondeBusca } from '../lib/busca-e-filtros';
import { dataPosterior, normalizarCustoHora, ORIGEM_CUSTOS_HOMOLOGACAO, podeConsultarCustos, podeVersionarCustos } from '../lib/custos-equipamento';
import { BarraBuscaFiltros } from './barra-busca-filtros';

type Equipamento = {
  id: string;
  codigo: string;
  nome: string;
  ativo: boolean;
};

type CustoEquipamento = {
  id: string;
  equipamento_id: string;
  custo_hora: string | number;
  vigente_desde: string;
  vigente_ate: string | null;
  origem: 'demonstracao';
};

function hojeIso(): string {
  const agora = new Date();
  const deslocamento = agora.getTimezoneOffset() * 60_000;
  return new Date(agora.getTime() - deslocamento).toISOString().slice(0, 10);
}

function formatarCusto(valor: string | number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(Number(valor));
}

function formatarData(dataIso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(`${dataIso}T00:00:00Z`));
}

export function CustosEquipamento({ cliente, perfil }: { cliente: SupabaseClient; perfil: PerfilInterno }) {
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [custos, setCustos] = useState<CustoEquipamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [equipamentoId, setEquipamentoId] = useState('');
  const [novoCusto, setNovoCusto] = useState('');
  const [vigencia, setVigencia] = useState(hojeIso());
  const [referencia, setReferencia] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtroSituacao, setFiltroSituacao] = useState('todos');

  const carregar = useCallback(async () => {
    if (!podeConsultarCustos(perfil)) return;
    setCarregando(true);
    setErro('');

    const [respostaEquipamentos, respostaCustos] = await Promise.all([
      cliente.from('equipamentos').select('id,codigo,nome,ativo').order('nome'),
      cliente
        .from('custos_equipamento')
        .select('id,equipamento_id,custo_hora,vigente_desde,vigente_ate,origem')
        .eq('origem', ORIGEM_CUSTOS_HOMOLOGACAO)
        .is('vigente_ate', null)
        .order('vigente_desde', { ascending: false }),
    ]);

    if (respostaEquipamentos.error || respostaCustos.error) {
      setErro('Não foi possível carregar os custos de homologação. Tente novamente.');
      setCarregando(false);
      return;
    }

    const equipamentosEncontrados = (respostaEquipamentos.data ?? []) as Equipamento[];
    const custosEncontrados = (respostaCustos.data ?? []) as CustoEquipamento[];
    setEquipamentos(equipamentosEncontrados);
    setCustos(custosEncontrados.filter((custo) => custo.origem === ORIGEM_CUSTOS_HOMOLOGACAO));
    setEquipamentoId((atual) => atual || equipamentosEncontrados.find((equipamento) => equipamento.ativo)?.id || '');
    setCarregando(false);
  }, [cliente, perfil]);

  useEffect(() => {
    queueMicrotask(() => void carregar());
  }, [carregar]);

  const custosPorEquipamento = useMemo(
    () => new Map(custos.map((custo) => [custo.equipamento_id, custo])),
    [custos],
  );
  const equipamentosAtivos = equipamentos.filter((equipamento) => equipamento.ativo);
  const equipamentosVisiveis = equipamentos.filter((equipamento) => correspondeBusca(busca, equipamento.nome, equipamento.codigo)
    && (filtroSituacao === 'todos' || (filtroSituacao === 'ativos' ? equipamento.ativo : !equipamento.ativo)));
  const custoSelecionado = custosPorEquipamento.get(equipamentoId);
  const vigenciaMinima = custoSelecionado ? dataPosterior(custoSelecionado.vigente_desde) : hojeIso();
  const vigenciaEfetiva = vigencia < vigenciaMinima ? vigenciaMinima : vigencia;

  async function versionar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!podeVersionarCustos(perfil)) return;

    const custoNormalizado = normalizarCustoHora(novoCusto);
    if (!equipamentoId || !custoNormalizado) {
      setMensagem('Revise o equipamento e informe um custo válido, com até seis casas decimais.');
      return;
    }
    if (!referencia.trim()) {
      setMensagem('Informe a referência desta atualização demonstrativa.');
      return;
    }

    setSalvando(true);
    setMensagem('');
    const { error } = await cliente.rpc('versionar_custo_equipamento', {
      equipamento: equipamentoId,
      novo_custo_hora: custoNormalizado,
      nova_vigencia: vigenciaEfetiva,
      fonte: referencia.trim(),
    });

    if (error) {
      setMensagem(error.code === '42501'
        ? 'Seu perfil não tem autorização para alterar custos.'
        : 'Não foi possível criar a nova vigência. Confirme os dados e tente novamente.');
    } else {
      setNovoCusto('');
      setReferencia('');
      setMensagem('Nova vigência salva e registrada na auditoria da homologação.');
      await carregar();
    }
    setSalvando(false);
  }

  if (!podeConsultarCustos(perfil)) {
    return <div className="painel"><section className="aviso-custos" role="alert"><ShieldCheck size={20} /><div><strong>Acesso não autorizado</strong><p>Custos-hora estão disponíveis somente para Validador e Administrador.</p></div></section></div>;
  }

  return <div className="painel painel-custos">
    <section className="cabecalho-custos">
      <div><span><CircleDollarSign size={17} /> Origem: demonstração</span><h2>Custos-hora vigentes</h2><p>Valores sintéticos persistidos no Supabase de homologação e protegidos por perfil.</p></div>
      <button type="button" onClick={() => void carregar()} disabled={carregando}><RefreshCw size={16} /> Atualizar</button>
    </section>

    {erro && <section className="aviso-custos erro" role="alert"><ShieldCheck size={20} /><div><strong>Falha na consulta</strong><p>{erro}</p></div></section>}
    {carregando && <section className="aviso-custos" role="status"><RefreshCw size={20} /><div><strong>Carregando custos</strong><p>Consultando somente registros demonstrativos autorizados.</p></div></section>}

    {!carregando && !erro && <div className={`grade-custos ${podeVersionarCustos(perfil) ? '' : 'somente-leitura'}`}>
      <section className="bloco tabela-custos">
        <header><div><h2>Vigências atuais</h2><p>{equipamentosVisiveis.length} de {equipamentos.length} equipamentos.</p></div><span className="estado estado-formalizada">RLS ativa</span></header>
        <BarraBuscaFiltros busca={busca} aoMudarBusca={setBusca} placeholder="Pesquisar equipamento ou código" total={equipamentosVisiveis.length} filtros={[{ id: 'situacao-equipamento', rotulo: 'Situação', valor: filtroSituacao, aoMudar: setFiltroSituacao, opcoes: [{ valor: 'todos', rotulo: 'Todos' }, { valor: 'ativos', rotulo: 'Ativos' }, { valor: 'inativos', rotulo: 'Inativos' }] }]} />
        <div className="tabela-wrap"><table><thead><tr><th>Equipamento</th><th>Código</th><th>Custo-hora</th><th>Vigente desde</th><th>Situação</th></tr></thead><tbody>
          {equipamentosVisiveis.map((equipamento) => {
            const custo = custosPorEquipamento.get(equipamento.id);
            return <tr key={equipamento.id}><td><strong>{equipamento.nome}</strong></td><td>{equipamento.codigo}</td><td>{custo ? formatarCusto(custo.custo_hora) : 'Sem custo vigente'}</td><td>{custo ? formatarData(custo.vigente_desde) : '—'}</td><td><span className={`estado ${equipamento.ativo ? 'estado-formalizada' : 'estado-rascunho'}`}>{equipamento.ativo ? 'Ativo' : 'Inativo'}</span></td></tr>;
          })}
        </tbody></table></div>
        {equipamentosVisiveis.length === 0 && <div className="estado-vazio"><ShieldCheck size={18} /><span>{equipamentos.length === 0 ? 'Nenhum equipamento autorizado foi encontrado.' : 'Nenhum equipamento corresponde à pesquisa e ao filtro.'}</span></div>}
      </section>

      {podeVersionarCustos(perfil) ? <aside className="bloco formulario-custo">
        <header><div><h2>Nova vigência</h2><p>A versão anterior será encerrada; nenhum histórico será apagado.</p></div></header>
        <form onSubmit={versionar}>
          <label htmlFor="equipamento-custo">Equipamento</label>
          <select id="equipamento-custo" required value={equipamentoId} onChange={(evento) => setEquipamentoId(evento.target.value)}>{equipamentosAtivos.map((equipamento) => <option key={equipamento.id} value={equipamento.id}>{equipamento.nome}</option>)}</select>
          {custoSelecionado && <p className="custo-atual">Atual: <strong>{formatarCusto(custoSelecionado.custo_hora)}</strong> desde {formatarData(custoSelecionado.vigente_desde)}</p>}
          <label htmlFor="novo-custo">Novo custo-hora (BRL)</label>
          <input id="novo-custo" required inputMode="decimal" placeholder="0,00" value={novoCusto} onChange={(evento) => setNovoCusto(evento.target.value)} />
          <label htmlFor="vigencia-custo">Início da nova vigência</label>
          <input id="vigencia-custo" type="date" required min={vigenciaMinima} value={vigenciaEfetiva} onChange={(evento) => setVigencia(evento.target.value)} />
          <label htmlFor="referencia-custo">Referência da atualização demonstrativa</label>
          <textarea id="referencia-custo" required maxLength={240} rows={3} placeholder="Ex.: ajuste de homologação aprovado" value={referencia} onChange={(evento) => setReferencia(evento.target.value)} />
          <small>Não informe valores reais, caminhos restritos ou dados pessoais neste ambiente.</small>
          {mensagem && <p className="mensagem-formulario-custo" role="status">{mensagem}</p>}
          <button className="botao-interno" type="submit" disabled={salvando || equipamentosAtivos.length === 0}><Save size={16} />{salvando ? 'Salvando…' : 'Criar nova vigência'}</button>
        </form>
      </aside> : <aside className="aviso-custos leitura"><ShieldCheck size={20} /><div><strong>Consulta em modo somente leitura</strong><p>O perfil Validador pode visualizar os custos vigentes. Somente o Administrador pode criar uma nova vigência.</p></div></aside>}
    </div>}
  </div>;
}
