import { NextResponse } from 'next/server';
import { equipamentosPublicos } from '../../../lib/equipamentos';
import { servicosOficiais } from '../../../lib/servicos';
import {
  ETAPAS_INSTRUCOES_POR_SERVICO,
  EVENTOS_PADRAO_LABORATORIO,
  type ContextoOperacionalLaboratorio,
} from '../../../lib/chatbot-metrologia';

type MensagemHistorico = { autor: 'usuario' | 'assistente'; texto: string };

function sanitizarContextoPorPerfil(contexto: ContextoOperacionalLaboratorio): unknown {
  if (contexto.perfil !== 'tecnico') return contexto;
  return {
    ...contexto,
    orcamentos: contexto.orcamentos.map((o) => ({
      ...o,
      preco_final: undefined,
      custo_congelado: undefined,
    })),
    indicadores: contexto.indicadores.map((i) => ({
      ...i,
      custo_estimado: undefined,
      custo_realizado: undefined,
    })),
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      modo?: 'publico' | 'interno';
      idioma?: 'pt-BR' | 'en' | 'de';
      pergunta?: string;
      historico?: MensagemHistorico[];
      contextoInterno?: ContextoOperacionalLaboratorio;
    };

    const pergunta = String(body.pergunta ?? '').trim();
    if (!pergunta) {
      return NextResponse.json({ erro: 'Pergunta vazia.' }, { status: 400 });
    }

    const chaveGemini = process.env.GEMINI_API_KEY?.trim();
    if (!chaveGemini) {
      return NextResponse.json({ modoResposta: 'fallback_local' }, { status: 200 });
    }

    const modo = body.modo === 'interno' ? 'interno' : 'publico';
    const idioma = body.idioma ?? 'pt-BR';
    const historico = Array.isArray(body.historico) ? body.historico.slice(-8) : [];

    const instrucaoIdioma =
      idioma === 'en'
        ? 'Answer in English.'
        : idioma === 'de'
          ? 'Antworten Sie auf Deutsch.'
          : 'Responda em português do Brasil.';

    const instrucaoSistema =
      modo === 'interno' && body.contextoInterno
        ? `Você é o Assistente de IA Operacional do Laboratório de Metrologia SENAI / ZEISS (perfil ativo: ${body.contextoInterno.perfil}). ` +
          `${instrucaoIdioma} Seja conciso, objetivo e direto (máximo 6 linhas curtas ou bullets enxutos para tela de celular). ` +
          `Use apenas os dados reais fornecidos no contexto (solicitações, PDFs/anexos, pré-propostas, execuções, etapas, retrabalhos, mensagens e lições). ` +
          `${body.contextoInterno.perfil === 'tecnico' ? 'REGRA CRÍTICA: O usuário é Técnico. NUNCA mencione valores em R$, preços, custos ou margens.' : ''}\n\n` +
          `Base de dados atual:\n${JSON.stringify({
            instrucoesPorServico: ETAPAS_INSTRUCOES_POR_SERVICO,
            dados: sanitizarContextoPorPerfil(body.contextoInterno),
          })}`
        : `Você é o Assistente Virtual do Centro de Excelência em Metrologia SENAI / ZEISS (SENAI Fatesg, Goiânia - GO). ` +
          `${instrucaoIdioma} Seja simpático, claro, natural e direto ao ponto (respostas curtas de 3 a 6 linhas para tela de celular). ` +
          `Responda perguntas livres usando o catálogo oficial abaixo e oriente o visitante a abrir orçamento na aba Solicitar quando aplicável. Nunca invente preços fixos.\n\n` +
          `Catálogo Oficial:\n${JSON.stringify({
            servicos: servicosOficiais.map((s) => ({ titulo: s.titulo, resumo: s.resumo })),
            equipamentos: equipamentosPublicos.map((e) => ({
              nome: e.nome,
              tecnologia: e.tecnologia,
              resumo: e.resumo,
              aplicacoes: e.aplicacoes,
              especificacoes: e.especificacoes,
            })),
            eventos: EVENTOS_PADRAO_LABORATORIO[idioma],
          })}`;

    const contents = [
      ...historico.map((m) => ({
        role: m.autor === 'usuario' ? 'user' : 'model',
        parts: [{ text: m.texto }],
      })),
      { role: 'user', parts: [{ text: pergunta }] },
    ];

    const resposta = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(chaveGemini)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: instrucaoSistema }] },
          contents,
          generationConfig: { temperature: 0.3, maxOutputTokens: 650 },
        }),
      },
    );

    if (!resposta.ok) {
      return NextResponse.json({ modoResposta: 'fallback_local' }, { status: 200 });
    }

    const json = (await resposta.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const texto = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!texto) {
      return NextResponse.json({ modoResposta: 'fallback_local' }, { status: 200 });
    }

    return NextResponse.json({
      modoResposta: 'gemini',
      texto,
      fontes: [
        modo === 'interno'
          ? `IA Gemini 2.5 • Base Operacional (${body.contextoInterno?.perfil?.toUpperCase() ?? 'INTERNO'})`
          : 'IA Gemini 2.5 • Catálogo Oficial SENAI / ZEISS',
      ],
    });
  } catch {
    return NextResponse.json({ modoResposta: 'fallback_local' }, { status: 200 });
  }
}
