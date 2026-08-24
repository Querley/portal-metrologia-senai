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
    },
  });
  return instancia;
}
