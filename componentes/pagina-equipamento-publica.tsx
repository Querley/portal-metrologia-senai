'use client';

import type { EquipamentoPublico } from '../lib/equipamentos';
import { useTraducaoPublica } from '../lib/traducao-publica';
import { CabecalhoPublico } from './cabecalho-publico';
import { CarrosselMidia } from './carrossel-midia';
import { RodapePublico } from './rodape-publico';

export function PaginaEquipamentoPublica({ equipamento }: { equipamento: EquipamentoPublico }) {
  const { t } = useTraducaoPublica();
  return <main><CabecalhoPublico titulo={equipamento.nome} texto={t(equipamento.resumo)} /><article className="pagina-equipamento"><nav className="migalhas" aria-label="Breadcrumb"><a href="/">{t('Início')}</a><span>/</span><a href="/catalogo#equipamentos">{t('Equipamentos')}</a><span>/</span><strong>{equipamento.nome}</strong></nav><div className="introducao-equipamento"><div><p className="sobrelinha"><span /> {t(equipamento.categoria).toUpperCase()}</p><h2>{t('O equipamento e seu papel no Centro')}</h2>{equipamento.descricao.map((paragrafo) => <p key={paragrafo}>{t(paragrafo)}</p>)}</div><aside><strong>{t('Antes de solicitar')}</strong><p>{t(equipamento.referenciaTecnica)}</p><a href={equipamento.fonteFabricante} target="_blank" rel="noreferrer">{t('Consultar referência técnica da ZEISS')} <span aria-hidden="true">↗</span></a></aside></div><CarrosselMidia midias={equipamento.midias} rotulo={`${t('Fotos e vídeos de')} ${equipamento.nome}`} /><div className="grade-informacoes-equipamento"><Lista titulo={t('Aplicações frequentes')} itens={equipamento.aplicacoes.map(t)} /><Lista titulo={t('Capacidades')} itens={equipamento.capacidades.map(t)} /><Lista titulo={t('Medições e entregáveis')} itens={equipamento.tiposMedicao.map(t)} /><Lista titulo={t('Diferenciais')} itens={equipamento.diferenciais.map(t)} /></div><section className="fluxo-solicitacao-equipamento"><div><p className="sobrelinha"><span /> {t('ANÁLISE TÉCNICA')}</p><h2>{t('Confirme a melhor estratégia para sua peça.')}</h2><p>{t('Envie dimensões, material, tolerâncias, quantidade, finalidade e, se possível, desenho ou modelo CAD. A equipe valida equipamento, preparação, prazo e entregáveis.')}</p></div><a className="botao" href={`/solicitar?equipamento=${equipamento.slug}`}>{t('Solicitar análise com este equipamento')} <span aria-hidden="true">→</span></a></section></article><RodapePublico /></main>;
}

function Lista({ titulo, itens }: { titulo: string; itens: string[] }) { return <section><h2>{titulo}</h2><ul>{itens.map((item) => <li key={item}>{item}</li>)}</ul></section>; }
