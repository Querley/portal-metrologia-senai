import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { PerfilInterno } from '@lib/contratos';

const SUPABASE_URL_PADRAO = 'https://oddvwpqvkwudlmuegduq.supabase.co';

const urlSupabase =
  (typeof process !== 'undefined' &&
    (process.env?.EXPO_PUBLIC_SUPABASE_URL || process.env?.NEXT_PUBLIC_SUPABASE_URL)) ||
  SUPABASE_URL_PADRAO;

const chaveAnonima =
  (typeof process !== 'undefined' &&
    (process.env?.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY)) ||
  '';

let clienteInstancia: SupabaseClient | null = null;

export function obterSupabaseMobile(): SupabaseClient | null {
  if (!urlSupabase || !chaveAnonima) return null;
  if (!clienteInstancia) {
    clienteInstancia = createClient(urlSupabase, chaveAnonima, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }
  return clienteInstancia;
}

export type ContaHomologacaoDemo = {
  id: string;
  tipo: 'equipe' | 'cliente';
  nome: string;
  email: string;
  senha: string;
  papelRotulo: string;
  perfilInterno?: PerfilInterno;
  empresa?: string;
  cargo?: string;
};

export const CONTAS_HOMOLOGACAO_DEMO: ContaHomologacaoDemo[] = [
  {
    id: 'admin-matheus',
    tipo: 'equipe',
    nome: 'Matheus Silva',
    email: 'matheus.silva.demo@fieg.com.br',
    senha: 'matheus.silva.demo',
    papelRotulo: 'Administrador',
    perfilInterno: 'administrador',
  },
  {
    id: 'validador-sebastiao',
    tipo: 'equipe',
    nome: 'Sebastião',
    email: 'sebastiao.demo@fieg.com.br',
    senha: 'sebastiao.demo',
    papelRotulo: 'Validador',
    perfilInterno: 'validador',
  },
  {
    id: 'tecnico-joao',
    tipo: 'equipe',
    nome: 'João Rodrigues',
    email: 'joao.rodrigues.demo@fieg.com.br',
    senha: 'joao.rodrigues.demo',
    papelRotulo: 'Técnico',
    perfilInterno: 'tecnico',
  },
  {
    id: 'cliente-camila',
    tipo: 'cliente',
    nome: 'Camila Ferreira',
    email: 'camila.ferreira@metalforte.test',
    senha: 'camila.ferreira',
    papelRotulo: 'Cliente · Metalforte',
    empresa: 'Metalforte Indústria',
    cargo: 'Gestora de Qualidade',
  },
  {
    id: 'cliente-bruno',
    tipo: 'cliente',
    nome: 'Bruno Almeida',
    email: 'bruno.almeida@aerotech.test',
    senha: 'bruno.almeida',
    papelRotulo: 'Cliente · Aerotech',
    empresa: 'Aerotech Componentes',
    cargo: 'Engenheiro Aeronáutico',
  },
  {
    id: 'cliente-larissa',
    tipo: 'cliente',
    nome: 'Larissa Campos',
    email: 'larissa.campos@precision.test',
    senha: 'larissa.campos',
    papelRotulo: 'Cliente · Precision',
    empresa: 'Precision Ferramentaria',
    cargo: 'Coordenadora de Produto',
  },
];
