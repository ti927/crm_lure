-- Recorte ampliado dos indicadores (D-136).
--
-- Ate aqui o recorte tinha periodo, responsavel, origem, produto e area
-- (D-064). Origem, produto e area nasceram VAZIOS nesta base — o
-- Pipedrive nao tinha fonte de origem nem produto cadastrado —, entao na
-- pratica so periodo e responsavel filtravam alguma coisa.
--
-- Entram os recortes que a operacao usa de verdade no Pipedrive:
--   · etapa       — olhar so quem esta (ou passou) num ponto do funil
--   · status      — separar ganho, perdido, negociacao, parado
--   · faixa de valor — "so contrato acima de X" muda toda leitura numa
--     base onde a mediana e R$ 10 mil e o maior contrato R$ 408 mil
--   · motivo de perda — investigar um motivo especifico
--
-- ⚠️ Assinatura muda, entao e DROP + CREATE, nao `create or replace`: o
-- Postgres trataria a lista nova de argumentos como uma SOBRECARGA, as
-- duas versoes conviveriam e a chamada ficaria ambigua.

drop function if exists public.negocios_do_recorte(date, date, uuid, uuid, uuid, uuid, boolean);
drop function if exists public.indicadores_resumo(date, date, uuid, uuid, uuid, uuid, boolean);
drop function if exists public.indicadores_serie_mensal(date, date, uuid, uuid, uuid, uuid, boolean);
drop function if exists public.indicadores_funil(date, date, uuid, uuid, uuid, uuid, boolean);
drop function if exists public.indicadores_lead_time(date, date, uuid, uuid, uuid, uuid, boolean);
drop function if exists public.indicadores_valor_inicial_final(date, date, uuid, uuid, uuid, uuid, boolean);
drop function if exists public.indicadores_por_dimensao(text, date, date, uuid, uuid, uuid, uuid, boolean);

-- ---------- Recorte comum ----------
create function public.negocios_do_recorte(
  p_de               date    default null,
  p_ate              date    default null,
  p_responsavel      uuid    default null,
  p_origem           uuid    default null,
  p_produto          uuid    default null,
  p_area             uuid    default null,
  p_incluir_parados  boolean default false,
  p_etapa            uuid    default null,
  p_status           text    default null,
  p_valor_min        numeric default null,
  p_valor_max        numeric default null,
  p_motivo_perda     uuid    default null
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
     and (p_responsavel  is null or n.responsavel_id  = p_responsavel)
     and (p_origem       is null or n.origem_id       = p_origem)
     and (p_produto      is null or n.produto_id      = p_produto)
     and (p_area         is null or pr.area_id        = p_area)
     and (p_etapa        is null or n.etapa_id        = p_etapa)
     and (p_motivo_perda is null or n.motivo_perda_id = p_motivo_perda)
     and (p_valor_min    is null or n.valor >= p_valor_min)
     and (p_valor_max    is null or n.valor <= p_valor_max)
     and (p_status       is null or n.status = p_status::status_negocio)
     -- ⚠️ Pedir status = 'parado' explicitamente vence o interruptor: quem
     -- filtrou por parado quer ver parados, e devolver vazio seria absurdo.
     and (p_incluir_parados or p_status = 'parado' or n.status <> 'parado')
$$;

-- ---------- Numeros de topo ----------
create function public.indicadores_resumo(
  p_de date default null, p_ate date default null,
  p_responsavel uuid default null, p_origem uuid default null,
  p_produto uuid default null, p_area uuid default null,
  p_incluir_parados boolean default false,
  p_etapa uuid default null, p_status text default null,
  p_valor_min numeric default null, p_valor_max numeric default null,
  p_motivo_perda uuid default null
)
returns table (
  iniciados bigint, ganhos bigint, perdidos bigint, valor_ganho numeric,
  em_andamento bigint, valor_em_aberto numeric, taxa_ganho numeric
)
language sql stable security invoker
set search_path = public
as $$
  with alvo as (
    select n.* from negocio n
     where n.id in (select id from public.negocios_do_recorte(
       p_de, p_ate, p_responsavel, p_origem, p_produto, p_area,
       p_incluir_parados, p_etapa, p_status, p_valor_min, p_valor_max, p_motivo_perda))
  )
  select
    count(*),
    count(*) filter (where status = 'ganho'),
    count(*) filter (where status = 'perdido'),
    coalesce(sum(valor) filter (where status = 'ganho'), 0),
    count(*) filter (where status in ('negociacao','parado')),
    coalesce(sum(valor) filter (where status in ('negociacao','parado')), 0),
    case when count(*) filter (where status in ('ganho','perdido')) = 0 then null
         else round(count(*) filter (where status = 'ganho')::numeric * 100
                    / count(*) filter (where status in ('ganho','perdido')), 1) end
    from alvo;
$$;

-- ---------- Serie mensal ----------
create function public.indicadores_serie_mensal(
  p_de date default null, p_ate date default null,
  p_responsavel uuid default null, p_origem uuid default null,
  p_produto uuid default null, p_area uuid default null,
  p_incluir_parados boolean default false,
  p_etapa uuid default null, p_status text default null,
  p_valor_min numeric default null, p_valor_max numeric default null,
  p_motivo_perda uuid default null
)
returns table (mes date, iniciados bigint, ganhos bigint, valor_ganho numeric)
language sql stable security invoker
set search_path = public
as $$
  select date_trunc('month', n.criado_em)::date,
         count(*),
         count(*) filter (where n.status = 'ganho'),
         coalesce(sum(n.valor) filter (where n.status = 'ganho'), 0)
    from negocio n
   where n.id in (select id from public.negocios_do_recorte(
     p_de, p_ate, p_responsavel, p_origem, p_produto, p_area,
     p_incluir_parados, p_etapa, p_status, p_valor_min, p_valor_max, p_motivo_perda))
   group by 1 order by 1;
$$;

-- ---------- Funil ----------
create function public.indicadores_funil(
  p_de date default null, p_ate date default null,
  p_responsavel uuid default null, p_origem uuid default null,
  p_produto uuid default null, p_area uuid default null,
  p_incluir_parados boolean default false,
  p_etapa uuid default null, p_status text default null,
  p_valor_min numeric default null, p_valor_max numeric default null,
  p_motivo_perda uuid default null
)
returns table (etapa text, ordem integer, alcancaram bigint, avancaram bigint, conversao numeric)
language sql stable security invoker
set search_path = public
as $$
  with alvo as (
    select id from public.negocios_do_recorte(
      p_de, p_ate, p_responsavel, p_origem, p_produto, p_area,
      p_incluir_parados, p_etapa, p_status, p_valor_min, p_valor_max, p_motivo_perda)
  ),
  alcance as (
    select distinct e.ordem, n.id as negocio_id
      from etapa e
      join negocio n on n.id in (select id from alvo)
     where n.etapa_id = e.id
        or exists (select 1 from evento_negocio ev
                    where ev.negocio_id = n.id and ev.tipo = 'etapa'
                      and not ev.origem_carga and ev.valor_novo = e.id::text)
  )
  select e.nome::text, e.ordem,
         count(distinct a.negocio_id),
         count(distinct seguinte.negocio_id),
         case when count(distinct a.negocio_id) = 0 then null
              else round(count(distinct seguinte.negocio_id)::numeric * 100
                         / count(distinct a.negocio_id), 1) end
    from etapa e
    left join alcance a on a.ordem = e.ordem
    left join alcance seguinte on seguinte.ordem = e.ordem + 1
                              and seguinte.negocio_id = a.negocio_id
   group by e.nome, e.ordem
   order by e.ordem;
$$;

-- ---------- Lead time ----------
create function public.indicadores_lead_time(
  p_de date default null, p_ate date default null,
  p_responsavel uuid default null, p_origem uuid default null,
  p_produto uuid default null, p_area uuid default null,
  p_incluir_parados boolean default false,
  p_etapa uuid default null, p_status text default null,
  p_valor_min numeric default null, p_valor_max numeric default null,
  p_motivo_perda uuid default null
)
returns table (etapa text, ordem integer, passagens bigint, dias_medios numeric)
language sql stable security invoker
set search_path = public
as $$
  with alvo as (
    select id from public.negocios_do_recorte(
      p_de, p_ate, p_responsavel, p_origem, p_produto, p_area,
      p_incluir_parados, p_etapa, p_status, p_valor_min, p_valor_max, p_motivo_perda)
  ),
  saidas as (
    select ev.negocio_id, ev.valor_anterior as etapa_id, ev.ocorrido_em as saiu,
           coalesce(
             (select max(ent.ocorrido_em) from evento_negocio ent
               where ent.negocio_id = ev.negocio_id and ent.tipo = 'etapa'
                 and not ent.origem_carga and ent.valor_novo = ev.valor_anterior
                 and ent.ocorrido_em < ev.ocorrido_em),
             (select n.criado_em from negocio n where n.id = ev.negocio_id)
           ) as entrou
      from evento_negocio ev
     where ev.tipo = 'etapa' and not ev.origem_carga
       and ev.valor_anterior is not null
       and ev.negocio_id in (select id from alvo)
  )
  select e.nome::text, e.ordem, count(*)::bigint,
         round(avg(extract(epoch from (s.saiu - s.entrou)) / 86400)::numeric, 1)
    from saidas s join etapa e on e.id::text = s.etapa_id
   where s.entrou is not null and s.saiu > s.entrou
   group by e.nome, e.ordem order by e.ordem;
$$;

-- ---------- Valor inicial x final ----------
create function public.indicadores_valor_inicial_final(
  p_de date default null, p_ate date default null,
  p_responsavel uuid default null, p_origem uuid default null,
  p_produto uuid default null, p_area uuid default null,
  p_incluir_parados boolean default false,
  p_etapa uuid default null, p_status text default null,
  p_valor_min numeric default null, p_valor_max numeric default null,
  p_motivo_perda uuid default null
)
returns table (negocios bigint, soma_inicial numeric, soma_final numeric, variacao numeric)
language sql stable security invoker
set search_path = public
as $$
  with alvo as (
    select id from public.negocios_do_recorte(
      p_de, p_ate, p_responsavel, p_origem, p_produto, p_area,
      p_incluir_parados, p_etapa, p_status, p_valor_min, p_valor_max, p_motivo_perda)
  ),
  por_negocio as (
    select ev.negocio_id,
           (array_agg(nullif(ev.valor_anterior, '0.00') order by ev.ocorrido_em)
              filter (where ev.valor_anterior is not null
                        and nullif(ev.valor_anterior, '0.00') is not null))[1]::numeric as inicial,
           (array_agg(ev.valor_novo order by ev.ocorrido_em desc)
              filter (where ev.valor_novo is not null))[1]::numeric as final
      from evento_negocio ev
     where ev.tipo = 'valor' and not ev.origem_carga
       and ev.negocio_id in (select id from alvo)
     group by ev.negocio_id
  )
  select count(*)::bigint, coalesce(sum(inicial), 0), coalesce(sum(final), 0),
         case when coalesce(sum(inicial), 0) = 0 then null
              else round((sum(final) - sum(inicial)) * 100 / sum(inicial), 1) end
    from por_negocio where inicial is not null and final is not null;
$$;

-- ---------- Por dimensao ----------
create function public.indicadores_por_dimensao(
  p_dimensao text,
  p_de date default null, p_ate date default null,
  p_responsavel uuid default null, p_origem uuid default null,
  p_produto uuid default null, p_area uuid default null,
  p_incluir_parados boolean default false,
  p_etapa uuid default null, p_status text default null,
  p_valor_min numeric default null, p_valor_max numeric default null,
  p_motivo_perda uuid default null
)
returns table (rotulo text, negocios bigint, valor numeric, ganhos bigint)
language sql stable security invoker
set search_path = public
as $$
  with alvo as (
    select n.* from negocio n
     where n.id in (select id from public.negocios_do_recorte(
       p_de, p_ate, p_responsavel, p_origem, p_produto, p_area,
       p_incluir_parados, p_etapa, p_status, p_valor_min, p_valor_max, p_motivo_perda))
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
      end, '(sem informação)')::text,
    count(*), coalesce(sum(a.valor), 0), count(*) filter (where a.status = 'ganho')
    from alvo a
   where p_dimensao <> 'motivo_perda' or a.status = 'perdido'
   group by 1 order by 2 desc;
$$;

revoke all on function public.negocios_do_recorte(date, date, uuid, uuid, uuid, uuid, boolean, uuid, text, numeric, numeric, uuid) from anon;
revoke all on function public.indicadores_resumo(date, date, uuid, uuid, uuid, uuid, boolean, uuid, text, numeric, numeric, uuid) from anon;
revoke all on function public.indicadores_serie_mensal(date, date, uuid, uuid, uuid, uuid, boolean, uuid, text, numeric, numeric, uuid) from anon;
revoke all on function public.indicadores_funil(date, date, uuid, uuid, uuid, uuid, boolean, uuid, text, numeric, numeric, uuid) from anon;
revoke all on function public.indicadores_lead_time(date, date, uuid, uuid, uuid, uuid, boolean, uuid, text, numeric, numeric, uuid) from anon;
revoke all on function public.indicadores_valor_inicial_final(date, date, uuid, uuid, uuid, uuid, boolean, uuid, text, numeric, numeric, uuid) from anon;
revoke all on function public.indicadores_por_dimensao(text, date, date, uuid, uuid, uuid, uuid, boolean, uuid, text, numeric, numeric, uuid) from anon;
