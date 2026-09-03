'use client';

import { Check, Copy, ExternalLink, Mail } from 'lucide-react';
import { useState } from 'react';

export const EMAIL_CONTATO_PROVISORIO = 'querleyjuniorodriguesferreira@gmail.com';

export function ContatoEmail({ compacto = false, contexto }: { compacto?: boolean; contexto?: string } = {}) {
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

  const assunto = contexto ? `Solicitação de análise metrológica — ${contexto}` : 'Solicitação de análise metrológica';
  const mailto = `mailto:${EMAIL_CONTATO_PROVISORIO}?subject=${encodeURIComponent(assunto)}`;
  const gmail = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(EMAIL_CONTATO_PROVISORIO)}&su=${encodeURIComponent(assunto)}`;

  return <section className={`contato-email${compacto ? ' contato-email-compacto' : ''}`} aria-label="Contato por e-mail"><div><p className="sobrelinha"><span /> OUTRO CANAL</p><h2>Também é possível enviar por e-mail</h2><p>Se preferir, descreva sua necessidade e envie os arquivos diretamente à equipe. Mensagens por e-mail não geram protocolo automaticamente; o laboratório fará a triagem e orientará o próximo passo. O endereço exibido ainda é provisório.</p></div><div className="acoes-email"><strong>{EMAIL_CONTATO_PROVISORIO}</strong><div><a className="botao" href={mailto} onClick={() => setMensagem('Se nada abriu, seu dispositivo não possui um aplicativo de e-mail associado. Use Gmail ou copie o endereço.')}><Mail size={17} /> Abrir aplicativo</a><a className="botao-secundario-email" href={gmail} target="_blank" rel="noreferrer"><ExternalLink size={17} /> Abrir Gmail</a><button type="button" onClick={() => void copiar()}>{copiado ? <Check size={17} /> : <Copy size={17} />}{copiado ? 'Copiado' : 'Copiar'}</button></div>{mensagem && <p className="mensagem-email" role="status">{mensagem}</p>}</div></section>;
}
