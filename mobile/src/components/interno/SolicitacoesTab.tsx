import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { correspondeBusca, formatosDataParaBusca } from '@lib/busca-e-filtros';
import type { ContextoOperacionalLaboratorio } from '@lib/chatbot-metrologia';
import type { PerfilInterno } from '@lib/contratos';
import {
  apresentarEstadoSolicitacao,
  podeConsultarSolicitacoes,
  podeCriarPrePropostaDaSolicitacao,
  type SolicitacaoParaPreProposta,
} from '@lib/solicitacoes-persistentes';

function podeConsultarSolicitacoesCheck(perfil: PerfilInterno, sol: SolicitacaoParaPreProposta): boolean {
  return podeConsultarSolicitacoes(perfil) && podeCriarPrePropostaDaSolicitacao(sol);
}
import { CORES, estilosComuns } from '../../theme';

export function SolicitacoesTab({
  contexto,
  perfil,
  filtroInicial = 'todos',
  aoVincularCliente,
  aoElaborarPreProposta,
  aoAbrirChatbotProtocolo,
  aoAbrirAnexo,
}: {
  contexto: ContextoOperacionalLaboratorio;
  perfil: PerfilInterno;
  filtroInicial?: string;
  aoVincularCliente: (solicitacaoId: string) => Promise<void>;
  aoElaborarPreProposta: (solicitacao: SolicitacaoParaPreProposta) => void;
  aoAbrirChatbotProtocolo: (codigo: number) => void;
  aoAbrirAnexo: (bucket: 'solicitacoes' | 'mensagens', caminho: string, nome: string) => Promise<void>;
}) {
  const [busca, setBusca] = useState('');
  const [filtroAcesso, setFiltroAcesso] = useState('todos');
  const [filtroAtendimento, setFiltroAtendimento] = useState(
    filtroInicial === 'sem_proposta' ? 'sem_proposta' : 'todos',
  );
  const [ordenacao, setOrdenacao] = useState<'recentes' | 'antigas' | 'empresa' | 'quantidade'>('recentes');
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});
  const [vinculandoId, setVinculandoId] = useState<string | null>(null);

  const solicitacoesVisiveis = useMemo(() => {
    return contexto.solicitacoes
      .filter((sol) => {
        if (
          !correspondeBusca(
            busca,
            sol.codigo,
            `DEM-SOL-${String(sol.codigo).padStart(4, '0')}`,
            sol.empresa,
            sol.nome,
            sol.email,
            sol.necessidade,
            sol.descricao,
            sol.estado,
            sol.estado_pre_proposta,
            formatosDataParaBusca(sol.criado_em),
          )
        ) {
          return false;
        }
        if (filtroAcesso !== 'todos' && sol.estado !== filtroAcesso) return false;
        if (
          filtroInicial === 'abertas' &&
          (sol.estado === 'descartada' || ['aceita', 'recusada'].includes(sol.estado_pre_proposta ?? ''))
        ) {
          return false;
        }
        if (filtroAtendimento === 'sem_proposta' && sol.tem_pre_proposta) return false;
        if (filtroAtendimento === 'com_proposta' && !sol.tem_pre_proposta) return false;
        if (
          !['todos', 'sem_proposta', 'com_proposta'].includes(filtroAtendimento) &&
          sol.estado_pre_proposta !== filtroAtendimento
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (ordenacao === 'antigas') return +new Date(a.criado_em) - +new Date(b.criado_em);
        if (ordenacao === 'empresa') return a.empresa.localeCompare(b.empresa, 'pt-BR');
        if (ordenacao === 'quantidade') return Number(b.quantidade || 0) - Number(a.quantidade || 0);
        return +new Date(b.criado_em) - +new Date(a.criado_em);
      });
  }, [busca, contexto.solicitacoes, filtroAcesso, filtroAtendimento, filtroInicial, ordenacao]);

  return (
    <View>
      {/* KPIs clicáveis para filtrar a fila na hora */}
      <View style={styles.gradeKpis}>
        {[
          {
            rotulo: 'Aguardando ativação',
            valor: contexto.solicitacoes.filter((s) => s.estado === 'recebida').length,
            onPress: () => {
              setFiltroAcesso('recebida');
              setFiltroAtendimento('todos');
            },
          },
          {
            rotulo: 'Portal ativado',
            valor: contexto.solicitacoes.filter((s) => s.estado === 'ativada').length,
            onPress: () => {
              setFiltroAcesso('ativada');
              setFiltroAtendimento('todos');
            },
          },
          {
            rotulo: 'Sem proposta',
            valor: contexto.solicitacoes.filter((s) => !s.tem_pre_proposta).length,
            onPress: () => {
              setFiltroAtendimento('sem_proposta');
              setFiltroAcesso('todos');
            },
          },
          {
            rotulo: 'Revisão pedida',
            valor: contexto.solicitacoes.filter((s) => s.estado_pre_proposta === 'recusada').length,
            onPress: () => {
              setFiltroAtendimento('recusada');
              setFiltroAcesso('todos');
            },
          },
        ].map((k) => (
          <TouchableOpacity key={k.rotulo} style={styles.cardKpi} onPress={k.onPress}>
            <Text style={styles.kpiValor}>{k.valor}</Text>
            <Text style={styles.kpiRotulo}>{k.rotulo}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Busca e Filtros Avançados */}
      <View style={estilosComuns.card}>
        <View style={estilosComuns.linhaEntre}>
          <Text style={estilosComuns.tituloSecao}>
            Solicitações ({solicitacoesVisiveis.length}/{contexto.solicitacoes.length})
          </Text>
          {(busca || filtroAcesso !== 'todos' || filtroAtendimento !== 'todos') && (
            <TouchableOpacity
              onPress={() => {
                setBusca('');
                setFiltroAcesso('todos');
                setFiltroAtendimento('todos');
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
          placeholder="Buscar protocolo, empresa, contato, serviço ou data (ex: 26/11)..."
          placeholderTextColor={CORES.textoSuave}
        />

        <Text style={styles.rotuloFiltro}>Acesso:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'recebida', label: 'Recebida' },
            { id: 'ativada', label: 'Ativada' },
            { id: 'descartada', label: 'Descartada' },
          ].map((op) => (
            <TouchableOpacity
              key={op.id}
              style={[estilosComuns.chip, filtroAcesso === op.id && estilosComuns.chipAtivo, { marginRight: 6 }]}
              onPress={() => setFiltroAcesso(op.id)}
            >
              <Text style={[estilosComuns.chipTexto, filtroAcesso === op.id && estilosComuns.chipTextoAtivo]}>
                {op.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.rotuloFiltro}>Atendimento & Ordenação:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { id: 'todos', label: 'Tudo' },
            { id: 'sem_proposta', label: 'Sem proposta' },
            { id: 'em_validacao', label: 'Em validação' },
            { id: 'aprovada', label: 'Aprovada' },
            { id: 'publicada', label: 'Publicada' },
            { id: 'aceita', label: 'Aceita' },
            { id: 'recusada', label: 'Recusada' },
          ].map((op) => (
            <TouchableOpacity
              key={op.id}
              style={[
                estilosComuns.chip,
                filtroAtendimento === op.id && estilosComuns.chipAtivo,
                { marginRight: 6 },
              ]}
              onPress={() => setFiltroAtendimento(op.id)}
            >
              <Text
                style={[
                  estilosComuns.chipTexto,
                  filtroAtendimento === op.id && estilosComuns.chipTextoAtivo,
                ]}
              >
                {op.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
          {[
            { id: 'recentes', label: '↓ Mais novas' },
            { id: 'antigas', label: '↑ Mais antigas' },
            { id: 'empresa', label: 'A–Z Empresa' },
            { id: 'quantidade', label: 'Maior qtd' },
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

      {solicitacoesVisiveis.length === 0 ? (
        <View style={estilosComuns.card}>
          <Text style={styles.textoVazio}>Nenhuma solicitação encontrada para esses filtros.</Text>
        </View>
      ) : null}

      {solicitacoesVisiveis.map((sol) => {
        const chaveAnexo = sol.solicitacao_id ?? sol.id;
        const anexos =
          contexto.anexosPorSolicitacao[chaveAnexo] ?? contexto.anexosPorSolicitacao[sol.id] ?? [];
        const aberto = Boolean(expandidos[sol.id]);
        const estadoInfo = apresentarEstadoSolicitacao(sol.estado);
        const podePropor = podeConsultarSolicitacoesCheck(perfil, sol);
        const dataFmt = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(
          new Date(sol.criado_em),
        );

        return (
          <View key={sol.id} style={estilosComuns.card}>
            <View style={estilosComuns.linhaEntre}>
              <Text style={estilosComuns.badge}>
                DEM-SOL-{String(sol.codigo).padStart(4, '0')} • {dataFmt}
              </Text>
              <Text style={styles.tagEstado}>{estadoInfo.rotulo}</Text>
            </View>
            <Text style={styles.cardTituloItem}>
              {sol.empresa} — {sol.necessidade.replaceAll('-', ' ')}
            </Text>
            <Text style={styles.cardDetalhe}>
              {sol.quantidade} pç(s) • {anexos.length} anexo(s) • {sol.nome}
            </Text>

            <TouchableOpacity
              style={{ marginTop: 6 }}
              onPress={() => setExpandidos((a) => ({ ...a, [sol.id]: !a[sol.id] }))}
            >
              <Text style={styles.linkExpandir}>
                {aberto ? '▾ Ocultar detalhes e PDFs' : '▸ Ver detalhes e PDFs'}
              </Text>
            </TouchableOpacity>

            {aberto ? (
              <View style={{ marginTop: 8 }}>
                <Text style={styles.cardDetalhe}>
                  Contato: {sol.email} • Pagto: {sol.prazo_pagamento_dias}d
                </Text>
                <View style={styles.caixaPedidoCliente}>
                  <Text style={styles.caixaPedidoTexto}>{sol.descricao}</Text>
                </View>
                {anexos.length === 0 ? (
                  <Text style={styles.textoVazio}>Sem arquivos anexados.</Text>
                ) : (
                  anexos.map((arq) => (
                    <TouchableOpacity
                      key={arq.id}
                      style={styles.itemAnexo}
                      onPress={() =>
                        void aoAbrirAnexo('solicitacoes', arq.caminho_storage ?? '', arq.nome_original)
                      }
                    >
                      <Text style={styles.itemAnexoNome}>📄 {arq.nome_original} (abrir)</Text>
                      <Text style={styles.itemAnexoMeta}>
                        {arq.tipo_mime} • {(arq.tamanho_bytes / 1024).toFixed(0)} KB
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            ) : null}

            <View style={[estilosComuns.linha, { marginTop: 10, flexWrap: 'wrap' }]}>
              {sol.estado === 'recebida' && (
                <TouchableOpacity
                  style={estilosComuns.botaoSecundario}
                  disabled={vinculandoId === sol.id}
                  onPress={async () => {
                    setVinculandoId(sol.id);
                    try {
                      await aoVincularCliente(sol.id);
                    } finally {
                      setVinculandoId(null);
                    }
                  }}
                >
                  <Text style={estilosComuns.textoBotaoSecundario}>
                    {vinculandoId === sol.id ? 'Vinculando...' : 'Vincular Cliente'}
                  </Text>
                </TouchableOpacity>
              )}
              {podePropor && (
                <TouchableOpacity
                  style={estilosComuns.botaoPrimario}
                  onPress={() => aoElaborarPreProposta(sol)}
                >
                  <Text style={estilosComuns.textoBotaoPrimario}>Elaborar Pré-proposta</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={estilosComuns.botaoSecundario}
                onPress={() => aoAbrirChatbotProtocolo(sol.codigo)}
              >
                <Text style={estilosComuns.textoBotaoSecundario}>Chatbot</Text>
              </TouchableOpacity>
            </View>
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
  caixaPedidoCliente: {
    marginTop: 6,
    backgroundColor: CORES.fundoClaro,
    borderLeftWidth: 3,
    borderLeftColor: CORES.azulPrincipal,
    padding: 8,
    borderRadius: 6,
  },
  caixaPedidoTexto: { fontSize: 12.5, color: CORES.textoPrincipal, lineHeight: 18 },
  itemAnexo: {
    marginTop: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: CORES.borda,
  },
  itemAnexoNome: { fontSize: 12.5, fontWeight: '800', color: CORES.azulPrincipal },
  itemAnexoMeta: { fontSize: 11, color: CORES.textoSecundario, marginTop: 2 },
  textoVazio: { fontSize: 12.5, color: CORES.textoSuave, fontStyle: 'italic' },
});
