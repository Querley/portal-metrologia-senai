export type ModoDefinicaoSenha = 'recuperacao' | 'convite' | null;

export function modoDefinicaoSenha(url: string): ModoDefinicaoSenha {
  const parametros = new URL(url, 'http://localhost').searchParams;
  if (parametros.get('recuperar') === 'senha') return 'recuperacao';
  if (parametros.get('definir') === 'senha') return 'convite';
  return null;
}

export function limparModoDefinicaoSenha(url: string): string {
  const endereco = new URL(url, 'http://localhost');
  endereco.searchParams.delete('recuperar');
  endereco.searchParams.delete('definir');
  return `${endereco.pathname}${endereco.search}${endereco.hash}`;
}
