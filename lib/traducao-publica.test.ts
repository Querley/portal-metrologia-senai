import { describe, expect, it } from 'vitest';
import { traduzirMensagemPublica, traduzirTextoPublico } from './traducao-publica';

describe('tradução da experiência pública e Cliente', () => {
  it('mantém português como conteúdo canônico', () => {
    expect(traduzirTextoPublico('Solicitar orçamento', 'pt-BR')).toBe('Solicitar orçamento');
  });

  it('traduz navegação, conteúdo e área do Cliente para inglês e alemão', () => {
    expect(traduzirTextoPublico('Solicitar orçamento', 'en')).toBe('Request a quote');
    expect(traduzirTextoPublico('Acontece no Centro', 'de')).toBe('Aktuelles im Zentrum');
    expect(traduzirTextoPublico('Trabalhos vinculados', 'en')).toBe('Linked work');
    expect(traduzirTextoPublico('Aguardando sua decisão', 'de')).toBe('Ihre Entscheidung steht aus');
  });

  it('preserva conteúdo técnico sem tradução cadastrada', () => {
    expect(traduzirTextoPublico('ZEISS PRISMO VAST', 'de')).toBe('ZEISS PRISMO VAST');
  });

  it('traduz mensagens dinâmicas de progresso e arquivos', () => {
    expect(traduzirMensagemPublica('Etapa em andamento: 50% concluída.', 'en')).toBe('Stage in progress: 50% complete.');
    expect(traduzirMensagemPublica('modelo.step: formato não permitido.', 'de')).toBe('modelo.step: Dateiformat nicht zulässig.');
  });
});
