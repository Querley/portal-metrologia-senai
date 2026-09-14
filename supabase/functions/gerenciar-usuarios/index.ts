import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function resposta(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

function cnpjValido(valor: string) {
  const cnpj = valor.replace(/\D/g, '');
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
  const digito = (base: string, pesos: number[]) => {
    const soma = base.split('').reduce((total, numero, indice) => total + Number(numero) * pesos[indice], 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const primeiro = digito(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const segundo = digito(`${cnpj.slice(0, 12)}${primeiro}`, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return cnpj.endsWith(`${primeiro}${segundo}`);
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
  const empresaNome = String(entrada.empresa ?? '').trim();
  const cnpj = String(entrada.cnpj ?? '').replace(/\D/g, '');
  const cargo = String(entrada.cargo ?? '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return resposta({ erro: 'Informe um e-mail válido.' }, 400);
  if (nome.length < 2 || nome.length > 120) return resposta({ erro: 'Informe um nome entre 2 e 120 caracteres.' }, 400);
  if (acao === 'atualizar_cliente') {
    const usuarioId = String(entrada.usuario_id ?? '');
    const empresaId = String(entrada.empresa_id ?? '');
    if (!/^[0-9a-f-]{36}$/i.test(usuarioId) || !/^[0-9a-f-]{36}$/i.test(empresaId)) return resposta({ erro: 'Cliente ou empresa inválidos.' }, 400);
    if (empresaNome.length < 2 || empresaNome.length > 180 || !cnpjValido(cnpj) || cargo.length < 2 || cargo.length > 120) return resposta({ erro: 'Revise empresa, CNPJ e cargo.' }, 400);
    const conflito = await admin.from('empresas').select('id').eq('origem', 'demonstracao').eq('documento_cifrado', `DEMONSTRACAO:${cnpj}`).neq('id', empresaId).maybeSingle();
    if (conflito.data) return resposta({ erro: 'Este CNPJ já pertence a outra empresa demonstrativa.' }, 409);
    const identidadeAtualizada = await admin.auth.admin.updateUserById(usuarioId, { email, email_confirm: true, user_metadata: { nome, origem: 'demonstracao' } });
    if (identidadeAtualizada.error) return resposta({ erro: identidadeAtualizada.error.message }, 409);
    const [empresaAtualizada, perfilAtualizado, vinculoAtualizado] = await Promise.all([
      admin.from('empresas').update({ razao_social: empresaNome, documento_cifrado: `DEMONSTRACAO:${cnpj}` }).eq('id', empresaId).eq('origem', 'demonstracao'),
      admin.from('perfis').update({ nome, cargo_profissional: cargo, cnpj_empregador_sintetico: cnpj }).eq('usuario_id', usuarioId).eq('origem_ativa', 'demonstracao'),
      admin.from('vinculos_empresa').update({ cargo }).eq('empresa_id', empresaId).eq('usuario_id', usuarioId).eq('unico_ativo', true),
    ]);
    if (empresaAtualizada.error || perfilAtualizado.error || vinculoAtualizado.error) return resposta({ erro: 'A identidade foi atualizada, mas os dados cadastrais não puderam ser concluídos.' }, 500);
    await admin.from('auditoria').insert({ origem: 'demonstracao', usuario_id: identidade.user.id, acao: 'atualizar_cliente', entidade: 'empresas', entidade_id: empresaId, dados: { contato_usuario_id: usuarioId, email, cargo, cnpj_final: cnpj.slice(-4) } });
    return resposta({ mensagem: 'Empresa, CNPJ e contato atualizados e auditados.' });
  }
  if (acao === 'atualizar') {
    const usuarioId = String(entrada.usuario_id ?? '');
    if (!/^[0-9a-f-]{36}$/i.test(usuarioId)) return resposta({ erro: 'Usuário inválido.' }, 400);
    const atualizacao = await admin.auth.admin.updateUserById(usuarioId, { email, email_confirm: true, user_metadata: { nome, origem: 'demonstracao' } });
    if (atualizacao.error) return resposta({ erro: atualizacao.error.message }, 409);
    const perfilAtualizado = await admin.from('perfis').update({ nome }).eq('usuario_id', usuarioId).eq('origem_ativa', 'demonstracao');
    if (perfilAtualizado.error) return resposta({ erro: 'A identidade foi atualizada, mas o perfil não pôde ser salvo.' }, 500);
    if (cargo) await admin.from('vinculos_empresa').update({ cargo }).eq('usuario_id', usuarioId).eq('unico_ativo', true);
    await admin.from('auditoria').insert({ origem: 'demonstracao', usuario_id: identidade.user.id, acao: 'atualizar_conta', entidade: 'perfis', entidade_id: usuarioId, dados: { email, cargo: cargo || null } });
    return resposta({ mensagem: 'Dados da conta atualizados e auditados.' });
  }
  if (!['cliente', 'tecnico', 'validador', 'administrador'].includes(tipo)) return resposta({ erro: 'Tipo de conta inválido.' }, 400);
  if (empresaNome.length < 2 || empresaNome.length > 180) return resposta({ erro: 'Informe a empresa entre 2 e 180 caracteres.' }, 400);
  if (!cnpjValido(cnpj)) return resposta({ erro: 'Informe um CNPJ válido para a empresa.' }, 400);
  if (cargo.length < 2 || cargo.length > 120) return resposta({ erro: 'Informe o cargo ou função entre 2 e 120 caracteres.' }, 400);

  const origem = requisicao.headers.get('Origin');
  const redirectTo = origem?.startsWith('http') ? `${origem}/portal?definir=senha` : undefined;
  const { data: convite, error: erroConvite } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo, data: { nome, origem: 'demonstracao' } });
  if (erroConvite || !convite.user) return resposta({ erro: erroConvite?.message ?? 'Não foi possível criar o convite.' }, 409);

  const usuarioId = convite.user.id;
  const perfilInterno = tipo === 'cliente' ? null : tipo;
  const { error: erroPerfil } = await admin.from('perfis').upsert({ usuario_id: usuarioId, nome, perfil_interno: perfilInterno, origem_ativa: 'demonstracao', cargo_profissional: cargo, cnpj_empregador_sintetico: cnpj });
  if (erroPerfil) return resposta({ erro: 'O convite foi criado, mas o perfil não pôde ser configurado.' }, 500);

  if (tipo === 'cliente') {
    let { data: empresa } = await admin.from('empresas').select('id').eq('origem', 'demonstracao').eq('documento_cifrado', `DEMONSTRACAO:${cnpj}`).maybeSingle();
    if (!empresa) {
      const encontradaPorNome = await admin.from('empresas').select('id').eq('origem', 'demonstracao').ilike('razao_social', empresaNome).maybeSingle();
      empresa = encontradaPorNome.data;
    }
    if (!empresa) {
      const criada = await admin.from('empresas').insert({ origem: 'demonstracao', razao_social: empresaNome, documento_cifrado: `DEMONSTRACAO:${cnpj}` }).select('id').single();
      if (criada.error || !criada.data) return resposta({ erro: 'O perfil foi criado, mas a empresa não pôde ser cadastrada.' }, 500);
      empresa = criada.data;
    }
    const { error: erroVinculo } = await admin.from('vinculos_empresa').upsert({ empresa_id: empresa.id, usuario_id: usuarioId, perfil: 'gestor_empresa', aprovado_em: new Date().toISOString(), aprovado_por: identidade.user.id, unico_ativo: true, cargo }, { onConflict: 'empresa_id,usuario_id' });
    if (erroVinculo) return resposta({ erro: 'O convite foi criado, mas o vínculo com a empresa falhou.' }, 500);
  }

  await admin.from('auditoria').insert({ origem: 'demonstracao', usuario_id: identidade.user.id, acao: 'convidar_usuario', entidade: 'perfis', entidade_id: usuarioId, dados: { tipo, empresa: empresaNome, cnpj_final: cnpj.slice(-4), cargo } });
  return resposta({ usuario_id: usuarioId, mensagem: 'Convite enviado. O usuário definirá a senha pelo e-mail recebido.' });
});
