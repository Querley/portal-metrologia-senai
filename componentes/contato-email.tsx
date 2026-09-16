'use client';

import { Check, Copy, ExternalLink, Mail } from 'lucide-react';
import { useState } from 'react';
import { NotificacaoFlutuante } from './notificacao-flutuante';
import { useTraducaoPublica } from '../lib/traducao-publica';

export const EMAIL_CONTATO = 'cem.senaizeiss@fieg.com.br';

export function ContatoEmail({ compacto = false, contexto }: { compacto?: boolean; contexto?: string } = {}) {
  const { t } = useTraducaoPublica();
  const [copiado, setCopiado] = useState(false);
  const [mensagem, setMensagem] = useState('');

  async function copiar() {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(EMAIL_CONTATO);
      else throw new Error('Clipboard API indisponível');
    } catch {
      const campo = document.createElement('textarea');
      campo.value = EMAIL_CONTATO;
      campo.style.position = 'fixed';
      campo.style.opacity = '0';
      document.body.appendChild(campo);
      campo.select();
      document.execCommand('copy');
      campo.remove();
    }
    setCopiado(true);
    setMensagem(t('Endereço copiado. Cole-o no aplicativo de e-mail que preferir.'));
    window.setTimeout(() => setCopiado(false), 2200);
  }

  const assuntoBase = t('Solicitação de análise metrológica');
  const assunto = contexto ? `${assuntoBase} — ${contexto}` : assuntoBase;
  const mailto = `mailto:${EMAIL_CONTATO}?subject=${encodeURIComponent(assunto)}`;
  const gmail = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(EMAIL_CONTATO)}&su=${encodeURIComponent(assunto)}`;

  return <section className={`contato-email${compacto ? ' contato-email-compacto' : ''}`} aria-label={t('Contato por e-mail')}><NotificacaoFlutuante mensagem={mensagem} tipo="informacao" aoFechar={() => setMensagem('')} /><div><p className="sobrelinha"><span /> {t('Outro canal').toUpperCase()}</p><h2>{t('Também é possível enviar por e-mail')}</h2><p>{t('Se preferir, descreva sua necessidade e envie os arquivos diretamente à equipe. Mensagens por e-mail não geram protocolo automaticamente; o laboratório fará a triagem e orientará o próximo passo.')}</p></div><div className="acoes-email"><strong>{EMAIL_CONTATO}</strong><div><a className="botao" href={mailto}><Mail size={17} /> {t('Abrir aplicativo')}</a><a className="botao-secundario-email" href={gmail} target="_blank" rel="noreferrer"><ExternalLink size={17} /> {t('Abrir Gmail')}</a><button type="button" onClick={() => void copiar()}>{copiado ? <Check size={17} /> : <Copy size={17} />}{copiado ? t('Copiado') : t('Copiar')}</button></div></div></section>;
}
