-- ============================================================
-- CRM Lure — busca no Kanban e preferencia de filtro por usuario.
--
-- Duas coisas pedidas na sessao 13, que caem no mesmo arquivo porque
-- ambas existem para o mesmo fim: fazer o quadro abrir ja no recorte de
-- quem abriu, em vez de despejar a base inteira e esperar que a pessoa
-- filtre de novo toda vez.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Busca do Kanban
--
-- ⚠️ Ela mora no banco pelo MESMO motivo da busca de Atividades
-- (20260820200000): a C-04 registra que o PostgREST nao aceita coluna
-- de tabela vinculada dentro de um `or`, e o cartao do Kanban mostra
-- titulo E organizacao. Procurar "Sicoob" e nao achar o cartao que tem
-- "Sicoob" escrito nele seria a busca mentindo.
--
-- ⚠️ A saida de dois passos (buscar ids da organizacao e passar em
-- `in`) e a que a Lista usa, com teto de 200 ids. Aqui ela nao serve
-- pelo mesmo motivo daquela migracao: sao 2.897 organizacoes, e um
-- termo curto passaria do teto CALADO — resultado incompleto com cara
-- de completo. No banco o join e o join.
--
-- ⚠️ A funcao devolve a COLUNA INTEIRA ja paginada, e nao uma lista de
-- ids, porque a R-006 continua valendo com busca: "Proposta Enviada"
-- tem 1.168 negocios e uma busca por "a" acha quase todos. Paginar no
-- banco e o que impede a tela de carregar isso.
--
-- ⚠️ `count(*) over ()` conta ANTES do offset/limit — e assim que o
-- numero no cabecalho da coluna continua sendo o total do recorte, e
-- nao quantos couberam na fatia. Coluna vazia nao devolve linha
-- nenhuma, entao a tela le total 0, que e o certo.
--
-- ⚠️ `security invoker` (o padrao): a RLS de `negocio` continua
-- valendo. Esta funcao nao mostra nada que o usuario ja nao pudesse ver.
-- ------------------------------------------------------------

-- O indice trigram de negocio.titulo e organizacao.nome ja existe desde
-- a busca de Atividades; `sem_acento` tambem. Nada a criar aqui.

create or replace function public.kanban_coluna(
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
  total            bigint
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
  select id, titulo, valor, status,
         organizacao_nome, usuario_nome, usuario_foto,
         count(*) over () as total
    from filtrados
   order by criado_em desc
  offset greatest(0, coalesce(p_deslocamento, 0))
   limit greatest(1, least(coalesce(p_limite, 20), 100))
$$;

revoke execute on function
  public.kanban_coluna(uuid, text, uuid, integer, integer) from anon;
grant execute on function
  public.kanban_coluna(uuid, text, uuid, integer, integer) to authenticated;

-- ------------------------------------------------------------
-- 2. Preferencia de filtro por usuario
--
-- `preferencia_lista_negocios` ja existia desde 18/08 (B-045) e guarda a
-- querystring da Lista. Estas duas repetem o padrao para o Kanban e para
-- Atividades, para que os TRES lugares onde se filtra por responsavel
-- voltem iguais no login seguinte.
--
-- ⚠️ NULO e VAZIO nao sao a mesma coisa, e a diferenca e a regra inteira:
--
--   null  — nunca escolheu nada. A tela abre no recorte de quem abriu
--           ("so os meus"), que e o pedido desta sessao.
--   ''    — escolheu explicitamente ver TUDO (clicou em "Limpar").
--           A tela abre sem filtro e NAO reaplica o padrao.
--
-- Sem essa distincao, "Limpar filtros" seria desfeito no proximo
-- carregamento pelo proprio padrao, e o botao pareceria quebrado.
-- Por isso nao ha `default ''` aqui: o nulo e informacao.
-- ------------------------------------------------------------

alter table usuario
  add column if not exists preferencia_kanban     text,
  add column if not exists preferencia_atividades text;

comment on column usuario.preferencia_kanban is
  'Querystring do ultimo filtro do Kanban. Nulo = nunca escolheu (abre em "meus"); vazio = escolheu ver tudo.';
comment on column usuario.preferencia_atividades is
  'Querystring do ultimo filtro de Atividades. Nulo = nunca escolheu (abre em "meus"); vazio = escolheu ver tudo.';
