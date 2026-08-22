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

## Disponibilidade e recuperação

Uma tarefa diária exporta banco e metadados, cifra antes do envio e aplica retenção no R2 (14 diários e quatro semanais). Better Stack recebe falhas não sensíveis e testa disponibilidade. A restauração deve ser executada de fato antes da banca.

## Desvio consciente do plano original

O scaffold oficial de hospedagem utiliza Vinext sobre Vite, mantendo React, TypeScript, Tailwind e compatibilidade Cloudflare. A regra de domínio permanece desacoplada do framework.
