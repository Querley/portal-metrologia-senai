'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { BriefcaseBusiness, FileUp, Paperclip, Send, ShieldCheck, X } from 'lucide-react';
import { useState } from 'react';
import { caminhoAnexoSolicitacao, tipoMimeArmazenado, validarAnexosSolicitacao, type AnexoSolicitacaoCliente } from '../lib/anexos-solicitacao';
import { necessidadesCliente, prazosPagamento } from '../lib/solicitacao';

export type DadosNovaSolicitacaoCliente = {
  telefone: string;
  necessidade: string;
  necessidade_personalizada: string;
  material: string;
  quantidade: number;
  prazo_servico: string;
  prazo_pagamento_dias: number;
  descricao: string;
};

export type ResultadoNovaSolicitacao = {
  solicitacao_id: string;
  codigo: number;
  protocolo: string;
};

type Propriedades = {
  cliente?: SupabaseClient;
  demonstracao?: boolean;
  empresaNome: string;
  aoFechar: () => void;
  aoCriada: (resultado: ResultadoNovaSolicitacao, dados: DadosNovaSolicitacaoCliente, anexos: AnexoSolicitacaoCliente[]) => void | Promise<void>;
};

export function NovaSolicitacaoCliente({ cliente, demonstracao = false, empresaNome, aoFechar, aoCriada }: Propriedades) {
  const [necessidade, setNecessidade] = useState('');
  const [prazoPagamento, setPrazoPagamento] = useState('30');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [resultadoPendente, setResultadoPendente] = useState<ResultadoNovaSolicitacao | null>(null);
  const [dadosPendentes, setDadosPendentes] = useState<DadosNovaSolicitacaoCliente | null>(null);
  const [anexosEnviados, setAnexosEnviados] = useState<AnexoSolicitacaoCliente[]>([]);

  function selecionarArquivos(lista: FileList | null) {
    const proximos = [...arquivos, ...Array.from(lista ?? [])];
    if (anexosEnviados.length + proximos.length > 5) {
      setErro('Envie no máximo cinco arquivos por solicitação, incluindo os que já foram enviados.');
      return;
    }
    const falha = validarAnexosSolicitacao(proximos);
    if (falha) {
      setErro(falha);
      return;
    }
    setArquivos(proximos);
    setErro('');
  }

  async function armazenarArquivos(resultado: ResultadoNovaSolicitacao, lista: File[]) {
    if (demonstracao) {
      return {
        enviados: lista.map((arquivo, indice) => ({
          id: `demo-anexo-${Date.now()}-${indice}`,
          caminho_storage: `demonstracao/${resultado.solicitacao_id}/${arquivo.name}`,
          nome_original: arquivo.name,
          tipo_mime: tipoMimeArmazenado(arquivo) ?? 'application/octet-stream',
          tamanho_bytes: arquivo.size,
          criado_em: new Date().toISOString(),
        })),
        falharam: [] as File[],
      };
    }

    const enviados: AnexoSolicitacaoCliente[] = [];
    const falharam: File[] = [];
    for (const arquivo of lista) {
      const tipo = tipoMimeArmazenado(arquivo);
      if (!cliente || !tipo) {
        falharam.push(arquivo);
        continue;
      }
      const caminho = caminhoAnexoSolicitacao(resultado.solicitacao_id, arquivo);
      const { error: erroUpload } = await cliente.storage.from('solicitacoes').upload(caminho, arquivo, { contentType: tipo, upsert: false });
      if (erroUpload) {
        falharam.push(arquivo);
        continue;
      }
      const { data: anexoId, error: erroRegistro } = await cliente.rpc('registrar_anexo_solicitacao_cliente_demonstrativa', {
        solicitacao: resultado.solicitacao_id,
        caminho,
        nome_original: arquivo.name,
        tipo_mime: tipo,
        tamanho_bytes: arquivo.size,
      });
      if (erroRegistro || typeof anexoId !== 'string') {
        await cliente.storage.from('solicitacoes').remove([caminho]);
        falharam.push(arquivo);
        continue;
      }
      enviados.push({
        id: anexoId,
        caminho_storage: caminho,
        nome_original: arquivo.name,
        tipo_mime: tipo,
        tamanho_bytes: arquivo.size,
        criado_em: new Date().toISOString(),
      });
    }
    return { enviados, falharam };
  }

  async function concluirComArquivos(resultado: ResultadoNovaSolicitacao, dados: DadosNovaSolicitacaoCliente, anteriores: AnexoSolicitacaoCliente[]) {
    const { enviados, falharam } = await armazenarArquivos(resultado, arquivos);
    const todosEnviados = [...anteriores, ...enviados];
    if (falharam.length > 0) {
      setResultadoPendente(resultado);
      setDadosPendentes(dados);
      setAnexosEnviados(todosEnviados);
      setArquivos(falharam);
      setErro(`${resultado.protocolo} já foi criada, mas ${falharam.length} arquivo(s) não foram enviados. Tente novamente ou conclua sem eles.`);
      return false;
    }
    await aoCriada(resultado, dados, todosEnviados);
    return true;
  }

  async function cancelar() {
    if (resultadoPendente && dadosPendentes) await aoCriada(resultadoPendente, dadosPendentes, anexosEnviados);
    else aoFechar();
  }

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (resultadoPendente && dadosPendentes) {
      setEnviando(true);
      setErro('');
      await concluirComArquivos(resultadoPendente, dadosPendentes, anexosEnviados);
      setEnviando(false);
      return;
    }
    const formulario = new FormData(evento.currentTarget);
    const prazo = prazoPagamento === 'outro'
      ? Number(formulario.get('prazo-pagamento-outro'))
      : Number(prazoPagamento);
    const dados: DadosNovaSolicitacaoCliente = {
      telefone: String(formulario.get('telefone') ?? '').trim(),
      necessidade,
      necessidade_personalizada: String(formulario.get('necessidade-personalizada') ?? '').trim(),
      material: String(formulario.get('material') ?? '').trim(),
      quantidade: Number(formulario.get('quantidade')),
      prazo_servico: String(formulario.get('prazo') ?? ''),
      prazo_pagamento_dias: prazo,
      descricao: String(formulario.get('descricao') ?? '').trim(),
    };

    setEnviando(true);
    setErro('');
    const falhaArquivos = validarAnexosSolicitacao(arquivos);
    if (falhaArquivos) {
      setErro(falhaArquivos);
      setEnviando(false);
      return;
    }

    if (demonstracao) {
      const codigo = 285;
      await concluirComArquivos({ solicitacao_id: `demo-solicitacao-${Date.now()}`, codigo, protocolo: `DEM-SOL-${String(codigo).padStart(4, '0')}` }, dados, []);
      setEnviando(false);
      return;
    }

    if (!cliente) {
      setErro('A conexão protegida está indisponível. Atualize a página e tente novamente.');
      setEnviando(false);
      return;
    }

    const { data, error } = await cliente.rpc('criar_solicitacao_cliente_demonstrativa', { payload: dados });
    const resultado = data as ResultadoNovaSolicitacao | null;
    if (error || !resultado?.solicitacao_id || !resultado.protocolo) {
      setErro(error?.message ?? 'Não foi possível registrar o novo trabalho.');
      setEnviando(false);
      return;
    }

    await concluirComArquivos(resultado, dados, []);
    setEnviando(false);
  }

  return <div className="fundo-nova-solicitacao" role="presentation">
    <section className="nova-solicitacao-cliente" role="dialog" aria-modal="true" aria-labelledby="titulo-nova-solicitacao">
      <header>
        <div><span><BriefcaseBusiness size={18} /> NOVO TRABALHO</span><h2 id="titulo-nova-solicitacao">Registrar outra solicitação</h2><p>Este trabalho ficará vinculado a <strong>{empresaNome}</strong> e aparecerá imediatamente no seu acompanhamento.</p></div>
        <button type="button" onClick={aoFechar} aria-label="Fechar nova solicitação"><X size={20} /></button>
      </header>
      <div className="seguranca-nova-solicitacao"><ShieldCheck size={19} /><p>Seu perfil e sua empresa já foram confirmados. Não é necessário informar CNPJ nem ativar outra conta.</p></div>
      <form onSubmit={enviar}>
        <div className="grade-nova-solicitacao">
          <label>Tipo de necessidade<select required name="necessidade" value={necessidade} onChange={(evento) => setNecessidade(evento.target.value)}><option value="" disabled>Selecione</option>{necessidadesCliente.map((item) => <option value={item.valor} key={item.valor}>{item.rotulo}</option>)}</select></label>
          <label>Material da peça<input required name="material" minLength={2} maxLength={120} placeholder="Ex.: aço, alumínio, polímero" /></label>
          {(necessidade === 'outro' || necessidade === 'orientacao-tecnica') && <label className="campo-largo">Qual resultado você espera?<input required name="necessidade-personalizada" maxLength={500} placeholder="Ex.: modelo STEP, relatório dimensional ou investigação de falha" /></label>}
          <label>Quantidade<input required name="quantidade" type="number" min="1" max="100000" defaultValue="1" /></label>
          <label>Prazo desejado para o serviço<input required name="prazo" type="date" min={new Date().toISOString().slice(0, 10)} /></label>
          <label>Prazo de pagamento desejado<select required name="prazo-pagamento" value={prazoPagamento} onChange={(evento) => setPrazoPagamento(evento.target.value)}>{prazosPagamento.map((dias) => <option key={dias} value={dias}>{dias} dias</option>)}<option value="outro">Outro prazo</option></select></label>
          <label>Telefone para este trabalho <small>(opcional)</small><input name="telefone" type="tel" minLength={8} maxLength={30} /></label>
          {prazoPagamento === 'outro' && <label>Prazo em dias<input required name="prazo-pagamento-outro" type="number" min="1" max="365" /></label>}
          <label className="campo-largo">Descreva o desafio<textarea required name="descricao" minLength={10} maxLength={5000} rows={5} placeholder="Inclua dimensões, tolerâncias, finalidade, pontos críticos e o entregável esperado." /></label>
          <div className="campo-largo anexos-nova-solicitacao">
            <label className="seletor-anexos-cliente"><FileUp size={22} /><span><strong>Adicionar imagens ou outros arquivos</strong><small>Até 5 arquivos. PDF e imagens: 10 MB cada. CAD: 50 MB cada.</small></span><input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,.step,.stp,.iges,.igs,.stl,.obj,.dxf,.dwg" onChange={(evento) => { selecionarArquivos(evento.target.files); evento.target.value = ''; }} /></label>
            {arquivos.length > 0 && <ul>{arquivos.map((arquivo, indice) => <li key={`${arquivo.name}-${arquivo.size}-${indice}`}><Paperclip size={15} /><span><strong>{arquivo.name}</strong><small>{(arquivo.size / 1024 / 1024).toFixed(2)} MB</small></span><button type="button" onClick={() => setArquivos((atuais) => atuais.filter((_, item) => item !== indice))} aria-label={`Remover ${arquivo.name}`}><X size={16} /></button></li>)}</ul>}
          </div>
        </div>
        {erro && <p className="erro-nova-solicitacao" role="alert">{erro}</p>}
        <footer><button type="button" onClick={() => void cancelar()}>{resultadoPendente ? 'Concluir sem os arquivos restantes' : 'Cancelar'}</button><button type="submit" disabled={enviando || (!resultadoPendente && !necessidade)}><Send size={16} /> {enviando ? 'Enviando…' : resultadoPendente ? 'Tentar enviar arquivos' : 'Registrar novo trabalho'}</button></footer>
      </form>
    </section>
  </div>;
}
