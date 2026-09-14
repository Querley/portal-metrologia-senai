import { describe, expect, it } from 'vitest';
import { limparModoDefinicaoSenha, modoDefinicaoSenha } from './sessao-portal';

describe('sessão do portal', () => {
  it('reconhece recuperação e convite sem confundir outros parâmetros', () => {
    expect(modoDefinicaoSenha('/portal?recuperar=senha')).toBe('recuperacao');
    expect(modoDefinicaoSenha('/portal?definir=senha')).toBe('convite');
    expect(modoDefinicaoSenha('/portal?ativar=abc')).toBeNull();
  });

  it('remove somente os parâmetros transitórios de senha', () => {
    expect(limparModoDefinicaoSenha('/portal?definir=senha&ativar=abc#fim')).toBe('/portal?ativar=abc#fim');
  });
});
