-- A aprovação é uma decisão distinta da publicação e precisa permanecer auditável.
-- A publicação futura dependerá da definição de alçada e da geração do PDF imutável.

alter type estado_proposta add value if not exists 'aprovada' after 'em_validacao';

alter table versoes_proposta
  add column if not exists enviada_em timestamptz,
  add column if not exists enviada_por uuid references auth.users(id),
  add column if not exists aprovada_em timestamptz,
  add column if not exists aprovada_por uuid references auth.users(id);

comment on column versoes_proposta.aprovada_em is
  'Instante da aprovação interna. Não equivale à publicação para o cliente.';

