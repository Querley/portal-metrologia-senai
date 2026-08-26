'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { Calculator, FileCheck2, RefreshCw, Save, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatarDinheiro } from '../lib/calculos';
import type { PerfilInterno } from '../lib/contratos';
import { ORIGEM_CUSTOS_HOMOLOGACAO } from '../lib/custos-equipamento';
import { calcularPreviaOrcamento, normalizarEntradaOrcamento, podeConsultarOrcamentos, podeCriarRascunhoOrcamento } from '../lib/orcamentos-persistentes';
import { servicosOficiais } from '../lib/servicos';

type Servico = { id: string; slug: string; ativo: boolean };
type Equipamento = { id: string; codigo: string; nome: string; ativo: boolean };
type Custo = { equipamento_id: string; custo_hora: string | number; origem: 'demonstracao' };
type Orcamento = {
  versao_id: string;
  numero: number;
  estado: 'rascunho';
  criada_em: string;
  descricao: string;
  servico_slug: string;
  equipamento_nome: string;
  horas: string | number;
  custo_hora_congelado: string | number;
  custos_extras: string | number;
  percentual_lucro: string | number;
  custo_congelado: string | number;
  preco_final: string | number;
};

function tituloServico(slug: string): string {
  return servicosOficiais.find((servico) => servico.slug === slug)?.titulo
    ?? slug.split('-').map((parte) => parte[0]?.toUpperCase() + parte.slice(1)).join(' ');
}

function formatarDataHora(valor: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(valor));
}

export function OrcamentosPersistentes({ cliente, perfil }: { cliente: SupabaseClient; perfil: PerfilInterno }) {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [custos, setCustos] = useState<Custo[]>([]);
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [servicoId, setServicoId] = useState('');
  const [equipamentoId, setEquipamentoId] = useState('');
  const [descricao, setDescricao] = useState('Inspeção dimensional de lote demonstrativa');
  const [quantidade, setQuantidade] = useState('20');
  const [horas, setHoras] = useState('12');
  const [custosExtras, setCustosExtras] = useState('280');
  const [percentualLucro, setPercentualLucro] = useState('25');

  const carregar = useCallback(async () => {
    if (!podeConsultarOrcamentos(perfil)) return;
    setCarregando(true);
    setErro('');

    const [respostaServicos, respostaEquipamentos, respostaCustos, respostaOrcamentos] = await Promise.all([
      cliente.from('servicos_catalogo').select('id,slug,ativo').eq('ativo', true).order('slug'),
      cliente.from('equipamentos').select('id,codigo,nome,ativo').eq('ativo', true).order('nome'),
      cliente.from('custos_equipamento').select('equipamento_id,custo_hora,origem').eq('origem', ORIGEM_CUSTOS_HOMOLOGACAO).is('vigente_ate', null),
      cliente.rpc('listar_orcamentos_demonstrativos'),
    ]);

    if (respostaServicos.error || respostaEquipamentos.error || respostaCustos.error || respostaOrcamentos.error) {
      setErro('Não foi possível carregar os orçamentos persistentes de homologação.');
      setCarregando(false);
      return;
    }

    const servicosEncontrados = (respostaServicos.data ?? []) as Servico[];
    const equipamentosEncontrados = (respostaEquipamentos.data ?? []) as Equipamento[];
    const custosEncontrados = ((respostaCustos.data ?? []) as Custo[]).filter((custo) => custo.origem === ORIGEM_CUSTOS_HOMOLOGACAO);
    const idsComCusto = new Set(custosEncontrados.map((custo) => custo.equipamento_id));
    const equipamentosElegiveis = equipamentosEncontrados.filter((equipamento) => idsComCusto.has(equipamento.id));

    setServicos(servicosEncontrados);
    setEquipamentos(equipamentosElegiveis);
    setCustos(custosEncontrados);
    setOrcamentos((respostaOrcamentos.data ?? []) as Orcamento[]);
    setServicoId((atual) => atual || servicosEncontrados[0]?.id || '');
    setEquipamentoId((atual) => atual || equipamentosElegiveis[0]?.id || '');
    setCarregando(false);
  }, [cliente, perfil]);

  useEffect(() => {
    queueMicrotask(() => void carregar());
  }, [carregar]);

  const custosPorEquipamento = useMemo(() => new Map(custos.map((custo) => [custo.equipamento_id, custo])), [custos]);
  const custoSelecionado = custosPorEquipamento.get(equipamentoId);
  const entrada = { descricao, quantidade, horas, custosExtras, percentualLucro };
  const previa = custoSelecionado ? calcularPreviaOrcamento(entrada, custoSelecionado.custo_hora) : null;

  async function salvar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!podeCriarRascunhoOrcamento(perfil)) return;
    const normalizada = normalizarEntradaOrcamento(entrada);
    if (!normalizada || !servicoId || !equipamentoId || !custoSelecionado) {
      setMensagem('Revise os campos. Quantidade deve ser positiva e os demais valores não podem ser negativos.');
      return;
    }

    setSalvando(true);
    setMensagem('');
    const { error } = await cliente.rpc('criar_orcamento_demonstrativo', {
      servico: servicoId,
      equipamento: equipamentoId,
      descricao: normalizada.descricao,
      quantidade: normalizada.quantidade,
      horas: normalizada.horas,
      custos_extras: normalizada.custosExtras,
      percentual_lucro: normalizada.percentualLucro,
    });

    if (error) {
      setMensagem(error.code === '42501'
        ? 'Seu perfil não tem autorização para criar rascunhos.'
        : 'Não foi possível salvar o rascunho. Confirme os valores e tente novamente.');
    } else {
      setMensagem('Rascunho salvo com custo-hora congelado e auditoria registrada.');
      await carregar();
    }
    setSalvando(false);
  }

  if (!podeConsultarOrcamentos(perfil)) {
    return <div className="painel"><section className="aviso-custos" role="alert"><ShieldCheck size={20} /><div><strong>Acesso não autorizado</strong><p>Este recorte está disponível somente para Validador e Administrador.</p></div></section></div>;
  }

  return <div className="painel painel-orcamentos-persistentes">
    <section className="cabecalho-custos">
      <div><span><Calculator size={17} /> Origem: demonstração</span><h2>Orçamentos persistentes</h2><p>Rascunhos sintéticos calculados no servidor com o custo vigente congelado.</p></div>
      <button type="button" onClick={() => void carregar()} disabled={carregando}><RefreshCw size={16} /> Atualizar</button>
    </section>

    {erro && <section className="aviso-custos erro" role="alert"><ShieldCheck size={20} /><div><strong>Falha na consulta</strong><p>{erro}</p></div></section>}
    {carregando && <section className="aviso-custos" role="status"><RefreshCw size={20} /><div><strong>Carregando orçamentos</strong><p>Consultando somente registros da origem demonstrativa.</p></div></section>}

    {!carregando && !erro && <>
      <div className={`grade-orcamentos-persistentes ${podeCriarRascunhoOrcamento(perfil) ? '' : 'somente-leitura'}`}>
        {podeCriarRascunhoOrcamento(perfil) ? <section className="bloco formulario-orcamento-persistente">
          <header><div><h2>Novo rascunho</h2><p>Um item e um equipamento neste primeiro recorte.</p></div><span className="estado estado-rascunho">Rascunho</span></header>
          <form onSubmit={salvar}>
            <label htmlFor="servico-orcamento">Serviço</label>
            <select id="servico-orcamento" required value={servicoId} onChange={(evento) => setServicoId(evento.target.value)}>{servicos.map((servico) => <option key={servico.id} value={servico.id}>{tituloServico(servico.slug)}</option>)}</select>
            <label htmlFor="descricao-orcamento">Descrição do item</label>
            <input id="descricao-orcamento" required minLength={3} maxLength={500} value={descricao} onChange={(evento) => setDescricao(evento.target.value)} />
            <div className="linha-campos-orcamento"><label htmlFor="quantidade-orcamento">Quantidade<input id="quantidade-orcamento" required inputMode="decimal" value={quantidade} onChange={(evento) => setQuantidade(evento.target.value)} /></label><label htmlFor="horas-orcamento">Horas estimadas<input id="horas-orcamento" required inputMode="decimal" value={horas} onChange={(evento) => setHoras(evento.target.value)} /></label></div>
            <label htmlFor="equipamento-orcamento">Equipamento</label>
            <select id="equipamento-orcamento" required value={equipamentoId} onChange={(evento) => setEquipamentoId(evento.target.value)}>{equipamentos.map((equipamento) => <option key={equipamento.id} value={equipamento.id}>{equipamento.nome}</option>)}</select>
            {custoSelecionado && <p className="custo-atual">Custo vigente demonstrativo: <strong>{formatarDinheiro(custoSelecionado.custo_hora)}</strong></p>}
            <div className="linha-campos-orcamento"><label htmlFor="extras-orcamento">Custos extras (BRL)<input id="extras-orcamento" required inputMode="decimal" value={custosExtras} onChange={(evento) => setCustosExtras(evento.target.value)} /></label><label htmlFor="lucro-orcamento">Lucro (%)<input id="lucro-orcamento" required inputMode="decimal" value={percentualLucro} onChange={(evento) => setPercentualLucro(evento.target.value)} /></label></div>
            <small>Use somente dados fictícios. A aprovação e a publicação ainda não fazem parte deste recorte.</small>
            {mensagem && <p className="mensagem-formulario-custo" role="status">{mensagem}</p>}
            <button className="botao-interno" type="submit" disabled={salvando || !previa}><Save size={16} />{salvando ? 'Salvando…' : 'Salvar rascunho'}</button>
          </form>
        </section> : <aside className="aviso-custos leitura"><ShieldCheck size={20} /><div><strong>Consulta em modo somente leitura</strong><p>O Validador consulta rascunhos e valores congelados. A criação está restrita ao Administrador neste recorte.</p></div></aside>}

        {podeCriarRascunhoOrcamento(perfil) && <aside className="bloco resumo-orcamento resumo-persistente">
          <p>PRÉVIA DETERMINÍSTICA</p>
          {previa ? <><dl><div><dt>Custo das máquinas</dt><dd>{formatarDinheiro(previa.custo.minus(custosExtras.replace(',', '.')))}</dd></div><div><dt>Custos extras</dt><dd>{formatarDinheiro(custosExtras.replace(',', '.'))}</dd></div><div><dt>Custo total</dt><dd>{formatarDinheiro(previa.custo)}</dd></div><div><dt>Lucro</dt><dd>{formatarDinheiro(previa.precoFinal.minus(previa.custo))}</dd></div><div className="total"><dt>Preço calculado</dt><dd>{formatarDinheiro(previa.precoFinal)}</dd></div></dl><small><ShieldCheck size={13} /> O servidor recalcula e congela o custo vigente ao salvar</small></> : <p className="previa-indisponivel">Preencha valores válidos para ver a prévia.</p>}
        </aside>}
      </div>

      <section className="bloco tabela-orcamentos-persistentes">
        <header><div><h2>Rascunhos salvos</h2><p>{orcamentos.length} registros demonstrativos persistidos.</p></div><span className="estado estado-formalizada">RLS ativa</span></header>
        <div className="tabela-wrap"><table><thead><tr><th>Criação</th><th>Descrição</th><th>Equipamento</th><th>Horas</th><th>Custo-hora congelado</th><th>Preço</th><th>Estado</th></tr></thead><tbody>{orcamentos.map((orcamento) => <tr key={orcamento.versao_id}><td>{formatarDataHora(orcamento.criada_em)}</td><td><strong>{orcamento.descricao}</strong><small>{tituloServico(orcamento.servico_slug)}</small></td><td>{orcamento.equipamento_nome}</td><td>{String(orcamento.horas).replace('.', ',')} h</td><td>{formatarDinheiro(orcamento.custo_hora_congelado)}</td><td><strong>{formatarDinheiro(orcamento.preco_final)}</strong></td><td><span className="estado estado-rascunho">Rascunho</span></td></tr>)}</tbody></table></div>
        {orcamentos.length === 0 && <div className="estado-vazio"><FileCheck2 size={18} /><span>Nenhum rascunho persistente foi criado nesta origem.</span></div>}
      </section>
    </>}
  </div>;
}
