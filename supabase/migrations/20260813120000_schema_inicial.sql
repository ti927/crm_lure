-- ============================================================
-- CRM Lure — schema inicial
-- Doc 09 (Arquitetura Tecnica), secoes 3.1 a 3.6 e 3.10.
--
-- Convencoes validadas: nomes em portugues snake_case (T-01/D-099),
-- chave uuid (T-02), status como enum (T-03), numeric(14,2) para
-- dinheiro (T-04), timestamptz em UTC (T-05), exclusao real com
-- restricao nos vinculos (T-06/D-100).
-- ============================================================

create extension if not exists pg_trgm with schema extensions;

-- ---------- 3.1 Tipos e listas fixas ----------

-- D-042: o status e fixo em quatro valores. O enum torna isso
-- impossivel de violar por qualquer caminho de escrita.
create type status_negocio as enum ('parado', 'negociacao', 'ganho', 'perdido');
create type tipo_evento as enum ('etapa', 'valor', 'responsavel', 'status');

-- ---------- 3.3 Listas configuraveis ----------
-- Sem tela no MVP (D-096); populadas pela migracao do Pipedrive,
-- editadas pelo painel do Supabase quando necessario.

create table origem (
  id    uuid primary key default gen_random_uuid(),
  nome  text not null unique,
  ordem integer not null default 0,
  ativo boolean not null default true
);

create table motivo_perda (
  id    uuid primary key default gen_random_uuid(),
  nome  text not null unique,
  ordem integer not null default 0,
  ativo boolean not null default true
);

create table area_produto (
  id    uuid primary key default gen_random_uuid(),
  nome  text not null unique,
  ordem integer not null default 0,
  ativo boolean not null default true
);

create table tipo_atividade (
  id    uuid primary key default gen_random_uuid(),
  nome  text not null unique,
  ordem integer not null default 0,
  ativo boolean not null default true
);

-- ---------- 3.2 Usuarios e permissoes ----------

create table papel (
  id   uuid primary key default gen_random_uuid(),
  nome text not null unique          -- MVP: apenas 'completo' (D-049)
);

create table permissao (
  id    uuid primary key default gen_random_uuid(),
  chave text not null unique
);

create table papel_permissao (
  papel_id     uuid references papel(id) on delete cascade,
  permissao_id uuid references permissao(id) on delete cascade,
  primary key (papel_id, permissao_id)
);

-- usuario.id referencia auth.users: e o que amarra a conta Google ao
-- usuario do dominio. D-051: usuario nunca e excluido; `ativo` so
-- controla presenca nas listas de selecao.
create table usuario (
  id        uuid primary key references auth.users(id),
  nome      text not null,
  email     text not null unique,
  papel_id  uuid not null references papel(id),
  ativo     boolean not null default true,
  criado_em timestamptz not null default now()
);

-- O papel 'completo' nao e semente opcional: o gatilho de criacao de
-- usuario o procura pelo nome. Sem ele, ninguem consegue entrar.
insert into papel (nome) values ('completo') on conflict (nome) do nothing;

-- ---------- 3.4 Contatos ----------

-- Entidade central. Clientes pessoa fisica entram como organizacao comum.
create table organizacao (
  id        uuid primary key default gen_random_uuid(),
  nome      text not null,
  cidade    text,
  website   text,
  bubble_id text,                    -- identificador externo (D-075/D-076)
  criado_em timestamptz not null default now()
);

create table pessoa (
  id        uuid primary key default gen_random_uuid(),
  nome      text not null,
  criado_em timestamptz not null default now()
);

-- D-036: o cargo pertence ao vinculo, nao a pessoa.
create table pessoa_organizacao (
  pessoa_id      uuid references pessoa(id) on delete cascade,
  organizacao_id uuid references organizacao(id) on delete cascade,
  cargo          text,
  primary key (pessoa_id, organizacao_id)
);

create table forma_contato (
  id        uuid primary key default gen_random_uuid(),
  pessoa_id uuid not null references pessoa(id) on delete cascade,
  tipo      text not null check (tipo in ('telefone', 'email')),
  valor     text not null
);

-- ---------- 3.5 Funil e negocio ----------

create table funil (
  id   uuid primary key default gen_random_uuid(),
  nome text not null
);

create table etapa (
  id             uuid primary key default gen_random_uuid(),
  funil_id       uuid not null references funil(id),
  nome           text not null,
  ordem          integer not null,
  status_inicial status_negocio not null default 'negociacao',   -- D-045
  unique (funil_id, ordem)
);

create table produto (
  id      uuid primary key default gen_random_uuid(),
  nome    text not null,
  area_id uuid references area_produto(id)
);

create table negocio (
  id              uuid primary key default gen_random_uuid(),
  titulo          text not null,                              -- D-023
  organizacao_id  uuid not null references organizacao(id),   -- obrigatoria
  valor           numeric(14, 2),
  etapa_id        uuid references etapa(id),
  status          status_negocio not null default 'parado',
  origem_id       uuid references origem(id),
  produto_id      uuid references produto(id),                -- N:1 (D-032)
  responsavel_id  uuid references usuario(id),
  motivo_perda_id uuid references motivo_perda(id),
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),

  -- Regra 6 do Doc 06, no banco: perdido exige motivo. E a informacao
  -- que D-047 existe para capturar, e ela nao e recuperavel depois.
  constraint perdido_exige_motivo
    check (status <> 'perdido' or motivo_perda_id is not null)
);

create table negocio_pessoa (
  negocio_id uuid references negocio(id) on delete cascade,
  pessoa_id  uuid references pessoa(id) on delete cascade,
  primary key (negocio_id, pessoa_id)
);

-- ---------- 3.6 Atividades e anotacoes ----------

-- negocio_id not null e a regra "nao existe atividade orfa" (D-030)
-- escrita no banco, e nao na tela.
create table atividade (
  id             uuid primary key default gen_random_uuid(),
  negocio_id     uuid not null references negocio(id) on delete cascade,
  tipo_id        uuid references tipo_atividade(id),
  titulo         text,
  data           date not null,
  hora_inicio    time,
  hora_fim       time,
  responsavel_id uuid references usuario(id),
  descricao      text,
  concluida      boolean not null default false,
  criado_em      timestamptz not null default now()
);

create table anotacao (
  id         uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocio(id) on delete cascade,
  autor_id   uuid references usuario(id),
  texto      text not null,
  criado_em  timestamptz not null default now()
);

-- ---------- atualizado_em ----------
-- A coluna existe no Doc 09 mas nada a mantinha. Sem este gatilho ela
-- congela no valor de criacao.
create or replace function public.toca_atualizado_em()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end $$;

create trigger trg_negocio_atualizado_em
  before update on negocio
  for each row execute function public.toca_atualizado_em();

-- ---------- 3.10 Indices (R-006) ----------
-- Nunca carregar a base inteira no navegador: paginacao no servidor,
-- lista virtualizada, Kanban carregando por partes.

create index on negocio (etapa_id, status);
create index on negocio (responsavel_id);
create index on negocio (organizacao_id);
create index on negocio (criado_em desc);
create index on atividade (data, concluida);
create index on atividade (negocio_id);
create index on anotacao (negocio_id);
create index on negocio_pessoa (pessoa_id);
create index on pessoa_organizacao (organizacao_id);
create index on forma_contato (pessoa_id);

-- Busca por nome de organizacao. O operador vem do pg_trgm, que no
-- Supabase mora no schema `extensions`.
create index on organizacao using gin (nome extensions.gin_trgm_ops);
