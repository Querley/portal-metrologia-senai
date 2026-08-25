'use client';

import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { MidiaEquipamento } from '../lib/equipamentos';
import { prepararVideoPublico, VideoPublico } from './video-publico';

const imagensEmCarregamento = new Map<string, Promise<void>>();

function prepararImagem(src: string) {
  const existente = imagensEmCarregamento.get(src);
  if (existente) return existente;
  const carregamento = new Promise<void>((resolver, rejeitar) => {
    const imagem = new window.Image();
    imagem.onload = () => resolver();
    imagem.onerror = () => rejeitar(new Error(`Não foi possível carregar a imagem: ${src}`));
    imagem.src = src;
  });
  imagensEmCarregamento.set(src, carregamento);
  return carregamento;
}

export function CarrosselMidia({ midias, rotulo }: { midias: MidiaEquipamento[]; rotulo: string }) {
  const [indice, setIndice] = useState(0);
  const [carregando, setCarregando] = useState(false);
  const hidratado = useSyncExternalStore(() => () => undefined, () => true, () => false);
  const navegacaoAtual = useRef(0);
  const atual = midias[indice];
  const prepararMidia = useCallback((item: number) => midias[item].tipo === 'video' ? prepararVideoPublico(midias[item].src).then(() => undefined) : prepararImagem(midias[item].src), [midias]);
  const selecionar = async (novoIndice: number) => {
    if (novoIndice === indice) return;
    const solicitacao = ++navegacaoAtual.current;
    setCarregando(true);
    try {
      await prepararMidia(novoIndice);
      if (solicitacao === navegacaoAtual.current) setIndice(novoIndice);
    } catch {
      return;
    } finally {
      if (solicitacao === navegacaoAtual.current) setCarregando(false);
    }
  };
  const navegar = (direcao: number) => void selecionar((indice + direcao + midias.length) % midias.length);

  useEffect(() => {
    midias.forEach((_, item) => {
      if (item !== indice) void prepararMidia(item).catch(() => undefined);
    });
  }, [indice, midias, prepararMidia]);

  return (
    <section className="carrossel" data-hidratado={hidratado ? 'sim' : 'nao'} aria-roledescription="carrossel" aria-label={rotulo} onKeyDown={(evento) => {
      if (evento.key === 'ArrowLeft') navegar(-1);
      if (evento.key === 'ArrowRight') navegar(1);
    }} tabIndex={0}>
      <div className="carrossel-palco" data-carregando={carregando ? 'sim' : 'nao'}>
        {atual.tipo === 'imagem'
          ? <Image key={atual.src} src={atual.src} fill unoptimized sizes="(max-width: 900px) 100vw, 60vw" alt={atual.alt} priority={indice === 0} />
          : <VideoPublico key={atual.src} src={atual.src} poster={atual.poster} rotulo={atual.alt} />}
        {carregando && <span className="carrossel-carregando" role="status">Carregando próxima mídia…</span>}
        <div className="carrossel-legenda"><span>{String(indice + 1).padStart(2, '0')} / {String(midias.length).padStart(2, '0')}</span><strong>{atual.legenda}</strong></div>
        {midias.length > 1 && <div className="carrossel-controles"><button type="button" onClick={() => navegar(-1)} aria-label="Mídia anterior"><ChevronLeft /></button><button type="button" onClick={() => navegar(1)} aria-label="Próxima mídia"><ChevronRight /></button></div>}
      </div>
      {midias.length > 1 && <div className="carrossel-miniaturas" role="tablist" aria-label="Selecionar mídia">{midias.map((midia, item) => <button type="button" role="tab" aria-selected={item === indice} key={`${midia.src}-${item}`} onClick={() => void selecionar(item)}><span>{item + 1}</span>{midia.legenda}</button>)}</div>}
    </section>
  );
}
