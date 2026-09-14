'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { configuracaoSupabase } from './configuracao';

let instancia: SupabaseClient | null = null;

export function obterClienteSupabase(): SupabaseClient | null {
  if (!configuracaoSupabase) return null;
  instancia ??= createClient(configuracaoSupabase.url, configuracaoSupabase.chaveAnonima, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Cada aba mantém sua própria identidade. Assim, o laboratório pode validar
      // o portal do Cliente em outra aba sem derrubar ou substituir sua sessão.
      storage: typeof window === 'undefined' ? undefined : window.sessionStorage,
    },
  });
  return instancia;
}
