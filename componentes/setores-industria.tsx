'use client';

import { ArrowRight, Building2, CarFront, Plane, Wrench } from 'lucide-react';
import { useState } from 'react';
import { setoresIndustria } from '../lib/setores';
import { servicosOficiais } from '../lib/servicos';
import { useTraducaoPublica } from '../lib/traducao-publica';
import { useConteudosPublicados } from './conteudos-publicados';
import { CarrosselMidia } from './carrossel-midia';
import type { MidiaEquipamento } from '../lib/equipamentos';

const icones = [Building2, CarFront, Plane, Wrench];

export function SetoresIndustria() {
  const { t } = useTraducaoPublica();
  const publicado = useConteudosPublicados(['inicio.setores'])['inicio.setores'];
  const [indiceAtivo, setIndiceAtivo] = useState(0);
  const setor = setoresIndustria[indiceAtivo];
  const servicos = servicosOficiais.filter((servico) => setor.servicos.includes(servico.slug));
  const midiasCms = publicado?.corpo.setores?.find((item) => item.slug === setor.slug)?.midias.filter((item) => item.src && (item.src.startsWith('/') || /^https:\/\//i.test(item.src)));
  const midias: MidiaEquipamento[] = midiasCms?.length ? midiasCms : setor.midias;

  return <section className="setores-industria" aria-labelledby="titulo-setores">
    <div className="cabecalho-lista-servicos"><div><p className="sobrelinha"><span /> {t('ENCONTRE O SEU CONTEXTO')}</p><h2 id="titulo-setores">{publicado?.titulo ?? t('Soluções organizadas por setor')}</h2></div><p>{publicado?.corpo.texto ?? t('Escolha o cenário mais próximo da sua empresa. Os nomes técnicos continuam disponíveis, mas aparecem somente quando ajudam a explicar uma necessidade daquele setor.')}</p></div>
    <div className="abas-setores" role="tablist" aria-label="Setores atendidos">{setoresIndustria.map((item, indice) => {
      const Icone = icones[indice];
      return <button key={item.slug} id={`aba-${item.slug}`} type="button" role="tab" aria-selected={indice === indiceAtivo} aria-controls={`painel-${item.slug}`} onClick={() => setIndiceAtivo(indice)}><Icone size={21} /><span>{t(item.titulo)}</span></button>;
    })}</div>
    <article className="painel-setor" id={`painel-${setor.slug}`} role="tabpanel" aria-labelledby={`aba-${setor.slug}`}>
      <div className="midia-setor"><CarrosselMidia midias={midias} rotulo={`${t('Soluções organizadas por setor')}: ${t(setor.titulo)}`} /></div>
      <div className="conteudo-setor"><p className="sobrelinha"><span /> {t(setor.titulo).toUpperCase()}</p><h3>{t(setor.resumo)}</h3><p>{t(setor.exemplos)}</p><h4>{t('Serviços que podem fazer sentido')}</h4><ul>{servicos.map((servico) => <li key={servico.slug}><a href={`/solicitar?servico=${servico.slug}`}>{t(servico.titulo)}<ArrowRight size={15} /></a></li>)}</ul><small>{t('A combinação final depende da análise técnica da peça, do objetivo e dos arquivos enviados.')}</small></div>
    </article>
  </section>;
}
