import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { equipamentosPublicos } from './equipamentos';
import { setoresIndustria } from './setores';
import { servicosOficiais } from './servicos';
import { possuiTraducaoPublica, traduzirTextoPublico } from './traducao-publica';

const textosEquipamentos = equipamentosPublicos.flatMap((item) => [
  item.categoria,
  item.resumo,
  ...item.descricao,
  ...item.aplicacoes,
  ...item.capacidades,
  ...item.tiposMedicao,
  ...item.diferenciais,
  item.referenciaTecnica,
  ...item.midias.flatMap((midia) => [midia.alt, midia.legenda]),
]);

const textosServicos = servicosOficiais.flatMap((item) => [item.titulo, item.resumo]);
const textosSetores = setoresIndustria.flatMap((item) => [item.titulo, item.resumo, item.exemplos, ...item.midias.flatMap((midia) => [midia.alt, midia.legenda])]);

describe('cobertura integral das traduções públicas', () => {
  it.each(['en', 'de'] as const)('traduz todo o conteúdo técnico para %s', (idioma) => {
    const ausentes = [...new Set([...textosEquipamentos, ...textosServicos, ...textosSetores])]
      .filter((texto) => !possuiTraducaoPublica(texto, idioma));
    expect(ausentes).toEqual([]);
  });

  it('não deixa os textos institucionais principais em português ao selecionar alemão', () => {
    expect(traduzirTextoPublico('Qual é sua decisão?', 'de')).toBe('Wie möchten Sie entscheiden?');
    expect(traduzirTextoPublico(equipamentosPublicos[0].descricao[0], 'de')).not.toBe(equipamentosPublicos[0].descricao[0]);
    expect(traduzirTextoPublico(servicosOficiais[0].resumo, 'de')).not.toBe(servicosOficiais[0].resumo);
  });

  it.each(['en', 'de'] as const)('cobre as chaves estáticas usadas pela interface em %s', (idioma) => {
    const arquivos = [
      'app/page.tsx',
      'componentes/cabecalho-publico.tsx',
      'componentes/menu-movel.tsx',
      'componentes/rodape-publico.tsx',
      'componentes/catalogo-publico.tsx',
      'componentes/pagina-equipamento-publica.tsx',
      'componentes/setores-industria.tsx',
      'componentes/carrossel-midia.tsx',
      'componentes/contato-email.tsx',
      'componentes/formulario-solicitacao.tsx',
      'componentes/portal-cliente.tsx',
      'componentes/nova-solicitacao-cliente.tsx',
      'componentes/portal-interno.tsx',
    ];
    const chaves = arquivos.flatMap((arquivo) => {
      const fonte = readFileSync(resolve(process.cwd(), arquivo), 'utf8');
      return [...fonte.matchAll(/\bt\('([^']+)'\)/g)].map((resultado) => resultado[1]);
    });
    const ausentes = [...new Set(chaves)].filter((texto) => !possuiTraducaoPublica(texto, idioma));
    expect(ausentes).toEqual([]);
  });
});
