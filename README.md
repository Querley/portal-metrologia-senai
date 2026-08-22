# Portal de Metrologia SENAI

Plataforma web para solicitar, orçar e acompanhar serviços de metrologia, comparar estimativas com resultados e transformar lições validadas em recomendações para novos orçamentos.

## Estado atual

O repositório contém uma experiência pública responsiva, painel demonstrativo, contratos e cálculos do domínio, migrações Supabase, massa sintética e documentação de produto. Sem credenciais, a interface opera apenas com dados de demonstração locais; integrações externas ficam desativadas de forma explícita.

## Executar

Requer Node.js 22.13 ou superior.

```bash
npm install
npm run dev
```

Copie `.env.example` para `.env.local` apenas quando houver ambientes Supabase e chaves aprovadas. Nunca versione o arquivo preenchido.

## Verificar

```bash
npm run verificar
```

## Estrutura

- `app/`: páginas públicas, portal e área interna.
- `componentes/`: componentes acessíveis e módulos de experiência.
- `lib/`: contratos, cálculos e dados demonstrativos.
- `supabase/`: esquema, RLS, funções e massa de demonstração.
- `docs/`: produto, domínio, arquitetura, roteiro e decisões.
- `fontes/`: catálogo versionável; originais locais ignorados.
- `public/imagens/`: cópias publicáveis da marca e do acervo fotográfico autorizado.

## Segurança

A aplicação foi desenhada para negar acesso por padrão. Dados reais e demonstrativos usam origens obrigatórias e não podem aparecer juntos. Os documentos-fonte e a planilha de custos permanecem locais e fora do Git.

Consulte [docs/roadmap.md](docs/roadmap.md) para o plano até a entrega e [docs/roteiro-demonstracao.md](docs/roteiro-demonstracao.md) para validar a versão.
