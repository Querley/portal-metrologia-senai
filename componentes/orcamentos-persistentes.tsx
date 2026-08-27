'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { Ban, Calculator, CheckCircle2, CornerUpLeft, FileCheck2, Pencil, RefreshCw, Save, Send, ShieldCheck, UploadCloud } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatarDinheiro } from '../lib/calculos';
import type { PerfilInterno } from '../lib/contratos';
import { ORIGEM_CUSTOS_HOMOLOGACAO, podeConsultarCustos } from '../lib/custos-equipamento';
import { calcularPreviaOrcamento, normalizarEntradaOrcamento, normalizarJustificativaDecisao, podeAprovarOrcamento, podeConsultarOrcamentos, podeCriarRascunhoOrcamento, podeDecidirOrcamento, podePublicarOrcamento } from '../lib/orcamentos-persistentes';
import { servicosOficiais } from '../lib/servicos';

type Servico = { id: string; slug: string; ativo: boolean };
type Equipamento = { id: string; codigo: string; nome: string; ativo: boolean };
type Custo = { equipamento_id: string; custo_hora: string | number; origem: 'demonstracao' };
type OrcamentoEditavel = {
  servico_id: string;
  equipamento_id: string;
  descricao: string;
  quantidade: string | number;
  horas: string | number;
  custos_extras: string | number;
  percentual_lucro: string | number;
};
type Orcamento = {
  versao_id: string;
  numero: number;
  estado: 'rascunho' | 'em_validacao' | 'devolvida' | 'rejeitada' | 'aprovada' | 'publicada';
  criada_em: string;
  descricao: string;
  servico_slug: string;
  equipamento_nome: string;
  horas: string | number;
  custo_hora_congelado: string | number | null;
  custos_extras: string | number;
  percentual_lucro: string | number;
  custo_congelado: string | number | null;
  preco_final: string | number;
  ultima_justificativa_interna: string | null;
  pode_enviar: boolean;
  pode_aprovar: boolean;
  pode_devolver: boolean;
  pode_rejeitar: boolean;
  pode_publicar: boolean;
  publicacao_pronta: boolean;
};

const apresentacaoEstado = {
  rascunho: { rotulo: 'Rascunho', classe: 'estado-rascunho' },
  em_validacao: { rotulo: 'Em validação', classe: 'estado-em-validacao' },
  devolvida: { rotulo: 'Devolvida', classe: 'estado-devolvida' },
  rejeitada: { rotulo: 'Rejeitada', classe: 'estado-rejeitada' },
  aprovada: { rotulo: 'Aprovada', classe: 'estado-formalizada' },
  publicada: { rotulo: 'Publicada', classe: 'estado-formalizada' },
} as const;

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
  const [processandoId, setProcessandoId] = useState('');
  const [decisaoAberta, setDecisaoAberta] = useState<{ versaoId: string; tipo: 'devolver' | 'rejeitar' } | null>(null);
  const [justificativa, setJustificativa] = useState('');
  const [versaoEmEdicao, setVersaoEmEdicao] = useState('');
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

    const respostaCustosPromessa = podeConsultarCustos(perfil)
      ? cliente.from('custos_equipamento').select('equipamento_id,custo_hora,origem').eq('origem', ORIGEM_CUSTOS_HOMOLOGACAO).is('vigente_ate', null)
      : Promise.resolve({ data: [], error: null });
    const [respostaServicos, respostaEquipamentos, respostaCustos, respostaOrcamentos] = await Promise.all([
      cliente.from('servicos_catalogo').select('id,slug,ativo').eq('ativo', true).order('slug'),
      cliente.from('equipamentos').select('id,codigo,nome,ativo').eq('ativo', true).order('nome'),
      respostaCustosPromessa,
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
    const equipamentosElegiveis = podeConsultarCustos(perfil)
      ? equipamentosEncontrados.filter((equipamento) => idsComCusto.has(equipamento.id))
      : equipamentosEncontrados;

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
    if (!normalizada || !servicoId || !equipamentoId) {
      setMensagem('Revise os campos. Quantidade deve ser positiva e os demais valores não podem ser negativos.');
      return;
    }

    setSalvando(true);
    setMensagem('');
    const argumentos = {
      servico: servicoId,
      equipamento: equipamentoId,
      descricao: normalizada.descricao,
      quantidade: normalizada.quantidade,
      horas: normalizada.horas,
      custos_extras: normalizada.custosExtras,
      percentual_lucro: normalizada.percentualLucro,
    };
    const { error } = versaoEmEdicao
      ? await cliente.rpc('revisar_orcamento_demonstrativo', { versao: versaoEmEdicao, ...argumentos })
      : await cliente.rpc('criar_orcamento_demonstrativo', argumentos);

    if (error) {
      setMensagem(error.code === '42501'
        ? 'Seu perfil não tem autorização para salvar este orçamento.'
        : 'Não foi possível salvar o orçamento. Confirme os valores e tente novamente.');
    } else {
      setMensagem(versaoEmEdicao
        ? 'Alterações salvas com recálculo protegido e auditoria.'
        : 'Rascunho salvo com custo-hora congelado e auditoria registrada.');
      setVersaoEmEdicao('');
      await carregar();
    }
    setSalvando(false);
  }

  async function carregarParaEdicao(orcamento: Orcamento) {
    if (!orcamento.pode_enviar) return;
    setProcessandoId(orcamento.versao_id);
    setMensagem('');
    const { data, error } = await cliente.rpc('obter_orcamento_demonstrativo_para_edicao', { versao: orcamento.versao_id });
    const campos = (data?.[0] ?? null) as OrcamentoEditavel | null;

    if (error || !campos) {
      setMensagem(error?.code === '42501'
        ? 'Somente o autor pode editar este orçamento.'
        : 'Não foi possível carregar os campos para edição. Atualize e tente novamente.');
    } else {
      setServicoId(campos.servico_id);
      setEquipamentoId(campos.equipamento_id);
      setDescricao(campos.descricao);
      setQuantidade(String(campos.quantidade));
      setHoras(String(campos.horas));
      setCustosExtras(String(campos.custos_extras));
      setPercentualLucro(String(campos.percentual_lucro));
      setVersaoEmEdicao(orcamento.versao_id);
      setMensagem('Campos carregados. Corrija e salve antes de reenviar.');
    }
    setProcessandoId('');
  }

  async function alterarEstado(orcamento: Orcamento, acao: 'enviar' | 'aprovar' | 'publicar') {
    if (acao === 'enviar' && !orcamento.pode_enviar) return;
    if (acao === 'aprovar' && (!orcamento.pode_aprovar || !podeAprovarOrcamento(perfil))) return;
    if (acao === 'publicar' && (!orcamento.pode_publicar || !orcamento.publicacao_pronta || !podePublicarOrcamento(perfil))) return;

    setProcessandoId(orcamento.versao_id);
    setMensagem('');
    const funcao = acao === 'enviar'
      ? 'enviar_orcamento_para_validacao'
      : acao === 'aprovar' ? 'aprovar_orcamento_demonstrativo' : 'publicar_orcamento_demonstrativo';
    const { error } = await cliente.rpc(funcao, { versao: orcamento.versao_id });

    if (error) {
      setMensagem(error.code === '42501'
        ? 'Seu perfil não tem autorização para esta transição.'
        : 'O estado do orçamento mudou ou a operação não pôde ser concluída. Atualize e tente novamente.');
    } else {
      setMensagem(acao === 'enviar'
        ? 'Orçamento enviado para validação. A transição foi auditada.'
        : acao === 'aprovar'
          ? 'Orçamento aprovado. Somente Administrador poderá publicá-lo após gerar o PDF imutável.'
          : 'Orçamento publicado pelo Administrador com PDF e hash imutável.');
      await carregar();
    }
    setProcessandoId('');
  }

  function abrirDecisao(orcamento: Orcamento, tipo: 'devolver' | 'rejeitar') {
    if (!podeDecidirOrcamento(perfil) || (tipo === 'devolver' ? !orcamento.pode_devolver : !orcamento.pode_rejeitar)) return;
    setDecisaoAberta({ versaoId: orcamento.versao_id, tipo });
    setJustificativa('');
    setMensagem('');
  }

  async function confirmarDecisao(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!decisaoAberta || !podeDecidirOrcamento(perfil)) return;
    const justificativaNormalizada = normalizarJustificativaDecisao(justificativa);
    if (!justificativaNormalizada) {
      setMensagem('Informe uma justificativa entre 5 e 500 caracteres.');
      return;
    }

    setProcessandoId(decisaoAberta.versaoId);
    setMensagem('');
    const { error } = await cliente.rpc('decidir_orcamento_demonstrativo', {
      versao: decisaoAberta.versaoId,
      decisao: decisaoAberta.tipo,
      justificativa: justificativaNormalizada,
    });

    if (error) {
      setMensagem(error.code === '42501'
        ? 'Seu perfil não tem autorização para devolver ou rejeitar esta proposta.'
        : 'A proposta mudou de estado ou a decisão não pôde ser registrada. Atualize e tente novamente.');
    } else {
      setMensagem(decisaoAberta.tipo === 'devolver'
        ? 'Proposta devolvida ao autor com justificativa e auditoria.'
        : 'Proposta rejeitada com justificativa e auditoria.');
      setDecisaoAberta(null);
      setJustificativa('');
      await carregar();
    }
    setProcessandoId('');
  }

  if (!podeConsultarOrcamentos(perfil)) {
    return <div className="painel"><section className="aviso-custos" role="alert"><ShieldCheck size={20} /><div><strong>Acesso não autorizado</strong><p>Orçamentos restritos estão disponíveis para Técnico, Validador e Administrador.</p></div></section></div>;
  }

  return <div className="painel painel-orcamentos-persistentes">
    <section className="cabecalho-custos">
      <div><span><Calculator size={17} /> Origem: demonstração</span><h2>Orçamentos persistentes</h2><p>Validador ou Administrador aprova, devolve ou rejeita; somente Administrador publica.</p></div>
      <button type="button" onClick={() => void carregar()} disabled={carregando}><RefreshCw size={16} /> Atualizar</button>
    </section>

    {erro && <section className="aviso-custos erro" role="alert"><ShieldCheck size={20} /><div><strong>Falha na consulta</strong><p>{erro}</p></div></section>}
    {carregando && <section className="aviso-custos" role="status"><RefreshCw size={20} /><div><strong>Carregando orçamentos</strong><p>Consultando somente registros da origem demonstrativa.</p></div></section>}

    {!carregando && !erro && <>
      <div className={`grade-orcamentos-persistentes ${podeCriarRascunhoOrcamento(perfil) ? '' : 'somente-leitura'}`}>
        {podeCriarRascunhoOrcamento(perfil) ? <section className="bloco formulario-orcamento-persistente">
          <header><div><h2>{versaoEmEdicao ? 'Editar orçamento' : 'Novo rascunho'}</h2><p>{versaoEmEdicao ? 'Corrija a versão antes de reenviá-la.' : 'Um item e um equipamento neste primeiro recorte.'}</p></div><span className="estado estado-rascunho">{versaoEmEdicao ? 'Em edição' : 'Rascunho'}</span></header>
          <form onSubmit={salvar}>
            <label htmlFor="servico-orcamento">Serviço</label>
            <select id="servico-orcamento" required value={servicoId} onChange={(evento) => setServicoId(evento.target.value)}>{servicos.map((servico) => <option key={servico.id} value={servico.id}>{tituloServico(servico.slug)}</option>)}</select>
            <label htmlFor="descricao-orcamento">Descrição do item</label>
            <input id="descricao-orcamento" required minLength={3} maxLength={500} value={descricao} onChange={(evento) => setDescricao(evento.target.value)} />
            <div className="linha-campos-orcamento"><label htmlFor="quantidade-orcamento">Quantidade<input id="quantidade-orcamento" required inputMode="decimal" value={quantidade} onChange={(evento) => setQuantidade(evento.target.value)} /></label><label htmlFor="horas-orcamento">Horas estimadas<input id="horas-orcamento" required inputMode="decimal" value={horas} onChange={(evento) => setHoras(evento.target.value)} /></label></div>
            <label htmlFor="equipamento-orcamento">Equipamento</label>
            <select id="equipamento-orcamento" required value={equipamentoId} onChange={(evento) => setEquipamentoId(evento.target.value)}>{equipamentos.map((equipamento) => <option key={equipamento.id} value={equipamento.id}>{equipamento.nome}</option>)}</select>
            {custoSelecionado
              ? <p className="custo-atual">Custo vigente demonstrativo: <strong>{formatarDinheiro(custoSelecionado.custo_hora)}</strong></p>
              : <p className="custo-atual"><ShieldCheck size={13} /> O custo-hora fica protegido e será aplicado pelo servidor.</p>}
            <div className="linha-campos-orcamento"><label htmlFor="extras-orcamento">Custos extras (BRL)<input id="extras-orcamento" required inputMode="decimal" value={custosExtras} onChange={(evento) => setCustosExtras(evento.target.value)} /></label><label htmlFor="lucro-orcamento">Lucro (%)<input id="lucro-orcamento" required inputMode="decimal" value={percentualLucro} onChange={(evento) => setPercentualLucro(evento.target.value)} /></label></div>
            <small>Use somente dados fictícios. Publicação exige PDF imutável e é exclusiva do Administrador.</small>
            {mensagem && <p className="mensagem-formulario-custo" role="status">{mensagem}</p>}
            {versaoEmEdicao && <button className="acao-orcamento" type="button" onClick={() => setVersaoEmEdicao('')}>Cancelar edição</button>}
            <button className="botao-interno" type="submit" disabled={salvando || !normalizarEntradaOrcamento(entrada) || !servicoId || !equipamentoId}><Save size={16} />{salvando ? 'Salvando…' : versaoEmEdicao ? 'Salvar alterações' : 'Salvar rascunho'}</button>
          </form>
        </section> : null}

        {podeCriarRascunhoOrcamento(perfil) && <aside className="bloco resumo-orcamento resumo-persistente">
          <p>PRÉVIA DETERMINÍSTICA</p>
          {previa ? <><dl><div><dt>Custo das máquinas</dt><dd>{formatarDinheiro(previa.custo.minus(custosExtras.replace(',', '.')))}</dd></div><div><dt>Custos extras</dt><dd>{formatarDinheiro(custosExtras.replace(',', '.'))}</dd></div><div><dt>Custo total</dt><dd>{formatarDinheiro(previa.custo)}</dd></div><div><dt>Lucro</dt><dd>{formatarDinheiro(previa.precoFinal.minus(previa.custo))}</dd></div><div className="total"><dt>Preço calculado</dt><dd>{formatarDinheiro(previa.precoFinal)}</dd></div></dl><small><ShieldCheck size={13} /> O servidor recalcula e congela o custo vigente ao salvar</small></> : <p className="previa-indisponivel">Seu perfil prepara o orçamento sem visualizar o custo-hora. O servidor fará o cálculo protegido ao salvar.</p>}
        </aside>}
      </div>

      <section className="bloco tabela-orcamentos-persistentes">
        <header><div><h2>Orçamentos salvos</h2><p>{orcamentos.length} registros demonstrativos persistidos.</p></div><span className="estado estado-formalizada">RLS ativa</span></header>
        <div className="tabela-wrap"><table><thead><tr><th>Criação</th><th>Descrição</th><th>Equipamento</th><th>Horas</th>{podeConsultarCustos(perfil) && <th>Custo-hora congelado</th>}<th>Preço</th><th>Estado</th><th><span className="sr-only">Ação</span></th></tr></thead><tbody>{orcamentos.map((orcamento) => {
          const estado = apresentacaoEstado[orcamento.estado] ?? apresentacaoEstado.rascunho;
          return <tr key={orcamento.versao_id}><td>{formatarDataHora(orcamento.criada_em)}</td><td><strong>{orcamento.descricao}</strong><small>{tituloServico(orcamento.servico_slug)}</small>{orcamento.ultima_justificativa_interna && <small className="justificativa-decisao">Motivo: {orcamento.ultima_justificativa_interna}</small>}</td><td>{orcamento.equipamento_nome}</td><td>{String(orcamento.horas).replace('.', ',')} h</td>{podeConsultarCustos(perfil) && <td>{orcamento.custo_hora_congelado === null ? '—' : formatarDinheiro(orcamento.custo_hora_congelado)}</td>}<td><strong>{formatarDinheiro(orcamento.preco_final)}</strong></td><td><span className={`estado ${estado.classe}`}>{estado.rotulo}</span></td><td><div className="acoes-orcamento">{orcamento.pode_enviar && <button className="acao-orcamento" type="button" disabled={processandoId === orcamento.versao_id} onClick={() => void carregarParaEdicao(orcamento)}><Pencil size={14} /> Editar</button>}{orcamento.pode_enviar && <button className="acao-orcamento" type="button" disabled={processandoId === orcamento.versao_id} onClick={() => void alterarEstado(orcamento, 'enviar')}><Send size={14} /> {orcamento.estado === 'devolvida' ? 'Reenviar' : 'Enviar'}</button>}{orcamento.pode_aprovar && podeAprovarOrcamento(perfil) && <button className="acao-orcamento aprovar" type="button" disabled={processandoId === orcamento.versao_id} onClick={() => void alterarEstado(orcamento, 'aprovar')}><CheckCircle2 size={14} /> Aprovar</button>}{orcamento.pode_devolver && podeDecidirOrcamento(perfil) && <button className="acao-orcamento devolver" type="button" disabled={processandoId === orcamento.versao_id} onClick={() => abrirDecisao(orcamento, 'devolver')}><CornerUpLeft size={14} /> Devolver</button>}{orcamento.pode_rejeitar && podeDecidirOrcamento(perfil) && <button className="acao-orcamento rejeitar" type="button" disabled={processandoId === orcamento.versao_id} onClick={() => abrirDecisao(orcamento, 'rejeitar')}><Ban size={14} /> Rejeitar</button>}{orcamento.pode_publicar && podePublicarOrcamento(perfil) && <button className="acao-orcamento publicar" type="button" disabled={processandoId === orcamento.versao_id || !orcamento.publicacao_pronta} title={orcamento.publicacao_pronta ? 'Publicar proposta aprovada' : 'Gere o PDF imutável antes de publicar'} onClick={() => void alterarEstado(orcamento, 'publicar')}><UploadCloud size={14} /> {orcamento.publicacao_pronta ? 'Publicar' : 'PDF pendente'}</button>}</div>{decisaoAberta?.versaoId === orcamento.versao_id && <form className="decisao-orcamento" onSubmit={confirmarDecisao}><label htmlFor={`justificativa-${orcamento.versao_id}`}>{decisaoAberta.tipo === 'devolver' ? 'Motivo da devolução' : 'Motivo da rejeição'}</label><textarea id={`justificativa-${orcamento.versao_id}`} autoFocus required minLength={5} maxLength={500} value={justificativa} onChange={(evento) => setJustificativa(evento.target.value)} /><div><button className="acao-orcamento" type="button" onClick={() => setDecisaoAberta(null)}>Cancelar</button><button className={`acao-orcamento ${decisaoAberta.tipo === 'devolver' ? 'devolver' : 'rejeitar'}`} type="submit" disabled={!normalizarJustificativaDecisao(justificativa) || processandoId === orcamento.versao_id}>Confirmar</button></div></form>}</td></tr>;
        })}</tbody></table></div>
        {orcamentos.length === 0 && <div className="estado-vazio"><FileCheck2 size={18} /><span>Nenhum orçamento persistente foi criado nesta origem.</span></div>}
      </section>
    </>}
  </div>;
}
