import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CORES } from '../../theme';

/**
 * Barra de progresso tátil (0% a 100%) clicável e arrastável em toda a área.
 * Atualiza visualmente durante o arraste e salva no Supabase ao soltar.
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
  const arrastandoRef = useRef(false);
  const larguraTrilhoRef = useRef(260);
  const divTrilhoRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setValorLocal(valor);
    valorLocalRef.current = valor;
  }, [valor]);

  function atualizarLocal(novo: number) {
    const limitado = Math.max(0, Math.min(100, Math.round(novo)));
    setValorLocal(limitado);
    valorLocalRef.current = limitado;
  }

  function calcularPctPorClientX(clientX: number): number {
    const rect = divTrilhoRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return valorLocalRef.current;
    return ((clientX - rect.left) / rect.width) * 100;
  }

  const corPreenchimento =
    valorLocal === 100 ? '#059669' : valorLocal > 0 ? CORES.azulPrincipal : '#94A3B8';

  if (typeof document !== 'undefined') {
    return (
      <View style={styles.linha}>
        <div
          ref={divTrilhoRef}
          role="slider"
          aria-label="Progresso da etapa"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={valorLocal}
          tabIndex={0}
          onPointerDown={(e) => {
            arrastandoRef.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            atualizarLocal(calcularPctPorClientX(e.clientX));
          }}
          onPointerMove={(e) => {
            if (!arrastandoRef.current) return;
            atualizarLocal(calcularPctPorClientX(e.clientX));
          }}
          onPointerUp={() => {
            if (!arrastandoRef.current) return;
            arrastandoRef.current = false;
            aoConfirmar(valorLocalRef.current);
          }}
          onPointerCancel={() => {
            arrastandoRef.current = false;
          }}
          style={{
            flex: 1,
            height: 22,
            borderRadius: 999,
            backgroundColor: '#E2E8F0',
            position: 'relative',
            cursor: 'pointer',
            userSelect: 'none',
            touchAction: 'none',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              width: `${valorLocal}%`,
              height: '100%',
              borderRadius: 999,
              backgroundColor: corPreenchimento,
              pointerEvents: 'none',
              transition: arrastandoRef.current ? 'none' : 'width 120ms ease',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: `calc(${valorLocal}% - 9px)`,
              width: 18,
              height: 18,
              borderRadius: '50%',
              backgroundColor: '#FFFFFF',
              border: `2.5px solid ${corPreenchimento}`,
              boxShadow: '0 1px 4px rgba(0,0,0,0.22)',
              pointerEvents: 'none',
            }}
          />
        </div>
        <Text style={styles.textoPct}>{valorLocal}%</Text>
      </View>
    );
  }

  return (
    <View style={styles.linha}>
      <View
        style={styles.trilhoNativo}
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
            styles.preenchimentoNativo,
            { width: `${valorLocal}%`, backgroundColor: corPreenchimento },
          ]}
        />
      </View>
      <Text style={styles.textoPct}>{valorLocal}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  trilhoNativo: {
    flex: 1,
    height: 22,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  preenchimentoNativo: {
    height: '100%',
    borderRadius: 999,
  },
  textoPct: {
    width: 42,
    textAlign: 'right',
    fontSize: 12.5,
    fontWeight: '900',
    color: CORES.azulEscuro,
  },
});
