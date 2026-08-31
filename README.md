# Portal de Metrologia SENAI

Plataforma web para solicitar, orçar e acompanhar serviços de metrologia, comparar estimativas com resultados e transformar lições validadas em recomendações para novos orçamentos.

## Estado atual

O repositório contém uma experiência pública responsiva, painel demonstrativo, contratos e cálculos do domínio, migrações Supabase, massa sintética e documentação de produto. A homologação já usa autenticação e persistência reais no Supabase, com três perfis internos sintéticos, RLS validada, custos-hora versionados e pré-propostas demonstrativas persistentes; produção continua separada e ainda não foi provisionada.

O recorte de 28–31 de agosto acrescenta descoberta por setores, solicitação sem login, dados mínimos da pré-proposta, VLibras e uma área do Cliente com perfil externo, etapas e mensagens bidirecionais persistentes. O documento emitido pelo laboratório é uma pré-proposta; a proposta oficial é criada no Nectar, sem integração com este portal. As migrations `202608280013` até `202608310017` estão aplicadas na homologação; o fluxo público persiste somente dados sintéticos com e-mail `.test`, gera protocolo, vincula a solicitação ao mesmo e-mail autenticado, abre um canal protegido e permite que a equipe crie o orçamento no mesmo atendimento, sem duplicar a solicitação.

## Executar

Requer Node.js 22.13 ou superior.

```bash
npm install
npm run dev
```

Copie `.env.example` para `.env.local` apenas quando houver ambientes Supabase e chaves aprovadas. Nunca versione o arquivo preenchido.

O acesso interno não permite autocadastro. Contas e perfis são provisionados no Supabase de homologação; sem URL e chave anônima configuradas, a área interna informa que a integração está indisponível e a demonstração local permanece separada.

O estado aplicado da homologação e o próximo recorte vertical estão registrados em [docs/homologacao.md](docs/homologacao.md). Credenciais locais e de hospedagem nunca são versionadas.

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
