# Roadmap

## Marcos

- [x] **22–24 ago** — organização inicial, documentação, identidade visual, contratos e estrutura Supabase.
- [ ] **25–30 ago** — autenticação real, perfis, custos, orçamento, execução, lições, reset demonstrativo e recomendação.
- [ ] **31 ago–4 set** — empresas, solicitações, propostas, PDF, aceite, anexos e chat.
- [ ] **5–8 set** — CMS completo, catálogo, equipamentos, contato e traduções revisadas.
- [ ] **9–10 set** — gerador de lições, bot público e assistente interno com sanitização.
- [ ] **11–12 set** — E2E, RLS, acessibilidade, backup, observabilidade, documentação e ensaio.
- [ ] **13 set** — congelamento, verificação, tag e entrega.

## Estado em 31 de agosto de 2026

- [x] projeto Supabase de homologação conectado ao site publicado;
- [x] login por e-mail sem autocadastro, com Administrador, Validador e Técnico sintéticos confirmados;
- [x] perfis internos, RLS, segregação por origem e massa demonstrativa persistida;
- [x] consulta de custos para Validador/Administrador e versionamento auditado somente por Administrador;
- [x] login ponta a ponta validado pelo mantenedor com Administrador e Validador;
- [x] perfil Técnico provisionado e RLS validada em transação revertida, sem resíduos; login pela interface pendente de aceite do mantenedor;
- [x] interface persistente para consultar e versionar custos-hora, com leitura para Validador e edição somente para Administrador;
- [x] primeiro rascunho de orçamento persistente, com cálculo no servidor, custo-hora congelado, auditoria e segregação demonstrativa;
- [x] alçada de criação e aprovação confirmada: Técnico cria e envia; Validador e Administrador também executam essas ações e podem aprovar;
- [x] alçada negativa confirmada: Validador e Administrador devolvem ou rejeitam com justificativa; somente Administrador publica após PDF imutável;
- [x] correção, devolução, rejeição, reenvio e proteção da publicação implementados e validados por perfil na homologação;
- [ ] fluxo vertical persistente `orçar → executar → comparar → aprender → recomendar`;
- [ ] projeto Supabase de produção, usuários internos reais e carga privada de custos reais.

## Recorte iniciado em 28 de agosto de 2026

- [x] descoberta pública reorganizada por setores, mantendo os dez serviços técnicos filtrados;
- [x] setor aeronáutico ajustado para vídeo Bosello e mapa de desgaste;
- [ ] ampliar gradualmente as galerias setoriais com novas fotos e vídeos autorizados do laboratório;
- [x] formulário sem login com CNPJ, empresa, necessidade simplificada e prazo de pagamento;
- [x] diferencial ZEISS, contato por e-mail provisório, copyright e integração VLibras;
- [x] mídia ajustada para preservar o enquadramento e tipografia móvel revisada;
- [x] navegação pública unificada entre desktop e mobile, contato por e-mail com alternativas e área interna responsiva sem sobreposição;
- [x] área demonstrativa do cliente com aviso de privacidade, etapas visuais e mensagens;
- [x] resumo do Cliente separado entre pré-proposta e andamento, inclusive estado vazio sem falso “Concluído”;
- [x] migration aplicada para destinatário/prazo da pré-proposta, vínculo externo e etapas com RLS;
- [x] validar estrutura, permissões e RPCs internas da migration `202608280013` no Supabase de homologação;
- [x] persistir solicitação pública estritamente sintética, gerar protocolo e ativar perfil externo pelo mesmo e-mail;
- [x] substituir a lista interna estática pela fila persistente de solicitações sintéticas recebidas pelo site;
- [x] substituir as mensagens estáticas pelo canal bidirecional persistente entre Cliente e equipe, com atualização em tempo real;
- [x] permitir que o Cliente atualize o próprio nome sem alterar função, empresa ou escopo de acesso;
- [x] vincular a pré-proposta interna à solicitação ativada do Cliente, preservando protocolo, empresa, destinatário e auditoria;
- [x] validar o fluxo externo e o bloqueio de e-mail divergente em transação revertida, sem resíduos;
- [x] repetir solicitação, ativação e mensagens pela interface publicada com uma conta Cliente sintética provisionada pelo Auth;
- [ ] implementar o endpoint público de produção com Turnstile, criptografia e limites antes de persistir solicitações reais;
- [x] gerar e armazenar o PDF em bucket privado, congelar seu SHA-256 e verificar a integridade no download; o Nectar permanece fora do escopo;
- [x] corrigir a autorização de leitura do PDF pelo Cliente sem tornar o bucket público nem contornar o vínculo empresarial;
- [ ] validar pela interface publicada o ciclo `aprovar → gerar PDF → emitir → baixar como Cliente`;
- [x] aplicar a migration `202609010021`: Cliente aceita a pré-proposta emitida e somente Administrador confirma o início auditado;
- [x] validar pela interface publicada o aceite do Cliente e a confirmação de início pelo Administrador;
- [x] aprovar as macroetapas simples dos dez serviços em `docs/etapas-sugeridas-servicos.md`;
- [x] aplicar e registrar a migration `202609010022`, com modelos versionados, atualização auditada e acompanhamento em tempo real;
- [ ] validar na interface publicada a atualização das etapas pelos três perfis internos e sua leitura pelo Cliente;
- [x] preparar fechamento persistente: Técnico registra; Validador ou Administrador aprova ou devolve;
- [x] aplicar e registrar a migration `202609010023` e validar suas RPCs protegidas;
- [x] publicar e validar o fluxo de fechamento pelos três perfis internos;
- [x] aplicar a migration `202609010024` e confirmar que o Técnico visualiza trabalhos criados por outro perfil;
- [ ] modelar futuramente a atribuição de responsável por execução antes de operar com dados reais;

## Dependências institucionais

- [ ] Aprovar nome, marca e textos jurídicos.
- [ ] Definir remetente e domínio oficiais.
- [ ] Criar dois projetos Supabase e configurar MFA.
- [ ] Criar contas/chaves de Brevo, Gemini, R2 e Better Stack.
- [ ] Recuperar e revisar 5–10 ordens antigas; produção real começa vazia.

## Definição de pronto

Mudança funcional inclui estados de erro e vazio, validação, autorização, testes proporcionais, texto nos três idiomas quando público e atualização documental. Nada é considerado concluído apenas porque aparece na interface demonstrativa.
