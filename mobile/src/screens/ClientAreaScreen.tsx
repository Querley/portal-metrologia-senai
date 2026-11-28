import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  caminhoAnexoSolicitacao,
  tipoMimeArmazenado,
  validarAnexosSolicitacao,
} from '@lib/anexos-solicitacao';
import { correspondeBusca, formatosDataParaBusca } from '@lib/busca-e-filtros';
import { formatarDinheiro } from '@lib/calculos';
import { MATERIAIS_PECA } from '@lib/campos-padronizados';
import {
  mensagensClienteDemonstracao,
  normalizarMotivoRecusa,
  podeAceitarPreProposta,
  podeRecusarPreProposta,
  protocoloSolicitacaoCliente,
  situacaoEtapasCliente,
  solicitacoesClienteDemonstracao,
  tituloServicoCliente,
  VERSAO_DECLARACAO_ACEITE_PRE_PROPOSTA,
  type ContextoCliente,
  type MensagemCliente,
  type SolicitacaoCliente,
} from '@lib/portal-cliente';
import { necessidadesCliente } from '@lib/solicitacao';
import { obterSupabaseMobile } from '../supabase';
import { CORES, estilosComuns } from '../theme';

function normalizarPrazoServicoParaDataIso(valor: string): string {
  const limpo = valor.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(limpo)) return limpo;
  const br = limpo.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  const dias = Number(limpo);
  if (Number.isFinite(dias) && dias >= 0 && dias <= 3650 && limpo !== '') {
    return new Date(Date.now() + Math.round(dias) * 86_400_000).toISOString().slice(0, 10);
  }
  return new Date(Date.now() + 15 * 86_400_000).toISOString().slice(0, 10);
}

export function ClientAreaScreen({
  contexto,
  aoSair,
}: {
  contexto: ContextoCliente;
  aoSair: () => void;
}) {
  const [trabalhos, setTrabalhos] = useState<SolicitacaoCliente[]>(solicitacoesClienteDemonstracao);
  const [selecionadoId, setSelecionadoId] = useState<string>(
    solicitacoesClienteDemonstracao[0]?.id ?? '',
  );
  const [mensagens, setMensagens] = useState<MensagemCliente[]>(mensagensClienteDemonstracao);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [recusando, setRecusando] = useState(false);
  const [motivoRecusa, setMotivoRecusa] = useState('');
  const [buscaTrabalho, setBuscaTrabalho] = useState('');
  const [filtroTrabalho, setFiltroTrabalho] = useState<
    'todos' | 'publicada' | 'em_execucao' | 'concluido' | 'em_analise'
  >('todos');
  const [ordenacaoTrabalho, setOrdenacaoTrabalho] = useState<'recentes' | 'antigas'>('recentes');
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [novaNecessidade, setNovaNecessidade] = useState<string>(necessidadesCliente[0].valor);
  const [novoMaterial, setNovoMaterial] = useState<string>(MATERIAIS_PECA[0]);
  const [novaQtd, setNovaQtd] = useState('2');
  const [novoPrazoPagto, setNovoPrazoPagto] = useState('30');
  const [novoPrazoServico, setNovoPrazoServico] = useState(() =>
    new Date(Date.now() + 15 * 86_400_000).toISOString().slice(0, 10),
  );
  const [novaDescricao, setNovaDescricao] = useState('');
  const [arquivosNovoTrabalho, setArquivosNovoTrabalho] = useState<File[]>([]);
  const [aviso, setAviso] = useState('');
  const [erro, setErro] = useState('');

  const carregarDadosCliente = useCallback(async () => {
    const supabase = obterSupabaseMobile();
    if (!supabase) return;
    const { data, error } = await supabase.rpc('listar_portal_cliente');
    if (!error && Array.isArray(data) && data.length > 0) {
      const lista = data as SolicitacaoCliente[];
      setTrabalhos(lista);
      setSelecionadoId((atual) => (lista.some((t) => t.id === atual) ? atual : lista[0].id));
    }
  }, []);

  useEffect(() => {
    void carregarDadosCliente();
  }, [carregarDadosCliente]);

  const trabalhosVisiveis = useMemo(() => {
    return trabalhos
      .filter((t) => {
        if (filtroTrabalho === 'publicada' && t.proposta_estado !== 'publicada') return false;
        if (filtroTrabalho === 'em_execucao' && t.execucao_estado !== 'em_execucao') return false;
        if (filtroTrabalho === 'concluido' && t.execucao_estado !== 'concluido') return false;
        if (
          filtroTrabalho === 'em_analise' &&
          (t.proposta_estado === 'publicada' || t.execucao_estado === 'em_execucao' || t.execucao_estado === 'concluido')
        ) {
          return false;
        }
        const nomesEtapas = (t.etapas ?? []).map((et) => et.titulo).join(' ');
        return correspondeBusca(
          buscaTrabalho,
          protocoloSolicitacaoCliente(t),
          t.codigo,
          tituloServicoCliente(t.servico),
          t.servico,
          t.material,
          t.descricao,
          t.estado,
          t.proposta_estado,
          t.execucao_estado,
          nomesEtapas,
          formatosDataParaBusca(t.criada_em),
        );
      })
      .sort((a, b) =>
        ordenacaoTrabalho === 'antigas'
          ? +new Date(a.criada_em) - +new Date(b.criada_em)
          : +new Date(b.criada_em) - +new Date(a.criada_em),
      );
  }, [buscaTrabalho, filtroTrabalho, ordenacaoTrabalho, trabalhos]);

  const trabalhoAtivo =
    trabalhosVisiveis.find((t) => t.id === selecionadoId) ?? trabalhosVisiveis[0] ?? trabalhos[0];

  const carregarMensagensCliente = useCallback(async (solicitacaoId: string) => {
    const supabase = obterSupabaseMobile();
    if (!supabase || !solicitacaoId) return;
    const { data, error } = await supabase.rpc('listar_mensagens_cliente', {
      solicitacao: solicitacaoId,
    });
    if (!error && Array.isArray(data)) {
      setMensagens(data as MensagemCliente[]);
    }
    void supabase.rpc('marcar_conversa_lida_demonstrativa', { solicitacao: solicitacaoId });
  }, []);

  useEffect(() => {
    if (!trabalhoAtivo) return;
    void carregarMensagensCliente(trabalhoAtivo.id);
  }, [trabalhoAtivo, carregarMensagensCliente]);

  async function aceitarPreProposta() {
    if (!trabalhoAtivo) return;
    setErro('');
    const supabase = obterSupabaseMobile();
    if (supabase) {
      await supabase.rpc('aceitar_pre_proposta_cliente', {
        solicitacao: trabalhoAtivo.id,
        versao_declaracao: VERSAO_DECLARACAO_ACEITE_PRE_PROPOSTA,
      });
    }
    const agora = new Date().toISOString();
    setTrabalhos((atuais) =>
      atuais.map((item) =>
        item.id === trabalhoAtivo.id
          ? { ...item, proposta_estado: 'aceita', aceita_em: agora }
          : item,
      ),
    );
    setAviso('Pré-proposta aceita! O Administrador foi notificado para iniciar a execução.');
  }

  async function confirmarRecusa() {
    if (!trabalhoAtivo) return;
    const motivoNormalizado = normalizarMotivoRecusa(motivoRecusa);
    if (!motivoNormalizado) {
      setErro('Descreva o ajuste necessário em pelo menos 5 caracteres.');
      return;
    }
    setErro('');
    const supabase = obterSupabaseMobile();
    if (supabase) {
      await supabase.rpc('recusar_pre_proposta_cliente', {
        solicitacao: trabalhoAtivo.id,
        motivo: motivoNormalizado,
      });
    }
    const agora = new Date().toISOString();
    setTrabalhos((atuais) =>
      atuais.map((item) =>
        item.id === trabalhoAtivo.id
          ? {
              ...item,
              proposta_estado: 'recusada',
              recusada_em: agora,
              recusa_motivo: motivoNormalizado,
            }
          : item,
      ),
    );
    setRecusando(false);
    setMotivoRecusa('');
    setAviso('Revisão solicitada! A equipe do laboratório recebeu sua justificativa.');
  }

  async function enviarMensagemCliente() {
    const texto = novaMensagem.trim();
    if (!texto || !trabalhoAtivo) return;
    setErro('');
    const supabase = obterSupabaseMobile();
    if (!supabase) {
      setErro('Sem conexão com o Supabase.');
      return;
    }
    const { error } = await supabase.rpc('enviar_mensagem_cliente', {
      solicitacao: trabalhoAtivo.id,
      conteudo: texto,
    });
    if (error) {
      setErro(
        /failed to fetch|network/i.test(error.message)
          ? 'Sem conexão com o Supabase.'
          : `Erro ao enviar mensagem: ${error.message}`,
      );
      return;
    }
    setNovaMensagem('');
    await carregarMensagensCliente(trabalhoAtivo.id);
  }

  function selecionarArquivosWeb() {
    if (typeof document === 'undefined') {
      setAviso('Seleção de arquivos disponível no navegador (no Android nativo usará o seletor do sistema).');
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.pdf,.step,.stp,.iges,.igs,.png,.jpg,.jpeg';
    input.onchange = () => {
      const lista = Array.from(input.files ?? []);
      if (lista.length > 0) setArquivosNovoTrabalho((atuais) => [...atuais, ...lista]);
    };
    input.click();
  }

  async function registrarNovoTrabalho() {
    if (novaDescricao.trim().length < 10) {
      setErro('Descreva o desafio técnico em pelo menos 10 caracteres.');
      return;
    }
    setErro('');
    const supabase = obterSupabaseMobile();
    if (!supabase) {
      setErro('Sem conexão com o Supabase.');
      return;
    }
    const falhaArquivos = validarAnexosSolicitacao(arquivosNovoTrabalho);
    if (falhaArquivos) {
      setErro(falhaArquivos);
      return;
    }

    const payload = {
      telefone: '',
      necessidade: novaNecessidade,
      necessidade_personalizada: '',
      material: novoMaterial,
      quantidade: Math.max(1, Number(novaQtd) || 1),
      prazo_servico: normalizarPrazoServicoParaDataIso(novoPrazoServico),
      prazo_pagamento_dias: Math.max(1, Number(novoPrazoPagto) || 30),
      descricao: novaDescricao.trim(),
    };
    const { data, error } = await supabase.rpc('criar_solicitacao_cliente_demonstrativa', {
      payload,
    });
    const resultado = data as { solicitacao_id?: string; codigo?: number; protocolo?: string } | null;
    if (error || !resultado?.solicitacao_id) {
      setErro(error?.message ?? 'Não foi possível registrar o novo trabalho.');
      return;
    }

    const falharam: string[] = [];
    for (const arquivo of arquivosNovoTrabalho) {
      const tipo = tipoMimeArmazenado(arquivo);
      if (!tipo) {
        falharam.push(arquivo.name);
        continue;
      }
      const caminho = caminhoAnexoSolicitacao(resultado.solicitacao_id, arquivo);
      const up = await supabase.storage
        .from('solicitacoes')
        .upload(caminho, arquivo, { contentType: tipo, upsert: false });
      if (up.error) {
        falharam.push(arquivo.name);
        continue;
      }
      const reg = await supabase.rpc('registrar_anexo_solicitacao_cliente_demonstrativa', {
        solicitacao: resultado.solicitacao_id,
        caminho,
        nome_original: arquivo.name,
        tipo_mime: tipo,
        tamanho_bytes: arquivo.size,
      });
      if (reg.error) {
        await supabase.storage.from('solicitacoes').remove([caminho]);
        falharam.push(arquivo.name);
      }
    }

    setArquivosNovoTrabalho([]);
    setNovaDescricao('');
    setModalNovoAberto(false);
    await carregarDadosCliente();
    if (falharam.length > 0) {
      setAviso(
        `Solicitação ${resultado.protocolo ?? ''} criada, mas ${falharam.length} arquivo(s) falharam no envio: ${falharam.join(', ')}.`,
      );
    } else {
      setAviso(`Solicitação ${resultado.protocolo ?? ''} registrada com sucesso!`);
    }
  }

  const situacaoEtapas = trabalhoAtivo
    ? situacaoEtapasCliente(trabalhoAtivo.etapas, trabalhoAtivo.execucao_estado)
    : null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Cabeçalho da Empresa e Usuário */}
      <View style={styles.topoCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.topoBadge}>ÁREA DO CLIENTE · VÍNCULO APROVADO</Text>
          <Text style={styles.topoEmpresa}>{contexto.empresa_nome}</Text>
          <Text style={styles.topoUsuario}>
            {contexto.usuario_nome} ({contexto.cargo || 'Gestor(a)'}) · {contexto.usuario_email}
          </Text>
        </View>
        <TouchableOpacity style={styles.sairBtn} onPress={aoSair}>
          <Text style={styles.sairTexto}>Sair</Text>
        </TouchableOpacity>
      </View>

      {aviso ? (
        <View style={styles.avisoBox}>
          <Text style={styles.avisoTexto}>{aviso}</Text>
        </View>
      ) : null}

      {erro ? (
        <View style={styles.erroBox}>
          <Text style={styles.erroTexto}>{erro}</Text>
        </View>
      ) : null}

      {/* Indicadores Clicáveis (aplicam filtro) + Botão Novo Trabalho */}
      <View style={styles.kpisRow}>
        <TouchableOpacity
          style={[styles.kpiItem, filtroTrabalho === 'todos' && { borderColor: CORES.azulPrincipal, borderWidth: 2 }]}
          onPress={() => setFiltroTrabalho('todos')}
        >
          <Text style={styles.kpiNumero}>{trabalhos.length}</Text>
          <Text style={styles.kpiRotulo}>Todos</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.kpiItem, filtroTrabalho === 'publicada' && { borderColor: CORES.azulPrincipal, borderWidth: 2 }]}
          onPress={() => setFiltroTrabalho('publicada')}
        >
          <Text style={styles.kpiNumero}>
            {trabalhos.filter((t) => t.proposta_estado === 'publicada').length}
          </Text>
          <Text style={styles.kpiRotulo}>Aguardando aceite</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.kpiItem, filtroTrabalho === 'em_execucao' && { borderColor: CORES.azulPrincipal, borderWidth: 2 }]}
          onPress={() => setFiltroTrabalho('em_execucao')}
        >
          <Text style={styles.kpiNumero}>
            {trabalhos.filter((t) => t.execucao_estado === 'em_execucao').length}
          </Text>
          <Text style={styles.kpiRotulo}>Em execução</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.kpiItem, { backgroundColor: CORES.azulPrincipal }]}
          onPress={() => setModalNovoAberto(true)}
        >
          <Text style={[styles.kpiNumero, { color: '#fff' }]}>+ Novo</Text>
          <Text style={[styles.kpiRotulo, { color: '#dceef6' }]}>Registrar trabalho</Text>
        </TouchableOpacity>
      </View>

      {/* Busca, Filtros e Seletor de Trabalhos da Empresa */}
      <View style={estilosComuns.cartao}>
        <View style={estilosComuns.linhaEntre}>
          <Text style={estilosComuns.sobrelinha}>
            TRABALHOS ({trabalhosVisiveis.length}/{trabalhos.length})
          </Text>
          {(buscaTrabalho || filtroTrabalho !== 'todos') && (
            <TouchableOpacity
              onPress={() => {
                setBuscaTrabalho('');
                setFiltroTrabalho('todos');
              }}
            >
              <Text style={{ fontSize: 11.5, fontWeight: '800', color: CORES.vermelho }}>
                Limpar filtros
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <TextInput
          style={[estilosComuns.input, { marginTop: 6 }]}
          value={buscaTrabalho}
          onChangeText={setBuscaTrabalho}
          placeholder="Buscar protocolo, serviço, material, etapa ou data..."
          placeholderTextColor={CORES.textoSuave}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'publicada', label: 'Aguardando aceite' },
            { id: 'em_execucao', label: 'Em execução' },
            { id: 'concluido', label: 'Concluídos' },
            { id: 'em_analise', label: 'Em análise' },
          ].map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[styles.chipOpcao, filtroTrabalho === f.id && styles.chipOpcaoAtiva]}
              onPress={() => setFiltroTrabalho(f.id as typeof filtroTrabalho)}
            >
              <Text style={[styles.chipOpcaoTexto, filtroTrabalho === f.id && { color: '#fff' }]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.chipOpcao}
            onPress={() =>
              setOrdenacaoTrabalho((o) => (o === 'recentes' ? 'antigas' : 'recentes'))
            }
          >
            <Text style={styles.chipOpcaoTexto}>
              {ordenacaoTrabalho === 'recentes' ? '↓ Mais novos' : '↑ Mais antigos'}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
          {trabalhosVisiveis.map((item) => {
            const ativo = item.id === trabalhoAtivo?.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.cardSeletorTrabalho, ativo && styles.cardSeletorTrabalhoAtivo]}
                onPress={() => setSelecionadoId(item.id)}
              >
                <Text style={[styles.protocoloTexto, ativo && { color: '#fff' }]}>
                  {protocoloSolicitacaoCliente(item)}
                </Text>
                <Text
                  style={[styles.servicoSeletorTexto, ativo && { color: '#fff' }]}
                  numberOfLines={1}
                >
                  {tituloServicoCliente(item.servico)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {trabalhoAtivo && (
        <>
          {/* Pré-proposta e Decisão do Cliente */}
          <View style={estilosComuns.cartao}>
            <Text style={estilosComuns.sobrelinha}>
              {protocoloSolicitacaoCliente(trabalhoAtivo)} · PRÉ-PROPOSTA DO LABORATÓRIO
            </Text>
            <Text style={estilosComuns.tituloSecao}>
              {tituloServicoCliente(trabalhoAtivo.servico)}
            </Text>
            {trabalhoAtivo.descricao ? (
              <Text style={[estilosComuns.paragrafo, { marginBottom: 10 }]}>
                {trabalhoAtivo.descricao}
              </Text>
            ) : null}

            <View style={styles.gradeResumoProposta}>
              <View style={styles.boxValorProposta}>
                <Text style={styles.rotuloBox}>Valor da pré-proposta</Text>
                <Text style={styles.valorBox}>
                  {trabalhoAtivo.valor_pre_proposta !== null
                    ? formatarDinheiro(trabalhoAtivo.valor_pre_proposta)
                    : 'Em elaboração'}
                </Text>
                <Text style={styles.detalheBox}>
                  Prazo de pagamento: {trabalhoAtivo.prazo_pagamento_dias ?? 30} dias
                </Text>
              </View>

              <View style={styles.boxValorProposta}>
                <Text style={styles.rotuloBox}>Andamento geral</Text>
                <Text style={styles.valorBox}>{situacaoEtapas?.titulo ?? 'Em análise'}</Text>
                <Text style={styles.detalheBox}>{situacaoEtapas?.descricao ?? ''}</Text>
              </View>
            </View>

            {podeAceitarPreProposta(trabalhoAtivo.proposta_estado) && (
              <View style={styles.decisaoBox}>
                <Text style={styles.decisaoTitulo}>Qual é sua decisão sobre esta pré-proposta?</Text>
                <Text style={estilosComuns.paragrafo}>
                  O aceite manifesta concordância com a pré-proposta técnica do laboratório para início após o trâmite institucional.
                </Text>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                  <TouchableOpacity
                    style={[estilosComuns.botaoPrimario, { flex: 1, backgroundColor: CORES.verde }]}
                    onPress={() => void aceitarPreProposta()}
                  >
                    <Text style={estilosComuns.botaoPrimarioTexto}>✓ Aceitar pré-proposta</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[estilosComuns.botaoSecundario, { flex: 1, borderColor: CORES.vermelho }]}
                    onPress={() => setRecusando(!recusando)}
                  >
                    <Text style={[estilosComuns.botaoSecundarioTexto, { color: CORES.vermelho }]}>
                      Recusar / Revisão
                    </Text>
                  </TouchableOpacity>
                </View>

                {recusando && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={estilosComuns.label}>O que precisa ser ajustado?</Text>
                    <TextInput
                      style={[estilosComuns.input, { minHeight: 70, textAlignVertical: 'top' }]}
                      value={motivoRecusa}
                      onChangeText={setMotivoRecusa}
                      multiline
                      placeholder="Informe prazo, escopo ou condição que precisa de revisão..."
                    />
                    <TouchableOpacity
                      style={[estilosComuns.botaoPrimario, { backgroundColor: CORES.vermelho }]}
                      onPress={() => void confirmarRecusa()}
                    >
                      <Text style={estilosComuns.botaoPrimarioTexto}>Confirmar recusa</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {trabalhoAtivo.proposta_estado === 'aceita' && (
              <View style={[styles.statusDecisaoBox, { backgroundColor: CORES.verdeClaro }]}>
                <Text style={{ color: CORES.verde, fontWeight: '800', fontSize: 13 }}>
                  ✓ Pré-proposta aceita pela empresa. Execução autorizada pelo laboratório.
                </Text>
              </View>
            )}

            {trabalhoAtivo.proposta_estado === 'recusada' && (
              <View style={[styles.statusDecisaoBox, { backgroundColor: CORES.vermelhoClaro }]}>
                <Text style={{ color: CORES.vermelho, fontWeight: '800', fontSize: 13 }}>
                  Revisão solicitada: &ldquo;{trabalhoAtivo.recusa_motivo}&rdquo;
                </Text>
              </View>
            )}
          </View>

          {/* Acompanhamento Visual das Etapas */}
          <View style={estilosComuns.cartao}>
            <Text style={estilosComuns.sobrelinha}>EXECUÇÃO TÉCNICA</Text>
            <Text style={estilosComuns.tituloSecao}>Etapas do serviço</Text>
            {trabalhoAtivo.etapas.length === 0 ? (
              <Text style={estilosComuns.paragrafo}>
                As etapas visuais serão iniciadas assim que a execução for confirmada pelo laboratório.
              </Text>
            ) : (
              trabalhoAtivo.etapas.map((etapa) => (
                <View key={etapa.id} style={styles.etapaRow}>
                  <View
                    style={[
                      styles.etapaIndicador,
                      etapa.estado === 'concluida'
                        ? { backgroundColor: CORES.verde }
                        : etapa.estado === 'em_andamento'
                          ? { backgroundColor: CORES.azulPrincipal }
                          : { backgroundColor: '#b9cbd4' },
                    ]}
                  >
                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 11 }}>
                      {etapa.ordem}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={styles.etapaTitulo}>{etapa.titulo}</Text>
                      <Text style={styles.etapaPercentual}>{etapa.progresso}%</Text>
                    </View>
                    {etapa.descricao ? (
                      <Text style={styles.etapaDescricao}>{etapa.descricao}</Text>
                    ) : null}
                    <View style={styles.barraTrilho}>
                      <View style={[styles.barraPreenchimento, { width: `${etapa.progresso}%` }]} />
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Mensagens Diretas com a Equipe do Laboratório */}
          <View style={estilosComuns.cartao}>
            <Text style={estilosComuns.sobrelinha}>COMUNICAÇÃO DIRETA COM A EQUIPE</Text>
            <Text style={estilosComuns.tituloSecao}>Mensagens da solicitação</Text>
            <View style={styles.mensagensContainer}>
              {mensagens.map((msg) => (
                <View
                  key={msg.id}
                  style={[
                    styles.bolhaMensagem,
                    msg.autor_proprio ? styles.bolhaPropria : styles.bolhaEquipe,
                  ]}
                >
                  <Text
                    style={
                      msg.autor_proprio ? styles.textoBolhaPropria : styles.textoBolhaEquipe
                    }
                  >
                    {msg.conteudo}
                  </Text>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <TextInput
                style={[estilosComuns.input, { flex: 1, marginTop: 0, marginBottom: 0 }]}
                value={novaMensagem}
                onChangeText={setNovaMensagem}
                placeholder="Escreva uma mensagem para a equipe técnica..."
              />
              <TouchableOpacity
                style={estilosComuns.botaoPrimario}
                onPress={() => void enviarMensagemCliente()}
              >
                <Text style={estilosComuns.botaoPrimarioTexto}>Enviar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}

      {/* Modal de Nova Solicitação Autenticada */}
      <Modal
        visible={modalNovoAberto}
        animationType="slide"
        transparent
        onRequestClose={() => setModalNovoAberto(false)}
      >
        <View style={styles.modalFundo}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitulo}>Registrar outra solicitação</Text>
              <TouchableOpacity onPress={() => setModalNovoAberto(false)}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <Text style={estilosComuns.label}>Tipo de necessidade</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
                {necessidadesCliente.map((op) => (
                  <TouchableOpacity
                    key={op.valor}
                    style={[
                      styles.chipOpcao,
                      novaNecessidade === op.valor && styles.chipOpcaoAtiva,
                    ]}
                    onPress={() => setNovaNecessidade(op.valor)}
                  >
                    <Text
                      style={[
                        styles.chipOpcaoTexto,
                        novaNecessidade === op.valor && { color: '#fff' },
                      ]}
                    >
                      {op.rotulo}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={estilosComuns.label}>Material da peça</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
                {MATERIAIS_PECA.map((mat) => (
                  <TouchableOpacity
                    key={mat}
                    style={[styles.chipOpcao, novoMaterial === mat && styles.chipOpcaoAtiva]}
                    onPress={() => setNovoMaterial(mat)}
                  >
                    <Text
                      style={[styles.chipOpcaoTexto, novoMaterial === mat && { color: '#fff' }]}
                    >
                      {mat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={estilosComuns.label}>Quantidade</Text>
                  <TextInput
                    style={estilosComuns.input}
                    value={novaQtd}
                    onChangeText={setNovaQtd}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={estilosComuns.label}>Prazo pagto (dias)</Text>
                  <TextInput
                    style={estilosComuns.input}
                    value={novoPrazoPagto}
                    onChangeText={setNovoPrazoPagto}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <Text style={estilosComuns.label}>Prazo desejado (AAAA-MM-DD ou nº de dias)</Text>
              <TextInput
                style={estilosComuns.input}
                value={novoPrazoServico}
                onChangeText={setNovoPrazoServico}
                placeholder="Ex: 2026-12-15 ou 15"
              />

              <Text style={estilosComuns.label}>Descreva o desafio técnico</Text>
              <TextInput
                style={[estilosComuns.input, { minHeight: 80, textAlignVertical: 'top' }]}
                value={novaDescricao}
                onChangeText={setNovaDescricao}
                multiline
                placeholder="Descreva a peça, tolerâncias e objetivo..."
              />

              <TouchableOpacity
                style={[estilosComuns.botaoSecundario, { marginBottom: 10 }]}
                onPress={selecionarArquivosWeb}
              >
                <Text style={estilosComuns.botaoSecundarioTexto}>
                  📎 Anexar PDF / CAD ({arquivosNovoTrabalho.length})
                </Text>
              </TouchableOpacity>
              {arquivosNovoTrabalho.map((arq, i) => (
                <Text key={`${arq.name}-${i}`} style={{ fontSize: 11.5, color: CORES.textoSecundario, marginBottom: 4 }}>
                  • {arq.name} ({(arq.size / 1024).toFixed(0)} KB)
                </Text>
              ))}

              <TouchableOpacity
                style={estilosComuns.botaoPrimario}
                onPress={() => void registrarNovoTrabalho()}
              >
                <Text style={estilosComuns.botaoPrimarioTexto}>Registrar novo trabalho</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 14, paddingBottom: 32 },
  topoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: CORES.azulEscuro,
    borderRadius: 10,
    padding: 15,
    marginBottom: 12,
  },
  topoBadge: { color: '#6fe1f5', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  topoEmpresa: { color: CORES.branco, fontSize: 18, fontWeight: '800', marginTop: 3 },
  topoUsuario: { color: '#cce4ef', fontSize: 11.5, marginTop: 2 },
  sairBtn: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
  },
  sairTexto: { color: '#fff', fontWeight: '800', fontSize: 12 },
  avisoBox: {
    backgroundColor: CORES.verdeClaro,
    padding: 11,
    borderRadius: 8,
    marginBottom: 12,
  },
  avisoTexto: { color: CORES.verde, fontWeight: '700', fontSize: 12.5 },
  erroBox: {
    backgroundColor: CORES.vermelhoClaro,
    padding: 11,
    borderRadius: 8,
    marginBottom: 12,
  },
  erroTexto: { color: CORES.vermelho, fontWeight: '700', fontSize: 12.5 },
  kpisRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  kpiItem: {
    flex: 1,
    backgroundColor: CORES.branco,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: 8,
    padding: 11,
  },
  kpiNumero: { fontSize: 18, fontWeight: '900', color: CORES.azulEscuro },
  kpiRotulo: { fontSize: 10.5, color: CORES.textoSecundario, marginTop: 2 },
  cardSeletorTrabalho: {
    backgroundColor: CORES.fundo,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: 8,
    paddingHorizontal: 13,
    paddingVertical: 10,
    marginRight: 8,
    minWidth: 170,
  },
  cardSeletorTrabalhoAtivo: {
    backgroundColor: CORES.azulPrincipal,
    borderColor: CORES.azulPrincipal,
  },
  protocoloTexto: { fontSize: 11, fontWeight: '900', color: CORES.azulPrincipal },
  servicoSeletorTexto: { fontSize: 12.5, fontWeight: '700', color: CORES.texto, marginTop: 2 },
  gradeResumoProposta: { flexDirection: 'row', gap: 10, marginTop: 8 },
  boxValorProposta: {
    flex: 1,
    backgroundColor: CORES.fundo,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: CORES.borda,
  },
  rotuloBox: { fontSize: 11, color: CORES.textoSecundario },
  valorBox: { fontSize: 16, fontWeight: '800', color: CORES.azulEscuro, marginTop: 4 },
  detalheBox: { fontSize: 11, color: CORES.textoSecundario, marginTop: 3 },
  decisaoBox: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: CORES.borda,
  },
  decisaoTitulo: { fontSize: 14, fontWeight: '800', color: CORES.azulEscuro, marginBottom: 4 },
  statusDecisaoBox: {
    marginTop: 12,
    padding: 11,
    borderRadius: 8,
  },
  etapaRow: {
    flexDirection: 'row',
    gap: 11,
    marginTop: 12,
    alignItems: 'flex-start',
  },
  etapaIndicador: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  etapaTitulo: { fontSize: 13.5, fontWeight: '800', color: CORES.azulEscuro },
  etapaPercentual: { fontSize: 12, fontWeight: '800', color: CORES.azulPrincipal },
  etapaDescricao: { fontSize: 12, color: CORES.textoSecundario, marginTop: 2 },
  barraTrilho: {
    height: 6,
    backgroundColor: '#e2ecf0',
    borderRadius: 99,
    marginTop: 6,
    overflow: 'hidden',
  },
  barraPreenchimento: {
    height: '100%',
    backgroundColor: CORES.ciano,
  },
  mensagensContainer: {
    backgroundColor: CORES.fundo,
    borderRadius: 8,
    padding: 10,
    gap: 8,
    marginTop: 6,
  },
  bolhaMensagem: {
    maxWidth: '88%',
    padding: 10,
    borderRadius: 8,
  },
  bolhaPropria: {
    alignSelf: 'flex-end',
    backgroundColor: CORES.cianoClaro,
    borderWidth: 1,
    borderColor: '#b3dce8',
  },
  bolhaEquipe: {
    alignSelf: 'flex-start',
    backgroundColor: CORES.branco,
    borderWidth: 1,
    borderColor: CORES.borda,
  },
  textoBolhaPropria: { color: CORES.azulEscuro, fontSize: 12.5 },
  textoBolhaEquipe: { color: CORES.texto, fontSize: 12.5 },
  modalFundo: {
    flex: 1,
    backgroundColor: 'rgba(3,25,38,0.72)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: CORES.branco,
    maxHeight: '85%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: CORES.azulEscuro,
    padding: 16,
  },
  modalTitulo: { color: '#fff', fontSize: 16, fontWeight: '800' },
  chipOpcao: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: CORES.borda,
    backgroundColor: CORES.fundo,
    marginRight: 8,
  },
  chipOpcaoAtiva: {
    backgroundColor: CORES.azulPrincipal,
    borderColor: CORES.azulPrincipal,
  },
  chipOpcaoTexto: { fontSize: 12, fontWeight: '700', color: CORES.texto },
});
