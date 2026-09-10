'use client';

import { useState, useSyncExternalStore } from 'react';
import { CheckCircle2, FileUp, ShieldCheck, X } from 'lucide-react';
import { cnpjValido, formatarCnpj, necessidadeInicial, necessidadesCliente, prazosPagamento } from '../lib/solicitacao';
import { obterClienteSupabase } from '../lib/supabase/cliente';
import { MATERIAIS_PECA, normalizarTelefoneDigitado, telefoneValido, valorPadronizado } from '../lib/campos-padronizados';
import { campoEstaInvalido, mensagemCampoInvalido } from './validacao-global';
import { NotificacaoFlutuante } from './notificacao-flutuante';

const tiposPermitidos = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/octet-stream'];

export function FormularioSolicitacao({ servicoInicial = '' }: { servicoInicial?: string }) {
  const cliente = obterClienteSupabase();
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [erro, setErro] = useState('');
  const [confirmacao, setConfirmacao] = useState<{
    codigo: number;
    token_ativacao: string;
  } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [servico, setServico] = useState(necessidadeInicial(servicoInicial));
  const [cnpj, setCnpj] = useState('');
  const [prazoPagamento, setPrazoPagamento] = useState('30');
  const [emailEnviado, setEmailEnviado] = useState('');
  const [material, setMaterial] = useState('');
  const hidratado = useSyncExternalStore(() => () => undefined, () => true, () => false);

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

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const campoInvalido = Array.from(evento.currentTarget.elements).find((elemento) =>
      (elemento instanceof HTMLInputElement || elemento instanceof HTMLTextAreaElement || elemento instanceof HTMLSelectElement) && campoEstaInvalido(elemento),
    ) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | undefined;
    if (campoInvalido) {
      setErro(mensagemCampoInvalido(campoInvalido));
      campoInvalido.focus();
      return;
    }
    if (!cnpjValido(cnpj)) {
      setErro('Informe um CNPJ válido. A validação verifica apenas o formato e os dígitos verificadores.');
      return;
    }
    if (!cliente) {
      setErro('A persistência da homologação está temporariamente indisponível.');
      return;
    }

    const formulario = new FormData(evento.currentTarget);
    if (String(formulario.get('website') ?? '').trim()) return;
    const email = String(formulario.get('email') ?? '')
      .trim()
      .toLowerCase();
    const telefone = String(formulario.get('telefone') ?? '').trim();
    if (!email.endsWith('.test')) {
      setErro('Nesta homologação, use somente um e-mail sintético terminado em .test. Não informe dados reais.');
      return;
    }
    if (telefone && !telefoneValido(telefone)) {
      setErro('Informe um telefone válido, usando somente números, espaços, parênteses, hífen e + no início.');
      return;
    }

    const prazo = prazoPagamento === 'outro' ? Number(formulario.get('prazo-pagamento-outro')) : Number(prazoPagamento);

    setEnviando(true);
    setErro('');
    const { data, error } = await cliente.rpc('registrar_solicitacao_publica_demonstrativa', {
      payload: {
        nome: formulario.get('nome'),
        email,
        empresa: formulario.get('empresa'),
        cnpj,
        telefone,
        necessidade: servico,
        necessidade_personalizada: formulario.get('necessidade-personalizada'),
        material: valorPadronizado(material, String(formulario.get('material-outro') ?? '')),
        quantidade: formulario.get('quantidade'),
        prazo_servico: formulario.get('prazo'),
        prazo_pagamento_dias: prazo,
        descricao: formulario.get('descricao'),
      },
    });
    setEnviando(false);

    if (error || !data || typeof data !== 'object') {
      setErro(error?.message || 'Não foi possível registrar a solicitação demonstrativa.');
      return;
    }

    const resultado = data as { codigo?: number; token_ativacao?: string };
    if (!resultado.codigo || !resultado.token_ativacao) {
      setErro('A homologação não retornou o protocolo esperado.');
      return;
    }
    setEmailEnviado(email);
    setConfirmacao({
      codigo: resultado.codigo,
      token_ativacao: resultado.token_ativacao,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (confirmacao)
    return (
      <section className="confirmacao" role="status">
        <CheckCircle2 size={42} />
        <h1>Solicitação salva na homologação</h1>
        <p>
          Protocolo <strong>DEM-SOL-{String(confirmacao.codigo).padStart(4, '0')}</strong>, vinculado ao e-mail sintético <strong>{emailEnviado}</strong>.
        </p>
        <p>Use o acesso abaixo com o mesmo e-mail. Se o Cliente já estiver cadastrado, este novo trabalho será acrescentado à empresa existente; caso seja o primeiro, a área protegida será ativada. Os arquivos selecionados permaneceram neste dispositivo e poderão ser enviados na etapa autenticada.</p>
        <a className="botao" href={`/portal?ativar=${encodeURIComponent(confirmacao.token_ativacao)}`}>
          Vincular ao acompanhamento do Cliente <span>→</span>
        </a>
        <a className="link-confirmacao" href="/portal/cliente-demonstracao">
          Ver a demonstração antes de ativar
        </a>
      </section>
    );

  return (
    <form className="formulario-solicitacao" data-hidratado={hidratado ? 'sim' : 'nao'} noValidate onSubmit={enviar}>
      <NotificacaoFlutuante mensagem={erro} tipo="erro" aoFechar={() => setErro('')} />
      <div className="aviso-demo">
        <ShieldCheck size={18} />
        <span>
          <strong>Homologação persistente.</strong> Use somente dados fictícios, inclusive e-mail terminado em <code>.test</code>. A origem demonstrativa é gravada e nunca se mistura à produção.
        </span>
      </div>
      <label className="campo-armadilha" aria-hidden="true">
        Website
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      <fieldset>
        <legend>1. Você e sua empresa</legend>
        <div className="grade-form">
          <label>
            Nome completo
            <input required name="nome" autoComplete="name" minLength={2} maxLength={120} />
          </label>
          <label>
            E-mail sintético para o acesso Cliente
            <input required name="email" type="email" autoComplete="email" maxLength={254} pattern="[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.test" title="Na homologação, informe um e-mail válido terminado em .test." placeholder="cliente.hml@example.test" />
          </label>
          <label>
            Nome da empresa
            <input required name="empresa" autoComplete="organization" minLength={2} maxLength={180} />
          </label>
          <label>
            CNPJ
            <input required name="cnpj" inputMode="numeric" autoComplete="off" minLength={18} maxLength={18} pattern="[0-9]{2}\.[0-9]{3}\.[0-9]{3}/[0-9]{4}-[0-9]{2}" title="Informe os 14 números do CNPJ no formato 00.000.000/0000-00." value={cnpj} onChange={(evento) => setCnpj(formatarCnpj(evento.target.value))} placeholder="00.000.000/0000-00" aria-invalid={cnpj.length === 18 && !cnpjValido(cnpj)} />
          </label>
          <label>
            Telefone
            <input
              name="telefone"
              type="tel"
              autoComplete="tel"
              minLength={8}
              maxLength={30}
              pattern="\+?[0-9 ()-]{8,30}"
              onInput={(evento) => {
                evento.currentTarget.value = normalizarTelefoneDigitado(evento.currentTarget.value);
              }}
            />
          </label>
          <label>
            Prazo de pagamento desejado
            <select required name="prazo-pagamento" value={prazoPagamento} onChange={(evento) => setPrazoPagamento(evento.target.value)}>
              {prazosPagamento.map((dias) => (
                <option key={dias} value={dias}>
                  {dias} dias
                </option>
              ))}
              <option value="outro">Outro prazo</option>
            </select>
          </label>
          {prazoPagamento === 'outro' && (
            <label className="campo-largo">
              Informe o prazo desejado em dias
              <input required name="prazo-pagamento-outro" type="number" inputMode="numeric" min="1" max="365" placeholder="Ex.: 120" />
            </label>
          )}
        </div>
      </fieldset>
      <fieldset>
        <legend>2. O que você precisa?</legend>
        <div className="grade-form">
          <label>
            Tipo de necessidade
            <select required name="servico" value={servico} onChange={(evento) => setServico(evento.target.value)}>
              <option value="" disabled>
                Selecione
              </option>
              {necessidadesCliente.map((item) => (
                <option value={item.valor} key={item.valor}>
                  {item.rotulo}
                </option>
              ))}
            </select>
          </label>
          <label>
            Material da peça
            <select required name="material" value={material} onChange={(evento) => setMaterial(evento.target.value)}>
              <option value="" disabled>
                Selecione
              </option>
              {MATERIAIS_PECA.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          {material === 'Outros' && (
            <label>
              Outro material
              <input required name="material-outro" minLength={2} maxLength={120} placeholder="Informe o material" />
            </label>
          )}
          {(servico === 'outro' || servico === 'orientacao-tecnica' || servicoInicial) && (
            <label className="campo-largo">
              Qual resultado você espera?
              <input required name="necessidade-personalizada" minLength={5} maxLength={500} placeholder="Ex.: modelo STEP, relatório dimensional ou investigação de falha" />
            </label>
          )}
          <label>
            Quantidade
            <input required name="quantidade" type="number" min="1" max="100000" />
          </label>
          <label>
            Prazo desejado para o serviço
            <input required name="prazo" type="date" min={new Date().toISOString().slice(0, 10)} />
          </label>
          <label className="campo-largo">
            Descreva o desafio
            <textarea required name="descricao" minLength={10} maxLength={5000} rows={5} placeholder="Inclua dimensões, tolerâncias, finalidade, pontos críticos e o entregável esperado." />
          </label>
        </div>
      </fieldset>
      <fieldset>
        <legend>3. Arquivos técnicos</legend>
        <label className="area-arquivo">
          <FileUp size={26} />
          <strong>Prepare PDF, imagem ou arquivo CAD</strong>
          <span>Na homologação, os arquivos permanecem no dispositivo até o acesso autenticado.</span>
          <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,.step,.stp,.iges,.igs,.stl,.obj,.dxf,.dwg" onChange={(evento) => selecionar(evento.target.files)} />
        </label>
        <ul className="lista-arquivos">
          {arquivos.map((arquivo, indice) => (
            <li key={`${arquivo.name}-${arquivo.size}`}>
              <span>
                {arquivo.name}
                <small>{(arquivo.size / 1024 / 1024).toFixed(2)} MB</small>
              </span>
              <button type="button" onClick={() => setArquivos(arquivos.filter((_, item) => item !== indice))} aria-label={`Remover ${arquivo.name}`}>
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>
      </fieldset>
      <label className="aceite">
        <input required type="checkbox" /> Confirmo que todos os dados são fictícios e aceito a <a href="/privacidade">política de privacidade</a> da demonstração.
      </label>
      <button className="botao" type="submit" disabled={enviando}>
        {enviando ? 'Salvando…' : 'Enviar solicitação demonstrativa'} <span aria-hidden="true">→</span>
      </button>
    </form>
  );
}
