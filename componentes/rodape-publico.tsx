'use client';

import { MarcaOficial } from './marca-oficial';
import { useTraducaoPublica } from '../lib/traducao-publica';

export function RodapePublico() {
  const { t } = useTraducaoPublica();
  return <footer><a href="/" aria-label="Centro de Excelência em Metrologia"><MarcaOficial classe="marca-rodape" /></a><div className="texto-rodape"><p>{t('Portal para gestão de serviços e conhecimento em orçamentação.')}</p><small>© 2026 SENAI. {t('Todos os direitos reservados.')}</small></div><nav aria-label="Links"><a href="/catalogo">{t('Serviços e equipamentos')}</a><a href="/privacidade">{t('Privacidade')}</a><a href="/#contato">{t('Contato')}</a></nav></footer>;
}
