export type ConfiguracaoSupabase = {
  url: string;
  chaveAnonima: string;
};

export function validarConfiguracaoSupabase(urlInformada?: string, chaveInformada?: string): ConfiguracaoSupabase | null {
  const url = urlInformada?.trim();
  const chaveAnonima = chaveInformada?.trim();
  if (!url || !chaveAnonima) return null;

  try {
    const endereco = new URL(url);
    const local = endereco.hostname === 'localhost' || endereco.hostname === '127.0.0.1';
    if (endereco.protocol !== 'https:' && !(local && endereco.protocol === 'http:')) return null;
  } catch {
    return null;
  }

  return { url: url.replace(/\/$/, ''), chaveAnonima };
}

export const configuracaoSupabase = validarConfiguracaoSupabase(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
