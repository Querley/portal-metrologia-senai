'use client';

import { useEffect, useRef, useState } from 'react';

const videosEmCarregamento = new Map<string, Promise<string>>();
const videosProntos = new Map<string, string>();

export function prepararVideoPublico(src: string) {
  const pronto = videosProntos.get(src);
  if (pronto) return Promise.resolve(pronto);

  const existente = videosEmCarregamento.get(src);
  if (existente) return existente;

  const carregamento = fetch(src, { cache: 'force-cache' })
    .then((resposta) => {
      if (!resposta.ok) throw new Error(`Não foi possível carregar o vídeo: ${src}`);
      return resposta.blob();
    })
    .then((arquivo) => {
      const enderecoLocal = URL.createObjectURL(arquivo);
      videosProntos.set(src, enderecoLocal);
      return enderecoLocal;
    })
    .finally(() => videosEmCarregamento.delete(src));

  videosEmCarregamento.set(src, carregamento);
  return carregamento;
}

type Propriedades = {
  src: string;
  poster?: string;
  rotulo: string;
  className?: string;
};

export function VideoPublico({ src, poster, rotulo, className }: Propriedades) {
  const prontoInicial = videosProntos.get(src);
  const [origem, setOrigem] = useState(prontoInicial ?? src);
  const [buscaPronta, setBuscaPronta] = useState(Boolean(prontoInicial));
  const video = useRef<HTMLVideoElement>(null);
  const tempoAnterior = useRef(0);
  const reproduzirAposTroca = useRef(true);

  useEffect(() => {
    let ativo = true;

    prepararVideoPublico(src).then((enderecoLocal) => {
      if (!ativo || enderecoLocal === origem) return;
      tempoAnterior.current = video.current?.currentTime ?? 0;
      reproduzirAposTroca.current = !(video.current?.paused ?? false);
      setOrigem(enderecoLocal);
    }).catch(() => {
      if (ativo) setBuscaPronta(true);
    });

    return () => { ativo = false; };
  }, [origem, src]);

  return (
    <video
      ref={video}
      className={className}
      src={origem}
      controls={buscaPronta}
      autoPlay
      muted
      loop
      preload="auto"
      playsInline
      poster={poster}
      aria-label={rotulo}
      data-busca-pronta={buscaPronta ? 'sim' : 'nao'}
      onLoadedMetadata={() => {
        if (!videosProntos.has(src) || origem === src || !video.current) return;
        video.current.currentTime = Math.min(tempoAnterior.current, video.current.duration || tempoAnterior.current);
        setBuscaPronta(true);
        if (reproduzirAposTroca.current) void video.current.play().catch(() => undefined);
      }}
    />
  );
}
