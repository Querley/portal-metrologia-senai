'use client';

import { useEffect, useState } from 'react';
import type { IdiomaPublico } from '../lib/idioma-publico';
import { resolverIdiomaPublico } from '../lib/idioma-publico';
import { obterClienteSupabase } from '../lib/supabase/cliente';
import { CHAVE_IDIOMA_PUBLICO, EVENTO_IDIOMA_PUBLICO } from './seletor-idioma';

type ConteudoPublicado = { chave: string; idioma: IdiomaPublico; titulo: string; corpo: { texto?: string }; usou_fallback: boolean };

export function CabecalhoCms({ chave, tituloPadrao, textoPadrao }: { chave: string; tituloPadrao: string; textoPadrao: string }) {
  const [conteudo, setConteudo] = useState<{ titulo: string; texto: string; fallback: boolean }>({ titulo: tituloPadrao, texto: textoPadrao, fallback: false });

  useEffect(() => {
    let ativo = true;
    const cliente = obterClienteSupabase();
    async function carregar(idiomaInformado?: IdiomaPublico) {
      if (!cliente) return;
      const idioma = idiomaInformado ?? resolverIdiomaPublico(window.location.href, window.localStorage.getItem(CHAVE_IDIOMA_PUBLICO));
      const { data, error } = await cliente.rpc('listar_conteudos_publicados', { idioma_desejado: idioma });
      if (!ativo || error) return;
      const encontrado = ((data ?? []) as ConteudoPublicado[]).find((item) => item.chave === chave);
      if (encontrado) setConteudo({ titulo: encontrado.titulo, texto: encontrado.corpo.texto || textoPadrao, fallback: encontrado.usou_fallback });
    }
    function aoAlterar(evento: Event) { void carregar((evento as CustomEvent<IdiomaPublico>).detail); }
    void carregar();
    window.addEventListener(EVENTO_IDIOMA_PUBLICO, aoAlterar);
    return () => { ativo = false; window.removeEventListener(EVENTO_IDIOMA_PUBLICO, aoAlterar); };
  }, [chave, textoPadrao]);

  return <><h1>{conteudo.titulo}</h1><p>{conteudo.texto}</p>{conteudo.fallback && <small className="aviso-traducao">Conteúdo exibido em português porque esta tradução ainda não foi publicada.</small>}</>;
}
