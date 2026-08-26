-- O gatilho original era compartilhado por tabelas com formatos diferentes e
-- acessava campos inexistentes antes de confirmar a tabela que o disparou.

create or replace function validar_mesma_origem()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_table_name = 'versoes_proposta' then
    if new.origem <> (select p.origem from propostas p where p.id = new.proposta_id) then
      raise exception 'origem divergente';
    end if;
  elsif tg_table_name = 'itens_proposta' then
    if new.origem <> (select v.origem from versoes_proposta v where v.id = new.versao_proposta_id) then
      raise exception 'origem divergente';
    end if;
  elsif tg_table_name = 'anexos_solicitacao' then
    if new.origem <> (select s.origem from solicitacoes s where s.id = new.solicitacao_id) then
      raise exception 'origem divergente';
    end if;
  elsif tg_table_name = 'mensagens' then
    if new.origem <> (select s.origem from solicitacoes s where s.id = new.solicitacao_id) then
      raise exception 'origem divergente';
    end if;
  else
    raise exception 'Tabela não suportada pelo gatilho de origem: %', tg_table_name;
  end if;

  return new;
end;
$$;

comment on function validar_mesma_origem() is
  'Impede mistura de origens em tabelas filhas sem acessar campos de outro formato de registro.';

