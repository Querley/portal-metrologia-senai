'use client';

import { Check, Copy, ExternalLink, Mail } from 'lucide-react';
import { useState } from 'react';

export const EMAIL_CONTATO_PROVISORIO = 'querleyjuniorodriguesferreira@gmail.com';

export function ContatoEmail() {
  const [copiado, setCopiado] = useState(false);
  const [mensagem, setMensagem] = useState('');

  async function copiar() {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(EMAIL_CONTATO_PROVISORIO);
      else throw new Error('Clipboard API indisponível');
    } catch {
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
    setMensagem('Endereço copiado. Cole-o no aplicativo de e-mail que preferir.');
    window.setTimeout(() => setCopiado(false), 2200);
  }

  const assunto = 'Solicitação de análise metrológica';
  const mailto = `mailto:${EMAIL_CONTATO_PROVISORIO}?subject=${encodeURIComponent(assunto)}`;
  const gmail = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(EMAIL_CONTATO_PROVISORIO)}&su=${encodeURIComponent(assunto)}`;

  return <section className="contato-email" aria-labelledby="titulo-contato-email"><div><p className="sobrelinha"><span /> CONTATO DIRETO</p><h2 id="titulo-contato-email">Prefere falar por e-mail?</h2><p>Abra seu aplicativo de e-mail, escreva pelo Gmail no navegador ou copie o endereço. O canal exibido ainda é provisório.</p></div><div className="acoes-email"><strong>{EMAIL_CONTATO_PROVISORIO}</strong><div><a className="botao" href={mailto} onClick={() => setMensagem('Se nada abriu, seu dispositivo não possui um aplicativo de e-mail associado. Use Gmail ou copie o endereço.')}><Mail size={17} /> Abrir aplicativo</a><a className="botao-secundario-email" href={gmail} target="_blank" rel="noreferrer"><ExternalLink size={17} /> Abrir Gmail</a><button type="button" onClick={() => void copiar()}>{copiado ? <Check size={17} /> : <Copy size={17} />}{copiado ? 'Copiado' : 'Copiar'}</button></div>{mensagem && <p className="mensagem-email" role="status">{mensagem}</p>}</div></section>;
}
