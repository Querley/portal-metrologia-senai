import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function resposta(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

Deno.serve(async (requisicao) => {
  if (requisicao.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (requisicao.method !== 'POST') return resposta({ erro: 'Método não permitido.' }, 405);

  const autorizacao = requisicao.headers.get('Authorization') ?? '';
  const url = Deno.env.get('SUPABASE_URL')!;
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const sessao = createClient(url, anon, { global: { headers: { Authorization: autorizacao } } });
  const admin = createClient(url, serviceRole, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: identidade } = await sessao.auth.getUser();
  if (!identidade.user) return resposta({ erro: 'Autenticação necessária.' }, 401);
  const { data: perfil } = await admin.from('perfis').select('perfil_interno,origem_ativa').eq('usuario_id', identidade.user.id).maybeSingle();
  if (perfil?.perfil_interno !== 'administrador' || perfil.origem_ativa !== 'demonstracao') return resposta({ erro: 'Somente Administrador pode cadastrar contas.' }, 403);

  let entrada: Record<string, unknown>;
  try { entrada = await requisicao.json(); } catch { return resposta({ erro: 'Dados inválidos.' }, 400); }
  const email = String(entrada.email ?? '').trim().toLowerCase();
  const nome = String(entrada.nome ?? '').trim();
  const acao = String(entrada.acao ?? 'convidar');
  const tipo = String(entrada.tipo ?? '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return resposta({ erro: 'Informe um e-mail válido.' }, 400);
  if (nome.length < 2 || nome.length > 120) return resposta({ erro: 'Informe um nome entre 2 e 120 caracteres.' }, 400);
  if (acao === 'atualizar') {
    const usuarioId = String(entrada.usuario_id ?? '');
    if (!/^[0-9a-f-]{36}$/i.test(usuarioId)) return resposta({ erro: 'Usuário inválido.' }, 400);
    const atualizacao = await admin.auth.admin.updateUserById(usuarioId, { email, email_confirm: true, user_metadata: { nome, origem: 'demonstracao' } });
    if (atualizacao.error) return resposta({ erro: atualizacao.error.message }, 409);
    const perfilAtualizado = await admin.from('perfis').update({ nome }).eq('usuario_id', usuarioId).eq('origem_ativa', 'demonstracao');
    if (perfilAtualizado.error) return resposta({ erro: 'A identidade foi atualizada, mas o perfil não pôde ser salvo.' }, 500);
    const cargo = String(entrada.cargo ?? '').trim();
    if (cargo) await admin.from('vinculos_empresa').update({ cargo }).eq('usuario_id', usuarioId).eq('unico_ativo', true);
    await admin.from('auditoria').insert({ origem: 'demonstracao', usuario_id: identidade.user.id, acao: 'atualizar_conta', entidade: 'perfis', entidade_id: usuarioId, dados: { email, cargo: cargo || null } });
    return resposta({ mensagem: 'Dados da conta atualizados e auditados.' });
  }
  if (!['cliente', 'tecnico', 'validador', 'administrador'].includes(tipo)) return resposta({ erro: 'Tipo de conta inválido.' }, 400);

  const origem = requisicao.headers.get('Origin');
  const redirectTo = origem?.startsWith('http') ? `${origem}/portal` : undefined;
  const { data: convite, error: erroConvite } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo, data: { nome, origem: 'demonstracao' } });
  if (erroConvite || !convite.user) return resposta({ erro: erroConvite?.message ?? 'Não foi possível criar o convite.' }, 409);

  const usuarioId = convite.user.id;
  const perfilInterno = tipo === 'cliente' ? null : tipo;
  const { error: erroPerfil } = await admin.from('perfis').upsert({ usuario_id: usuarioId, nome, perfil_interno: perfilInterno, origem_ativa: 'demonstracao' });
  if (erroPerfil) return resposta({ erro: 'O convite foi criado, mas o perfil não pôde ser configurado.' }, 500);

  if (tipo === 'cliente') {
    const empresaNome = String(entrada.empresa ?? '').trim();
    const cargo = String(entrada.cargo ?? 'Contato da empresa').trim();
    if (empresaNome.length < 2 || empresaNome.length > 180 || cargo.length < 2 || cargo.length > 120) return resposta({ erro: 'Informe empresa e cargo válidos.' }, 400);
    let { data: empresa } = await admin.from('empresas').select('id').eq('origem', 'demonstracao').ilike('razao_social', empresaNome).maybeSingle();
    if (!empresa) {
      const criada = await admin.from('empresas').insert({ origem: 'demonstracao', razao_social: empresaNome }).select('id').single();
      if (criada.error || !criada.data) return resposta({ erro: 'O perfil foi criado, mas a empresa não pôde ser cadastrada.' }, 500);
      empresa = criada.data;
    }
    const { error: erroVinculo } = await admin.from('vinculos_empresa').upsert({ empresa_id: empresa.id, usuario_id: usuarioId, perfil: 'gestor_empresa', aprovado_em: new Date().toISOString(), aprovado_por: identidade.user.id, unico_ativo: true, cargo }, { onConflict: 'empresa_id,usuario_id' });
    if (erroVinculo) return resposta({ erro: 'O convite foi criado, mas o vínculo com a empresa falhou.' }, 500);
  }

  await admin.from('auditoria').insert({ origem: 'demonstracao', usuario_id: identidade.user.id, acao: 'convidar_usuario', entidade: 'perfis', entidade_id: usuarioId, dados: { tipo } });
  return resposta({ usuario_id: usuarioId, mensagem: 'Convite enviado. O usuário definirá a senha pelo e-mail recebido.' });
});
