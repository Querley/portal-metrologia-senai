import { expect, test } from '@playwright/test';

test('visitante navega da página inicial ao catálogo e à solicitação', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Precisão para medir/i })).toBeVisible();
  await expect(page.locator('.medicao, .cartao-flutuante')).toHaveCount(0);
  await page.getByRole('link', { name: 'Conhecer serviços' }).click();
  await expect(page.getByRole('heading', { name: 'Soluções organizadas por setor' })).toBeVisible();
  await page.getByRole('link', { name: 'Escaneamento 3D e digitalização de peças' }).click();
  await expect(page.getByRole('heading', { name: 'Solicite uma análise sem criar uma conta' })).toBeVisible();
  await expect(page.getByText('Homologação persistente.')).toBeVisible();
  await expect(page.getByLabel('Tipo de necessidade')).toHaveValue('digitalizacao-modelo-3d');
  await expect(page.locator('.navegacao-simples')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(page.locator('.cabecalho-publico-conteudo')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  const larguraFormulario = (await page.locator('.pagina-form').boundingBox())?.width ?? 0;
  expect(larguraFormulario).toBeGreaterThan((page.viewportSize()?.width ?? 400) > 700 ? 800 : 340);
});

test('catálogo apresenta o parque atual e abre a página detalhada', async ({ page }) => {
  await page.goto('/catalogo#equipamentos');
  await expect(page.getByRole('heading', { name: /Seis equipamentos/i })).toBeVisible();
  await expect(page.getByText('CMM CONTURA', { exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'ZEISS DuraMax HTG' }).first().click();
  await expect(page.getByRole('heading', { name: 'ZEISS DuraMax HTG' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Aplicações frequentes' })).toBeVisible();
  await expect(page.locator('.carrossel-palco img')).toHaveAttribute('src', /recorte-zeiss-duramax-v3\.png/);
  await expect(page.getByText('Sequência de mídia')).toHaveCount(0);
  await expect(page.locator('.carrossel')).toHaveAttribute('data-hidratado', 'sim');
  await page.getByRole('button', { name: 'Próxima mídia' }).click();
  await expect(page.locator('.carrossel-legenda strong')).toHaveText('Equipamento instalado no Centro');
  await page.getByRole('button', { name: 'Próxima mídia' }).click();
  const video = page.locator('.carrossel-palco video');
  await expect(video).toHaveAttribute('preload', 'auto');
  await expect(video).toHaveAttribute('data-busca-pronta', 'sim');
  await expect(video).toHaveJSProperty('autoplay', true);
  await expect(video).toHaveJSProperty('loop', true);
  await expect(video).toHaveJSProperty('muted', true);
  await video.evaluate((elemento: HTMLVideoElement) => { elemento.currentTime = Math.min(2, elemento.duration); });
  await expect.poll(() => video.evaluate((elemento: HTMLVideoElement) => elemento.currentTime)).toBeGreaterThan(1.5);
});

test('solicitação aceita necessidade fora do catálogo', async ({ page }) => {
  await page.goto('/solicitar?servico=outro');
  await expect(page.getByLabel('Tipo de necessidade')).toHaveValue('outro');
  await expect(page.getByLabel('Qual resultado você espera?')).toBeVisible();
});

test('serviço oficial abre uma solicitação já classificada', async ({ page }) => {
  await page.goto('/catalogo');
  const servicosDoSetor = page.locator('.conteudo-setor a[href^="/solicitar?servico="]');
  await expect(servicosDoSetor).toHaveCount(10);
  await page.getByRole('link', { name: 'Apoio na criação de almoxarifado virtual e biblioteca digital de peças' }).click();
  await expect(page.getByLabel('Tipo de necessidade')).toHaveValue('orientacao-tecnica');
  await expect(page.getByRole('option', { name: 'Inspeção interna sem destruir a peça' })).toHaveCount(1);
  await expect(page.getByLabel('Qual resultado você espera?')).toBeVisible();
});

test('painel mantém origem demonstrativa e calcula orçamento', async ({ page }) => {
  await page.goto('/portal/demonstracao');
  await expect(page.locator('.aplicacao')).toHaveAttribute('data-hidratado', 'sim');
  await expect(page.getByText('AMBIENTE DE HOMOLOGAÇÃO')).toBeVisible();
  await page.getByRole('button', { name: 'Orçamentos' }).click({ force: (page.viewportSize()?.width ?? 1000) < 650 });
  await expect(page.getByText(/Assistente estatístico:/)).toBeVisible();
  const precoInicial = await page.getByText('Preço antes do ajuste').locator('..').locator('dd').textContent();
  await page.getByLabel('Horas estimadas').fill('20');
  await expect(page.getByText('Preço antes do ajuste').locator('..').locator('dd')).not.toHaveText(precoInicial ?? '');
  await page.getByRole('button', { name: /Assistente interno/i }).click();
  await expect(page.getByText('PRÉVIA SANITIZADA')).toBeVisible();
  await expect(page.getByText(/não altero o cálculo/i)).toBeVisible();
});

test('área interna oferece autenticação e alternativa de demonstração', async ({ page }) => {
  await page.goto('/portal');
  await expect(page.getByText('Acesso protegido')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Entrar no Portal de Metrologia|Integração de homologação pendente/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Abrir demonstração interna' })).toHaveAttribute('href', '/portal/demonstracao');
  await expect(page.getByRole('link', { name: 'Ver demonstração da área do cliente' })).toHaveAttribute('href', '/portal/cliente-demonstracao');
});

test('cliente registra outro trabalho e alterna o acompanhamento', async ({ page }) => {
  await page.goto('/portal/cliente-demonstracao');
  await expect(page.locator('.portal-cliente')).toHaveAttribute('data-hidratado', 'sim');
  const avisoPrivacidade = page.getByRole('dialog', { name: 'Antes de acessar sua área' });
  await avisoPrivacidade.getByRole('button', { name: 'Continuar' }).click();
  await expect(avisoPrivacidade).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Todos os trabalhos da sua empresa em um só lugar.' })).toBeVisible();
  await expect(page.getByText('Trabalhos vinculados').locator('..').getByText('1', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Registrar novo trabalho' }).first().click();
  await expect(page.getByRole('dialog', { name: 'Registrar outra solicitação' })).toBeVisible();
  await page.getByLabel('Tipo de necessidade').selectOption('medicao-inspecao-dimensional');
  await page.getByLabel('Material da peça').fill('Alumínio demonstrativo');
  await page.getByLabel('Quantidade').fill('2');
  await page.getByLabel('Prazo desejado para o serviço').fill('2026-12-20');
  await page.getByLabel('Descreva o desafio').fill('Inspeção dimensional demonstrativa para validar outro trabalho simultâneo.');
  await page.getByLabel(/Adicionar imagens ou outros arquivos/i).setInputFiles({
    name: 'desenho-demonstrativo.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 arquivo exclusivamente sintetico'),
  });
  await expect(page.getByText('desenho-demonstrativo.pdf')).toBeVisible();
  await page.getByRole('button', { name: 'Registrar novo trabalho' }).last().click();

  await expect(page.getByText(/registrada e vinculada à sua empresa/i)).toBeVisible();
  await expect(page.getByText('Trabalhos vinculados').locator('..').getByText('2', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /DEM-SOL-0285/i })).toHaveClass(/ativo/);
  await expect(page.locator('.anexos-trabalho-cliente').getByText('desenho-demonstrativo.pdf')).toBeVisible();
  await page.getByRole('button', { name: /DEM-SOL-0284/i }).click();
  await expect(page.getByRole('button', { name: /DEM-SOL-0284/i })).toHaveClass(/ativo/);
});

test('área interna mantém navegação, perfil e saída em larguras intermediárias e mobile', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 860 });
  await page.goto('/portal/demonstracao');
  await expect(page.locator('.acoes-conta-responsivas').getByRole('button', { name: 'Meu perfil' })).toBeVisible();
  await expect(page.locator('.acoes-conta-responsivas').getByRole('button', { name: 'Sair' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Solicitações' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Orçamentos' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);

  await page.setViewportSize({ width: 640, height: 860 });
  await expect(page.locator('.acoes-conta-responsivas').getByRole('button', { name: 'Meu perfil' })).toBeVisible();
  await expect(page.locator('.acoes-conta-responsivas').getByRole('button', { name: 'Sair' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Módulos internos' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
