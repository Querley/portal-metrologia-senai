import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const proibidas = ['cliente', 'empresa', 'contato', 'email', 'telefone', 'preco', 'valor', 'margem', 'anexo'];

Deno.serve(async (requisicao) => {
  if (requisicao.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }
  if (requisicao.method !== 'POST') return new Response('Método não permitido', { status: 405 });
  const autorizacao = requisicao.headers.get('Authorization');
  if (!autorizacao) return new Response('Não autenticado', { status: 401 });
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: autorizacao } },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response('Não autenticado', { status: 401 });

  const corpo = await requisicao.json();
  const modo = corpo.modo ?? 'sanitizado';

  if (modo === 'sanitizado') {
    if (proibidas.some((chave) => JSON.stringify(corpo.contexto ?? {}).toLowerCase().includes(`"${chave}"`))) {
      return Response.json({ erro: 'A prévia contém campos proibidos.' }, { status: 422 });
    }
  }

  const chaveGemini = Deno.env.get('GEMINI_API_KEY');
  if (chaveGemini && corpo.pergunta) {
    const respostaGemini = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(chaveGemini)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: 'Você é o Assistente Interno do Laboratório de Metrologia SENAI / ZEISS. Responda em português apenas com base no contexto fornecido, sem inventar valores nem calcular preços.',
              },
            ],
          },
          contents: [{ role: 'user', parts: [{ text: `${corpo.pergunta}\nContexto:\n${JSON.stringify(corpo.contexto ?? {})}` }] }],
          generationConfig: { temperature: 0.25, maxOutputTokens: 900 },
        }),
      },
    );
    if (respostaGemini.ok) {
      const json = await respostaGemini.json();
      const texto = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (texto) {
        return Response.json({ estado: 'ok', mensagem: texto, usuarioId: user.id });
      }
    }
  }

  return Response.json({
    estado: 'configuracao_pendente',
    mensagem: 'Defina GEMINI_API_KEY e implemente a chamada somente após a prévia sanitizada ser confirmada.',
    usuarioId: user.id,
  });
});
