-- Indicadores do modulo de estatisticas (D-062, D-063, D-064, D-067).
--
-- O calculo mora no banco, e nao no navegador, pela regra 3 do CLAUDE.md:
-- sao 2.458 negocios e 3.415 eventos, e nenhuma tela pode puxar isso para
-- somar no cliente. O PostgREST tambem nao faz `group by` — a mesma razao
-- pela qual o agrupamento de organizacoes virou funcao na sessao 09.
--
-- ⚠️ Todas filtram `origem_carga = false`, como manda o CLAUDE.md. Isso
-- INCLUI o historico importado do Pipedrive (D-129), que e evento real
-- com data real, e exclui evento sintetico de carga em massa.
--
-- ⚠️ D-067: negocio `parado` fica fora dos indicadores de desempenho por
-- padrao, com interruptor. Cadastro dormente nao e negociacao em curso.
--
-- Recortes da D-064: periodo · responsavel · origem · produto · area.

-- ---------- 1. Recorte comum ----------
-- Uma funcao so devolve os ids que sobrevivem ao recorte. As demais se
-- apoiam nela, para que "negocios ganhos" e "valor ganho" nunca possam
-- discordar sobre quem esta no conjunto.
create or replace function public.negocios_do_recorte(
  p_de               date    default null,
  p_ate              date    default null,
  p_responsavel      uuid    default null,
  p_origem           uuid    default null,
  p_produto          uuid    default null,
  p_area             uuid    default null,
  p_incluir_parados  boolean default false
)
returns table (id uuid)
language sql stable security invoker
set search_path = public
as $$
  select n.id
    from negocio n
    left join produto pr on pr.id = n.produto_id
   where (p_de   is null or n.criado_em >= p_de::timestamptz)
     and (p_ate  is null or n.criado_em <  (p_ate + 1)::timestamptz)
     and (p_responsavel is null or n.responsavel_id = p_responsavel)
     and (p_origem      is null or n.origem_id      = p_origem)
     and (p_produto     is null or n.produto_id     = p_produto)
     and (p_area        is null or pr.area_id       = p_area)
     and (p_incluir_parados or n.status <> 'parado')
$$;

-- ---------- 2. Numeros de topo (indicadores 1 a 4 e 6) ----------
create or replace function public.indicadores_resumo(
  p_de date default null, p_ate date default null,
  p_responsavel uuid default null, p_origem uuid default null,
  p_produto uuid default null, p_area uuid default null,
  p_incluir_parados boolean default false
)
returns table (
  iniciados        bigint,
  ganhos           bigint,
  perdidos         bigint,
  valor_ganho      numeric,
  em_andamento     bigint,
  valor_em_aberto  numeric,
  taxa_ganho       numeric
)
language sql stable security invoker
set search_path = public
as $$
  with alvo as (
    select n.* from negocio n
     where n.id in (select id from public.negocios_do_recorte(
       p_de, p_ate, p_responsavel, p_origem, p_produto, p_area, p_incluir_parados))
  )
  select
    count(*)                                                        as iniciados,
    count(*) filter (where status = 'ganho')                        as ganhos,
    count(*) filter (where status = 'perdido')                      as perdidos,
    coalesce(sum(valor) filter (where status = 'ganho'), 0)         as valor_ganho,
    count(*) filter (where status in ('negociacao','parado'))       as em_andamento,
    coalesce(sum(valor) filter (where status in ('negociacao','parado')), 0)
                                                                    as valor_em_aberto,
    -- Taxa de ganho e sobre DESFECHOS, nao sobre a base: negocio ainda
    -- aberto nao ganhou nem perdeu, e conta-lo no denominador afundaria
    -- o indicador sem que nada tivesse acontecido.
    case when count(*) filter (where status in ('ganho','perdido')) = 0 then null
         else round(
           count(*) filter (where status = 'ganho')::numeric * 100
           / count(*) filter (where status in ('ganho','perdido')), 1)
    end                                                             as taxa_ganho
    from alvo;
$$;

-- ---------- 3. Serie mensal (indicador 5) ----------
create or replace function public.indicadores_serie_mensal(
  p_de date default null, p_ate date default null,
  p_responsavel uuid default null, p_origem uuid default null,
  p_produto uuid default null, p_area uuid default null,
  p_incluir_parados boolean default false
)
returns table (mes date, iniciados bigint, ganhos bigint, valor_ganho numeric)
language sql stable security invoker
set search_path = public
as $$
  select date_trunc('month', n.criado_em)::date          as mes,
         count(*)                                        as iniciados,
         count(*) filter (where n.status = 'ganho')      as ganhos,
         coalesce(sum(n.valor) filter (where n.status = 'ganho'), 0) as valor_ganho
    from negocio n
   where n.id in (select id from public.negocios_do_recorte(
     p_de, p_ate, p_responsavel, p_origem, p_produto, p_area, p_incluir_parados))
   group by 1
   order by 1;
$$;

-- ---------- 4. Funil de conversao (indicador 7) ----------
-- "Alcancou a etapa" = ha evento cujo destino foi ela, OU o negocio esta
-- nela agora. A segunda metade importa: negocio criado e nunca movido nao
-- tem evento nenhum, e ignora-lo esvaziaria o topo do funil.
create or replace function public.indicadores_funil(
  p_de date default null, p_ate date default null,
  p_responsavel uuid default null, p_origem uuid default null,
  p_produto uuid default null, p_area uuid default null,
  p_incluir_parados boolean default false
)
returns table (etapa text, ordem integer, alcancaram bigint, conversao numeric)
language sql stable security invoker
set search_path = public
as $$
  with alvo as (
    select id from public.negocios_do_recorte(
      p_de, p_ate, p_responsavel, p_origem, p_produto, p_area, p_incluir_parados)
  ),
  passagens as (
    select e.id as etapa_id, e.nome, e.ordem, n.id as negocio_id
      from etapa e
      join negocio n on n.id in (select id from alvo)
     where n.etapa_id = e.id
        or exists (select 1 from evento_negocio ev
                    where ev.negocio_id = n.id
                      and ev.tipo = 'etapa'
                      and not ev.origem_carga
                      and ev.valor_novo = e.id::text)
  ),
  contagem as (
    select nome, ordem, count(distinct negocio_id) as alcancaram
      from passagens group by nome, ordem
  )
  select c.nome::text, c.ordem, c.alcancaram,
         -- Conversao e sempre em relacao a etapa anterior do funil, nao
         -- ao topo: e assim que se ve ONDE o negocio para.
         case when lag(c.alcancaram) over (order by c.ordem) is null
                or lag(c.alcancaram) over (order by c.ordem) = 0 then null
              else round(c.alcancaram::numeric * 100
                         / lag(c.alcancaram) over (order by c.ordem), 1)
         end
    from contagem c
   order by c.ordem;
$$;

-- ---------- 5. Lead time por etapa (indicador 8) ----------
-- Entrada na etapa = o evento que levou o negocio ate ela; para a
-- primeira etapa, a criacao do negocio. Saida = o evento que o tirou.
create or replace function public.indicadores_lead_time(
  p_de date default null, p_ate date default null,
  p_responsavel uuid default null, p_origem uuid default null,
  p_produto uuid default null, p_area uuid default null,
  p_incluir_parados boolean default false
)
returns table (etapa text, ordem integer, passagens bigint, dias_medios numeric)
language sql stable security invoker
set search_path = public
as $$
  with alvo as (
    select id from public.negocios_do_recorte(
      p_de, p_ate, p_responsavel, p_origem, p_produto, p_area, p_incluir_parados)
  ),
  saidas as (
    select ev.negocio_id,
           ev.valor_anterior as etapa_id,
           ev.ocorrido_em    as saiu,
           coalesce(
             (select max(ent.ocorrido_em) from evento_negocio ent
               where ent.negocio_id = ev.negocio_id
                 and ent.tipo = 'etapa'
                 and not ent.origem_carga
                 and ent.valor_novo = ev.valor_anterior
                 and ent.ocorrido_em < ev.ocorrido_em),
             (select n.criado_em from negocio n where n.id = ev.negocio_id)
           ) as entrou
      from evento_negocio ev
     where ev.tipo = 'etapa'
       and not ev.origem_carga
       and ev.valor_anterior is not null
       and ev.negocio_id in (select id from alvo)
  )
  select e.nome::text, e.ordem, count(*)::bigint,
         round(avg(extract(epoch from (s.saiu - s.entrou)) / 86400)::numeric, 1)
    from saidas s
    join etapa e on e.id::text = s.etapa_id
   where s.entrou is not null and s.saiu > s.entrou
   group by e.nome, e.ordem
   order by e.ordem;
$$;

-- ---------- 6. Valor inicial x fechado (indicador 9) ----------
-- ⚠️ O primeiro valor registrado costuma ser 0: o negocio nasce sem valor
-- e ganha um depois. Comparar contra zero faria a variacao parecer
-- infinita, entao a base e o primeiro valor NAO nulo e NAO zero.
create or replace function public.indicadores_valor_inicial_final(
  p_de date default null, p_ate date default null,
  p_responsavel uuid default null, p_origem uuid default null,
  p_produto uuid default null, p_area uuid default null,
  p_incluir_parados boolean default false
)
returns table (negocios bigint, soma_inicial numeric, soma_final numeric, variacao numeric)
language sql stable security invoker
set search_path = public
as $$
  with alvo as (
    select id from public.negocios_do_recorte(
      p_de, p_ate, p_responsavel, p_origem, p_produto, p_area, p_incluir_parados)
  ),
  por_negocio as (
    select ev.negocio_id,
           (array_agg(nullif(ev.valor_anterior, '0.00') order by ev.ocorrido_em)
              filter (where ev.valor_anterior is not null
                        and nullif(ev.valor_anterior, '0.00') is not null))[1]::numeric as inicial,
           (array_agg(ev.valor_novo order by ev.ocorrido_em desc)
              filter (where ev.valor_novo is not null))[1]::numeric as final
      from evento_negocio ev
     where ev.tipo = 'valor'
       and not ev.origem_carga
       and ev.negocio_id in (select id from alvo)
     group by ev.negocio_id
  )
  select count(*)::bigint,
         coalesce(sum(inicial), 0),
         coalesce(sum(final), 0),
         case when coalesce(sum(inicial), 0) = 0 then null
              else round((sum(final) - sum(inicial)) * 100 / sum(inicial), 1) end
    from por_negocio
   where inicial is not null and final is not null;
$$;

-- ---------- 7. Recortes por dimensao (indicadores 10 a 13) ----------
-- Uma funcao para as quatro: perdas por motivo, negocios por origem,
-- distribuicao por status e ranking por vendedor. Indicador novo por
-- dimensao entra sem tela nova, que e o que a D-062 chama de nivel B.
create or replace function public.indicadores_por_dimensao(
  p_dimensao text,
  p_de date default null, p_ate date default null,
  p_responsavel uuid default null, p_origem uuid default null,
  p_produto uuid default null, p_area uuid default null,
  p_incluir_parados boolean default false
)
returns table (rotulo text, negocios bigint, valor numeric, ganhos bigint)
language sql stable security invoker
set search_path = public
as $$
  with alvo as (
    select n.* from negocio n
     where n.id in (select id from public.negocios_do_recorte(
       p_de, p_ate, p_responsavel, p_origem, p_produto, p_area, p_incluir_parados))
  )
  select
    coalesce(
      case p_dimensao
        when 'motivo_perda' then (select m.nome from motivo_perda m where m.id = a.motivo_perda_id)
        when 'origem'       then (select o.nome from origem o       where o.id = a.origem_id)
        when 'status'       then a.status::text
        when 'responsavel'  then (select u.nome from usuario u      where u.id = a.responsavel_id)
        when 'produto'      then (select p.nome from produto p      where p.id = a.produto_id)
        when 'etapa'        then (select e.nome from etapa e        where e.id = a.etapa_id)
      end, '(sem informação)')::text                       as rotulo,
    count(*)                                               as negocios,
    coalesce(sum(a.valor), 0)                              as valor,
    count(*) filter (where a.status = 'ganho')             as ganhos
    from alvo a
   -- Perdas por motivo so fala de quem perdeu; nas demais, a base inteira.
   where p_dimensao <> 'motivo_perda' or a.status = 'perdido'
   group by 1
   order by 2 desc;
$$;

-- Nenhuma delas para visitante anonimo. A RLS ja barra a leitura das
-- tabelas, mas funcao `security invoker` sem revoke ainda apareceria na
-- API — e o que se ve numa API publica e informacao.
revoke all on function public.negocios_do_recorte(date, date, uuid, uuid, uuid, uuid, boolean) from anon;
revoke all on function public.indicadores_resumo(date, date, uuid, uuid, uuid, uuid, boolean) from anon;
revoke all on function public.indicadores_serie_mensal(date, date, uuid, uuid, uuid, uuid, boolean) from anon;
revoke all on function public.indicadores_funil(date, date, uuid, uuid, uuid, uuid, boolean) from anon;
revoke all on function public.indicadores_lead_time(date, date, uuid, uuid, uuid, uuid, boolean) from anon;
revoke all on function public.indicadores_valor_inicial_final(date, date, uuid, uuid, uuid, uuid, boolean) from anon;
revoke all on function public.indicadores_por_dimensao(text, date, date, uuid, uuid, uuid, uuid, boolean) from anon;
