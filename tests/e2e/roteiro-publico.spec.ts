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
  await expect(page.locator('.navegacao-simples')).toHaveCSS('background-color', 'rgba(255, 255, 255, 0.95)');
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
  await expect(video).toHaveAttribute('preload', 'metadata');
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
  await expect(page.getByRole('heading', { name: 'Também é possível enviar por e-mail' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Abrir Gmail' })).toHaveAttribute('href', /mail\.google\.com/);
});

test('PRISMO e T-SCAN exibem os novos vídeos reais de operação', async ({ page }) => {
  for (const [slug, arquivo] of [
    ['zeiss-prismo', 'zeiss-prismo-operacao-real.mp4'],
    ['zeiss-t-scan-hawk-2', 'zeiss-t-scan-hawk-2-operacao-real.mp4'],
  ] as const) {
    await page.goto(`/equipamentos/${slug}`);
    await expect(page.locator('.carrossel')).toHaveAttribute('data-hidratado', 'sim');
    await page.getByRole('tab', { name: '2 Equipamento em operação' }).click();
    await expect(page.locator('.carrossel-legenda strong')).toHaveText('Equipamento em operação', { timeout: 15_000 });
    await expect(page.locator('.carrossel-palco video')).toBeVisible();
    await expect(page.locator('.carrossel-palco video')).toHaveAttribute('aria-label', /em operação/);
    const resposta = await page.request.get(`/videos/${arquivo}`);
    expect(resposta.ok()).toBe(true);
    expect(Number(resposta.headers()['content-length'] ?? 0)).toBeGreaterThan(1_000_000);
    await expect(page.locator('.carrossel-legenda strong')).toHaveText('Equipamento em operação');
  }
});

test('idioma público pode ser alternado em desktop e mobile', async ({ page }) => {
  await page.goto('/catalogo');
  const mobile = (page.viewportSize()?.width ?? 1000) <= 980;
  if (mobile) {
    await expect(page.locator('.menu-movel')).toHaveAttribute('data-hidratado', 'sim');
    await page.getByRole('button', { name: 'Abrir menu' }).click();
  }
  const seletor = mobile ? page.locator('.menu-movel .seletor-idioma select') : page.locator('.acoes-cabecalho-publico .seletor-idioma select');
  await expect(seletor).toBeVisible();
  await expect(seletor).toBeEnabled();
  await seletor.selectOption('de');
  await expect(page).toHaveURL(/\/catalogo\?lang=de/);
  await expect(mobile ? page.locator('.menu-movel .seletor-idioma select') : page.locator('.acoes-cabecalho-publico .seletor-idioma select')).toHaveValue('de');
  await expect(page.getByRole('heading', { name: 'Dienstleistungen und Ausrüstung' })).toBeVisible();
  await expect(page.getByText('Entdecken Sie die im Zentrum verfügbaren Technologien und finden Sie den passenden Weg für Ihre Messaufgabe.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Angebot anfordern' }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Drei Technologiebereiche tragen dieses Portfolio.' })).toBeVisible();
  await page.goto('/equipamentos/zeiss-duramax?lang=de');
  await expect(page.getByText('Im Zentrum ist eine DuraMax HTG 5/5/5 installiert, ein kompaktes Koordinatenmessgerät mit offener Bauweise und direktem Zugang zum Messtisch.')).toBeVisible();
  await page.goto('/portal/validacao-e2e?area=cliente&lang=de');
  await expect(page.locator('.portal-cliente')).toHaveAttribute('data-hidratado', 'sim');
  await expect(page.getByRole('heading', { name: 'Alle Aufträge Ihres Unternehmens an einem Ort.' })).toBeVisible();
  await expect(page.getByText('Wie möchten Sie entscheiden?')).toBeVisible();
  await expect(page.getByText('1 Ergebnis', { exact: true })).toBeVisible();
  await page.goto('/solicitar?lang=de');
  await expect(page.getByRole('option', { name: 'Maßprüfung und dimensionale Inspektion' })).toHaveCount(1);
  await expect(page.getByLabel('Gewünschter Fertigstellungstermin')).toHaveAttribute('lang', 'de-DE');
  await expect(page.getByText('Datumsformat: TT.MM.JJJJ')).toBeVisible();
  await expect(page.getByLabel('E-Mail für den Kundenzugang')).toHaveAttribute('placeholder', 'name@unternehmen.de');
});

test('setores públicos exibem mídia estável sem controles sobre a imagem', async ({ page }) => {
  await page.goto('/');
  const painel = page.locator('.painel-setor');
  await expect(painel).toBeVisible();
  await expect(painel.locator('.carrossel-palco img, .carrossel-palco video')).toHaveCount(1);
  const proporcao = await painel.locator('.carrossel-palco').evaluate((elemento) => getComputedStyle(elemento).aspectRatio);
  expect(proporcao).not.toBe('auto');
  const posicoes = await painel.locator('.carrossel').evaluate((elemento) => {
    const palco = elemento.querySelector('.carrossel-palco')!.getBoundingClientRect();
    const faixa = elemento.querySelector('.carrossel-faixa')!.getBoundingClientRect();
    const seletores = elemento.querySelector('.carrossel-miniaturas')!.getBoundingClientRect();
    return { fimPalco: palco.bottom, inicioFaixa: faixa.top, fimFaixa: faixa.bottom, inicioSeletores: seletores.top };
  });
  expect(posicoes.inicioFaixa).toBeGreaterThanOrEqual(posicoes.fimPalco - 1);
  expect(posicoes.inicioSeletores).toBeGreaterThanOrEqual(posicoes.fimFaixa - 1);
  const dimensoes = await painel.locator('.midia-setor').evaluate((elemento) => {
    const midia = elemento.getBoundingClientRect();
    const carrossel = elemento.querySelector('.carrossel')!.getBoundingClientRect();
    return { fimMidia: midia.bottom, fimCarrossel: carrossel.bottom };
  });
  expect(Math.abs(dimensoes.fimMidia - dimensoes.fimCarrossel)).toBeLessThanOrEqual(1);
});

test('cabeçalho secundário mantém navegação em uma linha e usa menu antes de comprimir', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 820 });
  await page.goto('/catalogo');
  const cabecalho = page.locator('.navegacao-simples');
  await expect(cabecalho).toHaveCSS('height', '76px');
  await expect(cabecalho.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible();
  const alturas = await cabecalho.locator('nav > a').evaluateAll((itens) => itens.map((item) => item.getBoundingClientRect().height));
  expect(Math.max(...alturas)).toBeLessThan(30);

  await page.setViewportSize({ width: 1100, height: 820 });
  await expect(cabecalho.getByRole('navigation', { name: 'Navegação principal' })).toBeHidden();
  await expect(cabecalho.locator('.menu-movel')).toBeVisible();
});

test('cópia do e-mail exibe confirmação flutuante no canto superior direito', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await expect(page.locator('.contato-email')).toHaveAttribute('data-hidratado', 'sim');
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => undefined } }));
  await page.getByRole('button', { name: 'Copiar' }).click();
  const aviso = page.getByRole('status');
  await expect(aviso).toContainText('Endereço copiado');
  await expect(aviso).toHaveCSS('position', 'fixed');
  const caixa = await aviso.boundingBox();
  if ((page.viewportSize()?.width ?? 1000) > 650) expect(caixa?.x ?? 0).toBeGreaterThan((page.viewportSize()?.width ?? 1000) / 2);
  else expect(caixa?.width ?? 0).toBeGreaterThan((page.viewportSize()?.width ?? 400) - 40);
  expect(caixa?.y ?? 100).toBeLessThan(50);
});

test('página de privacidade explica proteção, direitos e referências oficiais nos três idiomas', async ({ page }) => {
  await page.goto('/privacidade');
  await expect(page.getByRole('heading', { name: 'Privacidade e segurança', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Como protegemos as informações' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Seus direitos' })).toBeVisible();
  await expect(page.locator('.privacidade-resumo, .privacidade-alerta')).toHaveCount(0);
  await expect(page.locator('.privacidade-bloco ul').first()).toHaveCSS('list-style-type', 'disc');
  const area = await page.locator('.privacidade').boundingBox();
  const largura = page.viewportSize()?.width ?? 0;
  expect(Math.abs((area?.x ?? 0) - (largura - ((area?.x ?? 0) + (area?.width ?? 0))))).toBeLessThan(2);
  await expect(page.getByRole('link', { name: /Lei Geral de Proteção/ })).toHaveAttribute('href', /planalto\.gov\.br/);
  const mobile = (page.viewportSize()?.width ?? 1000) <= 1180;
  if (mobile) await page.getByRole('button', { name: 'Abrir menu' }).click();
  let seletor = mobile ? page.locator('.menu-movel .seletor-idioma select') : page.locator('.acoes-cabecalho-publico .seletor-idioma select');
  await seletor.selectOption('en');
  await expect(page.getByRole('heading', { name: 'Privacy and security', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your rights' })).toBeVisible();
  seletor = mobile ? page.locator('.menu-movel .seletor-idioma select') : page.locator('.acoes-cabecalho-publico .seletor-idioma select');
  await seletor.selectOption('de');
  await expect(page.getByRole('heading', { name: 'Datenschutz und Sicherheit', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ihre Rechte' })).toBeVisible();
});

test('formulário explica claramente uma entrada inválida', async ({ page }) => {
  await page.goto('/solicitar');
  await expect(page.locator('.formulario-solicitacao')).toHaveAttribute('data-hidratado', 'sim');
  const nome = page.getByLabel('Nome completo');
  await nome.fill('A');
  await page.getByRole('button', { name: /Enviar solicitação/ }).click();
  await expect(page.getByRole('alert')).toContainText('pelo menos 2 caracteres');
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

test('painel interno calcula orçamento no cenário isolado de E2E', async ({ page }) => {
  await page.goto('/portal/validacao-e2e');
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
  await page.keyboard.press('Escape');
  await expect(page.getByText('PRÉVIA SANITIZADA')).toBeHidden();
});

test('área interna oferece autenticação e recuperação sem atalhos antigos', async ({ page }) => {
  await page.goto('/portal');
  await expect(page.getByText('Acesso protegido')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Entrar no Portal de Metrologia' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Integração de homologação pendente' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /demonstração/i })).toHaveCount(0);
  await page.getByRole('button', { name: 'Esqueci minha senha' }).click();
  await expect(page.getByRole('heading', { name: 'Recuperar senha' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enviar link seguro' })).toBeVisible();
  await page.getByRole('button', { name: 'Voltar ao login' }).click();
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
  await page.locator('.idioma-acesso .seletor-idioma select').selectOption('de');
  await expect(page.getByRole('heading', { name: 'Beim Messtechnik-Portal anmelden' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Passwort vergessen' })).toBeVisible();
});

test('link de convite permanece na definição de senha enquanto valida a sessão', async ({ page }) => {
  await page.goto('/portal?definir=senha');
  await expect(page.getByRole('heading', { name: 'Ative sua conta' })).toBeVisible();
  await page.waitForTimeout(2200);
  await expect(page).toHaveURL(/\/portal\?definir=senha/);
  await expect(page.getByRole('button', { name: 'Salvar nova senha' })).toBeDisabled();
});

test('cliente registra outro trabalho e alterna o acompanhamento', async ({ page }) => {
  await page.goto('/portal/validacao-e2e?area=cliente');
  await expect(page.locator('.portal-cliente')).toHaveAttribute('data-hidratado', 'sim');
  const avisoPrivacidade = page.getByRole('dialog', { name: 'Antes de acessar sua área' });
  await avisoPrivacidade.getByRole('button', { name: 'Continuar' }).click();
  await expect(avisoPrivacidade).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Todos os trabalhos da sua empresa em um só lugar.' })).toBeVisible();
  await expect(page.getByText('Trabalhos vinculados').locator('..').getByText('1', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Registrar novo trabalho' }).first().click();
  await expect(page.getByRole('dialog', { name: 'Registrar outra solicitação' })).toBeVisible();
  await page.getByLabel('Tipo de necessidade').selectOption('medicao-inspecao-dimensional');
  await page.getByLabel('Material da peça').selectOption('Alumínio');
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
  await page.getByRole('button', { name: /Trabalhos vinculados/i }).click();
  await expect(page.getByLabel('Pesquisa e filtros')).toBeInViewport();
  await expect(page.getByRole('button', { name: /DEM-SOL-0285/i })).toHaveClass(/ativo/);
  await expect(page.locator('.anexos-trabalho-cliente').getByText('desenho-demonstrativo.pdf')).toBeVisible();
  await page.getByRole('button', { name: /DEM-SOL-0284/i }).click();
  await expect(page.getByRole('button', { name: /DEM-SOL-0284/i })).toHaveClass(/ativo/);
  await expect(page.getByRole('heading', { name: 'Também é possível enviar por e-mail' })).toBeVisible();
  await page.getByRole('button', { name: 'Editar dados do perfil' }).click();
  await expect(page.getByLabel('Cargo ou função na empresa')).toHaveValue('Gestora de projetos');

  await page.getByPlaceholder('Pesquisar por protocolo, serviço, estado ou data').fill('0284');
  await expect(page.getByText('1 resultado', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Recusar e solicitar revisão' }).click();
  await page.getByLabel('O que precisa ser alterado?').fill('Precisamos revisar o prazo e o escopo demonstrativos.');
  await page.getByRole('button', { name: 'Confirmar recusa' }).click();
  await expect(page.locator('.aceite-pre-proposta-cliente.recusada').getByText('Revisão solicitada', { exact: true })).toBeVisible();
  await page.getByLabel('Situação').selectOption('recusados');
  await expect(page.getByText('1 resultado', { exact: true })).toBeVisible();
  await page.getByLabel('Ordenar').selectOption('antigas');
  await expect(page.getByRole('button', { name: /DEM-SOL-0284/i })).toBeVisible();
});

test('nova solicitação do cliente fecha com Escape sem perder o portal', async ({ page }) => {
  await page.goto('/portal/validacao-e2e?area=cliente');
  await expect(page.locator('.portal-cliente')).toHaveAttribute('data-hidratado', 'sim');
  const avisoPrivacidade = page.getByRole('dialog', { name: 'Antes de acessar sua área' });
  await avisoPrivacidade.getByRole('button', { name: 'Continuar' }).click();
  await expect(avisoPrivacidade).toBeHidden();
  await page.getByRole('button', { name: 'Registrar novo trabalho' }).first().click();
  await expect(page.getByRole('dialog', { name: 'Registrar outra solicitação' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Registrar outra solicitação' })).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Todos os trabalhos da sua empresa em um só lugar.' })).toBeVisible();
});

test('área interna mantém navegação, perfil e saída em larguras intermediárias e mobile', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 860 });
  await page.goto('/portal/validacao-e2e');
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

test('orçamentos preservam cards e tabela em escalas intermediárias', async ({ page }) => {
  for (const largura of [1366, 1100, 820, 640]) {
    await page.setViewportSize({ width: largura, height: 850 });
    await page.goto('/portal/validacao-e2e?area=orcamentos');
    const aceitas = page.getByRole('button', { name: /Aceitas/ });
    await expect(aceitas).toBeVisible();
    const caixa = await aceitas.boundingBox();
    expect(caixa?.x ?? -1).toBeGreaterThanOrEqual(0);
    expect((caixa?.x ?? 0) + (caixa?.width ?? 0)).toBeLessThanOrEqual(largura + 1);
    const tabela = page.locator('.painel-orcamentos-persistentes .tabela-wrap');
    await expect(tabela).toBeVisible();
    await tabela.evaluate((elemento) => { elemento.scrollLeft = elemento.scrollWidth; });
    await expect(tabela.locator('th').last()).toBeAttached();
    await expect(page.locator('.painel-orcamentos-persistentes')).toHaveCSS('background-color', 'rgb(243, 247, 249)');
  }
});
