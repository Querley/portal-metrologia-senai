import React, { useState } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, View } from 'react-native';
import { ClientAreaScreen } from './src/screens/ClientAreaScreen';
import { InternalLabScreen } from './src/screens/InternalLabScreen';
import { LoginScreen, type SessaoMobile } from './src/screens/LoginScreen';
import { PublicAreaScreen } from './src/screens/PublicAreaScreen';
import { obterSupabaseMobile } from './src/supabase';
import { CORES } from './src/theme';

type RotaRaizMobile = 'publico' | 'login' | 'cliente' | 'interno';

export default function App() {
  const [rota, setRota] = useState<RotaRaizMobile>('publico');
  const [sessao, setSessao] = useState<SessaoMobile | null>(null);

  function aoAutenticar(novaSessao: SessaoMobile) {
    setSessao(novaSessao);
    if (novaSessao.tipo === 'equipe') {
      setRota('interno');
    } else {
      setRota('cliente');
    }
  }

  async function encerrarSessao() {
    const supabase = obterSupabaseMobile();
    if (supabase) {
      await supabase.auth.signOut().catch(() => undefined);
    }
    setSessao(null);
    setRota('publico');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={CORES.azulEscuro} />
      <View style={styles.container}>
        {rota === 'publico' && (
          <PublicAreaScreen aoIrParaLogin={() => setRota('login')} />
        )}

        {rota === 'login' && (
          <LoginScreen
            aoAutenticar={aoAutenticar}
            aoVoltarPublico={() => setRota('publico')}
          />
        )}

        {rota === 'cliente' && sessao?.tipo === 'cliente' && (
          <ClientAreaScreen
            contexto={sessao.contexto}
            aoSair={() => void encerrarSessao()}
          />
        )}

        {rota === 'interno' && sessao?.tipo === 'equipe' && (
          <InternalLabScreen
            nomeUsuario={sessao.nome}
            emailUsuario={sessao.email}
            perfilInicial={sessao.perfilInterno}
            aoSair={() => void encerrarSessao()}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: CORES.azulEscuro,
  },
  container: {
    flex: 1,
    backgroundColor: CORES.fundoClaro,
  },
});
