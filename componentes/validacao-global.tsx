'use client';

import type { ReactNode } from 'react';

function rotuloDoCampo(campo: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string {
  const rotulo = campo.labels?.[0]?.textContent?.replace(/\s+/g, ' ').trim();
  return rotulo || campo.getAttribute('aria-label') || campo.name || 'este campo';
}

export function mensagemCampoInvalido(campo: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string {
  const nome = rotuloDoCampo(campo);
  if (campo.validity.valueMissing) return `Preencha “${nome}”.`;
  if (campo.validity.typeMismatch && campo instanceof HTMLInputElement && campo.type === 'email') return 'Informe um e-mail válido, no formato nome@dominio.';
  if (campo.validity.tooShort || (campo.minLength > 0 && campo.value.length < campo.minLength)) return `“${nome}” precisa ter pelo menos ${campo.minLength} caracteres.`;
  if (campo.validity.tooLong) return `“${nome}” aceita no máximo ${campo.maxLength} caracteres.`;
  if (campo.validity.rangeUnderflow) return `“${nome}” deve ser igual ou maior que ${campo.getAttribute('min')}.`;
  if (campo.validity.rangeOverflow) return `“${nome}” deve ser igual ou menor que ${campo.getAttribute('max')}.`;
  if (campo.validity.stepMismatch) return `Use um valor válido para “${nome}”, respeitando o intervalo informado.`;
  if (campo.validity.patternMismatch) return campo.title || `Use o formato solicitado em “${nome}”.`;
  if (campo.validity.badInput) return `Informe um valor válido em “${nome}”.`;
  return `Revise o conteúdo de “${nome}”.`;
}

export function campoEstaInvalido(campo: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): boolean {
  return !campo.validity.valid || (campo.minLength > 0 && campo.value.length < campo.minLength) || (campo.maxLength > 0 && campo.value.length > campo.maxLength);
}

export function ValidacaoGlobal({ children }: { children: ReactNode }) {
  return (
    <div
      className="validacao-global"
      onInvalidCapture={(evento) => {
        const campo = evento.target;
        if (campo instanceof HTMLInputElement || campo instanceof HTMLTextAreaElement || campo instanceof HTMLSelectElement) {
          campo.setCustomValidity('');
          if (!campo.validity.valid) campo.setCustomValidity(mensagemCampoInvalido(campo));
        }
      }}
      onInputCapture={(evento) => {
        const campo = evento.target;
        if (campo instanceof HTMLInputElement || campo instanceof HTMLTextAreaElement || campo instanceof HTMLSelectElement) campo.setCustomValidity('');
      }}
    >
      {children}
    </div>
  );
}
