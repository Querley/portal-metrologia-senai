# Domínio

## Invariantes

- `origem` é obrigatória em solicitações, propostas, serviços, lições, mensagens, indicadores e recomendações.
- Cliente externo nunca acumula perfil interno.
- Toda proposta publicada congela itens, custos, taxas, câmbio, moeda e PDF.
- Custo realizado usa a taxa válida no início real.
- Lição formalizada não é editada; revisão cria versão em validação.

## Estados

- Proposta: `rascunho → em_validacao → publicada → aceita | recusada | expirada`; uma nova versão torna a anterior `substituida`.
- Serviço: `planejado → em_execucao → concluido`; cancelamento preserva histórico.
- Lição: `rascunho → em_validacao → formalizada → superada`.
- Conteúdo: `rascunho → publicado → arquivado`; restauração cria nova versão.

Transições fora desses caminhos só podem ocorrer por função privilegiada e auditada.

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

Fator de correção = mediana de `horas realizadas ÷ horas estimadas`. Estimativa fora de Q1–Q3 exige justificativa.
