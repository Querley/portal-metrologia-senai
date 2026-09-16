'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { Activity, ArrowLeft, Ban, Building2, CheckCircle2, ChevronDown, ChevronUp, KeyRound, LockKeyhole, Mail, Pencil, Save, ShieldCheck, TrendingUp, UserPlus, Users, WalletCards, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PerfilInterno } from '../lib/contratos';
import type { ContextoCliente } from '../lib/portal-cliente';
import { limparModoDefinicaoSenha, modoDefinicaoSenha, type ModoDefinicaoSenha } from '../lib/sessao-portal';
import { obterClienteSupabase } from '../lib/supabase/cliente';
import { MarcaOficial } from './marca-oficial';
import { PortalCliente } from './portal-cliente';
import { PortalDemonstracao } from './portal-demonstracao';
import { NotificacaoFlutuante } from './notificacao-flutuante';
import { BarraBuscaFiltros } from './barra-busca-filtros';
import { cnpjValido, formatarCnpj } from '../lib/solicitacao';
import { SeletorIdioma } from './seletor-idioma';
import { useTraducaoPublica } from '../lib/traducao-publica';

type Perfil = {
  usuario_id: string;
  nome: string;
  perfil_interno: PerfilInterno;
  origem_ativa: 'demonstracao';
};

type Estado = 'carregando' | 'sem_configuracao' | 'anonimo' | 'sem_perfil' | 'autenticado_interno' | 'autenticado_cliente' | 'erro';

type FuncionarioAdministrativo = { usuario_id: string; nome: string; email: string; perfil: PerfilInterno; cargo?: string | null; cnpj?: string | null; atribuidos: number; concluidos: number; em_execucao: number; retrabalhos: number };
type ContatoAdministrativo = { usuario_id: string; nome: string; email: string; cargo: string };
type ClienteAdministrativo = { empresa_id: string; empresa: string; cnpj?: string; bloqueada: boolean; bloqueio_motivo: string | null; contatos: ContatoAdministrativo[]; solicitacoes: number; concluidos: number; em_execucao?: number; propostas_aceitas?: number; propostas_recusadas?: number; ticket_medio: number | null; valor_total?: number; ultima_solicitacao?: string | null; servicos?: Array<{ slug: string; quantidade: number }> };
type EdicaoCliente = { empresa_id: string; empresa: string; cnpj: string; contatos: ContatoAdministrativo[] };

type UsuarioAdministrativo = Pick<Perfil, 'usuario_id' | 'nome' | 'perfil_interno'> & { email?: string; cargo_profissional?: string | null; cnpj_empregador_sintetico?: string | null };
const cargosPredefinidos = ['Analista', 'Coordenador(a)', 'Engenheiro(a)', 'Gestor(a)', 'Metrologista', 'Técnico(a)', 'Outro'];
const ITENS_POR_PAGINA_ADMIN = 8;

function PaginacaoAdmin({ pagina, total, aoMudar }: { pagina: number; total: number; aoMudar: (pagina: number) => void }) {
  const paginas = Math.max(1, Math.ceil(total / ITENS_POR_PAGINA_ADMIN));
  if (paginas <= 1) return null;
  return <nav className="paginacao-admin" aria-label="Paginação"><button type="button" disabled={pagina <= 1} onClick={() => aoMudar(pagina - 1)}>Anterior</button><span>Página {pagina} de {paginas}</span><button type="button" disabled={pagina >= paginas} onClick={() => aoMudar(pagina + 1)}>Próxima</button></nav>;
}

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
  const [modoSenha, setModoSenha] = useState<ModoDefinicaoSenha>(() => typeof window === 'undefined' ? null : modoDefinicaoSenha(window.location.href));
  const [linkSenhaPronto, setLinkSenhaPronto] = useState(false);

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
    const modoInicial = modoDefinicaoSenha(window.location.href);
    cliente.auth
      .getSession()
      .then(({ data }) => {
        if (!ativo) return;
        if (modoInicial) {
          setModoSenha(modoInicial);
          setLinkSenhaPronto(Boolean(data.session?.user));
          setEstado('anonimo');
        }
        else if (!data.session?.user) setEstado('anonimo');
        else void carregarPerfil(data.session.user.id);
      })
      .catch(() => {
        if (ativo) setEstado('erro');
      });

    const { data: autenticacao } = cliente.auth.onAuthStateChange((evento, sessao) => {
      if (evento === 'SIGNED_OUT') {
        setPerfil(null);
        setContextoCliente(null);
        setEditandoPerfil(false);
        setEstado('anonimo');
      }
      if (evento === 'PASSWORD_RECOVERY') {
        setModoSenha('recuperacao');
        setLinkSenhaPronto(Boolean(sessao?.user));
        setEstado('anonimo');
      }
      if (evento === 'SIGNED_IN' && modoDefinicaoSenha(window.location.href)) {
        setModoSenha(modoDefinicaoSenha(window.location.href));
        setLinkSenhaPronto(Boolean(sessao?.user));
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
    if (typeof window !== 'undefined' && modoDefinicaoSenha(window.location.href)) {
      window.history.replaceState({}, '', limparModoDefinicaoSenha(window.location.href));
      setModoSenha(null);
      setLinkSenhaPronto(false);
    }
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

  return <TelaAcesso estado={estado} cliente={cliente} mensagem={mensagem} aoAutenticar={carregarPerfil} modoSenha={modoSenha} linkSenhaPronto={linkSenhaPronto} aoConcluirRecuperacao={() => { setModoSenha(null); setLinkSenhaPronto(false); }} />;
}

function TelaAcesso({ estado, cliente, mensagem, aoAutenticar, modoSenha, linkSenhaPronto, aoConcluirRecuperacao }: { estado: Estado; cliente: SupabaseClient | null; mensagem: string; aoAutenticar: (usuarioId: string) => Promise<void>; modoSenha: ModoDefinicaoSenha; linkSenhaPronto: boolean; aoConcluirRecuperacao: () => void }) {
  const { t } = useTraducaoPublica();
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
      setErro(t('E-mail ou senha inválidos. Verifique os dados ou recupere sua senha.'));
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
    if (error) setErro(t('Não foi possível iniciar a recuperação agora. Aguarde alguns instantes e tente novamente.'));
    else {
      setAviso(t('Se o e-mail estiver cadastrado, você receberá um link seguro para criar uma nova senha.'));
      setSolicitandoRecuperacao(false);
    }
    setEnviando(false);
  }

  async function redefinirSenha(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!cliente) return;
    if (novaSenha.length < 10) {
      setErro(t('A nova senha deve ter pelo menos 10 caracteres.'));
      return;
    }
    if (novaSenha !== confirmacaoSenha) {
      setErro(t('A confirmação não corresponde à nova senha.'));
      return;
    }
    setEnviando(true);
    setErro('');
    const { data: sessaoAtual } = await cliente.auth.getSession();
    if (!sessaoAtual.session?.user) {
      setErro(t('O link ainda não foi validado ou já expirou. Abra novamente o link mais recente recebido por e-mail.'));
      setEnviando(false);
      return;
    }
    const { error } = await cliente.auth.updateUser({ password: novaSenha });
    if (error) setErro(t('O link expirou ou a senha não pôde ser alterada. Solicite uma nova recuperação.'));
    else {
      setAviso(t('Senha alterada. Você já pode continuar com a sessão protegida.'));
      setNovaSenha('');
      setConfirmacaoSenha('');
      window.history.replaceState({}, '', limparModoDefinicaoSenha(window.location.href));
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
        <div className="idioma-acesso"><SeletorIdioma compacto /></div>
        <a href="/" aria-label={t('Voltar à página pública')}>
          <MarcaOficial />
        </a>
        <span className="selo-acesso">
          <ShieldCheck size={15} /> {t('Acesso protegido')}
        </span>
        {estado === 'carregando' && (
          <>
            <h1>{t('Validando acesso')}</h1>
            <p role="status">{t('Aguarde enquanto confirmamos sua sessão e o tipo de acesso.')}</p>
          </>
        )}
        {estado === 'sem_configuracao' && (
          <>
            <h1>{t('Integração de homologação pendente')}</h1>
            <p>{t('O acesso permanece fechado até a URL e a chave pública do Supabase de homologação serem configuradas.')}</p>
          </>
        )}
        {estado === 'sem_perfil' && (
          <>
            <h1>{t('Acesso ainda não vinculado')}</h1>
            <p>{t('Sua identidade foi confirmada, mas não há perfil interno nem vínculo aprovado com uma empresa. Clientes recebem esse vínculo por convite da equipe após a análise da solicitação.')}</p>
            {mensagem && (
              <p className="erro-acesso" role="alert">
                {mensagem}
              </p>
            )}
            <button className="botao-acesso" type="button" onClick={() => void cliente?.auth.signOut()}>
              {t('Sair')}
            </button>
          </>
        )}
        {estado === 'erro' && (
          <>
            <h1>{t('Não foi possível validar o acesso')}</h1>
            <p role="alert">{mensagem ? t(mensagem) : t('A autenticação está temporariamente indisponível.')}</p>
            <button className="botao-acesso" type="button" onClick={() => window.location.reload()}>
              {t('Tentar novamente')}
            </button>
          </>
        )}
        {estado === 'anonimo' && modoSenha && (
          <>
            <h1>{modoSenha === 'convite' ? t('Ative sua conta') : t('Crie uma nova senha')}</h1>
            <p>{linkSenhaPronto ? t('Use uma senha exclusiva com pelo menos 10 caracteres.') : t('Validando o link seguro recebido por e-mail…')}</p>
            <form onSubmit={redefinirSenha}>
              <label htmlFor="nova-senha">{t('Nova senha')}</label>
              <input id="nova-senha" type="password" autoComplete="new-password" required minLength={10} value={novaSenha} onChange={(evento) => setNovaSenha(evento.target.value)} />
              <label htmlFor="confirmar-nova-senha">{t('Confirmar nova senha')}</label>
              <input id="confirmar-nova-senha" type="password" autoComplete="new-password" required minLength={10} value={confirmacaoSenha} onChange={(evento) => setConfirmacaoSenha(evento.target.value)} />
              <button className="botao-acesso" type="submit" disabled={enviando || !linkSenhaPronto}>
                <KeyRound size={16} /> {enviando ? t('Alterando…') : t('Salvar nova senha')}
              </button>
            </form>
          </>
        )}
        {estado === 'anonimo' && !modoSenha && solicitandoRecuperacao && (
          <>
            <h1>{t('Recuperar senha')}</h1>
            <p>{t('Informe o e-mail usado no portal. Por segurança, a confirmação não revela se o endereço está cadastrado.')}</p>
            <form onSubmit={solicitarRecuperacao}>
              <label htmlFor="email-recuperacao">E-mail</label>
              <input id="email-recuperacao" type="email" autoComplete="email" required value={email} onChange={(evento) => setEmail(evento.target.value)} />
              <button className="botao-acesso" type="submit" disabled={enviando}>
                <Mail size={16} /> {enviando ? t('Enviando…') : t('Enviar link seguro')}
              </button>
              <button className="link-acesso botao-link-acesso" type="button" onClick={() => setSolicitandoRecuperacao(false)}>{t('Voltar ao login')}</button>
            </form>
          </>
        )}
        {estado === 'anonimo' && !modoSenha && !solicitandoRecuperacao && (
          <>
            <h1>{t('Entrar no Portal de Metrologia')}</h1>
            <p>{t('Equipe interna e clientes convidados usam o mesmo acesso. Não é preciso entrar para enviar uma solicitação.')}</p>
            <form onSubmit={entrar}>
              <label htmlFor="email-interno">E-mail</label>
              <input id="email-interno" type="email" autoComplete="username" required value={email} onChange={(evento) => setEmail(evento.target.value)} />
              <label htmlFor="senha-interna">{t('Senha')}</label>
              <input id="senha-interna" type="password" autoComplete="current-password" required value={senha} onChange={(evento) => setSenha(evento.target.value)} />
              <button className="botao-acesso" type="submit" disabled={enviando}>
                <LockKeyhole size={16} />
                {enviando ? t('Validando…') : t('Entrar')}
              </button>
            </form>
            <button className="link-acesso botao-link-acesso" type="button" onClick={() => setSolicitandoRecuperacao(true)}>{t('Esqueci minha senha')}</button>
            <a className="link-acesso" href="/solicitar">
              {t('Fazer solicitação sem login')}
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
  const [usuarios, setUsuarios] = useState<UsuarioAdministrativo[]>([]);
  const [alterandoUsuario, setAlterandoUsuario] = useState('');
  const [funcionarios, setFuncionarios] = useState<FuncionarioAdministrativo[]>([]);
  const [clientes, setClientes] = useState<ClienteAdministrativo[]>([]);
  const [buscaCliente, setBuscaCliente] = useState('');
  const [buscaEquipe, setBuscaEquipe] = useState('');
  const [filtroEquipe, setFiltroEquipe] = useState('todos');
  const [ordenacaoEquipe, setOrdenacaoEquipe] = useState('nome');
  const [filtroCliente, setFiltroCliente] = useState('todos');
  const [ordenacaoCliente, setOrdenacaoCliente] = useState('recentes');
  const [paginaEquipe, setPaginaEquipe] = useState(1);
  const [convite, setConvite] = useState({ nome: '', email: '', tipo: 'cliente', empresa: '', cnpj: '', cargoOpcao: 'Gestor(a)', cargoOutro: '' });
  const [convidando, setConvidando] = useState(false);
  const [bloqueando, setBloqueando] = useState('');
  const [perfilAberto, setPerfilAberto] = useState(false);
  const [edicaoCliente, setEdicaoCliente] = useState<EdicaoCliente | null>(null);
  const [salvandoCliente, setSalvandoCliente] = useState(false);

  const carregarAdministracao = useCallback(async () => {
    if (perfil.perfil_interno !== 'administrador') return;
    const [respostaUsuarios, respostaPainel] = await Promise.all([
      cliente.rpc('listar_usuarios_internos_demonstrativos'),
      cliente.rpc('listar_painel_administrativo_demonstrativo'),
    ]);
    if (!respostaUsuarios.error) setUsuarios((respostaUsuarios.data ?? []) as UsuarioAdministrativo[]);
    if (!respostaPainel.error && respostaPainel.data && typeof respostaPainel.data === 'object') {
      const painel = respostaPainel.data as { funcionarios?: FuncionarioAdministrativo[]; clientes?: ClienteAdministrativo[] };
      setFuncionarios(painel.funcionarios ?? []);
      setClientes(painel.clientes ?? []);
    }
  }, [cliente, perfil.perfil_interno]);

  useEffect(() => {
    void cliente.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ''));
    queueMicrotask(() => void carregarAdministracao());
  }, [carregarAdministracao, cliente]);

  useEffect(() => {
    if (!edicaoCliente) return;
    function fecharComEscape(evento: KeyboardEvent) {
      if (evento.key === 'Escape' && !salvandoCliente) setEdicaoCliente(null);
    }
    window.addEventListener('keydown', fecharComEscape);
    return () => window.removeEventListener('keydown', fecharComEscape);
  }, [edicaoCliente, salvandoCliente]);

  const funcionariosVisiveis = useMemo(() => funcionarios.filter((item) => `${item.nome} ${item.email} ${item.cargo ?? ''} ${rotulosPerfil[item.perfil]}`.toLowerCase().includes(buscaEquipe.trim().toLowerCase()) && (filtroEquipe === 'todos' || item.perfil === filtroEquipe)).sort((a, b) => ordenacaoEquipe === 'concluidos' ? b.concluidos - a.concluidos : ordenacaoEquipe === 'retrabalhos' ? b.retrabalhos - a.retrabalhos : ordenacaoEquipe === 'execucao' ? b.em_execucao - a.em_execucao : a.nome.localeCompare(b.nome, 'pt-BR')), [buscaEquipe, filtroEquipe, funcionarios, ordenacaoEquipe]);
  const usuariosVisiveis = useMemo(() => usuarios.filter((item) => `${item.nome} ${item.email ?? ''} ${item.cargo_profissional ?? ''}`.toLowerCase().includes(buscaEquipe.trim().toLowerCase()) && (filtroEquipe === 'todos' || item.perfil_interno === filtroEquipe)), [buscaEquipe, filtroEquipe, usuarios]);
  const clientesVisiveis = useMemo(() => clientes.filter((item) => `${item.empresa} ${item.cnpj ?? ''} ${item.contatos.map((contato) => `${contato.nome} ${contato.email} ${contato.cargo}`).join(' ')}`.toLowerCase().includes(buscaCliente.trim().toLowerCase()) && (filtroCliente === 'todos' || (filtroCliente === 'ativas' ? !item.bloqueada : filtroCliente === 'bloqueadas' ? item.bloqueada : filtroCliente === 'com_execucao' ? Boolean(item.em_execucao) : true))).sort((a, b) => ordenacaoCliente === 'ticket' ? Number(b.ticket_medio || 0) - Number(a.ticket_medio || 0) : ordenacaoCliente === 'valor' ? Number(b.valor_total || 0) - Number(a.valor_total || 0) : ordenacaoCliente === 'nome' ? a.empresa.localeCompare(b.empresa, 'pt-BR') : +new Date(b.ultima_solicitacao || 0) - +new Date(a.ultima_solicitacao || 0)), [buscaCliente, clientes, filtroCliente, ordenacaoCliente]);
  const paginaEquipeValida = Math.min(paginaEquipe, Math.max(1, Math.ceil(usuariosVisiveis.length / ITENS_POR_PAGINA_ADMIN)));
  const usuariosPaginados = usuariosVisiveis.slice((paginaEquipeValida - 1) * ITENS_POR_PAGINA_ADMIN, paginaEquipeValida * ITENS_POR_PAGINA_ADMIN);
  const funcionariosPaginados = funcionariosVisiveis.slice((paginaEquipeValida - 1) * ITENS_POR_PAGINA_ADMIN, paginaEquipeValida * ITENS_POR_PAGINA_ADMIN);

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
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailNormalizado)) {
      setTipoMensagem('erro');
      setMensagem('Informe um endereço de e-mail válido.');
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

  async function convidarUsuario(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setConvidando(true);
    setMensagem('');
    const cargo = convite.cargoOpcao === 'Outro' ? convite.cargoOutro.trim() : convite.cargoOpcao;
    if (!cnpjValido(convite.cnpj)) { setTipoMensagem('erro'); setMensagem('Informe um CNPJ válido para a empresa.'); setConvidando(false); return; }
    if (cargo.length < 2) { setTipoMensagem('erro'); setMensagem('Selecione ou informe um cargo válido.'); setConvidando(false); return; }
    const { data, error } = await cliente.functions.invoke('gerenciar-usuarios', { body: { ...convite, cargo } });
    if (error || data?.erro) {
      setTipoMensagem('erro');
      setMensagem(data?.erro || 'Não foi possível enviar o convite.');
    } else {
      setTipoMensagem('sucesso');
      setMensagem(data?.mensagem || 'Convite enviado por e-mail.');
      setConvite({ nome: '', email: '', tipo: 'cliente', empresa: '', cnpj: '', cargoOpcao: 'Gestor(a)', cargoOutro: '' });
      await carregarAdministracao();
    }
    setConvidando(false);
  }

  async function alterarBloqueio(item: ClienteAdministrativo) {
    const motivo = item.bloqueada ? null : window.prompt('Informe o motivo do bloqueio (5 a 500 caracteres):');
    if (!item.bloqueada && (!motivo || motivo.trim().length < 5)) return;
    setBloqueando(item.empresa_id);
    const { error } = await cliente.rpc('alterar_bloqueio_empresa_demonstrativa', { empresa: item.empresa_id, bloquear: !item.bloqueada, motivo });
    if (error) { setTipoMensagem('erro'); setMensagem(error.message || 'Não foi possível alterar o bloqueio.'); }
    else { setTipoMensagem('sucesso'); setMensagem(item.bloqueada ? 'Acesso da empresa desbloqueado.' : 'Acesso da empresa bloqueado e auditado.'); await carregarAdministracao(); }
    setBloqueando('');
  }

  function abrirEdicaoCliente(item: ClienteAdministrativo) {
    setEdicaoCliente({ empresa_id: item.empresa_id, empresa: item.empresa, cnpj: formatarCnpj(item.cnpj ?? ''), contatos: item.contatos.map((contato) => ({ ...contato })) });
  }

  async function salvarClienteCompleto(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!edicaoCliente) return;
    const empresaAtualizada = edicaoCliente.empresa.trim();
    if (empresaAtualizada.length < 2 || empresaAtualizada.length > 180 || !cnpjValido(edicaoCliente.cnpj)) {
      setTipoMensagem('erro');
      setMensagem('Revise a razão social e informe um CNPJ válido.');
      return;
    }
    if (!edicaoCliente.contatos.length || edicaoCliente.contatos.some((contato) => contato.nome.trim().length < 2 || contato.cargo.trim().length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contato.email.trim()))) {
      setTipoMensagem('erro');
      setMensagem('Revise nome, e-mail e cargo de todos os contatos.');
      return;
    }
    setSalvandoCliente(true);
    setMensagem('');
    for (const contato of edicaoCliente.contatos) {
      const { data, error } = await cliente.functions.invoke('gerenciar-usuarios', { body: { acao: 'atualizar_cliente', empresa_id: edicaoCliente.empresa_id, empresa: empresaAtualizada, cnpj: edicaoCliente.cnpj, usuario_id: contato.usuario_id, nome: contato.nome.trim(), email: contato.email.trim().toLowerCase(), cargo: contato.cargo.trim() } });
      if (error || data?.erro) {
        setTipoMensagem('erro');
        setMensagem(data?.erro || `Não foi possível atualizar ${contato.nome}.`);
        setSalvandoCliente(false);
        return;
      }
    }
    setTipoMensagem('sucesso');
    setMensagem('Empresa e todos os contatos foram atualizados e auditados.');
    setEdicaoCliente(null);
    await carregarAdministracao();
    setSalvandoCliente(false);
  }

  function abrirAreaAdministrativa(destino: 'equipe' | 'clientes' | 'concluidos' | 'volume') {
    if (destino === 'equipe') { setBuscaEquipe(''); setFiltroEquipe('todos'); setOrdenacaoEquipe('nome'); setPaginaEquipe(1); }
    if (destino === 'clientes') { setBuscaCliente(''); setFiltroCliente('todos'); setOrdenacaoCliente('recentes'); }
    if (destino === 'concluidos') { setBuscaEquipe(''); setFiltroEquipe('todos'); setOrdenacaoEquipe('concluidos'); setPaginaEquipe(1); }
    if (destino === 'volume') { setBuscaCliente(''); setFiltroCliente('todos'); setOrdenacaoCliente('valor'); }
    window.requestAnimationFrame(() => document.getElementById(destino === 'equipe' || destino === 'concluidos' ? 'equipe-admin' : 'clientes-admin')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  return (
    <main className="acesso-interno">
      <NotificacaoFlutuante mensagem={mensagem} tipo={tipoMensagem} aoFechar={() => setMensagem('')} />
      <section className={`cartao-acesso ${perfil.perfil_interno === 'administrador' ? 'cartao-administracao' : ''}`}>
        <button className="voltar-acesso" type="button" onClick={aoVoltar}>
          <ArrowLeft size={16} /> Voltar ao portal
        </button>
        <span className="selo-acesso">
          <ShieldCheck size={15} /> Origem: demonstração
        </span>
        <button className="cabecalho-perfil-colapsavel" type="button" aria-expanded={perfilAberto} onClick={() => setPerfilAberto((aberto) => !aberto)}><span><strong>Meu perfil interno</strong><small>Nome, e-mail, função e origem ativa</small></span>{perfilAberto ? <ChevronUp /> : <ChevronDown />}</button>
        {perfilAberto && <form className="formulario-perfil-colapsavel" onSubmit={salvar}>
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
        </form>}
        {perfil.perfil_interno === 'administrador' && (
          <section className="gestao-usuarios-internos area-administrativa">
            <section className="resumo-administracao" aria-label="Resumo administrativo">
              <button type="button" onClick={() => abrirAreaAdministrativa('equipe')}><Users /><span><small>Equipe interna</small><strong>{funcionarios.length}</strong><em>Ver profissionais</em></span></button>
              <button type="button" onClick={() => abrirAreaAdministrativa('clientes')}><Building2 /><span><small>Empresas clientes</small><strong>{clientes.length}</strong><em>Ver carteira</em></span></button>
              <button type="button" onClick={() => abrirAreaAdministrativa('concluidos')}><TrendingUp /><span><small>Serviços concluídos</small><strong>{clientes.reduce((total, item) => total + item.concluidos, 0)}</strong><em>Ordenar desempenho</em></span></button>
              <button type="button" onClick={() => abrirAreaAdministrativa('volume')}><WalletCards /><span><small>Volume aceito</small><strong>{new Intl.NumberFormat('pt-BR', { notation: 'compact', style: 'currency', currency: 'BRL' }).format(clientes.reduce((total, item) => total + Number(item.valor_total || 0), 0))}</strong><em>Ordenar carteira</em></span></button>
            </section>
            <h2 id="equipe-admin">Funções da equipe</h2>
            <p>Localize profissionais por nome, e-mail, cargo ou perfil. Sua própria função fica protegida contra alteração acidental.</p>
            <BarraBuscaFiltros busca={buscaEquipe} aoMudarBusca={(valor) => { setBuscaEquipe(valor); setPaginaEquipe(1); }} placeholder="Pesquisar profissional, e-mail ou cargo" total={usuariosVisiveis.length} filtros={[{ id: 'perfil-equipe', rotulo: 'Perfil', valor: filtroEquipe, aoMudar: (valor) => { setFiltroEquipe(valor); setPaginaEquipe(1); }, opcoes: [{ valor: 'todos', rotulo: 'Todos os perfis' }, { valor: 'tecnico', rotulo: 'Técnicos' }, { valor: 'validador', rotulo: 'Validadores' }, { valor: 'administrador', rotulo: 'Administradores' }] }]} ordenacao={{ valor: ordenacaoEquipe, aoMudar: (valor) => { setOrdenacaoEquipe(valor); setPaginaEquipe(1); }, opcoes: [{ valor: 'nome', rotulo: 'Nome (A–Z)' }, { valor: 'concluidos', rotulo: 'Mais conclusões' }, { valor: 'execucao', rotulo: 'Mais trabalhos ativos' }, { valor: 'retrabalhos', rotulo: 'Mais retrabalhos' }] }} />
            <div className="grade-funcoes-equipe">{usuariosPaginados.map((usuario) => (
              <label key={usuario.usuario_id}>
                <span>
                  <strong>{usuario.nome}</strong>
                  <small>{usuario.usuario_id === perfil.usuario_id ? 'Você' : usuario.cargo_profissional || usuario.email || 'Usuário interno'}</small>
                </span>
                <select value={usuario.perfil_interno} disabled={usuario.usuario_id === perfil.usuario_id || alterandoUsuario === usuario.usuario_id} onChange={(evento) => void alterarFuncao(usuario.usuario_id, evento.target.value as PerfilInterno)}>
                  {(['tecnico', 'validador', 'administrador'] as PerfilInterno[]).map((valor) => (
                    <option key={valor} value={valor}>
                      {rotulosPerfil[valor]}
                    </option>
                  ))}
                </select>
              </label>
            ))}</div><PaginacaoAdmin pagina={paginaEquipeValida} total={usuariosVisiveis.length} aoMudar={setPaginaEquipe} />
            <section className="painel-convite-usuario">
              <header><UserPlus size={20} /><div><h2>Cadastrar novo usuário</h2><p>O sistema envia um convite seguro; a pessoa define a própria senha.</p></div></header>
              <form onSubmit={convidarUsuario}>
                <label>Nome<input required minLength={2} maxLength={120} value={convite.nome} onChange={(e) => setConvite((atual) => ({ ...atual, nome: e.target.value }))} /></label>
                <label>E-mail<input required type="email" value={convite.email} onChange={(e) => setConvite((atual) => ({ ...atual, email: e.target.value }))} /></label>
                <label>Tipo<select value={convite.tipo} onChange={(e) => setConvite((atual) => ({ ...atual, tipo: e.target.value }))}><option value="cliente">Cliente</option><option value="tecnico">Técnico</option><option value="validador">Validador</option><option value="administrador">Administrador</option></select></label>
                <label>Empresa do usuário<input required minLength={2} maxLength={180} value={convite.empresa} onChange={(e) => setConvite((atual) => ({ ...atual, empresa: e.target.value }))} /></label>
                <label>CNPJ da empresa<input required inputMode="numeric" minLength={18} maxLength={18} value={convite.cnpj} onChange={(e) => setConvite((atual) => ({ ...atual, cnpj: formatarCnpj(e.target.value) }))} placeholder="00.000.000/0000-00" /></label>
                <label>Cargo/função<select value={convite.cargoOpcao} onChange={(e) => setConvite((atual) => ({ ...atual, cargoOpcao: e.target.value }))}>{cargosPredefinidos.map((cargo) => <option key={cargo}>{cargo}</option>)}</select></label>
                {convite.cargoOpcao === 'Outro' && <label>Outro cargo<input required minLength={2} maxLength={120} value={convite.cargoOutro} onChange={(e) => setConvite((atual) => ({ ...atual, cargoOutro: e.target.value }))} /></label>}
                <button className="botao-acesso" type="submit" disabled={convidando}><UserPlus size={16} />{convidando ? 'Enviando…' : 'Enviar convite'}</button>
              </form>
            </section>
            <section className="metricas-equipe-admin">
              <header><Activity size={20} /><div><h2>Performance da equipe</h2><p>Indicadores operacionais; valores comerciais não são expostos ao Técnico.</p></div></header>
              <div>{funcionariosPaginados.map((item) => <article key={item.usuario_id}><strong>{item.nome}</strong><small>{item.cargo || rotulosPerfil[item.perfil]} · {rotulosPerfil[item.perfil]}</small><dl><div><dt>Atribuídos</dt><dd>{item.atribuidos}</dd></div><div><dt>Em execução</dt><dd>{item.em_execucao}</dd></div><div><dt>Concluídos</dt><dd>{item.concluidos}</dd></div><div><dt>Retrabalhos</dt><dd>{item.retrabalhos}</dd></div></dl><div className="barra-performance" title={`${item.concluidos} de ${Math.max(item.atribuidos, 1)} concluídos`}><span style={{ width: `${Math.min(100, item.atribuidos ? item.concluidos / item.atribuidos * 100 : 0)}%` }} /></div></article>)}</div>
            </section>
            <section className="clientes-admin" id="clientes-admin">
              <header><Users size={20} /><div><h2>Clientes cadastrados</h2><p>Pesquise empresas e contatos, acompanhe relacionamento e administre o acesso.</p></div></header>
              <BarraBuscaFiltros busca={buscaCliente} aoMudarBusca={setBuscaCliente} placeholder="Pesquisar empresa, CNPJ, contato, cargo ou e-mail" total={clientesVisiveis.length} filtros={[{ id: 'situacao-clientes', rotulo: 'Situação', valor: filtroCliente, aoMudar: setFiltroCliente, opcoes: [{ valor: 'todos', rotulo: 'Todos os clientes' }, { valor: 'ativas', rotulo: 'Contas ativas' }, { valor: 'bloqueadas', rotulo: 'Contas bloqueadas' }, { valor: 'com_execucao', rotulo: 'Com serviços ativos' }] }]} ordenacao={{ valor: ordenacaoCliente, aoMudar: setOrdenacaoCliente, opcoes: [{ valor: 'recentes', rotulo: 'Atividade mais recente' }, { valor: 'ticket', rotulo: 'Maior ticket médio' }, { valor: 'valor', rotulo: 'Maior volume aceito' }, { valor: 'nome', rotulo: 'Empresa (A–Z)' }] }} />
              <section className="analise-clientes-admin"><article><h3>Maiores relacionamentos</h3>{[...clientes].sort((a,b) => Number(b.valor_total || 0) - Number(a.valor_total || 0)).slice(0,5).map((item) => <div className="linha-grafico-admin" key={item.empresa_id}><span>{item.empresa}</span><div><i style={{ width: `${Math.max(4, Number(item.valor_total || 0) / Math.max(...clientes.map((clienteItem) => Number(clienteItem.valor_total || 0)), 1) * 100)}%` }} /></div><b>{new Intl.NumberFormat('pt-BR', { notation: 'compact', style: 'currency', currency: 'BRL' }).format(Number(item.valor_total || 0))}</b></div>)}</article><article><h3>Carteira e decisões</h3><dl><div><dt>Contas ativas</dt><dd>{clientes.filter((item) => !item.bloqueada).length}</dd></div><div><dt>Em execução</dt><dd>{clientes.reduce((total,item) => total + Number(item.em_execucao || 0), 0)}</dd></div><div><dt>Propostas aceitas</dt><dd>{clientes.reduce((total,item) => total + Number(item.propostas_aceitas || 0), 0)}</dd></div><div><dt>Revisões solicitadas</dt><dd>{clientes.reduce((total,item) => total + Number(item.propostas_recusadas || 0), 0)}</dd></div></dl></article></section>
              <div className="lista-clientes-admin">{clientesVisiveis.map((item) => <article key={item.empresa_id}><header><div><strong>{item.empresa}</strong><small>{item.cnpj ? `CNPJ ${formatarCnpj(item.cnpj)}` : 'CNPJ não informado'}</small></div><span className={`estado ${item.bloqueada ? 'estado-rejeitada' : 'estado-formalizada'}`}>{item.bloqueada ? 'Bloqueada' : 'Ativa'}</span></header><div className="contatos-cliente-admin">{item.contatos.length ? item.contatos.map((contato) => <span key={contato.usuario_id}><strong>{contato.nome}</strong><small>{contato.cargo} · {contato.email}</small></span>) : <span>Sem contato ativo</span>}</div><dl><div><dt>Solicitações</dt><dd>{item.solicitacoes}</dd></div><div><dt>Ativos</dt><dd>{item.em_execucao || 0}</dd></div><div><dt>Concluídos</dt><dd>{item.concluidos}</dd></div><div><dt>Ticket médio</dt><dd>{item.ticket_medio == null ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.ticket_medio)}</dd></div><div><dt>Volume aceito</dt><dd>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(item.valor_total || 0))}</dd></div><div><dt>Serviço principal</dt><dd>{item.servicos?.[0]?.slug?.replaceAll('-', ' ') || '—'}</dd></div></dl>{item.bloqueio_motivo && <p>Motivo: {item.bloqueio_motivo}</p>}<div className="acoes-cliente-admin"><button type="button" onClick={() => abrirEdicaoCliente(item)}><Pencil size={15} /> Editar cadastro completo</button><button type="button" disabled={bloqueando === item.empresa_id} onClick={() => void alterarBloqueio(item)}>{item.bloqueada ? <CheckCircle2 size={15} /> : <Ban size={15} />}{item.bloqueada ? 'Desbloquear acesso' : 'Bloquear acesso'}</button></div></article>)}</div>
            </section>
          </section>
        )}
      </section>
      {edicaoCliente && <div className="fundo-edicao-cliente" role="presentation" onMouseDown={(evento) => { if (evento.target === evento.currentTarget && !salvandoCliente) setEdicaoCliente(null); }}><form className="janela-edicao-cliente" role="dialog" aria-modal="true" aria-labelledby="titulo-edicao-cliente" onSubmit={salvarClienteCompleto}><header><div><span>CADASTRO DA EMPRESA</span><h2 id="titulo-edicao-cliente">Editar cliente</h2><p>Atualize os dados em qualquer ordem e salve tudo ao final.</p></div><button type="button" disabled={salvandoCliente} onClick={() => setEdicaoCliente(null)} aria-label="Fechar edição"><X /></button></header><section className="grade-edicao-empresa"><label>Razão social<input required minLength={2} maxLength={180} value={edicaoCliente.empresa} onChange={(evento) => setEdicaoCliente((atual) => atual ? { ...atual, empresa: evento.target.value } : atual)} /></label><label>CNPJ<input required inputMode="numeric" minLength={18} maxLength={18} value={edicaoCliente.cnpj} onChange={(evento) => setEdicaoCliente((atual) => atual ? { ...atual, cnpj: formatarCnpj(evento.target.value) } : atual)} /></label></section><section className="edicao-contatos-cliente"><h3>Contatos vinculados</h3>{edicaoCliente.contatos.map((contato, indice) => <fieldset key={contato.usuario_id}><legend>Contato {indice + 1}</legend><label>Nome<input required minLength={2} maxLength={120} value={contato.nome} onChange={(evento) => setEdicaoCliente((atual) => atual ? { ...atual, contatos: atual.contatos.map((item, posicao) => posicao === indice ? { ...item, nome: evento.target.value } : item) } : atual)} /></label><label>E-mail de acesso<input required type="email" value={contato.email} onChange={(evento) => setEdicaoCliente((atual) => atual ? { ...atual, contatos: atual.contatos.map((item, posicao) => posicao === indice ? { ...item, email: evento.target.value } : item) } : atual)} /></label><label>Cargo ou função<input required minLength={2} maxLength={120} value={contato.cargo} onChange={(evento) => setEdicaoCliente((atual) => atual ? { ...atual, contatos: atual.contatos.map((item, posicao) => posicao === indice ? { ...item, cargo: evento.target.value } : item) } : atual)} /></label></fieldset>)}</section><footer><button type="button" disabled={salvandoCliente} onClick={() => setEdicaoCliente(null)}>Cancelar</button><button type="submit" disabled={salvandoCliente}><Save size={16} /> {salvandoCliente ? 'Salvando…' : 'Salvar todas as alterações'}</button></footer></form></div>}
    </main>
  );
}
