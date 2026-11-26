import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { PerfilInterno } from '@lib/contratos';
import type { ContextoCliente } from '@lib/portal-cliente';
import { obterSupabaseMobile } from '../supabase';
import { CORES, estilosComuns } from '../theme';

export type SessaoMobile =
  | {
      tipo: 'equipe';
      nome: string;
      email: string;
      perfilInterno: PerfilInterno;
    }
  | {
      tipo: 'cliente';
      contexto: ContextoCliente;
    };

export function LoginScreen({
  aoAutenticar,
  aoVoltarPublico,
}: {
  aoAutenticar: (sessao: SessaoMobile) => void;
  aoVoltarPublico: () => void;
}) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [modoRecuperacao, setModoRecuperacao] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  async function realizarLogin() {
    const emailUsado = email.trim();
    const senhaUsada = senha;

    if (!emailUsado || !senhaUsada) {
      setErro('Informe seu e-mail corporativo e sua senha.');
      return;
    }

    setErro('');
    setAviso('');
    setCarregando(true);

    try {
      const supabase = obterSupabaseMobile();
      if (!supabase) {
        setErro('Configuração do Supabase ausente no aplicativo.');
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailUsado,
        password: senhaUsada,
      });

      if (error) {
        if (/failed to fetch|network|fetch/i.test(error.message)) {
          setErro(
            'Não foi possível conectar ao servidor Supabase. Verifique sua internet ou se o projeto está ativo.',
          );
        } else {
          setErro('E-mail ou senha inválidos.');
        }
        return;
      }

      if (!data.user) {
        setErro('Não foi possível autenticar sua conta.');
        return;
      }

      const { data: ctxCliente } = await supabase.rpc('obter_contexto_cliente');
      if (ctxCliente && typeof ctxCliente === 'object') {
        aoAutenticar({
          tipo: 'cliente',
          contexto: ctxCliente as ContextoCliente,
        });
        return;
      }

      const { data: perfilDb } = await supabase
        .from('perfis')
        .select('usuario_id,nome,perfil_interno,origem_ativa')
        .eq('usuario_id', data.user.id)
        .maybeSingle();

      if (perfilDb?.perfil_interno) {
        aoAutenticar({
          tipo: 'equipe',
          nome: perfilDb.nome || emailUsado,
          email: emailUsado,
          perfilInterno: perfilDb.perfil_interno as PerfilInterno,
        });
        return;
      }

      setErro('Usuário autenticado, mas sem perfil vinculado no portal.');
    } catch {
      setErro('Falha de conexão com o servidor Supabase. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  }

  async function solicitarRecuperacao() {
    if (!email.trim()) {
      setErro('Informe seu e-mail cadastrado para receber o link de recuperação.');
      return;
    }
    setErro('');
    setCarregando(true);
    try {
      const supabase = obterSupabaseMobile();
      if (supabase) {
        await supabase.auth.resetPasswordForEmail(email.trim());
      }
      setAviso(
        'Se o endereço estiver cadastrado e autorizado, um link temporário de redefinição foi enviado.',
      );
    } finally {
      setCarregando(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity style={styles.voltarBtn} onPress={aoVoltarPublico}>
        <Text style={styles.voltarTexto}>← Voltar à página pública</Text>
      </TouchableOpacity>

      <View style={estilosComuns.cartao}>
        <View style={[estilosComuns.badge, { backgroundColor: CORES.verdeClaro }]}>
          <Text style={[estilosComuns.badgeTexto, { color: CORES.verde }]}>
            🔒 ACESSO AO PORTAL
          </Text>
        </View>

        <Text style={estilosComuns.tituloSecao}>
          {modoRecuperacao ? 'Recuperar senha' : 'Entrar'}
        </Text>
        <Text style={[estilosComuns.paragrafo, { marginBottom: 14 }]}>
          {modoRecuperacao
            ? 'Informe seu e-mail para receber o link de redefinição.'
            : 'Acesse com seu e-mail e senha cadastrados.'}
        </Text>

        {erro ? (
          <View style={styles.erroBox}>
            <Text style={styles.erroTexto}>{erro}</Text>
          </View>
        ) : null}

        {aviso ? (
          <View style={styles.avisoBox}>
            <Text style={styles.avisoTexto}>{aviso}</Text>
          </View>
        ) : null}

        <Text style={estilosComuns.label}>E-mail corporativo</Text>
        <TextInput
          style={estilosComuns.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="nome@empresa.com.br"
        />

        {!modoRecuperacao && (
          <>
            <Text style={estilosComuns.label}>Senha</Text>
            <TextInput
              style={estilosComuns.input}
              value={senha}
              onChangeText={setSenha}
              secureTextEntry
              placeholder="••••••••••••"
            />
          </>
        )}

        {modoRecuperacao ? (
          <>
            <TouchableOpacity
              style={estilosComuns.botaoPrimario}
              onPress={() => void solicitarRecuperacao()}
              disabled={carregando}
            >
              <Text style={estilosComuns.botaoPrimarioTexto}>
                {carregando ? 'Enviando...' : 'Enviar link seguro'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[estilosComuns.botaoSecundario, { marginTop: 10 }]}
              onPress={() => {
                setModoRecuperacao(false);
                setErro('');
                setAviso('');
              }}
            >
              <Text style={estilosComuns.botaoSecundarioTexto}>Voltar ao login</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={estilosComuns.botaoPrimario}
              onPress={() => void realizarLogin()}
              disabled={carregando}
            >
              <Text style={estilosComuns.botaoPrimarioTexto}>
                {carregando ? 'Autenticando...' : 'Entrar'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ marginTop: 12, alignSelf: 'center' }}
              onPress={() => {
                setModoRecuperacao(true);
                setErro('');
                setAviso('');
              }}
            >
              <Text style={{ color: CORES.azulPrincipal, fontWeight: '700', fontSize: 13 }}>
                Esqueci minha senha
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 14, paddingBottom: 32 },
  voltarBtn: { marginBottom: 12 },
  voltarTexto: { color: CORES.azulPrincipal, fontWeight: '800', fontSize: 13.5 },
  erroBox: {
    backgroundColor: CORES.vermelhoClaro,
    padding: 11,
    borderRadius: 8,
    marginBottom: 12,
  },
  erroTexto: { color: CORES.vermelho, fontSize: 12.5, fontWeight: '700' },
  avisoBox: {
    backgroundColor: CORES.verdeClaro,
    padding: 11,
    borderRadius: 8,
    marginBottom: 12,
  },
  avisoTexto: { color: CORES.verde, fontSize: 12.5, fontWeight: '700' },
  contaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: CORES.fundo,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  contaNome: { fontSize: 13.5, fontWeight: '800', color: CORES.azulEscuro },
  contaEmail: { fontSize: 11.5, color: CORES.textoSecundario, marginTop: 2 },
  entrarSeta: { fontSize: 12, fontWeight: '800', color: CORES.azulPrincipal },
});
