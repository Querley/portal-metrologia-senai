# 0001 — Base técnica e separação de responsabilidades

**Status:** aceita em 22 de agosto de 2026.

React e TypeScript atendem web e favorecem compartilhamento de contratos com React Native. Supabase concentra dados, autenticação, arquivos, Realtime e autorização. Cloudflare hospeda aplicação e cópias de segurança. Cálculos ficam em funções puras testáveis; banco aplica invariantes e RLS; transições sensíveis ficam no servidor.

Consequência: credenciais externas são necessárias para concluir a implantação integrada, mas o desenvolvimento e o roteiro podem usar massa sintética isolada.
