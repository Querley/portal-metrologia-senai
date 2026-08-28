'use client';

import { useState } from 'react';
import { CheckCircle2, FileUp, ShieldCheck, X } from 'lucide-react';
import { cnpjValido, formatarCnpj, necessidadeInicial, necessidadesCliente, prazosPagamento } from '../lib/solicitacao';

const tiposPermitidos = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/octet-stream'];

export function FormularioSolicitacao({ servicoInicial = '' }: { servicoInicial?: string }) {
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [erro, setErro] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [servico, setServico] = useState(necessidadeInicial(servicoInicial));
  const [cnpj, setCnpj] = useState('');
  const [prazoPagamento, setPrazoPagamento] = useState('30');

  function selecionar(novos: FileList | null) {
    const lista = [...arquivos, ...Array.from(novos ?? [])];
    if (lista.length > 5) return setErro('Envie no máximo cinco arquivos.');
    const invalido = lista.find((arquivo) => !tiposPermitidos.includes(arquivo.type) && !/\.(step|stp|iges|igs|stl|obj|dxf|dwg)$/i.test(arquivo.name));
    if (invalido) return setErro(`Formato não permitido: ${invalido.name}`);
    const excedido = lista.find((arquivo) => arquivo.size > (/\.(step|stp|iges|igs|stl|obj|dxf|dwg)$/i.test(arquivo.name) ? 50 : 10) * 1024 * 1024);
    if (excedido) return setErro(`O arquivo ${excedido.name} excede o limite permitido.`);
    setErro('');
    setArquivos(lista);
  }

  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!cnpjValido(cnpj)) {
      setErro('Informe um CNPJ válido. A validação verifica apenas o formato e os dígitos verificadores.');
      return;
    }
    setErro('');
    setEnviado(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (enviado) return <section className="confirmacao" role="status">
    <CheckCircle2 size={42} />
    <h1>Solicitação demonstrativa recebida</h1>
    <p>O protocolo <strong>DEM-SOL-0285</strong> foi criado apenas nesta sessão. Nenhum dado foi enviado a um servidor.</p>
    <p>Na operação real, a equipe analisará o pedido e enviará um convite para o acompanhamento autenticado.</p>
    <a className="botao" href="/portal/cliente-demonstracao">Ver como será o acompanhamento <span>→</span></a>
  </section>;

  return <form className="formulario-solicitacao" onSubmit={enviar}>
    <div className="aviso-demo"><ShieldCheck size={18} /><span><strong>Ambiente de demonstração.</strong> Use somente dados fictícios; os campos não são transmitidos.</span></div>
    <fieldset>
      <legend>1. Você e sua empresa</legend>
      <div className="grade-form">
        <label>Nome completo<input required name="nome" autoComplete="name" /></label>
        <label>E-mail profissional<input required name="email" type="email" autoComplete="email" /></label>
        <label>Nome da empresa<input required name="empresa" autoComplete="organization" /></label>
        <label>CNPJ<input required name="cnpj" inputMode="numeric" autoComplete="off" value={cnpj} onChange={(evento) => setCnpj(formatarCnpj(evento.target.value))} placeholder="00.000.000/0000-00" aria-invalid={cnpj.length === 18 && !cnpjValido(cnpj)} /></label>
        <label>Telefone<input name="telefone" type="tel" autoComplete="tel" /></label>
        <label>Prazo de pagamento desejado<select required name="prazo-pagamento" value={prazoPagamento} onChange={(evento) => setPrazoPagamento(evento.target.value)}>{prazosPagamento.map((dias) => <option key={dias} value={dias}>{dias} dias</option>)}<option value="outro">Outro prazo</option></select></label>
        {prazoPagamento === 'outro' && <label className="campo-largo">Informe o prazo desejado em dias<input required name="prazo-pagamento-outro" type="number" inputMode="numeric" min="1" max="365" placeholder="Ex.: 120" /></label>}
      </div>
    </fieldset>
    <fieldset>
      <legend>2. O que você precisa?</legend>
      <div className="grade-form">
        <label>Tipo de necessidade<select required name="servico" value={servico} onChange={(evento) => setServico(evento.target.value)}><option value="" disabled>Selecione</option>{necessidadesCliente.map((item) => <option value={item.valor} key={item.valor}>{item.rotulo}</option>)}</select></label>
        <label>Material da peça<input required name="material" placeholder="Ex.: aço, alumínio, polímero" /></label>
        {(servico === 'outro' || servico === 'orientacao-tecnica' || servicoInicial) && <label className="campo-largo">Qual resultado você espera?<input required name="necessidade-personalizada" placeholder="Ex.: modelo STEP, relatório dimensional ou investigação de falha" /></label>}
        <label>Quantidade<input required name="quantidade" type="number" min="1" /></label>
        <label>Prazo desejado para o serviço<input required name="prazo" type="date" /></label>
        <label className="campo-largo">Descreva o desafio<textarea required name="descricao" rows={5} placeholder="Inclua dimensões, tolerâncias, finalidade, pontos críticos e o entregável esperado." /></label>
      </div>
    </fieldset>
    <fieldset>
      <legend>3. Arquivos técnicos</legend>
      <label className="area-arquivo"><FileUp size={26} /><strong>Selecione PDF, imagem ou arquivo CAD</strong><span>Até 5 arquivos · PDF/imagem 10 MB · CAD 50 MB</span><input type="file" multiple onChange={(evento) => selecionar(evento.target.files)} /></label>
      {erro && <p className="erro-form" role="alert">{erro}</p>}
      <ul className="lista-arquivos">{arquivos.map((arquivo, indice) => <li key={`${arquivo.name}-${arquivo.size}`}><span>{arquivo.name}<small>{(arquivo.size / 1024 / 1024).toFixed(2)} MB</small></span><button type="button" onClick={() => setArquivos(arquivos.filter((_, item) => item !== indice))} aria-label={`Remover ${arquivo.name}`}><X size={16} /></button></li>)}</ul>
    </fieldset>
    <label className="aceite"><input required type="checkbox" /> Confirmo que estes dados são fictícios e aceito a <a href="/privacidade">política de privacidade</a> da demonstração.</label>
    <button className="botao" type="submit">Enviar solicitação demonstrativa <span aria-hidden="true">→</span></button>
  </form>;
}
