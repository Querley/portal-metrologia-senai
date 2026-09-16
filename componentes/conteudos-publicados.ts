'use client';

import { useEffect, useState } from 'react';
import { useIdiomaPublico } from '../lib/traducao-publica';
import { obterClienteSupabase } from '../lib/supabase/cliente';

export type ConteudoPublicado = {
  chave: string;
  idioma: string;
  titulo: string;
  corpo: {
    texto?: string;
    midia_url?: string;
    midia_tipo?: 'imagem' | 'video';
    midia_alt?: string;
  };
  usou_fallback: boolean;
};

export function useConteudosPublicados(chaves: readonly string[]) {
  const idioma = useIdiomaPublico();
  const [resultado, setResultado] = useState<{ idioma: string; conteudos: Record<string, ConteudoPublicado> }>({ idioma: '', conteudos: {} });
  const assinatura = chaves.join('|');

  useEffect(() => {
    const cliente = obterClienteSupabase();
    let ativo = true;
    if (!cliente) return () => { ativo = false; };
    void cliente.rpc('listar_conteudos_publicados', { idioma_desejado: idioma }).then(({ data, error }) => {
      if (!ativo || error) return;
      const desejadas = new Set(assinatura.split('|'));
      const mapa = Object.fromEntries(((data ?? []) as ConteudoPublicado[]).filter((item) => desejadas.has(item.chave)).map((item) => [item.chave, item]));
      setResultado({ idioma, conteudos: mapa });
    });
    return () => { ativo = false; };
  }, [assinatura, idioma]);

  return resultado.idioma === idioma ? resultado.conteudos : {};
}
