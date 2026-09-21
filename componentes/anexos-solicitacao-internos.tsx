'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { Download, Eye, FileText, Paperclip, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { AnexoSolicitacaoCliente } from '../lib/anexos-solicitacao';
import { NotificacaoFlutuante } from './notificacao-flutuante';
import { documentoPodeSerVisualizado, VisualizadorDocumento, type DocumentoVisualizavel } from './visualizador-documento';

function tamanho(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;
}

export function AnexosSolicitacaoInternos({ cliente, solicitacaoId, compacto = false }: { cliente: SupabaseClient; solicitacaoId: string; compacto?: boolean }) {
  const [aberto, setAberto] = useState(false);
  const [anexos, setAnexos] = useState<AnexoSolicitacaoCliente[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [baixando, setBaixando] = useState('');
  const [erro, setErro] = useState('');
  const [documento, setDocumento] = useState<DocumentoVisualizavel | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const { data, error } = await cliente.rpc('listar_anexos_solicitacao_demonstrativa', { solicitacao: solicitacaoId });
    if (error) setErro(error.message || 'Não foi possível consultar os anexos desta solicitação.');
    else setAnexos((data ?? []) as AnexoSolicitacaoCliente[]);
    setCarregando(false);
  }, [cliente, solicitacaoId]);

  useEffect(() => { if (aberto) queueMicrotask(() => void carregar()); }, [aberto, carregar]);

  async function abrir(anexo: AnexoSolicitacaoCliente) {
    setBaixando(anexo.id);
    const { data, error } = await cliente.storage.from('solicitacoes').download(anexo.caminho_storage);
    if (error || !data) setErro('Não foi possível baixar o arquivo protegido.');
    else if (documentoPodeSerVisualizado(anexo.tipo_mime, anexo.nome_original)) {
      const url = URL.createObjectURL(data);
      setDocumento({ url, nome: anexo.nome_original, tipo: anexo.tipo_mime });
    } else {
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = anexo.nome_original;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    }
    setBaixando('');
  }

  return <div className={`anexos-internos ${compacto ? 'compacto' : ''}`}>
    <NotificacaoFlutuante mensagem={erro} tipo="erro" aoFechar={() => setErro('')} />
    <button type="button" className="acao-anexos-internos" aria-expanded={aberto} onClick={() => setAberto((valor) => !valor)}>
      <Paperclip size={15} /> {aberto ? 'Ocultar anexos' : 'Ver anexos do Cliente'}
    </button>
    {aberto && <div className="lista-anexos-internos">
      {carregando && <span><RefreshCw className="girando" size={14} /> Carregando…</span>}
      {!carregando && anexos.length === 0 && <span>Nenhum arquivo anexado.</span>}
      {anexos.map((anexo) => <button type="button" key={anexo.id} disabled={baixando === anexo.id} onClick={() => void abrir(anexo)}>
        <FileText size={15} /><span><strong>{anexo.nome_original}</strong><small>{tamanho(anexo.tamanho_bytes)}</small></span>{documentoPodeSerVisualizado(anexo.tipo_mime, anexo.nome_original) ? <Eye size={15} /> : <Download size={15} />}
      </button>)}
    </div>}
    {documento && <VisualizadorDocumento documento={documento} aoFechar={() => { URL.revokeObjectURL(documento.url); setDocumento(null); }} />}
  </div>;
}
