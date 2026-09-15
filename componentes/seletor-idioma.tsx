'use client';

import { Languages } from 'lucide-react';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { CHAVE_IDIOMA_PUBLICO, EVENTO_IDIOMA_PUBLICO, idiomasPublicos, resolverIdiomaPublico, rotulosIdiomaPublico, urlComIdioma, type IdiomaPublico } from '../lib/idioma-publico';

export function SeletorIdioma({ compacto = false }: { compacto?: boolean }) {
  const [idioma, setIdioma] = useState<IdiomaPublico>('pt-BR');
  const hidratado = useSyncExternalStore(() => () => undefined, () => true, () => false);

  useEffect(() => {
    const resolvido = resolverIdiomaPublico(window.location.href, window.localStorage.getItem(CHAVE_IDIOMA_PUBLICO));
    queueMicrotask(() => setIdioma(resolvido));
    document.documentElement.lang = resolvido;
    window.localStorage.setItem(CHAVE_IDIOMA_PUBLICO, resolvido);
    window.dispatchEvent(new CustomEvent(EVENTO_IDIOMA_PUBLICO, { detail: resolvido }));
  }, []);

  function alterar(novoIdioma: IdiomaPublico) {
    setIdioma(novoIdioma);
    window.localStorage.setItem(CHAVE_IDIOMA_PUBLICO, novoIdioma);
    window.history.replaceState({}, '', urlComIdioma(window.location.href, novoIdioma));
    document.documentElement.lang = novoIdioma;
    window.dispatchEvent(new CustomEvent(EVENTO_IDIOMA_PUBLICO, { detail: novoIdioma }));
  }

  return <label className={`seletor-idioma${compacto ? ' seletor-idioma-compacto' : ''}`} aria-label="Idioma" data-hidratado={hidratado ? 'sim' : 'nao'}><Languages size={15} aria-hidden="true" /><select disabled={!hidratado} value={idioma} onChange={(evento) => alterar(evento.target.value as IdiomaPublico)}>{idiomasPublicos.map((item) => <option value={item} key={item}>{rotulosIdiomaPublico[item]}</option>)}</select></label>;
}
