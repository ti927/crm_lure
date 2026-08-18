-- ============================================================
-- CRM Lure — a Lista de organizações passa a paginar por GRUPO.
--
-- O PostgREST não expõe `group by`, e paginar por linha traria a mesma
-- organização repetida em páginas diferentes. Estas funções fazem a
-- agregação no banco e devolvem uma linha por grupo, já com a contagem —
-- a página continua carregando 50 registros, nunca a base (R-006).
--
-- `representante_id` é o registro que a linha abre quando o grupo tem um
-- só. Com mais de um, a tela expande e lista os irmãos.
-- ============================================================

create or replace function public.organizacoes_agrupadas(
  termo text default null,
  limite integer default 50,
  deslocamento integer default 0
)
returns table (
  chave text,
  nome text,
  quantidade bigint,
  representante_id uuid,
  cidade text,
  website text,
  negocios bigint
)
language sql
stable
set search_path = ''
as $$
  with filtrado as (
    select o.*
      from public.organizacao o
     where termo is null
        or termo = ''
        or o.nome ilike '%' || termo || '%'
  ),
  agrupado as (
    select
      f.chave_agrupamento as chave,
      -- Nome exibido: o primeiro em ordem alfabética estável do grupo.
      (array_agg(f.nome order by f.nome, f.id))[1]    as nome,
      count(*)                                        as quantidade,
      (array_agg(f.id order by f.nome, f.id))[1]      as representante_id,
      (array_agg(f.cidade order by f.nome, f.id))[1]  as cidade,
      (array_agg(f.website order by f.nome, f.id))[1] as website,
      array_agg(f.id)                                 as ids
      from filtrado f
     group by f.chave_agrupamento
  )
  select
    a.chave,
    a.nome,
    a.quantidade,
    a.representante_id,
    a.cidade,
    a.website,
    (select count(*) from public.negocio n where n.organizacao_id = any(a.ids)) as negocios
    from agrupado a
   order by a.nome
   limit limite offset deslocamento
$$;

/** Quantos grupos existem no recorte — alimenta a paginação. */
create or replace function public.conta_organizacoes_agrupadas(termo text default null)
returns bigint
language sql
stable
set search_path = ''
as $$
  select count(distinct o.chave_agrupamento)
    from public.organizacao o
   where termo is null
      or termo = ''
      or o.nome ilike '%' || termo || '%'
$$;

/** Os registros de um grupo, para quando a linha é expandida na tela. */
create or replace function public.organizacoes_do_grupo(chave_grupo text)
returns table (
  id uuid,
  nome text,
  cidade text,
  website text,
  negocios bigint
)
language sql
stable
set search_path = ''
as $$
  select
    o.id,
    o.nome,
    o.cidade,
    o.website,
    (select count(*) from public.negocio n where n.organizacao_id = o.id) as negocios
    from public.organizacao o
   where o.chave_agrupamento = chave_grupo
   order by o.nome, o.id
$$;

-- Só quem está autenticado e no domínio executa (mesma regra das tabelas).
revoke all on function public.organizacoes_agrupadas(text, integer, integer) from anon;
revoke all on function public.conta_organizacoes_agrupadas(text) from anon;
revoke all on function public.organizacoes_do_grupo(text) from anon;
grant execute on function public.organizacoes_agrupadas(text, integer, integer) to authenticated;
grant execute on function public.conta_organizacoes_agrupadas(text) to authenticated;
grant execute on function public.organizacoes_do_grupo(text) to authenticated;
