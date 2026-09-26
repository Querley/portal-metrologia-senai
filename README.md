# Portal de Metrologia SENAI

Plataforma web para solicitação, orçamento, execução e acompanhamento de serviços de metrologia. O sistema conecta clientes e equipe do laboratório, mantém o histórico técnico dos trabalhos e transforma resultados concluídos em lições aprendidas e recomendações estatísticas auditáveis.

## Acesso à homologação

**Portal publicado:** [portal-metrologia-senai.querleyjuniorodrigue.chatgpt.site](https://portal-metrologia-senai.querleyjuniorodrigue.chatgpt.site/)

O ambiente contém somente dados fictícios preparados para avaliação. Não envie informações pessoais, arquivos industriais ou dados confidenciais reais.

### Contas da equipe

| Perfil | Nome | E-mail | Senha |
| --- | --- | --- | --- |
| Administrador | Matheus Silva | `matheus.silva.demo@fieg.com.br` | `matheus.silva.demo` |
| Validador | Sebastião | `sebastiao.demo@fieg.com.br` | `sebastiao.demo` |
| Técnico | João Rodrigues | `joao.rodrigues.demo@fieg.com.br` | `joao.rodrigues.demo` |

### Contas de clientes

| Nome | Empresa | E-mail | Senha |
| --- | --- | --- | --- |
| Camila Ferreira | Metalforte | `camila.ferreira@metalforte.test` | `camila.ferreira` |
| Bruno Almeida | Aerotech | `bruno.almeida@aerotech.test` | `bruno.almeida` |
| Larissa Campos | Precision | `larissa.campos@precision.test` | `larissa.campos` |

As credenciais são exclusivas da homologação e estão publicadas intencionalmente para permitir a avaliação. A aplicação final deve usar contas individuais e senhas privadas.

## O que pode ser avaliado

- Site público responsivo em português, inglês e alemão;
- Catálogo de serviços, equipamentos, setores atendidos e novidades;
- Solicitação pública de serviço, validação de campos e anexos privados;
- Login, logout, recuperação de senha e sessões independentes por aba;
- Área do Cliente com vários trabalhos simultâneos, propostas, execução, mensagens e documentos;
- Criação, revisão, publicação, aceite e recusa motivada de pré-propostas;
- Pré-propostas com vários equipamentos e PDF privado com verificação de integridade;
- Atribuição de Técnico, etapas ordenadas, progresso, retrabalho e retorno justificado de fase;
- Fechamento pelo Técnico e aprovação ou devolução por Validador/Administrador;
- Lições aprendidas, comparação estimado versus realizado e recomendação estatística;
- Gestão administrativa de usuários, clientes, funções, bloqueios e custos-hora;
- CMS trilíngue com fluxo de revisão e publicação;
- Busca, filtros, ordenação, indicadores navegáveis e notificações;
- Controle de acesso por perfil, RLS no banco e segregação entre dados reais e demonstrativos.

## Guia rápido de uso

### Visitante

1. Abra a página inicial e alterne entre **PT-BR**, **EN** e **DE**.
2. Consulte **Serviços**, **Novidades no Centro** e **Equipamentos**.
3. Clique em **Solicitar orçamento** para registrar uma necessidade sem login.
4. Preencha somente dados fictícios. O protocolo exibido confirma o envio.

### Cliente

1. Clique em **Entrar** e use uma das contas de cliente.
2. Na visão geral, clique nos indicadores para filtrar os trabalhos.
3. Abra um trabalho para consultar solicitação, proposta, etapas, mensagens e anexos.
4. Uma proposta publicada pode ser aceita ou recusada com justificativa.
5. Use **Nova solicitação** para criar outro trabalho para a mesma empresa.

### Técnico

1. Entre como João Rodrigues.
2. Em **Execução**, abra um trabalho atribuído ao Técnico.
3. Atualize o progresso respeitando a ordem das etapas.
4. Registre ocorrências, retrabalho e horas realizadas.
5. Envie o fechamento para aprovação. Valores comerciais não devem aparecer para esse perfil.

### Validador

1. Entre como Sebastião.
2. Revise pré-propostas encaminhadas pela equipe.
3. Em **Execução**, aprove ou devolva um fechamento com justificativa.
4. Em **Conhecimento**, formalize lições e consulte indicadores operacionais.
5. Em **Conteúdo público**, crie ou revise conteúdo editorial; a publicação final continua sob controle administrativo.

### Administrador

1. Entre como Matheus Silva.
2. Em **Solicitações**, selecione uma solicitação e inicie uma pré-proposta vinculada.
3. Em **Orçamentos**, revise, gere o PDF e publique a versão para o Cliente.
4. Em **Execução**, atribua o Técnico, inicie o trabalho e acompanhe o fluxo completo.
5. Em **Meu perfil**, consulte indicadores, cadastre usuários, altere funções e administre clientes.
6. Em **Custos-hora**, consulte o histórico e registre uma nova vigência.
7. Em **Conteúdo público**, aprove e publique versões nos três idiomas.

## Fluxo principal

```text
Solicitação
   → triagem e pré-proposta vinculada
   → revisão interna
   → publicação do PDF
   → aceite ou recusa do Cliente
   → atribuição e início pelo Administrador
   → execução ordenada pelo Técnico
   → fechamento técnico
   → aprovação final
   → lição aprendida formalizada
   → recomendação para trabalhos futuros
```

O documento gerado no portal é uma **pré-proposta**. A proposta comercial oficial permanece no processo institucional externo do SENAI.

## Regras importantes

- Somente o **Administrador** publica pré-propostas, inicia execuções, gerencia funções e altera custos-hora.
- O **Técnico** opera apenas trabalhos atribuídos e não recebe valores comerciais.
- **Validador** e **Administrador** aprovam ou devolvem fechamentos e formalizam lições.
- O **Cliente** acessa somente empresas e trabalhos aos quais está vinculado.
- Etapas devem respeitar a ordem; retornos exigem justificativa e permanecem auditados.
- Uma lição somente participa das recomendações depois de formalizada.
- A recomendação usa casos concluídos do mesmo serviço e não mistura dados de origens diferentes.
- Dados reais e demonstrativos possuem segregação obrigatória em consultas, indicadores e exportações.

## Área de Conhecimento

A página compara esforço, duração e custo estimados com os valores realizados. **Esforço** representa horas efetivamente consumidas pela equipe e pelos equipamentos; **duração** representa o tempo corrido entre o início e a conclusão.

Após a conclusão, o Técnico registra uma lição. Validador ou Administrador formaliza essa lição, tornando o caso elegível para a recomendação. O cálculo usa mediana, quartis e fator de correção:

- **0 casos:** sem base elegível;
- **1 a 4 casos:** referência individual, confiança baixa;
- **5 a 14 casos:** mediana e faixa Q1–Q3, confiança média;
- **15 ou mais casos:** faixa consolidada e confiança alta.

Os valores são determinísticos. O assistente textual não calcula preços, quartis ou recomendações e recebe somente conteúdo previamente sanitizado.

## Tecnologias

| Camada | Tecnologias |
| --- | --- |
| Interface | Next.js 16, React 19, TypeScript 5 e CSS responsivo |
| Validação e cálculos | Zod e Decimal.js |
| Ícones e acessibilidade | Lucide React, navegação por teclado, foco visível e VLibras |
| Backend | Supabase PostgreSQL, Auth, Storage, Realtime, RPCs e Edge Functions |
| Segurança | Row Level Security, funções protegidas, trilha de auditoria e documentos privados com SHA-256 |
| Testes | Vitest, Playwright e pgTAP |
| Qualidade | ESLint, TypeScript e GitHub Actions |
| Hospedagem | Sites sobre runtime compatível com Cloudflare Workers |

## Arquitetura e segurança

A interface nunca é a única barreira de permissão. Transições sensíveis acontecem no servidor, as políticas RLS restringem leitura e escrita e ações administrativas geram auditoria. Anexos e PDFs ficam em buckets privados e são liberados por vínculo e perfil.

Valores financeiros usam aritmética decimal. Custos vigentes são versionados e congelados na proposta publicada. Lições formalizadas são imutáveis: correções criam uma nova revisão.

Detalhes adicionais estão em:

- [Arquitetura](docs/arquitetura.md)
- [Domínio e regras de negócio](docs/dominio.md)
- [Requisitos](docs/requisitos.md)
- [Visão e escopo](docs/visao-e-escopo.md)
- [Roteiro de demonstração](docs/roteiro-demonstracao.md)

## Execução local

Requer Node.js 22.13 ou superior.

```bash
npm install
npm run dev
```

Copie `.env.example` para `.env.local` e preencha somente as configurações públicas de um projeto Supabase autorizado. Nunca versione o arquivo preenchido.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

O banco completo é construído pelas migrations em `supabase/migrations`. A pasta `supabase/tests` contém as provas de regras e permissões executadas contra uma instância local isolada.

## Verificação

```bash
npm run lint
npm run test
npm run test:e2e
npm run build
```

Ou execute lint, testes unitários e build em sequência:

```bash
npm run verificar
```

O workflow em `.github/workflows/qualidade.yml` também executa as verificações automatizadas e os testes de banco.

## Estrutura do repositório

- `app/`: páginas públicas e rotas do portal;
- `componentes/`: módulos de interface e fluxos autenticados;
- `lib/`: contratos, cálculos, validações e regras de domínio;
- `supabase/migrations/`: evolução versionada do banco;
- `supabase/functions/`: funções administrativas e operações protegidas;
- `supabase/tests/`: testes de RLS e regras de persistência;
- `tests/e2e/`: cenários automatizados em desktop e mobile;
- `docs/`: requisitos, arquitetura, domínio e material de avaliação;
- `public/`: imagens e vídeos autorizados usados no portal.

## Limites desta versão

- A URL publicada é um ambiente de homologação, não produção.
- Integrações institucionais com Nectar e provedores corporativos de câmbio ainda não fazem parte desta versão.
- A revisão jurídica e linguística institucional deve ocorrer antes do uso com dados reais.
- O conteúdo técnico das páginas de equipamentos é mantido no código; o CMS atua nas regiões editoriais previstas da página pública.
