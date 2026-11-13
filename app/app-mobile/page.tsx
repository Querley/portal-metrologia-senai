'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import MobileApp from '../../mobile/App';

export default function PaginaSimuladorMobile() {
  const [modoMoldura, setModoMoldura] = useState<'celular' | 'tela-cheia'>('celular');
  const [escalaAuto, setEscalaAuto] = useState<number>(1);
  const [modoEscala, setModoEscala] = useState<'auto' | '100'>('auto');

  useEffect(() => {
    function calcularEscalaIdeal() {
      // Altura total do chassi do smartphone = 836px + 54px do header + 28px de margem
      const alturaDisponivel = window.innerHeight - 76;
      const larguraDisponivel = window.innerWidth - 32;
      const escalaAltura = alturaDisponivel / 836;
      const escalaLargura = larguraDisponivel / 405;
      const calculada = Math.min(1, Math.max(0.62, Math.min(escalaAltura, escalaLargura)));
      setEscalaAuto(Number(calculada.toFixed(3)));
    }

    calcularEscalaIdeal();
    window.addEventListener('resize', calcularEscalaIdeal);
    return () => window.removeEventListener('resize', calcularEscalaIdeal);
  }, []);

  const escalaFinal = modoEscala === '100' ? 1 : escalaAuto;

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#061523',
        backgroundImage:
          'radial-gradient(circle at 50% 20%, #0f3150 0%, #061523 70%)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Estilo para ocultar barras de rolagem grossas de desktop dentro do celular */}
      <style>{`
        .rn-scroll-view::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }
        .rn-scroll-view::-webkit-scrollbar-track {
          background: transparent;
        }
        .rn-scroll-view::-webkit-scrollbar-thumb {
          background: rgba(100, 116, 139, 0.35);
          border-radius: 999px;
        }
        .rn-scroll-view::-webkit-scrollbar-button {
          display: none;
        }
      `}</style>

      {/* Barra de controle do Simulador no topo */}
      <header
        style={{
          height: '52px',
          backgroundColor: 'rgba(11, 41, 66, 0.92)',
          borderBottom: '1px solid #1e496d',
          padding: '0 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          color: '#ffffff',
          zIndex: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              backgroundColor: '#0875ad',
              color: '#ffffff',
              fontSize: '10.5px',
              fontWeight: 800,
              padding: '3px 9px',
              borderRadius: '999px',
              letterSpacing: '0.06em',
            }}
          >
            REACT NATIVE • PROPORÇÃO REAL 9:19.5 (375×812)
          </span>
          <strong style={{ fontSize: '14px' }}>
            App Mobile — Portal de Metrologia SENAI / ZEISS
          </strong>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {modoMoldura === 'celular' && (
            <button
              type="button"
              onClick={() => setModoEscala((m) => (m === 'auto' ? '100' : 'auto'))}
              style={{
                backgroundColor: '#0f2f4a',
                color: '#bae6fd',
                border: '1px solid #2b6796',
                borderRadius: '8px',
                padding: '5px 10px',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
              title="Alternar entre ajuste proporcional à altura do monitor e tamanho 100% em pixels"
            >
              🔍 Zoom: {modoEscala === 'auto' ? `Auto (${Math.round(escalaFinal * 100)}%)` : '100% Fixo'}
            </button>
          )}
          <button
            type="button"
            onClick={() => setModoMoldura('celular')}
            style={{
              backgroundColor: modoMoldura === 'celular' ? '#15a5cc' : '#133b5c',
              color: '#ffffff',
              border: '1px solid #2b6796',
              borderRadius: '8px',
              padding: '5px 11px',
              fontSize: '11.5px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            📱 Smartphone (375×812)
          </button>
          <button
            type="button"
            onClick={() => setModoMoldura('tela-cheia')}
            style={{
              backgroundColor: modoMoldura === 'tela-cheia' ? '#15a5cc' : '#133b5c',
              color: '#ffffff',
              border: '1px solid #2b6796',
              borderRadius: '8px',
              padding: '5px 11px',
              fontSize: '11.5px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            🖥️ Tela Cheia
          </button>
          <Link
            href="/"
            style={{
              backgroundColor: '#ffffff',
              color: '#07304a',
              textDecoration: 'none',
              borderRadius: '8px',
              padding: '5px 11px',
              fontSize: '11.5px',
              fontWeight: 800,
            }}
          >
            Portal Web →
          </Link>
        </div>
      </header>

      {/* Corpo com o Simulador de Smartphone em Proporção Real 9:19.5 */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: modoMoldura === 'celular' ? '10px' : '0',
          overflow: modoEscala === '100' ? 'auto' : 'hidden',
        }}
      >
        {modoMoldura === 'celular' ? (
          <div
            style={{
              width: `${Math.round(399 * escalaFinal)}px`,
              height: `${Math.round(836 * escalaFinal)}px`,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            {/* Chassi físico do Smartphone (fixo em 399x836 com tela interna de exatos 375x812, escalado proporcionalmente sem achatar!) */}
            <div
              style={{
                width: '399px',
                height: '836px',
                transform: `scale(${escalaFinal})`,
                transformOrigin: 'top center',
                backgroundColor: '#0e1726',
                borderRadius: '54px',
                padding: '12px',
                boxShadow:
                  '0 30px 70px rgba(0, 0, 0, 0.7), 0 0 0 2px #334155, inset 0 0 0 2px #1e293b',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                boxSizing: 'border-box',
              }}
            >
              {/* Botões físicos laterais do celular (Volume e Power) */}
              <div
                style={{
                  position: 'absolute',
                  left: '-4px',
                  top: '130px',
                  width: '4px',
                  height: '32px',
                  backgroundColor: '#475569',
                  borderTopLeftRadius: '4px',
                  borderBottomLeftRadius: '4px',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: '-4px',
                  top: '178px',
                  width: '4px',
                  height: '56px',
                  backgroundColor: '#475569',
                  borderTopLeftRadius: '4px',
                  borderBottomLeftRadius: '4px',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: '-4px',
                  top: '246px',
                  width: '4px',
                  height: '56px',
                  backgroundColor: '#475569',
                  borderTopLeftRadius: '4px',
                  borderBottomLeftRadius: '4px',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  right: '-4px',
                  top: '195px',
                  width: '4px',
                  height: '78px',
                  backgroundColor: '#475569',
                  borderTopRightRadius: '4px',
                  borderBottomRightRadius: '4px',
                }}
              />

              {/* Tela OLED 375x812 (proporção exata iPhone 15 / Galaxy S24) */}
              <div
                style={{
                  width: '375px',
                  height: '812px',
                  backgroundColor: '#f3f7f9',
                  borderRadius: '42px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                }}
              >
                {/* Barra de Status Nativa com Dynamic Island */}
                <div
                  style={{
                    height: '34px',
                    backgroundColor: '#052236',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 22px',
                    color: '#e2e8f0',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  <span>9:41</span>
                  <div
                    style={{
                      width: '96px',
                      height: '20px',
                      backgroundColor: '#000000',
                      borderRadius: '999px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      paddingRight: '8px',
                    }}
                  >
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '10.5px' }}>5G • 100%</span>
                </div>

                {/* Conteúdo do App React Native */}
                <div
                  style={{
                    flex: 1,
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                  }}
                >
                  <MobileApp />
                </div>

                {/* Home Indicator nativo na base do smartphone */}
                <div
                  style={{
                    height: '16px',
                    backgroundColor: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: '128px',
                      height: '4.5px',
                      backgroundColor: '#94a3b8',
                      borderRadius: '999px',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              width: '100%',
              height: 'calc(100vh - 52px)',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#f3f7f9',
            }}
          >
            <MobileApp />
          </div>
        )}
      </main>
    </div>
  );
}
