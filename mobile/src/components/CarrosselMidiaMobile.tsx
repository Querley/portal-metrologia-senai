import React, { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { MidiaEquipamento } from '@lib/equipamentos';
import type { IdiomaPublico } from '@lib/idioma-publico';
import { traduzirTextoPublico } from '@lib/traducao-publica';
import { CORES } from '../theme';

export function VideoAutoPlayMudo({
  src,
  poster,
  rotulo,
}: {
  src: string;
  poster?: string;
  rotulo: string;
}) {
  return (
    <video
      key={src}
      ref={(el) => {
        if (el) {
          el.muted = true;
          el.defaultMuted = true;
        }
      }}
      src={src}
      poster={poster}
      aria-label={rotulo}
      autoPlay
      muted
      loop
      playsInline
      controls
      preload="metadata"
      onLoadedMetadata={(e) => {
        const vid = e.currentTarget;
        vid.muted = true;
        void vid.play().catch(() => undefined);
      }}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        backgroundColor: '#061f30',
        display: 'block',
      }}
    />
  );
}

export function MidiaLockedMobile({
  midia,
  idioma,
  fundoClaro = false,
}: {
  midia: MidiaEquipamento;
  idioma: IdiomaPublico;
  fundoClaro?: boolean;
}) {
  const t = (chave: string) => traduzirTextoPublico(chave, idioma);
  const ehRecortePng = midia.src.endsWith('.png');
  const corFundo = fundoClaro || ehRecortePng ? '#ffffff' : '#061f30';

  return (
    <View style={[styles.palcoLocked, { backgroundColor: corFundo }]}>
      {midia.tipo === 'video' ? (
        <VideoAutoPlayMudo
          src={midia.src}
          poster={midia.poster}
          rotulo={t(midia.alt)}
        />
      ) : (
        <Image
          source={{ uri: midia.src }}
          resizeMode="contain"
          accessibilityLabel={t(midia.alt)}
          style={ehRecortePng ? { padding: 10 } : undefined}
        />
      )}
    </View>
  );
}

export function CarrosselMidiaMobile({
  midias,
  idioma,
}: {
  midias: MidiaEquipamento[];
  idioma: IdiomaPublico;
}) {
  const [indice, setIndice] = useState(0);
  const t = (chave: string) => traduzirTextoPublico(chave, idioma);

  // Reseta o índice se o conjunto de mídias mudar (ex: ao trocar de setor)
  useEffect(() => {
    setIndice(0);
  }, [midias]);

  if (!midias || midias.length === 0) return null;
  const indiceSeguro = indice < midias.length ? indice : 0;
  const atual = midias[indiceSeguro];

  const navegar = (direcao: number) => {
    setIndice((antigo) => (antigo + direcao + midias.length) % midias.length);
  };

  return (
    <View style={styles.containerCarrossel}>
      <MidiaLockedMobile midia={atual} idioma={idioma} />

      {/* Faixa inferior de legenda e controles */}
      <View style={styles.faixaLegenda}>
        <View style={styles.legendaTextoWrap}>
          <Text style={styles.contador}>
            {String(indiceSeguro + 1).padStart(2, '0')} / {String(midias.length).padStart(2, '0')}
          </Text>
          <Text style={styles.legendaTitulo} numberOfLines={1}>
            {t(atual.legenda)}
          </Text>
        </View>

        {midias.length > 1 && (
          <View style={styles.controlesRow}>
            <TouchableOpacity
              style={styles.botaoControle}
              onPress={() => navegar(-1)}
            >
              <Text style={styles.iconeControle}>‹</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.botaoControle}
              onPress={() => navegar(1)}
            >
              <Text style={styles.iconeControle}>›</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Miniaturas / seletores numerados */}
      {midias.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.miniaturasRow}
        >
          {midias.map((m, idx) => {
            const ativo = idx === indiceSeguro;
            return (
              <TouchableOpacity
                key={`${m.src}-${idx}`}
                style={[styles.miniaturaBtn, ativo && styles.miniaturaBtnAtiva]}
                onPress={() => setIndice(idx)}
              >
                <Text style={[styles.miniaturaNum, ativo && styles.miniaturaNumAtivo]}>
                  {idx + 1}
                </Text>
                <Text
                  style={[styles.miniaturaRotulo, ativo && styles.miniaturaRotuloAtivo]}
                  numberOfLines={1}
                >
                  {t(m.legenda)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  containerCarrossel: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: CORES.borda,
    backgroundColor: '#061f30',
    marginVertical: 8,
  },
  palcoLocked: {
    width: '100%',
    aspectRatio: '16 / 9',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  faixaLegenda: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#082e42',
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 8,
  },
  legendaTextoWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contador: {
    color: '#75d7eb',
    fontSize: 10,
    fontWeight: '800',
  },
  legendaTitulo: {
    flex: 1,
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  controlesRow: {
    flexDirection: 'row',
    gap: 4,
  },
  botaoControle: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#0d4058',
    borderWidth: 1,
    borderColor: '#3c6d81',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconeControle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 18,
  },
  miniaturasRow: {
    flexDirection: 'row',
    gap: 6,
    padding: 8,
    backgroundColor: '#edf5f7',
  },
  miniaturaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#bdd4dd',
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 5,
    maxWidth: 180,
  },
  miniaturaBtnAtiva: {
    backgroundColor: '#dff3f8',
    borderColor: '#55b8d1',
  },
  miniaturaNum: {
    color: CORES.azulPrincipal,
    fontSize: 10,
    fontWeight: '800',
  },
  miniaturaNumAtivo: {
    color: CORES.azulEscuro,
  },
  miniaturaRotulo: {
    color: '#476677',
    fontSize: 10.5,
    fontWeight: '600',
  },
  miniaturaRotuloAtivo: {
    color: CORES.azulEscuro,
    fontWeight: '800',
  },
});
