import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CORES } from '../theme';

export type ItemMenuLateral<T extends string = string> = {
  id: T;
  icone: string;
  rotuloCurto: string;
  rotuloCompleto: string;
  badge?: string | number;
};

export function BarraLateralMobile<T extends string>({
  itens,
  ativoId,
  aoSelecionar,
  tituloMenu = 'Menu',
  rotuloBotaoMenu = 'Menu',
  children,
}: {
  itens: ItemMenuLateral<T>[];
  ativoId: T;
  aoSelecionar: (id: T) => void;
  tituloMenu?: string;
  rotuloBotaoMenu?: string;
  children?: React.ReactNode;
}) {
  const [aberta, setAberta] = useState(false);
  const itemAtivo = itens.find((i) => i.id === ativoId) ?? itens[0];

  return (
    <View style={styles.wrapperGeral}>
      {/* Barra superior compacta com gatilho da Barrinha Lateral + Indicador da seção atual */}
      <View style={styles.subHeaderMenu}>
        <TouchableOpacity
          style={styles.botaoAbrirLateral}
          onPress={() => setAberta((v) => !v)}
        >
          <Text style={styles.iconeHamburguer}>{aberta ? '✕' : '☰'}</Text>
          <Text style={styles.textoBotaoMenu}>{rotuloBotaoMenu}</Text>
        </TouchableOpacity>

        <View style={styles.secaoAtualBox}>
          <Text style={styles.secaoAtualIcone}>{itemAtivo?.icone}</Text>
          <Text style={styles.secaoAtualTexto} numberOfLines={1}>
            {itemAtivo?.rotuloCompleto}
          </Text>
        </View>
      </View>

      {/* Área principal (100% da largura do celular!) + Gaveta Lateral Deslizante */}
      <View style={styles.areaConteudo}>
        {children}

        {aberta && (
          <View style={styles.overlayContainer}>
            {/* Barrinha Lateral Deslizante (Drawer) */}
            <View style={styles.gavetaLateral}>
              <View style={styles.gavetaCabecalho}>
                <Text style={styles.gavetaSobrelinha}>SENAI / ZEISS</Text>
                <Text style={styles.gavetaTitulo}>{tituloMenu}</Text>
              </View>

              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.listaGaveta}
                showsHorizontalScrollIndicator={false}
              >
                {itens.map((item) => {
                  const ativo = item.id === ativoId;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.itemGaveta, ativo && styles.itemGavetaAtivo]}
                      onPress={() => {
                        aoSelecionar(item.id);
                        setAberta(false);
                      }}
                    >
                      <Text style={styles.itemGavetaIcone}>{item.icone}</Text>
                      <Text
                        style={[styles.itemGavetaTexto, ativo && styles.itemGavetaTextoAtivo]}
                        numberOfLines={2}
                      >
                        {item.rotuloCompleto}
                      </Text>
                      {item.badge !== undefined ? (
                        <View style={styles.badgeGaveta}>
                          <Text style={styles.badgeGavetaTexto}>{String(item.badge)}</Text>
                        </View>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Fundo escuro clicável para fechar a barrinha lateral */}
            <TouchableOpacity
              style={styles.backdrop}
              onPress={() => setAberta(false)}
            >
              <View style={{ flex: 1 }} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Barra Inferior Nativa de Ícones Rápidos (estilo iOS / Android moderno) */}
      <View style={styles.barraInferior}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.barraInferiorConteudo}
        >
          {itens.map((item) => {
            const ativo = item.id === ativoId;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.itemInferior, ativo && styles.itemInferiorAtivo]}
                onPress={() => {
                  aoSelecionar(item.id);
                  if (aberta) setAberta(false);
                }}
              >
                <View style={styles.iconeInferiorWrap}>
                  <Text style={styles.iconeInferior}>{item.icone}</Text>
                  {item.badge !== undefined ? (
                    <View style={styles.badgeInferior}>
                      <Text style={styles.badgeInferiorTexto}>{String(item.badge)}</Text>
                    </View>
                  ) : null}
                </View>
                <Text
                  style={[styles.rotuloInferior, ativo && styles.rotuloInferiorAtivo]}
                  numberOfLines={1}
                >
                  {item.rotuloCurto}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapperGeral: {
    flex: 1,
    backgroundColor: CORES.fundo,
  },
  subHeaderMenu: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#093552',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#144b70',
    gap: 10,
  },
  botaoAbrirLateral: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f4c75',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2978ad',
    gap: 6,
  },
  iconeHamburguer: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  textoBotaoMenu: {
    color: '#e0f2fe',
    fontSize: 11.5,
    fontWeight: '700',
  },
  secaoAtualBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  secaoAtualIcone: {
    fontSize: 14,
  },
  secaoAtualTexto: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '700',
    flex: 1,
  },
  areaConteudo: {
    flex: 1,
    position: 'relative',
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    zIndex: 100,
  },
  gavetaLateral: {
    width: 235,
    backgroundColor: '#052236',
    borderRightWidth: 1,
    borderRightColor: '#1e567c',
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  gavetaCabecalho: {
    paddingHorizontal: 8,
    paddingBottom: 10,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#123d5a',
  },
  gavetaSobrelinha: {
    color: '#38bdf8',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  gavetaTitulo: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  listaGaveta: {
    gap: 6,
    paddingBottom: 16,
  },
  itemGaveta: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    gap: 10,
  },
  itemGavetaAtivo: {
    backgroundColor: CORES.azulPrincipal,
  },
  itemGavetaIcone: {
    fontSize: 17,
  },
  itemGavetaTexto: {
    flex: 1,
    color: '#cbd5e1',
    fontSize: 12.5,
    fontWeight: '600',
  },
  itemGavetaTextoAtivo: {
    color: '#ffffff',
    fontWeight: '800',
  },
  badgeGaveta: {
    backgroundColor: '#15a5cc',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeGavetaTexto: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(4, 20, 33, 0.55)',
  },
  barraInferior: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: CORES.borda,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  barraInferiorConteudo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    minWidth: '100%',
    gap: 2,
  },
  itemInferior: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
    minWidth: 64,
  },
  itemInferiorAtivo: {
    backgroundColor: '#e6f5fa',
  },
  iconeInferiorWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconeInferior: {
    fontSize: 16,
  },
  badgeInferior: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: CORES.azulPrincipal,
    borderRadius: 999,
    paddingHorizontal: 4,
    minWidth: 14,
    alignItems: 'center',
  },
  badgeInferiorTexto: {
    color: '#ffffff',
    fontSize: 8.5,
    fontWeight: '800',
  },
  rotuloInferior: {
    fontSize: 10,
    fontWeight: '600',
    color: CORES.textoSecundario,
    marginTop: 2,
  },
  rotuloInferiorAtivo: {
    color: CORES.azulPrincipal,
    fontWeight: '800',
  },
});
