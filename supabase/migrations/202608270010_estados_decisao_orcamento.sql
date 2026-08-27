-- Separa devolução para correção, rejeição interna e recusa externa.
-- A justificativa atual fica visível; o histórico completo permanece na auditoria.

alter type estado_proposta add value if not exists 'devolvida';
alter type estado_proposta add value if not exists 'rejeitada';

alter table versoes_proposta
  add column if not exists ultima_justificativa_interna text,
  add column if not exists ultima_decisao_em timestamptz,
  add column if not exists ultima_decisao_por uuid references auth.users(id);

alter table versoes_proposta
  drop constraint if exists versoes_proposta_ultima_justificativa_interna_valida;

alter table versoes_proposta
  add constraint versoes_proposta_ultima_justificativa_interna_valida
  check (
    ultima_justificativa_interna is null
    or char_length(trim(ultima_justificativa_interna)) between 5 and 500
  ) not valid;

alter table versoes_proposta
  validate constraint versoes_proposta_ultima_justificativa_interna_valida;

comment on column versoes_proposta.ultima_justificativa_interna is
  'Motivo da devolução ou rejeição interna mais recente; o histórico completo fica em auditoria.';

