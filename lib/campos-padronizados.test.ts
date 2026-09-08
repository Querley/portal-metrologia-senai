import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { normalizarTelefoneDigitado, telefoneValido, valorPadronizado } from './campos-padronizados';

describe('campos padronizados', () => {
  it('aceita telefones usuais e rejeita letras e símbolos inválidos', () => {
    expect(telefoneValido('+55 (47) 99999-1234')).toBe(true);
    expect(telefoneValido('telefone123')).toBe(false);
    expect(telefoneValido('12#34@567')).toBe(false);
  });

  it('limpa caracteres inválidos durante a digitação', () => {
    expect(normalizarTelefoneDigitado('abc+55 (47) 9#9999-1234')).toBe('+55 (47) 99999-1234');
  });

  it('usa texto livre apenas quando Outros é selecionado', () => {
    expect(valorPadronizado('Aço carbono', 'ignorado')).toBe('Aço carbono');
    expect(valorPadronizado('Outros', '  titânio  ')).toBe('titânio');
  });

  it('mantém validações e transições críticas também no banco', () => {
    const migracao = readFileSync(new URL('../supabase/migrations/202609070034_validacoes_fluxo_e_visibilidade.sql', import.meta.url), 'utf8');
    expect(migracao).toContain('solicitacoes_publicas_telefone_formato');
    expect(migracao).toContain('etapas_execucao_ordem_obrigatoria');
    expect(migracao).toContain('criar_nova_pre_proposta_multiequipamento_demonstrativa');
    expect(migracao).toContain('alterar_perfil_interno_demonstrativo');
    expect(migracao).toContain('revoke execute on function criar_pre_proposta_demonstrativa');
  });

  it('separa cargo empresarial de permissão e protege contas Cliente', () => {
    const migracao = readFileSync(new URL('../supabase/migrations/202609080035_perfis_fluxo_reversivel_e_painel.sql', import.meta.url), 'utf8');
    expect(migracao).toContain('vinculos_empresa_cargo_valido');
    expect(migracao).toContain('atualizar_perfil_cliente_demonstrativo');
    expect(migracao).toContain('atualizar_email_proprio_demonstrativo');
    expect(migracao).toContain('Contas de Cliente não podem receber função interna.');
    expect(migracao).toContain('set perfil_interno = null');
  });
});
