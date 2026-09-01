# Homologação Supabase

## Estado validado em 1º de setembro de 2026

O site publicado está conectado ao projeto Supabase de homologação. O login por e-mail foi testado com sucesso pelo mantenedor usando Administrador e Validador. O perfil Técnico também está provisionado e teve suas autorizações validadas em transação revertida:

- `admin.hml@example.test` — Administrador;
- `validador.hml@example.test` — Validador;
- `tecnico.hml@example.test` — Técnico;
- `cliente.hml@example.test` — conta Cliente sintética ativada e validada pela interface pelo mantenedor.

Senhas, tokens e chaves não pertencem ao Git nem a este documento. O autocadastro está desabilitado, os três usuários estão confirmados e a autenticação anônima permanece desabilitada.

As migrations `202608220001` até `202609010023` estão aplicadas e registradas no histórico da homologação. Elas criam o esquema operacional, perfis, RLS, segregação de origem, versionamento auditado de custos, orçamento demonstrativo persistente e decisões internas. A migration `013` acrescenta os dados mínimos da pré-proposta, etapas visuais, ciência versionada de privacidade e RPCs do Cliente; `014` cria a entrada pública sintética, protocolo e ativação do perfil externo pelo mesmo e-mail; `015` corrige incrementalmente a limitação por e-mail, sem reescrever a migration aplicada; `016` libera a listagem e a resposta de conversas sintéticas ativadas exclusivamente para Técnico, Validador e Administrador; `017` cria a pré-proposta sobre a solicitação Cliente existente e impede uma segunda proposta ativa para o mesmo atendimento; `018` cria o bucket privado e as funções protegidas do PDF; `019` impede sua substituição depois que caminho e SHA-256 forem congelados; `020` corrige a leitura do arquivo pelo Cliente por meio de autorização protegida, sem tornar o bucket público; `021` registra o aceite autenticado da pré-proposta pelo Cliente e reserva ao Administrador a confirmação auditada do início; `022` cria modelos versionados de etapas por serviço, copia o modelo para cada execução e restringe atualizações à RPC auditada; `023` registra horas e ocorrências reais e reserva a aprovação final a Validador ou Administrador.

O mantenedor validou pela interface publicada o aceite do Cliente e a confirmação de início pelo Administrador. A migration `202609010022` foi executada e registrada em 1º de setembro. A presença da RPC foi confirmada pela API anônima, que respondeu `401 permission denied`, como esperado para uma função exclusiva de usuários autenticados.

A migration `202609010023` foi executada e registrada em 1º de setembro. As três RPCs foram reconhecidas pela API e responderam `401 permission denied` ao papel anônimo, confirmando a negação por padrão. Ela adiciona o fechamento operacional com horas reais por equipamento, custos extras, ocorrências e aprendizado; Técnico registra e Validador ou Administrador aprova ou devolve. A execução só muda para `concluido` após a aprovação.

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

A aprovação permanece distinta da publicação. Somente Administrador pode gerar e congelar o PDF e executar `aprovada → publicada`; o servidor bloqueia a transição enquanto não existirem arquivo privado e hash imutável. O aceite externo demonstrativo está preparado na migration `021`; clientes e dados reais permanecem fora do recorte atual.

## Validação pela interface e próximo passo

O mantenedor confirmou pela interface publicada que o Cliente cria solicitações e troca mensagens com a equipe. As migrations `013` a `017` mantêm esse fluxo limitado à origem `demonstracao`. A próxima validação deve confirmar:

1. geração e download interno do PDF pelo Administrador depois da aprovação;
2. bloqueio da emissão enquanto o PDF não estiver congelado;
3. emissão e download íntegro pelo Cliente, sem custos, margens ou rascunhos;
4. aceite pelo Cliente e confirmação do início exclusivamente pelo Administrador;
5. criação e atualização das etapas visíveis de cada serviço por Técnico, Validador e Administrador;
6. fechamento registrado pelo Técnico e aprovado ou devolvido por Validador ou Administrador.

O formulário público persiste somente entradas demonstrativas e rejeita e-mails que não terminem em `.test`. Arquivos selecionados não são enviados antes da autenticação. Isso impede que a homologação seja apresentada como canal para CNPJ, contatos ou documentos reais.

Custos reais só serão carregados no futuro projeto de produção por processo privado e auditado. A planilha restrita e seus valores nunca entram no Git nem na homologação.
