import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { ContextoOperacionalLaboratorio } from '@lib/chatbot-metrologia';
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
  aoNavegar,
}: {
  contexto: ContextoOperacionalLaboratorio;
  aoNavegar: (destino: 'solicitacoes' | 'orcamentos' | 'execucao' | 'conhecimento', filtro?: string) => void;
}) {
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

  return (
    <View>
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
});
