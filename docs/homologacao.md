# Homologação Supabase

## Estado validado em 2 de setembro de 2026

O site publicado está conectado ao projeto Supabase de homologação. O login por e-mail foi testado com sucesso pelo mantenedor usando Administrador e Validador. O perfil Técnico também está provisionado e teve suas autorizações validadas em transação revertida:

- `admin.hml@example.test` — Administrador;
- `validador.hml@example.test` — Validador;
- `tecnico.hml@example.test` — Técnico;
- `cliente.hml@example.test` — conta Cliente sintética ativada e validada pela interface pelo mantenedor.

Senhas, tokens e chaves não pertencem ao Git nem a este documento. O autocadastro público está desabilitado; Administradores enviam convites pelo painel e a autenticação anônima permanece desabilitada.

As migrations `202608220001` até `202609020033` estão aplicadas e registradas no histórico remoto, conferido pelo CLI. A migration `031` permite vários trabalhos simultâneos, reutiliza a empresa ativa e recupera entradas recorrentes; a `032` protege anexos por solicitação e recupera, sem sobrescrever, um PDF órfão anterior ao congelamento; e a `033` registra a recusa motivada do Cliente, preserva o PDF recusado no histórico e libera outra pré-proposta para a mesma solicitação. As migrations anteriores continuam responsáveis pelo esquema operacional, perfis, RLS, custos versionados, pré-proposta, execução, fechamento, conhecimento persistente e atribuição formal descritos abaixo.

O mantenedor validou pela interface publicada o aceite do Cliente e a confirmação de início pelo Administrador. A migration `202609010022` foi executada e registrada em 1º de setembro. A presença da RPC foi confirmada pela API anônima, que respondeu `401 permission denied`, como esperado para uma função exclusiva de usuários autenticados.

A migration `202609010023` foi executada e registrada em 1º de setembro. As três RPCs foram reconhecidas pela API e responderam `401 permission denied` ao papel anônimo, confirmando a negação por padrão. Ela adiciona o fechamento operacional com horas reais por equipamento, custos extras, ocorrências e aprendizado; Técnico registra e Validador ou Administrador aprova ou devolve. A execução só muda para `concluido` após a aprovação.

A migration `202609010024` foi aplicada e validada pela interface em 1º de setembro: o Técnico passou a visualizar o trabalho criado por outro perfil. Até existir atribuição formal, os três perfis operacionais acessam todas as execuções demonstrativas; a decisão do fechamento continua exclusiva de Validador e Administrador. A visualização do Cliente também foi corrigida para priorizar `execucao_estado = concluido` sobre a simples conclusão das etapas.

As migrations `202609010025` e `202609010026` foram aplicadas e registradas em 1º de setembro. Elas criam operações auditadas para registrar, revisar e formalizar lições de execuções concluídas; mantêm revisões formalizadas imutáveis; expõem indicadores de esforço, duração e custo conforme o perfil; e calculam recomendações apenas com casos concluídos, demonstrativos, do mesmo serviço e com a revisão atual formalizada. Um teste transacional confirmou Técnico criando e revisando, bloqueio do Técnico ao formalizar, formalização pelo Validador, entrada na recomendação apenas após formalização e ausência de resíduos após `rollback`. O papel `anon` não possui execução; `authenticated` recebeu execução nas RPCs previstas.

As migrations `202609010027` a `202609010030` foram aplicadas e registradas em 1º de setembro. O envio para validação recalcula a faixa com os mesmos casos elegíveis da recomendação e bloqueia estimativa externa a Q1–Q3 sem justificativa persistente. Somente o Administrador atribui um Técnico ativo da origem demonstrativa; a RPC de listagem, os gatilhos de escrita e as políticas RLS restringem o Técnico às próprias atribuições, preservando a supervisão de Validador e Administrador e a leitura externa apenas da empresa e das etapas visíveis. O lint remoto não encontrou erros; restaram apenas avisos de variáveis legadas sem efeito, criadas antes da substituição do filtro temporário da migration `024`. A prova pgTAP de identidade e RLS roda no GitHub Actions, pois requer Docker indisponível na estação local.

A migration `202609010031` foi aplicada e registrada em 1º de setembro. Ela remove a restrição que bloqueava uma segunda ativação do mesmo Cliente, materializa cada entrada como um trabalho independente na empresa já vinculada, recupera entradas pendentes do mesmo e-mail, preserva o protocolo `DEM-SOL-*` no portal e acrescenta criação autenticada e vínculo administrativo. O lint remoto não encontrou erros novos. A prova pgTAP específica cobre criação simultânea, reutilização da empresa, listagem integral e alçada exclusiva do Administrador; sua execução permanece no GitHub Actions porque o executor local do CLI requer Docker.

A migration `202609020032` foi aplicada e registrada em 2 de setembro. Ela permite ao Cliente enviar até cinco PDFs, imagens ou arquivos CAD para a própria solicitação, grava metadados auditados e autoriza leitura somente à empresa vinculada ou à equipe demonstrativa. Também permite ao Administrador remover apenas um PDF pendente deixado por uma tentativa interrompida; depois do congelamento de caminho e hash, a remoção e a substituição continuam negadas. A prova pgTAP cobre isolamento entre empresas, registro do anexo, recuperação do órfão e imutabilidade posterior.

## Dados e autorização

- Homologação contém somente massa sintética: dez serviços, sete equipamentos e sete custos demonstrativos.
- Não há custo, cliente, proposta ou serviço real nesse ambiente.
- Cada usuário consulta somente o próprio perfil.
- Validador e Administrador consultam custos da origem ativa.
- Somente Administrador chama `versionar_custo_equipamento`; a função encerra a vigência anterior, cria a nova versão e registra auditoria.
- A interface autenticada lista somente custos da origem `demonstracao`, omite a fonte armazenada e oferece o formulário de nova vigência apenas ao Administrador.
- Técnico, Validador e Administrador criam, corrigem e enviam os próprios rascunhos para validação; Validador e Administrador também aprovam, devolvem ou rejeitam.
- O Técnico consulta somente os orçamentos restritos que criou. Validador e Administrador consultam todos os orçamentos da origem ativa.
- Custos-hora continuam ocultos para o Técnico e disponíveis somente para Validador e Administrador.
- O servidor busca o custo vigente, recalcula o item, congela o custo-hora usado e registra auditoria. A interface não envia um custo-hora arbitrário.
- Cada rascunho deste primeiro recorte possui um item e um equipamento e usa contexto interno totalmente sintético, sem cliente real.
- Validador foi testado e bloqueado ao tentar versionar; Administrador foi testado em transação revertida, sem deixar alteração de teste.
- Técnico foi testado criando e enviando um orçamento sintético em transação revertida; a RLS ocultou os custos-hora protegidos e não deixou resíduo.
- Devolução, reenvio, rejeição e publicação foram testados por perfil em transação revertida. Validador não publicou; Administrador foi bloqueado sem PDF/hash e publicou somente após o documento sintético estar marcado como imutável.
- A revisão da proposta devolvida foi testada com recálculo protegido: somente o autor alterou os campos, o Validador foi bloqueado e o teste foi revertido sem resíduos.
- A migration `013` foi aplicada pelo SQL Editor e teve estrutura, histórico, RLS e permissões auditados. O papel `anon` não possui privilégios na tabela de etapas; `authenticated` acessa somente através das políticas definidas.
- A criação e listagem de pré-proposta com destinatário e prazo de pagamento foram validadas pelo Administrador em transação revertida, sem deixar resíduos.
- O fluxo `solicitação pública → token → perfil Gestor da empresa → área Cliente` foi validado com usuário sintético em transação revertida. E-mail divergente foi bloqueado e os testes deixaram zero entradas e zero usuários residuais.
- Cliente e equipe possuem conversa persistente na solicitação ativada. O Cliente continua limitado à própria empresa; Técnico, Validador e Administrador acessam somente conversas da origem demonstrativa.
- O Cliente pode atualizar apenas o próprio nome por função protegida, sem alterar vínculo, função ou empresa.
- Técnico, Validador e Administrador podem iniciar uma pré-proposta a partir da fila. O servidor valida a solicitação ativada, reaproveita empresa e protocolo, congela o custo vigente e registra auditoria.
- Somente Administrador envia e congela o PDF privado de uma versão aprovada; depois disso, a política de Storage impede sobrescrita.
- Antes do congelamento, uma tentativa interrompida pode limpar somente o arquivo órfão do mesmo UUID e reenviá-lo; nenhum PDF congelado pode ser removido por esse caminho.
- O Cliente envia anexos somente para solicitações que criou na própria empresa demonstrativa. O servidor limita quantidade, extensão e tamanho, e a listagem/download permanecem privados por vínculo.
- O Cliente recebe a referência e o arquivo somente após a emissão e apenas para a própria empresa. A política do Storage usa função protegida para validar o vínculo apesar das RLS internas; o navegador recalcula o SHA-256 e bloqueia divergências.
- Reset demonstrativo nunca alcança a origem real.

## Retomada por outro chat

1. Ler `AGENTS.md`, `README.md` e a documentação obrigatória indicada pelo mantenedor.
2. Confirmar `main` limpa e sincronizada.
3. Tratar `supabase/migrations/` como fonte canônica do banco; nunca editar manualmente uma migration já aplicada.
4. Manter `.env.local`, credenciais do CLI e metadados de vínculo fora do Git.
5. Executar `npm run verificar` antes de enviar mudanças.
6. Aplicar novas migrations primeiro em homologação, testar RLS por perfil e só então publicar.

Nesta rede, conexões PostgreSQL diretas ao pooler podem expirar. O SQL Editor autenticado do Supabase foi usado como alternativa segura, com transações e registro explícito em `supabase_migrations.schema_migrations`.

## Interface de custos-hora concluída

A interface autenticada de custos-hora entrega:

1. equipamento, custo vigente e início da vigência para Validador e Administrador;
2. estados vazio, carregamento e erro sem revelar a fonte restrita;
3. nova versão criada pelo Administrador através da função auditada;
4. modo somente leitura para Validador, com negação adicional pela RLS/RPC;
5. validação de valor e data, aviso para não inserir dados reais e testes de autorização e precisão decimal.

## Regra de alçada confirmada em 27 de agosto de 2026

Os perfis internos seguem hierarquia cumulativa: Validador faz tudo que Técnico faz; Administrador faz tudo que Validador faz. Técnico, Validador e Administrador podem criar, corrigir e enviar os próprios orçamentos. Validador e Administrador podem aprovar, devolver ou rejeitar orçamentos em validação; devolução e rejeição exigem justificativa auditada.

A aprovação permanece distinta da publicação. Somente Administrador pode gerar e congelar o PDF e executar `aprovada → publicada`; o servidor bloqueia a transição enquanto não existirem arquivo privado e hash imutável. O aceite externo demonstrativo está implementado desde a migration `021`; clientes sintéticos podem manter vários trabalhos, enquanto clientes e dados reais permanecem fora do recorte atual.

## Validação pela interface e próximo passo

O mantenedor confirmou pela interface publicada que o Cliente cria solicitações e troca mensagens com a equipe. As migrations `013` a `017` mantêm esse fluxo limitado à origem `demonstracao`. A próxima validação deve confirmar:

1. geração e download interno do PDF pelo Administrador depois da aprovação;
2. bloqueio da emissão enquanto o PDF não estiver congelado;
3. emissão e download íntegro pelo Cliente, sem custos, margens ou rascunhos;
4. aceite pelo Cliente e confirmação do início exclusivamente pelo Administrador;
5. criação e atualização das etapas visíveis de cada serviço por Técnico, Validador e Administrador;
6. fechamento registrado pelo Técnico e aprovado ou devolvido por Validador ou Administrador;
7. criação de lição pelo Técnico, formalização por Validador/Administrador e bloqueio da recomendação antes da formalização.

O formulário público persiste somente entradas da origem demonstrativa e aceita caixas de e-mail válidas para permitir convite e recuperação de senha. Arquivos selecionados não são enviados antes da autenticação. Dados industriais reais e segredos continuam proibidos na homologação.

Custos reais só serão carregados no futuro projeto de produção por processo privado e auditado. A planilha restrita e seus valores nunca entram no Git nem na homologação.

## Migration mais recente

A migration `202609020033` foi aplicada e registrada em 2 de setembro. Ela registra a recusa do Cliente com motivo, mantém o PDF como histórico e libera uma nova pré-proposta para a mesma solicitação. A prova pgTAP cobre isolamento entre empresas, persistência e auditoria da recusa, leitura histórica do PDF e criação da nova versão; sua execução continua delegada ao GitHub Actions porque o executor local exige Docker Desktop.

## Verificações da revisão de 7 de setembro de 2026

1. Confirme o pop-up de sucesso e o formulário de pré-proposta recolhível.
2. Crie uma pré-proposta, sempre pela solicitação, com dois equipamentos e data estimada.
3. Recuse no Cliente e confirme o motivo na área interna antes da nova versão.
4. Tente iniciar a segunda etapa antes da primeira; interface e banco devem impedir.
5. Pesquise datas em `dd/mm/aaaa` e `aaaa-mm-dd`.
6. Clique nos três indicadores do Cliente e confirme rolagem e filtro.
7. Tente telefone com letras e mais de cinco anexos.
8. Como Técnico, confirme que valores monetários e PDF comercial não aparecem.
9. Como Administrador, altere a função de outro usuário sintético e consulte o histórico de custos.

## Revisão de 8 de setembro de 2026

A migration `202609080035` foi aplicada e registrada em 8 de setembro. Ela adiciona cargo profissional ao vínculo empresarial, troca auditada de e-mail próprio, reparo de perfis externos que receberam papel interno e retorno justificado de execução para etapa anterior. A conferência remota encontrou zero Clientes com perfil interno, zero vínculos sem cargo e confirmou as novas funções. A interface autenticada passa a calcular a Visão Geral com dados persistidos e oferece navegação filtrada, barra de progresso clicável e mensagens globais de validação. A conta `cliente.hml@example.test` deve permanecer na área Cliente mesmo após tentativas administrativas de atribuição de papel interno.

A migration `202609090036` foi aplicada e registrada na homologação em 9 de setembro. Ela reconciliou fechamentos aprovados com o estado concluído e restringiu mudanças administrativas futuras aos papéis Técnico, Validador e Administrador. As migrations `202609110037` a `202609110040` foram aplicadas em 11 de setembro: corrigiram a referência às colunas inexistentes da função de papéis, aceitaram e-mail válido de caixa real mantendo `origem=demonstracao`, adicionaram painel administrativo, bloqueio efetivo, anexos internos, inteligência operacional, anexos em mensagens e leituras. O lint remoto terminou sem erros. A Edge Function `gerenciar-usuarios` foi publicada para convites e edição administrativa; a entrega de e-mail continua dependendo do remetente SMTP e das URLs autorizadas no Supabase Auth.

## Lote de contas e análise — 14 de setembro de 2026

A migration `202609140041_contas_analiticas_e_detalhes_portal.sql` acrescenta cargo e CNPJ do empregador ao perfil demonstrativo, amplia as leituras administrativas e entrega descrição, material, quantidade e prazo ao portal do Cliente. O CNPJ integral permanece restrito ao Administrador e à função de provisionamento; auditoria registra apenas os quatro dígitos finais. Antes de considerar este lote homologado, confirmar:

1. convite para Cliente e funcionário com empresa, CNPJ e cargo `Outro`;
2. permanência em `/portal?definir=senha` até a senha ser salva;
3. recuperação por `/portal?recuperar=senha`, sem redirecionamento ou retorno após logout;
4. duas abas independentes, uma como Administrador e outra como Cliente;
5. edição de razão social, CNPJ, nome, e-mail e cargo do contato, com auditoria;
6. busca, filtros, ordenação e paginação da equipe; análise e ordenação da carteira;
7. necessidade multilinha, ordenações operacionais e gráficos de Conhecimento;
8. fechamento de janelas com `Esc`.

Aplicação confirmada no SQL Editor em 14 de setembro: o histórico remoto avançou de `202609110040` para `202609140041`, e a consulta pós-aplicação confirmou `cargo_profissional` e `listar_portal_cliente`. A função `gerenciar-usuarios` foi republicada no mesmo projeto. A prova completa de recriação do banco e pgTAP permanece no GitHub Actions.

## CMS e idiomas — 15 de setembro de 2026

A migration `202609150042_cms_publico_multilingue.sql` cria publicação por idioma sobre as tabelas de conteúdo já existentes. A prova pgTAP deve confirmar leitura PT-BR/EN/DE, fallback explícito, edição e publicação exclusivas do Administrador e auditoria. A interface deve ser homologada assim:

1. como Administrador, abrir `Conteúdo público`, pesquisar um cabeçalho e alternar entre PT-BR, EN e DE;
2. salvar uma nova versão sem publicá-la e confirmar que a página pública ainda apresenta a versão anterior;
3. publicar a versão e recarregar a página pública correspondente;
4. retirar uma tradução apenas por procedimento técnico controlado e confirmar o aviso de fallback em português;
5. como Técnico e Validador, confirmar que o módulo editorial não aparece;
6. em desktop e celular, alternar o seletor de idioma e confirmar que a escolha permanece na mesma rota;
7. observar que este lote localiza os três cabeçalhos conectados; demais textos continuam em português até a migração progressiva e não devem ser considerados traduzidos.

A migration foi aplicada e reconciliada no projeto remoto em 15 de setembro. O GitHub Actions `34924980385` recriou o banco do zero até `042` e aprovou as 65 provas pgTAP, além de lint, 103 testes unitários, build e 26 cenários E2E em Chromium desktop e Pixel 7. A fonte `6026847ff6e68401ea74e435a3c843c5cca5822a` foi publicada como versão 41. A homologação manual ainda deve cobrir edição, rascunho sem publicação, publicação e fallback, e não substitui a revisão humana das traduções integrais que serão adicionadas progressivamente.

## Lote editorial 043 — preparado em 15 de setembro de 2026

O lote acrescenta revisão Validador → Administrador, acontecimentos com mídia localizada, tradução reativa das superfícies pública/Cliente, agrupamento multiequipamento e reformulação administrativa. A migration `043` foi aplicada e o histórico remoto foi reconciliado até ela; o lint remoto não encontrou erros (permanecem cinco avisos anteriores de volatilidade/variáveis não lidas). O GitHub Actions `35000617846` recriou o banco do zero, aprovou 70 provas pgTAP, 108 testes unitários, build e 26 E2E em desktop e Pixel 7.

A fonte `eb63126546d6f5fe166d8d0e528037c51cd197fd` foi publicada com sucesso como versão 42 no endereço oficial em 15 de setembro de 2026. O GitHub Actions `35001303916`, executado sobre essa fonte, também terminou integralmente verde.

Homologar manualmente: editar acontecimentos como Validador; confirmar que não publica; enviar; aprovar e publicar como Administrador; alternar os três idiomas na página inicial e Cliente; conferir mídia específica; abrir proposta multiequipamento como uma linha; editar todos os contatos de uma empresa na mesma janela; navegar pelos quatro indicadores administrativos; conferir gráficos de Conhecimento.

## Auditoria corretiva e lote 044 — 15 de setembro de 2026

A releitura dos requisitos encontrou duas entregas apenas parciais no lote anterior: textos técnicos e estados secundários do Cliente ainda podiam permanecer em português, e a interface do CMS era uma lista de cartões, não uma miniatura clicável da página inicial. A migration `044` e a interface correspondente corrigem essas lacunas.

A migration `044` foi aplicada e reconciliada no projeto remoto em 15 de setembro. O GitHub Actions `35040382203` aprovou lint, 114 testes unitários, build, 26 cenários E2E em Chromium desktop e Pixel 7 e 72 provas pgTAP após recriar o banco do zero até `044`. O lint remoto não encontrou erros; permanecem os cinco avisos legados já registrados. A fonte `2eb039d32a7d06e303515856ee1091631b365c3b` foi publicada com sucesso como versão 44 no endereço oficial.

Homologar manualmente: alternar PT-BR/EN/DE no acesso, catálogo, cada uma das seis fichas técnicas, solicitação e Cliente; confirmar textos, validações, formatos de data e moeda; no CMS, alternar o idioma da miniatura, clicar em hero/diferencial/estrutura/acontecimentos/chamada, modificar título, texto e mídia, salvar e confirmar que a página pública não muda antes de aprovação e publicação. Confirmar também que não é possível criar conteúdo editorial com chave `equipamentos.*`.

## Ajustes do feedback e lote 045 — 17 de setembro de 2026

A migration `202609160045_cms_midia_e_secoes_fixas.sql` transforma a mídia editorial em upload para bucket público próprio, cuja escrita é limitada a Validador e Administrador, e impede a criação de novas seções tanto na interface quanto na função do banco. A seção `inicio.estrutura` aceita uma galeria adicional em seu JSON versionado; cada idioma mantém sua própria lista e somente a versão publicada chega à página inicial. A mesma migration substitui o título publicado por “Novidades no Centro”, “News from the Center” e “Neuigkeiten aus dem Zentrum”.

Homologar como Validador e Administrador: confirmar ausência de “Novo”; clicar em uma seção na miniatura; arrastar uma imagem e salvar; em Estrutura, adicionar e remover itens do carrossel; verificar que rascunho não altera a página pública; enviar, aprovar e publicar; confirmar que Técnico não vê o módulo nem grava no bucket. Em PT-BR/EN/DE, conferir “Ordenar”, contagem de resultados, materiais, nomes das etapas e as sete legendas do carrossel. A regra vigente continua exigindo CNPJ brasileiro. Conversão de valores e PDF por idioma permanecem pendentes de política institucional de câmbio e versionamento, para não romper o congelamento e o hash do documento emitido.

O Actions `35240877511` recriou o banco duas vezes até `045` e aprovou as 74 provas pgTAP, além de 115 testes unitários, build e 26 E2E. A fonte `aca0affd44728b8c371d688f4021a46a0e446ac5` foi publicada como versão 46 no Sites. O `db push` remoto não alterou a homologação porque as oito conexões temporárias ao pooler expiraram, mas o responsável confirmou depois a execução bem-sucedida da `045` pelo SQL Editor; a mensagem sem linhas retornadas é normal para esse script. O PostHog foi removido integralmente no lote seguinte, pois servia apenas a uma atividade acadêmica.

## Feedback homologado e lote 046 — 21 de setembro de 2026

O relatório `relatorio_testes_pedidos_de_melhoria.docx` registra como aprovados todos os fluxos não citados e concentra o novo lote em visualização interna de documentos, controle arrastável de progresso com confirmação, localização alemã, singular de contagem, visualização de Conhecimento, overflow administrativo e carrosséis editoriais. A migration `202609210046_carrosseis_editoriais.sql` adiciona `inicio.setores` em PT-BR/EN/DE, mantém uma ou mais mídias por setor, acrescenta mídia versionada a cada novidade e rejeita no banco carrosséis sem arquivo, legenda ou descrição acessível. Homologar o fluxo editorial completo: Validador salva e envia; Administrador aprova e publica; somente então a página pública muda. Confirmar proporção consistente com uma, duas e três mídias, troca de idioma e impossibilidade de salvar um setor sem mídia.

Estado técnico confirmado em 21 de setembro: Actions `35666547303` verde, incluindo recriação integral do banco até `046`; aplicação remota concluída pelo SQL Editor; API pública conferida nos três idiomas com quatro setores, quatro mídias setoriais e três novidades com mídia por idioma. A aplicação foi publicada como versão 47 no endereço oficial. Permanecem como homologação humana os testes editoriais de adicionar/remover múltiplas mídias, aprovar/publicar e conferir a proporção visual.

## Mídias reais e novidades — lote 047

O relatório de 22 de setembro solicita substituir as mídias ilustrativas dos setores pelas imagens e vídeos reais fornecidos, colocar vídeos de operação nas páginas da PRISMO e do T-SCAN, corrigir a legenda da PRISMO e publicar acontecimentos localizados. A migration `202609220047_midias_reais_e_novidades.sql` publica quatro setores com os novos carrosséis e quatro acontecimentos nos três idiomas. Homologar: reprodução dos vídeos, navegação de todos os carrosséis, legenda “ZEISS PRISMO no Centro”, troca PT-BR/EN/DE e ausência deliberada de imagem no cartão futuro da acreditação INMETRO.

Estado técnico confirmado em 22 de setembro: commit `8dd905b`; Actions `35780682981` verde com lint, 117 testes unitários, build, 30 E2E em Chromium desktop/Pixel 7 e 78 provas pgTAP após recriação integral do banco até `047`. A migration foi aplicada pelo SQL Editor e registrada no histórico remoto; a consulta de conferência retornou quatro itens publicados para `inicio.acontecimentos` e quatro para `inicio.setores` em PT-BR, inglês e alemão. A aplicação foi publicada como versão 49 e teve legenda, carrossel setorial, acontecimentos e carregamento das mídias conferidos visualmente no endereço oficial.

## Carrosséis sem obstrução e vídeos sob demanda — lote 048

Homologar em desktop e celular: abrir a página inicial, chegar a “Soluções organizadas por setor” e confirmar que legenda, opções de mídia e setas aparecem abaixo do vídeo, sem cobrir a imagem; alternar todas as mídias por clique, toque e setas do teclado; repetir nas páginas PRISMO e T-SCAN e em “Novidades no Centro”. Ao abrir ou recarregar o Site no topo, confirmar que vídeos fora da área visível não iniciam downloads integrais antecipados; ao aproximar a rolagem, o vídeo deve carregar, reproduzir sem som, repetir e manter controles. A estratégia usa `preload="metadata"` e observação de visibilidade, substituindo o download completo em blob e a pré-carga de todos os itens.
