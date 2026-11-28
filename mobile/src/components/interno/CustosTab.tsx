import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { formatarDinheiro } from '@lib/calculos';
import { correspondeBusca, formatosDataParaBusca } from '@lib/busca-e-filtros';
import type { PerfilInterno } from '@lib/contratos';
import { dataPosterior, normalizarCustoHora, podeVersionarCustos } from '@lib/custos-equipamento';
import { CORES, estilosComuns } from '../../theme';

export type EquipamentoDb = {
  id: string;
  codigo: string;
  nome: string;
  ativo: boolean;
};

export type CustoEquipamentoDb = {
  id: string;
  equipamento_id: string;
  custo_hora: string | number;
  vigente_desde: string;
  vigente_ate: string | null;
};

export function CustosTab({
  perfil,
  equipamentosDb,
  custosDb,
  aoSalvarNovoCusto,
  aoAlternarAtivoEquipamento,
}: {
  perfil: PerfilInterno;
  equipamentosDb: EquipamentoDb[];
  custosDb: CustoEquipamentoDb[];
  aoSalvarNovoCusto: (params: {
    equipamentoId: string;
    novoCusto: string;
    vigencia: string;
    referencia: string;
  }) => Promise<boolean>;
  aoAlternarAtivoEquipamento: (equipamentoId: string, novoAtivo: boolean) => Promise<void>;
}) {
  const [busca, setBusca] = useState('');
  const [filtroAtivo, setFiltroAtivo] = useState<'todos' | 'ativos' | 'inativos'>('todos');
  const [ordenacao, setOrdenacao] = useState<'nome' | 'maior_custo' | 'menor_custo'>('nome');
  const [abertoId, setAbertoId] = useState<string>('');
  const [novoCusto, setNovoCusto] = useState('');
  const [referencia, setReferencia] = useState('');
  const [erroLocal, setErroLocal] = useState('');
  const [salvando, setSalvando] = useState(false);

  const custosVigentes = useMemo(() => {
    const mapa = new Map<string, CustoEquipamentoDb>();
    for (const c of custosDb) {
      if (c.vigente_ate === null && !mapa.has(c.equipamento_id)) {
        mapa.set(c.equipamento_id, c);
      }
    }
    return mapa;
  }, [custosDb]);

  const equipamentosVisiveis = useMemo(() => {
    return equipamentosDb
      .filter((eq) => {
        if (filtroAtivo === 'ativos' && !eq.ativo) return false;
        if (filtroAtivo === 'inativos' && eq.ativo) return false;
        const custo = custosVigentes.get(eq.id);
        return correspondeBusca(
          busca,
          eq.nome,
          eq.codigo,
          custo?.custo_hora,
          formatosDataParaBusca(custo?.vigente_desde),
        );
      })
      .sort((a, b) => {
        const cA = Number(custosVigentes.get(a.id)?.custo_hora ?? 0);
        const cB = Number(custosVigentes.get(b.id)?.custo_hora ?? 0);
        if (ordenacao === 'maior_custo') return cB - cA;
        if (ordenacao === 'menor_custo') return cA - cB;
        return a.nome.localeCompare(b.nome, 'pt-BR');
      });
  }, [busca, custosVigentes, equipamentosDb, filtroAtivo, ordenacao]);

  const podeEditar = podeVersionarCustos(perfil);
  const ehAdmin = perfil === 'administrador';

  return (
    <View>
      <View style={styles.gradeKpis}>
        {[
          { rotulo: 'Todas', valor: equipamentosDb.length, id: 'todos' as const },
          { rotulo: 'Ativas', valor: equipamentosDb.filter((e) => e.ativo).length, id: 'ativos' as const },
          { rotulo: 'Inativas', valor: equipamentosDb.filter((e) => !e.ativo).length, id: 'inativos' as const },
        ].map((k) => (
          <TouchableOpacity
            key={k.rotulo}
            style={[
              styles.cardKpi,
              filtroAtivo === k.id && { borderColor: CORES.azulPrincipal, borderWidth: 2 },
            ]}
            onPress={() => setFiltroAtivo(k.id)}
          >
            <Text style={styles.kpiValor}>{k.valor}</Text>
            <Text style={styles.kpiRotulo}>{k.rotulo}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={estilosComuns.card}>
        <View style={estilosComuns.linhaEntre}>
          <Text style={estilosComuns.tituloSecao}>
            Custos ({equipamentosVisiveis.length}/{equipamentosDb.length})
          </Text>
          {(busca || filtroAtivo !== 'todos') && (
            <TouchableOpacity
              onPress={() => {
                setBusca('');
                setFiltroAtivo('todos');
              }}
            >
              <Text style={styles.linkLimpar}>Limpar filtros</Text>
            </TouchableOpacity>
          )}
        </View>
        <TextInput
          style={[estilosComuns.input, { marginTop: 8 }]}
          value={busca}
          onChangeText={setBusca}
          placeholder="Buscar máquina, código, valor ou data..."
          placeholderTextColor={CORES.textoSuave}
        />
        <View style={[estilosComuns.linha, { marginTop: 8, flexWrap: 'wrap' }]}>
          {([
            { id: 'todos', label: 'Todas' },
            { id: 'ativos', label: 'Ativas' },
            { id: 'inativos', label: 'Inativas' },
          ] as const).map((op) => (
            <TouchableOpacity
              key={op.id}
              style={[
                estilosComuns.chip,
                filtroAtivo === op.id && estilosComuns.chipAtivo,
                { marginRight: 6 },
              ]}
              onPress={() => setFiltroAtivo(op.id)}
            >
              <Text style={[estilosComuns.chipTexto, filtroAtivo === op.id && estilosComuns.chipTextoAtivo]}>
                {op.label}
              </Text>
            </TouchableOpacity>
          ))}
          {([
            { id: 'nome', label: 'A–Z' },
            { id: 'maior_custo', label: 'Maior R$/h' },
            { id: 'menor_custo', label: 'Menor R$/h' },
          ] as const).map((ord) => (
            <TouchableOpacity
              key={ord.id}
              style={[
                estilosComuns.chip,
                ordenacao === ord.id && estilosComuns.chipAtivo,
                { marginRight: 6 },
              ]}
              onPress={() => setOrdenacao(ord.id)}
            >
              <Text style={[estilosComuns.chipTexto, ordenacao === ord.id && estilosComuns.chipTextoAtivo]}>
                {ord.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {equipamentosVisiveis.map((eq) => {
        const custo = custosVigentes.get(eq.id);
        const aberto = abertoId === eq.id;
        return (
          <View
            key={eq.id}
            style={[
              estilosComuns.card,
              aberto && { borderColor: CORES.azulPrincipal, borderWidth: 2 },
            ]}
          >
            <TouchableOpacity
              onPress={() => {
                setErroLocal('');
                setNovoCusto('');
                setReferencia('');
                setAbertoId((atual) => (atual === eq.id ? '' : eq.id));
              }}
            >
              <View style={estilosComuns.linhaEntre}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.nomeMaquina}>
                    {eq.nome} {!eq.ativo ? '• (INATIVA)' : ''}
                  </Text>
                  <Text style={styles.metaMaquina}>
                    {eq.codigo} {custo ? `• Vigente desde ${custo.vigente_desde}` : ''}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.valorCusto}>
                    {custo ? `${formatarDinheiro(Number(custo.custo_hora))}/h` : 'Sem vigência'}
                  </Text>
                  {podeEditar ? (
                    <Text style={styles.acaoEditar}>
                      {aberto ? '▾ Fechar' : '▸ Editar custo'}
                    </Text>
                  ) : null}
                </View>
              </View>
            </TouchableOpacity>

            {/* Menu inline logo abaixo do equipamento selecionado */}
            {aberto && podeEditar ? (
              <View style={styles.menuInline}>
                {erroLocal ? <Text style={styles.erroTexto}>{erroLocal}</Text> : null}
                <Text style={estilosComuns.rotuloCampo}>Novo custo-hora (R$)</Text>
                <TextInput
                  style={estilosComuns.input}
                  keyboardType="numeric"
                  value={novoCusto}
                  onChangeText={setNovoCusto}
                  placeholder="Ex: 245.00"
                />
                <Text style={[estilosComuns.rotuloCampo, { marginTop: 8 }]}>
                  Referência / justificativa
                </Text>
                <TextInput
                  style={estilosComuns.input}
                  value={referencia}
                  onChangeText={setReferencia}
                  placeholder="Ex: Reajuste calibração anual"
                />
                <TouchableOpacity
                  style={[estilosComuns.botaoPrimario, { marginTop: 10 }]}
                  disabled={salvando}
                  onPress={async () => {
                    const norm = normalizarCustoHora(novoCusto);
                    if (!norm) {
                      setErroLocal('Informe um custo-hora numérico válido.');
                      return;
                    }
                    if (!referencia.trim()) {
                      setErroLocal('Informe a referência desta atualização.');
                      return;
                    }
                    setErroLocal('');
                    setSalvando(true);
                    const hoje = new Date().toISOString().slice(0, 10);
                    const min = custo ? dataPosterior(custo.vigente_desde) : hoje;
                    const vigencia = hoje < min ? min : hoje;
                    try {
                      const ok = await aoSalvarNovoCusto({
                        equipamentoId: eq.id,
                        novoCusto: norm,
                        vigencia,
                        referencia: referencia.trim(),
                      });
                      if (ok) {
                        setAbertoId('');
                        setNovoCusto('');
                        setReferencia('');
                      }
                    } finally {
                      setSalvando(false);
                    }
                  }}
                >
                  <Text style={estilosComuns.textoBotaoPrimario}>
                    {salvando ? 'Salvando...' : 'Salvar Nova Vigência'}
                  </Text>
                </TouchableOpacity>
                {ehAdmin ? (
                  <TouchableOpacity
                    style={[estilosComuns.botaoSecundario, { marginTop: 8 }]}
                    disabled={salvando}
                    onPress={async () => {
                      setSalvando(true);
                      try {
                        await aoAlternarAtivoEquipamento(eq.id, !eq.ativo);
                      } finally {
                        setSalvando(false);
                      }
                    }}
                  >
                    <Text style={estilosComuns.textoBotaoSecundario}>
                      {eq.ativo ? 'Desativar Máquina' : 'Ativar Máquina'}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  gradeKpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  cardKpi: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: CORES.branco,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: CORES.borda,
  },
  kpiValor: { fontSize: 18, fontWeight: '900', color: CORES.azulEscuro },
  kpiRotulo: { fontSize: 11, fontWeight: '700', color: CORES.textoSecundario, marginTop: 2 },
  linkLimpar: { fontSize: 12, fontWeight: '800', color: CORES.vermelho },
  nomeMaquina: { fontSize: 14, fontWeight: '800', color: CORES.azulEscuro },
  metaMaquina: { fontSize: 11.5, color: CORES.textoSecundario, marginTop: 2 },
  valorCusto: { fontSize: 14, fontWeight: '900', color: CORES.azulPrincipal },
  acaoEditar: { fontSize: 11.5, fontWeight: '800', color: CORES.azulPrincipal, marginTop: 4 },
  menuInline: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: CORES.borda,
  },
  erroTexto: { fontSize: 12, fontWeight: '700', color: CORES.vermelho, marginBottom: 6 },
});
