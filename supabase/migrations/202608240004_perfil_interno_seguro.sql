-- Primeiro recorte autenticado: perfil próprio em origem demonstrativa e negação por padrão.
-- Nenhum dado da fonte restrita pode permanecer no banco de homologação.
delete from custos_equipamento
where origem_fonte = 'Hora_custos_máquina.xls';

alter table perfis
  add column origem_ativa origem_dado not null default 'demonstracao';

comment on column perfis.origem_ativa is
  'Contexto exclusivo da sessão operacional. O primeiro MVP de homologação aceita somente demonstracao.';

alter table custos_equipamento
  add column origem origem_dado;

-- Falha de forma segura caso existam custos não classificados no ambiente.
alter table custos_equipamento
  alter column origem set not null;

alter table servicos_catalogo enable row level security;
alter table equipamentos enable row level security;
alter table custos_equipamento enable row level security;
alter table usos_equipamento_proposta enable row level security;
alter table horas_reais_equipamento enable row level security;
alter table conteudos enable row level security;
alter table versoes_conteudo enable row level security;

revoke all privileges on all tables in schema public from anon, authenticated;
revoke all privileges on all sequences in schema public from anon, authenticated;

drop policy if exists "perfil proprio" on perfis;
create policy "perfil interno proprio"
on perfis for select to authenticated
using (
  usuario_id = auth.uid()
  and perfil_interno is not null
  and origem_ativa = 'demonstracao'
);

create policy "usuario atualiza nome proprio"
on perfis for update to authenticated
using (
  usuario_id = auth.uid()
  and perfil_interno is not null
  and origem_ativa = 'demonstracao'
)
with check (
  usuario_id = auth.uid()
  and perfil_interno is not null
  and origem_ativa = 'demonstracao'
);

grant select on table perfis to authenticated;
grant update (nome) on table perfis to authenticated;

drop policy if exists "arquivos autenticados por caminho" on storage.objects;

comment on table custos_equipamento is
  'Custos versionados e segregados por origem. Fontes e cargas reais permanecem fora do Git.';
