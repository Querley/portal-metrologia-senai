'use client';

import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useSyncExternalStore } from 'react';
import type { MidiaEquipamento } from '../lib/equipamentos';

export function CarrosselMidia({ midias, rotulo }: { midias: MidiaEquipamento[]; rotulo: string }) {
  const [indice, setIndice] = useState(0);
  const hidratado = useSyncExternalStore(() => () => undefined, () => true, () => false);
  const atual = midias[indice];
  const navegar = (direcao: number) => setIndice((indiceAtual) => (indiceAtual + direcao + midias.length) % midias.length);

  return (
    <section className="carrossel" data-hidratado={hidratado ? 'sim' : 'nao'} aria-roledescription="carrossel" aria-label={rotulo} onKeyDown={(evento) => {
      if (evento.key === 'ArrowLeft') navegar(-1);
      if (evento.key === 'ArrowRight') navegar(1);
    }} tabIndex={0}>
      <div className="carrossel-palco">
        {atual.tipo === 'imagem'
          ? <Image src={atual.src} fill sizes="(max-width: 900px) 100vw, 60vw" alt={atual.alt} priority={indice === 0} />
          : <video controls preload="metadata" playsInline poster={atual.poster} aria-label={atual.alt}><source src={atual.src} type="video/mp4" /></video>}
        <div className="carrossel-legenda"><span>{String(indice + 1).padStart(2, '0')} / {String(midias.length).padStart(2, '0')}</span><strong>{atual.legenda}</strong></div>
        {midias.length > 1 && <div className="carrossel-controles"><button type="button" onClick={() => navegar(-1)} aria-label="Mídia anterior"><ChevronLeft /></button><button type="button" onClick={() => navegar(1)} aria-label="Próxima mídia"><ChevronRight /></button></div>}
      </div>
      {midias.length > 1 && <div className="carrossel-miniaturas" role="tablist" aria-label="Selecionar mídia">{midias.map((midia, item) => <button type="button" role="tab" aria-selected={item === indice} key={`${midia.src}-${item}`} onClick={() => setIndice(item)}><span>{item + 1}</span>{midia.legenda}</button>)}</div>}
    </section>
  );
}
