'use client';

import { CalendarDays, CircleDot, History } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { EVENTO_IDIOMA_PUBLICO, type IdiomaPublico } from '../lib/idioma-publico';
import { useIdiomaPublico } from '../lib/traducao-publica';
import { obterClienteSupabase } from '../lib/supabase/cliente';
import { CarrosselMidia } from './carrossel-midia';
import type { MidiaEquipamento } from '../lib/equipamentos';

type Item = { tipo: 'recente' | 'agora' | 'proximo'; data: string; titulo: string; resumo: string; midias?: MidiaEquipamento[] };
type Conteudo = { titulo: string; texto: string; itens: Item[]; midia_url?: string; midia_tipo?: 'imagem' | 'video'; midia_alt?: string };
type Publicado = { chave: string; titulo: string; corpo: { texto?: string; itens?: Item[]; midia_url?: string; midia_tipo?: 'imagem' | 'video'; midia_alt?: string } };

const padroes: Record<IdiomaPublico, Conteudo> = {
  'pt-BR': { titulo: 'Novidades no Centro', texto: 'Eventos, projetos e próximos passos do Centro de Excelência em Metrologia.', itens: [
    { tipo: 'recente', data: 'Agosto de 2026', titulo: 'Congresso SINDAG', resumo: 'O Centro apresentou suas capacidades e trocou experiências com profissionais do setor durante o congresso.', midias: [{ tipo: 'imagem', src: '/imagens/evento-congresso-sindag-2026.jpeg', alt: 'Equipe do Centro durante o Congresso SINDAG em agosto de 2026', legenda: 'Participação no Congresso SINDAG — agosto de 2026' }] },
    { tipo: 'recente', data: 'Setembro de 2026', titulo: 'ExpoPeças 2026', resumo: 'A equipe participou da feira para aproximar a metrologia avançada das demandas da indústria de componentes.', midias: [{ tipo: 'imagem', src: '/imagens/evento-expopecas-2026.jpeg', alt: 'Equipe reunida durante a ExpoPeças em setembro de 2026', legenda: 'Participação na ExpoPeças — setembro de 2026' }] },
    { tipo: 'agora', data: 'Em desenvolvimento', titulo: 'Portal de acompanhamento ampliado', resumo: 'O novo software está sendo construído para integrar solicitações, propostas, execução e comunicação com o cliente.', midias: [{ tipo: 'video', src: '/videos/portal-acompanhamento-servicos.mp4', alt: 'Demonstração do portal de acompanhamento dos serviços', legenda: 'Software para acompanhamento ampliado dos serviços' }] },
    { tipo: 'proximo', data: 'Próximo passo', titulo: 'Caminho para a acreditação INMETRO', resumo: 'O Centro trabalha na preparação de processos e evidências para avançar rumo à acreditação. A imagem desta etapa será publicada quando estiver disponível.' },
  ] },
  en: { titulo: 'News from the Center', texto: 'Events, projects and next steps from the Metrology Center of Excellence.', itens: [
    { tipo: 'recente', data: 'August 2026', titulo: 'SINDAG Congress', resumo: 'The Center presented its capabilities and exchanged experience with industry professionals during the congress.', midias: [{ tipo: 'imagem', src: '/imagens/evento-congresso-sindag-2026.jpeg', alt: 'Center team at the SINDAG Congress in August 2026', legenda: 'Participation in the SINDAG Congress — August 2026' }] },
    { tipo: 'recente', data: 'September 2026', titulo: 'ExpoPeças 2026', resumo: 'The team attended the trade fair to bring advanced metrology closer to the needs of the components industry.', midias: [{ tipo: 'imagem', src: '/imagens/evento-expopecas-2026.jpeg', alt: 'Team gathered at ExpoPeças in September 2026', legenda: 'Participation in ExpoPeças — September 2026' }] },
    { tipo: 'agora', data: 'In development', titulo: 'Expanded service tracking portal', resumo: 'The new software is being built to integrate requests, proposals, execution and customer communication.', midias: [{ tipo: 'video', src: '/videos/portal-acompanhamento-servicos.mp4', alt: 'Demonstration of the service tracking portal', legenda: 'Software for expanded service tracking' }] },
    { tipo: 'proximo', data: 'Next step', titulo: 'Path toward INMETRO accreditation', resumo: 'The Center is preparing processes and evidence to move toward accreditation. An image of this stage will be published when available.' },
  ] },
  de: { titulo: 'Neuigkeiten aus dem Zentrum', texto: 'Veranstaltungen, Projekte und nächste Schritte des Kompetenzzentrums für Messtechnik.', itens: [
    { tipo: 'recente', data: 'August 2026', titulo: 'SINDAG-Kongress', resumo: 'Das Zentrum stellte seine Kompetenzen vor und tauschte sich während des Kongresses mit Fachleuten der Branche aus.', midias: [{ tipo: 'imagem', src: '/imagens/evento-congresso-sindag-2026.jpeg', alt: 'Team des Zentrums auf dem SINDAG-Kongress im August 2026', legenda: 'Teilnahme am SINDAG-Kongress — August 2026' }] },
    { tipo: 'recente', data: 'September 2026', titulo: 'ExpoPeças 2026', resumo: 'Das Team nahm an der Fachmesse teil, um moderne Messtechnik näher an die Anforderungen der Komponentenindustrie zu bringen.', midias: [{ tipo: 'imagem', src: '/imagens/evento-expopecas-2026.jpeg', alt: 'Team auf der ExpoPeças im September 2026', legenda: 'Teilnahme an der ExpoPeças — September 2026' }] },
    { tipo: 'agora', data: 'In Entwicklung', titulo: 'Erweitertes Portal zur Auftragsverfolgung', resumo: 'Die neue Software wird entwickelt, um Anfragen, Angebote, Ausführung und Kundenkommunikation zu verbinden.', midias: [{ tipo: 'video', src: '/videos/portal-acompanhamento-servicos.mp4', alt: 'Demonstration des Portals zur Auftragsverfolgung', legenda: 'Software zur erweiterten Auftragsverfolgung' }] },
    { tipo: 'proximo', data: 'Nächster Schritt', titulo: 'Weg zur INMETRO-Akkreditierung', resumo: 'Das Zentrum bereitet Prozesse und Nachweise vor, um die Akkreditierung voranzutreiben. Ein Bild dieser Phase wird veröffentlicht, sobald es verfügbar ist.' },
  ] },
};

function midiaSegura(url?: string) { return url && (url.startsWith('/') || /^https:\/\//i.test(url)) ? url : ''; }

export function SecaoAcontecimentos() {
  const idioma = useIdiomaPublico();
  const [conteudo, setConteudo] = useState<Conteudo>(padroes[idioma]);
  useEffect(() => {
    const cliente = obterClienteSupabase(); let ativo = true;
    async function carregar(codigo: IdiomaPublico) {
      setConteudo(padroes[codigo]); if (!cliente) return;
      const { data, error } = await cliente.rpc('listar_conteudos_publicados', { idioma_desejado: codigo });
      const encontrado = !error ? ((data ?? []) as Publicado[]).find((item) => item.chave === 'inicio.acontecimentos') : undefined;
      if (ativo && encontrado) setConteudo({ titulo: encontrado.titulo, texto: encontrado.corpo.texto ?? padroes[codigo].texto, itens: encontrado.corpo.itens?.length ? encontrado.corpo.itens : padroes[codigo].itens, midia_url: encontrado.corpo.midia_url, midia_tipo: encontrado.corpo.midia_tipo, midia_alt: encontrado.corpo.midia_alt });
    }
    function alterar(evento: Event) { void carregar((evento as CustomEvent<IdiomaPublico>).detail); }
    void carregar(idioma); window.addEventListener(EVENTO_IDIOMA_PUBLICO, alterar);
    return () => { ativo = false; window.removeEventListener(EVENTO_IDIOMA_PUBLICO, alterar); };
  }, [idioma]);
  const src = midiaSegura(conteudo.midia_url);
  const Icones = { recente: History, agora: CircleDot, proximo: CalendarDays };
  return <section className="acontecimentos" id="acontecimentos"><div className="acontecimentos-intro"><p className="sobrelinha sobrelinha-clara"><span /> NEWSROOM</p><h2>{conteudo.titulo}</h2><p>{conteudo.texto}</p>{src && <div className="acontecimentos-midia">{conteudo.midia_tipo === 'video' ? <video src={src} controls muted /> : <Image src={src} alt={conteudo.midia_alt || conteudo.titulo} width={720} height={400} unoptimized />}</div>}</div><ol>{conteudo.itens.map((item, indice) => { const Icone = Icones[item.tipo] ?? CircleDot; const midias = (item.midias ?? []).filter((midia) => midia.src && (midia.src.startsWith('/') || /^https:\/\//i.test(midia.src))); return <li key={`${item.tipo}-${item.titulo}-${indice}`} data-tipo={item.tipo}><Icone /><span>{item.data}</span><h3>{item.titulo}</h3><p>{item.resumo}</p>{midias.length > 0 && <CarrosselMidia midias={midias} rotulo={item.titulo} />}</li>; })}</ol></section>;
}
