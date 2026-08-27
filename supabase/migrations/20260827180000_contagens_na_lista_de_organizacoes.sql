-- ============================================================
-- CRM Lure — pessoas e atividades entram na lista de organizações.
--
-- A linha já mostrava quantos NEGÓCIOS cada cadastro tem. Passa a
-- mostrar também quantas PESSOAS estão vinculadas e quantas ATIVIDADES
-- ele carrega, com a mesma forma: ícone, número, e a lista por trás.
--
-- ⚠️ Cada função devolve a CONTAGEM e uma AMOSTRA, não a lista inteira.
-- São 3.312 vínculos de pessoa e 5.213 atividades ligadas a organização;
-- trazer tudo para uma lista de 50 linhas seria carregar a base para
-- desenhar um número (R-006). A amostra é o que a dica de tela mostra, e
-- a contagem é o que diz quanto ficou de fora.
--
-- ⚠️ As atividades saem em `jsonb`, e não num `text[]` como os títulos de
-- negócio. É por causa do estado: cada item precisa dizer se está
-- pendente, e codificar isso dentro da string (um prefixo, um marcador)
-- seria inventar um formato que só este par de arquivos entende. O
-- número de idas ao banco não muda.
--
-- ⚠️ `drop` antes de `create`: `create or replace` não muda o tipo de
-- retorno de uma função existente — o Postgres recusa com "cannot change
-- return type", e as duas ganham colunas novas.
--
-- ⚠️ `security invoker` (o padrão): a RLS de `pessoa_organizacao` e de
-- `atividade` continua valendo. Nenhuma das duas mostra algo que o
-- usuário já não pudesse ver.
--
-- Os três índices que sustentam isto já existem e foram conferidos em
-- `pg_indexes`: `pessoa_organizacao_organizacao_id_idx`,
-- `idx_atividade_organizacao` e `negocio_organizacao_id_idx`.
-- ============================================================

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
  titulos text[],
  pessoas bigint,
  nomes_pessoas text[],
  atividades bigint,
  atividades_pendentes bigint,
  amostra_atividades jsonb
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
              limit 6) t) as titulos,

    (select count(*) from public.pessoa_organizacao po
      where po.organizacao_id = any(a.ids)) as pessoas,
    -- ⚠️ O cargo entra no rótulo SÓ quando existe e ainda não está no
    -- nome. A base veio do Pipedrive com o cargo dentro do próprio nome
    -- ("Rildo Alves Dias - Supervisor RH"), e concatenar às cegas
    -- produziria "… - Supervisor RH — Supervisor RH".
    (select array_agg(t.rotulo)
       from (select p.nome ||
                    case
                      when po.cargo is null or btrim(po.cargo) = '' then ''
                      when p.nome ilike '%' || po.cargo || '%' then ''
                      else ' · ' || po.cargo
                    end as rotulo
               from public.pessoa_organizacao po
               join public.pessoa p on p.id = po.pessoa_id
              where po.organizacao_id = any(a.ids)
              order by p.nome
              limit 8) t) as nomes_pessoas,

    (select count(*) from public.atividade at
      where at.organizacao_id = any(a.ids)) as atividades,
    (select count(*) from public.atividade at
      where at.organizacao_id = any(a.ids) and not at.concluida) as atividades_pendentes,
    -- Pendente primeiro, e dentro de cada estado a mais recente antes:
    -- numa ficha de cliente, o que se pergunta é o que falta fazer.
    (select jsonb_agg(to_jsonb(t) - 'ordem')
       from (select coalesce(nullif(btrim(at.titulo), ''), ti.nome, 'Atividade') as rotulo,
                    at.data,
                    at.concluida,
                    at.concluida as ordem
               from public.atividade at
               left join public.tipo_atividade ti on ti.id = at.tipo_id
              where at.organizacao_id = any(a.ids)
              order by at.concluida, at.data desc
              limit 6) t) as amostra_atividades
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
  titulos text[],
  pessoas bigint,
  nomes_pessoas text[],
  atividades bigint,
  atividades_pendentes bigint,
  amostra_atividades jsonb
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
              limit 6) t) as titulos,

    (select count(*) from public.pessoa_organizacao po
      where po.organizacao_id = o.id) as pessoas,
    (select array_agg(t.rotulo)
       from (select p.nome ||
                    case
                      when po.cargo is null or btrim(po.cargo) = '' then ''
                      when p.nome ilike '%' || po.cargo || '%' then ''
                      else ' · ' || po.cargo
                    end as rotulo
               from public.pessoa_organizacao po
               join public.pessoa p on p.id = po.pessoa_id
              where po.organizacao_id = o.id
              order by p.nome
              limit 8) t) as nomes_pessoas,

    (select count(*) from public.atividade at
      where at.organizacao_id = o.id) as atividades,
    (select count(*) from public.atividade at
      where at.organizacao_id = o.id and not at.concluida) as atividades_pendentes,
    (select jsonb_agg(to_jsonb(t) - 'ordem')
       from (select coalesce(nullif(btrim(at.titulo), ''), ti.nome, 'Atividade') as rotulo,
                    at.data,
                    at.concluida,
                    at.concluida as ordem
               from public.atividade at
               left join public.tipo_atividade ti on ti.id = at.tipo_id
              where at.organizacao_id = o.id
              order by at.concluida, at.data desc
              limit 6) t) as amostra_atividades
    from public.organizacao o
   where o.chave_agrupamento = chave_grupo
   order by o.nome, o.id
$$;

revoke all on function public.organizacoes_agrupadas(text, integer, integer) from anon;
revoke all on function public.organizacoes_do_grupo(text) from anon;
grant execute on function public.organizacoes_agrupadas(text, integer, integer) to authenticated;
grant execute on function public.organizacoes_do_grupo(text) to authenticated;
