'use client';

import { useEffect, useState } from 'react';
import type { IdiomaPublico } from '../lib/idioma-publico';
import { obterClienteSupabase } from '../lib/supabase/cliente';
import { useTraducaoPublica } from '../lib/traducao-publica';

type ConteudoPublicado = { chave: string; idioma: IdiomaPublico; titulo: string; corpo: { texto?: string }; usou_fallback: boolean };

export function CabecalhoCms({ chave, tituloPadrao, textoPadrao }: { chave: string; tituloPadrao: string; textoPadrao: string }) {
  const { idioma, t } = useTraducaoPublica();
  const [conteudoCms, setConteudoCms] = useState<{ idioma: IdiomaPublico; titulo: string; texto: string; fallback: boolean } | null>(null);

  useEffect(() => {
    let ativo = true;
    const cliente = obterClienteSupabase();
    async function carregar() {
      if (!cliente) return;
      const { data, error } = await cliente.rpc('listar_conteudos_publicados', { idioma_desejado: idioma });
      if (!ativo || error) return;
      const encontrado = ((data ?? []) as ConteudoPublicado[]).find((item) => item.chave === chave);
      if (encontrado) setConteudoCms({ idioma, titulo: encontrado.titulo, texto: encontrado.corpo.texto || textoPadrao, fallback: encontrado.usou_fallback });
    }
    void carregar();
    return () => { ativo = false; };
  }, [chave, idioma, textoPadrao]);

  const conteudo = conteudoCms?.idioma === idioma
    ? conteudoCms
    : { titulo: tituloPadrao, texto: textoPadrao, fallback: false };

  return <><h1>{conteudo.titulo}</h1><p>{conteudo.texto}</p>{conteudo.fallback && <small className="aviso-traducao">{t('Conteúdo exibido em português porque esta tradução ainda não foi publicada.')}</small>}</>;
}
