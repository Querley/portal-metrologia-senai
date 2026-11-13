'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  AlertTriangle,
  Bot,
  Database,
  FileText,
  MessageSquareText,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  carregarContextoOperacionalLaboratorio,
  criarContextoDemonstrativoFallback,
  criarMensagemChatIa,
  obterSugestoesChatbotInterno,
  responderChatbotInternoLaboratorio,
  type ContextoOperacionalLaboratorio,
  type MensagemChatIa,
} from '../lib/chatbot-metrologia';
import type { PerfilInterno } from '../lib/contratos';
import { servicosOficiais } from '../lib/servicos';

export function ChatbotLaboratorioInterno({
  cliente,
  perfil = 'administrador',
}: {
  cliente?: SupabaseClient;
  perfil?: PerfilInterno;
}) {
  const [contexto, setContexto] = useState<ContextoOperacionalLaboratorio>(() =>
    criarContextoDemonstrativoFallback(perfil),
  );
  const [sincronizando, setSincronizando] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [entrada, setEntrada] = useState('');
  const [mensagens, setMensagens] = useState<MensagemChatIa[]>([]);
  const fimRef = useRef<HTMLDivElement | null>(null);

  const sincronizarDados = useCallback(async () => {
    setSincronizando(true);
    try {
      const carregado = await carregarContextoOperacionalLaboratorio(cliente, perfil);
      setContexto(carregado);
    } finally {
      setSincronizando(false);
    }
  }, [cliente, perfil]);

  useEffect(() => {
    queueMicrotask(() => void sincronizarDados());
  }, [sincronizarDados]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens, processando]);

  async function perguntar(textoPergunta: string) {
    const limpa = textoPergunta.trim();
    if (!limpa || processando) return;

    const msgUsuario = criarMensagemChatIa('usuario', limpa, 'pt-BR');

    setMensagens((atuais) => [...atuais, msgUsuario]);
    setEntrada('');
    setProcessando(true);

    try {
      const resposta = await responderChatbotInternoLaboratorio(limpa, contexto);
      const msgAssistente = criarMensagemChatIa('assistente', resposta.texto, 'pt-BR', resposta.fontes);
      setMensagens((atuais) => [...atuais, msgAssistente]);
    } finally {
      setProcessando(false);
    }
  }

  const totalAnexos = Object.values(contexto.anexosPorSolicitacao).reduce(
    (acc, lista) => acc + lista.length,
    0,
  );
  const totalMensagensCliente = contexto.conversas.reduce(
    (acc, conv) => acc + conv.mensagens.length,
    0,
  );
  const totalOcorrencias = contexto.execucoes.filter(
    (ex) => ex.retrabalho || ex.mudanca_escopo,
  ).length;

  return (
    <div className="painel painel-chatbot-interno">
      <section className="cabecalho-custos">
        <div>
          <span>
            <Bot size={17} /> Base Integrada do Laboratório · Perfil: {perfil.toUpperCase()}
          </span>
          <h2>Chatbot Interno da Equipe</h2>
          <p>
            Consulte pelo nome do serviço, empresa ou protocolo para ver o que pediram, PDFs e anexos,
            instruções/etapas, problemas ocorridos, mensagens de clientes e lições aprendidas.
          </p>
        </div>
        <button type="button" onClick={() => void sincronizarDados()} disabled={sincronizando}>
          <RefreshCw size={16} className={sincronizando ? 'girando' : ''} />{' '}
          {sincronizando ? 'Sincronizando...' : 'Sincronizar base'}
        </button>
      </section>

      <section className="chatbot-interno-kpis" aria-label="Resumo da base indexada">
        <button
          type="button"
          className="chatbot-kpi-card"
          onClick={() => void perguntar('Resumo geral do laboratório')}
        >
          <Database size={18} />
          <div>
            <strong>{contexto.solicitacoes.length} solicitações · {contexto.execucoes.length} execuções</strong>
            <small>Clique para ver o panorama completo</small>
          </div>
        </button>
        <button
          type="button"
          className="chatbot-kpi-card"
          onClick={() => void perguntar('Quais PDFs e anexos temos nas solicitações e mensagens?')}
        >
          <FileText size={18} />
          <div>
            <strong>{totalAnexos} anexos/PDFs · {contexto.orcamentos.length} propostas</strong>
            <small>Ver arquivos, desenhos e PDFs</small>
          </div>
        </button>
        <button
          type="button"
          className="chatbot-kpi-card"
          onClick={() => void perguntar('Quais problemas, retrabalhos ou mudanças de escopo aconteceram?')}
        >
          <AlertTriangle size={18} />
          <div>
            <strong>{totalOcorrencias} ocorrências / retrabalhos</strong>
            <small>Ver problemas e causas registradas</small>
          </div>
        </button>
        <button
          type="button"
          className="chatbot-kpi-card"
          onClick={() => void perguntar('O que os clientes enviaram nas mensagens recentemente?')}
        >
          <MessageSquareText size={18} />
          <div>
            <strong>{totalMensagensCliente} mensagens de clientes</strong>
            <small>Ver histórico de conversas</small>
          </div>
        </button>
      </section>

      <section className="chatbot-atalhos-servicos">
        <div className="chatbot-atalhos-cabecalho">
          <Wrench size={15} />
          <strong>Consultar dossiê imediato por nome do serviço:</strong>
        </div>
        <div className="chatbot-chips-servicos">
          {servicosOficiais.map((servico) => (
            <button
              key={servico.slug}
              type="button"
              className="chip-servico-ia"
              onClick={() =>
                void perguntar(`Me dê o dossiê completo do serviço: ${servico.titulo}`)
              }
            >
              {servico.titulo}
            </button>
          ))}
        </div>
      </section>

      <section className="chatbot-interno-janela" aria-label="Conversa com o Chatbot Interno">
        <div className="chatbot-interno-historico">
          {mensagens.length === 0 && (
            <div className="chatbot-interno-boas-vindas">
              <div className="icone-destaque-ia">
                <Sparkles size={22} />
              </div>
              <h3>Pergunte sobre qualquer serviço, trabalho, PDF, problema ou mensagem</h3>
              <p>
                Basta digitar o nome do serviço (ex.: <em>Metrologia avançada</em>,{' '}
                <em>Tomografia industrial</em>, <em>Escaneamento 3D</em>, <em>Engenharia reversa</em>),
                o protocolo (ex.: <em>SOL-0284</em>) ou escolher uma pergunta rápida abaixo:
              </p>
              <div className="chatbot-interno-sugestoes">
                {obterSugestoesChatbotInterno().map((sugestao) => (
                  <button
                    key={sugestao}
                    type="button"
                    onClick={() => void perguntar(sugestao)}
                  >
                    <Sparkles size={14} /> {sugestao}
                  </button>
                ))}
              </div>
            </div>
          )}

          {mensagens.map((msg) => (
            <article key={msg.id} className={`mensagem-chat-interno ${msg.autor}`}>
              <header>
                <strong>
                  {msg.autor === 'usuario' ? 'Você (Membro do Laboratório)' : 'Chatbot do Laboratório SENAI'}
                </strong>
                <small>{msg.criadaEm}</small>
              </header>
              <div className="corpo-mensagem-chat-interno">
                {msg.texto.split('\n').map((linha, idx) => {
                  const ehTitulo = linha.startsWith('### ');
                  const limpa = ehTitulo ? linha.slice(4) : linha;
                  const partes = limpa.split(/(\*\*[^*]+\*\*)/g);
                  return (
                    <p key={idx} style={ehTitulo ? { fontWeight: 800, marginTop: '6px' } : undefined}>
                      {partes.map((p, i) =>
                        p.startsWith('**') && p.endsWith('**') ? (
                          <strong key={i}>{p.slice(2, -2)}</strong>
                        ) : (
                          p
                        ),
                      )}
                    </p>
                  );
                })}
              </div>
              {msg.fontes && msg.fontes.length > 0 && (
                <footer>
                  <ShieldCheck size={14} />
                  <span>Fontes consultadas: {msg.fontes.join(' · ')}</span>
                </footer>
              )}
            </article>
          ))}

          {processando && (
            <article className="mensagem-chat-interno assistente">
              <header>
                <strong>Chatbot do Laboratório SENAI</strong>
              </header>
              <p>Consultando solicitações, anexos, execuções, mensagens e lições aprendidas...</p>
            </article>
          )}
          <div ref={fimRef} />
        </div>

        <form
          className="chatbot-interno-formulario"
          onSubmit={(e) => {
            e.preventDefault();
            void perguntar(entrada);
          }}
        >
          <input
            type="text"
            value={entrada}
            onChange={(e) => setEntrada(e.target.value)}
            placeholder="Digite o nome do serviço, empresa, protocolo ou pergunte sobre PDFs, problemas e mensagens..."
            aria-label="Perguntar ao Chatbot Interno do Laboratório"
          />
          <button type="submit" disabled={!entrada.trim() || processando}>
            <Send size={17} /> Perguntar
          </button>
        </form>
      </section>
    </div>
  );
}
