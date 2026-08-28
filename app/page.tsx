import { CarrosselMidia } from '../componentes/carrossel-midia';
import { ContatoEmail } from '../componentes/contato-email';
import { MarcaOficial } from '../componentes/marca-oficial';
import { MenuMovel } from '../componentes/menu-movel';
import { RodapePublico } from '../componentes/rodape-publico';
import { SetoresIndustria } from '../componentes/setores-industria';
import { VideoPublico } from '../componentes/video-publico';
import type { MidiaEquipamento } from '../lib/equipamentos';
import './publico.css';

const etapas = [
  ['01', 'Orçar', 'Dados históricos apoiam uma estimativa transparente.'],
  ['02', 'Executar', 'O serviço registra esforço, recursos e ocorrências reais.'],
  ['03', 'Comparar', 'Indicadores revelam desvios de custo, prazo e esforço.'],
  ['04', 'Aprender', 'Lições validadas passam a orientar novos orçamentos.'],
];

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
  return (
    <main>
      <header className="topo">
        <a className="marca" href="#inicio" aria-label="Centro de Excelência em Metrologia SENAI ZEISS — início"><MarcaOficial /></a>
        <nav aria-label="Navegação principal">
          <a href="/catalogo">Serviços</a><a href="#como-funciona">Como funciona</a><a href="/catalogo#equipamentos">Equipamentos</a><a href="#institucional">Institucional</a>
        </nav>
        <div className="acoes-topo">
          <button className="idioma" type="button" aria-label="Selecionar idioma">PT <span aria-hidden="true">⌄</span></button>
          <a className="entrar" href="/portal">Entrar</a><a className="botao botao-menor" href="/solicitar">Solicitar orçamento</a>
        </div>
        <MenuMovel />
      </header>

      <section className="hero" id="inicio">
        <div className="hero-conteudo">
          <p className="sobrelinha"><span /> METROLOGIA QUE GERA CONHECIMENTO</p>
          <h1>Precisão para medir.<br /><em>Inteligência para evoluir.</em></h1>
          <p className="hero-texto">Serviços de metrologia avançada com propostas transparentes, acompanhamento digital e conhecimento acumulado a cada projeto.</p>
          <div className="hero-acoes">
            <a className="botao" href="/solicitar">Solicitar orçamento <span aria-hidden="true">→</span></a>
            <a className="link-seta" href="#servicos">Conhecer serviços <span aria-hidden="true">↘</span></a>
          </div>
          <div className="selos" aria-label="Diferenciais">
            <span><b>6</b> equipamentos disponíveis</span><span><b>3</b> idiomas planejados</span><span><b>100%</b> acompanhamento digital</span>
          </div>
        </div>
        <div className="hero-visual" aria-label="Centro de Excelência em Metrologia SENAI ZEISS">
          <VideoPublico className="video-hero" src="/videos/centro-metrologia-apresentacao.mp4" poster="/imagens/laboratorio-centro-excelencia.jpeg" rotulo="Apresentação em vídeo do Centro de Excelência em Metrologia SENAI ZEISS" />
        </div>
      </section>

      <section className="diferencial-zeiss" aria-labelledby="titulo-diferencial-zeiss">
        <div><p className="sobrelinha"><span /> DIFERENCIAL GLOBAL</p><h2 id="titulo-diferencial-zeiss">Por que escolher o laboratório ZEISS?</h2><p>Integramos uma rede extremamente rara de centros de excelência, com estrutura avançada e atendimento próximo à indústria latino-americana.</p></div>
        <dl><div><dt>5</dt><dd>laboratórios como este no mundo</dd></div><div><dt>1</dt><dd>o único da América Latina</dd></div></dl>
      </section>

      <section className="laboratorio-real" id="equipamentos">
        <div className="laboratorio-texto"><p className="sobrelinha"><span /> ESTRUTURA REAL</p><h2>Um centro de excelência preparado para medir o que importa.</h2><p>O laboratório reúne medição por coordenadas, inspeção por raios X e digitalização óptica em um ambiente dedicado à precisão.</p><a className="link-seta" href="/catalogo#equipamentos">Conheça os equipamentos <span aria-hidden="true">→</span></a></div>
        <CarrosselMidia midias={midiasLaboratorio} rotulo="Galeria do Centro de Excelência em Metrologia" />
      </section>

      <div className="secao" id="servicos"><SetoresIndustria /></div>

      <section className="ciclo" id="como-funciona">
        <div className="ciclo-intro"><p className="sobrelinha sobrelinha-clara"><span /> UM CICLO DE MELHORIA CONTÍNUA</p><h2>Cada serviço torna o próximo orçamento mais confiável.</h2><p>Experiência deixa de ficar dispersa e se transforma em recomendações revisadas por especialistas.</p></div>
        <ol className="etapas">{etapas.map(([numero, titulo, texto]) => <li key={numero}><span>{numero}</span><h3>{titulo}</h3><p>{texto}</p></li>)}</ol>
      </section>

      <section className="chamada" id="solicitar">
        <p className="sobrelinha"><span /> COMECE AGORA</p><h2>Tem um desafio de medição?</h2><p>Conte o que você precisa. Nossa equipe analisa os dados e prepara uma proposta sob medida.</p><a className="botao" href="/solicitar">Solicitar orçamento <span aria-hidden="true">→</span></a><small>Ambiente de demonstração — nenhum dado real é exibido nesta versão.</small>
      </section>
      <div id="contato"><ContatoEmail /></div>
      <div id="institucional"><RodapePublico /></div>
    </main>
  );
}
