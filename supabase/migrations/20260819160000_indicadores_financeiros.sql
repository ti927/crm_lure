-- Indicadores financeiros (D-131). O padrao de leitura e o do Insights
-- do Pipedrive: receita realizada, ticket medio, evolucao no tempo e
-- recortes por vendedor, origem e produto.
--
-- ⚠️ A diferenca em relacao aos indicadores comerciais (D-130) e o EIXO
-- DO TEMPO. La o periodo filtra `criado_em` — "quando o lead entrou".
-- Aqui filtra `fechado_em` — "quando entrou dinheiro". Sao perguntas
-- diferentes, e para 2021 a resposta difere em 3,5x.
--
-- ⚠️ Nao ha projecao de receita, e nao pode haver: nao existe data
-- prevista de fechamento neste sistema (D-024). Tudo aqui e realizado,
-- mais o que esta em aberto SEM prever quando fecha.
--
-- ⚠️ `parado` nao entra em pipeline aberto: cadastro dormente nao e
-- receita a caminho (D-067). O interruptor da tela nao vale aqui — em
-- financeiro, dormente e ruido.

-- ---------- 1. Cabecalho do periodo, com comparativo ----------
create or replace function public.financeiro_resumo(
  p_de date default null, p_ate date default null,
  p_responsavel uuid default null, p_origem uuid default null,
  p_produto uuid default null, p_area uuid default null
)
returns table (
  receita             numeric,
  contratos           bigint,
  ticket_medio        numeric,
  valor_perdido       numeric,
  contratos_perdidos  bigint,
  pipeline_aberto     numeric,
  negocios_abertos    bigint,
  receita_anterior    numeric,
  contratos_anterior  bigint
)
language sql stable security invoker
set search_path = public
as $$
  with
  -- Janela anterior do mesmo tamanho, para o comparativo. Sem periodo
  -- escolhido nao ha "anterior" — e comparar contra a base inteira nao
  -- significaria nada.
  janela as (
    select p_de as de, p_ate as ate,
           case when p_de is not null and p_ate is not null
                then p_de - (p_ate - p_de) - 1 end as de_ant,
           case when p_de is not null and p_ate is not null
                then p_de - 1 end as ate_ant
  ),
  fechados as (
    select n.status, n.valor, n.fechado_em
      from negocio n
      left join produto pr on pr.id = n.produto_id
     where n.fechado_em is not null
       and (p_responsavel is null or n.responsavel_id = p_responsavel)
       and (p_origem      is null or n.origem_id      = p_origem)
       and (p_produto     is null or n.produto_id     = p_produto)
       and (p_area        is null or pr.area_id       = p_area)
  ),
  abertos as (
    select n.valor
      from negocio n
      left join produto pr on pr.id = n.produto_id
     -- Aberto de verdade: em negociacao. Parado e cadastro dormente.
     where n.status = 'negociacao'
       and (p_responsavel is null or n.responsavel_id = p_responsavel)
       and (p_origem      is null or n.origem_id      = p_origem)
       and (p_produto     is null or n.produto_id     = p_produto)
       and (p_area        is null or pr.area_id       = p_area)
  ),
  no_periodo as (
    select f.* from fechados f, janela j
     where (j.de  is null or f.fechado_em >= j.de::timestamptz)
       and (j.ate is null or f.fechado_em <  (j.ate + 1)::timestamptz)
  ),
  anterior as (
    select f.* from fechados f, janela j
     where j.de_ant is not null
       and f.fechado_em >= j.de_ant::timestamptz
       and f.fechado_em <  (j.ate_ant + 1)::timestamptz
  )
  select
    coalesce((select sum(valor) filter (where status = 'ganho') from no_periodo), 0),
    (select count(*) filter (where status = 'ganho') from no_periodo),
    -- Ticket medio: so faz sentido sobre contratos ganhos.
    (select round(avg(valor) filter (where status = 'ganho'), 2) from no_periodo),
    coalesce((select sum(valor) filter (where status = 'perdido') from no_periodo), 0),
    (select count(*) filter (where status = 'perdido') from no_periodo),
    coalesce((select sum(valor) from abertos), 0),
    (select count(*) from abertos),
    coalesce((select sum(valor) filter (where status = 'ganho') from anterior), 0),
    (select count(*) filter (where status = 'ganho') from anterior);
$$;

-- ---------- 2. Evolucao mensal da receita ----------
create or replace function public.financeiro_mensal(
  p_de date default null, p_ate date default null,
  p_responsavel uuid default null, p_origem uuid default null,
  p_produto uuid default null, p_area uuid default null
)
returns table (mes date, receita numeric, contratos bigint, perdido numeric, ticket numeric)
language sql stable security invoker
set search_path = public
as $$
  select date_trunc('month', n.fechado_em)::date,
         coalesce(sum(n.valor) filter (where n.status = 'ganho'), 0),
         count(*) filter (where n.status = 'ganho'),
         coalesce(sum(n.valor) filter (where n.status = 'perdido'), 0),
         round(avg(n.valor) filter (where n.status = 'ganho'), 2)
    from negocio n
    left join produto pr on pr.id = n.produto_id
   where n.fechado_em is not null
     and (p_de  is null or n.fechado_em >= p_de::timestamptz)
     and (p_ate is null or n.fechado_em <  (p_ate + 1)::timestamptz)
     and (p_responsavel is null or n.responsavel_id = p_responsavel)
     and (p_origem      is null or n.origem_id      = p_origem)
     and (p_produto     is null or n.produto_id     = p_produto)
     and (p_area        is null or pr.area_id       = p_area)
   group by 1
   order by 1;
$$;

-- ---------- 3. Receita por dimensao ----------
create or replace function public.financeiro_por_dimensao(
  p_dimensao text,
  p_de date default null, p_ate date default null,
  p_responsavel uuid default null, p_origem uuid default null,
  p_produto uuid default null, p_area uuid default null
)
returns table (rotulo text, receita numeric, contratos bigint, ticket numeric, perdido numeric)
language sql stable security invoker
set search_path = public
as $$
  select
    coalesce(
      case p_dimensao
        when 'responsavel' then (select u.nome from usuario u where u.id = n.responsavel_id)
        when 'origem'      then (select o.nome from origem o  where o.id = n.origem_id)
        when 'produto'     then (select p.nome from produto p where p.id = n.produto_id)
        when 'area'        then (select a.nome from area_produto a
                                  join produto p2 on p2.area_id = a.id
                                 where p2.id = n.produto_id)
        when 'organizacao' then (select o.nome from organizacao o where o.id = n.organizacao_id)
      end, '(sem informação)')::text,
    coalesce(sum(n.valor) filter (where n.status = 'ganho'), 0),
    count(*) filter (where n.status = 'ganho'),
    round(avg(n.valor) filter (where n.status = 'ganho'), 2),
    coalesce(sum(n.valor) filter (where n.status = 'perdido'), 0)
    from negocio n
    left join produto pr on pr.id = n.produto_id
   where n.fechado_em is not null
     and (p_de  is null or n.fechado_em >= p_de::timestamptz)
     and (p_ate is null or n.fechado_em <  (p_ate + 1)::timestamptz)
     and (p_responsavel is null or n.responsavel_id = p_responsavel)
     and (p_origem      is null or n.origem_id      = p_origem)
     and (p_produto     is null or n.produto_id     = p_produto)
     and (p_area        is null or pr.area_id       = p_area)
   group by 1
   -- Receita manda na ordem; sem contrato ganho, quantidade desempata.
   order by 2 desc, 3 desc;
$$;

-- ---------- 4. Pipeline em aberto, por etapa ----------
-- ⚠️ Sem probabilidade e sem previsao (D-024): e o valor que esta na mesa
-- hoje, etapa a etapa. Nao e receita esperada, e nao deve ser lido assim.
create or replace function public.financeiro_pipeline(
  p_responsavel uuid default null, p_origem uuid default null,
  p_produto uuid default null, p_area uuid default null
)
returns table (etapa text, ordem integer, negocios bigint, valor numeric)
language sql stable security invoker
set search_path = public
as $$
  select e.nome::text, e.ordem,
         count(n.id), coalesce(sum(n.valor), 0)
    from etapa e
    left join negocio n
           on n.etapa_id = e.id
          and n.status = 'negociacao'
          and (p_responsavel is null or n.responsavel_id = p_responsavel)
          and (p_origem      is null or n.origem_id      = p_origem)
          and (p_produto     is null or n.produto_id     = p_produto)
          and (p_area        is null or exists (
                select 1 from produto p2
                 where p2.id = n.produto_id and p2.area_id = p_area))
   group by e.nome, e.ordem
   order by e.ordem;
$$;

-- ---------- 5. Maiores contratos do periodo ----------
create or replace function public.financeiro_maiores(
  p_de date default null, p_ate date default null,
  p_responsavel uuid default null, p_origem uuid default null,
  p_produto uuid default null, p_area uuid default null,
  p_limite integer default 10
)
returns table (
  id uuid, titulo text, organizacao text, valor numeric,
  fechado_em timestamptz, responsavel text
)
language sql stable security invoker
set search_path = public
as $$
  select n.id, n.titulo::text, o.nome::text, n.valor, n.fechado_em,
         coalesce(u.nome, '—')::text
    from negocio n
    join organizacao o on o.id = n.organizacao_id
    left join usuario u on u.id = n.responsavel_id
    left join produto pr on pr.id = n.produto_id
   where n.status = 'ganho'
     and n.fechado_em is not null
     and (p_de  is null or n.fechado_em >= p_de::timestamptz)
     and (p_ate is null or n.fechado_em <  (p_ate + 1)::timestamptz)
     and (p_responsavel is null or n.responsavel_id = p_responsavel)
     and (p_origem      is null or n.origem_id      = p_origem)
     and (p_produto     is null or n.produto_id     = p_produto)
     and (p_area        is null or pr.area_id       = p_area)
   order by n.valor desc nulls last
   limit greatest(1, least(p_limite, 50));
$$;

revoke all on function public.financeiro_resumo(date, date, uuid, uuid, uuid, uuid) from anon;
revoke all on function public.financeiro_mensal(date, date, uuid, uuid, uuid, uuid) from anon;
revoke all on function public.financeiro_por_dimensao(text, date, date, uuid, uuid, uuid, uuid) from anon;
revoke all on function public.financeiro_pipeline(uuid, uuid, uuid, uuid) from anon;
revoke all on function public.financeiro_maiores(date, date, uuid, uuid, uuid, uuid, integer) from anon;
