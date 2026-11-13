'use client';

import { Bot, MessageCircleQuestion, Send, Sparkles, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  criarMensagemChatIa,
  obterSugestoesChatbotPublico,
  responderChatbotPublico,
  type MensagemChatIa,
} from '../lib/chatbot-metrologia';
import type { IdiomaPublico } from '../lib/idioma-publico';
import { useIdiomaPublico } from '../lib/traducao-publica';

const textosInterface: Record<
  IdiomaPublico,
  {
    botaoAbrir: string;
    titulo: string;
    subtitulo: string;
    boasVindas: string;
    placeholder: string;
    enviar: string;
    fechar: string;
    pensando: string;
    sugestoesTitulo: string;
  }
> = {
  'pt-BR': {
    botaoAbrir: 'Dúvidas sobre o Centro',
    titulo: 'Assistente do Laboratório SENAI',
    subtitulo: 'Informações sobre o Centro, eventos, equipamentos ZEISS e serviços',
    boasVindas:
      'Olá! Sou o assistente público do Centro de Excelência em Metrologia SENAI / ZEISS. Posso tirar dúvidas sobre o laboratório, eventos e novidades, máquinas ZEISS, setores atendidos e como solicitar orçamento.',
    placeholder: 'Pergunte sobre o laboratório, eventos ou equipamentos...',
    enviar: 'Enviar pergunta',
    fechar: 'Fechar assistente',
    pensando: 'Consultando informações do Centro...',
    sugestoesTitulo: 'Perguntas frequentes:',
  },
  en: {
    botaoAbrir: 'Ask about the Center',
    titulo: 'SENAI Lab Assistant',
    subtitulo: 'Information about the Center, events, ZEISS equipment and services',
    boasVindas:
      'Hello! I am the public assistant for the SENAI / ZEISS Metrology Center of Excellence. Ask me about the lab, events & news, ZEISS machines, industrial sectors or how to request a quote.',
    placeholder: 'Ask about the lab, events or equipment...',
    enviar: 'Send question',
    fechar: 'Close assistant',
    pensando: 'Checking Center information...',
    sugestoesTitulo: 'Suggested questions:',
  },
  de: {
    botaoAbrir: 'Fragen zum Zentrum',
    titulo: 'SENAI Labor-Assistent',
    subtitulo: 'Informationen über das Zentrum, Veranstaltungen, ZEISS-Geräte und Leistungen',
    boasVindas:
      'Hallo! Ich bin der öffentliche Assistent des SENAI / ZEISS Kompetenzzentrums für Messtechnik. Fragen Sie mich nach dem Labor, Veranstaltungen, ZEISS-Systemen oder Angebotsanfragen.',
    placeholder: 'Fragen Sie nach Labor, Veranstaltungen oder Geräten...',
    enviar: 'Frage senden',
    fechar: 'Assistent schließen',
    pensando: 'Informationen werden abgerufen...',
    sugestoesTitulo: 'Häufige Fragen:',
  },
};

export function ChatbotPublico() {
  const idioma = useIdiomaPublico();
  const ui = textosInterface[idioma] ?? textosInterface['pt-BR'];
  const [aberto, setAberto] = useState(false);
  const [entrada, setEntrada] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [mensagens, setMensagens] = useState<MensagemChatIa[]>([]);
  const fimListaRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function aoPressionarTecla(e: KeyboardEvent) {
      if (e.key === 'Escape') setAberto(false);
    }
    window.addEventListener('keydown', aoPressionarTecla);
    return () => window.removeEventListener('keydown', aoPressionarTecla);
  }, []);

  useEffect(() => {
    if (aberto) {
      fimListaRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aberto, mensagens]);

  async function enviarPergunta(textoPergunta: string) {
    const limpa = textoPergunta.trim();
    if (!limpa || carregando) return;

    const msgUsuario = criarMensagemChatIa('usuario', limpa, idioma);

    setMensagens((atuais) => [...atuais, msgUsuario]);
    setEntrada('');
    setCarregando(true);

    try {
      const resposta = await responderChatbotPublico(limpa, idioma);
      const msgBot = criarMensagemChatIa('assistente', resposta.texto, idioma, resposta.fontes);
      setMensagens((atuais) => [...atuais, msgBot]);
    } finally {
      setCarregando(false);
    }
  }

  const sugestoes = obterSugestoesChatbotPublico(idioma);

  return (
    <div className="chatbot-publico-container">
      {!aberto && (
        <button
          type="button"
          className="chatbot-publico-gatilho"
          onClick={() => setAberto(true)}
          aria-label={ui.botaoAbrir}
        >
          <MessageCircleQuestion size={20} aria-hidden="true" />
          <span>{ui.botaoAbrir}</span>
        </button>
      )}

      {aberto && (
        <aside className="chatbot-publico-painel" aria-label={ui.titulo}>
          <header className="chatbot-publico-cabecalho">
            <div className="chatbot-publico-titulo">
              <Bot size={20} aria-hidden="true" />
              <div>
                <strong>{ui.titulo}</strong>
                <small>{ui.subtitulo}</small>
              </div>
            </div>
            <button
              type="button"
              className="chatbot-publico-fechar"
              onClick={() => setAberto(false)}
              aria-label={ui.fechar}
            >
              <X size={18} />
            </button>
          </header>

          <div className="chatbot-publico-mensagens">
            <div className="chatbot-bolha assistente">
              <p>{ui.boasVindas}</p>
            </div>

            <div className="chatbot-sugestoes">
              <small>
                <Sparkles size={13} /> {ui.sugestoesTitulo}
              </small>
              <div className="chatbot-sugestoes-lista">
                {sugestoes.map((sugestao) => (
                  <button
                    key={sugestao}
                    type="button"
                    onClick={() => void enviarPergunta(sugestao)}
                  >
                    {sugestao}
                  </button>
                ))}
              </div>
            </div>

            {mensagens.map((msg) => (
              <div key={msg.id} className={`chatbot-bolha ${msg.autor}`}>
                <div className="chatbot-texto-formatado">
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
                  <small className="chatbot-fontes">{msg.fontes.join(' · ')}</small>
                )}
              </div>
            ))}

            {carregando && (
              <div className="chatbot-bolha assistente carregando">
                <p>{ui.pensando}</p>
              </div>
            )}
            <div ref={fimListaRef} />
          </div>

          <form
            className="chatbot-publico-form"
            onSubmit={(e) => {
              e.preventDefault();
              void enviarPergunta(entrada);
            }}
          >
            <input
              type="text"
              value={entrada}
              onChange={(e) => setEntrada(e.target.value)}
              placeholder={ui.placeholder}
              aria-label={ui.placeholder}
            />
            <button type="submit" disabled={!entrada.trim() || carregando} aria-label={ui.enviar}>
              <Send size={17} />
            </button>
          </form>
        </aside>
      )}
    </div>
  );
}
