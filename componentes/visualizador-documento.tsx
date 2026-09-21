'use client';

import { Download, ExternalLink, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect } from 'react';
export { documentoPodeSerVisualizado } from '../lib/documentos';

export type DocumentoVisualizavel = { url: string; nome: string; tipo: string };

export function VisualizadorDocumento({ documento, aoFechar }: { documento: DocumentoVisualizavel; aoFechar: () => void }) {
  const ehPdf = documento.tipo === 'application/pdf' || /\.pdf$/i.test(documento.nome);
  useEffect(() => {
    function fechar(evento: KeyboardEvent) { if (evento.key === 'Escape') aoFechar(); }
    window.addEventListener('keydown', fechar);
    return () => window.removeEventListener('keydown', fechar);
  }, [aoFechar]);

  return <div className="fundo-visualizador-documento" role="presentation" onMouseDown={(evento) => { if (evento.target === evento.currentTarget) aoFechar(); }}>
    <section className="visualizador-documento" role="dialog" aria-modal="true" aria-labelledby="titulo-visualizador-documento">
      <header><div><small>VISUALIZAÇÃO PROTEGIDA</small><h2 id="titulo-visualizador-documento">{documento.nome}</h2></div><button type="button" onClick={aoFechar} aria-label="Fechar visualização"><X /></button></header>
      <div className="palco-visualizador-documento">
        {ehPdf ? <iframe src={documento.url} title={`Visualização de ${documento.nome}`} /> : <Image src={documento.url} alt={`Visualização de ${documento.nome}`} fill unoptimized sizes="(max-width: 760px) 92vw, 900px" />}
      </div>
      <footer><a href={documento.url} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Abrir em nova guia</a><a href={documento.url} download={documento.nome}><Download size={16} /> Baixar arquivo</a></footer>
    </section>
  </div>;
}
