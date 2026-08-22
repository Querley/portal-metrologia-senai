# Orientações para agentes

## Missão

Construir o Portal de Metrologia SENAI priorizando o ciclo **orçar → executar → comparar → aprender → recomendar** e a entrega web de 13 de setembro de 2026. Toda mudança deve preservar segurança, rastreabilidade e possibilidade de evolução para aplicativo móvel.

## Regras obrigatórias

- Escreva código, banco, commits e documentação em português; identificadores não levam acentos.
- Toda entidade operacional deve declarar `origem` (`real` ou `demonstracao`). Nunca combine as origens em consulta, indicador, recomendação ou exportação.
- Visibilidade nova é `restrito` por padrão. Dados reais, anexos, custos, segredos e fontes originais nunca entram no Git.
- Preços, quartis, confiança e fatores são determinísticos. IA apenas explica ou resume resultados já calculados.
- Antes de enviar texto à IA, remova cliente, contato, preço, margem, anexos e qualquer identificador. Mostre a prévia sanitizada ao usuário.
- Use `Decimal` para dinheiro e taxas. Congele taxas, cotações e versões em propostas publicadas.
- Transições sensíveis acontecem no servidor e devem gerar auditoria. RLS é obrigatória, inclusive quando a interface já oculta uma ação.
- Lição formalizada é imutável; correção cria nova revisão. Somente serviço concluído com lição formalizada alimenta recomendações.
- Apagar/reiniciar demonstrações é ação exclusiva de Administrador. Dados reais nunca são apagados pelo reset.

## Qualidade e fluxo

- Execute `npm run verificar` antes de solicitar revisão.
- Teste cálculos, permissões, estados e segregação de origem. Fluxos críticos recebem teste de ponta a ponta.
- Componentes devem funcionar por teclado, conservar foco visível e buscar WCAG AA.
- Atualize os documentos relacionados quando uma regra, contrato, comando ou decisão mudar.
- Trabalhe em branches curtas, commits pequenos e PRs revisáveis. Não faça merge sem decisão do mantenedor.
- Novos arquivos de orientação só devem surgir quando houver necessidade concreta.

## Comandos

- `npm install`: instala dependências.
- `npm run dev`: inicia a aplicação local.
- `npm run test`: executa testes unitários.
- `npm run lint`: verifica qualidade estática.
- `npm run build`: gera a versão publicável.
- `npm run verificar`: executa a verificação completa.

## Fontes e ambientes

O catálogo rastreável fica em `fontes/catalogo.md`; os arquivos copiados ficam em `fontes/originais/` e são ignorados. Homologação e produção usam projetos Supabase diferentes. Nenhum dado de produção deve ser reutilizado na homologação.
