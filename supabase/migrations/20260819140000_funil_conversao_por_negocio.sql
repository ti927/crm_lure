-- Correcao do funil de conversao (indicador 7 da D-063).
--
-- ⚠️ A primeira versao dividia o total de uma etapa pelo total da
-- anterior e devolvia coisas como 559%. Nao era erro de SQL: era erro de
-- modelo. Funil como razao entre totais consecutivos so faz sentido se
-- todo negocio entrar pelo topo — e nesta base a maioria NAO entra:
-- 1.168 dos 2.458 nasceram direto em "Proposta Enviada", porque no
-- Pipedrive se cadastrava o negocio na etapa em que ele ja estava.
--
-- A medida correta e por negocio, e olhando para a frente: dos que
-- alcancaram esta etapa, quantos tambem alcancaram a proxima. Nunca passa
-- de 100%, sobrevive a entrada pelo meio, e responde a pergunta que o
-- funil existe para responder — ONDE o negocio para.
--
-- A ultima etapa fica com conversao nula: nao ha proxima.

-- ⚠️ `create or replace` nao serve aqui: a coluna `avancaram` muda o tipo
-- de retorno, e o Postgres recusa (42P13, "cannot change return type of
-- existing function"). Tem que derrubar antes. Nenhuma tela depende dela
-- ainda — o modulo de estatisticas esta sendo construido nesta sessao.
drop function if exists public.indicadores_funil(date, date, uuid, uuid, uuid, uuid, boolean);

create function public.indicadores_funil(
  p_de date default null, p_ate date default null,
  p_responsavel uuid default null, p_origem uuid default null,
  p_produto uuid default null, p_area uuid default null,
  p_incluir_parados boolean default false
)
returns table (etapa text, ordem integer, alcancaram bigint, avancaram bigint, conversao numeric)
language sql stable security invoker
set search_path = public
as $$
  with alvo as (
    select id from public.negocios_do_recorte(
      p_de, p_ate, p_responsavel, p_origem, p_produto, p_area, p_incluir_parados)
  ),
  -- Um negocio "alcancou" uma etapa se ha evento cujo destino foi ela,
  -- ou se ele esta nela agora. A segunda metade e indispensavel: negocio
  -- criado e nunca movido nao tem evento nenhum.
  alcance as (
    select distinct e.ordem, n.id as negocio_id
      from etapa e
      join negocio n on n.id in (select id from alvo)
     where n.etapa_id = e.id
        or exists (select 1 from evento_negocio ev
                    where ev.negocio_id = n.id
                      and ev.tipo = 'etapa'
                      and not ev.origem_carga
                      and ev.valor_novo = e.id::text)
  )
  select e.nome::text,
         e.ordem,
         count(distinct a.negocio_id)                       as alcancaram,
         count(distinct seguinte.negocio_id)                as avancaram,
         case when count(distinct a.negocio_id) = 0 then null
              else round(count(distinct seguinte.negocio_id)::numeric * 100
                         / count(distinct a.negocio_id), 1)
         end                                                as conversao
    from etapa e
    left join alcance a on a.ordem = e.ordem
    -- O mesmo negocio, uma etapa adiante. Sem par, nao avancou.
    left join alcance seguinte
           on seguinte.ordem = e.ordem + 1
          and seguinte.negocio_id = a.negocio_id
   group by e.nome, e.ordem
   order by e.ordem;
$$;

revoke all on function public.indicadores_funil(date, date, uuid, uuid, uuid, uuid, boolean) from anon;
