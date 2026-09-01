-- ============================================================
-- CRM Lure — filtrar a lista de organizações por local.
--
-- A D-160 deu endereço a 1.017 organizações e coluna própria na lista.
-- Ver não é achar: a pergunta "quais clientes temos em Anápolis?" ainda
-- exigia percorrer 21 páginas lendo a coluna.
--
-- ⚠️ O filtro roda no BANCO, junto com o agrupamento e a paginação.
-- Filtrar no cliente exigiria carregar as 2.903 organizações para
-- escolher 111 — exatamente o que a R-006 proíbe.
--
-- ⚠️ O filtro escolhe CADASTROS, e o grupo passa a resumir só os
-- escolhidos. Filtrando Anápolis, "Amaral Group" (18 cadastros, 3 em
-- Anápolis) aparece com 3 — e as contagens de negócios, pessoas e
-- atividades são as desses 3. É a leitura honesta: a linha responde
-- "o que este nome tem em Anápolis", não "o que este nome tem".
--
-- ⚠️ Por isso `organizacoes_do_grupo` recebe OS MESMOS parâmetros. Sem
-- isso o crachá diria 3 e expandir mostraria 18 — o tipo de divergência
-- que faz o usuário desconfiar do número certo. Quem resume e quem
-- detalha filtram igual, ou não filtram.
--
-- ⚠️ Três recortes, e o terceiro é o que costuma faltar:
--     estado inteiro       -> p_uf = 'GO', p_cidade nulo
--     cidade               -> p_uf = 'GO', p_cidade = 'Anápolis'
--     SEM endereço nenhum  -> p_sem_local = true
-- São **1.877 organizações sem local**, a maioria da base. Sem o
-- terceiro recorte não haveria como chegar até elas para preencher — e
-- preencher é o que faz o filtro valer mais amanhã do que hoje.
--
-- ⚠️ `drop` antes de `create` nas três: `create or replace` não muda a
-- assinatura nem o tipo de retorno de uma função existente. Os nomes dos
-- parâmetros mudam junto (`termo` -> `p_termo`), porque o PostgREST
-- chama por nome e misturar convenção numa mesma família de funções é
-- como se erra a chamada.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Os locais que existem, para montar a lista de escolha
--
-- ⚠️ Uma ida ao banco devolve tudo: as UFs, as cidades de cada uma e a
-- contagem de quem não tem local. Montar o seletor com uma consulta por
-- estado seriam 14 viagens ao pooler para desenhar um menu.
--
-- ⚠️ Só o que EXISTE na base entra. Oferecer as 27 UFs num seletor onde
-- 13 delas devolvem lista vazia é oferecer 13 becos sem saída — e a
-- contagem ao lado de cada opção é o que diz, antes do clique, se vale
-- a pena.
--
-- ⚠️ A linha `(null, null)` NÃO é excluída: ela é a contagem dos que não
-- têm endereço, que é uma das três opções do seletor. Deixá-la de fora
-- obrigaria a tela a uma segunda consulta só para escrever um número —
-- uma viagem inteira ao pooler (~150 ms) para preencher um rótulo.
-- ------------------------------------------------------------

create or replace function public.locais_das_organizacoes()
returns table (uf text, cidade text, quantidade bigint)
language sql
stable
set search_path = ''
as $$
  select o.uf, o.cidade, count(*)
    from public.organizacao o
   group by o.uf, o.cidade
   -- Nulos por último dentro de cada estado: "GO sem cidade" é um
   -- recorte legítimo, mas nunca o primeiro que se procura.
   order by o.uf nulls last, o.cidade nulls last
$$;

revoke all on function public.locais_das_organizacoes() from anon;
grant execute on function public.locais_das_organizacoes() to authenticated;

-- ------------------------------------------------------------
-- 2. A lista, a contagem e a expansão — as três com o mesmo recorte
-- ------------------------------------------------------------

drop function if exists public.organizacoes_agrupadas(text, integer, integer);
drop function if exists public.conta_organizacoes_agrupadas(text);
drop function if exists public.organizacoes_do_grupo(text);

/**
 * O predicado do recorte, escrito UMA vez.
 *
 * ⚠️ As três funções abaixo precisam concordar exatamente. Repetir o
 * `where` em três lugares é como elas passam a divergir no dia em que
 * alguém corrigir só uma — e a divergência aqui é silenciosa: a
 * paginação diria 7 páginas e a lista mostraria 5.
 *
 * ⚠️ `immutable` e sem acesso a tabela: é só comparação de texto, e
 * marcar assim deixa o planejador embutir a chamada em vez de tratá-la
 * como caixa-preta linha a linha.
 */
create or replace function public.organizacao_no_recorte(
  p_nome        text,
  p_uf_linha    text,
  p_cidade_linha text,
  p_termo       text,
  p_uf          text,
  p_cidade      text,
  p_sem_local   boolean
)
returns boolean
language sql
immutable
parallel safe
set search_path = ''
as $$
  select
    (p_termo is null or p_termo = '' or p_nome ilike '%' || p_termo || '%')
    and (
      case
        -- "Sem local" ignora UF e cidade de propósito: pedir as duas
        -- coisas ao mesmo tempo é contradição, e o seletor da tela nunca
        -- as envia juntas.
        when p_sem_local then p_uf_linha is null and p_cidade_linha is null
        when p_cidade is not null and p_cidade <> ''
          then p_cidade_linha = p_cidade
               and (p_uf is null or p_uf = '' or p_uf_linha = p_uf)
        when p_uf is not null and p_uf <> '' then p_uf_linha = p_uf
        else true
      end
    )
$$;

revoke all on function public.organizacao_no_recorte(text, text, text, text, text, text, boolean) from anon;
grant execute on function public.organizacao_no_recorte(text, text, text, text, text, text, boolean) to authenticated;

create function public.organizacoes_agrupadas(
  p_termo text default null,
  p_limite integer default 50,
  p_deslocamento integer default 0,
  p_uf text default null,
  p_cidade text default null,
  p_sem_local boolean default false
)
returns table (
  chave text,
  nome text,
  quantidade bigint,
  representante_id uuid,
  cidade text,
  uf text,
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
     where public.organizacao_no_recorte(
             o.nome, o.uf, o.cidade, p_termo, p_uf, p_cidade, p_sem_local)
  ),
  agrupado as (
    select
      f.chave_agrupamento as chave,
      (array_agg(f.nome order by f.nome, f.id))[1]    as nome,
      count(*)                                        as quantidade,
      (array_agg(f.id order by f.nome, f.id))[1]      as representante_id,
      -- ⚠️ `filter`: o primeiro que TEM, não o primeiro da ordem.
      (array_agg(f.cidade order by f.nome, f.id)
         filter (where f.cidade is not null))[1]      as cidade,
      (array_agg(f.uf order by f.nome, f.id)
         filter (where f.uf is not null))[1]          as uf,
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
    a.uf,
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
   limit p_limite offset p_deslocamento
$$;

/** Quantos grupos existem no recorte — alimenta a paginação. */
create function public.conta_organizacoes_agrupadas(
  p_termo text default null,
  p_uf text default null,
  p_cidade text default null,
  p_sem_local boolean default false
)
returns bigint
language sql
stable
set search_path = ''
as $$
  select count(distinct o.chave_agrupamento)
    from public.organizacao o
   where public.organizacao_no_recorte(
           o.nome, o.uf, o.cidade, p_termo, p_uf, p_cidade, p_sem_local)
$$;

/**
 * Os cadastros de um grupo, para quando a linha é expandida.
 *
 * ⚠️ Recebe o mesmo recorte da lista, e o motivo está no topo do
 * arquivo: se o crachá diz 3 e a expansão mostra 18, o usuário deixa de
 * confiar nos dois números.
 */
create function public.organizacoes_do_grupo(
  p_chave_grupo text,
  p_uf text default null,
  p_cidade text default null,
  p_sem_local boolean default false
)
returns table (
  id uuid,
  nome text,
  cidade text,
  uf text,
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
    o.uf,
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
   where o.chave_agrupamento = p_chave_grupo
     -- ⚠️ Sem o termo de busca: dentro de um grupo todos os nomes caem na
     -- mesma chave normalizada, então filtrar por nome aqui não recortaria
     -- nada. Só o local recorta.
     and public.organizacao_no_recorte(
           o.nome, o.uf, o.cidade, null, p_uf, p_cidade, p_sem_local)
   order by o.nome, o.id
$$;

-- ------------------------------------------------------------
-- 3. O índice que sustenta o recorte
--
-- ⚠️ Sem ele o filtro por cidade varre as 2.903 linhas. Varrer 2.903 é
-- barato hoje, e o índice é barato também — o que não é barato é
-- descobrir isso quando a base dobrar. `(uf, cidade)` nesta ordem porque
-- filtrar só por UF é um dos três recortes, e filtrar só por cidade sem
-- UF não é oferecido pela tela.
-- ------------------------------------------------------------

create index if not exists idx_organizacao_local on organizacao (uf, cidade);

revoke all on function public.organizacoes_agrupadas(text, integer, integer, text, text, boolean) from anon;
revoke all on function public.conta_organizacoes_agrupadas(text, text, text, boolean) from anon;
revoke all on function public.organizacoes_do_grupo(text, text, text, boolean) from anon;
grant execute on function public.organizacoes_agrupadas(text, integer, integer, text, text, boolean) to authenticated;
grant execute on function public.conta_organizacoes_agrupadas(text, text, text, boolean) to authenticated;
grant execute on function public.organizacoes_do_grupo(text, text, text, boolean) to authenticated;
