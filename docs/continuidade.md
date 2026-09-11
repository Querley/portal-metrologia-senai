# Registro de continuidade

Atualizado em 11 de setembro de 2026.

Este arquivo é o ponto de retomada do desenvolvimento quando uma execução for interrompida por limite de uso, contexto, energia ou outro motivo. Antes de continuar um lote, conferir este registro, `docs/roadmap.md`, `docs/homologacao.md`, o estado da `main` e a execução mais recente do GitHub Actions.

## Último estado confirmado

- `main`, `origin/main` e a fonte publicada no Sites apontam para `285ebdccf3d0998d5688d5704662788cbb873f5d`.
- versão pública: 38;
- endereço público: `https://portal-metrologia-senai.querleyjuniorodrigue.chatgpt.site`;
- migration mais recente: `202609090036_consistencia_conclusao_e_funcoes.sql`, aplicada e reconciliada na homologação;
- GitHub Actions `34491028792`: verificação, E2E e banco/RLS concluídos com sucesso;
- último resultado local: lint aprovado, 93 testes unitários aprovados, build aprovado e 18 testes E2E aprovados em desktop e Pixel 7;
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

## Requisitos recebidos em 11 de setembro — ainda não iniciados

O texto anexado nesta conversa deve ser tratado como o próximo lote de requisitos, não como trabalho já realizado:

1. corrigir definitivamente responsividade, escala, recorte e scroll horizontal de Orçamentos;
2. ampliar perfis de funcionários e a administração de contas, incluindo desempenho, pesquisa e análise de clientes, ticket médio, bloqueio e edição controlada de contas;
3. ampliar Conhecimento para análises de clientes, serviços, produtos, técnicas e estratégias, respeitando permissões e segregação de dados;
4. implementar cadastro e gestão de novos usuários sem remover a separação obrigatória entre dados reais e demonstrativos;
5. permitir que funcionários visualizem e baixem anexos das solicitações, adicionar anexos às mensagens e contadores de lidas/não lidas;
6. remover acessos e páginas de demonstração obsoletos da tela de login, preservando somente fluxos ainda necessários;
7. auditar notificações e alertas de todo o portal para apresentação consistente no canto superior direito;
8. trocar para ponteiro de clique as áreas interativas de progresso;
9. criar títulos de trabalho mais descritivos e consistentes em todas as áreas;
10. corrigir a alteração de perfil que referencia a coluna inexistente `ativo`;
11. revisar novamente notificações da área do Cliente e o acesso interno aos arquivos anexados.

## Ordem de retomada recomendada

1. reproduzir os defeitos de Orçamentos e da alteração de perfil na versão publicada;
2. conferir o contrato atual de usuários, anexos e mensagens no banco e nas migrations;
3. dividir o lote amplo em mudanças verificáveis, começando por defeitos e segurança antes das novas análises administrativas;
4. executar lint, testes unitários, build, E2E desktop/mobile e banco/RLS;
5. atualizar este registro após cada entrega, indicando commit, migration, testes e pendências;
6. somente então enviar e publicar a revisão aprovada.

