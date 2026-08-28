'use client';

import { Check, Copy, Mail } from 'lucide-react';
import { useState } from 'react';

export const EMAIL_CONTATO_PROVISORIO = 'metrologia@exemplo.senai.br';

export function ContatoEmail() {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(EMAIL_CONTATO_PROVISORIO);
    else {
      const campo = document.createElement('textarea');
      campo.value = EMAIL_CONTATO_PROVISORIO;
      campo.style.position = 'fixed';
      campo.style.opacity = '0';
      document.body.appendChild(campo);
      campo.select();
      document.execCommand('copy');
      campo.remove();
    }
    setCopiado(true);
    window.setTimeout(() => setCopiado(false), 2200);
  }

  return <section className="contato-email" aria-labelledby="titulo-contato-email"><div><p className="sobrelinha"><span /> CONTATO DIRETO</p><h2 id="titulo-contato-email">Prefere falar por e-mail?</h2><p>Abra seu aplicativo de e-mail ou copie o endereço abaixo. O endereço exibido é provisório e será substituído quando o canal oficial for confirmado.</p></div><div className="acoes-email"><strong>{EMAIL_CONTATO_PROVISORIO}</strong><div><a className="botao" href={`mailto:${EMAIL_CONTATO_PROVISORIO}?subject=Solicitação%20de%20análise%20metrológica`}><Mail size={17} /> Abrir e-mail</a><button type="button" onClick={() => void copiar()}>{copiado ? <Check size={17} /> : <Copy size={17} />}{copiado ? 'Copiado' : 'Copiar endereço'}</button></div></div></section>;
}
