'use client';

import { CabecalhoPublico } from '../../componentes/cabecalho-publico';
import { RodapePublico } from '../../componentes/rodape-publico';
import { useIdiomaPublico } from '../../lib/traducao-publica';
import '../publico.css';

const conteudos = {
  'pt-BR': { atualizado: 'Última atualização: 15 de setembro de 2026.', secoes: [
    ['Sobre este ambiente', 'A versão atual é uma homologação persistente e isolada. Use apenas informações autorizadas e não envie desenhos industriais nem conteúdo confidencial sem aprovação institucional.'],
    ['Finalidades', 'Os dados são usados para identificar a empresa e seus contatos, analisar solicitações, preparar pré-propostas, acompanhar trabalhos e manter o canal de mensagens. A proposta oficial continua sendo produzida pelo SENAI no Nectar, fora deste portal.'],
    ['Acesso do cliente', 'A solicitação inicial não exige login. Depois dela, o contato pode ativar ou receber convite para a área autenticada. O vínculo é aprovado e as regras do banco limitam cada pessoa aos registros da própria empresa.'],
    ['Arquivos e inteligência artificial', 'Anexos permanecem privados, com acesso autenticado e download autorizado. Anexos, preços, margens, clientes e contatos não são enviados ao provedor de IA. Dados internos são sanitizados antes de qualquer integração.'],
    ['Seus direitos e contato', 'Você pode solicitar correção dos seus dados e atendimento pelo canal oficial informado no portal. O aviso legal definitivo, bases legais e prazos de retenção serão consolidados após validação institucional e jurídica.'],
  ] },
  en: { atualizado: 'Last updated: September 15, 2026.', secoes: [
    ['About this environment', 'The current version is a persistent and isolated validation environment. Use only authorized information and do not submit industrial drawings or confidential content without institutional approval.'],
    ['Purposes', 'Data is used to identify the company and its contacts, review requests, prepare preliminary proposals, track work and maintain the messaging channel. The official SENAI proposal continues to be issued in Nectar, outside this portal.'],
    ['Customer access', 'The initial request does not require sign-in. Afterwards, the contact can activate or receive an invitation to the authenticated area. The link is approved and database rules restrict each person to their own company records.'],
    ['Files and artificial intelligence', 'Attachments remain private, with authenticated access and authorized downloads. Attachments, prices, margins, customers and contacts are not sent to the AI provider. Internal data is sanitized before any integration.'],
    ['Your rights and contact', 'You may request data corrections and assistance through the official channel shown in the portal. The definitive legal notice, legal bases and retention periods will be consolidated after institutional and legal review.'],
  ] },
  de: { atualizado: 'Letzte Aktualisierung: 15. September 2026.', secoes: [
    ['Über diese Umgebung', 'Die aktuelle Version ist eine persistente und isolierte Validierungsumgebung. Verwenden Sie nur autorisierte Informationen und senden Sie ohne institutionelle Freigabe keine Industriezeichnungen oder vertraulichen Inhalte.'],
    ['Zwecke', 'Die Daten dienen zur Identifikation des Unternehmens und seiner Kontakte, zur Prüfung von Anfragen, Erstellung von Vorangeboten, Auftragsverfolgung und Kommunikation. Das offizielle SENAI-Angebot wird weiterhin außerhalb dieses Portals in Nectar erstellt.'],
    ['Kundenzugang', 'Für die erste Anfrage ist keine Anmeldung erforderlich. Danach kann der Kontakt den geschützten Bereich aktivieren oder eine Einladung erhalten. Die Zuordnung wird freigegeben und Datenbankregeln beschränken jede Person auf die Datensätze ihres Unternehmens.'],
    ['Dateien und künstliche Intelligenz', 'Anhänge bleiben privat und sind nur nach Anmeldung und Berechtigung abrufbar. Anhänge, Preise, Margen, Kunden und Kontakte werden nicht an den KI-Anbieter gesendet. Interne Daten werden vor jeder Integration bereinigt.'],
    ['Ihre Rechte und Kontakt', 'Sie können über den im Portal angegebenen offiziellen Kanal Datenkorrekturen und Unterstützung anfordern. Der endgültige Rechtshinweis, Rechtsgrundlagen und Aufbewahrungsfristen werden nach institutioneller und rechtlicher Prüfung festgelegt.'],
  ] },
} as const;

export default function Privacidade() {
  const idioma = useIdiomaPublico(); const conteudo = conteudos[idioma];
  return <main><CabecalhoPublico chaveCms="privacidade.cabecalho" titulo="Privacidade e uso seguro" texto="Diretrizes para o uso responsável e protegido do portal." /><article className="conteudo-publico privacidade"><p><strong>{conteudo.atualizado}</strong></p>{conteudo.secoes.map(([titulo, texto]) => <section key={titulo}><h2>{titulo}</h2><p>{texto}</p></section>)}</article><RodapePublico /></main>;
}
