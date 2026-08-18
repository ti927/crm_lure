-- ============================================================
-- CRM Lure — os negócios aparecem na lista de contatos, como referência.
--
-- ⚠️ O motivo é prático: "Sicoob Credseguro" existe seis vezes na base,
-- com nome idêntico. Cidade e website costumam estar vazios, então não
-- há como saber qual cadastro é qual — a não ser pelos negócios que cada
-- um carrega. O título do negócio é o que dá identidade ao registro.
--
-- As funções passam a devolver os títulos junto, num array limitado: a
-- lista precisa de referência, não do histórico inteiro.
-- ============================================================

-- ⚠️ `create or replace` não muda o tipo de retorno de uma função que já
-- existe — o Postgres recusa com "cannot change return type". Como as
-- duas ganham a coluna `titulos`, elas caem antes de renascer.
drop function if exists public.organizacoes_agrupadas(text, integer, integer);
drop function if exists public.organizacoes_do_grupo(text);

create function public.organizacoes_agrupadas(
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
  negocios bigint,
  titulos text[]
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
    (select count(*) from public.negocio n where n.organizacao_id = any(a.ids)) as negocios,
    -- Os mais recentes primeiro: é o negócio de agora que identifica o
    -- cadastro, não um de 2019.
    (select array_agg(t.titulo)
       from (select n.titulo
               from public.negocio n
              where n.organizacao_id = any(a.ids)
              order by n.criado_em desc
              limit 3) t) as titulos
    from agrupado a
   order by a.nome
   limit limite offset deslocamento
$$;

create function public.organizacoes_do_grupo(chave_grupo text)
returns table (
  id uuid,
  nome text,
  cidade text,
  website text,
  negocios bigint,
  titulos text[]
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
    (select count(*) from public.negocio n where n.organizacao_id = o.id) as negocios,
    (select array_agg(t.titulo)
       from (select n.titulo
               from public.negocio n
              where n.organizacao_id = o.id
              order by n.criado_em desc
              limit 5) t) as titulos
    from public.organizacao o
   where o.chave_agrupamento = chave_grupo
   order by o.nome, o.id
$$;

revoke all on function public.organizacoes_agrupadas(text, integer, integer) from anon;
revoke all on function public.organizacoes_do_grupo(text) from anon;
grant execute on function public.organizacoes_agrupadas(text, integer, integer) to authenticated;
grant execute on function public.organizacoes_do_grupo(text) to authenticated;
