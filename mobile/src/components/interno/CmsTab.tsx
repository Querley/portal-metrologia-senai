import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { correspondeBusca } from '@lib/busca-e-filtros';
import type { PerfilInterno } from '@lib/contratos';
import { CORES, estilosComuns } from '../../theme';

export type VersaoCmsDb = {
  id: string;
  chave: string;
  tipo: string;
  idioma: string;
  titulo: string;
  corpo: string;
  estado: string;
  justificativa_devolucao?: string | null;
};

export function CmsTab({
  perfil,
  versoes,
  aoSalvarRascunho,
  aoExecutarAcao,
}: {
  perfil: PerfilInterno;
  versoes: VersaoCmsDb[];
  aoSalvarRascunho: (payload: {
    chave: string;
    tipo: string;
    idioma: string;
    titulo: string;
    corpo: string;
  }) => Promise<boolean>;
  aoExecutarAcao: (
    versaoId: string,
    acao: 'enviar' | 'aprovar' | 'devolver' | 'publicar',
    justificativa?: string,
  ) => Promise<void>;
}) {
  const [editorAberto, setEditorAberto] = useState(false);
  const [chave, setChave] = useState('evento_destaque_mobile');
  const [tipo, setTipo] = useState('evento');
  const [idioma, setIdioma] = useState<'pt-BR' | 'en' | 'de'>('pt-BR');
  const [titulo, setTitulo] = useState('');
  const [corpo, setCorpo] = useState('');
  const [justificativa, setJustificativa] = useState('');

  const [busca, setBusca] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'rascunho' | 'em_validacao' | 'aprovada' | 'publicada'>('todos');
  const [filtroIdioma, setFiltroIdioma] = useState<'todos' | 'pt-BR' | 'en' | 'de'>('todos');

  const podeValidar = perfil === 'validador' || perfil === 'administrador';

  const versoesVisiveis = useMemo(() => {
    return versoes.filter((v) => {
      if (filtroEstado !== 'todos' && v.estado !== filtroEstado) return false;
      if (filtroIdioma !== 'todos' && v.idioma !== filtroIdioma) return false;
      return correspondeBusca(busca, v.chave, v.tipo, v.idioma, v.titulo, v.corpo, v.estado);
    });
  }, [busca, filtroEstado, filtroIdioma, versoes]);

  return (
    <View>
      {/* KPIs clicáveis */}
      <View style={styles.gradeKpis}>
        {[
          { rotulo: 'Rascunhos', valor: versoes.filter((v) => v.estado === 'rascunho').length, id: 'rascunho' as const },
          { rotulo: 'Em validação', valor: versoes.filter((v) => v.estado === 'em_validacao').length, id: 'em_validacao' as const },
          { rotulo: 'Aprovadas', valor: versoes.filter((v) => v.estado === 'aprovada').length, id: 'aprovada' as const },
          { rotulo: 'Publicadas', valor: versoes.filter((v) => v.estado === 'publicada').length, id: 'publicada' as const },
        ].map((k) => (
          <TouchableOpacity
            key={k.rotulo}
            style={[
              styles.cardKpi,
              filtroEstado === k.id && { borderColor: CORES.azulPrincipal, borderWidth: 2 },
            ]}
            onPress={() => setFiltroEstado((atual) => (atual === k.id ? 'todos' : k.id))}
          >
            <Text style={styles.kpiValor}>{k.valor}</Text>
            <Text style={styles.kpiRotulo}>{k.rotulo}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Editor Colapsável */}
      <View style={estilosComuns.card}>
        <TouchableOpacity
          style={estilosComuns.linhaEntre}
          onPress={() => setEditorAberto((a) => !a)}
        >
          <View>
            <Text style={estilosComuns.badge}>GESTÃO DE CONTEÚDO PÚBLICO</Text>
            <Text style={estilosComuns.tituloSecao}>Editor CMS</Text>
          </View>
          <Text style={styles.linkExpandir}>{editorAberto ? '▾ Fechar' : '▸ Novo conteúdo'}</Text>
        </TouchableOpacity>

        {editorAberto && (
          <View style={{ marginTop: 10 }}>
            <Text style={estilosComuns.rotuloCampo}>Chave</Text>
            <TextInput style={estilosComuns.input} value={chave} onChangeText={setChave} />

            <Text style={[estilosComuns.rotuloCampo, { marginTop: 6 }]}>Idioma</Text>
            <View style={[estilosComuns.linha, { marginVertical: 4 }]}>
              {(['pt-BR', 'en', 'de'] as const).map((cod) => (
                <TouchableOpacity
                  key={cod}
                  style={[
                    estilosComuns.chip,
                    idioma === cod && estilosComuns.chipAtivo,
                    { marginRight: 6 },
                  ]}
                  onPress={() => setIdioma(cod)}
                >
                  <Text style={[estilosComuns.chipTexto, idioma === cod && estilosComuns.chipTextoAtivo]}>
                    {cod.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[estilosComuns.rotuloCampo, { marginTop: 6 }]}>Tipo</Text>
            <TextInput style={estilosComuns.input} value={tipo} onChangeText={setTipo} />

            <Text style={[estilosComuns.rotuloCampo, { marginTop: 6 }]}>Título</Text>
            <TextInput
              style={estilosComuns.input}
              value={titulo}
              onChangeText={setTitulo}
              placeholder="Título público..."
            />

            <Text style={[estilosComuns.rotuloCampo, { marginTop: 6 }]}>Conteúdo</Text>
            <TextInput
              style={[estilosComuns.input, { minHeight: 70 }]}
              multiline
              value={corpo}
              onChangeText={setCorpo}
              placeholder="Texto da publicação..."
            />

            <TouchableOpacity
              style={[estilosComuns.botaoPrimario, { marginTop: 10 }]}
              onPress={async () => {
                const ok = await aoSalvarRascunho({ chave, tipo, idioma, titulo, corpo });
                if (ok) {
                  setTitulo('');
                  setCorpo('');
                  setEditorAberto(false);
                }
              }}
            >
              <Text style={estilosComuns.textoBotaoPrimario}>Salvar Rascunho</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Busca e Filtros */}
      <View style={estilosComuns.card}>
        <View style={estilosComuns.linhaEntre}>
          <Text style={estilosComuns.tituloSecao}>
            Versões ({versoesVisiveis.length}/{versoes.length})
          </Text>
          {(busca || filtroEstado !== 'todos' || filtroIdioma !== 'todos') && (
            <TouchableOpacity
              onPress={() => {
                setBusca('');
                setFiltroEstado('todos');
                setFiltroIdioma('todos');
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
          placeholder="Buscar chave, título, idioma ou estado..."
          placeholderTextColor={CORES.textoSuave}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
          {(['todos', 'rascunho', 'em_validacao', 'aprovada', 'publicada'] as const).map((st) => (
            <TouchableOpacity
              key={st}
              style={[
                estilosComuns.chip,
                filtroEstado === st && estilosComuns.chipAtivo,
                { marginRight: 6 },
              ]}
              onPress={() => setFiltroEstado(st)}
            >
              <Text style={[estilosComuns.chipTexto, filtroEstado === st && estilosComuns.chipTextoAtivo]}>
                {st === 'todos' ? 'Todos' : st}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
          {(['todos', 'pt-BR', 'en', 'de'] as const).map((id) => (
            <TouchableOpacity
              key={id}
              style={[
                estilosComuns.chip,
                filtroIdioma === id && estilosComuns.chipAtivo,
                { marginRight: 6 },
              ]}
              onPress={() => setFiltroIdioma(id)}
            >
              <Text style={[estilosComuns.chipTexto, filtroIdioma === id && estilosComuns.chipTextoAtivo]}>
                {id === 'todos' ? 'Todos idiomas' : id.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {versoesVisiveis.slice(0, 20).map((v) => (
        <View key={v.id} style={estilosComuns.card}>
          <View style={estilosComuns.linhaEntre}>
            <Text style={estilosComuns.badge}>
              {v.chave} • {v.idioma}
            </Text>
            <Text style={styles.tagEstado}>{v.estado}</Text>
          </View>
          <Text style={styles.tituloItem}>{v.titulo}</Text>
          <Text style={styles.corpoItem} numberOfLines={3}>
            {v.corpo}
          </Text>
          <View style={[estilosComuns.linha, { marginTop: 8, flexWrap: 'wrap' }]}>
            <TouchableOpacity
              style={estilosComuns.botaoSecundario}
              onPress={() => {
                setChave(v.chave);
                setTipo(v.tipo);
                setIdioma((v.idioma as 'pt-BR' | 'en' | 'de') || 'pt-BR');
                setTitulo(v.titulo);
                setCorpo(v.corpo);
                setEditorAberto(true);
              }}
            >
              <Text style={estilosComuns.textoBotaoSecundario}>Editar</Text>
            </TouchableOpacity>

            {v.estado === 'rascunho' && (
              <TouchableOpacity
                style={estilosComuns.botaoPrimario}
                onPress={() => void aoExecutarAcao(v.id, 'enviar')}
              >
                <Text style={estilosComuns.textoBotaoPrimario}>Enviar p/ Validação</Text>
              </TouchableOpacity>
            )}
            {v.estado === 'em_validacao' && podeValidar && (
              <>
                <TouchableOpacity
                  style={estilosComuns.botaoPrimario}
                  onPress={() => void aoExecutarAcao(v.id, 'aprovar')}
                >
                  <Text style={estilosComuns.textoBotaoPrimario}>Aprovar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={estilosComuns.botaoSecundario}
                  onPress={() => void aoExecutarAcao(v.id, 'devolver', justificativa)}
                >
                  <Text style={estilosComuns.textoBotaoSecundario}>Devolver</Text>
                </TouchableOpacity>
              </>
            )}
            {v.estado === 'aprovada' && perfil === 'administrador' && (
              <TouchableOpacity
                style={estilosComuns.botaoPrimario}
                onPress={() => void aoExecutarAcao(v.id, 'publicar')}
              >
                <Text style={estilosComuns.textoBotaoPrimario}>Publicar</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}

      <View style={estilosComuns.card}>
        <TextInput
          style={estilosComuns.input}
          value={justificativa}
          onChangeText={setJustificativa}
          placeholder="Justificativa (caso devolva alguma versão)..."
        />
      </View>
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
  linkExpandir: { fontSize: 12, fontWeight: '800', color: CORES.azulPrincipal },
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
  tituloItem: { fontSize: 13.5, fontWeight: '800', color: CORES.azulEscuro, marginTop: 4 },
  corpoItem: { fontSize: 12, color: CORES.textoSecundario, marginTop: 2 },
});
