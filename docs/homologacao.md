# Homologação Supabase

## Estado validado em 2 de setembro de 2026

O site publicado está conectado ao projeto Supabase de homologação. O login por e-mail foi testado com sucesso pelo mantenedor usando Administrador e Validador. O perfil Técnico também está provisionado e teve suas autorizações validadas em transação revertida:

- `admin.hml@example.test` — Administrador;
- `validador.hml@example.test` — Validador;
- `tecnico.hml@example.test` — Técnico;
- `cliente.hml@example.test` — conta Cliente sintética ativada e validada pela interface pelo mantenedor.

Senhas, tokens e chaves não pertencem ao Git nem a este documento. O autocadastro está desabilitado, os três usuários estão confirmados e a autenticação anônima permanece desabilitada.

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

O formulário público persiste somente entradas demonstrativas e rejeita e-mails que não terminem em `.test`. Arquivos selecionados não são enviados antes da autenticação. Isso impede que a homologação seja apresentada como canal para CNPJ, contatos ou documentos reais.

Custos reais só serão carregados no futuro projeto de produção por processo privado e auditado. A planilha restrita e seus valores nunca entram no Git nem na homologação.

## Migration mais recente

A migration `202609020033` foi aplicada e registrada em 2 de setembro. Ela registra a recusa do Cliente com motivo, mantém o PDF como histórico e libera uma nova pré-proposta para a mesma solicitação. A prova pgTAP cobre isolamento entre empresas, persistência e auditoria da recusa, leitura histórica do PDF e criação da nova versão; sua execução continua delegada ao GitHub Actions porque o executor local exige Docker Desktop.
