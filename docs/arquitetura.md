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

O formulário público é acessível sem autenticação, mas sua persistência real permanece desativada na homologação pública para evitar coleta acidental. A ativação em produção exigirá endpoint protegido por Turnstile e limite de uso, CNPJ cifrado, Storage privado e aviso jurídico aprovado. Depois da triagem, a equipe cria ou aprova o vínculo do contato com a empresa; somente então o mesmo login libera acompanhamento e mensagens por RLS/RPC.

O portal não integra o Nectar. A versão gerada internamente é uma pré-proposta simples; a proposta oficial continua no processo institucional do SENAI.

O seed de homologação usa somente valores sintéticos identificados por `massa_sintetica_v1`. Fontes restritas podem orientar uma carga real futura, executada por processo autorizado fora do Git, mas seus valores não são copiados para código, testes ou seeds.

## Disponibilidade e recuperação

Uma tarefa diária exporta banco e metadados, cifra antes do envio e aplica retenção no R2 (14 diários e quatro semanais). Better Stack recebe falhas não sensíveis e testa disponibilidade. A restauração deve ser executada de fato antes da banca.

## Desvio consciente do plano original

O scaffold oficial de hospedagem utiliza Vinext sobre Vite, mantendo React, TypeScript, Tailwind e compatibilidade Cloudflare. A regra de domínio permanece desacoplada do framework.
