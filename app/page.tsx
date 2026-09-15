'use client';

import { CarrosselMidia } from '../componentes/carrossel-midia';
import { ContatoEmail } from '../componentes/contato-email';
import { MarcaOficial } from '../componentes/marca-oficial';
import { MenuMovel } from '../componentes/menu-movel';
import { RodapePublico } from '../componentes/rodape-publico';
import { SetoresIndustria } from '../componentes/setores-industria';
import { VideoPublico } from '../componentes/video-publico';
import type { MidiaEquipamento } from '../lib/equipamentos';
import { acoesNavegacaoPublica, linksNavegacaoPublica } from '../lib/navegacao-publica';
import { SeletorIdioma } from '../componentes/seletor-idioma';
import { SecaoAcontecimentos } from '../componentes/secao-acontecimentos';
import { useTraducaoPublica } from '../lib/traducao-publica';
import './publico.css';

const midiasLaboratorio = [
  { tipo: 'imagem', src: '/imagens/laboratorio-prismo.jpeg', alt: 'ZEISS PRISMO instalada no Centro', legenda: 'ZEISS PRISMO no Centro' },
  { tipo: 'imagem', src: '/imagens/laboratorio-t-scan-hawk-2-close-up.jpeg', alt: 'Close-up do ZEISS T-SCAN hawk 2 no Centro', legenda: 'ZEISS T-SCAN hawk 2 no Centro' },
  { tipo: 'imagem', src: '/imagens/laboratorio-o-inspect.jpeg', alt: 'ZEISS O-INSPECT instalada no Centro', legenda: 'ZEISS O-INSPECT no Centro' },
  { tipo: 'imagem', src: '/imagens/laboratorio-duramax.jpeg', alt: 'ZEISS DuraMax instalada no Centro', legenda: 'ZEISS DuraMax no Centro' },
  { tipo: 'imagem', src: '/imagens/laboratorio-bosello.jpeg', alt: 'ZEISS BOSELLO MAX instalada no Centro', legenda: 'ZEISS BOSELLO MAX no Centro' },
  { tipo: 'imagem', src: '/imagens/laboratorio-atos-q.jpeg', alt: 'ZEISS ATOS Q instalada no Centro', legenda: 'ZEISS ATOS Q no Centro' },
  { tipo: 'imagem', src: '/imagens/laboratorio-fachada-interna.jpeg', alt: 'Vista externa do Centro de Excelência em Metrologia', legenda: 'Centro de Excelência em Metrologia' },
] satisfies MidiaEquipamento[];

export default function Home() {
  const { t } = useTraducaoPublica();
  return (
    <main>
      <header className="topo">
        <a className="marca" href="#inicio" aria-label="Centro de Excelência em Metrologia SENAI ZEISS — início"><MarcaOficial /></a>
        <nav aria-label="Navegação principal">
          {linksNavegacaoPublica.map((item) => <a href={item.href} key={item.href}>{t(item.rotulo)}</a>)}
        </nav>
        <div className="acoes-topo">
          <SeletorIdioma />
          {acoesNavegacaoPublica.map((item) => <a className={'destaque' in item && item.destaque ? 'botao botao-menor' : 'entrar'} href={item.href} key={item.href}>{t(item.rotulo)}</a>)}
        </div>
        <MenuMovel />
      </header>

      <section className="hero" id="inicio">
        <div className="hero-conteudo">
          <p className="sobrelinha"><span /> {t('METROLOGIA QUE GERA CONHECIMENTO')}</p>
          <h1>{t('Precisão para medir.')}<br /><em>{t('Inteligência para evoluir.')}</em></h1>
          <p className="hero-texto">{t('Serviços de metrologia avançada com propostas transparentes, acompanhamento digital e conhecimento acumulado a cada projeto.')}</p>
          <div className="hero-acoes">
            <a className="botao" href="/solicitar">{t('Solicitar orçamento')} <span aria-hidden="true">→</span></a>
            <a className="link-seta" href="#servicos">{t('Conhecer serviços')} <span aria-hidden="true">↘</span></a>
          </div>
          <div className="selos" aria-label="Diferenciais">
            <span><b>6</b> {t('equipamentos disponíveis')}</span><span><b>3</b> {t('idiomas disponíveis')}</span><span><b>100%</b> {t('acompanhamento digital')}</span>
          </div>
        </div>
        <div className="hero-visual" aria-label="Centro de Excelência em Metrologia SENAI ZEISS">
          <VideoPublico className="video-hero" src="/videos/centro-metrologia-apresentacao.mp4" poster="/imagens/laboratorio-centro-excelencia.jpeg" rotulo="Apresentação em vídeo do Centro de Excelência em Metrologia SENAI ZEISS" />
        </div>
      </section>

      <section className="diferencial-zeiss" aria-labelledby="titulo-diferencial-zeiss">
        <div><p className="sobrelinha"><span /> {t('DIFERENCIAL GLOBAL')}</p><h2 id="titulo-diferencial-zeiss">{t('Por que escolher o laboratório ZEISS?')}</h2><p>{t('Integramos uma rede extremamente rara de centros de excelência, com estrutura avançada e atendimento próximo à indústria latino-americana.')}</p></div>
        <dl><div><dt>5</dt><dd>{t('laboratórios como este no mundo')}</dd></div><div><dt>1</dt><dd>{t('o único da América Latina')}</dd></div></dl>
      </section>

      <section className="laboratorio-real" id="equipamentos">
        <div className="laboratorio-texto"><p className="sobrelinha"><span /> {t('ESTRUTURA REAL')}</p><h2>{t('Um centro de excelência preparado para medir o que importa.')}</h2><p>{t('O laboratório reúne medição por coordenadas, inspeção por raios X e digitalização óptica em um ambiente dedicado à precisão.')}</p><a className="link-seta" href="/catalogo#equipamentos">{t('Conheça os equipamentos')} <span aria-hidden="true">→</span></a></div>
        <CarrosselMidia midias={midiasLaboratorio} rotulo="Galeria do Centro de Excelência em Metrologia" />
      </section>

      <div className="secao" id="servicos"><SetoresIndustria /></div>

      <SecaoAcontecimentos />

      <section className="chamada" id="solicitar">
        <p className="sobrelinha"><span /> {t('COMECE AGORA')}</p><h2>{t('Tem um desafio de medição?')}</h2><p>{t('Conte o que você precisa. Nossa equipe analisa os dados e prepara uma proposta sob medida.')}</p><a className="botao" href="/solicitar">{t('Solicitar orçamento')} <span aria-hidden="true">→</span></a>
      </section>
      <div id="contato"><ContatoEmail /></div>
      <RodapePublico />
    </main>
  );
}
