'use client';

import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useSyncExternalStore } from 'react';
import type { MidiaEquipamento } from '../lib/equipamentos';
import { VideoPublico } from './video-publico';
import { useTraducaoPublica } from '../lib/traducao-publica';

export function CarrosselMidia({ midias, rotulo }: { midias: MidiaEquipamento[]; rotulo: string }) {
  const { t } = useTraducaoPublica();
  const [indice, setIndice] = useState(0);
  const hidratado = useSyncExternalStore(() => () => undefined, () => true, () => false);
  const atual = midias[indice];
  const selecionar = (novoIndice: number) => {
    if (novoIndice === indice) return;
    setIndice(novoIndice);
  };
  const navegar = (direcao: number) => selecionar((indice + direcao + midias.length) % midias.length);

  return (
    <section className="carrossel" data-hidratado={hidratado ? 'sim' : 'nao'} aria-roledescription={t('carrossel')} aria-label={t(rotulo)} onKeyDown={(evento) => {
      if (evento.key === 'ArrowLeft') navegar(-1);
      if (evento.key === 'ArrowRight') navegar(1);
    }} tabIndex={0}>
      <div className="carrossel-palco">
        {atual.tipo === 'imagem'
          ? <Image key={atual.src} src={atual.src} fill unoptimized sizes="(max-width: 900px) 100vw, 60vw" alt={t(atual.alt)} priority={indice === 0} />
          : <VideoPublico key={atual.src} src={atual.src} poster={atual.poster} rotulo={t(atual.alt)} />}
      </div>
      <div className="carrossel-faixa">
        <div className="carrossel-legenda" aria-live="polite"><span>{String(indice + 1).padStart(2, '0')} / {String(midias.length).padStart(2, '0')}</span><strong>{t(atual.legenda)}</strong></div>
        {midias.length > 1 && <div className="carrossel-controles"><button type="button" onClick={() => navegar(-1)} aria-label={t('Mídia anterior')}><ChevronLeft /></button><button type="button" onClick={() => navegar(1)} aria-label={t('Próxima mídia')}><ChevronRight /></button></div>}
      </div>
      {midias.length > 1 && <div className="carrossel-miniaturas" role="tablist" aria-label={t('Selecionar mídia')}>{midias.map((midia, item) => <button type="button" role="tab" aria-selected={item === indice} title={t(midia.legenda)} key={`${midia.src}-${item}`} onClick={() => selecionar(item)}><span>{item + 1}</span><b>{t(midia.legenda)}</b></button>)}</div>}
    </section>
  );
}
