-- Corrige o gatilho compartilhado da 025: cada tabela deve acessar apenas
-- os campos que existem em seu proprio tipo de registro.

create or replace function validar_imutabilidade_licao_formalizada()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_table_name = 'licoes' then
    if old.estado = 'formalizada' then
      if tg_op = 'UPDATE'
         and new.estado = 'em_validacao'
         and new.revisao_atual = old.revisao_atual + 1
         and new.origem = old.origem
         and new.execucao_id = old.execucao_id
         and new.superada_motivo is not distinct from old.superada_motivo
         and new.substituta_id is not distinct from old.substituta_id
         and exists (
           select 1 from revisoes_licao rl
           where rl.licao_id = old.id and rl.numero = new.revisao_atual
         ) then
        return new;
      end if;
      raise exception 'Licao formalizada e imutavel; uma correcao exige nova revisao.' using errcode = '23514';
    end if;
  elsif tg_table_name = 'revisoes_licao' then
    if exists (select 1 from licoes l where l.id = old.licao_id and l.estado = 'formalizada') then
      raise exception 'Revisao de licao formalizada e imutavel.' using errcode = '23514';
    end if;
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

comment on function validar_imutabilidade_licao_formalizada() is
  'Impede alteracao ou exclusao de licoes formalizadas e de suas revisoes; correcao exige nova revisao em validacao.';
