'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { BriefcaseBusiness, Send, ShieldCheck, X } from 'lucide-react';
import { useState } from 'react';
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

type ResultadoNovaSolicitacao = {
  solicitacao_id: string;
  codigo: number;
  protocolo: string;
};

type Propriedades = {
  cliente?: SupabaseClient;
  demonstracao?: boolean;
  empresaNome: string;
  aoFechar: () => void;
  aoCriada: (resultado: ResultadoNovaSolicitacao, dados: DadosNovaSolicitacaoCliente) => void | Promise<void>;
};

export function NovaSolicitacaoCliente({ cliente, demonstracao = false, empresaNome, aoFechar, aoCriada }: Propriedades) {
  const [necessidade, setNecessidade] = useState('');
  const [prazoPagamento, setPrazoPagamento] = useState('30');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
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

    if (demonstracao) {
      const codigo = 285;
      await aoCriada({ solicitacao_id: `demo-solicitacao-${Date.now()}`, codigo, protocolo: `DEM-SOL-${String(codigo).padStart(4, '0')}` }, dados);
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

    await aoCriada(resultado, dados);
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
        </div>
        {erro && <p className="erro-nova-solicitacao" role="alert">{erro}</p>}
        <footer><button type="button" onClick={aoFechar}>Cancelar</button><button type="submit" disabled={enviando || !necessidade}><Send size={16} /> {enviando ? 'Registrando…' : 'Registrar novo trabalho'}</button></footer>
      </form>
    </section>
  </div>;
}
