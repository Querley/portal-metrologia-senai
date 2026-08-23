-- A CONTURA consta na planilha histórica de custos, mas não integra o parque atual.
-- O registro permanece inativo para preservar rastreabilidade e eventuais referências antigas.
update equipamentos
set ativo = false
where codigo = 'contura';
