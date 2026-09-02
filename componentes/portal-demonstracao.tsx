'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { useMemo, useState, useSyncExternalStore } from 'react';
import { Activity, BookOpenCheck, Bot, BriefcaseBusiness, Calculator, ChevronRight, CircleDollarSign, FileCheck2, Gauge, LayoutDashboard, LogOut, MessageSquareText, Plus, Search, Settings, ShieldCheck, Sparkles } from 'lucide-react';
import { calcularProposta, formatarDinheiro } from '../lib/calculos';
import type { PerfilInterno } from '../lib/contratos';
import { podeConsultarCustos } from '../lib/custos-equipamento';
import { casosDemonstracao, equipamentosDemonstracao } from '../lib/dados-demonstracao';
import { podeConsultarOrcamentos, podeCriarRascunhoOrcamento } from '../lib/orcamentos-persistentes';
import { recomendarHoras } from '../lib/recomendacao';
import { sanitizarParaIa } from '../lib/seguranca-ia';
import type { SolicitacaoParaPreProposta } from '../lib/solicitacoes-persistentes';
import { CustosEquipamento } from './custos-equipamento';
import { ConhecimentoPersistente } from './conhecimento-persistente';
import { ExecucoesPersistentes } from './execucoes-persistentes';
import { MarcaOficial } from './marca-oficial';
import { MensagensPersistentes } from './mensagens-persistentes';
import { OrcamentosPersistentes } from './orcamentos-persistentes';
import { SolicitacoesPersistentes } from './solicitacoes-persistentes';

const menuBase = [
  { id: 'visao', rotulo: 'Visão geral', icone: LayoutDashboard },
  { id: 'solicitacoes', rotulo: 'Solicitações', icone: BriefcaseBusiness },
  { id: 'orcamentos', rotulo: 'Orçamentos', icone: Calculator },
  { id: 'servicos', rotulo: 'Execução', icone: Activity },
  { id: 'conhecimento', rotulo: 'Conhecimento', icone: BookOpenCheck },
  { id: 'mensagens', rotulo: 'Mensagens', icone: MessageSquareText },
  { id: 'conteudo', rotulo: 'Conteúdo público', icone: FileCheck2 },
];

const solicitacoes = [
  { id: 'SOL-0284', empresa: 'Indústria Horizonte', servico: 'Medição tridimensional', data: 'Hoje, 09:42', estado: 'Nova' },
  { id: 'SOL-0283', empresa: 'Metalúrgica Aurora', servico: 'Digitalização óptica', data: 'Ontem, 16:18', estado: 'Em análise' },
  { id: 'SOL-0282', empresa: 'Fábrica Vetor', servico: 'Raios X industrial', data: '20 ago, 11:05', estado: 'Orçada' },
];

type PropriedadesPortal = {
  nomeUsuario?: string;
  perfilUsuario?: string;
  perfilInterno?: PerfilInterno;
  clienteSupabase?: SupabaseClient;
  aoSair?: () => void | Promise<void>;
  aoAbrirPerfil?: () => void;
  autenticado?: boolean;
};

export function PortalDemonstracao({ nomeUsuario = 'Usuário Demo', perfilUsuario = 'Administrador', perfilInterno, clienteSupabase, aoSair, aoAbrirPerfil, autenticado = false }: PropriedadesPortal) {
  const [secao, setSecao] = useState('visao');
  const [horas, setHoras] = useState(12);
  const [lucro, setLucro] = useState(25);
  const [assistenteAberto, setAssistenteAberto] = useState(false);
  const [solicitacaoParaOrcamento, setSolicitacaoParaOrcamento] = useState<SolicitacaoParaPreProposta | null>(null);
  const hidratado = useSyncExternalStore(() => () => undefined, () => true, () => false);
  const custosDisponiveis = Boolean(clienteSupabase && perfilInterno && podeConsultarCustos(perfilInterno));
  const orcamentosPersistentesDisponiveis = Boolean(clienteSupabase && perfilInterno && podeConsultarOrcamentos(perfilInterno));
  const solicitacoesPersistentesDisponiveis = Boolean(clienteSupabase && perfilInterno);
  const mensagensPersistentesDisponiveis = Boolean(clienteSupabase && perfilInterno);
  const menu = useMemo(() => custosDisponiveis
    ? [...menuBase, { id: 'custos', rotulo: 'Custos-hora', icone: CircleDollarSign }]
    : menuBase, [custosDisponiveis]);

  const item = useMemo(() => calcularProposta([{ servicoId: 'medicao-tridimensional', descricao: 'Inspeção dimensional de lote', quantidade: '20', usos: [{ maquinaId: 'duramax', horas: String(horas), custoHora: equipamentosDemonstracao[0].custoHora }], custosExtras: '280', percentualLucro: String(lucro) }])[0], [horas, lucro]);
  const recomendacao = useMemo(() => recomendarHoras({ origem: 'demonstracao', servicoId: 'medicao-tridimensional', quantidade: 20, caracteristicas: ['aco', 'geometria-complexa'], recursos: ['duramax'] }, casosDemonstracao), []);
  const previaIa = sanitizarParaIa({ tipoServico: 'Medição tridimensional', calculo: { horas, custoTecnico: 'removido antes do envio' }, licoes: ['Revisar fixação antes de programar a sequência de medição.'] });

  return (
    <div className="aplicacao" data-hidratado={hidratado ? 'sim' : 'nao'}>
      <aside className="barra-lateral">
        <a className="marca marca-interna" href="/" aria-label="Voltar à página pública"><MarcaOficial /><span className="marca-interna-legenda">Gestão de serviços e conhecimento</span></a>
        <div className="faixa-demo"><span>{autenticado ? 'HOMOLOGAÇÃO' : 'DEMONSTRAÇÃO LOCAL'}</span><small>Dados sintéticos isolados</small></div>
        <nav aria-label="Módulos internos">{menu.map(({ id, rotulo, icone: Icone }) => <button aria-label={rotulo} title={rotulo} className={secao === id ? 'ativo' : ''} key={id} type="button" onClick={() => setSecao(id)}><Icone size={18} aria-hidden="true" /><span className="menu-rotulo">{rotulo}</span>{id === 'mensagens' && !autenticado && <b>2</b>}</button>)}</nav>
        <div className="atalhos"><button type="button" onClick={aoAbrirPerfil} disabled={!aoAbrirPerfil}><Settings size={17} />Meu perfil</button><button type="button" onClick={() => aoSair ? void aoSair() : window.location.assign('/')}><LogOut size={17} />Sair</button></div>
        <div className="usuario"><span>{nomeUsuario.split(/\s+/).slice(0, 2).map((parte) => parte[0]).join('').toUpperCase()}</span><div><strong>{nomeUsuario}</strong><small>{perfilUsuario}</small></div></div>
      </aside>

      <main className="conteudo-interno">
        <header className="cabecalho-interno">
          <div><p>AMBIENTE DE HOMOLOGAÇÃO</p><h1>{menu.find((itemMenu) => itemMenu.id === secao)?.rotulo}</h1></div>
          <div className="controles-cabecalho-interno">
            <div className="acoes-conta-responsivas" aria-label="Conta e sessão"><button type="button" onClick={aoAbrirPerfil} disabled={!aoAbrirPerfil} title="Meu perfil"><Settings size={18} /><span>Meu perfil</span></button><button type="button" onClick={() => aoSair ? void aoSair() : window.location.assign('/')} title="Sair"><LogOut size={18} /><span>Sair</span></button></div>
            {secao !== 'custos' && <div className="acoes-internas"><label className="busca"><Search size={17} /><input aria-label="Buscar no portal" placeholder="Buscar serviços, empresas..." /></label><button className="icone-botao" type="button" aria-label="Abrir mensagens"><MessageSquareText size={19} /><i /></button><button className="botao-interno" type="button" onClick={() => setSecao('orcamentos')}>{perfilInterno && !podeCriarRascunhoOrcamento(perfilInterno) ? <><Calculator size={17} /> Ver orçamentos</> : <><Plus size={17} /> Novo orçamento</>}</button></div>}
          </div>
        </header>

        {secao === 'visao' && <VisaoGeral setSecao={setSecao} />}
        {secao === 'solicitacoes' && (solicitacoesPersistentesDisponiveis && clienteSupabase && perfilInterno
          ? <SolicitacoesPersistentes cliente={clienteSupabase} perfil={perfilInterno} aoCriarPreProposta={(solicitacao) => { setSolicitacaoParaOrcamento(solicitacao); setSecao('orcamentos'); }} />
          : <TabelaSolicitacoes />)}
        {secao === 'orcamentos' && (orcamentosPersistentesDisponiveis && clienteSupabase && perfilInterno
          ? <OrcamentosPersistentes cliente={clienteSupabase} perfil={perfilInterno} solicitacaoInicial={solicitacaoParaOrcamento} aoConsumirSolicitacao={() => setSolicitacaoParaOrcamento(null)} />
          : <Calculadora horas={horas} setHoras={setHoras} lucro={lucro} setLucro={setLucro} item={item} recomendacao={recomendacao} />)}
        {secao === 'servicos' && (clienteSupabase && perfilInterno
          ? <ExecucoesPersistentes cliente={clienteSupabase} perfil={perfilInterno} />
          : <ExecucaoDemonstrativa />)}
        {secao === 'conhecimento' && (clienteSupabase && perfilInterno
          ? <ConhecimentoPersistente cliente={clienteSupabase} perfil={perfilInterno} />
          : <Conhecimento recomendacao={recomendacao} />)}
        {secao === 'mensagens' && (mensagensPersistentesDisponiveis && clienteSupabase && perfilInterno
          ? <MensagensPersistentes cliente={clienteSupabase} perfil={perfilInterno} />
          : <Mensagens />)}
        {secao === 'conteudo' && <ConteudoPublico />}
        {secao === 'custos' && clienteSupabase && perfilInterno && <CustosEquipamento cliente={clienteSupabase} perfil={perfilInterno} />}
      </main>

      {secao !== 'custos' && !(secao === 'orcamentos' && orcamentosPersistentesDisponiveis) && !(secao === 'mensagens' && mensagensPersistentesDisponiveis) && <button className="assistente-atalho" type="button" onClick={() => setAssistenteAberto(!assistenteAberto)} aria-expanded={assistenteAberto}><Sparkles size={19} /> Assistente interno</button>}
      {assistenteAberto && secao !== 'custos' && !(secao === 'orcamentos' && orcamentosPersistentesDisponiveis) && !(secao === 'mensagens' && mensagensPersistentesDisponiveis) && <aside className="assistente" aria-label="Assistente interno"><header><span><Bot size={19} /> Assistente interno</span><button type="button" onClick={() => setAssistenteAberto(false)} aria-label="Fechar">×</button></header><div className="mensagem-ia"><small>PRÉVIA SANITIZADA</small><p>{JSON.stringify(previaIa.conteudo)}</p><span><ShieldCheck size={14} /> Campos sensíveis removidos antes do envio</span></div><div className="resposta-ia"><p>O preço exibido foi calculado de forma determinística: custo da DuraMax pelas horas informadas, mais extras e o lucro definido. Eu apenas explico o resultado; não altero o cálculo.</p><small>Fonte: orçamento atual · cálculo local</small></div><form onSubmit={(evento) => evento.preventDefault()}><label htmlFor="mensagem-assistente">Pergunte sobre esta tela</label><div><input id="mensagem-assistente" placeholder="Como este valor foi calculado?" /><button type="submit" aria-label="Enviar"><ChevronRight size={18} /></button></div></form></aside>}
    </div>
  );
}

function VisaoGeral({ setSecao }: { setSecao: (secao: string) => void }) {
  const cards = [
    { rotulo: 'Solicitações abertas', valor: '12', detalhe: '3 novas hoje', icone: BriefcaseBusiness, cor: 'azul' },
    { rotulo: 'Em execução', valor: '8', detalhe: '7 dentro do prazo', icone: Activity, cor: 'ciano' },
    { rotulo: 'Propostas aguardando', valor: '5', detalhe: 'R$ 48,7 mil', icone: FileCheck2, cor: 'amarelo' },
    { rotulo: 'Assertividade mensal', valor: '87%', detalhe: '+6 p.p. vs. julho', icone: Gauge, cor: 'verde' },
  ];
  return <div className="painel"><section className="cards-kpi" aria-label="Indicadores principais">{cards.map(({ rotulo, valor, detalhe, icone: Icone, cor }) => <article key={rotulo}><span className={`icone-kpi ${cor}`}><Icone size={20} /></span><small>{rotulo}</small><strong>{valor}</strong><p>{detalhe}</p></article>)}</section><div className="grade-painel"><section className="bloco"><header><div><h2>Solicitações recentes</h2><p>Priorize as entradas que aguardam triagem.</p></div><button type="button" onClick={() => setSecao('solicitacoes')}>Ver todas <ChevronRight size={15} /></button></header><TabelaSolicitacoes compacta /></section><section className="bloco fluxo"><header><div><h2>Ciclo de valor</h2><p>Distribuição dos serviços ativos.</p></div></header><div className="anel" aria-label="72% do ciclo concluído"><span><strong>72%</strong><small>no fluxo</small></span></div><ul><li><i className="cor-1" />Orçar <b>12</b></li><li><i className="cor-2" />Executar <b>8</b></li><li><i className="cor-3" />Validar lição <b>4</b></li><li><i className="cor-4" />Concluído <b>23</b></li></ul></section></div><section className="alerta-conhecimento"><BookOpenCheck size={23} /><div><strong>4 lições aguardam validação</strong><p>Formalizá-las pode melhorar a confiança das próximas recomendações.</p></div><button type="button" onClick={() => setSecao('conhecimento')}>Revisar lições</button></section></div>;
}

function TabelaSolicitacoes({ compacta = false }: { compacta?: boolean }) {
  return <div className={`tabela-wrap ${compacta ? 'compacta' : 'pagina-tabela'}`}><table><thead><tr><th>Solicitação</th><th>Empresa</th><th>Serviço</th><th>Recebida</th><th>Estado</th><th><span className="sr-only">Ação</span></th></tr></thead><tbody>{solicitacoes.map((solicitacao) => <tr key={solicitacao.id}><td><strong>{solicitacao.id}</strong></td><td>{solicitacao.empresa}</td><td>{solicitacao.servico}</td><td>{solicitacao.data}</td><td><span className={`estado estado-${solicitacao.estado.toLowerCase().replace(' ', '-')}`}>{solicitacao.estado}</span></td><td><button type="button" aria-label={`Abrir ${solicitacao.id}`}><ChevronRight size={17} /></button></td></tr>)}</tbody></table>{!compacta && <div className="estado-vazio"><ShieldCheck size={18} /><span>Todos estes registros têm origem <b>demonstracao</b>.</span></div>}</div>;
}

function Calculadora({ horas, setHoras, lucro, setLucro, item, recomendacao }: { horas: number; setHoras: (valor: number) => void; lucro: number; setLucro: (valor: number) => void; item: ReturnType<typeof calcularProposta>[number]; recomendacao: ReturnType<typeof recomendarHoras> }) {
  return <div className="painel orcamento"><section className="bloco editor-orcamento"><header><div><p className="passo">ORÇAMENTO DEMONSTRATIVO · RASCUNHO</p><h2>Inspeção dimensional de lote</h2></div><span className="estado estado-rascunho">Rascunho</span></header><div className="campos"><label>Equipamento<select defaultValue="duramax">{equipamentosDemonstracao.map((equipamento) => <option key={equipamento.id} value={equipamento.id}>{equipamento.nome}</option>)}</select></label><label>Horas estimadas<input type="number" min="0" step="0.5" value={horas} onChange={(evento) => setHoras(Number(evento.target.value))} /></label><label>Custos extras (BRL)<input type="number" min="0" defaultValue="280" /></label><label>Lucro (%)<input type="number" min="0" value={lucro} onChange={(evento) => setLucro(Number(evento.target.value))} /></label></div><div className="recomendacao-inline"><Sparkles size={20} /><div><strong>Assistente estatístico: {recomendacao.horasSugeridas?.toDecimalPlaces(1).toString()} h sugeridas</strong><p>{recomendacao.quantidadeCasos} casos comparáveis · confiança {recomendacao.confianca} · faixa {recomendacao.q1?.toDecimalPlaces(1).toString()}–{recomendacao.q3?.toDecimalPlaces(1).toString()} h</p></div><button type="button" onClick={() => setHoras(recomendacao.horasSugeridas?.toDecimalPlaces(1).toNumber() ?? horas)}>Aplicar</button></div></section><aside className="bloco resumo-orcamento"><p>RESUMO DO ITEM</p><dl><div><dt>Custo das máquinas</dt><dd>{formatarDinheiro(item.custo.minus(280))}</dd></div><div><dt>Custos extras</dt><dd>R$ 280,00</dd></div><div><dt>Custo total</dt><dd>{formatarDinheiro(item.custo)}</dd></div><div><dt>Lucro ({lucro}%)</dt><dd>{formatarDinheiro(item.precoAntesAjuste.minus(item.custo))}</dd></div><div className="total"><dt>Preço antes do ajuste</dt><dd>{formatarDinheiro(item.precoFinal)}</dd></div></dl><small><ShieldCheck size={13} /> Valores congelados somente após publicação</small><button className="botao-interno" type="button"><FileCheck2 size={17} /> Enviar para validação</button></aside></div>;
}

function ExecucaoDemonstrativa() { return <div className="painel"><section className="bloco estado-vazio-execucao"><Activity size={28} /><h3>Execução persistente indisponível</h3><p>Entre na homologação autenticada para acompanhar e atualizar as etapas demonstrativas.</p></section></div>; }

function Conhecimento({ recomendacao }: { recomendacao: ReturnType<typeof recomendarHoras> }) { return <div className="painel"><section className="cards-kpi conhecimento-kpi"><article><span className="icone-kpi azul"><BookOpenCheck /></span><small>Lições formalizadas</small><strong>23</strong><p>4 aguardam validação</p></article><article><span className="icone-kpi verde"><Gauge /></span><small>Confiança atual</small><strong>{recomendacao.confianca}</strong><p>{recomendacao.quantidadeCasos} casos elegíveis</p></article><article><span className="icone-kpi ciano"><Activity /></span><small>Fator de correção</small><strong>{recomendacao.fatorCorrecao?.toDecimalPlaces(2).toString()}×</strong><p>mediana realizado ÷ estimado</p></article></section><section className="bloco tabela-licoes"><header><div><h2>Conhecimento validado</h2><p>Apenas estas lições influenciam recomendações.</p></div><button type="button"><Plus size={15} /> Nova lição</button></header>{['Revisar estratégia de fixação antes da programação', 'Validar qualidade do CAD no recebimento', 'Reservar tempo para estabilização térmica'].map((titulo, indice) => <article key={titulo}><span className="numero-licao">L{23 - indice}</span><div><strong>{titulo}</strong><p>Medição tridimensional · Revisão {indice + 1} · 18–20 ago</p></div><span className="estado estado-formalizada">Formalizada</span><button type="button" aria-label={`Abrir lição ${titulo}`}><ChevronRight size={17} /></button></article>)}</section></div>; }

function Mensagens() { return <div className="painel"><section className="bloco mensagens"><aside><h2>Conversas</h2>{solicitacoes.slice(0,2).map((item, indice) => <button className={indice === 0 ? 'ativo' : ''} type="button" key={item.id}><span>{item.empresa.slice(0,2).toUpperCase()}</span><div><strong>{item.empresa}</strong><small>{item.id} · {indice ? 'Enviei os arquivos...' : 'Podemos confirmar...'}</small></div>{indice === 0 && <b>2</b>}</button>)}</aside><div className="conversa"><header><div><strong>Indústria Horizonte</strong><small>SOL-0284 · Canal persistente</small></div><span className="estado estado-em-analise">Em análise</span></header><div className="baloes"><p className="recebida">Olá! Podemos confirmar a tolerância indicada no desenho?<small>09:58</small></p><p className="enviada">Sim, a tolerância crítica é de 0,01 mm. O arquivo da solicitação é a versão atual.<small>10:04</small></p><p className="recebida">Perfeito. Vamos considerar essa informação na proposta.<small>10:07</small></p></div><form onSubmit={(evento) => evento.preventDefault()}><input aria-label="Mensagem" placeholder="Escreva uma mensagem..." /><button type="submit">Enviar</button></form></div></section></div>; }

function ConteudoPublico() { return <div className="painel"><section className="bloco tabela-licoes"><header><div><h2>Páginas e catálogo</h2><p>Português é canônico; traduções ausentes usam fallback sinalizado.</p></div><button type="button"><Plus size={15} /> Novo conteúdo</button></header>{[['Início','PT · tradução pendente','Publicado'],['Medição tridimensional','PT · tradução pendente','Publicado'],['Raios X industrial','PT · tradução pendente','Rascunho'],['Política de privacidade','PT · tradução pendente','Em validação']].map(([titulo,idiomas,estado]) => <article key={titulo}><span className="numero-licao"><FileCheck2 size={17} /></span><div><strong>{titulo}</strong><p>{idiomas}</p></div><span className={`estado estado-${estado.toLowerCase().replace(' ', '-')}`}>{estado}</span><button type="button" aria-label={`Abrir ${titulo}`}><ChevronRight size={17} /></button></article>)}</section></div>; }
