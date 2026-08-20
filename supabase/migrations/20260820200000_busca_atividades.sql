-- ============================================================
-- CRM Lure — busca na tela de Atividades.
--
-- ⚠️ Ela mora no banco, e nao numa consulta do PostgREST, por causa da
-- C-04: o PostgREST NAO aceita coluna de tabela vinculada dentro de um
-- `or` — devolve PGRST100. A busca precisa cobrir o titulo da atividade,
-- a descricao E o nome do que ela toca (negocio, organizacao, pessoa),
-- que sao justamente colunas vinculadas.
--
-- A saida da C-04 na Lista de negocios foi buscar os ids em duas etapas,
-- com teto de 200 ids para nao estourar a URL. Aqui isso nao serve: sao
-- 2.896 organizacoes e 4.603 pessoas, e um termo curto passaria do teto
-- calado — devolvendo resultado INCOMPLETO com cara de completo, que e
-- pior do que erro. No banco o join e o join, sem teto artificial.
--
-- ⚠️ Devolve so os IDS. A tela ja tem a consulta que monta a atividade
-- inteira com os vinculos (SELECAO); duplicar aquela projecao aqui
-- criaria duas descricoes da mesma linha, que um dia divergem.
--
-- ⚠️ `security invoker` (o padrao): a RLS de `atividade` continua
-- valendo. Esta funcao nao ve nada que o usuario ja nao pudesse ver.
-- ============================================================

create extension if not exists pg_trgm;
create extension if not exists unaccent;

-- ---------- busca sem acento ----------
-- ⚠️ Medido antes de decidir: "reuniao" achava 5 resultados e "reuniao"
-- COM til achava 300. Em portugues ninguem digita acento em campo de
-- busca, entao a versao sensivel a acento entrega 1,6% do que existe —
-- e sem dizer que esta escondendo o resto.
--
-- ⚠️ `unaccent` e STABLE, nao IMMUTABLE, porque depende de um
-- dicionario que poderia mudar. Indice funcional exige IMMUTABLE. A
-- forma de dois argumentos fixa o dicionario, e este involucro declara
-- a imutabilidade explicitamente. A promessa so quebraria se o arquivo
-- de dicionario do servidor mudasse — o que nao acontece numa instancia
-- gerenciada, e se acontecesse bastaria um REINDEX.
create or replace function public.sem_acento(t text)
returns text
language sql immutable strict parallel safe
set search_path = ''
as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, t)
$$;

-- ---------- indices ----------
-- ⚠️ `ilike '%x%'` nao usa indice B-tree: o curinga na frente impede.
-- `pg_trgm` e o que torna busca por pedaco de palavra indexavel — sem
-- ele, cada tecla digitada varre 6.522 atividades, 2.896 organizacoes e
-- 4.603 pessoas.
--
-- ⚠️ A expressao do indice tem de ser IDENTICA a da consulta. Indexar
-- `titulo` e consultar `sem_acento(titulo)` nao aproveita nada — o
-- planejador nao sabe que sao a mesma coisa.
create index if not exists atividade_titulo_trgm
  on atividade using gin (public.sem_acento(titulo) gin_trgm_ops);
create index if not exists atividade_descricao_trgm
  on atividade using gin (public.sem_acento(descricao) gin_trgm_ops);
create index if not exists negocio_titulo_trgm
  on negocio using gin (public.sem_acento(titulo) gin_trgm_ops);
create index if not exists organizacao_nome_trgm
  on organizacao using gin (public.sem_acento(nome) gin_trgm_ops);
create index if not exists pessoa_nome_trgm
  on pessoa using gin (public.sem_acento(nome) gin_trgm_ops);

-- ---------- a busca ----------
create or replace function public.atividades_busca(
  p_termo        text,
  p_situacao     text    default 'pendentes',
  p_responsavel  uuid    default null,
  p_tipo         uuid    default null,
  p_limite       integer default 100
)
returns table (id uuid, data date)
language sql stable
set search_path = ''
as $$
  with alvo as (
    select '%' || public.sem_acento(btrim(p_termo)) || '%' as padrao
  )
  select a.id, a.data
    from public.atividade a
    left join public.negocio        n on n.id = a.negocio_id
    left join public.organizacao    o on o.id = a.organizacao_id
    left join public.pessoa         p on p.id = a.pessoa_id
    left join public.tipo_atividade t on t.id = a.tipo_id
   cross join alvo
   where btrim(coalesce(p_termo, '')) <> ''
     and (
          public.sem_acento(a.titulo)    ilike alvo.padrao
       or public.sem_acento(a.descricao) ilike alvo.padrao
       or public.sem_acento(n.titulo)    ilike alvo.padrao
       or public.sem_acento(o.nome)      ilike alvo.padrao
       or public.sem_acento(p.nome)      ilike alvo.padrao
       -- O tipo entra porque "reuniao" e como as pessoas procuram, mesmo
       -- quando a atividade nao tem titulo nenhum — e 1.624 nao tem.
       or public.sem_acento(t.nome)      ilike alvo.padrao
     )
     and (p_situacao = 'todas'
          or (p_situacao = 'pendentes'  and not a.concluida)
          or (p_situacao = 'concluidas' and a.concluida))
     and (p_responsavel is null or a.responsavel_id = p_responsavel)
     and (p_tipo is null or a.tipo_id = p_tipo)
   -- Mais recente primeiro: quem busca costuma procurar o que aconteceu
   -- ha pouco, nao o de 2021.
   order by a.data desc, a.hora_inicio desc nulls last
   limit greatest(1, least(coalesce(p_limite, 100), 300))
$$;

revoke execute on function public.atividades_busca(text, text, uuid, uuid, integer) from anon;
grant  execute on function public.atividades_busca(text, text, uuid, uuid, integer) to authenticated;

revoke execute on function public.sem_acento(text) from anon;
grant  execute on function public.sem_acento(text) to authenticated;
