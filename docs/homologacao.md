# Homologação Supabase

## Estado validado em 27 de agosto de 2026

O site publicado está conectado ao projeto Supabase de homologação. O login por e-mail foi testado com sucesso pelo mantenedor usando Administrador e Validador. O perfil Técnico também está provisionado e teve suas autorizações validadas em transação revertida:

- `admin.hml@example.test` — Administrador;
- `validador.hml@example.test` — Validador;
- `tecnico.hml@example.test` — Técnico.

Senhas, tokens e chaves não pertencem ao Git nem a este documento. O autocadastro está desabilitado, os três usuários estão confirmados e a autenticação anônima permanece desabilitada.

As migrations `202608220001` até `202608270012` estão aplicadas e registradas no histórico remoto. Elas criam o esquema operacional, perfis, RLS, segregação de origem, versionamento auditado de custos, orçamento demonstrativo persistente e decisões internas. A migration `007` corrige o gatilho compartilhado de origem sem remover histórico; `008` e `009` acrescentam aprovação interna; `010` e `011` protegem devolução, rejeição, reenvio e publicação exclusiva do Administrador; `012` permite ao autor corrigir rascunho ou proposta devolvida com recálculo no servidor.

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

A aprovação permanece distinta da publicação. Somente Administrador pode executar `aprovada → publicada`, e o servidor bloqueia a transição enquanto não existirem PDF privado e hash imutável. A geração do PDF, o aceite externo e clientes reais permanecem fora do recorte atual.

Custos reais só serão carregados no futuro projeto de produção por processo privado e auditado. A planilha restrita e seus valores nunca entram no Git nem na homologação.
