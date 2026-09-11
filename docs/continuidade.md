# Registro de continuidade

Atualizado em 11 de setembro de 2026.

Este arquivo é o ponto de retomada do desenvolvimento quando uma execução for interrompida por limite de uso, contexto, energia ou outro motivo. Antes de continuar um lote, conferir este registro, `docs/roadmap.md`, `docs/homologacao.md`, o estado da `main` e a execução mais recente do GitHub Actions.

## Último estado confirmado

- o commit de aplicação pronto para publicação é `3f889e8`; a publicação desta revisão deve ser confirmada após o GitHub Actions;
- versão pública anterior: 38;
- endereço público: `https://portal-metrologia-senai.querleyjuniorodrigue.chatgpt.site`;
- migration mais recente: `202609110040_bloqueio_cliente_efetivo.sql`, aplicada e reconciliada na homologação; lint remoto sem erros;
- GitHub Actions `34491028792`: verificação, E2E e banco/RLS concluídos com sucesso;
- último resultado local: lint aprovado, 98 testes unitários aprovados, build aprovado e 20 testes E2E aprovados em desktop e Pixel 7; a prova pgTAP nova está versionada e aguarda o executor Docker do GitHub Actions;
- `docs/atividade-aula-07.md` é um arquivo local do mantenedor, não versionado e não deve ser alterado ou incluído em commits sem pedido explícito.

## Implementado e publicado no último lote

- recuperação e redefinição de senha pelo Supabase;
- papéis internos editáveis limitados a Técnico, Validador e Administrador;
- correção dos campos numéricos, equipamentos adicionais, mensagens de validação e seletor de data da pré-proposta;
- cards de resumo e filtro em Solicitações, Orçamentos e Execução;
- classificação coerente de execuções concluídas na Visão Geral e no banco;
- notificações transitórias migradas para pop-up nos fluxos revisados;
- correções de fundo e contenção horizontal da área de Orçamentos;
- instruções de uso e metodologia na página Conhecimento;
- Conteúdo Público identificado corretamente como inventário de planejamento, ainda sem persistência de CMS;
- regra de idiomas documentada: área interna dos funcionários somente em português; área pública e área do Cliente futuramente em PT-BR, inglês e alemão.

## Limites conhecidos do estado publicado

- a entrega real do e-mail de recuperação precisa ser homologada com uma caixa de entrada válida; endereços `@example.test` não recebem mensagens;
- CMS persistente e traduções ainda não foram implementados;
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

1. confirmar GitHub Actions verde e publicar o commit `3f889e8` no Sites;
2. homologar pela interface o convite em uma caixa real, a criação de senha e a recuperação de senha; isso depende da entrega SMTP externa;
3. testar envio/download de anexos em mensagens e bloqueio/desbloqueio de uma empresa;
4. desenvolver em seguida o CMS persistente e a internacionalização PT-BR/inglês/alemão das áreas pública e Cliente;
5. depois importar históricos sanitizados e ampliar as integrações de IA sem cliente, preço, margem, anexos ou identificadores.
