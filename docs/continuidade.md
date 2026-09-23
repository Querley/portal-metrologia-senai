# Registro de continuidade

Atualizado em 17 de setembro de 2026.

Este arquivo é o ponto de retomada do desenvolvimento quando uma execução for interrompida por limite de uso, contexto, energia ou outro motivo. Antes de continuar um lote, conferir este registro, `docs/roadmap.md`, `docs/homologacao.md`, o estado da `main` e a execução mais recente do GitHub Actions.

## Último estado confirmado

- fonte publicada: `aca0affd44728b8c371d688f4021a46a0e446ac5`;
- versão pública atual: 46, publicação concluída com sucesso;
- endereço público: `https://portal-metrologia-senai.querleyjuniorodrigue.chatgpt.site`;
- migrations até `202609210046_carrosseis_editoriais.sql` confirmadas na homologação; a `046` foi validada do zero no Actions e sua leitura remota confirmou quatro setores e três novidades com mídia em PT-BR, inglês e alemão;
- GitHub Actions `35240877511`: verificação, E2E e banco/RLS concluídos com sucesso para o lote funcional `045`;
- último resultado confirmado: lint aprovado, 115 testes unitários aprovados, build aprovado e 26 testes E2E aprovados em desktop e Pixel 7; o GitHub também recriou o banco do zero, reaplicou as migrations até `045` e aprovou 74 provas pgTAP;
- `docs/atividade-aula-07.md` é um arquivo local do mantenedor, não versionado e não deve ser alterado ou incluído em commits sem pedido explícito.

## Lote concluído em 14 de setembro

- publicado: correção de recuperação/convite, sessão isolada por aba, convite com empresa/CNPJ/cargo, edição ampliada de Clientes, painel administrativo analítico, busca/filtros/ordenação, paginação da equipe, necessidade multilinha, gráficos de Conhecimento e fechamento de janelas com `Esc`;
- banco homologado: o SQL Editor confirmou a origem remota em `040`, aplicou `202609140041_contas_analiticas_e_detalhes_portal.sql` em transação e confirmou versão `202609140041`, coluna de cargo e função do portal; a Edge Function `gerenciar-usuarios` também foi republicada;
- testes aprovados neste ponto: lint, 100 testes unitários, build e 24 cenários E2E em desktop e Pixel 7, incluindo convite, ordenação e `Esc`;
- observação operacional: o pooler remoto encerrou ou expirou oito tentativas; por isso foi usado o SQL Editor autenticado, conforme alternativa já documentada, com registro explícito em `supabase_migrations.schema_migrations`;
- observação de homologação: a entrega efetiva de convite e recuperação ainda exige uma caixa de e-mail real; a URL pública também pode apresentar uma verificação automática do provedor a clientes sem JavaScript/cookies, o que não equivale a falha da aplicação;
- não versionar nem alterar `docs/atividade-aula-07.md`.

## Implementado e publicado no último lote

- recuperação e redefinição de senha pelo Supabase;
- papéis internos editáveis limitados a Técnico, Validador e Administrador;
- correção dos campos numéricos, equipamentos adicionais, mensagens de validação e seletor de data da pré-proposta;
- cards de resumo e filtro em Solicitações, Orçamentos e Execução;
- classificação coerente de execuções concluídas na Visão Geral e no banco;
- notificações transitórias migradas para pop-up nos fluxos revisados;
- correções de fundo e contenção horizontal da área de Orçamentos;
- instruções de uso e metodologia na página Conhecimento;
- Conteúdo Público identificado corretamente como inventário de planejamento; o CMS persistente entrou no lote seguinte;
- regra de idiomas documentada: área interna dos funcionários somente em português; área pública e área do Cliente em migração progressiva para PT-BR, inglês e alemão.

## Limites conhecidos do estado publicado

- a entrega real do e-mail de recuperação precisa ser homologada com uma caixa de entrada válida; endereços `@example.test` não recebem mensagens;
- o CMS persistente, a prévia visual clicável e a cobertura automatizada das superfícies pública e Cliente estão publicados na versão 44; permanece pendente somente a revisão linguística institucional humana;
- não existe comprovação de uma auditoria campo a campo de todos os inputs do portal;
- os gráficos precisam ser exercitados com novos registros persistidos para validar todas as atualizações;
- dados reais continuam separados dos demonstrativos. A flexibilização dessa regra não foi autorizada porque contraria os requisitos de segurança e segregação do projeto.

## Requisitos entregues no commit `3f889e8`

1. Orçamentos usa largura contida, cards fluidos e tabela com scroll próprio; E2E cobre 1366, 1100, 820 e 640 px nos dois projetos.
2. O perfil do Administrador possui convites, papéis, desempenho de equipe, pesquisa de clientes, contatos, ticket médio, edição e bloqueio auditado.
3. Conhecimento consolida serviços, horas, retrabalhos, materiais e assuntos de lições; análise comercial identificável permanece exclusiva do Administrador.
4. A Edge Function `gerenciar-usuarios` foi publicada para convite e edição; caixas de e-mail válidas são aceitas na homologação, mantendo entidades operacionais em `origem=demonstracao`.
5. A equipe visualiza e baixa anexos da solicitação na fila e na proposta; mensagens aceitam até cinco anexos de 10 MB e possuem contadores de não lidas.
6. Links e rotas públicas antigas de demonstração foram removidos; existe somente uma rota de cenário E2E, negada fora do ambiente de testes.
7. Validações nativas também geram pop-up no canto superior direito; estados de autorização permanecem como conteúdo da página, não como notificação transitória.
8. Barras clicáveis de progresso usam cursor de ponteiro.
9. Solicitações, propostas e execuções usam títulos concisos com peça/descrição, serviço e empresa, incluindo quantidade quando disponível.
10. A função de troca de papel foi corrigida pela migration `037`; `040` tornou o bloqueio de Cliente efetivo em contexto, dados, anexos e mensagens.

## Ordem de retomada recomendada

1. homologar pela interface o convite em uma caixa real, a criação de senha e a recuperação de senha; isso depende da entrega SMTP externa;
2. testar envio/download de anexos em mensagens e bloqueio/desbloqueio de uma empresa;
3. homologar manualmente o lote 044 e realizar revisão humana institucional em PT-BR, inglês e alemão;
4. depois importar históricos sanitizados e ampliar as integrações de IA sem cliente, preço, margem, anexos ou identificadores.

## Lote concluído em 15 de setembro

- migration nova: `202609150042_cms_publico_multilingue.sql`, confirmada pela recriação do banco no GitHub Actions, aplicada e reconciliada na homologação;
- interface nova: editor administrativo de conteúdo com versões, pesquisa, filtro, histórico e publicação explícita;
- leitura pública conectada: cabeçalhos de Catálogo, Solicitação e Privacidade em PT-BR, inglês e alemão, com fallback português sinalizado;
- seleção de idioma: disponível no cabeçalho público, menu móvel e área do Cliente; a tradução integral dos demais textos ainda não foi realizada;
- testes aprovados: lint, 103 testes unitários, build, 26 cenários E2E em desktop e Pixel 7 e 65 provas pgTAP;
- publicação: fonte `6026847ff6e68401ea74e435a3c843c5cca5822a`, versão pública 41, concluída com sucesso no endereço oficial;
- pendente após este lote: migrar o conteúdo integral das áreas pública e Cliente e homologar as traduções com revisão humana.

## Ponto exato de retomada — lote 043

Implementado e publicado: perfil administrativo recolhível, indicadores clicáveis, janela única de edição empresarial/contatos, lista densa de Clientes, agrupamento de usos de máquinas por versão, gráficos de inteligência, catálogo reativo PT-BR/EN/DE, acontecimentos públicos e CMS com aprovação administrativa. Arquivo pessoal `docs/atividade-aula-07.md` permanece fora do Git.

Validado localmente: lint sem erros, 108 testes unitários e 26 E2E em Chromium desktop e Pixel 7. Validado no Actions `35001303916`: build, mesmos testes de interface e 70 provas pgTAP com banco recriado até `043`. A migration `043` está aplicada e reconciliada na homologação; o lint remoto não tem erros. A fonte `eb63126546d6f5fe166d8d0e528037c51cd197fd` foi publicada como versão 42 no endereço oficial. Pendente: homologação manual do fluxo editorial e revisão linguística humana dos textos técnicos longos; não repetir banco, testes ou publicação.

## Ponto exato de retomada — lote 044

Auditoria corretiva implementada localmente: cobertura PT-BR/EN/DE de todos os textos estruturais, serviços, setores e conteúdo técnico dos seis equipamentos; acesso e recuperação localizados; notificações e validações do Cliente localizadas; quatro regiões da página inicial conectadas ao CMS; miniatura clicável com prévia do rascunho; fichas técnicas bloqueadas fora do escopo editorial. Migration nova: `202609150044_inicio_editavel_e_traducao_integral.sql`.

Validação concluída: lint aprovado, 114 testes unitários aprovados, build aprovado e 26 E2E aprovados em Chromium desktop e Pixel 7. O GitHub Actions `35040382203` recriou o banco até `044` e aprovou 72 provas pgTAP. A migration está aplicada e reconciliada na homologação; o lint remoto não encontrou erros e preserva cinco avisos legados conhecidos. A fonte `2eb039d32a7d06e303515856ee1091631b365c3b` foi publicada como versão 44 no endereço oficial. Pendente apenas a homologação manual e a revisão linguística institucional; não repetir banco, testes ou publicação.

## Ponto exato de retomada — lote 045

Feedback visual de 16 de setembro implementado localmente: “Novidades no Centro”; filtros compartilhados traduzidos; etapas, materiais e legendas dinâmicas cobertos em inglês e alemão; formulário estrangeiro explica que CNPJ é cadastro brasileiro; CMS sem criação de seções, com miniatura principal, editor acima do inventário, fluxo compacto, upload por clique/arrastar e carrossel da estrutura administrável; lista de Clientes mais compacta. A migration `202609160045_cms_midia_e_secoes_fixas.sql` cria o bucket público de mídia com escrita restrita, bloqueia novas chaves editoriais e atualiza o título publicado nos três idiomas.

Validação concluída: lint aprovado, 115 testes unitários, build, 26 E2E em Chromium desktop e Pixel 7 e 74 provas pgTAP no Actions `35240877511`, incluindo recriação integral até `045`. A versão 46 foi publicada na fonte `aca0affd44728b8c371d688f4021a46a0e446ac5`. A aplicação da migration `045` foi posteriormente confirmada pelo responsável no SQL Editor; retorno sem linhas é o comportamento esperado de uma migration estrutural. A exibição automática de propostas em USD/EUR e PDFs congelados por idioma não deve ser improvisada: depende da fonte e da política institucional de câmbio, pois as propostas atuais são emitidas e congeladas em BRL. O CNPJ continua obrigatório porque o requisito vigente atende empresas brasileiras; suporte a empresas estrangeiras requer nova regra de negócio. O PostHog, que existia apenas para uma atividade acadêmica, foi removido integralmente no lote seguinte por decisão do responsável.

## Ponto exato de retomada — lote 046

Feedback do relatório de testes incorporado: PDFs e imagens protegidos passam a abrir em um visualizador interno com opção secundária de download; progresso de etapa usa controle arrastável e só persiste após “Salvar progresso”; formulário alemão recebeu serviços, exemplo de e-mail e orientação de data localizados; singular de resultados foi coberto; Conhecimento ganhou comparação estimado/realizado em barras e filtro explícito de serviços sem lição; ações de Clientes no perfil administrativo não extrapolam o contêiner. O CMS passa a editar carrosséis com legenda e texto alternativo para os quatro setores e para cada item de “Novidades no Centro”, preservando versões e proporção visual. A migration `202609210046_carrosseis_editoriais.sql` cria a seção `inicio.setores`, publica sementes nos três idiomas, acrescenta mídia às novidades sem reescrever versões anteriores e valida a estrutura editorial no banco. PostHog removido da aplicação. O arquivo pessoal `docs/atividade-aula-07.md` continua fora do Git.

Concluído em 21 de setembro: commit `98b9c55`, Actions `35666547303` totalmente verde, 117 testes unitários, 28 E2E em Chromium desktop/Pixel 7, build e provas de banco/RLS aprovados. A fonte foi publicada no Sites como versão 47. A `046` foi executada pelo SQL Editor com sucesso e conferida pela API remota: cada idioma retorna quatro setores, quatro mídias setoriais e três novidades com mídia.

## Ponto de retomada — lote 047

O relatório de 22 de setembro foi traduzido em ativos rastreáveis do site: vídeos reais de operação da PRISMO e do T-SCAN; carrosséis reais para indústria, automotivo, aeronáutico e ferramentaria; Congresso SINDAG, ExpoPeças, portal em desenvolvimento e preparação para acreditação INMETRO na seção de novidades; e correção da legenda da PRISMO na página inicial. A migration `202609220047_midias_reais_e_novidades.sql` é a fonte canônica das versões publicadas em PT-BR, inglês e alemão. O cartão futuro de acreditação permanece sem imagem por decisão explícita do relatório, até o fornecimento do material autorizado.

Concluído em 22 de setembro: commit `8dd905b`, Actions `35780682981` integralmente verde, 117 testes unitários, 30 E2E em Chromium desktop/Pixel 7, build e 78 provas pgTAP aprovados. A migration `047` foi executada pelo SQL Editor, registrada em `supabase_migrations.schema_migrations` e conferida remotamente: `inicio.acontecimentos` e `inicio.setores` retornam quatro itens publicados em cada um dos três idiomas. A fonte foi publicada no Sites como versão 49 e conferida no endereço oficial. Permanecem apenas a homologação editorial manual das novas mídias e o fornecimento futuro de uma imagem autorizada para o cartão INMETRO; não repetir aplicação de banco, testes automatizados nem publicação deste lote.

## Ponto de retomada — lote 048

Correção de experiência e estabilidade dos carrosséis públicos: legendas, seleção e setas deixam de cobrir vídeos e imagens e passam para uma faixa compacta abaixo da mídia; os seletores permanecem acessíveis por teclado e mostram a legenda completa como dica. Vídeos deixam de ser baixados integralmente e duplicados em memória durante a abertura da página: agora são carregados nativamente, com apenas metadados e somente quando se aproximam da área visível. A mudança reduz tráfego, memória e concorrência de downloads, causa provável das falhas intermitentes observadas ao abrir o Site. Nenhuma migration é necessária.

## Ponto de retomada — lote 049

Revisão pública de 23 de setembro: o cabeçalho das páginas secundárias foi alinhado ao da página inicial e passa ao menu compacto antes que textos ou ações quebrem linha; o painel de soluções por setor não força mais altura vazia abaixo do carrossel; a confirmação de cópia do e-mail usa o pop-up global no canto superior direito. A página “Privacidade e segurança” foi reconstruída em PT-BR, inglês e alemão com linguagem voltada ao Cliente, princípios da LGPD, categorias de dados, finalidades, controles de proteção, compartilhamento e conservação, direitos, IA com revisão humana, resposta a incidentes e referências oficiais. O conteúdo evita divulgar detalhes operacionais sensíveis e não inventa controlador, encarregado, bases legais específicas nem prazos de retenção que ainda dependam de validação institucional. Nenhuma migration é necessária.

O job `banco-e-rls` inicia somente o PostgreSQL local, conforme o fluxo oficial de CI do Supabase para migrations e pgTAP, autentica a leitura do registro GHCR com o token efêmero do próprio Actions e repete essa inicialização quando o registro responde com limitação temporária. As migrations, a recriação do banco e as provas pgTAP continuam obrigatórias e inalteradas.
