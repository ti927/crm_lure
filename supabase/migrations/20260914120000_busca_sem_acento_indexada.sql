-- ============================================================
-- CRM Lure — busca sem acento, e indexada, nas consultas do PostgREST.
--
-- Pedido da sessao 17: "a busca tem que funcionar sem acento tbm" e "a
-- busca de qualquer lugar esta com lag".
--
-- ⚠️ O PROBLEMA NAO ERA O BANCO, E ISSO FOI MEDIDO. Contra a base real,
-- desta maquina:
--
--     uma ida vazia ao PostgREST ......... ~180 ms
--     6 idas EM SERIE ..................... 938 ms
--     6 idas EM PARALELO .................. 263 ms
--     a consulta em si (ilike + count) ..... < 11 ms
--
-- Ou seja: 95% do custo e ida-e-volta, nao trabalho de banco. E a mesma
-- restricao que a D-124, a D-159 e a D-160 ja registraram, pela quarta
-- vez. Esta migration cuida do acento e do indice; o numero de idas se
-- resolve no codigo da aplicacao, nao aqui.
--
-- ⚠️ POR QUE COLUNA GERADA, E NAO FUNCAO NO BANCO. Os indices
-- `gin(sem_acento(nome))` ja existiam desde 20/08 — e eram inalcancaveis
-- pelo PostgREST, que nao sabe escrever `sem_acento(nome) ilike ?` num
-- filtro. A saida que o projeto ja usou duas vezes (D-147, busca de
-- Atividades) e mover a consulta inteira para uma funcao. Aqui isso
-- custaria reescrever a paginacao, a ordenacao e os dez filtros da Lista
-- de Negocios para resolver um acento. A coluna gerada resolve o mesmo
-- com `.ilike("nome_busca", …)` e sem tocar em nada disso.
--
-- ⚠️ COLUNA GERADA E O UNICO CAMPO NOVO EM `organizacao` QUE NAO OBRIGA
-- A MEXER NA FUSAO. A regra do CLAUDE.md continua valendo para campo de
-- dado — `funde_organizacao` adota o vazio e apaga a duplicada, entao um
-- campo que ela nao conheca some calado. Esta nao e dado proprio: e
-- `nome` escrito de outro jeito, derivada pelo banco, impossivel de
-- escrever e recalculada sozinha quando `nome` muda. Nao ha o que
-- adotar.
--
-- ⚠️ `sem_acento` e declarada `immutable` de proposito — ela chama
-- `unaccent` na forma de DOIS argumentos, com o dicionario explicito.
-- A forma de um argumento e apenas `stable`, e coluna gerada recusa
-- funcao que nao seja imutavel. Sem aquela escolha de 20/08 esta
-- migration nao existiria.
--
-- ⚠️ Guardado em MINUSCULAS. Assim o mesmo indice serve a `like` e a
-- `ilike`, e o termo que a aplicacao manda passa por uma normalizacao
-- so — `semAcento()` em `lib/formato.ts`, que e o par desta funcao do
-- lado do navegador.
-- ============================================================

alter table public.organizacao
  add column if not exists nome_busca text
  generated always as (public.sem_acento(lower(nome))) stored;

alter table public.pessoa
  add column if not exists nome_busca text
  generated always as (public.sem_acento(lower(nome))) stored;

alter table public.negocio
  add column if not exists titulo_busca text
  generated always as (public.sem_acento(lower(titulo))) stored;

comment on column public.organizacao.nome_busca is
  'O nome sem acento e em minusculas, derivado pelo banco. Serve so para busca — nunca se escreve nela. Par de `semAcento()` em lib/formato.ts.';
comment on column public.pessoa.nome_busca is
  'O nome sem acento e em minusculas, derivado pelo banco. Serve so para busca — nunca se escreve nela.';
comment on column public.negocio.titulo_busca is
  'O titulo sem acento e em minusculas, derivado pelo banco. Serve so para busca — nunca se escreve nela.';

-- ⚠️ `ilike '%x%'` nao usa indice B-tree: o curinga na frente impede.
-- `pg_trgm` e o que torna busca por pedaco de palavra indexavel. Sem
-- estes tres, cada tecla varre 2.897 organizacoes, 4.606 pessoas e
-- 2.461 negocios.
create index if not exists organizacao_nome_busca_trgm
  on public.organizacao using gin (nome_busca extensions.gin_trgm_ops);
create index if not exists pessoa_nome_busca_trgm
  on public.pessoa using gin (nome_busca extensions.gin_trgm_ops);
create index if not exists negocio_titulo_busca_trgm
  on public.negocio using gin (titulo_busca extensions.gin_trgm_ops);

analyze public.organizacao;
analyze public.pessoa;
analyze public.negocio;
