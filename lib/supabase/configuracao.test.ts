import { describe, expect, it } from 'vitest';
import { validarConfiguracaoSupabase } from './configuracao';

describe('configuração pública do Supabase', () => {
  it('falha de forma segura quando uma credencial está ausente', () => {
    expect(validarConfiguracaoSupabase(undefined, undefined)).toBeNull();
    expect(validarConfiguracaoSupabase('https://homologacao.supabase.co', '')).toBeNull();
  });

  it('aceita HTTPS remoto e HTTP apenas no ambiente local', () => {
    expect(validarConfiguracaoSupabase('https://homologacao.supabase.co/', 'chave-publica')).toEqual({
      url: 'https://homologacao.supabase.co',
      chaveAnonima: 'chave-publica',
    });
    expect(validarConfiguracaoSupabase('http://localhost:54321', 'chave-local')).not.toBeNull();
    expect(validarConfiguracaoSupabase('http://supabase.exemplo.com', 'chave-insegura')).toBeNull();
  });
});
