import { describe, expect, it } from 'vitest';
import {
  criarContextoDemonstrativoFallback,
  responderChatbotInternoLaboratorio,
  responderChatbotPublico,
} from './chatbot-metrologia';

describe('chatbot-metrologia', () => {
  it('responde sobre eventos e novidades do laboratório no chatbot público nos três idiomas', async () => {
    const pt = await responderChatbotPublico('Quais são os eventos e novidades do Centro?', 'pt-BR');
    expect(pt.texto).toContain('Congresso SINDAG');
    expect(pt.texto).toContain('ExpoPeças 2026');
    expect(pt.texto).toContain('INMETRO');

    const en = await responderChatbotPublico('What events and news are happening?', 'en');
    expect(en.texto).toContain('SINDAG Congress');

    const de = await responderChatbotPublico('Welche Veranstaltungen und Neuigkeiten gibt es?', 'de');
    expect(de.texto).toContain('SINDAG-Kongress');
  });

  it('responde sobre equipamentos ZEISS e serviços no chatbot público sem expor dados internos', async () => {
    const eq = await responderChatbotPublico('Me fale sobre a máquina ZEISS PRISMO', 'pt-BR');
    expect(eq.texto).toContain('ZEISS PRISMO VAST 09/24/07');
    expect(eq.texto).toContain('LineScan');

    const srv = await responderChatbotPublico('Como funciona a Tomografia Industrial?', 'pt-BR');
    expect(srv.texto).toContain('Tomografia industrial');
    expect(srv.texto).toContain('Planejamento');
  });

  it('retorna dossiê completo no chatbot interno quando o membro do laboratório pergunta pelo nome do serviço', async () => {
    const contextoAdmin = criarContextoDemonstrativoFallback('administrador');
    const resposta = await responderChatbotInternoLaboratorio(
      'Me fale tudo sobre o serviço de Metrologia Avançada e Inspeção Dimensional',
      contextoAdmin,
    );

    expect(resposta.texto).toContain('Metrologia avançada ZEISS e inspeção dimensional');
    expect(resposta.texto).toContain('Metalforte Indústria');
    expect(resposta.texto).toContain('desenho-tecnico-carcaca-metalforte-rev3.pdf');
    expect(resposta.texto).toContain('Rebarba na face de referência');
    expect(resposta.texto).toContain('Camila Ferreira');
    expect(resposta.texto).toContain('R$');
  });

  it('oculta valores comerciais para o perfil Técnico no chatbot interno mantendo todos os dados técnicos, PDFs, problemas e mensagens', async () => {
    const contextoTecnico = criarContextoDemonstrativoFallback('tecnico');
    const resposta = await responderChatbotInternoLaboratorio(
      'Metrologia avançada e inspeção dimensional',
      contextoTecnico,
    );

    expect(resposta.texto).toContain('desenho-tecnico-carcaca-metalforte-rev3.pdf');
    expect(resposta.texto).toContain('Rebarba na face de referência');
    expect(resposta.texto).toContain('Valores comerciais ocultos para perfil Técnico');
    expect(resposta.texto).not.toContain('4.850');
  });

  it('responde consultas diretas sobre problemas/retrabalhos, PDFs/anexos e mensagens de clientes no chatbot interno', async () => {
    const contexto = criarContextoDemonstrativoFallback('validador');

    const problemas = await responderChatbotInternoLaboratorio('Quais problemas e retrabalhos aconteceram?', contexto);
    expect(problemas.texto).toContain('Houve Retrabalho');
    expect(problemas.texto).toContain('Superfície polida reflexiva');

    const pdfs = await responderChatbotInternoLaboratorio('Quais PDFs e anexos temos nas solicitações?', contexto);
    expect(pdfs.texto).toContain('desenho-tecnico-carcaca-metalforte-rev3.pdf');
    expect(pdfs.texto).toContain('especificacao-inspecao-raios-x-aerotech.pdf');

    const mensagens = await responderChatbotInternoLaboratorio('O que os clientes disseram nas mensagens?', contexto);
    expect(mensagens.texto).toContain('tolerância crítica de posição nos furos guia é de 0,01 mm');
  });

  it('responde perguntas livres conversacionais sobre funcionamento, preços, endereço e diagnóstico nos três idiomas', async () => {
    const comoFunciona = await responderChatbotPublico('Oi, me diga como vc funciona.', 'pt-BR');
    expect(comoFunciona.texto).toContain('Como você pode conversar comigo');
    expect(comoFunciona.texto).toContain('6 máquinas ZEISS');

    const precoEn = await responderChatbotPublico('How much does a measurement cost?', 'en');
    expect(precoEn.texto).toContain('How Pricing and Pre-proposals Work');

    const localDe = await responderChatbotPublico('Wo befindet sich das Labor?', 'de');
    expect(localDe.texto).toContain('Goiânia');

    const diagnostico = await responderChatbotPublico('Minha peça trincou por dentro, o que fazer?', 'pt-BR');
    expect(diagnostico.texto).toContain('ZEISS BOSELLO MAX');
  });
});
