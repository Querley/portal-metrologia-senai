'use client';

import Image from 'next/image';
import { ArrowRight, Building2, CarFront, Plane, Wrench } from 'lucide-react';
import { useState } from 'react';
import { setoresIndustria } from '../lib/setores';
import { servicosOficiais } from '../lib/servicos';
import { VideoPublico } from './video-publico';

const icones = [Building2, CarFront, Plane, Wrench];

export function SetoresIndustria() {
  const [indiceAtivo, setIndiceAtivo] = useState(0);
  const setor = setoresIndustria[indiceAtivo];
  const servicos = servicosOficiais.filter((servico) => setor.servicos.includes(servico.slug));

  return <section className="setores-industria" aria-labelledby="titulo-setores">
    <div className="cabecalho-lista-servicos"><div><p className="sobrelinha"><span /> ENCONTRE O SEU CONTEXTO</p><h2 id="titulo-setores">Soluções organizadas por setor</h2></div><p>Escolha o cenário mais próximo da sua empresa. Os nomes técnicos continuam disponíveis, mas aparecem somente quando ajudam a explicar uma necessidade daquele setor.</p></div>
    <div className="abas-setores" role="tablist" aria-label="Setores atendidos">{setoresIndustria.map((item, indice) => {
      const Icone = icones[indice];
      return <button key={item.slug} id={`aba-${item.slug}`} type="button" role="tab" aria-selected={indice === indiceAtivo} aria-controls={`painel-${item.slug}`} onClick={() => setIndiceAtivo(indice)}><Icone size={21} /><span>{item.titulo}</span></button>;
    })}</div>
    <article className="painel-setor" id={`painel-${setor.slug}`} role="tabpanel" aria-labelledby={`aba-${setor.slug}`}>
      <div className="midia-setor">{setor.midia.tipo === 'video'
        ? <VideoPublico src={setor.midia.src} poster={setor.midia.poster} rotulo={setor.midia.alt} />
        : <Image src={setor.midia.src} fill sizes="(max-width: 900px) 100vw, 46vw" alt={setor.midia.alt} />}
        <span>{setor.midia.legenda}</span>
      </div>
      <div className="conteudo-setor"><p className="sobrelinha"><span /> {setor.titulo.toUpperCase()}</p><h3>{setor.resumo}</h3><p>{setor.exemplos}</p><h4>Serviços que podem fazer sentido</h4><ul>{servicos.map((servico) => <li key={servico.slug}><a href={`/solicitar?servico=${servico.slug}`}>{servico.titulo}<ArrowRight size={15} /></a></li>)}</ul><small>A combinação final depende da análise técnica da peça, do objetivo e dos arquivos enviados.</small></div>
    </article>
  </section>;
}
