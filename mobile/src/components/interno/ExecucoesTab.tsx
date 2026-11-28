import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { correspondeBusca, formatosDataParaBusca } from '@lib/busca-e-filtros';
import { MOTIVOS_RETRABALHO } from '@lib/campos-padronizados';
import { ETAPAS_INSTRUCOES_POR_SERVICO, type ContextoOperacionalLaboratorio } from '@lib/chatbot-metrologia';
import type { PerfilInterno } from '@lib/contratos';
import {
  calcularProgressoExecucao,
  podeAtribuirResponsavel,
  podeDecidirFechamento,
} from '@lib/execucoes-persistentes';
import { CORES, estilosComuns } from '../../theme';
import { SliderProgressoEtapa } from './SliderProgressoEtapa';

export type ResponsavelDb = { usuario_id: string; nome: string; perfil_interno: string };

export function ExecucoesTab({
  contexto,
  perfil,
  responsaveis,
  filtroInicial = 'todos',
  aoDefinirProgressoEtapa,
  aoRetornarEtapa,
  aoAtribuirResponsavel,
  aoRegistrarFechamento,
  aoDecidirFechamento,
}: {
  contexto: ContextoOperacionalLaboratorio;
  perfil: PerfilInterno;
  responsaveis: ResponsavelDb[];
  filtroInicial?: 'todos' | 'retrabalho';
  aoDefinirProgressoEtapa: (execucaoId: string, ordemEtapa: number, percentual: number) => Promise<void>;
  aoRetornarEtapa: (execucaoId: string, etapaId: string, motivo: string) => Promise<boolean>;
  aoAtribuirResponsavel: (execucaoId: string, responsavelId: string) => Promise<void>;
  aoRegistrarFechamento: (payload: {
    execucaoId: string;
    equipamentosHoras: Array<{ equipamento_id: string; horas: string }>;
    custosExtras: string;
    retrabalho: boolean;
    mudancaEscopo: boolean;
    causa: string;
    observacoes: string;
    aprendizado: string;
  }) => Promise<boolean>;
  aoDecidirFechamento: (execucaoId: string, decisao: 'aprovar' | 'devolver', justificativa: string) => Promise<void>;
}) {
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<'todos' | 'em_execucao' | 'fechamento_pendente' | 'concluido' | 'retrabalho'>(
    filtroInicial === 'retrabalho' ? 'retrabalho' : 'todos',
  );
  const [filtroTecnico, setFiltroTecnico] = useState('todos');
  const [ordenacao, setOrdenacao] = useState<'recentes' | 'antigas' | 'empresa' | 'progresso' | 'menor_progresso'>('recentes');
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});
  const [retornoAberto, setRetornoAberto] = useState<string>('');
  const [motivoRetorno, setMotivoRetorno] = useState('');
  const [fechamentoAbertoId, setFechamentoAbertoId] = useState('');
  const [horasReais, setHorasReais] = useState<Record<string, string>>({});
  const [custosExtras, setCustosExtras] = useState('0');
  const [retrabalho, setRetrabalho] = useState(false);
  const [mudancaEscopo, setMudancaEscopo] = useState(false);
  const [causa, setCausa] = useState<string>(MOTIVOS_RETRABALHO[0]);
  const [observacoes, setObservacoes] = useState('');
  const [aprendizado, setAprendizado] = useState('');
  const [justificativaFechamento, setJustificativaFechamento] = useState('');

  const podeAtribuir = podeAtribuirResponsavel(perfil);
  const podeValidarFechamento = podeDecidirFechamento(perfil);

  const tecnicosPresentes = useMemo(
    () => Array.from(new Set(contexto.execucoes.map((e) => e.responsavel_nome).filter(Boolean))),
    [contexto.execucoes],
  );

  const execucoesVisiveis = useMemo(() => {
    return contexto.execucoes
      .filter((exec) => {
        if (filtro === 'retrabalho' && !exec.retrabalho) return false;
        if (filtro === 'em_execucao' && exec.estado !== 'em_execucao') return false;
        if (filtro === 'fechamento_pendente' && exec.fechamento_estado !== 'em_validacao') return false;
        if (filtro === 'concluido' && exec.estado !== 'concluido') return false;
        if (filtroTecnico !== 'todos' && exec.responsavel_nome !== filtroTecnico) return false;
        const nomesEtapas = exec.etapas.map((et) => `${et.titulo} ${et.estado}`).join(' ');
        const nomesMaquinas = exec.equipamentos.map((eq) => eq.nome).join(' ');
        return correspondeBusca(
          busca,
          exec.solicitacao_codigo,
          `DEM-SOL-${String(exec.solicitacao_codigo).padStart(4, '0')}`,
          exec.empresa_nome,
          exec.descricao,
          exec.responsavel_nome,
          exec.servico_slug,
          exec.estado,
          nomesEtapas,
          nomesMaquinas,
          formatosDataParaBusca(exec.criada_em),
        );
      })
      .sort((a, b) => {
        if (ordenacao === 'antigas') return +new Date(a.criada_em) - +new Date(b.criada_em);
        if (ordenacao === 'empresa') return a.empresa_nome.localeCompare(b.empresa_nome, 'pt-BR');
        if (ordenacao === 'progresso') {
          return calcularProgressoExecucao(b.etapas) - calcularProgressoExecucao(a.etapas);
        }
        if (ordenacao === 'menor_progresso') {
          return calcularProgressoExecucao(a.etapas) - calcularProgressoExecucao(b.etapas);
        }
        return +new Date(b.criada_em) - +new Date(a.criada_em);
      });
  }, [busca, contexto.execucoes, filtro, filtroTecnico, ordenacao]);

  return (
    <View>
      {/* KPIs clicáveis na aba Execuções */}
      <View style={styles.gradeKpis}>
        {[
          {
            rotulo: 'Em execução',
            valor: contexto.execucoes.filter((e) => e.estado === 'em_execucao').length,
            id: 'em_execucao' as const,
          },
          {
            rotulo: 'Fech. pendente',
            valor: contexto.execucoes.filter((e) => e.fechamento_estado === 'em_validacao').length,
            id: 'fechamento_pendente' as const,
          },
          {
            rotulo: 'Concluídas',
            valor: contexto.execucoes.filter((e) => e.estado === 'concluido').length,
            id: 'concluido' as const,
          },
          {
            rotulo: 'Com retrabalho',
            valor: contexto.execucoes.filter((e) => Boolean(e.retrabalho)).length,
            id: 'retrabalho' as const,
          },
        ].map((k) => (
          <TouchableOpacity
            key={k.rotulo}
            style={[
              styles.cardKpi,
              filtro === k.id && { borderColor: CORES.azulPrincipal, borderWidth: 2 },
            ]}
            onPress={() => setFiltro((atual) => (atual === k.id ? 'todos' : k.id))}
          >
            <Text style={styles.kpiValor}>{k.valor}</Text>
            <Text style={styles.kpiRotulo}>{k.rotulo}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={estilosComuns.card}>
        <View style={estilosComuns.linhaEntre}>
          <Text style={estilosComuns.tituloSecao}>
            Execuções ({execucoesVisiveis.length}/{contexto.execucoes.length})
          </Text>
          {(busca || filtro !== 'todos' || filtroTecnico !== 'todos') && (
            <TouchableOpacity
              onPress={() => {
                setBusca('');
                setFiltro('todos');
                setFiltroTecnico('todos');
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
          placeholder="Buscar protocolo, empresa, etapa, técnico ou data..."
          placeholderTextColor={CORES.textoSuave}
        />
        <Text style={styles.rotuloFiltro}>Estado:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { id: 'todos', label: 'Todas' },
            { id: 'em_execucao', label: 'Em execução' },
            { id: 'fechamento_pendente', label: 'Fech. pendente' },
            { id: 'concluido', label: 'Concluídas' },
            { id: 'retrabalho', label: 'Retrabalho' },
          ].map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[
                estilosComuns.chip,
                filtro === f.id && estilosComuns.chipAtivo,
                { marginRight: 6 },
              ]}
              onPress={() => setFiltro(f.id as typeof filtro)}
            >
              <Text
                style={[
                  estilosComuns.chipTexto,
                  filtro === f.id && estilosComuns.chipTextoAtivo,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {tecnicosPresentes.length > 0 && (
          <>
            <Text style={styles.rotuloFiltro}>Responsável:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                style={[
                  estilosComuns.chip,
                  filtroTecnico === 'todos' && estilosComuns.chipAtivo,
                  { marginRight: 6 },
                ]}
                onPress={() => setFiltroTecnico('todos')}
              >
                <Text
                  style={[
                    estilosComuns.chipTexto,
                    filtroTecnico === 'todos' && estilosComuns.chipTextoAtivo,
                  ]}
                >
                  Todos
                </Text>
              </TouchableOpacity>
              {tecnicosPresentes.map((tec) => (
                <TouchableOpacity
                  key={tec}
                  style={[
                    estilosComuns.chip,
                    filtroTecnico === tec && estilosComuns.chipAtivo,
                    { marginRight: 6 },
                  ]}
                  onPress={() => setFiltroTecnico(tec)}
                >
                  <Text
                    style={[
                      estilosComuns.chipTexto,
                      filtroTecnico === tec && estilosComuns.chipTextoAtivo,
                    ]}
                  >
                    {tec}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        <Text style={styles.rotuloFiltro}>Ordenação:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { id: 'recentes', label: '↓ Mais novas' },
            { id: 'antigas', label: '↑ Mais antigas' },
            { id: 'empresa', label: 'A–Z Empresa' },
            { id: 'progresso', label: 'Maior %' },
            { id: 'menor_progresso', label: 'Menor %' },
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

      {execucoesVisiveis.map((exec) => {
        const percentual = calcularProgressoExecucao(exec.etapas);
        const todasConcluidas = exec.etapas.every((et) => et.estado === 'concluida');
        const instrucoes = ETAPAS_INSTRUCOES_POR_SERVICO[exec.servico_slug] ?? [];
        const nomesMaquinas = exec.equipamentos.map((e) => e.nome).join(', ') || 'Equipamento ZEISS';
        const detalhesAbertos = Boolean(expandidos[exec.execucao_id]);

        return (
          <View key={exec.execucao_id} style={estilosComuns.card}>
            <View style={estilosComuns.linhaEntre}>
              <Text style={estilosComuns.badge}>#{exec.solicitacao_codigo}</Text>
              <Text style={styles.tagEstado}>
                {exec.estado} • {percentual}%
              </Text>
            </View>
            <Text style={styles.cardTituloItem}>
              {exec.empresa_nome} — {exec.descricao}
            </Text>
            <Text style={styles.cardDetalhe}>
              {nomesMaquinas} • Resp: {exec.responsavel_nome}
            </Text>

            <TouchableOpacity
              style={{ marginVertical: 6 }}
              onPress={() => setExpandidos((a) => ({ ...a, [exec.execucao_id]: !a[exec.execucao_id] }))}
            >
              <Text style={styles.linkExpandir}>
                {detalhesAbertos ? '▾ Ocultar responsável / instruções' : '▸ Responsável e instruções'}
              </Text>
            </TouchableOpacity>

            {detalhesAbertos && (
              <View style={{ marginBottom: 8 }}>
                {podeAtribuir && responsaveis.length > 0 && (
                  <View style={{ marginBottom: 8 }}>
                    <Text style={estilosComuns.rotuloCampo}>Atribuir técnico responsável:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {responsaveis.map((r) => (
                        <TouchableOpacity
                          key={r.usuario_id}
                          style={[
                            estilosComuns.chip,
                            exec.responsavel_nome === r.nome && estilosComuns.chipAtivo,
                            { marginRight: 6 },
                          ]}
                          onPress={() => void aoAtribuirResponsavel(exec.execucao_id, r.usuario_id)}
                        >
                          <Text
                            style={[
                              estilosComuns.chipTexto,
                              exec.responsavel_nome === r.nome && estilosComuns.chipTextoAtivo,
                            ]}
                          >
                            {r.nome} ({r.perfil_interno})
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {instrucoes.length > 0 && (
                  <View style={styles.caixaInstrucoes}>
                    {instrucoes.map((inst, idx) => (
                      <Text key={inst} style={styles.instrucaoItem}>
                        {idx + 1}. {inst}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Etapas Sequenciais com % (Colapsável) */}
            <TouchableOpacity
              style={{ marginVertical: 4 }}
              onPress={() =>
                setExpandidos((a) => ({
                  ...a,
                  [`etapas-${exec.execucao_id}`]: !a[`etapas-${exec.execucao_id}`],
                }))
              }
            >
              <Text style={styles.linkExpandir}>
                {expandidos[`etapas-${exec.execucao_id}`]
                  ? '▾ Ocultar etapas'
                  : `▸ Etapas (${exec.etapas.filter((et) => et.estado === 'concluida').length}/${exec.etapas.length} concluídas)`}
              </Text>
            </TouchableOpacity>
            {expandidos[`etapas-${exec.execucao_id}`] ? (
              <View style={{ marginTop: 4 }}>
                {exec.etapas.map((etapa) => {
                  const execucaoEncerrada =
                    exec.estado === 'concluido' ||
                    exec.fechamento_estado === 'em_validacao' ||
                    exec.fechamento_estado === 'aprovado';
                  const anteriorPendente = exec.etapas.some(
                    (et) => et.ordem < etapa.ordem && et.estado !== 'concluida',
                  );
                  const posteriorIniciada = exec.etapas.some(
                    (et) => et.ordem > etapa.ordem && et.estado !== 'a_fazer',
                  );
                  const etapaBloqueada =
                    execucaoEncerrada ||
                    anteriorPendente ||
                    (etapa.estado === 'concluida' && posteriorIniciada);
                  return (
                    <View key={etapa.ordem} style={styles.etapaLinha}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={styles.etapaNome}>
                          {etapa.estado === 'concluida' ? '✅' : etapa.estado === 'em_andamento' ? '🔵' : '⚪'}{' '}
                          {etapa.ordem}. {etapa.titulo} ({etapa.progresso}%)
                        </Text>
                        {!execucaoEncerrada && etapa.id && etapa.estado !== 'a_fazer' ? (
                          <TouchableOpacity
                            onPress={() =>
                              setRetornoAberto((r) => (r === `${exec.execucao_id}:${etapa.id}` ? '' : `${exec.execucao_id}:${etapa.id}`))
                            }
                          >
                            <Text style={styles.linkRetorno}>↺ Retornar</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>

                      <SliderProgressoEtapa
                        valor={etapa.progresso}
                        bloqueado={etapaBloqueada}
                        aoConfirmar={(novoPct) =>
                          void aoDefinirProgressoEtapa(exec.execucao_id, etapa.ordem, novoPct)
                        }
                      />

                  {retornoAberto === `${exec.execucao_id}:${etapa.id}` && etapa.id ? (
                    <View style={{ marginTop: 8 }}>
                      <TextInput
                        style={estilosComuns.input}
                        value={motivoRetorno}
                        onChangeText={setMotivoRetorno}
                        placeholder="Motivo do retorno/retrabalho (mín. 10 caracteres)..."
                      />
                      <TouchableOpacity
                        style={[estilosComuns.botaoPrimario, { marginTop: 6 }]}
                        onPress={async () => {
                          const ok = await aoRetornarEtapa(exec.execucao_id, etapa.id!, motivoRetorno);
                          if (ok) {
                            setRetornoAberto('');
                            setMotivoRetorno('');
                          }
                        }}
                      >
                        <Text style={estilosComuns.textoBotaoPrimario}>Confirmar Retorno</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              );
            })}
              </View>
            ) : null}

            {/* Fechamento técnico quando todas etapas = 100% */}
            {todasConcluidas && exec.estado !== 'concluido' && exec.fechamento_estado !== 'em_validacao' && (
              <View style={{ marginTop: 10 }}>
                <TouchableOpacity
                  style={estilosComuns.botaoPrimario}
                  onPress={() =>
                    setFechamentoAbertoId((id) => (id === exec.execucao_id ? '' : exec.execucao_id))
                  }
                >
                  <Text style={estilosComuns.textoBotaoPrimario}>
                    {fechamentoAbertoId === exec.execucao_id ? 'Fechar Formulário' : 'Enviar Fechamento Técnico'}
                  </Text>
                </TouchableOpacity>

                {fechamentoAbertoId === exec.execucao_id && (
                  <View style={styles.boxFechamento}>
                    {exec.equipamentos.map((eq) => (
                      <View key={eq.equipamento_id} style={{ marginBottom: 6 }}>
                        <Text style={estilosComuns.rotuloCampo}>Horas reais ({eq.nome})</Text>
                        <TextInput
                          style={estilosComuns.input}
                          keyboardType="numeric"
                          value={horasReais[eq.equipamento_id] ?? String(eq.horas_estimadas ?? 8)}
                          onChangeText={(txt) =>
                            setHorasReais((a) => ({ ...a, [eq.equipamento_id]: txt }))
                          }
                        />
                      </View>
                    ))}
                    <Text style={estilosComuns.rotuloCampo}>Custos extras reais (R$)</Text>
                    <TextInput
                      style={estilosComuns.input}
                      keyboardType="numeric"
                      value={custosExtras}
                      onChangeText={setCustosExtras}
                    />
                    <View style={[estilosComuns.linha, { marginVertical: 8 }]}>
                      <TouchableOpacity
                        style={[estilosComuns.chip, retrabalho && estilosComuns.chipAtivo, { marginRight: 6 }]}
                        onPress={() => setRetrabalho((v) => !v)}
                      >
                        <Text style={[estilosComuns.chipTexto, retrabalho && estilosComuns.chipTextoAtivo]}>
                          {retrabalho ? '✓ Houve retrabalho' : 'Sem retrabalho'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[estilosComuns.chip, mudancaEscopo && estilosComuns.chipAtivo]}
                        onPress={() => setMudancaEscopo((v) => !v)}
                      >
                        <Text style={[estilosComuns.chipTexto, mudancaEscopo && estilosComuns.chipTextoAtivo]}>
                          {mudancaEscopo ? '✓ Mudou escopo' : 'Escopo mantido'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {(retrabalho || mudancaEscopo) && (
                      <TextInput
                        style={[estilosComuns.input, { marginBottom: 6 }]}
                        value={causa}
                        onChangeText={setCausa}
                        placeholder="Causa principal..."
                      />
                    )}
                    <TextInput
                      style={[estilosComuns.input, { minHeight: 54 }]}
                      multiline
                      value={observacoes}
                      onChangeText={setObservacoes}
                      placeholder="Observações técnicas do fechamento (obrigatório)..."
                    />
                    <TextInput
                      style={[estilosComuns.input, { marginTop: 6 }]}
                      value={aprendizado}
                      onChangeText={setAprendizado}
                      placeholder="Lição aprendida (opcional)..."
                    />
                    <TouchableOpacity
                      style={[estilosComuns.botaoPrimario, { marginTop: 8 }]}
                      onPress={async () => {
                        const ok = await aoRegistrarFechamento({
                          execucaoId: exec.execucao_id,
                          equipamentosHoras: exec.equipamentos.map((eq) => ({
                            equipamento_id: eq.equipamento_id,
                            horas: horasReais[eq.equipamento_id] ?? String(eq.horas_estimadas ?? 8),
                          })),
                          custosExtras,
                          retrabalho,
                          mudancaEscopo,
                          causa,
                          observacoes,
                          aprendizado,
                        });
                        if (ok) setFechamentoAbertoId('');
                      }}
                    >
                      <Text style={estilosComuns.textoBotaoPrimario}>Confirmar Fechamento</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* Aprovar / Devolver Fechamento (Validador / Adm) */}
            {exec.fechamento_estado === 'em_validacao' && podeValidarFechamento && (
              <View style={styles.boxFechamento}>
                <Text style={estilosComuns.rotuloCampo}>Fechamento aguardando validação</Text>
                <TextInput
                  style={[estilosComuns.input, { marginTop: 6 }]}
                  value={justificativaFechamento}
                  onChangeText={setJustificativaFechamento}
                  placeholder="Justificativa (se for devolver)..."
                />
                <View style={[estilosComuns.linha, { marginTop: 8 }]}>
                  <TouchableOpacity
                    style={estilosComuns.botaoPrimario}
                    onPress={() => void aoDecidirFechamento(exec.execucao_id, 'aprovar', '')}
                  >
                    <Text style={estilosComuns.textoBotaoPrimario}>Aprovar Fechamento</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={estilosComuns.botaoSecundario}
                    onPress={() =>
                      void aoDecidirFechamento(exec.execucao_id, 'devolver', justificativaFechamento)
                    }
                  >
                    <Text style={estilosComuns.textoBotaoSecundario}>Devolver</Text>
                  </TouchableOpacity>
                </View>
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
  linkExpandir: { fontSize: 12, fontWeight: '800', color: CORES.azulPrincipal },
  linkRetorno: { fontSize: 11.5, fontWeight: '800', color: CORES.vermelho },
  caixaInstrucoes: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: CORES.borda,
  },
  instrucaoItem: { fontSize: 11.5, color: CORES.textoPrincipal, marginBottom: 2 },
  subtituloBloco: { fontSize: 12, fontWeight: '800', color: CORES.azulEscuro, marginTop: 6, marginBottom: 4 },
  etapaLinha: {
    backgroundColor: CORES.fundoClaro,
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
  },
  etapaNome: { fontSize: 12.5, fontWeight: '800', color: CORES.azulEscuro, flex: 1 },
  boxFechamento: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: CORES.borda,
  },
});
