import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (requisicao) => {
  if (requisicao.method !== 'POST') return new Response('Método não permitido', { status: 405 });
  const autorizacao = requisicao.headers.get('Authorization') ?? '';
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { global: { headers: { Authorization: autorizacao } } });
  const { data: { user } } = await supabase.auth.getUser(autorizacao.replace('Bearer ', ''));
  if (!user) return new Response('Não autenticado', { status: 401 });
  const { data: perfil } = await supabase.from('perfis').select('perfil_interno').eq('usuario_id', user.id).single();
  if (perfil?.perfil_interno !== 'administrador') return new Response('Apenas Administrador pode reiniciar demonstrações.', { status: 403 });
  // A operação final deve chamar uma função SQL transacional que filtra origem = demonstracao em cada tabela.
  // Não há delete genérico e nenhuma tabela real é tocada por esta função incompleta.
  return Response.json({ estado: 'configuracao_pendente', mensagem: 'Reset recusado até a função SQL transacional ser instalada.' }, { status: 501 });
});
