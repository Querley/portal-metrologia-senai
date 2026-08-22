import Image from 'next/image';
import { MarcaOficial } from '../componentes/marca-oficial';

const servicos = [
  { sigla: 'CMM', titulo: 'Medição tridimensional', texto: 'Inspeção dimensional com máquinas de alta precisão para peças e conjuntos.' },
  { sigla: 'CT', titulo: 'Tomografia industrial', texto: 'Análise não destrutiva de geometrias internas e falhas sem cortar a peça.' },
  { sigla: '3D', titulo: 'Digitalização óptica', texto: 'Captura de superfícies para inspeção, engenharia reversa e comparação com CAD.' },
];

const etapas = [
  ['01', 'Orçar', 'Dados históricos apoiam uma estimativa transparente.'],
  ['02', 'Executar', 'O serviço registra esforço, recursos e ocorrências reais.'],
  ['03', 'Comparar', 'Indicadores revelam desvios de custo, prazo e esforço.'],
  ['04', 'Aprender', 'Lições validadas passam a orientar novos orçamentos.'],
];

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
            <span><b>7</b> equipamentos especializados</span><span><b>3</b> idiomas disponíveis</span><span><b>100%</b> acompanhamento digital</span>
          </div>
        </div>
        <div className="hero-visual" aria-label="Painel ilustrativo de acompanhamento de serviço">
          <Image className="foto-hero" src="/imagens/laboratorio-centro-excelencia.jpeg" fill sizes="(max-width: 980px) 100vw, 50vw" alt="Centro de Excelência em Metrologia SENAI ZEISS visto de frente" priority />
          <div className="hero-velatura" />
          <div className="medicao">
            <div className="medicao-topo"><span>INSPEÇÃO DIMENSIONAL</span><b>Em execução</b></div>
            <div className="peca" aria-hidden="true">
              <span className="eixo eixo-x">X</span><span className="eixo eixo-y">Y</span><div className="forma forma-a" /><div className="forma forma-b" /><i className="ponto ponto-a" /><i className="ponto ponto-b" /><i className="ponto ponto-c" />
            </div>
            <div className="progresso"><span><b>Progresso do serviço</b><small>72%</small></span><i><b /></i></div>
          </div>
          <div className="cartao-flutuante cartao-prazo"><small>PREVISÃO DE ENTREGA</small><strong>28 AGO</strong><span>No prazo</span></div>
          <div className="cartao-flutuante cartao-precisao"><small>PRECISÃO</small><strong>0,003 <i>mm</i></strong><span>Dentro da tolerância</span></div>
        </div>
      </section>

      <section className="laboratorio-real" id="equipamentos">
        <div className="laboratorio-texto"><p className="sobrelinha"><span /> ESTRUTURA REAL</p><h2>Um centro de excelência preparado para medir o que importa.</h2><p>O laboratório reúne medição por coordenadas, tomografia industrial e digitalização óptica em um ambiente dedicado à precisão.</p><a className="link-seta" href="/catalogo#equipamentos">Conheça os equipamentos <span aria-hidden="true">→</span></a></div>
        <div className="mosaico-laboratorio"><figure><Image src="/imagens/laboratorio-prismo.jpeg" fill sizes="40vw" alt="Máquina ZEISS PRISMO instalada no laboratório" /><figcaption>ZEISS PRISMO</figcaption></figure><figure><Image src="/imagens/laboratorio-atos-q.jpeg" fill sizes="25vw" alt="Scanner óptico ZEISS ATOS Q instalado no laboratório" /><figcaption>ZEISS ATOS Q</figcaption></figure><figure><Image src="/imagens/laboratorio-bosello.jpeg" fill sizes="25vw" alt="Tomógrafo ZEISS BOSELLO MAX instalado no laboratório" /><figcaption>ZEISS BOSELLO MAX</figcaption></figure></div>
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
      <footer id="institucional"><MarcaOficial classe="marca-rodape" /><p>Portal para gestão de serviços e conhecimento em orçamentação.</p><nav aria-label="Links do rodapé"><a href="/privacidade">Privacidade</a><a href="#inicio">Acessibilidade</a><a href="/solicitar">Contato</a></nav></footer>
    </main>
  );
}
