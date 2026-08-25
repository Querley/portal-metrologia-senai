import { expect, test } from '@playwright/test';

test('visitante navega da página inicial ao catálogo e à solicitação', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Precisão para medir/i })).toBeVisible();
  await expect(page.locator('.medicao, .cartao-flutuante')).toHaveCount(0);
  await page.getByRole('link', { name: 'Conhecer serviços' }).click();
  await page.getByRole('link', { name: /Saiba mais sobre Escaneamento 3D/i }).click();
  await expect(page.getByRole('heading', { name: 'Serviços e equipamentos' })).toBeVisible();
  await page.getByRole('link', { name: /Solicitar análise/i }).first().click();
  await expect(page.getByRole('heading', { name: 'Solicite uma análise' })).toBeVisible();
  await expect(page.getByText('Ambiente de demonstração.')).toBeVisible();
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
  await expect(page.getByLabel('Serviço desejado')).toHaveValue('outro');
  await expect(page.getByLabel(/Qual serviço, equipamento ou resultado/i)).toBeVisible();
});

test('serviço oficial abre uma solicitação já classificada', async ({ page }) => {
  await page.goto('/catalogo');
  await expect(page.locator('.grade-servicos-oficiais article')).toHaveCount(10);
  await page.getByRole('link', { name: 'Solicitar este serviço' }).last().click();
  await expect(page.getByLabel('Serviço desejado')).toHaveValue('almoxarifado-virtual-biblioteca-digital');
  await expect(page.getByRole('option', { name: /Tomografia industrial/i })).toHaveCount(1);
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
  await expect(page.getByRole('heading', { name: 'Entrar no Portal de Metrologia' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Prefiro abrir a demonstração local' })).toHaveAttribute('href', '/portal/demonstracao');
});
