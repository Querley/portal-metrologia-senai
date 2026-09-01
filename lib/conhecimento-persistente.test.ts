import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { formatarDesvio, podeFormalizarLicao, recomendacaoExigeJustificativa, type RecomendacaoPersistente } from './conhecimento-persistente';

const base: RecomendacaoPersistente = {
  quantidade_casos: 5, confianca: 'media', q1: '8', mediana: '10', q3: '12',
  fator_correcao: null, horas_sugeridas: '10', casos: [],
};

describe('conhecimento persistente', () => {
  it('restringe a formalização a Validador e Administrador', () => {
    expect(podeFormalizarLicao('tecnico')).toBe(false);
    expect(podeFormalizarLicao('validador')).toBe(true);
    expect(podeFormalizarLicao('administrador')).toBe(true);
  });

  it('preserva precisão decimal nos desvios e na faixa recomendada', () => {
    expect(formatarDesvio('0.151')).toBe('+15.1%');
    expect(formatarDesvio('-0.15')).toBe('-15%');
    expect(recomendacaoExigeJustificativa('12.000000', base)).toBe(false);
    expect(recomendacaoExigeJustificativa('12.000001', base)).toBe(true);
    expect(recomendacaoExigeJustificativa('', base)).toBe(false);
  });

  it('não exige faixa estatística antes de cinco casos', () => {
    expect(recomendacaoExigeJustificativa('999', { ...base, quantidade_casos: 4 })).toBe(false);
  });

  it('mantém as barreiras de origem, conclusão, formalização e custo na migration', () => {
    const sql = readFileSync('supabase/migrations/202609010025_licoes_indicadores_recomendacoes.sql', 'utf8');
    expect(sql).toContain("origem_sessao is distinct from 'demonstracao'::origem_dado");
    expect(sql).toContain("ex.estado = 'concluido'");
    expect(sql).toContain("l.estado = 'formalizada'");
    expect(sql).toContain("perfil in ('validador', 'administrador') then ip.custo_congelado");
    expect(sql).toContain('Licao formalizada e imutavel');
    expect(sql).toContain('revisar_licao_demonstrativa');
    expect(sql).toContain('revoke all on function recomendar_horas_demonstrativas');
    const correcao = readFileSync('supabase/migrations/202609010026_corrige_gatilho_imutabilidade_licao.sql', 'utf8');
    expect(correcao).toContain("if tg_table_name = 'licoes' then");
    expect(correcao).toContain("elsif tg_table_name = 'revisoes_licao' then");
  });
});
