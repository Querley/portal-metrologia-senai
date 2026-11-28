import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CORES } from '../../theme';

/**
 * Slider tátil estilo barra de brilho de celular (0% a 100%).
 * Atualiza o valor visualmente durante o arraste e salva no Supabase ao soltar.
 */
export function SliderProgressoEtapa({
  valor,
  aoConfirmar,
}: {
  valor: number;
  aoConfirmar: (novoPercentual: number) => void;
}) {
  const [valorLocal, setValorLocal] = useState(valor);
  const valorLocalRef = useRef(valor);
  const larguraTrilhoRef = useRef(260);

  useEffect(() => {
    setValorLocal(valor);
    valorLocalRef.current = valor;
  }, [valor]);

  function atualizarLocal(novo: number) {
    const limitado = Math.max(0, Math.min(100, Math.round(novo)));
    setValorLocal(limitado);
    valorLocalRef.current = limitado;
  }

  const corPreenchimento =
    valorLocal === 100 ? '#059669' : valorLocal > 0 ? CORES.azulPrincipal : '#94A3B8';

  if (typeof document !== 'undefined') {
    return (
      <View style={styles.container}>
        <View style={styles.trilhoBrilho}>
          <View
            style={[
              styles.preenchimentoBrilho,
              { width: `${valorLocal}%`, backgroundColor: corPreenchimento },
            ]}
          />
          <View style={styles.conteudoSobreTrilho}>
            <Text style={[styles.iconeSol, valorLocal > 25 && { color: '#FFFFFF' }]}>☀️</Text>
            <Text style={[styles.textoPct, valorLocal > 82 && { color: '#FFFFFF' }]}>
              {valorLocal}%
            </Text>
          </View>
          {React.createElement('input', {
            type: 'range',
            min: 0,
            max: 100,
            step: 1,
            value: valorLocal,
            'aria-label': 'Progresso da etapa',
            onChange: (e: { target: { value: string } }) =>
              atualizarLocal(Number(e.target.value)),
            onMouseUp: () => aoConfirmar(valorLocalRef.current),
            onTouchEnd: () => aoConfirmar(valorLocalRef.current),
            style: {
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: 'pointer',
              margin: 0,
            },
          })}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View
        style={styles.trilhoBrilho}
        onLayout={(e: { nativeEvent: { layout: { width: number } } }) => {
          if (e.nativeEvent.layout.width > 0) {
            larguraTrilhoRef.current = e.nativeEvent.layout.width;
          }
        }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(e: { nativeEvent: { locationX: number } }) => {
          atualizarLocal((e.nativeEvent.locationX / larguraTrilhoRef.current) * 100);
        }}
        onResponderMove={(e: { nativeEvent: { locationX: number } }) => {
          atualizarLocal((e.nativeEvent.locationX / larguraTrilhoRef.current) * 100);
        }}
        onResponderRelease={() => {
          aoConfirmar(valorLocalRef.current);
        }}
      >
        <View
          style={[
            styles.preenchimentoBrilho,
            { width: `${valorLocal}%`, backgroundColor: corPreenchimento },
          ]}
        />
        <View style={styles.conteudoSobreTrilho}>
          <Text style={[styles.iconeSol, valorLocal > 25 && { color: '#FFFFFF' }]}>☀️</Text>
          <Text style={[styles.textoPct, valorLocal > 82 && { color: '#FFFFFF' }]}>
            {valorLocal}%
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 8 },
  trilhoBrilho: {
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
  },
  preenchimentoBrilho: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 16,
  },
  conteudoSobreTrilho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    zIndex: 1,
  },
  iconeSol: { fontSize: 13, color: CORES.azulEscuro },
  textoPct: { fontSize: 12.5, fontWeight: '900', color: CORES.azulEscuro },
});
