# Domínio

## Invariantes

- `origem` é obrigatória em solicitações, propostas, serviços, lições, mensagens, indicadores e recomendações.
- Cliente externo nunca acumula perfil interno.
- Toda pré-proposta emitida congela itens, custos, taxas, câmbio, moeda e PDF.
- A pré-proposta do laboratório não é a proposta oficial do SENAI. O Nectar produz o documento oficial e não integra este sistema.
- A pré-proposta contém no mínimo destinatário, valor e prazo de pagamento desejado pelo cliente.
- Custo realizado usa a taxa válida no início real.
- Validador e Administrador podem consultar custos-hora; somente Administrador pode cadastrar uma nova vigência ou encerrar a vigente.
- Perfis internos são cumulativos: Validador herda as capacidades do Técnico; Administrador herda as capacidades do Validador.
- Técnico, Validador e Administrador criam, corrigem e enviam os próprios orçamentos para validação. Somente Validador e Administrador aprovam, devolvem ou rejeitam; devolução e rejeição exigem justificativa. Somente Administrador publica.
- A carga real inicial da planilha restrita usa como `vigente_desde` a data da primeira carga, pois os valores já estão em vigor e a fonte não informa uma data anterior.
- Custo-hora é versionado: uma correção encerra a vigência anterior e cria outra, sem apagar o histórico.
- Lição formalizada não é editada; revisão cria versão em validação.
- Cada execução demonstrativa possui no máximo um Técnico responsável. Somente Administrador atribui ou reatribui; Validador e Administrador mantêm visibilidade de supervisão.

## Estados

- Pré-proposta: `rascunho | devolvida → em_validacao → aprovada → publicada → aceita | recusada | expirada`; `publicada` significa emitida ao cliente pelo laboratório. Durante a validação, também pode ir para `devolvida` ou `rejeitada`. Uma rejeição exige uma nova proposta; uma nova versão torna a anterior `substituida`. O aceite autenticado representa interesse na pré-proposta informal e não substitui a proposta oficial do Nectar; somente o Administrador confirma o início depois do trâmite institucional.
- Serviço: `planejado → em_execucao → concluido`; cancelamento preserva histórico.
- Lição: `rascunho → em_validacao → formalizada → superada`.
- Conteúdo: `rascunho → publicado → arquivado`; restauração cria nova versão.

Transições fora desses caminhos só podem ocorrer por função privilegiada e auditada.

A aprovação não emite a pré-proposta. Somente Administrador promove `aprovada` para `publicada`, e apenas depois da geração do PDF privado com hash imutável. `rejeitada` representa decisão interna e exige nova proposta; `recusada` representa a decisão posterior do cliente sobre uma versão emitida.

## Área do cliente

- A solicitação inicial é pública e não exige conta.
- O acompanhamento exige usuário autenticado e vínculo empresarial previamente aprovado.
- Cliente externo nunca vê rascunhos internos, custos ou margens; vê somente pré-proposta emitida, etapas marcadas como visíveis e mensagens da própria empresa.
- Cada etapa tem ordem, estado `a_fazer | em_andamento | concluida`, progresso de 0 a 100 e data de atualização.
- Concluir todas as etapas não encerra automaticamente o trabalho. O Técnico registra o fechamento; Validador ou Administrador aprova e conclui definitivamente, ou devolve ao Técnico com justificativa.
- O Técnico visualiza e opera somente execuções formalmente atribuídas a ele. Validador e Administrador visualizam todas as execuções demonstrativas; atribuições e alterações permanecem na auditoria.
- A ciência do aviso de privacidade registra versão e data no vínculo empresarial.

## Cálculos

- custo do item = Σ(`horas totais × custo-hora vigente`) + extras.
- preço antes do ajuste = `custo × (1 + percentual de lucro)`.
- ajuste comercial total é justificado e rateado proporcionalmente.
- margem = `(valor − custo) ÷ valor`.
- desvio = `(realizado − estimado) ÷ estimado`.
- assertividade é independente para esforço, custo e duração e inicia com tolerância configurável de ±15%.

BRL é base. USD/EUR usam a convenção `1 moeda estrangeira = X BRL`, congelada por versão. Cálculos guardam precisão e arredondam exibição e totais para centavos.

## Recomendação

Casos devem ter o mesmo tipo de serviço, origem compatível, serviço concluído e lição formalizada. A ordenação usa características e recursos controlados coincidentes. O esforço é normalizado por unidade e escalado para a nova quantidade.

- 0 casos: roteiro, sem faixa.
- 1–4: casos individuais e confiança baixa.
- 5–14: Q1, mediana, Q3 e confiança média.
- 15+: quartis, fator de correção e confiança alta.

Fator de correção = mediana de `horas realizadas ÷ horas estimadas`. Com cinco ou mais casos elegíveis, estimativa fora de Q1–Q3 exige justificativa persistente de 5 a 1.000 caracteres antes do envio para validação; o servidor recalcula a faixa e bloqueia omissões.
