'use client';

import { CircleCheck, CircleX, Info, X } from 'lucide-react';
import { useEffect } from 'react';

export function NotificacaoFlutuante({ mensagem, tipo = 'sucesso', aoFechar }: { mensagem: string; tipo?: 'sucesso' | 'erro' | 'informacao'; aoFechar: () => void }) {
  useEffect(() => {
    if (!mensagem || tipo === 'erro') return;
    const temporizador = window.setTimeout(aoFechar, 7000);
    return () => window.clearTimeout(temporizador);
  }, [aoFechar, mensagem, tipo]);

  if (!mensagem) return null;
  const Icone = tipo === 'sucesso' ? CircleCheck : tipo === 'erro' ? CircleX : Info;
  return (
    <div className={`notificacao-flutuante notificacao-${tipo}`} role={tipo === 'erro' ? 'alert' : 'status'} aria-live="assertive">
      <Icone size={24} aria-hidden="true" />
      <p>{mensagem}</p>
      <button type="button" onClick={aoFechar} aria-label="Fechar mensagem">
        <X size={20} />
      </button>
    </div>
  );
}
