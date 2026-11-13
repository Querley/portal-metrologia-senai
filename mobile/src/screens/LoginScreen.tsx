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
import {
  CONTAS_HOMOLOGACAO_DEMO,
  obterSupabaseMobile,
  type ContaHomologacaoDemo,
} from '../supabase';
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

  async function realizarLogin(contaSugerida?: ContaHomologacaoDemo) {
    const emailUsado = (contaSugerida?.email ?? email).trim();
    const senhaUsada = contaSugerida?.senha ?? senha;

    if (!emailUsado || !senhaUsada) {
      setErro('Preencha e-mail e senha ou selecione uma conta de homologação abaixo.');
      return;
    }

    setErro('');
    setAviso('');
    setCarregando(true);

    try {
      const supabase = obterSupabaseMobile();
      if (supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: emailUsado,
          password: senhaUsada,
        });

        if (!error && data.user) {
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
        }
      }

      // Fallback para as credenciais oficiais de homologação (documentadas no README)
      const contaDemo =
        contaSugerida ??
        CONTAS_HOMOLOGACAO_DEMO.find(
          (c) => c.email.toLowerCase() === emailUsado.toLowerCase() && c.senha === senhaUsada,
        );

      if (contaDemo) {
        if (contaDemo.tipo === 'equipe' && contaDemo.perfilInterno) {
          aoAutenticar({
            tipo: 'equipe',
            nome: contaDemo.nome,
            email: contaDemo.email,
            perfilInterno: contaDemo.perfilInterno,
          });
          return;
        }
        aoAutenticar({
          tipo: 'cliente',
          contexto: {
            vinculo_id: `vinc-${contaDemo.id}`,
            empresa_id: `emp-${contaDemo.id}`,
            empresa_nome: contaDemo.empresa ?? 'Metalforte Indústria',
            perfil: 'gestor_empresa',
            cargo: contaDemo.cargo ?? 'Gestor(a) de Projetos',
            origem: 'demonstracao',
            usuario_nome: contaDemo.nome,
            usuario_email: contaDemo.email,
            aceite_privacidade_em: new Date().toISOString(),
            versao_aviso_privacidade: '2026-08-28-v1',
          },
        });
        return;
      }

      setErro('Credenciais inválidas. Verifique o e-mail/senha ou escolha uma conta de homologação.');
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
            🔒 ACESSO PROTEGIDO · HOMOLOGAÇÃO
          </Text>
        </View>

        <Text style={estilosComuns.tituloSecao}>
          {modoRecuperacao ? 'Recuperar senha' : 'Entrar no Portal de Metrologia'}
        </Text>
        <Text style={[estilosComuns.paragrafo, { marginBottom: 14 }]}>
          {modoRecuperacao
            ? 'Informe seu e-mail para receber um link seguro de redefinição.'
            : 'Clientes acompanham propostas, etapas e mensagens. A equipe interna opera solicitações, orçamentos, execução, conhecimento e o Chatbot Interno.'}
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

      {/* Contas Rápidas de Homologação (Documentadas no README) */}
      <View style={estilosComuns.cartao}>
        <Text style={estilosComuns.sobrelinha}>AVALIAÇÃO RÁPIDA · 1 TOQUE</Text>
        <Text style={estilosComuns.tituloSecao}>Contas de Homologação</Text>
        <Text style={[estilosComuns.paragrafo, { marginBottom: 12 }]}>
          Toque em um perfil abaixo para entrar imediatamente e avaliar as permissões de Equipe ou Cliente:
        </Text>

        <Text style={[estilosComuns.label, { marginBottom: 6 }]}>Equipe do Laboratório SENAI:</Text>
        {CONTAS_HOMOLOGACAO_DEMO.filter((c) => c.tipo === 'equipe').map((conta) => (
          <TouchableOpacity
            key={conta.id}
            style={styles.contaCard}
            onPress={() => {
              setEmail(conta.email);
              setSenha(conta.senha);
              void realizarLogin(conta);
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.contaNome}>
                {conta.nome} · <Text style={{ color: CORES.azulPrincipal }}>{conta.papelRotulo}</Text>
              </Text>
              <Text style={styles.contaEmail}>{conta.email}</Text>
            </View>
            <Text style={styles.entrarSeta}>Entrar →</Text>
          </TouchableOpacity>
        ))}

        <Text style={[estilosComuns.label, { marginTop: 12, marginBottom: 6 }]}>
          Contas de Clientes (Empresas):
        </Text>
        {CONTAS_HOMOLOGACAO_DEMO.filter((c) => c.tipo === 'cliente').map((conta) => (
          <TouchableOpacity
            key={conta.id}
            style={styles.contaCard}
            onPress={() => {
              setEmail(conta.email);
              setSenha(conta.senha);
              void realizarLogin(conta);
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.contaNome}>
                {conta.nome} · <Text style={{ color: CORES.verde }}>{conta.papelRotulo}</Text>
              </Text>
              <Text style={styles.contaEmail}>{conta.email}</Text>
            </View>
            <Text style={styles.entrarSeta}>Entrar →</Text>
          </TouchableOpacity>
        ))}
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
