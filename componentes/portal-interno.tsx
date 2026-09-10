'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { ArrowLeft, KeyRound, LockKeyhole, Mail, Save, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { PerfilInterno } from '../lib/contratos';
import type { ContextoCliente } from '../lib/portal-cliente';
import { obterClienteSupabase } from '../lib/supabase/cliente';
import { MarcaOficial } from './marca-oficial';
import { PortalCliente } from './portal-cliente';
import { PortalDemonstracao } from './portal-demonstracao';
import { NotificacaoFlutuante } from './notificacao-flutuante';

type Perfil = {
  usuario_id: string;
  nome: string;
  perfil_interno: PerfilInterno;
  origem_ativa: 'demonstracao';
};

type Estado = 'carregando' | 'sem_configuracao' | 'anonimo' | 'sem_perfil' | 'autenticado_interno' | 'autenticado_cliente' | 'erro';

const rotulosPerfil: Record<PerfilInterno, string> = {
  consulta: 'Consulta',
  tecnico: 'Técnico',
  validador: 'Validador',
  administrador: 'Administrador',
};

async function buscarPerfil(cliente: SupabaseClient, usuarioId: string): Promise<Perfil | null> {
  const { data, error } = await cliente.from('perfis').select('usuario_id,nome,perfil_interno,origem_ativa').eq('usuario_id', usuarioId).maybeSingle();
  if (error) throw error;
  if (!data?.perfil_interno || data.origem_ativa !== 'demonstracao') return null;
  return data as Perfil;
}

async function buscarContextoCliente(cliente: SupabaseClient): Promise<ContextoCliente | null> {
  const { data, error } = await cliente.rpc('obter_contexto_cliente');
  if (error) return null;
  return data && typeof data === 'object' ? (data as ContextoCliente) : null;
}

export function PortalInterno() {
  const cliente = obterClienteSupabase();
  const [estado, setEstado] = useState<Estado>(cliente ? 'carregando' : 'sem_configuracao');
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [contextoCliente, setContextoCliente] = useState<ContextoCliente | null>(null);
  const [mensagem, setMensagem] = useState('');
  const [editandoPerfil, setEditandoPerfil] = useState(false);
  const [recuperandoSenha, setRecuperandoSenha] = useState(false);

  const carregarPerfil = useCallback(
    async (usuarioId: string) => {
      if (!cliente) return;
      try {
        const tokenAtivacao = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('ativar');
        if (tokenAtivacao) {
          const { error: erroAtivacao } = await cliente.rpc('ativar_solicitacao_cliente_demonstrativa', {
            token_ativacao: tokenAtivacao,
          });
          if (erroAtivacao) setMensagem(erroAtivacao.message || 'Não foi possível ativar a solicitação.');
          else {
            setMensagem('Solicitação vinculada à sua área Cliente.');
            window.history.replaceState({}, '', '/portal');
          }
        }
        const contextoEncontrado = await buscarContextoCliente(cliente);
        if (contextoEncontrado) {
          setPerfil(null);
          setContextoCliente(contextoEncontrado);
          setEstado('autenticado_cliente');
          return;
        }
        const perfilEncontrado = await buscarPerfil(cliente, usuarioId);
        setPerfil(perfilEncontrado);
        setContextoCliente(null);
        setEstado(perfilEncontrado ? 'autenticado_interno' : 'sem_perfil');
      } catch {
        setMensagem('Não foi possível validar seu perfil interno. Tente novamente.');
        setEstado('erro');
      }
    },
    [cliente],
  );

  useEffect(() => {
    if (!cliente) return;

    let ativo = true;
    cliente.auth
      .getSession()
      .then(({ data }) => {
        if (!ativo) return;
        if (!data.session?.user) setEstado('anonimo');
        else void carregarPerfil(data.session.user.id);
      })
      .catch(() => {
        if (ativo) setEstado('erro');
      });

    const { data: autenticacao } = cliente.auth.onAuthStateChange((evento) => {
      if (evento === 'SIGNED_OUT') {
        setPerfil(null);
        setContextoCliente(null);
        setEditandoPerfil(false);
        setEstado('anonimo');
      }
      if (evento === 'PASSWORD_RECOVERY') {
        setRecuperandoSenha(true);
        setEstado('anonimo');
      }
    });

    return () => {
      ativo = false;
      autenticacao.subscription.unsubscribe();
    };
  }, [carregarPerfil, cliente]);

  async function sair() {
    if (!cliente) return;
    await cliente.auth.signOut();
  }

  if (estado === 'autenticado_interno' && perfil && !editandoPerfil) {
    return <PortalDemonstracao nomeUsuario={perfil.nome} perfilUsuario={rotulosPerfil[perfil.perfil_interno]} perfilInterno={perfil.perfil_interno} clienteSupabase={cliente!} aoSair={sair} aoAbrirPerfil={() => setEditandoPerfil(true)} autenticado />;
  }

  if (estado === 'autenticado_interno' && perfil && editandoPerfil) {
    return <EditarPerfil perfil={perfil} cliente={cliente!} aoAtualizar={setPerfil} aoVoltar={() => setEditandoPerfil(false)} />;
  }

  if (estado === 'autenticado_cliente' && contextoCliente) {
    return <PortalCliente cliente={cliente!} contexto={contextoCliente} aoSair={sair} mensagemInicial={mensagem} />;
  }

  return <TelaAcesso estado={estado} cliente={cliente} mensagem={mensagem} aoAutenticar={carregarPerfil} recuperandoSenha={recuperandoSenha} aoConcluirRecuperacao={() => setRecuperandoSenha(false)} />;
}

function TelaAcesso({ estado, cliente, mensagem, aoAutenticar, recuperandoSenha, aoConcluirRecuperacao }: { estado: Estado; cliente: SupabaseClient | null; mensagem: string; aoAutenticar: (usuarioId: string) => Promise<void>; recuperandoSenha: boolean; aoConcluirRecuperacao: () => void }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmacaoSenha, setConfirmacaoSenha] = useState('');
  const [solicitandoRecuperacao, setSolicitandoRecuperacao] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function entrar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!cliente) return;
    setEnviando(true);
    setErro('');
    const { data, error } = await cliente.auth.signInWithPassword({
      email,
      password: senha,
    });
    if (error || !data.user) {
      setErro('E-mail ou senha inválidos. O acesso interno não permite autocadastro.');
      setEnviando(false);
      return;
    }
    await aoAutenticar(data.user.id);
    setEnviando(false);
  }

  async function solicitarRecuperacao(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!cliente) return;
    setEnviando(true);
    setErro('');
    const emailNormalizado = email.trim().toLowerCase();
    const { error } = await cliente.auth.resetPasswordForEmail(emailNormalizado, {
      redirectTo: `${window.location.origin}/portal?recuperar=senha`,
    });
    if (error) setErro('Não foi possível iniciar a recuperação agora. Aguarde alguns instantes e tente novamente.');
    else {
      setAviso('Se o e-mail estiver cadastrado, você receberá um link seguro para criar uma nova senha.');
      setSolicitandoRecuperacao(false);
    }
    setEnviando(false);
  }

  async function redefinirSenha(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!cliente) return;
    if (novaSenha.length < 10) {
      setErro('A nova senha deve ter pelo menos 10 caracteres.');
      return;
    }
    if (novaSenha !== confirmacaoSenha) {
      setErro('A confirmação não corresponde à nova senha.');
      return;
    }
    setEnviando(true);
    setErro('');
    const { error } = await cliente.auth.updateUser({ password: novaSenha });
    if (error) setErro('O link expirou ou a senha não pôde ser alterada. Solicite uma nova recuperação.');
    else {
      setAviso('Senha alterada. Você já pode continuar com a sessão protegida.');
      setNovaSenha('');
      setConfirmacaoSenha('');
      aoConcluirRecuperacao();
      const { data } = await cliente.auth.getUser();
      if (data.user) await aoAutenticar(data.user.id);
    }
    setEnviando(false);
  }

  return (
    <main className="acesso-interno">
      <NotificacaoFlutuante mensagem={erro} tipo="erro" aoFechar={() => setErro('')} />
      <NotificacaoFlutuante mensagem={aviso} tipo="informacao" aoFechar={() => setAviso('')} />
      <section className="cartao-acesso">
        <a href="/" aria-label="Voltar à página pública">
          <MarcaOficial />
        </a>
        <span className="selo-acesso">
          <ShieldCheck size={15} /> Acesso protegido
        </span>
        {estado === 'carregando' && (
          <>
            <h1>Validando acesso</h1>
            <p role="status">Aguarde enquanto confirmamos sua sessão e o tipo de acesso.</p>
          </>
        )}
        {estado === 'sem_configuracao' && (
          <>
            <h1>Integração de homologação pendente</h1>
            <p>O acesso permanece fechado até a URL e a chave pública do Supabase de homologação serem configuradas.</p>
            <a className="link-acesso" href="/portal/cliente-demonstracao">
              Ver demonstração da área do cliente
            </a>
            <a className="link-acesso" href="/portal/demonstracao">
              Abrir demonstração interna
            </a>
          </>
        )}
        {estado === 'sem_perfil' && (
          <>
            <h1>Acesso ainda não vinculado</h1>
            <p>Sua identidade foi confirmada, mas não há perfil interno nem vínculo aprovado com uma empresa. Clientes recebem esse vínculo por convite da equipe após a análise da solicitação.</p>
            {mensagem && (
              <p className="erro-acesso" role="alert">
                {mensagem}
              </p>
            )}
            <button className="botao-acesso" type="button" onClick={() => void cliente?.auth.signOut()}>
              Sair
            </button>
          </>
        )}
        {estado === 'erro' && (
          <>
            <h1>Não foi possível validar o acesso</h1>
            <p role="alert">{mensagem || 'A autenticação está temporariamente indisponível.'}</p>
            <button className="botao-acesso" type="button" onClick={() => window.location.reload()}>
              Tentar novamente
            </button>
          </>
        )}
        {estado === 'anonimo' && recuperandoSenha && (
          <>
            <h1>Crie uma nova senha</h1>
            <p>Use uma senha exclusiva com pelo menos 10 caracteres.</p>
            <form onSubmit={redefinirSenha}>
              <label htmlFor="nova-senha">Nova senha</label>
              <input id="nova-senha" type="password" autoComplete="new-password" required minLength={10} value={novaSenha} onChange={(evento) => setNovaSenha(evento.target.value)} />
              <label htmlFor="confirmar-nova-senha">Confirmar nova senha</label>
              <input id="confirmar-nova-senha" type="password" autoComplete="new-password" required minLength={10} value={confirmacaoSenha} onChange={(evento) => setConfirmacaoSenha(evento.target.value)} />
              <button className="botao-acesso" type="submit" disabled={enviando}>
                <KeyRound size={16} /> {enviando ? 'Alterando…' : 'Salvar nova senha'}
              </button>
            </form>
          </>
        )}
        {estado === 'anonimo' && !recuperandoSenha && solicitandoRecuperacao && (
          <>
            <h1>Recuperar senha</h1>
            <p>Informe o e-mail usado no portal. Por segurança, a confirmação não revela se o endereço está cadastrado.</p>
            <form onSubmit={solicitarRecuperacao}>
              <label htmlFor="email-recuperacao">E-mail</label>
              <input id="email-recuperacao" type="email" autoComplete="email" required value={email} onChange={(evento) => setEmail(evento.target.value)} />
              <button className="botao-acesso" type="submit" disabled={enviando}>
                <Mail size={16} /> {enviando ? 'Enviando…' : 'Enviar link seguro'}
              </button>
              <button className="link-acesso botao-link-acesso" type="button" onClick={() => setSolicitandoRecuperacao(false)}>Voltar ao login</button>
            </form>
          </>
        )}
        {estado === 'anonimo' && !recuperandoSenha && !solicitandoRecuperacao && (
          <>
            <h1>Entrar no Portal de Metrologia</h1>
            <p>Equipe interna e clientes convidados usam o mesmo acesso. Não é preciso entrar para enviar uma solicitação.</p>
            <form onSubmit={entrar}>
              <label htmlFor="email-interno">E-mail</label>
              <input id="email-interno" type="email" autoComplete="username" required value={email} onChange={(evento) => setEmail(evento.target.value)} />
              <label htmlFor="senha-interna">Senha</label>
              <input id="senha-interna" type="password" autoComplete="current-password" required value={senha} onChange={(evento) => setSenha(evento.target.value)} />
              <button className="botao-acesso" type="submit" disabled={enviando}>
                <LockKeyhole size={16} />
                {enviando ? 'Validando…' : 'Entrar'}
              </button>
            </form>
            <button className="link-acesso botao-link-acesso" type="button" onClick={() => setSolicitandoRecuperacao(true)}>Esqueci minha senha</button>
            <a className="link-acesso" href="/solicitar">
              Fazer solicitação sem login
            </a>
            <a className="link-acesso" href="/portal/cliente-demonstracao">
              Ver demonstração da área do cliente
            </a>
            <a className="link-acesso" href="/portal/demonstracao">
              Abrir demonstração interna
            </a>
          </>
        )}
      </section>
    </main>
  );
}

function EditarPerfil({ perfil, cliente, aoAtualizar, aoVoltar }: { perfil: Perfil; cliente: SupabaseClient; aoAtualizar: (perfil: Perfil) => void; aoVoltar: () => void }) {
  const [nome, setNome] = useState(perfil.nome);
  const [email, setEmail] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [tipoMensagem, setTipoMensagem] = useState<'sucesso' | 'erro'>('sucesso');
  const [salvando, setSalvando] = useState(false);
  const [usuarios, setUsuarios] = useState<Array<Pick<Perfil, 'usuario_id' | 'nome' | 'perfil_interno'>>>([]);
  const [alterandoUsuario, setAlterandoUsuario] = useState('');

  useEffect(() => {
    void cliente.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ''));
    if (perfil.perfil_interno === 'administrador') void cliente.rpc('listar_usuarios_internos_demonstrativos').then(({ data }) => setUsuarios((data ?? []) as Array<Pick<Perfil, 'usuario_id' | 'nome' | 'perfil_interno'>>));
  }, [cliente, perfil.perfil_interno]);

  async function alterarFuncao(usuarioId: string, novaFuncao: PerfilInterno) {
    setAlterandoUsuario(usuarioId);
    setMensagem('');
    const { error } = await cliente.rpc('alterar_perfil_interno_demonstrativo', { alvo: usuarioId, novo_perfil: novaFuncao });
    if (error) {
      setTipoMensagem('erro');
      setMensagem(error.message || 'Não foi possível alterar a função.');
    }
    else {
      setUsuarios((atuais) => atuais.map((item) => (item.usuario_id === usuarioId ? { ...item, perfil_interno: novaFuncao } : item)));
      setTipoMensagem('sucesso');
      setMensagem('Função atualizada e registrada na auditoria.');
    }
    setAlterandoUsuario('');
  }

  async function salvar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const nomeNormalizado = nome.trim();
    if (nomeNormalizado.length < 2 || nomeNormalizado.length > 120) {
      setTipoMensagem('erro');
      setMensagem('Informe um nome entre 2 e 120 caracteres.');
      return;
    }
    const emailNormalizado = email.trim().toLowerCase();
    if (!emailNormalizado.endsWith('.test')) {
      setTipoMensagem('erro');
      setMensagem('Na homologação, use somente um e-mail sintético terminado em .test.');
      return;
    }
    setSalvando(true);
    setMensagem('');
    const { data, error } = await cliente.from('perfis').update({ nome: nomeNormalizado }).eq('usuario_id', perfil.usuario_id).select('usuario_id,nome,perfil_interno,origem_ativa').single();
    if (error || !data) {
      setTipoMensagem('erro');
      setMensagem('Não foi possível salvar o perfil.');
    }
    else {
      const { data: usuarioAtual } = await cliente.auth.getUser();
      const emailMudou = emailNormalizado !== usuarioAtual.user?.email?.toLowerCase();
      if (emailMudou) {
        const { error: erroEmail } = await cliente.rpc('atualizar_email_proprio_demonstrativo', { novo_email: emailNormalizado });
        if (erroEmail) {
          setTipoMensagem('erro');
          setMensagem(erroEmail.message || 'O nome foi salvo, mas não foi possível alterar o e-mail.');
          setSalvando(false);
          return;
        }
        await cliente.auth.refreshSession();
      }
      aoAtualizar(data as Perfil);
      setTipoMensagem('sucesso');
      setMensagem(emailMudou ? 'Perfil e e-mail de acesso atualizados.' : 'Perfil salvo no Supabase de homologação.');
    }
    setSalvando(false);
  }

  return (
    <main className="acesso-interno">
      <NotificacaoFlutuante mensagem={mensagem} tipo={tipoMensagem} aoFechar={() => setMensagem('')} />
      <section className="cartao-acesso">
        <button className="voltar-acesso" type="button" onClick={aoVoltar}>
          <ArrowLeft size={16} /> Voltar ao portal
        </button>
        <span className="selo-acesso">
          <ShieldCheck size={15} /> Origem: demonstração
        </span>
        <h1>Meu perfil interno</h1>
        <p>Nome e e-mail podem ser alterados por você. Função e origem dependem de provisionamento administrativo.</p>
        <form onSubmit={salvar}>
          <label htmlFor="nome-perfil">Nome</label>
          <input id="nome-perfil" required minLength={2} maxLength={120} value={nome} onChange={(evento) => setNome(evento.target.value)} />
          <label htmlFor="email-perfil">E-mail de acesso</label>
          <input id="email-perfil" type="email" required value={email} onChange={(evento) => setEmail(evento.target.value)} />
          <label>Perfil interno</label>
          <input value={rotulosPerfil[perfil.perfil_interno]} disabled />
          <label>Origem ativa</label>
          <input value="Demonstração" disabled />
          <button className="botao-acesso" type="submit" disabled={salvando}>
            <Save size={16} />
            {salvando ? 'Salvando…' : 'Salvar perfil'}
          </button>
        </form>
        {perfil.perfil_interno === 'administrador' && (
          <section className="gestao-usuarios-internos">
            <h2>Funções da equipe</h2>
            <p>Altere a função de usuários internos existentes. Sua própria função fica protegida contra alteração acidental.</p>
            {usuarios.map((usuario) => (
              <label key={usuario.usuario_id}>
                <span>
                  <strong>{usuario.nome}</strong>
                  <small>{usuario.usuario_id === perfil.usuario_id ? 'Você' : 'Usuário interno'}</small>
                </span>
                <select value={usuario.perfil_interno} disabled={usuario.usuario_id === perfil.usuario_id || alterandoUsuario === usuario.usuario_id} onChange={(evento) => void alterarFuncao(usuario.usuario_id, evento.target.value as PerfilInterno)}>
                  {(['tecnico', 'validador', 'administrador'] as PerfilInterno[]).map((valor) => (
                    <option key={valor} value={valor}>
                      {rotulosPerfil[valor]}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </section>
        )}
      </section>
    </main>
  );
}
