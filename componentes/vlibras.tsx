'use client';

import { createElement, useEffect } from 'react';

declare global {
  interface Window {
    VLibras?: { Widget: new (endereco: string) => unknown };
  }
}

export function VLibras() {
  useEffect(() => {
    const iniciar = () => {
      if (window.VLibras && !document.documentElement.dataset.vlibrasIniciado) {
        new window.VLibras.Widget('https://vlibras.gov.br/app');
        document.documentElement.dataset.vlibrasIniciado = 'sim';
      }
    };
    const existente = document.querySelector<HTMLScriptElement>('script[data-vlibras-script]');
    if (existente) {
      if (window.VLibras) iniciar();
      else existente.addEventListener('load', iniciar, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://vlibras.gov.br/app/vlibras-plugin.js';
    script.async = true;
    script.dataset.vlibrasScript = 'sim';
    script.addEventListener('load', iniciar, { once: true });
    document.body.appendChild(script);
  }, []);

  return createElement('div', { vw: '', className: 'enabled' },
    createElement('div', { 'vw-access-button': '', className: 'active' }),
    createElement('div', { 'vw-plugin-wrapper': '' }, createElement('div', { className: 'vw-plugin-top-wrapper' })),
  );
}
