'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { ArrowLeft, LockKeyhole, Save, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { PerfilInterno } from '../lib/contratos';
import type { ContextoCliente } from '../lib/portal-cliente';
import { obterClienteSupabase } from '../lib/supabase/cliente';
import { MarcaOficial } from './marca-oficial';
import { PortalCliente } from './portal-cliente';
import { PortalDemonstracao } from './portal-demonstracao';

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
  const { data, error } = await cliente
    .from('perfis')
    .select('usuario_id,nome,perfil_interno,origem_ativa')
    .eq('usuario_id', usuarioId)
    .maybeSingle();
  if (error) throw error;
  if (!data?.perfil_interno || data.origem_ativa !== 'demonstracao') return null;
  return data as Perfil;
}

async function buscarContextoCliente(cliente: SupabaseClient): Promise<ContextoCliente | null> {
  const { data, error } = await cliente.rpc('obter_contexto_cliente');
  if (error) return null;
  return data && typeof data === 'object' ? data as ContextoCliente : null;
}

export function PortalInterno() {
  const cliente = obterClienteSupabase();
  const [estado, setEstado] = useState<Estado>(cliente ? 'carregando' : 'sem_configuracao');
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [contextoCliente, setContextoCliente] = useState<ContextoCliente | null>(null);
  const [mensagem, setMensagem] = useState('');
  const [editandoPerfil, setEditandoPerfil] = useState(false);

  const carregarPerfil = useCallback(async (usuarioId: string) => {
    if (!cliente) return;
    try {
      const perfilEncontrado = await buscarPerfil(cliente, usuarioId);
      if (perfilEncontrado) {
        setPerfil(perfilEncontrado);
        setContextoCliente(null);
        setEstado('autenticado_interno');
        return;
      }
      const contextoEncontrado = await buscarContextoCliente(cliente);
      setContextoCliente(contextoEncontrado);
      setEstado(contextoEncontrado ? 'autenticado_cliente' : 'sem_perfil');
    } catch {
      setMensagem('Não foi possível validar seu perfil interno. Tente novamente.');
      setEstado('erro');
    }
  }, [cliente]);

  useEffect(() => {
    if (!cliente) return;

    let ativo = true;
    cliente.auth.getSession().then(({ data }) => {
      if (!ativo) return;
      if (!data.session?.user) setEstado('anonimo');
      else void carregarPerfil(data.session.user.id);
    }).catch(() => {
      if (ativo) setEstado('erro');
    });

    const { data: autenticacao } = cliente.auth.onAuthStateChange((evento) => {
      if (evento === 'SIGNED_OUT') {
        setPerfil(null);
        setContextoCliente(null);
        setEditandoPerfil(false);
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
    return <PortalCliente cliente={cliente!} contexto={contextoCliente} aoSair={sair} />;
  }

  return <TelaAcesso estado={estado} cliente={cliente} mensagem={mensagem} aoAutenticar={carregarPerfil} />;
}

function TelaAcesso({ estado, cliente, mensagem, aoAutenticar }: { estado: Estado; cliente: SupabaseClient | null; mensagem: string; aoAutenticar: (usuarioId: string) => Promise<void> }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function entrar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!cliente) return;
    setEnviando(true);
    setErro('');
    const { data, error } = await cliente.auth.signInWithPassword({ email, password: senha });
    if (error || !data.user) {
      setErro('E-mail ou senha inválidos. O acesso interno não permite autocadastro.');
      setEnviando(false);
      return;
    }
    await aoAutenticar(data.user.id);
    setEnviando(false);
  }

  return <main className="acesso-interno"><section className="cartao-acesso"><a href="/" aria-label="Voltar à página pública"><MarcaOficial /></a><span className="selo-acesso"><ShieldCheck size={15} /> Acesso protegido</span>{estado === 'carregando' && <><h1>Validando acesso</h1><p role="status">Aguarde enquanto confirmamos sua sessão e o tipo de acesso.</p></>}{estado === 'sem_configuracao' && <><h1>Integração de homologação pendente</h1><p>O acesso permanece fechado até a URL e a chave pública do Supabase de homologação serem configuradas.</p><a className="link-acesso" href="/portal/cliente-demonstracao">Ver demonstração da área do cliente</a></>}{estado === 'sem_perfil' && <><h1>Acesso ainda não vinculado</h1><p>Sua identidade foi confirmada, mas não há perfil interno nem vínculo aprovado com uma empresa. Clientes recebem esse vínculo por convite da equipe após a análise da solicitação.</p><button className="botao-acesso" type="button" onClick={() => void cliente?.auth.signOut()}>Sair</button></>}{estado === 'erro' && <><h1>Não foi possível validar o acesso</h1><p role="alert">{mensagem || 'A autenticação está temporariamente indisponível.'}</p><button className="botao-acesso" type="button" onClick={() => window.location.reload()}>Tentar novamente</button></>}{estado === 'anonimo' && <><h1>Entrar no Portal de Metrologia</h1><p>Equipe interna e clientes convidados usam o mesmo acesso. Não é preciso entrar para enviar uma solicitação.</p><form onSubmit={entrar}><label htmlFor="email-interno">E-mail</label><input id="email-interno" type="email" autoComplete="username" required value={email} onChange={(evento) => setEmail(evento.target.value)} /><label htmlFor="senha-interna">Senha</label><input id="senha-interna" type="password" autoComplete="current-password" required value={senha} onChange={(evento) => setSenha(evento.target.value)} />{erro && <p className="erro-acesso" role="alert">{erro}</p>}<button className="botao-acesso" type="submit" disabled={enviando}><LockKeyhole size={16} />{enviando ? 'Validando…' : 'Entrar'}</button></form><a className="link-acesso" href="/solicitar">Fazer solicitação sem login</a><a className="link-acesso" href="/portal/cliente-demonstracao">Ver demonstração da área do cliente</a><a className="link-acesso" href="/portal/demonstracao">Abrir demonstração interna</a></>}</section></main>;
}

function EditarPerfil({ perfil, cliente, aoAtualizar, aoVoltar }: { perfil: Perfil; cliente: SupabaseClient; aoAtualizar: (perfil: Perfil) => void; aoVoltar: () => void }) {
  const [nome, setNome] = useState(perfil.nome);
  const [mensagem, setMensagem] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function salvar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const nomeNormalizado = nome.trim();
    if (nomeNormalizado.length < 2 || nomeNormalizado.length > 120) {
      setMensagem('Informe um nome entre 2 e 120 caracteres.');
      return;
    }
    setSalvando(true);
    setMensagem('');
    const { data, error } = await cliente.from('perfis').update({ nome: nomeNormalizado }).eq('usuario_id', perfil.usuario_id).select('usuario_id,nome,perfil_interno,origem_ativa').single();
    if (error || !data) setMensagem('Não foi possível salvar o perfil.');
    else {
      aoAtualizar(data as Perfil);
      setMensagem('Perfil salvo no Supabase de homologação.');
    }
    setSalvando(false);
  }

  return <main className="acesso-interno"><section className="cartao-acesso"><button className="voltar-acesso" type="button" onClick={aoVoltar}><ArrowLeft size={16} /> Voltar ao portal</button><span className="selo-acesso"><ShieldCheck size={15} /> Origem: demonstração</span><h1>Meu perfil interno</h1><p>Somente o nome pode ser alterado por você. Função e origem dependem de provisionamento administrativo.</p><form onSubmit={salvar}><label htmlFor="nome-perfil">Nome</label><input id="nome-perfil" required minLength={2} maxLength={120} value={nome} onChange={(evento) => setNome(evento.target.value)} /><label>Perfil interno</label><input value={rotulosPerfil[perfil.perfil_interno]} disabled /><label>Origem ativa</label><input value="Demonstração" disabled />{mensagem && <p className="mensagem-acesso" role="status">{mensagem}</p>}<button className="botao-acesso" type="submit" disabled={salvando}><Save size={16} />{salvando ? 'Salvando…' : 'Salvar perfil'}</button></form></section></main>;
}
