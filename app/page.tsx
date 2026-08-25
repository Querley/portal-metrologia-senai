import { CarrosselMidia } from '../componentes/carrossel-midia';
import { MarcaOficial } from '../componentes/marca-oficial';
import { MenuMovel } from '../componentes/menu-movel';
import { RodapePublico } from '../componentes/rodape-publico';
import { VideoPublico } from '../componentes/video-publico';
import type { MidiaEquipamento } from '../lib/equipamentos';
import './publico.css';

const servicos = [
  { sigla: '3D', titulo: 'Escaneamento 3D e digitalização de peças', texto: 'Captura de superfícies para inspeção, documentação, comparação com CAD e engenharia reversa.' },
  { sigla: 'CMM', titulo: 'Metrologia avançada ZEISS e inspeção dimensional', texto: 'Medição de dimensões, forma, posição e geometrias complexas com relatórios técnicos.' },
  { sigla: 'CT', titulo: 'Tomografia industrial', texto: 'Inspeção interna não destrutiva conforme a viabilidade técnica do material e da geometria.' },
];

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

      <section className="laboratorio-real" id="equipamentos">
        <div className="laboratorio-texto"><p className="sobrelinha"><span /> ESTRUTURA REAL</p><h2>Um centro de excelência preparado para medir o que importa.</h2><p>O laboratório reúne medição por coordenadas, inspeção por raios X e digitalização óptica em um ambiente dedicado à precisão.</p><a className="link-seta" href="/catalogo#equipamentos">Conheça os equipamentos <span aria-hidden="true">→</span></a></div>
        <CarrosselMidia midias={midiasLaboratorio} rotulo="Galeria do Centro de Excelência em Metrologia" />
      </section>

      <section className="secao" id="servicos">
        <div className="cabecalho-secao">
          <div><p className="sobrelinha"><span /> NOSSAS CAPACIDADES</p><h2>Metrologia para desafios reais</h2></div>
          <p>Da inspeção de rotina à análise de geometrias complexas, encontre a tecnologia certa para o seu projeto.</p>
        </div>
        <div className="grade-servicos">
          {servicos.map((servico) => <article className="servico" key={servico.sigla}><span className="servico-sigla">{servico.sigla}</span><h3>{servico.titulo}</h3><p>{servico.texto}</p><a href="/catalogo" aria-label={`Saiba mais sobre ${servico.titulo}`}>Explorar serviço <span aria-hidden="true">→</span></a></article>)}
        </div>
      </section>

      <section className="ciclo" id="como-funciona">
        <div className="ciclo-intro"><p className="sobrelinha sobrelinha-clara"><span /> UM CICLO DE MELHORIA CONTÍNUA</p><h2>Cada serviço torna o próximo orçamento mais confiável.</h2><p>Experiência deixa de ficar dispersa e se transforma em recomendações revisadas por especialistas.</p></div>
        <ol className="etapas">{etapas.map(([numero, titulo, texto]) => <li key={numero}><span>{numero}</span><h3>{titulo}</h3><p>{texto}</p></li>)}</ol>
      </section>

      <section className="chamada" id="solicitar">
        <p className="sobrelinha"><span /> COMECE AGORA</p><h2>Tem um desafio de medição?</h2><p>Conte o que você precisa. Nossa equipe analisa os dados e prepara uma proposta sob medida.</p><a className="botao" href="/solicitar">Solicitar orçamento <span aria-hidden="true">→</span></a><small>Ambiente de demonstração — nenhum dado real é exibido nesta versão.</small>
      </section>
      <div id="institucional"><RodapePublico /></div>
    </main>
  );
}
