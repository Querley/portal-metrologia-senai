'use client';

import { useEffect } from 'react';

type PostHogNavegador = {
  __loaded?: boolean;
  _i?: unknown[];
  capture?: (evento: string, propriedades?: Record<string, unknown>) => void;
};

declare global {
  interface Window {
    posthog?: PostHogNavegador;
  }
}

const tokenProjeto = 'phc_sAHdSPtBUsfCtsErMn9FcodUSYgtwR4gfKjcYYFkwcKE';
const hostApi = 'https://us.i.posthog.com';
const origemScript = 'https://us-assets.i.posthog.com/static/array.js';

export function PostHogAnalytics() {
  useEffect(() => {
    if (window.posthog?.__loaded || document.querySelector(`script[src="${origemScript}"]`)) return;

    window.posthog = {
      _i: [[tokenProjeto, {
        api_host: hostApi,
        defaults: '2026-05-30',
        autocapture: true,
        capture_pageview: true,
        capture_pageleave: true,
        person_profiles: 'identified_only',
        session_recording: { maskAllInputs: true },
      }, 'posthog']],
    };

    const script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = origemScript;
    document.head.appendChild(script);
  }, []);

  return null;
}

export function capturarEventoPostHog(evento: string, propriedades?: Record<string, unknown>) {
  window.posthog?.capture?.(evento, propriedades);
}
