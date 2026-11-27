import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
  const [chave, setChave] = useState('evento_destaque_mobile');
  const [tipo, setTipo] = useState('evento');
  const [idioma, setIdioma] = useState('pt-BR');
  const [titulo, setTitulo] = useState('');
  const [corpo, setCorpo] = useState('');
  const [justificativa, setJustificativa] = useState('');

  const podeValidar = perfil === 'validador' || perfil === 'administrador';

  return (
    <View>
      <View style={estilosComuns.card}>
        <Text style={estilosComuns.badge}>GESTÃO DE CONTEÚDO PÚBLICO</Text>
        <Text style={estilosComuns.tituloSecao}>Editor CMS</Text>

        <Text style={estilosComuns.rotuloCampo}>Chave</Text>
        <TextInput style={estilosComuns.input} value={chave} onChangeText={setChave} />

        <View style={[estilosComuns.linha, { marginTop: 6 }]}>
          <View style={{ flex: 1 }}>
            <Text style={estilosComuns.rotuloCampo}>Tipo</Text>
            <TextInput style={estilosComuns.input} value={tipo} onChangeText={setTipo} />
          </View>
          <View style={{ width: 96 }}>
            <Text style={estilosComuns.rotuloCampo}>Idioma</Text>
            <TextInput style={estilosComuns.input} value={idioma} onChangeText={setIdioma} />
          </View>
        </View>

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
            }
          }}
        >
          <Text style={estilosComuns.textoBotaoPrimario}>Salvar Rascunho</Text>
        </TouchableOpacity>
      </View>

      <View style={estilosComuns.card}>
        <Text style={estilosComuns.tituloSecao}>Versões ({versoes.length})</Text>
        {versoes.slice(0, 12).map((v) => (
          <View key={v.id} style={styles.itemCms}>
            <View style={estilosComuns.linhaEntre}>
              <Text style={estilosComuns.badge}>
                {v.chave} • {v.idioma}
              </Text>
              <Text style={styles.tagEstado}>{v.estado}</Text>
            </View>
            <Text style={styles.tituloItem}>{v.titulo}</Text>
            <Text style={styles.corpoItem} numberOfLines={2}>
              {v.corpo}
            </Text>
            <View style={[estilosComuns.linha, { marginTop: 8, flexWrap: 'wrap' }]}>
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
        <TextInput
          style={[estilosComuns.input, { marginTop: 8 }]}
          value={justificativa}
          onChangeText={setJustificativa}
          placeholder="Justificativa (caso devolva alguma versão)..."
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  itemCms: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: CORES.borda,
  },
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
