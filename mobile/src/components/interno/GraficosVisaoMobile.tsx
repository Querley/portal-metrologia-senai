import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { formatarDinheiro } from '@lib/calculos';
import type { ContextoOperacionalLaboratorio } from '@lib/chatbot-metrologia';
import type { PerfilInterno } from '@lib/contratos';
import { podeConsultarCustos } from '@lib/custos-equipamento';
import { rotuloNecessidadeCliente } from '@lib/solicitacao';
import { CORES, estilosComuns } from '../../theme';

type FatiaPizza = {
  rotulo: string;
  valor: number;
  cor: string;
  aoTocar: () => void;
};

function GraficoPizza({
  titulo,
  fatias,
  centroValor,
  centroRotulo,
}: {
  titulo: string;
  fatias: FatiaPizza[];
  centroValor: string;
  centroRotulo: string;
}) {
  const total = fatias.reduce((acc, f) => acc + f.valor, 0);
  const raio = 42;
  const circunferencia = 2 * Math.PI * raio;
  let acumulado = 0;

  return (
    <View style={estilosComuns.card}>
      <Text style={estilosComuns.tituloSecao}>{titulo}</Text>

      <View style={styles.linhaPizza}>
        {/* Anel / Pizza SVG no Web e Barra Proporcional no Nativo */}
        {typeof document !== 'undefined' ? (
          <View style={styles.svgContainer}>
            {React.createElement(
              'svg',
              { width: 124, height: 124, viewBox: '0 0 120 120' },
              React.createElement('circle', {
                cx: 60,
                cy: 60,
                r: raio,
                fill: 'transparent',
                stroke: '#E2E8F0',
                strokeWidth: 18,
              }),
              ...(total > 0
                ? fatias
                    .filter((f) => f.valor > 0)
                    .map((f) => {
                      const frac = f.valor / total;
                      const dash = frac * circunferencia;
                      const offset = -acumulado * circunferencia;
                      acumulado += frac;
                      return React.createElement('circle', {
                        key: f.rotulo,
                        cx: 60,
                        cy: 60,
                        r: raio,
                        fill: 'transparent',
                        stroke: f.cor,
                        strokeWidth: 18,
                        strokeDasharray: `${dash} ${circunferencia}`,
                        strokeDashoffset: offset,
                        transform: 'rotate(-90 60 60)',
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

        {/* Legenda clicável */}
        <View style={styles.legendaColuna}>
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

      {/* Barra empilhada proporcional */}
      {total > 0 && (
        <View style={styles.barraEmpilhada}>
          {fatias
            .filter((f) => f.valor > 0)
            .map((f) => (
              <View
                key={f.rotulo}
                style={{
                  flex: f.valor,
                  backgroundColor: f.cor,
                  height: '100%',
                }}
              />
            ))}
        </View>
      )}
    </View>
  );
}

export function GraficosVisaoMobile({
  contexto,
  perfil,
  aoNavegar,
}: {
  contexto: ContextoOperacionalLaboratorio;
  perfil: PerfilInterno;
  aoNavegar: (destino: 'solicitacoes' | 'orcamentos' | 'execucao' | 'conhecimento', filtro?: string) => void;
}) {
  const exibeCustos = podeConsultarCustos(perfil);
  const semProposta = contexto.solicitacoes.filter((s) => s.estado === 'ativada' && !s.tem_pre_proposta).length;
  const emExecucao = contexto.execucoes.filter(
    (e) => e.estado === 'em_execucao' && e.fechamento_estado !== 'aprovado',
  ).length;
  const licoesPendentes = contexto.indicadores.filter((i) => i.licao_estado === 'em_validacao').length;
  const concluidas = contexto.execucoes.filter(
    (e) => e.estado === 'concluido' || e.fechamento_estado === 'aprovado',
  ).length;
  const totalCiclo = semProposta + emExecucao + licoesPendentes + concluidas;
  const pctConcluido = totalCiclo > 0 ? Math.round((concluidas / totalCiclo) * 100) : 0;

  // Pizza 2: Status das Pré-propostas
  const orcRascunho = contexto.orcamentos.filter((o) => o.estado === 'rascunho' || o.estado === 'devolvida').length;
  const orcValidacao = contexto.orcamentos.filter((o) => o.estado === 'em_validacao').length;
  const orcAprovada = contexto.orcamentos.filter((o) => o.estado === 'aprovada' || o.estado === 'publicada').length;
  const orcAceita = contexto.orcamentos.filter((o) => o.estado === 'aceita').length;
  const orcRecusada = contexto.orcamentos.filter((o) => o.estado === 'recusada' || o.estado === 'rejeitada').length;

  // Assertividade Q1-Q3
  const comparaveis = contexto.indicadores.filter((i) => i.esforco_assertivo !== null);
  const assertivas = comparaveis.filter((i) => i.esforco_assertivo).length;
  const assertividadePct = comparaveis.length > 0 ? Math.round((assertivas / comparaveis.length) * 100) : 0;

  const barrasSolicitacoes = [
    { rotulo: 'Recebidas', valor: contexto.solicitacoes.filter((s) => s.estado === 'recebida').length, cor: '#F59E0B' },
    { rotulo: 'Ativadas', valor: contexto.solicitacoes.filter((s) => s.estado === 'ativada').length, cor: '#0284C7' },
    { rotulo: 'Com retrabalho', valor: contexto.execucoes.filter((e) => Boolean(e.retrabalho)).length, cor: '#DC2626' },
    { rotulo: 'Lições formalizadas', valor: contexto.indicadores.filter((i) => i.licao_estado === 'formalizada').length, cor: '#059669' },
  ];
  const maxBarra = Math.max(1, ...barrasSolicitacoes.map((b) => b.valor));

  // BI 1: Indicadores Financeiros e de Conversão
  const receitaAceitas = contexto.orcamentos
    .filter((o) => o.estado === 'aceita' || o.estado === 'publicada')
    .reduce((acc, o) => acc + Number(o.preco_final ?? 0), 0);
  const taxaConversao =
    contexto.orcamentos.length > 0
      ? Math.round((orcAceita / contexto.orcamentos.length) * 100)
      : 0;
  const taxaRetrabalho =
    contexto.execucoes.length > 0
      ? Math.round(
          (contexto.execucoes.filter((e) => Boolean(e.retrabalho)).length /
            contexto.execucoes.length) *
            100,
        )
      : 0;

  // BI 2: Ranking por Serviço (Top 5) com rótulo legível
  const contagemServicos = new Map<string, number>();
  for (const s of contexto.solicitacoes) {
    const nome = rotuloNecessidadeCliente(s.necessidade);
    contagemServicos.set(nome, (contagemServicos.get(nome) ?? 0) + 1);
  }
  const topServicos = Array.from(contagemServicos.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxServico = Math.max(1, ...topServicos.map(([, v]) => v));
  const totalSolicitacoes = Math.max(1, contexto.solicitacoes.length);

  // BI 3: Barras Verticais Agrupadas — Planejado vs Realizado (Horas)
  const comparativoHoras = contexto.indicadores.slice(0, 5);
  const maxHoras = Math.max(
    1,
    ...comparativoHoras.flatMap((i) => [
      Number(i.horas_estimadas ?? 0),
      Number(i.horas_realizadas ?? 0),
    ]),
  );

  return (
    <View>
      {/* Painel Executivo BI */}
      <View style={estilosComuns.card}>
        <Text style={estilosComuns.badge}>BUSINESS INTELLIGENCE</Text>
        <Text style={estilosComuns.tituloSecao}>Desempenho Executivo</Text>
        <View style={styles.gradeBi}>
          {exibeCustos && (
            <View style={styles.cardBi}>
              <Text style={styles.biRotulo}>Receita Aceita/Publ.</Text>
              <Text style={[styles.biValor, { color: '#059669' }]}>
                {formatarDinheiro(receitaAceitas)}
              </Text>
            </View>
          )}
          <View style={styles.cardBi}>
            <Text style={styles.biRotulo}>Conversão Propostas</Text>
            <Text style={styles.biValor}>{taxaConversao}%</Text>
          </View>
          <View style={styles.cardBi}>
            <Text style={styles.biRotulo}>Taxa de Retrabalho</Text>
            <Text style={[styles.biValor, { color: taxaRetrabalho > 20 ? '#DC2626' : CORES.azulEscuro }]}>
              {taxaRetrabalho}%
            </Text>
          </View>
        </View>
      </View>

      {/* Ranking BI de Barras Horizontais: Demanda por Serviço */}
      {topServicos.length > 0 && (
        <View style={estilosComuns.card}>
          <Text style={estilosComuns.tituloSecao}>Demanda por Serviço (Top 5)</Text>
          <View style={{ marginTop: 10, gap: 10 }}>
            {topServicos.map(([nome, qtd], idx) => {
              const largura = Math.max(8, Math.round((qtd / maxServico) * 100));
              const pct = Math.round((qtd / totalSolicitacoes) * 100);
              const coresRanking = ['#0284C7', '#0891B2', '#0D9488', '#2563EB', '#4F46E5'];
              return (
                <View key={nome}>
                  <View style={estilosComuns.linhaEntre}>
                    <Text style={[styles.barraRotulo, { flex: 1, color: CORES.azulEscuro }]} numberOfLines={1}>
                      {idx + 1}. {nome}
                    </Text>
                    <Text style={styles.barraValor}>
                      {qtd} ({pct}%)
                    </Text>
                  </View>
                  <View style={[styles.trilhoBarra, { height: 10 }]}>
                    <View
                      style={[
                        styles.preenchimentoBarra,
                        { width: `${largura}%`, backgroundColor: coresRanking[idx] ?? '#0284C7' },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Gráfico de Barras Verticais Agrupadas: Planejado vs Realizado (Horas) */}
      {comparativoHoras.length > 0 && (
        <View style={estilosComuns.card}>
          <View style={estilosComuns.linhaEntre}>
            <Text style={estilosComuns.tituloSecao}>Horas: Planejado × Realizado</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 4, marginBottom: 8 }}>
            <Text style={styles.legendaMini}>🟦 Estimado</Text>
            <Text style={styles.legendaMini}>🟩 No prazo</Text>
            <Text style={styles.legendaMini}>🟥 Acima</Text>
          </View>
          <View style={styles.areaColunas}>
            {comparativoHoras.map((ind) => {
              const est = Number(ind.horas_estimadas ?? 0);
              const real = Number(ind.horas_realizadas ?? 0);
              const altEst = Math.max(8, Math.round((est / maxHoras) * 90));
              const altReal = Math.max(8, Math.round((real / maxHoras) * 90));
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
      <GraficoPizza
        titulo="Ciclo de Valor do Laboratório"
        centroValor={`${pctConcluido}%`}
        centroRotulo="concluído"
        fatias={[
          { rotulo: 'A orçar', valor: semProposta, cor: '#F59E0B', aoTocar: () => aoNavegar('solicitacoes', 'sem_proposta') },
          { rotulo: 'Em execução', valor: emExecucao, cor: '#0284C7', aoTocar: () => aoNavegar('execucao') },
          { rotulo: 'Validar lição', valor: licoesPendentes, cor: '#7C3AED', aoTocar: () => aoNavegar('conhecimento') },
          { rotulo: 'Concluído', valor: concluidas, cor: '#059669', aoTocar: () => aoNavegar('execucao') },
        ]}
      />

      <GraficoPizza
        titulo="Pipeline de Pré-propostas"
        centroValor={String(contexto.orcamentos.length)}
        centroRotulo="propostas"
        fatias={[
          { rotulo: 'Rascunho/Devolv.', valor: orcRascunho, cor: '#64748B', aoTocar: () => aoNavegar('orcamentos') },
          { rotulo: 'Em validação', valor: orcValidacao, cor: '#F59E0B', aoTocar: () => aoNavegar('orcamentos') },
          { rotulo: 'Aprov./Public.', valor: orcAprovada, cor: '#0284C7', aoTocar: () => aoNavegar('orcamentos') },
          { rotulo: 'Aceitas', valor: orcAceita, cor: '#059669', aoTocar: () => aoNavegar('orcamentos') },
          { rotulo: 'Recus./Rejeit.', valor: orcRecusada, cor: '#DC2626', aoTocar: () => aoNavegar('orcamentos') },
        ]}
      />

      {/* Medidor de Assertividade + Barras Operacionais */}
      <View style={estilosComuns.card}>
        <Text style={estilosComuns.tituloSecao}>Assertividade & Volume</Text>
        <View style={styles.assertividadeBox}>
          <View style={estilosComuns.linhaEntre}>
            <Text style={styles.assertividadeTitulo}>Assertividade Q1–Q3</Text>
            <Text style={styles.assertividadeValor}>
              {assertividadePct}% ({assertivas}/{comparaveis.length})
            </Text>
          </View>
          <View style={styles.trilhoBarra}>
            <View style={[styles.preenchimentoBarra, { width: `${assertividadePct}%`, backgroundColor: '#059669' }]} />
          </View>
        </View>

        <View style={{ marginTop: 10, gap: 8 }}>
          {barrasSolicitacoes.map((b) => (
            <View key={b.rotulo}>
              <View style={estilosComuns.linhaEntre}>
                <Text style={styles.barraRotulo}>{b.rotulo}</Text>
                <Text style={styles.barraValor}>{b.valor}</Text>
              </View>
              <View style={styles.trilhoBarra}>
                <View
                  style={[
                    styles.preenchimentoBarra,
                    { width: `${Math.round((b.valor / maxBarra) * 100)}%`, backgroundColor: b.cor },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  linhaPizza: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
  },
  svgContainer: {
    width: 124,
    height: 124,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  centroPizza: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  anelNativo: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 8,
    borderColor: CORES.azulPrincipal,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CORES.fundoClaro,
  },
  centroValor: { fontSize: 18, fontWeight: '900', color: CORES.azulEscuro },
  centroRotulo: { fontSize: 10, fontWeight: '700', color: CORES.textoSecundario },
  legendaColuna: { flex: 1, gap: 6 },
  itemLegenda: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pontoCor: { width: 10, height: 10, borderRadius: 5 },
  legendaTexto: { flex: 1, fontSize: 11.5, color: CORES.textoPrincipal, fontWeight: '700' },
  legendaValor: { fontSize: 11.5, color: CORES.azulEscuro, fontWeight: '800' },
  barraEmpilhada: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 12,
    backgroundColor: '#E2E8F0',
  },
  assertividadeBox: {
    marginTop: 8,
    backgroundColor: CORES.fundoClaro,
    padding: 10,
    borderRadius: 8,
  },
  assertividadeTitulo: { fontSize: 12, fontWeight: '800', color: CORES.azulEscuro },
  assertividadeValor: { fontSize: 12.5, fontWeight: '900', color: '#059669' },
  barraRotulo: { fontSize: 11.5, fontWeight: '700', color: CORES.textoSecundario },
  barraValor: { fontSize: 11.5, fontWeight: '900', color: CORES.azulEscuro },
  trilhoBarra: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 4,
  },
  preenchimentoBarra: { height: '100%', borderRadius: 999 },
  gradeBi: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  cardBi: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: CORES.fundoClaro,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: CORES.borda,
  },
  biRotulo: { fontSize: 11, fontWeight: '700', color: CORES.textoSecundario },
  biValor: { fontSize: 16, fontWeight: '900', color: CORES.azulEscuro, marginTop: 2 },
  areaColunas: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 145,
    paddingTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: CORES.borda,
    gap: 6,
  },
  colunaItem: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  valorTopoColuna: { fontSize: 10, fontWeight: '800', color: CORES.azulEscuro, marginBottom: 4 },
  barraVertical: { width: 24, borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  barraDupla: { width: 12, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  rotuloBaseColuna: {
    fontSize: 9.5,
    fontWeight: '700',
    color: CORES.textoSecundario,
    textAlign: 'center',
    marginTop: 5,
    height: 24,
  },
  legendaMini: { fontSize: 10.5, fontWeight: '700', color: CORES.textoSecundario },
});
