# Requisitos

## Funcionais prioritários

1. Publicar catálogo, equipamentos, institucional, contato, privacidade e solicitação em três idiomas, com português como conteúdo canônico e fallback.
   - O escopo trilíngue compreende a área pública e a área autenticada do Cliente: PT-BR, inglês e alemão. A área interna dos funcionários permanece somente em português.
2. Permitir solicitação personalizada quando a necessidade não estiver classificada no catálogo, sem obrigar o cliente a escolher uma categoria incorreta.
3. Manter conteúdo estruturado com rascunho, prévia, publicação, arquivo, histórico e restauração.
4. Permitir cadastro verificado, vínculo aprovado com empresa e múltiplos contatos convidados.
5. Receber respostas configuráveis e até cinco arquivos por solicitação: PDF/imagem até 10 MB; CAD até 50 MB; armazenamento privado e somente download.
6. Criar propostas com vários itens, versões e PDF imutável; aceitar/recusar a versão inteira e solicitar revisão.
7. Registrar aceite autenticado da pré-proposta com pessoa, empresa, versão do texto e data; em produção, capturar também o endereço de rede por endpoint protegido e juridicamente aprovado.
8. Registrar execução, fechamento, realizado, causas, retrabalho, mudança de escopo e lição.
   - O Técnico registra e envia o fechamento; Validador ou Administrador aprova ou devolve com justificativa.
   - Somente Administrador atribui ou reatribui o Técnico responsável; o Técnico acessa apenas execuções atribuídas, enquanto Validador e Administrador supervisionam todas as execuções demonstrativas.
9. Recomendar por mesmo serviço, similaridade controlada e faixas de confiança; com ao menos cinco casos elegíveis, persistir e exigir justificativa fora de Q1–Q3 antes da validação.
10. Trocar mensagens humanas persistentes em tempo real, sem anexos, presença ou recibo de leitura.
11. Separar visual e logicamente dados reais e demonstrativos; permitir reset apenas ao Administrador.
12. Permitir que Validador e Administrador consultem custos-hora e que somente Administrador versione esses valores, sempre na origem ativa e sem exclusão de histórico.
13. Aplicar hierarquia cumulativa aos perfis internos: Validador faz tudo que Técnico faz; Administrador faz tudo que Validador faz. Técnico, Validador e Administrador criam, corrigem e enviam os próprios orçamentos; somente Validador e Administrador os aprovam, devolvem ou rejeitam, sempre com justificativa nas decisões negativas; somente Administrador publica uma versão aprovada com PDF imutável.
14. Tratar o documento comercial do laboratório como pré-proposta informal, contendo no mínimo destinatário, valor e prazo de pagamento desejado; a proposta oficial é produzida no Nectar, que permanece sem integração e fora do escopo. O aceite do Cliente manifesta interesse, e somente o Administrador confirma o início após verificar o trâmite institucional.
15. Permitir solicitação pública sem login com CNPJ, nome da empresa, necessidade simplificada e prazo de pagamento desejado; persistência real só pode ser ativada em produção com proteção antiabuso, criptografia e texto jurídico aprovado.
16. Permitir que um Cliente autenticado registre vários trabalhos simultâneos para a empresa já vinculada, sem repetir CNPJ ou ativação, e alterne livremente qual trabalho acompanha. Uma entrada pública posterior com o mesmo e-mail deve reutilizar o vínculo ativo; divergência do CNPJ informado permanece como metadado auditável de triagem e não cria outra empresa automaticamente.
16. Convidar o cliente para a área autenticada somente após a análise, com vínculo aprovado à empresa, aviso de privacidade versionado, etapas visuais do trabalho e mensagens persistentes.
17. Organizar a descoberta pública por setor — indústria e processos, automotivo e mobilidade, aeronáutico, ferramentaria e desenvolvimento de produto — filtrando os serviços técnicos aplicáveis.
18. Oferecer contato por `mailto:` e cópia do endereço, VLibras na versão em português, copyright, tipografia móvel legível e vídeos sem corte de conteúdo.
19. Oferecer pesquisa textual e filtros de estado/contexto nas listas operacionais do laboratório e nos trabalhos do Cliente, sem ampliar o conjunto autorizado pela RLS.
20. Ao recusar uma pré-proposta emitida, o Cliente informa o ajuste necessário; a decisão é auditada e libera a equipe para criar e emitir outra pré-proposta sem apagar o histórico.

## IA

Gerar rascunho de lição, responder publicamente apenas com conteúdo publicado e explicar cálculos/resumir lições autorizadas internamente. Todo envio interno exige sanitização e prévia. A IA nunca calcula valor, esforço, quartil, confiança ou fator.

## Não funcionais

- WCAG AA, navegação por teclado, foco visível e movimento reduzido.
- RLS e negação por padrão; auditoria de transições sensíveis.
- Precisão decimal, congelamento de valores e documentos imutáveis.
- Chrome, Edge, Firefox e Safari atuais em celular, tablet e desktop.
- Backups criptografados: 14 diários e quatro semanais; restauração ensaiada.
- Alertas de erro e disponibilidade; limites de uso e Turnstile nos pontos públicos.

## Critérios críticos de aceite

Devem falhar com segurança: exclusão de dado real por reset, acesso entre empresas, aceite sem autorização, proposta expirada, arquivo inválido, lição não formalizada na recomendação, mistura de origens e vazamento de dado proibido para IA.

## Revisão operacional de 7 de setembro de 2026

- Pré-propostas novas devem nascer de uma solicitação ativada; rascunhos comerciais sem vínculo não são aceitos.
- Uma pré-proposta informa horas e data estimada de entrega e pode reservar de um a dez equipamentos distintos.
- Macroetapas só avançam em ordem, com bloqueio também no banco.
- Telefone aceita somente números, espaços, parênteses, hífen e `+` inicial, com no mínimo oito dígitos.
- Material e causa de retrabalho usam vocabulário controlado com a alternativa `Outros`.
- Cliente e membro interno podem atualizar nome e e-mail próprios; o Administrador altera funções de outros membros com auditoria.
- O Técnico não visualiza valores monetários nem prévia comercial. O Administrador consulta o histórico de custos.
- O limite é de cinco anexos: PDF/imagens até 10 MB; CAD até 50 MB por arquivo.

## Revisão operacional de 8 de setembro de 2026

- A Visão Geral interna calcula solicitações, propostas, execuções, lições e assertividade a partir dos registros persistidos da origem autorizada; cartões aplicam filtros nas áreas de destino.
- Solicitações, pré-propostas e execuções internas também apresentam cartões-resumo clicáveis que aplicam filtros na própria fila.
- O acesso oferece recuperação de senha sem revelar se o endereço está cadastrado; o link temporário permite definir uma nova senha com no mínimo dez caracteres.
- Campos numéricos usam controles numéricos nativos, limites e passos explícitos, além da validação equivalente no servidor e no banco quando persistidos.
- Enquanto o papel de Consulta não possuir um módulo útil aprovado, a administração oferece somente Técnico, Validador e Administrador.
- Cargo ou função profissional do Cliente é texto cadastral editável e não concede permissão. Papel externo e perfil interno permanecem mutuamente exclusivos.
- Trabalho não concluído pode retornar a uma etapa anterior com motivo de 10 a 1.000 caracteres; etapas posteriores são reiniciadas e a operação é auditada. Fechamento em validação deve ser resolvido antes do retorno.
- A barra da etapa permite atualização direta por clique, preservando sequência, autorização e estados coerentes de progresso.
- Campos usam restrições compatíveis com o dado esperado e apresentam motivo legível quando a validação do navegador falha; o servidor e o banco continuam como autoridade.
