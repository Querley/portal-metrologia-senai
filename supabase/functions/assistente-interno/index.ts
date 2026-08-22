import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const proibidas = ['cliente','empresa','contato','email','telefone','preco','valor','margem','anexo'];

Deno.serve(async (requisicao) => {
  if (requisicao.method !== 'POST') return new Response('Método não permitido', { status: 405 });
  const autorizacao = requisicao.headers.get('Authorization');
  if (!autorizacao) return new Response('Não autenticado', { status: 401 });
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: autorizacao } } });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Não autenticado', { status: 401 });
  const corpo = await requisicao.json();
  if (proibidas.some((chave) => JSON.stringify(corpo.contexto ?? {}).toLowerCase().includes(`"${chave}"`))) return Response.json({ erro: 'A prévia contém campos proibidos.' }, { status: 422 });
  return Response.json({ estado: 'configuracao_pendente', mensagem: 'Defina GEMINI_API_KEY e implemente a chamada somente após a prévia sanitizada ser confirmada.', usuarioId: user.id });
});
