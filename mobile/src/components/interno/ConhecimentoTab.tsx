import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { formatarDinheiro } from '@lib/calculos';
import { correspondeBusca } from '@lib/busca-e-filtros';
import type { ContextoOperacionalLaboratorio } from '@lib/chatbot-metrologia';
import {
  formatarDesvio,
  formatarHoras,
  podeFormalizarLicao,
} from '@lib/conhecimento-persistente';
import type { PerfilInterno } from '@lib/contratos';
import { podeConsultarCustos } from '@lib/custos-equipamento';
import { servicosOficiais } from '@lib/servicos';
import { CORES, estilosComuns } from '../../theme';
import type { ServicoCatalogoDb } from './OrcamentosTab';

function MiniPizzaConhecimento({
  titulo,
  centroValor,
  centroRotulo,
  fatias,
}: {
  titulo: string;
  centroValor: string;
  centroRotulo: string;
  fatias: Array<{ rotulo: string; valor: number; cor: string; aoTocar: () => void }>;
}) {
  const total = fatias.reduce((acc, f) => acc + f.valor, 0);
  const raio = 36;
  const circ = 2 * Math.PI * raio;
  let acumulado = 0;

  return (
    <View style={estilosComuns.card}>
      <Text style={estilosComuns.tituloSecao}>{titulo}</Text>
      <View style={styles.linhaPizza}>
        {typeof document !== 'undefined' ? (
          <View style={styles.svgContainer}>
            {React.createElement(
              'svg',
              { width: 108, height: 108, viewBox: '0 0 100 100' },
              React.createElement('circle', {
                cx: 50,
                cy: 50,
                r: raio,
                fill: 'transparent',
                stroke: '#E2E8F0',
                strokeWidth: 15,
              }),
              ...(total > 0
                ? fatias
                    .filter((f) => f.valor > 0)
                    .map((f) => {
                      const frac = f.valor / total;
                      const dash = frac * circ;
                      const offset = -acumulado * circ;
                      acumulado += frac;
                      return React.createElement('circle', {
                        key: f.rotulo,
                        cx: 50,
                        cy: 50,
                        r: raio,
                        fill: 'transparent',
                        stroke: f.cor,
                        strokeWidth: 15,
                        strokeDasharray: `${dash} ${circ}`,
                        strokeDashoffset: offset,
                        transform: 'rotate(-90 50 50)',
                      });
                    })
                : []),
            )}
            <View style={styles.centroPizza}>
              <Text style={styles.centroValor}>{centroValor}</Text>
              <Text style={styles.centroRotulo}>{centroRotulo}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.anelNativo}>
            <Text style={styles.centroValor}>{centroValor}</Text>
            <Text style={styles.centroRotulo}>{centroRotulo}</Text>
          </View>
        )}
        <View style={{ flex: 1, gap: 6 }}>
          {fatias.map((f) => {
            const pct = total > 0 ? Math.round((f.valor / total) * 100) : 0;
            return (
              <TouchableOpacity key={f.rotulo} style={styles.itemLegenda} onPress={f.aoTocar}>
                <View style={[styles.pontoCor, { backgroundColor: f.cor }]} />
                <Text style={styles.legendaTexto} numberOfLines={1}>
                  {f.rotulo}
                </Text>
                <Text style={styles.legendaValor}>
                  {f.valor} ({pct}%)
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export function ConhecimentoTab({
  contexto,
  perfil,
  servicosDb,
  aoCriarLicao,
  aoFormalizarLicao,
  aoConsultarRecomendacao,
}: {
  contexto: ContextoOperacionalLaboratorio;
  perfil: PerfilInterno;
  servicosDb: ServicoCatalogoDb[];
  aoCriarLicao: (execucaoId: string, resumo: string, assuntos: string[]) => Promise<boolean>;
  aoFormalizarLicao: (licaoId: string) => Promise<void>;
  aoConsultarRecomendacao: (servicoId: string, quantidade: number) => Promise<string>;
}) {
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<'todos' | 'sem_licao' | 'em_validacao' | 'formalizada' | 'assertivo'>('todos');
  const [ordenacao, setOrdenacao] = useState<'recentes' | 'antigas' | 'empresa' | 'desvio'>('recentes');
  const [resumos, setResumos] = useState<Record<string, string>>({});
  const [assuntos, setAssuntos] = useState<Record<string, string>>({});

  // Recomendador Q1–Q3 (colapsável)
  const [simuladorAberto, setSimuladorAberto] = useState(false);
  const [servicoRecId, setServicoRecId] = useState(servicosDb[0]?.id ?? '');
  const [qtdRec, setQtdRec] = useState('10');
  const [resultadoRec, setResultadoRec] = useState('');

  const exibeCustos = podeConsultarCustos(perfil);
  const podeFormalizar = podeFormalizarLicao(perfil);

  const semLicao = contexto.indicadores.filter((i) => !i.licao_id).length;
  const emValidacao = contexto.indicadores.filter((i) => i.licao_estado === 'em_validacao').length;
  const formalizadas = contexto.indicadores.filter((i) => i.licao_estado === 'formalizada').length;
  const comparaveis = contexto.indicadores.filter((i) => i.esforco_assertivo !== null);
  const assertivos = comparaveis.filter((i) => i.esforco_assertivo).length;
  const comDesvio = comparaveis.length - assertivos;
  const assertividadePct =
    comparaveis.length > 0 ? Math.round((assertivos / comparaveis.length) * 100) : 0;

  // Top assuntos mais recorrentes nas lições
  const topAssuntos = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const ind of contexto.indicadores) {
      for (const a of ind.licao_assuntos ?? []) {
        const tag = a.trim();
        if (tag) mapa.set(tag, (mapa.get(tag) ?? 0) + 1);
      }
    }
    return Array.from(mapa.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [contexto.indicadores]);
  const maxAssunto = Math.max(1, ...topAssuntos.map(([, v]) => v));

  const comparativoHoras = contexto.indicadores.slice(0, 5);
  const maxHoras = Math.max(
    1,
    ...comparativoHoras.flatMap((i) => [
      Number(i.horas_estimadas ?? 0),
      Number(i.horas_realizadas ?? 0),
    ]),
  );

  const indicadoresVisiveis = useMemo(() => {
    return contexto.indicadores
      .filter((ind) => {
        if (filtro === 'sem_licao' && ind.licao_id) return false;
        if (filtro === 'em_validacao' && ind.licao_estado !== 'em_validacao') return false;
        if (filtro === 'formalizada' && ind.licao_estado !== 'formalizada') return false;
        if (filtro === 'assertivo' && !ind.esforco_assertivo) return false;
        return correspondeBusca(
          busca,
          ind.solicitacao_codigo,
          `DEM-SOL-${String(ind.solicitacao_codigo).padStart(4, '0')}`,
          ind.empresa_nome,
          ind.servico_slug,
          ind.licao_resumo,
          ind.licao_assuntos.join(' '),
        );
      })
      .sort((a, b) => {
        if (ordenacao === 'antigas') return Number(a.solicitacao_codigo) - Number(b.solicitacao_codigo);
        if (ordenacao === 'empresa') return a.empresa_nome.localeCompare(b.empresa_nome, 'pt-BR');
        if (ordenacao === 'desvio') {
          return Math.abs(Number(b.desvio_esforco ?? 0)) - Math.abs(Number(a.desvio_esforco ?? 0));
        }
        return Number(b.solicitacao_codigo) - Number(a.solicitacao_codigo);
      });
  }, [busca, contexto.indicadores, filtro, ordenacao]);

  return (
    <View>
      {/* KPIs clicáveis */}
      <View style={styles.gradeKpis}>
        {[
          { rotulo: 'Sem lição', valor: semLicao, id: 'sem_licao' as const },
          { rotulo: 'Em validação', valor: emValidacao, id: 'em_validacao' as const },
          { rotulo: 'Formalizadas', valor: formalizadas, id: 'formalizada' as const },
          { rotulo: 'Assertivos', valor: assertivos, id: 'assertivo' as const },
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

      {/* Painéis Visuais BI de Lições e Assertividade */}
      <MiniPizzaConhecimento
        titulo="Assertividade das Estimativas (Q1–Q3)"
        centroValor={`${assertividadePct}%`}
        centroRotulo="assertivo"
        fatias={[
          { rotulo: 'Dentro da faixa', valor: assertivos, cor: '#059669', aoTocar: () => setFiltro('assertivo') },
          { rotulo: 'Com desvio', valor: comDesvio, cor: '#DC2626', aoTocar: () => setFiltro('todos') },
        ]}
      />

      <MiniPizzaConhecimento
        titulo="Cobertura de Lições Aprendidas"
        centroValor={String(formalizadas)}
        centroRotulo="formaliz."
        fatias={[
          { rotulo: 'Formalizadas', valor: formalizadas, cor: '#0284C7', aoTocar: () => setFiltro('formalizada') },
          { rotulo: 'Em validação', valor: emValidacao, cor: '#7C3AED', aoTocar: () => setFiltro('em_validacao') },
          { rotulo: 'Sem lição', valor: semLicao, cor: '#F59E0B', aoTocar: () => setFiltro('sem_licao') },
        ]}
      />

      {/* Gráfico de Barras Duplas: Horas Estimadas vs Realizadas */}
      {comparativoHoras.length > 0 && (
        <View style={estilosComuns.card}>
          <Text style={estilosComuns.tituloSecao}>Esforço: Estimado × Realizado</Text>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 4, marginBottom: 8 }}>
            <Text style={styles.legendaMini}>🟦 Estimado</Text>
            <Text style={styles.legendaMini}>🟩 No prazo</Text>
            <Text style={styles.legendaMini}>🟥 Acima</Text>
          </View>
          <View style={styles.areaColunas}>
            {comparativoHoras.map((ind) => {
              const est = Number(ind.horas_estimadas ?? 0);
              const real = Number(ind.horas_realizadas ?? 0);
              const altEst = Math.max(8, Math.round((est / maxHoras) * 86));
              const altReal = Math.max(8, Math.round((real / maxHoras) * 86));
              const corReal = real > est ? '#DC2626' : '#059669';
              return (
                <View key={ind.execucao_id} style={styles.colunaItem}>
                  <Text style={styles.valorTopoColuna}>
                    {est}h/{real}h
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
                    <View style={[styles.barraDupla, { height: altEst, backgroundColor: '#0284C7' }]} />
                    <View style={[styles.barraDupla, { height: altReal, backgroundColor: corReal }]} />
                  </View>
                  <Text style={styles.rotuloBaseColuna} numberOfLines={1}>
                    #{ind.solicitacao_codigo}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Ranking de Temas / Causas mais recorrentes */}
      {topAssuntos.length > 0 && (
        <View style={estilosComuns.card}>
          <Text style={estilosComuns.tituloSecao}>Temas Mais Recorrentes</Text>
          <View style={{ marginTop: 8, gap: 8 }}>
            {topAssuntos.map(([tag, qtd], idx) => (
              <View key={tag}>
                <View style={estilosComuns.linhaEntre}>
                  <Text style={[styles.legendaTexto, { flex: 1 }]}>
                    {idx + 1}. {tag}
                  </Text>
                  <Text style={styles.legendaValor}>{qtd}</Text>
                </View>
                <View style={styles.trilhoBarra}>
                  <View
                    style={[
                      styles.preenchimentoBarra,
                      { width: `${Math.max(10, Math.round((qtd / maxAssunto) * 100))}%` },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Simulador de Recomendação Q1–Q3 (Colapsável) */}
      <View style={estilosComuns.card}>
        <TouchableOpacity
          style={estilosComuns.linhaEntre}
          onPress={() => setSimuladorAberto((a) => !a)}
        >
          <Text style={estilosComuns.tituloSecao}>Simulador Faixa Q1–Q3</Text>
          <Text style={{ fontSize: 12, fontWeight: '800', color: CORES.azulPrincipal }}>
            {simuladorAberto ? '▾ Fechar' : '▸ Abrir'}
          </Text>
        </TouchableOpacity>
        {simuladorAberto && (
          <View style={{ marginTop: 8 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
              {servicosDb.map((srv) => {
                const info = servicosOficiais.find((o) => o.slug === srv.slug);
                const ativo = (servicoRecId || servicosDb[0]?.id) === srv.id;
                return (
                  <TouchableOpacity
                    key={srv.id}
                    style={[estilosComuns.chip, ativo && estilosComuns.chipAtivo, { marginRight: 6 }]}
                    onPress={() => setServicoRecId(srv.id)}
                  >
                    <Text style={[estilosComuns.chipTexto, ativo && estilosComuns.chipTextoAtivo]}>
                      {info?.titulo ?? srv.slug}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={estilosComuns.linha}>
              <TextInput
                style={[estilosComuns.input, { flex: 1 }]}
                keyboardType="numeric"
                value={qtdRec}
                onChangeText={setQtdRec}
                placeholder="Qtd peças"
              />
              <TouchableOpacity
                style={estilosComuns.botaoPrimario}
                onPress={async () => {
                  const id = servicoRecId || servicosDb[0]?.id || '';
                  if (!id) return;
                  const msg = await aoConsultarRecomendacao(id, Number(qtdRec) || 1);
                  setResultadoRec(msg);
                }}
              >
                <Text style={estilosComuns.textoBotaoPrimario}>Recomendar</Text>
              </TouchableOpacity>
            </View>
            {resultadoRec ? <Text style={styles.resultadoRec}>{resultadoRec}</Text> : null}
          </View>
        )}
      </View>

      {/* Filtros dos indicadores */}
      <View style={estilosComuns.card}>
        <View style={estilosComuns.linhaEntre}>
          <Text style={estilosComuns.tituloSecao}>
            Lições ({indicadoresVisiveis.length}/{contexto.indicadores.length})
          </Text>
          {(busca || filtro !== 'todos') && (
            <TouchableOpacity
              onPress={() => {
                setBusca('');
                setFiltro('todos');
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
          placeholder="Buscar protocolo, empresa, serviço ou lição..."
          placeholderTextColor={CORES.textoSuave}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'sem_licao', label: 'Sem lição' },
            { id: 'em_validacao', label: 'Em validação' },
            { id: 'formalizada', label: 'Formalizada' },
            { id: 'assertivo', label: 'Assertivos' },
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
              <Text style={[estilosComuns.chipTexto, filtro === f.id && estilosComuns.chipTextoAtivo]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
          {[
            { id: 'recentes', label: '↓ Mais novos' },
            { id: 'antigas', label: '↑ Mais antigos' },
            { id: 'empresa', label: 'A–Z Empresa' },
            { id: 'desvio', label: 'Maior desvio' },
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
              <Text style={[estilosComuns.chipTexto, ordenacao === ord.id && estilosComuns.chipTextoAtivo]}>
                {ord.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {indicadoresVisiveis.map((ind) => (
        <View key={ind.execucao_id} style={estilosComuns.card}>
          <View style={estilosComuns.linhaEntre}>
            <Text style={estilosComuns.badge}>#{ind.solicitacao_codigo}</Text>
            <Text style={styles.tagEstado}>
              {ind.esforco_assertivo ? 'Assertivo' : 'Com desvio'}
            </Text>
          </View>
          <Text style={styles.cardTituloItem}>
            {ind.empresa_nome} — {ind.servico_slug}
          </Text>
          <Text style={styles.cardDetalhe}>
            Esforço: {formatarHoras(ind.horas_estimadas)} vs {formatarHoras(ind.horas_realizadas)} (Desvio:{' '}
            {formatarDesvio(ind.desvio_esforco)})
          </Text>
          {exibeCustos && ind.custo_estimado != null && ind.custo_realizado != null ? (
            <Text style={styles.precoDestaque}>
              Custo: {formatarDinheiro(ind.custo_estimado)} vs {formatarDinheiro(ind.custo_realizado)}
            </Text>
          ) : null}

          {ind.licao_resumo ? (
            <View style={styles.caixaLicao}>
              <Text style={styles.licaoTexto}>
                💡 {ind.licao_resumo} ({ind.licao_estado})
              </Text>
              {ind.licao_estado === 'em_validacao' && podeFormalizar && ind.licao_id ? (
                <TouchableOpacity
                  style={[estilosComuns.botaoPrimario, { marginTop: 8 }]}
                  onPress={() => void aoFormalizarLicao(ind.licao_id!)}
                >
                  <Text style={estilosComuns.textoBotaoPrimario}>Formalizar Lição</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : (
            <View style={styles.caixaLicao}>
              <TextInput
                style={estilosComuns.input}
                value={resumos[ind.execucao_id] ?? ''}
                onChangeText={(txt) => setResumos((a) => ({ ...a, [ind.execucao_id]: txt }))}
                placeholder="Registrar lição aprendida (mín. 5 caracteres)..."
              />
              <TextInput
                style={[estilosComuns.input, { marginTop: 6 }]}
                value={assuntos[ind.execucao_id] ?? ''}
                onChangeText={(txt) => setAssuntos((a) => ({ ...a, [ind.execucao_id]: txt }))}
                placeholder="Assuntos separados por vírgula..."
              />
              <TouchableOpacity
                style={[estilosComuns.botaoPrimario, { marginTop: 8 }]}
                onPress={async () => {
                  const lista = (assuntos[ind.execucao_id] ?? '')
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean);
                  const ok = await aoCriarLicao(
                    ind.execucao_id,
                    resumos[ind.execucao_id] ?? '',
                    lista,
                  );
                  if (ok) {
                    setResumos((a) => ({ ...a, [ind.execucao_id]: '' }));
                    setAssuntos((a) => ({ ...a, [ind.execucao_id]: '' }));
                  }
                }}
              >
                <Text style={estilosComuns.textoBotaoPrimario}>Salvar Lição</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ))}
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
  linhaPizza: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  svgContainer: {
    width: 108,
    height: 108,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  centroPizza: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  anelNativo: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 7,
    borderColor: CORES.azulPrincipal,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CORES.fundoClaro,
  },
  centroValor: { fontSize: 16, fontWeight: '900', color: CORES.azulEscuro },
  centroRotulo: { fontSize: 9.5, fontWeight: '700', color: CORES.textoSecundario },
  itemLegenda: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pontoCor: { width: 9, height: 9, borderRadius: 5 },
  legendaTexto: { flex: 1, fontSize: 11.5, color: CORES.textoPrincipal, fontWeight: '700' },
  legendaValor: { fontSize: 11.5, color: CORES.azulEscuro, fontWeight: '800' },
  areaColunas: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 132,
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: CORES.borda,
    gap: 6,
  },
  colunaItem: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  valorTopoColuna: { fontSize: 9.5, fontWeight: '800', color: CORES.azulEscuro, marginBottom: 4 },
  barraDupla: { width: 12, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  rotuloBaseColuna: { fontSize: 9.5, fontWeight: '700', color: CORES.textoSecundario, marginTop: 4 },
  legendaMini: { fontSize: 10.5, fontWeight: '700', color: CORES.textoSecundario },
  trilhoBarra: { height: 8, backgroundColor: '#E2E8F0', borderRadius: 999, overflow: 'hidden', marginTop: 4 },
  preenchimentoBarra: { height: '100%', borderRadius: 999, backgroundColor: CORES.azulPrincipal },
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
  precoDestaque: { fontSize: 13, fontWeight: '800', color: CORES.verde, marginTop: 4 },
  caixaLicao: {
    marginTop: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: CORES.borda,
  },
  licaoTexto: { fontSize: 12.5, color: CORES.azulEscuro, fontWeight: '700' },
  resultadoRec: {
    marginTop: 8,
    fontSize: 12.5,
    fontWeight: '800',
    color: CORES.azulPrincipal,
    backgroundColor: '#F0F9FF',
    padding: 8,
    borderRadius: 8,
  },
});
