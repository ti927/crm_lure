-- Indicadores que so fazem sentido com volume (D-134).
--
-- Sao 2.458 negocios, 2.152 desfechos e cinco anos de historico. Contagem
-- por categoria e o que se olha quando ha pouco dado; com esse volume da
-- para responder perguntas que mudam decisao:
--
--   · quanto tempo leva para fechar, e se demorar aumenta ou reduz a
--     chance de ganhar;
--   · qual o ticket TIPICO — a media esta contaminada por poucos
--     contratos grandes, e mediana e media contam historias diferentes;
--   · quanto dinheiro cada motivo de perda levou, e nao quantas vezes ele
--     apareceu: perder 30 negocios pequenos nao e perder 5 grandes.

-- ---------- 1. Ciclo de venda ----------
-- Da entrada ao desfecho. So para quem fechou: negocio aberto ainda nao
-- tem ciclo, e conta-lo como "ciclo curto" seria mentira.
create or replace function public.indicadores_ciclo(
  p_de date default null, p_ate date default null,
  p_responsavel uuid default null, p_origem uuid default null,
  p_produto uuid default null, p_area uuid default null
)
returns table (
  faixa       text,
  ordem       integer,
  negocios    bigint,
  ganhos      bigint,
  taxa_ganho  numeric,
  valor_ganho numeric
)
language sql stable security invoker
set search_path = public
as $$
  with fechados as (
    select n.status, n.valor,
           extract(epoch from (n.fechado_em - n.criado_em)) / 86400 as dias
      from negocio n
      left join produto pr on pr.id = n.produto_id
     where n.fechado_em is not null
       and n.fechado_em >= n.criado_em
       and (p_de  is null or n.fechado_em >= p_de::timestamptz)
       and (p_ate is null or n.fechado_em <  (p_ate + 1)::timestamptz)
       and (p_responsavel is null or n.responsavel_id = p_responsavel)
       and (p_origem      is null or n.origem_id      = p_origem)
       and (p_produto     is null or n.produto_id     = p_produto)
       and (p_area        is null or pr.area_id       = p_area)
  ),
  classificado as (
    select case
             when dias <   8 then 1
             when dias <  31 then 2
             when dias <  91 then 3
             when dias < 181 then 4
             else 5
           end as ordem,
           status, valor
      from fechados
  )
  select (array['Até 1 semana','Até 1 mês','1 a 3 meses','3 a 6 meses','Mais de 6 meses'])[c.ordem],
         c.ordem,
         count(*),
         count(*) filter (where c.status = 'ganho'),
         round(count(*) filter (where c.status = 'ganho')::numeric * 100 / count(*), 1),
         coalesce(sum(c.valor) filter (where c.status = 'ganho'), 0)
    from classificado c
   group by c.ordem
   order by c.ordem;
$$;

-- ---------- 2. Distribuicao do ticket ----------
-- ⚠️ A media sozinha engana nesta base: o maior contrato e R$ 408 mil e o
-- menor tem tres digitos. Mediana e quartis dizem qual e o negocio
-- TIPICO; a media diz quanto entrou dividido por quantos.
create or replace function public.indicadores_ticket(
  p_de date default null, p_ate date default null,
  p_responsavel uuid default null, p_origem uuid default null,
  p_produto uuid default null, p_area uuid default null
)
returns table (
  contratos bigint,
  media     numeric,
  mediana   numeric,
  q1        numeric,
  q3        numeric,
  maior     numeric
)
language sql stable security invoker
set search_path = public
as $$
  select count(*),
         round(avg(n.valor), 2),
         round(percentile_cont(0.5)  within group (order by n.valor)::numeric, 2),
         round(percentile_cont(0.25) within group (order by n.valor)::numeric, 2),
         round(percentile_cont(0.75) within group (order by n.valor)::numeric, 2),
         max(n.valor)
    from negocio n
    left join produto pr on pr.id = n.produto_id
   where n.status = 'ganho'
     and n.valor is not null
     and n.valor > 0
     and n.fechado_em is not null
     and (p_de  is null or n.fechado_em >= p_de::timestamptz)
     and (p_ate is null or n.fechado_em <  (p_ate + 1)::timestamptz)
     and (p_responsavel is null or n.responsavel_id = p_responsavel)
     and (p_origem      is null or n.origem_id      = p_origem)
     and (p_produto     is null or n.produto_id     = p_produto)
     and (p_area        is null or pr.area_id       = p_area);
$$;

revoke all on function public.indicadores_ciclo(date, date, uuid, uuid, uuid, uuid) from anon;
revoke all on function public.indicadores_ticket(date, date, uuid, uuid, uuid, uuid) from anon;
