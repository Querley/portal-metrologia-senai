# Arquitetura

## Visão geral

A interface React/TypeScript é publicada em runtime compatível com Cloudflare. Supabase fornece PostgreSQL, autenticação, MFA, Storage privado, Realtime, RLS e funções. Contratos Zod e cálculos puros são compartilhados com uma futura aplicação React Native.

```text
Navegador / futuro app móvel
          │
          ├── leitura e cadastro simples ── Supabase API + RLS
          └── transições sensíveis ─────── Funções TypeScript
                                            │
                         PostgreSQL ─ Storage ─ Realtime
                                            │
                Gemini sanitizado · Brevo · R2 · Better Stack
```

## Decisões de segurança

Autorização está no banco, não apenas na interface. O token identifica usuário; vínculo ativo define empresa; perfil interno e origem determinam escopo. Storage usa caminhos por entidade e políticas equivalentes. Funções validam versão esperada para evitar aceite ou publicação concorrente.

## Ambientes

Homologação e produção têm bancos, buckets, chaves, URLs e remetentes distintos. Produção usa a região Supabase disponível mais próxima do Brasil. A camada de dados local é apenas demonstrativa e nunca recebe registros reais.

O formulário público é acessível sem autenticação. Na homologação, a RPC aceita somente e-mail sintético `.test`, fixa `origem = demonstracao`, aplica limites de tamanho e frequência, gera protocolo e guarda apenas o hash do token de ativação. Depois da autenticação com o mesmo e-mail, o token cria o perfil externo, a empresa demonstrativa, o vínculo aprovado e a solicitação; RLS/RPC liberam somente o acompanhamento daquela empresa. A equipe cria a pré-proposta sobre essa mesma solicitação: empresa e protocolo são reaproveitados, o custo vigente é congelado no servidor e duplicidade ativa é negada. O Cliente autenticado pode aceitar a versão emitida; esse aceite registra usuário, empresa, versão do aviso e horário, mas não substitui a proposta oficial do Nectar. Somente o Administrador cria/inicia a execução após confirmar o trâmite institucional. Mensagens restritas são persistidas no PostgreSQL e atualizadas por Realtime: o Cliente acessa somente a própria empresa e a equipe interna acessa somente solicitações demonstrativas ativadas. A persistência real continua desativada: produção exigirá endpoint protegido por Turnstile, CNPJ cifrado, captura confiável do endereço de rede no aceite, Storage privado, convite institucional e aviso jurídico aprovado.

Cada serviço possui um modelo versionado de macroetapas. A confirmação do início copia o modelo vigente para `etapas_execucao`; mudanças futuras no modelo não reescrevem trabalhos existentes. Escritas diretas foram removidas: a RPC auditada permite ao Técnico atualizar trabalhos originados por ele e preserva a hierarquia para Validador e Administrador. Alterações das etapas são propagadas por Realtime, sempre sujeitas à RLS do Cliente e da equipe.

O fechamento é uma decisão separada da conclusão visual das etapas. A RPC de registro recebe horas reais por equipamento, custos extras, retrabalho, mudança de escopo, causa, resumo e aprendizado. Técnico registra os próprios trabalhos; Validador e Administrador herdam essa capacidade. Somente Validador ou Administrador podem aprovar e alterar a execução para `concluido`, ou devolver com justificativa. Toda transição é auditada e limitada à origem `demonstracao` neste MVP.

O portal não integra o Nectar. A versão gerada internamente é uma pré-proposta simples; a proposta oficial continua no processo institucional do SENAI. Na homologação, somente o Administrador gera o PDF de uma versão aprovada. O arquivo fica no bucket privado `pre-propostas`, em caminho derivado do UUID da versão; caminho e SHA-256 são congelados uma única vez no PostgreSQL. Uma função de autorização `security definer` atravessa apenas as RLS internas necessárias e retorna um booleano à política do Storage: a equipe demonstrativa acessa documentos internos, enquanto o Cliente recebe somente versões emitidas da empresa à qual possui vínculo ativo. O navegador recalcula o SHA-256 antes de liberar o download e bloqueia arquivos divergentes.

O seed de homologação usa somente valores sintéticos identificados por `massa_sintetica_v1`. Fontes restritas podem orientar uma carga real futura, executada por processo autorizado fora do Git, mas seus valores não são copiados para código, testes ou seeds.

## Disponibilidade e recuperação

Uma tarefa diária exporta banco e metadados, cifra antes do envio e aplica retenção no R2 (14 diários e quatro semanais). Better Stack recebe falhas não sensíveis e testa disponibilidade. A restauração deve ser executada de fato antes da banca.

## Desvio consciente do plano original

O scaffold oficial de hospedagem utiliza Vinext sobre Vite, mantendo React, TypeScript, Tailwind e compatibilidade Cloudflare. A regra de domínio permanece desacoplada do framework.
