-- ============================================================
-- CRM Lure — atividade e anotacao passam a poder pertencer a
-- organizacao ou pessoa, e nao so a negocio.
--
-- Revoga a parte da D-030 que exigia negocio em toda atividade.
--
-- ⚠️ Motivo: a extracao do Pipedrive (17/08/2026) mostrou que
-- 4.934 das 6.483 atividades — 76% — nao estao penduradas em
-- negocio, e sim em organizacao ou pessoa. Entre elas, 125 das
-- 206 atividades EM ABERTO, que sao as pendencias vivas dos
-- socios. Mantida a regra antiga, a carga descartaria 61% do que
-- eles tem para fazer, e o criterio 2 da D-098 — operar um dia
-- inteiro sem abrir o Pipedrive — ficaria impossivel de cumprir.
--
-- A D-030 foi decidida no Bloco 3, antes de existir extracao.
-- Os dados a contradisseram.
--
-- O desenho aqui e o mesmo do Pipedrive, confirmado na
-- documentacao oficial da API: deal, person e org sao vinculos
-- independentes e todos opcionais numa atividade. Copiar o
-- modelo de origem e o que torna a migracao uma copia, e nao uma
-- interpretacao.
-- ============================================================

-- ---------- atividade ----------
alter table atividade alter column negocio_id drop not null;

alter table atividade
  add column organizacao_id uuid references organizacao(id) on delete cascade,
  add column pessoa_id      uuid references pessoa(id)      on delete cascade;

-- Encadeamento do Pipedrive: atividade de negocio herda a organizacao
-- dele; atividade de pessoa herda a organizacao dela. Assim a ficha da
-- organizacao mostra tudo que aconteceu com ela, venha de onde vier.
-- O caminho contrario nao existe: organizacao pode ter varios negocios,
-- e escolher um seria inventar.
create or replace function public.encadeia_vinculo_atividade()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  if new.negocio_id is not null and new.organizacao_id is null then
    select organizacao_id into new.organizacao_id
      from public.negocio where id = new.negocio_id;
  end if;

  if new.pessoa_id is not null and new.organizacao_id is null then
    -- O vinculo nao guarda data (a tabela e so pessoa+organizacao+cargo),
    -- entao nao ha "primeiro". Ordenar pelo id mantem o resultado estavel
    -- entre execucoes, que e o que importa numa carga que precisa poder
    -- ser repetida igual.
    select organizacao_id into new.organizacao_id
      from public.pessoa_organizacao
      where pessoa_id = new.pessoa_id
      order by organizacao_id
      limit 1;
  end if;

  return new;
end $$;

create trigger trg_encadeia_vinculo_atividade
  before insert or update on atividade
  for each row execute function public.encadeia_vinculo_atividade();

-- ---------- anotacao ----------
-- Mesmo problema, mesma proporcao: 415 das 923 anotacoes nao tem
-- negocio.
alter table anotacao alter column negocio_id drop not null;

alter table anotacao
  add column organizacao_id uuid references organizacao(id) on delete cascade,
  add column pessoa_id      uuid references pessoa(id)      on delete cascade;

-- ---------- indices ----------
-- As fichas de organizacao e de pessoa consultam por estas colunas.
create index idx_atividade_organizacao on atividade(organizacao_id) where organizacao_id is not null;
create index idx_atividade_pessoa      on atividade(pessoa_id)      where pessoa_id is not null;
create index idx_anotacao_organizacao  on anotacao(organizacao_id)  where organizacao_id is not null;
create index idx_anotacao_pessoa       on anotacao(pessoa_id)       where pessoa_id is not null;
