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
  const [resumos, setResumos] = useState<Record<string, string>>({});
  const [assuntos, setAssuntos] = useState<Record<string, string>>({});

  // Recomendador Q1–Q3
  const [servicoRecId, setServicoRecId] = useState(servicosDb[0]?.id ?? '');
  const [qtdRec, setQtdRec] = useState('10');
  const [resultadoRec, setResultadoRec] = useState('');

  const exibeCustos = podeConsultarCustos(perfil);
  const podeFormalizar = podeFormalizarLicao(perfil);

  const indicadoresVisiveis = useMemo(() => {
    return contexto.indicadores.filter((ind) => {
      if (filtro === 'sem_licao' && ind.licao_id) return false;
      if (filtro === 'em_validacao' && ind.licao_estado !== 'em_validacao') return false;
      if (filtro === 'formalizada' && ind.licao_estado !== 'formalizada') return false;
      if (filtro === 'assertivo' && !ind.esforco_assertivo) return false;
      return correspondeBusca(
        busca,
        ind.solicitacao_codigo,
        ind.empresa_nome,
        ind.servico_slug,
        ind.licao_resumo,
        ind.licao_assuntos.join(' '),
      );
    });
  }, [busca, contexto.indicadores, filtro]);

  return (
    <View>
      {/* Simulador de Recomendação Q1–Q3 */}
      <View style={estilosComuns.card}>
        <Text style={estilosComuns.badge}>RECOMENDAÇÃO ESTATÍSTICA</Text>
        <Text style={estilosComuns.tituloSecao}>Consultar Faixa Q1–Q3</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
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

      {/* Filtros dos indicadores */}
      <View style={estilosComuns.card}>
        <Text style={estilosComuns.tituloSecao}>
          Lições e Indicadores ({indicadoresVisiveis.length}/{contexto.indicadores.length})
        </Text>
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
