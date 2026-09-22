'use client';

import { useEffect, useRef, useState } from 'react';

type Propriedades = {
  src: string;
  poster?: string;
  rotulo: string;
  className?: string;
};

export function VideoPublico({ src, poster, rotulo, className }: Propriedades) {
  const [carregar, setCarregar] = useState(false);
  const [buscaPronta, setBuscaPronta] = useState(false);
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const elemento = video.current;
    if (!elemento || carregar) return;
    const observador = new IntersectionObserver((entradas) => {
      if (!entradas.some((entrada) => entrada.isIntersecting)) return;
      setCarregar(true);
      observador.disconnect();
    }, { rootMargin: '240px 0px', threshold: 0.01 });
    observador.observe(elemento);
    return () => observador.disconnect();
  }, [carregar]);

  return (
    <video
      ref={video}
      className={className}
      src={carregar ? src : undefined}
      controls
      autoPlay
      muted
      loop
      preload="metadata"
      playsInline
      poster={poster}
      aria-label={rotulo}
      data-busca-pronta={buscaPronta ? 'sim' : 'nao'}
      onLoadedMetadata={() => {
        setBuscaPronta(true);
        void video.current?.play().catch(() => undefined);
      }}
    />
  );
}
