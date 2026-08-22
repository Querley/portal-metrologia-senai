'use client';

import { useState } from 'react';
import { CheckCircle2, FileUp, ShieldCheck, X } from 'lucide-react';

const tiposPermitidos = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/octet-stream'];

export function FormularioSolicitacao() {
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [erro, setErro] = useState('');
  const [enviado, setEnviado] = useState(false);

  function selecionar(novos: FileList | null) {
    const lista = [...arquivos, ...Array.from(novos ?? [])];
    if (lista.length > 5) return setErro('Envie no máximo cinco arquivos.');
    const invalido = lista.find((arquivo) => !tiposPermitidos.includes(arquivo.type) && !/\.(step|stp|iges|igs|stl|obj|dxf|dwg)$/i.test(arquivo.name));
    if (invalido) return setErro(`Formato não permitido: ${invalido.name}`);
    const excedido = lista.find((arquivo) => arquivo.size > (/\.(step|stp|iges|igs|stl|obj|dxf|dwg)$/i.test(arquivo.name) ? 50 : 10) * 1024 * 1024);
    if (excedido) return setErro(`O arquivo ${excedido.name} excede o limite permitido.`);
    setErro(''); setArquivos(lista);
  }

  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault(); setEnviado(true); window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (enviado) return <section className="confirmacao" role="status"><CheckCircle2 size={42} /><h1>Solicitação demonstrativa recebida</h1><p>O protocolo <strong>DEM-SOL-0285</strong> foi criado apenas nesta sessão. Nenhum dado foi enviado a um servidor.</p><a className="botao" href="/portal">Acompanhar demonstração <span>→</span></a></section>;

  return <form className="formulario-solicitacao" onSubmit={enviar}><div className="aviso-demo"><ShieldCheck size={18} /><span><strong>Ambiente de demonstração.</strong> Use somente dados fictícios; os campos não são transmitidos.</span></div><fieldset><legend>1. Identificação</legend><div className="grade-form"><label>Nome completo<input required name="nome" autoComplete="name" /></label><label>E-mail profissional<input required name="email" type="email" autoComplete="email" /></label><label>Empresa<input required name="empresa" autoComplete="organization" /></label><label>Telefone<input name="telefone" type="tel" autoComplete="tel" /></label></div></fieldset><fieldset><legend>2. Necessidade de medição</legend><div className="grade-form"><label>Serviço desejado<select required defaultValue=""><option value="" disabled>Selecione</option><option>Medição tridimensional</option><option>Tomografia industrial</option><option>Digitalização óptica</option></select></label><label>Material da peça<input required name="material" placeholder="Ex.: aço, alumínio, polímero" /></label><label>Quantidade<input required name="quantidade" type="number" min="1" /></label><label>Prazo desejado<input required name="prazo" type="date" /></label><label className="campo-largo">Descreva o desafio<textarea required name="descricao" rows={5} placeholder="Inclua dimensões, tolerâncias, finalidade e pontos críticos." /></label></div></fieldset><fieldset><legend>3. Arquivos técnicos</legend><label className="area-arquivo"><FileUp size={26} /><strong>Selecione PDF, imagem ou arquivo CAD</strong><span>Até 5 arquivos · PDF/imagem 10 MB · CAD 50 MB · somente download</span><input type="file" multiple onChange={(evento) => selecionar(evento.target.files)} /></label>{erro && <p className="erro-form" role="alert">{erro}</p>}<ul className="lista-arquivos">{arquivos.map((arquivo, indice) => <li key={`${arquivo.name}-${arquivo.size}`}><span>{arquivo.name}<small>{(arquivo.size / 1024 / 1024).toFixed(2)} MB</small></span><button type="button" onClick={() => setArquivos(arquivos.filter((_, item) => item !== indice))} aria-label={`Remover ${arquivo.name}`}><X size={16} /></button></li>)}</ul></fieldset><label className="aceite"><input required type="checkbox" /> Confirmo que estes dados são fictícios e aceito a política de privacidade da demonstração.</label><button className="botao" type="submit">Enviar solicitação demonstrativa <span aria-hidden="true">→</span></button></form>;
}
