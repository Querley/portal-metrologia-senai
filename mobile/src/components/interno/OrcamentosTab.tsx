import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { formatarDinheiro } from '@lib/calculos';
import { correspondeBusca, formatosDataParaBusca } from '@lib/busca-e-filtros';
import type { ContextoOperacionalLaboratorio } from '@lib/chatbot-metrologia';
import type { PerfilInterno } from '@lib/contratos';
import { podeConsultarCustos } from '@lib/custos-equipamento';
import {
  calcularPreviaOrcamento,
  podeAprovarOrcamento,
  podeDecidirOrcamento,
  podePublicarOrcamento,
} from '@lib/orcamentos-persistentes';
import { quartis } from '@lib/recomendacao';
import { servicosOficiais } from '@lib/servicos';
import type { SolicitacaoParaPreProposta } from '@lib/solicitacoes-persistentes';
import { CORES, estilosComuns } from '../../theme';
import type { CustoEquipamentoDb, EquipamentoDb } from './CustosTab';

export type ServicoCatalogoDb = { id: string; slug: string; ativo: boolean };

function dataFuturaPadrao(dias = 7): string {
  return new Date(Date.now() + dias * 86_400_000).toISOString().slice(0, 10);
}

export function OrcamentosTab({
  contexto,
  perfil,
  servicosDb,
  equipamentosDb,
  custosDb,
  solicitacaoSelecionada,
  aoSelecionarSolicitacao,
  aoCarregarParaEdicao,
  aoSalvarPreProposta,
  aoAlterarEstado,
  aoDecidirOrcamento,
  aoPublicarComPdf,
  aoConfirmarInicioTrabalho,
}: {
  contexto: ContextoOperacionalLaboratorio;
  perfil: PerfilInterno;
  servicosDb: ServicoCatalogoDb[];
  equipamentosDb: EquipamentoDb[];
  custosDb: CustoEquipamentoDb[];
  solicitacaoSelecionada: SolicitacaoParaPreProposta | null;
  aoSelecionarSolicitacao: (sol: SolicitacaoParaPreProposta | null) => void;
  aoCarregarParaEdicao: (versaoId: string) => Promise<{
    servicoId: string;
    equipamentoId: string;
    descricao: string;
    quantidade: string;
    horas: string;
    custosExtras: string;
    percentualLucro: string;
    destinatario: string;
    prazoPagamentoDias: number;
  } | null>;
  aoSalvarPreProposta: (payload: {
    versaoEmEdicao?: string;
    solicitacaoId: string;
    servicoId: string;
    equipamentoId: string;
    descricao: string;
    quantidade: string;
    horas: string;
    custosExtras: string;
    percentualLucro: string;
    destinatario: string;
    prazoPagamentoDias: number;
    entregaEstimada: string;
    justificativa: string;
  }) => Promise<boolean>;
  aoAlterarEstado: (versaoId: string, acao: 'enviar' | 'aprovar') => Promise<void>;
  aoDecidirOrcamento: (versaoId: string, decisao: 'devolver' | 'rejeitar', justificativa: string) => Promise<void>;
  aoPublicarComPdf: (orc: ContextoOperacionalLaboratorio['orcamentos'][number]) => Promise<void>;
  aoConfirmarInicioTrabalho: (versaoId: string) => Promise<void>;
}) {
  const [formAberto, setFormAberto] = useState(Boolean(solicitacaoSelecionada));
  const [versaoEmEdicao, setVersaoEmEdicao] = useState<string>('');
  const [servicoId, setServicoId] = useState(servicosDb[0]?.id ?? '');
  const [equipamentoId, setEquipamentoId] = useState(equipamentosDb[0]?.id ?? '');
  const [horas, setHoras] = useState('8');
  const [custosExtras, setCustosExtras] = useState('0');
  const [margem, setMargem] = useState('18');
  const [quantidade, setQuantidade] = useState(String(solicitacaoSelecionada?.quantidade ?? '1'));
  const [destinatario, setDestinatario] = useState(solicitacaoSelecionada?.nome ?? '');
  const [prazoPagto, setPrazoPagto] = useState(String(solicitacaoSelecionada?.prazo_pagamento_dias ?? 30));
  const [entregaEstimada, setEntregaEstimada] = useState(dataFuturaPadrao(7));
  const [descricao, setDescricao] = useState(
    solicitacaoSelecionada?.descricao ?? 'Inspeção dimensional e emissão de laudo técnico.',
  );
  const [justificativa, setJustificativa] = useState('');
  const [salvando, setSalvando] = useState(false);

  const [busca, setBusca] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroMaquina, setFiltroMaquina] = useState('todas');
  const [ordenacao, setOrdenacao] = useState<'recentes' | 'antigas' | 'empresa' | 'horas'>('recentes');
  const [decisaoAbertaId, setDecisaoAbertaId] = useState('');
  const [decisaoTipo, setDecisaoTipo] = useState<'devolver' | 'rejeitar'>('devolver');
  const [justificativaDecisao, setJustificativaDecisao] = useState('');

  const exibeCustos = podeConsultarCustos(perfil);
  const podeAprovar = podeAprovarOrcamento(perfil);
  const podeDecidir = podeDecidirOrcamento(perfil);
  const podePublicar = podePublicarOrcamento(perfil);

  const equipamentosAtivos = useMemo(
    () => equipamentosDb.filter((e) => e.ativo),
    [equipamentosDb],
  );
  const servicoEfetivoId = servicoId || servicosDb[0]?.id || '';
  const equipamentoEfetivoId = equipamentoId || equipamentosAtivos[0]?.id || '';

  const custosVigentes = useMemo(() => {
    const mapa = new Map<string, CustoEquipamentoDb>();
    for (const c of custosDb) {
      if (c.vigente_ate === null && !mapa.has(c.equipamento_id)) {
        mapa.set(c.equipamento_id, c);
      }
    }
    return mapa;
  }, [custosDb]);

  const custoHoraVigente = useMemo(() => {
    const c = custosVigentes.get(equipamentoEfetivoId);
    return c ? String(c.custo_hora) : '230';
  }, [custosVigentes, equipamentoEfetivoId]);

  const previa = useMemo(() => {
    return calcularPreviaOrcamento(
      {
        descricao: descricao || 'Serviço metrológico',
        quantidade: quantidade || '1',
        horas: horas || '8',
        custosExtras: custosExtras || '0',
        percentualLucro: margem || '18',
      },
      custoHoraVigente,
    );
  }, [custoHoraVigente, custosExtras, descricao, horas, margem, quantidade]);

  const faixaQ1Q3 = useMemo(() => {
    const q = quartis([4, 5, 6, 6, 7, 8, 9, 10, 12]);
    return {
      q1: q ? q.q1.toNumber() : 6,
      mediana: q ? q.mediana.toNumber() : 7,
      q3: q ? q.q3.toNumber() : 9,
    };
  }, []);

  const solicitacoesElegiveis = useMemo(
    () => contexto.solicitacoes.filter((s) => s.solicitacao_id && !s.tem_pre_proposta),
    [contexto.solicitacoes],
  );

  const orcamentosVisiveis = useMemo(() => {
    return contexto.orcamentos
      .filter((orc) => {
        if (filtroEstado === 'rascunho_devolvida') {
          if (orc.estado !== 'rascunho' && orc.estado !== 'devolvida') return false;
        } else if (filtroEstado === 'aprovada_publicada') {
          if (orc.estado !== 'aprovada' && orc.estado !== 'publicada') return false;
        } else if (filtroEstado !== 'todos' && orc.estado !== filtroEstado) {
          return false;
        }
        if (filtroMaquina !== 'todas' && orc.equipamento_nome !== filtroMaquina) return false;
        return correspondeBusca(
          busca,
          orc.solicitacao_codigo,
          `DEM-SOL-${String(orc.solicitacao_codigo).padStart(4, '0')}`,
          orc.empresa_nome,
          orc.descricao,
          orc.equipamento_nome,
          orc.estado,
          orc.destinatario,
          formatosDataParaBusca(orc.entrega_estimada),
        );
      })
      .sort((a, b) => {
        if (ordenacao === 'antigas') return Number(a.solicitacao_codigo) - Number(b.solicitacao_codigo);
        if (ordenacao === 'empresa') return a.empresa_nome.localeCompare(b.empresa_nome, 'pt-BR');
        if (ordenacao === 'horas') return Number(b.horas || 0) - Number(a.horas || 0);
        return Number(b.solicitacao_codigo) - Number(a.solicitacao_codigo);
      });
  }, [busca, contexto.orcamentos, filtroEstado, filtroMaquina, ordenacao]);

  const maquinasNosOrcamentos = useMemo(
    () => Array.from(new Set(contexto.orcamentos.map((o) => o.equipamento_nome).filter(Boolean))),
    [contexto.orcamentos],
  );

  return (
    <View>
      {/* KPIs clicáveis na aba Orçamentos */}
      <View style={styles.gradeKpis}>
        {[
          {
            rotulo: 'Rascunho / Devolv.',
            valor: contexto.orcamentos.filter((o) => o.estado === 'rascunho' || o.estado === 'devolvida').length,
            filtro: 'rascunho_devolvida',
          },
          {
            rotulo: 'Em validação',
            valor: contexto.orcamentos.filter((o) => o.estado === 'em_validacao').length,
            filtro: 'em_validacao',
          },
          {
            rotulo: 'Aprov. / Publicadas',
            valor: contexto.orcamentos.filter((o) => o.estado === 'aprovada' || o.estado === 'publicada').length,
            filtro: 'aprovada_publicada',
          },
          {
            rotulo: 'Aceitas',
            valor: contexto.orcamentos.filter((o) => o.estado === 'aceita').length,
            filtro: 'aceita',
          },
        ].map((k) => (
          <TouchableOpacity
            key={k.rotulo}
            style={[
              styles.cardKpi,
              filtroEstado === k.filtro && { borderColor: CORES.azulPrincipal, borderWidth: 2 },
            ]}
            onPress={() => setFiltroEstado((atual) => (atual === k.filtro ? 'todos' : k.filtro))}
          >
            <Text style={styles.kpiValor}>{k.valor}</Text>
            <Text style={styles.kpiRotulo}>{k.rotulo}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Nova Pré-proposta (Colapsável para manter UI limpa) */}
      <View style={estilosComuns.card}>
        <TouchableOpacity
          style={estilosComuns.linhaEntre}
          onPress={() => setFormAberto((a) => !a)}
        >
          <View style={{ flex: 1 }}>
            <Text style={estilosComuns.badge}>WORKFLOW COMERCIAL</Text>
            <Text style={estilosComuns.tituloSecao}>Elaborar Nova Pré-proposta</Text>
          </View>
          <Text style={styles.linkExpandir}>{formAberto ? '▾ Fechar' : '▸ Abrir'}</Text>
        </TouchableOpacity>

        {formAberto && (
          <View style={{ marginTop: 10 }}>
            <Text style={estilosComuns.rotuloCampo}>Solicitação vinculada</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              {solicitacoesElegiveis.length === 0 ? (
                <Text style={styles.textoVazio}>
                  Nenhuma solicitação ativada sem pré-proposta no momento.
                </Text>
              ) : (
                solicitacoesElegiveis.map((sol) => {
                  const ativo = solicitacaoSelecionada?.id === sol.id;
                  return (
                    <TouchableOpacity
                      key={sol.id}
                      style={[estilosComuns.chip, ativo && estilosComuns.chipAtivo, { marginRight: 6 }]}
                      onPress={() => {
                        aoSelecionarSolicitacao(sol);
                        setQuantidade(String(sol.quantidade || 1));
                        setDestinatario(sol.nome || '');
                        setPrazoPagto(String(sol.prazo_pagamento_dias || 30));
                        setDescricao(sol.descricao || '');
                      }}
                    >
                      <Text style={[estilosComuns.chipTexto, ativo && estilosComuns.chipTextoAtivo]}>
                        #{sol.codigo} • {sol.empresa}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <Text style={estilosComuns.rotuloCampo}>Serviço</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              {servicosDb.map((srv) => {
                const info = servicosOficiais.find((o) => o.slug === srv.slug);
                const ativo = servicoEfetivoId === srv.id;
                return (
                  <TouchableOpacity
                    key={srv.id}
                    style={[estilosComuns.chip, ativo && estilosComuns.chipAtivo, { marginRight: 6 }]}
                    onPress={() => setServicoId(srv.id)}
                  >
                    <Text style={[estilosComuns.chipTexto, ativo && estilosComuns.chipTextoAtivo]}>
                      {info?.titulo ?? srv.slug}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={estilosComuns.rotuloCampo}>Equipamento ZEISS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              {equipamentosAtivos.map((eq) => {
                const ativo = equipamentoEfetivoId === eq.id;
                return (
                  <TouchableOpacity
                    key={eq.id}
                    style={[estilosComuns.chip, ativo && estilosComuns.chipAtivo, { marginRight: 6 }]}
                    onPress={() => setEquipamentoId(eq.id)}
                  >
                    <Text style={[estilosComuns.chipTexto, ativo && estilosComuns.chipTextoAtivo]}>
                      {eq.nome}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={estilosComuns.linha}>
              <View style={{ flex: 1 }}>
                <Text style={estilosComuns.rotuloCampo}>Horas</Text>
                <TextInput
                  style={estilosComuns.input}
                  keyboardType="numeric"
                  value={horas}
                  onChangeText={setHoras}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={estilosComuns.rotuloCampo}>Quantidade</Text>
                <TextInput
                  style={estilosComuns.input}
                  keyboardType="numeric"
                  value={quantidade}
                  onChangeText={setQuantidade}
                />
              </View>
            </View>

            {exibeCustos ? (
              <View style={[estilosComuns.linha, { marginTop: 8 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={estilosComuns.rotuloCampo}>Custo/h vigente</Text>
                  <View style={[estilosComuns.input, { justifyContent: 'center', backgroundColor: '#F1F5F9' }]}>
                    <Text style={{ fontWeight: '800', color: CORES.azulEscuro }}>
                      {formatarDinheiro(Number(custoHoraVigente))}/h
                    </Text>
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={estilosComuns.rotuloCampo}>Margem (%)</Text>
                  <TextInput
                    style={estilosComuns.input}
                    keyboardType="numeric"
                    value={margem}
                    onChangeText={setMargem}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={estilosComuns.rotuloCampo}>Extras (R$)</Text>
                  <TextInput
                    style={estilosComuns.input}
                    keyboardType="numeric"
                    value={custosExtras}
                    onChangeText={setCustosExtras}
                  />
                </View>
              </View>
            ) : null}

            <View style={[estilosComuns.linha, { marginTop: 8 }]}>
              <View style={{ flex: 1 }}>
                <Text style={estilosComuns.rotuloCampo}>Destinatário</Text>
                <TextInput
                  style={estilosComuns.input}
                  value={destinatario}
                  onChangeText={setDestinatario}
                  placeholder="Nome do cliente"
                />
              </View>
              <View style={{ width: 110 }}>
                <Text style={estilosComuns.rotuloCampo}>Pagto (dias)</Text>
                <TextInput
                  style={estilosComuns.input}
                  keyboardType="numeric"
                  value={prazoPagto}
                  onChangeText={setPrazoPagto}
                />
              </View>
            </View>

            <Text style={[estilosComuns.rotuloCampo, { marginTop: 8 }]}>Entrega estimada (AAAA-MM-DD)</Text>
            <TextInput
              style={estilosComuns.input}
              value={entregaEstimada}
              onChangeText={setEntregaEstimada}
              placeholder="2026-12-05"
            />

            <Text style={[estilosComuns.rotuloCampo, { marginTop: 8 }]}>Descrição técnica</Text>
            <TextInput
              style={[estilosComuns.input, { minHeight: 58 }]}
              multiline
              value={descricao}
              onChangeText={setDescricao}
            />

            <Text style={[estilosComuns.rotuloCampo, { marginTop: 8 }]}>Justificativa (se fora Q1–Q3)</Text>
            <TextInput
              style={estilosComuns.input}
              value={justificativa}
              onChangeText={setJustificativa}
              placeholder={`Faixa Q1–Q3: ${faixaQ1Q3.q1}h–${faixaQ1Q3.q3}h (Mediana ${faixaQ1Q3.mediana}h)`}
            />

            {exibeCustos && (
              <View style={styles.caixaResultado}>
                <Text style={styles.precoFinal}>
                  Prévia Final: {formatarDinheiro(previa?.precoFinal ?? 0)}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[estilosComuns.botaoPrimario, { marginTop: 10 }]}
              disabled={salvando || (!versaoEmEdicao && !solicitacaoSelecionada?.solicitacao_id)}
              onPress={async () => {
                if (!versaoEmEdicao && !solicitacaoSelecionada?.solicitacao_id) return;
                setSalvando(true);
                try {
                  const ok = await aoSalvarPreProposta({
                    versaoEmEdicao: versaoEmEdicao || undefined,
                    solicitacaoId: solicitacaoSelecionada?.solicitacao_id ?? '',
                    servicoId: servicoEfetivoId,
                    equipamentoId: equipamentoEfetivoId,
                    descricao,
                    quantidade,
                    horas,
                    custosExtras,
                    percentualLucro: margem,
                    destinatario,
                    prazoPagamentoDias: Number(prazoPagto) || 30,
                    entregaEstimada,
                    justificativa,
                  });
                  if (ok) {
                    setVersaoEmEdicao('');
                    setFormAberto(false);
                  }
                } finally {
                  setSalvando(false);
                }
              }}
            >
              <Text style={estilosComuns.textoBotaoPrimario}>
                {salvando
                  ? 'Salvando...'
                  : versaoEmEdicao
                    ? 'Salvar Revisão da Pré-proposta'
                    : solicitacaoSelecionada?.solicitacao_id
                      ? 'Salvar Pré-proposta no Banco'
                      : 'Selecione uma solicitação vinculada acima'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Busca e Filtros */}
      <View style={estilosComuns.card}>
        <View style={estilosComuns.linhaEntre}>
          <Text style={estilosComuns.tituloSecao}>
            Pré-propostas ({orcamentosVisiveis.length}/{contexto.orcamentos.length})
          </Text>
          {(busca || filtroEstado !== 'todos' || filtroMaquina !== 'todas') && (
            <TouchableOpacity
              onPress={() => {
                setBusca('');
                setFiltroEstado('todos');
                setFiltroMaquina('todas');
              }}
            >
              <Text style={styles.linkLimpar}>Limpar filtros</Text>
            </TouchableOpacity>
          )}
        </View>
        <TextInput
          style={[estilosComuns.input, { marginTop: 8 }]}
          value={busca}
          onChangeText={setBusca}
          placeholder="Buscar protocolo, empresa, máquina, status ou data..."
          placeholderTextColor={CORES.textoSuave}
        />
        <Text style={styles.rotuloFiltro}>Estado:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'rascunho', label: 'Rascunho' },
            { id: 'em_validacao', label: 'Em validação' },
            { id: 'devolvida', label: 'Devolvida' },
            { id: 'aprovada', label: 'Aprovada' },
            { id: 'publicada', label: 'Publicada' },
            { id: 'aceita', label: 'Aceita' },
            { id: 'recusada', label: 'Recusada' },
            { id: 'rejeitada', label: 'Rejeitada' },
          ].map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[
                estilosComuns.chip,
                filtroEstado === f.id && estilosComuns.chipAtivo,
                { marginRight: 6 },
              ]}
              onPress={() => setFiltroEstado(f.id)}
            >
              <Text
                style={[
                  estilosComuns.chipTexto,
                  filtroEstado === f.id && estilosComuns.chipTextoAtivo,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {maquinasNosOrcamentos.length > 0 && (
          <>
            <Text style={styles.rotuloFiltro}>Máquina:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                style={[
                  estilosComuns.chip,
                  filtroMaquina === 'todas' && estilosComuns.chipAtivo,
                  { marginRight: 6 },
                ]}
                onPress={() => setFiltroMaquina('todas')}
              >
                <Text
                  style={[
                    estilosComuns.chipTexto,
                    filtroMaquina === 'todas' && estilosComuns.chipTextoAtivo,
                  ]}
                >
                  Todas
                </Text>
              </TouchableOpacity>
              {maquinasNosOrcamentos.map((maq) => (
                <TouchableOpacity
                  key={maq}
                  style={[
                    estilosComuns.chip,
                    filtroMaquina === maq && estilosComuns.chipAtivo,
                    { marginRight: 6 },
                  ]}
                  onPress={() => setFiltroMaquina(maq)}
                >
                  <Text
                    style={[
                      estilosComuns.chipTexto,
                      filtroMaquina === maq && estilosComuns.chipTextoAtivo,
                    ]}
                  >
                    {maq}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        <Text style={styles.rotuloFiltro}>Ordenação:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { id: 'recentes', label: '↓ Mais recentes' },
            { id: 'antigas', label: '↑ Mais antigas' },
            { id: 'empresa', label: 'A–Z Empresa' },
            { id: 'horas', label: 'Maior horas' },
          ].map((ord) => (
            <TouchableOpacity
              key={ord.id}
              style={[
                estilosComuns.chip,
                ordenacao === ord.id && estilosComuns.chipAtivo,
                { marginRight: 6 },
              ]}
              onPress={() => setOrdenacao(ord.id as typeof ordenacao)}
            >
              <Text
                style={[
                  estilosComuns.chipTexto,
                  ordenacao === ord.id && estilosComuns.chipTextoAtivo,
                ]}
              >
                {ord.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {orcamentosVisiveis.map((orc) => {
        const decidindo = decisaoAbertaId === orc.versao_id;
        return (
          <View key={orc.versao_id} style={estilosComuns.card}>
            <View style={estilosComuns.linhaEntre}>
              <Text style={estilosComuns.badge}>
                #{orc.solicitacao_codigo} • V{orc.numero}
              </Text>
              <Text style={styles.tagEstado}>{orc.estado}</Text>
            </View>
            <Text style={styles.cardTituloItem}>
              {orc.empresa_nome} — {orc.descricao}
            </Text>
            <Text style={styles.cardDetalhe}>
              {orc.equipamento_nome} • {orc.horas}h • Entrega: {orc.entrega_estimada ?? 'A definir'}
            </Text>
            {exibeCustos && orc.preco_final != null ? (
              <Text style={styles.precoDestaque}>
                {formatarDinheiro(Number(orc.preco_final))} (Custo:{' '}
                {formatarDinheiro(Number(orc.custo_congelado ?? 0))})
              </Text>
            ) : (
              <Text style={styles.avisoRestrito}>Valores comerciais restritos</Text>
            )}
            {orc.recusa_motivo ? (
              <Text style={styles.alertaTexto}>⚠️ Motivo: {orc.recusa_motivo}</Text>
            ) : null}

            {/* Ações reais do workflow por estado e permissão */}
            <View style={[estilosComuns.linha, { marginTop: 10, flexWrap: 'wrap' }]}>
              {(orc.estado === 'rascunho' || orc.estado === 'devolvida') && (
                <>
                  <TouchableOpacity
                    style={estilosComuns.botaoSecundario}
                    onPress={async () => {
                      const dados = await aoCarregarParaEdicao(orc.versao_id);
                      if (!dados) return;
                      aoSelecionarSolicitacao(null);
                      setVersaoEmEdicao(orc.versao_id);
                      setServicoId(dados.servicoId);
                      setEquipamentoId(dados.equipamentoId);
                      setDescricao(dados.descricao);
                      setQuantidade(dados.quantidade);
                      setHoras(dados.horas);
                      setCustosExtras(dados.custosExtras);
                      setMargem(dados.percentualLucro);
                      setDestinatario(dados.destinatario);
                      setPrazoPagto(String(dados.prazoPagamentoDias));
                      setJustificativa(orc.justificativa_estimativa ?? '');
                      setFormAberto(true);
                    }}
                  >
                    <Text style={estilosComuns.textoBotaoSecundario}>Corrigir / Revisar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={estilosComuns.botaoPrimario}
                    onPress={() => void aoAlterarEstado(orc.versao_id, 'enviar')}
                  >
                    <Text style={estilosComuns.textoBotaoPrimario}>
                      {orc.estado === 'devolvida' ? 'Reenviar p/ Validação' : 'Enviar p/ Validação'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {orc.estado === 'em_validacao' && podeAprovar && (
                <TouchableOpacity
                  style={estilosComuns.botaoPrimario}
                  onPress={() => void aoAlterarEstado(orc.versao_id, 'aprovar')}
                >
                  <Text style={estilosComuns.textoBotaoPrimario}>Aprovar</Text>
                </TouchableOpacity>
              )}

              {orc.estado === 'em_validacao' && podeDecidir && (
                <TouchableOpacity
                  style={estilosComuns.botaoSecundario}
                  onPress={() => {
                    setDecisaoTipo('devolver');
                    setDecisaoAbertaId((id) => (id === orc.versao_id ? '' : orc.versao_id));
                  }}
                >
                  <Text style={estilosComuns.textoBotaoSecundario}>Devolver / Rejeitar</Text>
                </TouchableOpacity>
              )}

              {orc.estado === 'aprovada' && podePublicar && (
                <TouchableOpacity
                  style={estilosComuns.botaoPrimario}
                  onPress={() => void aoPublicarComPdf(orc)}
                >
                  <Text style={estilosComuns.textoBotaoPrimario}>Gerar PDF e Publicar</Text>
                </TouchableOpacity>
              )}

              {orc.estado === 'aceita' && podePublicar && (
                <TouchableOpacity
                  style={estilosComuns.botaoPrimario}
                  onPress={() => void aoConfirmarInicioTrabalho(orc.versao_id)}
                >
                  <Text style={estilosComuns.textoBotaoPrimario}>Confirmar Início do Trabalho</Text>
                </TouchableOpacity>
              )}
            </View>

            {decidindo && (
              <View style={styles.boxDecisao}>
                <View style={[estilosComuns.linha, { marginBottom: 6 }]}>
                  {(['devolver', 'rejeitar'] as const).map((tp) => (
                    <TouchableOpacity
                      key={tp}
                      style={[estilosComuns.chip, decisaoTipo === tp && estilosComuns.chipAtivo, { marginRight: 6 }]}
                      onPress={() => setDecisaoTipo(tp)}
                    >
                      <Text style={[estilosComuns.chipTexto, decisaoTipo === tp && estilosComuns.chipTextoAtivo]}>
                        {tp === 'devolver' ? 'Devolver' : 'Rejeitar'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={estilosComuns.input}
                  value={justificativaDecisao}
                  onChangeText={setJustificativaDecisao}
                  placeholder="Justificativa (mín. 5 caracteres)..."
                />
                <TouchableOpacity
                  style={[estilosComuns.botaoPrimario, { marginTop: 8 }]}
                  onPress={async () => {
                    await aoDecidirOrcamento(orc.versao_id, decisaoTipo, justificativaDecisao);
                    setDecisaoAbertaId('');
                    setJustificativaDecisao('');
                  }}
                >
                  <Text style={estilosComuns.textoBotaoPrimario}>Confirmar Decisão</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  gradeKpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  cardKpi: {
    width: '48%',
    backgroundColor: CORES.branco,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: CORES.borda,
  },
  kpiValor: { fontSize: 18, fontWeight: '900', color: CORES.azulEscuro },
  kpiRotulo: { fontSize: 11, fontWeight: '700', color: CORES.textoSecundario, marginTop: 2 },
  rotuloFiltro: { fontSize: 11, fontWeight: '800', color: CORES.textoSecundario, marginTop: 8, marginBottom: 4 },
  linkLimpar: { fontSize: 12, fontWeight: '800', color: CORES.vermelho },
  linkExpandir: { fontSize: 12, fontWeight: '800', color: CORES.azulPrincipal },
  tagEstado: {
    fontSize: 10.5,
    fontWeight: '800',
    color: CORES.azulPrincipal,
    backgroundColor: CORES.fundoClaro,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  cardTituloItem: { fontSize: 14, fontWeight: '800', color: CORES.azulEscuro, marginTop: 6 },
  cardDetalhe: { fontSize: 12, color: CORES.textoSecundario, marginTop: 2 },
  precoDestaque: { fontSize: 13.5, fontWeight: '900', color: CORES.verde, marginTop: 4 },
  avisoRestrito: { fontSize: 11.5, color: CORES.textoSuave, fontStyle: 'italic', marginTop: 4 },
  alertaTexto: { fontSize: 12, color: CORES.vermelho, fontWeight: '700', marginTop: 4 },
  caixaResultado: {
    marginTop: 8,
    backgroundColor: '#F0F9FF',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  precoFinal: { fontSize: 14, fontWeight: '900', color: CORES.azulEscuro },
  boxDecisao: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: CORES.borda },
  textoVazio: { fontSize: 12.5, color: CORES.textoSuave, fontStyle: 'italic' },
});
