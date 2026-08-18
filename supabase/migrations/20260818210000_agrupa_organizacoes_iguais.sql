-- ============================================================
-- CRM Lure — agrupamento de organizações com nome quase idêntico.
--
-- ⚠️ O problema é real e grande: das 2.889 organizações, **1.863 linhas
-- caem em 668 grupos de nome repetido** — 1.195 registros excedentes,
-- 41% da lista. "Sicoob Credseguro" aparece 5 vezes; "Amaral Group", 18.
-- Vieram assim do Pipedrive, onde nada impedia cadastrar de novo.
--
-- A Lista de contatos passa a mostrar UMA linha por grupo, que se expande
-- ao clique. Não é mesclagem — mesclar duplicados está FORA do MVP
-- (Doc 12) e destruiria dado. Aqui os registros continuam separados, cada
-- um com seus negócios; só a apresentação agrupa.
--
-- A chave é gerada e indexada no banco, não calculada no navegador: com
-- 2.889 linhas, agrupar no cliente exigiria carregar a base inteira, o
-- que a R-006 proíbe.
--
-- Normalização: minúsculas, acentos removidos, tudo que não é letra ou
-- número vira espaço, espaços colapsados. "SICOOB Credi Rural" e
-- "sicoob  credi-rural" caem na mesma chave; "Sicoob Credseguro" não se
-- mistura com elas.
-- ============================================================

-- `unaccent` mora no schema `extensions` no Supabase.
create extension if not exists unaccent with schema extensions;

-- ⚠️ `unaccent` é STABLE, não IMMUTABLE (depende do dicionário instalado),
-- e coluna gerada exige função imutável. Este invólucro fixa o dicionário
-- explicitamente, o que torna o resultado determinístico e permite marcar
-- como immutable — o padrão recomendado para indexar texto sem acento.
create or replace function public.chave_nome(texto text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select nullif(
    trim(
      regexp_replace(
        lower(extensions.unaccent('extensions.unaccent', coalesce(texto, ''))),
        '[^a-z0-9]+', ' ', 'g'
      )
    ),
    ''
  )
$$;

alter table organizacao
  add column chave_agrupamento text
  generated always as (public.chave_nome(nome)) stored;

-- A Lista agrupa e conta por esta coluna a cada página.
create index idx_organizacao_chave on organizacao(chave_agrupamento);
