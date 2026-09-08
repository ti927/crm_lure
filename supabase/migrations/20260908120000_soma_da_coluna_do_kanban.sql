-- ============================================================
-- CRM Lure — o total somado de cada coluna do Kanban.
--
-- Pedido da sessao 16: passar o mouse sobre o cabecalho das duas ultimas
-- etapas mostra o valor somado de TODOS os cartoes daquela coluna, como
-- o Pipedrive faz — e acompanhando o filtro que estiver valendo.
--
-- ⚠️ A soma NAO pode ser feita no navegador. A coluna chega paginada de
-- 20 em 20 (R-006), e "Proposta Enviada" tem 1.168 negocios: somar o que
-- esta na tela daria o total dos 20 primeiros com cara de total da
-- etapa. Numero errado com aparencia de certo e pior que numero nenhum.
--
-- ⚠️ Sai na MESMA ida ao banco que ja traz os cartoes, por window
-- function sobre `filtrados`, pelo mesmo motivo que `total` ja saia
-- assim: a restricao aqui e numero de idas ao pooler, nao custo de
-- consulta (a licao que a D-160 pagou em tres minutos contra tres
-- segundos). Seis etapas ja sao seis consultas em paralelo; uma soma
-- separada por etapa dobraria isso para doze.
--
-- ⚠️ `over ()` calcula ANTES do offset/limit — e por isso que a soma e
-- da coluna inteira, e nao da fatia carregada. Mesmo mecanismo do
-- `count(*) over ()` que sustenta o numero do cabecalho desde 27/08.
--
-- ⚠️ `com_valor` existe para a dica poder ser HONESTA. A base tem
-- negocio com valor zerado em toda parte — no print do pedido, as
-- quatro primeiras colunas sao "R$ 0,00" de cima a baixo. Uma soma
-- solta faria "R$ 144.000,00 em 45 negocios" parecer a media de 45
-- propostas quando sao 12. Dizer quantos cartoes de fato tem valor e o
-- que impede a dica de mentir por omissao.
--
-- ⚠️ Precisa de `drop` antes: `create or replace` nao muda a lista de
-- colunas devolvidas por uma funcao `returns table`. O corpo abaixo e o
-- de 20260827120000 palavra por palavra — so as tres linhas finais do
-- select sao novas.
-- ============================================================

drop function if exists public.kanban_coluna(uuid, text, uuid, integer, integer);

create function public.kanban_coluna(
  p_etapa        uuid,
  p_termo        text    default null,
  p_responsavel  uuid    default null,
  p_deslocamento integer default 0,
  p_limite       integer default 20
)
returns table (
  id               uuid,
  titulo           text,
  valor            numeric,
  status           public.status_negocio,
  organizacao_nome text,
  usuario_nome     text,
  usuario_foto     text,
  total            bigint,
  soma             numeric,
  com_valor        bigint
)
language sql stable
set search_path = ''
as $$
  with alvo as (
    select nullif(btrim(coalesce(p_termo, '')), '') as termo
  ),
  filtrados as (
    select n.id, n.titulo, n.valor, n.status, n.criado_em,
           o.nome     as organizacao_nome,
           u.nome     as usuario_nome,
           u.foto_url as usuario_foto
      from public.negocio n
      left join public.organizacao o on o.id = n.organizacao_id
      left join public.usuario     u on u.id = n.responsavel_id
     cross join alvo
     where n.etapa_id = p_etapa
       -- D-145: o funil so tem negocio ABERTO. Ganho e perdido saem do
       -- quadro no instante em que sao marcados — sao 2.153 dos 2.461.
       and n.status in ('parado', 'negociacao')
       and (p_responsavel is null or n.responsavel_id = p_responsavel)
       and (
            alvo.termo is null
         or public.sem_acento(n.titulo) ilike '%' || public.sem_acento(alvo.termo) || '%'
         or public.sem_acento(o.nome)   ilike '%' || public.sem_acento(alvo.termo) || '%'
       )
  )
  select f.id, f.titulo, f.valor, f.status,
         f.organizacao_nome, f.usuario_nome, f.usuario_foto,
         count(*) over ()                                          as total,
         -- ⚠️ `f.valor` qualificado: `valor` tambem e nome de coluna de
         -- saida desta funcao, e nome ambiguo dentro de um `filter` e
         -- exatamente onde isso morde.
         sum(coalesce(f.valor, 0)) over ()                          as soma,
         count(*) filter (where coalesce(f.valor, 0) <> 0) over ()  as com_valor
    from filtrados f
   order by f.criado_em desc
  offset greatest(0, coalesce(p_deslocamento, 0))
   limit greatest(1, least(coalesce(p_limite, 20), 100))
$$;

revoke execute on function
  public.kanban_coluna(uuid, text, uuid, integer, integer) from anon;
grant execute on function
  public.kanban_coluna(uuid, text, uuid, integer, integer) to authenticated;

comment on function public.kanban_coluna(uuid, text, uuid, integer, integer) is
  'Uma coluna do Kanban, ja paginada e no recorte do filtro. `total`, `soma` e `com_valor` sao do recorte INTEIRO, nao da fatia: `over ()` roda antes do offset/limit.';
