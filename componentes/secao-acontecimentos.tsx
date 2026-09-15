'use client';

import { CalendarDays, CircleDot, History } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { EVENTO_IDIOMA_PUBLICO, type IdiomaPublico } from '../lib/idioma-publico';
import { useIdiomaPublico } from '../lib/traducao-publica';
import { obterClienteSupabase } from '../lib/supabase/cliente';

type Item = { tipo: 'recente' | 'agora' | 'proximo'; data: string; titulo: string; resumo: string };
type Conteudo = { titulo: string; texto: string; itens: Item[]; midia_url?: string; midia_tipo?: 'imagem' | 'video'; midia_alt?: string };
type Publicado = { chave: string; titulo: string; corpo: { texto?: string; itens?: Item[]; midia_url?: string; midia_tipo?: 'imagem' | 'video'; midia_alt?: string } };

const padroes: Record<IdiomaPublico, Conteudo> = {
  'pt-BR': { titulo: 'Acontece no Centro', texto: 'Eventos, novidades e marcos recentes do Centro de Excelência em Metrologia.', itens: [{ tipo: 'recente', data: 'Recentemente', titulo: 'Portal de acompanhamento ampliado', resumo: 'Clientes e equipe acompanham solicitações, propostas e execução em uma experiência integrada.' }, { tipo: 'agora', data: 'Em destaque', titulo: 'Conhecimento aplicado à metrologia', resumo: 'Lições formalizadas e comparativos apoiam o planejamento dos próximos trabalhos.' }, { tipo: 'proximo', data: 'Próximos passos', titulo: 'Novos conteúdos e eventos', resumo: 'A equipe publicará aqui encontros técnicos, participações e novidades do Centro.' }] },
  en: { titulo: 'News from the Center', texto: 'Events, news and recent milestones from the Metrology Center of Excellence.', itens: [{ tipo: 'recente', data: 'Recently', titulo: 'Expanded tracking portal', resumo: 'Customers and staff track requests, proposals and execution in one integrated experience.' }, { tipo: 'agora', data: 'Featured', titulo: 'Knowledge applied to metrology', resumo: 'Formalized lessons and comparisons support the planning of future work.' }, { tipo: 'proximo', data: 'Coming next', titulo: 'New content and events', resumo: 'The team will publish technical meetings, participation and news from the Center here.' }] },
  de: { titulo: 'Aktuelles im Zentrum', texto: 'Veranstaltungen, Neuigkeiten und Meilensteine des Kompetenzzentrums für Messtechnik.', itens: [{ tipo: 'recente', data: 'Kürzlich', titulo: 'Erweitertes Auftragsportal', resumo: 'Kunden und Mitarbeitende verfolgen Anfragen, Angebote und Ausführung in einer integrierten Umgebung.' }, { tipo: 'agora', data: 'Im Fokus', titulo: 'Wissen für die Messtechnik', resumo: 'Freigegebene Erkenntnisse und Vergleiche unterstützen die Planung zukünftiger Aufträge.' }, { tipo: 'proximo', data: 'Als Nächstes', titulo: 'Neue Inhalte und Veranstaltungen', resumo: 'Hier veröffentlicht das Team Fachtreffen, Veranstaltungen und Neuigkeiten aus dem Zentrum.' }] },
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
  return <section className="acontecimentos" id="acontecimentos"><div className="acontecimentos-intro"><p className="sobrelinha sobrelinha-clara"><span /> NEWSROOM</p><h2>{conteudo.titulo}</h2><p>{conteudo.texto}</p>{src && <div className="acontecimentos-midia">{conteudo.midia_tipo === 'video' ? <video src={src} controls muted /> : <Image src={src} alt={conteudo.midia_alt || conteudo.titulo} width={720} height={400} unoptimized />}</div>}</div><ol>{conteudo.itens.map((item, indice) => { const Icone = Icones[item.tipo] ?? CircleDot; return <li key={`${item.tipo}-${item.titulo}-${indice}`} data-tipo={item.tipo}><Icone /><span>{item.data}</span><h3>{item.titulo}</h3><p>{item.resumo}</p></li>; })}</ol></section>;
}
