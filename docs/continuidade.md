# Registro de continuidade

Atualizado em 15 de setembro de 2026.

Este arquivo é o ponto de retomada do desenvolvimento quando uma execução for interrompida por limite de uso, contexto, energia ou outro motivo. Antes de continuar um lote, conferir este registro, `docs/roadmap.md`, `docs/homologacao.md`, o estado da `main` e a execução mais recente do GitHub Actions.

## Último estado confirmado

- fonte publicada: `2eb039d32a7d06e303515856ee1091631b365c3b`;
- versão pública atual: 44, publicação concluída com sucesso;
- endereço público: `https://portal-metrologia-senai.querleyjuniorodrigue.chatgpt.site`;
- migration mais recente: `202609150044_inicio_editavel_e_traducao_integral.sql`, aplicada e reconciliada na homologação;
- GitHub Actions `35040382203`: verificação, E2E e banco/RLS concluídos com sucesso na fonte publicada;
- último resultado confirmado: lint aprovado, 114 testes unitários aprovados, build aprovado e 26 testes E2E aprovados em desktop e Pixel 7; o GitHub também recriou o banco do zero, reaplicou as migrations até `044` e aprovou 72 provas pgTAP;
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
