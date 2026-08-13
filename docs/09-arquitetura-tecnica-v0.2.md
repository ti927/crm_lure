# 09 — Arquitetura Técnica (v0.2)

| Campo | Valor |
|---|---|
| **Documento** | Arquitetura Técnica |
| **Projeto** | CRM próprio (substituição do Pipedrive) |
| **Versão** | v0.2 |
| **Data** | 13/08/2026 |
| **Status** | rascunho — propostas técnicas **validadas** (D-099, D-100) |

> Este documento traduz o **Doc 06 (conceitual)** em estrutura física sobre Supabase. Ele é, junto do Doc 12, o que o Claude Code lê antes da primeira linha de código.
>
> ⚠️ **Regra 2 do Doc 00 respeitada:** as decisões já validadas aparecem como **D-0xx**. Tudo o que é escolha nova do consultor está na seção 1, marcado como 🟡 **proposta** — nada foi decidido por inércia.

---

## 1. Convenções técnicas — validadas em 13/08/2026

> T-01 e T-06 validados explicitamente pelo maestro (D-099, D-100). T-02 a T-05 e T-07 aprovados em bloco como padrão de mercado sem controvérsia.

| # | Escolha | Proposta | Alternativa | Por que proponho |
|---|---|---|---|---|
| T-01 | **Idioma dos nomes** de tabela e coluna | **Português**, `snake_case` (`negocio`, `motivo_perda`) | Inglês | Toda a documentação, o vocabulário do maestro e o Doc 06 estão em português. Traduzir a cada leitura é onde nascem erros de mapeamento |
| T-02 | **Chave primária** | `uuid` com `gen_random_uuid()` | `bigint` sequencial | O `uuid` permite gerar o identificador antes de gravar (útil na migração e no cliente) e não expõe volume de base |
| T-03 | **Status do negócio** | Tipo `enum` do Postgres | Coluna texto com `check` | D-042 diz que o status é fixo em quatro valores. `enum` torna isso impossível de violar por qualquer caminho de escrita |
| T-04 | **Valor monetário** | `numeric(14,2)` | `integer` em centavos | Real como moeda única (D-087), sem conversão. `numeric` evita erro de arredondamento e é legível direto no banco |
| T-05 | **Data e hora** | `timestamptz`, gravado em UTC, exibido em Brasília | `timestamp` sem fuso | O Pipedrive grava em UTC (D-087). `timestamptz` converte na borda e elimina a classe inteira de bug de fuso |
| T-06 | **Exclusão de registros** | Exclusão real, com `on delete restrict` nos vínculos | Exclusão lógica (`deleted_at`) | D-088 pede exclusão de Pessoa como função normal. Exclusão lógica dobra a complexidade de toda consulta, sem benefício aqui |
| T-07 | **Migrações** | Supabase CLI, arquivos versionados em `supabase/migrations/` | Painel do Supabase | Decorrência direta de D-082 — dois ambientes exigem estrutura reprodutível |

---

## 2. Visão geral

```
Navegador  ──►  Next.js na Vercel  ──►  Supabase (Postgres)
(React)         · regras de processo      · dados
                · token do Bubble         · gatilho do log
                · endpoints futuros       · políticas de acesso
                        │
                        └──►  Data API do Bubble (seletor de cliente no Ganho)
```

**Onde mora cada coisa (D-081):**

| Camada | Responsabilidade |
|---|---|
| **Banco** | Log de eventos por gatilho · imutabilidade do log · restrição de acesso por domínio · integridade referencial · status fixo |
| **Next.js** | Trava de desfecho (D-047) · motivo de perda obrigatório · follow-up de 90 dias · chamada ao Bubble · geração de notificações |
| **Cliente** | Validação de formulário · diálogos · experiência |

---

## 3. Schema físico

### 3.1 Tipos e listas fixas

```sql
create type status_negocio as enum ('parado','negociacao','ganho','perdido');
create type tipo_evento   as enum ('etapa','valor','responsavel','status');
```

O `status_negocio` é a materialização de D-042: quatro valores, não editáveis, nem pela tela nem por script.

### 3.2 Usuários e permissões

```sql
create table usuario (
  id           uuid primary key references auth.users(id),
  nome         text not null,
  email        text not null unique,
  papel_id     uuid not null references papel(id),
  ativo        boolean not null default true,
  criado_em    timestamptz not null default now()
);

create table papel (
  id     uuid primary key default gen_random_uuid(),
  nome   text not null unique          -- MVP: apenas 'completo'
);

create table permissao (
  id     uuid primary key default gen_random_uuid(),
  chave  text not null unique
);

create table papel_permissao (
  papel_id     uuid references papel(id) on delete cascade,
  permissao_id uuid references permissao(id) on delete cascade,
  primary key (papel_id, permissao_id)
);
```

`usuario.id` referencia `auth.users` do Supabase — é o que amarra a conta Google ao Usuário do domínio. **Usuário nunca é excluído** (D-051): a coluna `ativo` só controla presença nas listas de seleção.

### 3.3 Listas configuráveis

Mesma forma para todas — `origem`, `motivo_perda`, `area_produto`, `tipo_atividade`:

```sql
create table origem (
  id     uuid primary key default gen_random_uuid(),
  nome   text not null unique,
  ordem  integer not null default 0,
  ativo  boolean not null default true
);
```

Sem tela no MVP (D-096); populadas pela migração, editadas pelo painel do Supabase quando necessário.

### 3.4 Contatos

```sql
create table organizacao (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  cidade        text,
  website       text,
  bubble_id     text,                  -- identificador externo (D-075/D-076)
  criado_em     timestamptz not null default now()
);

create table pessoa (
  id        uuid primary key default gen_random_uuid(),
  nome      text not null,
  criado_em timestamptz not null default now()
);

-- O vínculo carrega o cargo (D-036)
create table pessoa_organizacao (
  pessoa_id      uuid references pessoa(id) on delete cascade,
  organizacao_id uuid references organizacao(id) on delete cascade,
  cargo          text,
  primary key (pessoa_id, organizacao_id)
);

create table forma_contato (
  id        uuid primary key default gen_random_uuid(),
  pessoa_id uuid not null references pessoa(id) on delete cascade,
  tipo      text not null check (tipo in ('telefone','email')),
  valor     text not null
);
```

O `on delete cascade` a partir de `pessoa` é o que faz D-088 funcionar: excluir a pessoa leva junto seus vínculos e formas de contato, sem deixar órfãos.

### 3.5 Funil e negócio

```sql
create table funil (
  id    uuid primary key default gen_random_uuid(),
  nome  text not null
);

create table etapa (
  id              uuid primary key default gen_random_uuid(),
  funil_id        uuid not null references funil(id),
  nome            text not null,
  ordem           integer not null,
  status_inicial  status_negocio not null default 'negociacao',   -- D-045
  unique (funil_id, ordem)
);

create table produto (
  id       uuid primary key default gen_random_uuid(),
  nome     text not null,
  area_id  uuid references area_produto(id)
);

create table negocio (
  id              uuid primary key default gen_random_uuid(),
  titulo          text not null,                                   -- D-023
  organizacao_id  uuid not null references organizacao(id),        -- obrigatória
  valor           numeric(14,2),
  etapa_id        uuid references etapa(id),
  status          status_negocio not null default 'parado',
  origem_id       uuid references origem(id),
  produto_id      uuid references produto(id),                     -- N:1 (D-032)
  responsavel_id  uuid references usuario(id),
  motivo_perda_id uuid references motivo_perda(id),
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),

  -- Regra 6 do Doc 06, no banco: perdido exige motivo
  constraint perdido_exige_motivo
    check (status <> 'perdido' or motivo_perda_id is not null)
);

create table negocio_pessoa (
  negocio_id uuid references negocio(id) on delete cascade,
  pessoa_id  uuid references pessoa(id) on delete cascade,
  primary key (negocio_id, pessoa_id)
);
```

> **Nota:** a restrição `perdido_exige_motivo` é a única regra de processo que proponho colocar no banco além do log. Motivo: é a informação que D-047 existe para capturar, e ela também não é recuperável depois. Se o maestro preferir mantê-la só na aplicação, é remover uma linha.

### 3.6 Atividades e anotações

```sql
create table atividade (
  id              uuid primary key default gen_random_uuid(),
  negocio_id      uuid not null references negocio(id) on delete cascade,  -- regra 1
  tipo_id         uuid references tipo_atividade(id),
  titulo          text,
  data            date not null,
  hora_inicio     time,
  hora_fim        time,
  responsavel_id  uuid references usuario(id),
  descricao       text,
  concluida       boolean not null default false,
  criado_em       timestamptz not null default now()
);

create table anotacao (
  id          uuid primary key default gen_random_uuid(),
  negocio_id  uuid not null references negocio(id) on delete cascade,
  autor_id    uuid references usuario(id),
  texto       text not null,
  criado_em   timestamptz not null default now()
);
```

`negocio_id not null` é a regra "não existe atividade órfã" (D-030) escrita no banco, não na tela.

### 3.7 Evento de negócio — o log (D-033, D-081)

```sql
create table evento_negocio (
  id              bigserial primary key,
  negocio_id      uuid not null references negocio(id) on delete cascade,
  tipo            tipo_evento not null,
  valor_anterior  text,
  valor_novo      text,
  autor_id        uuid references usuario(id),
  ocorrido_em     timestamptz not null default now(),
  origem_carga    boolean not null default false   -- true = gerado pela migração
);
```

**Somente inserção**, garantido por permissão e não por convenção:

```sql
revoke update, delete on evento_negocio from authenticated, anon;
```

**O gatilho:**

```sql
create or replace function registra_evento_negocio()
returns trigger language plpgsql security definer as $$
declare
  autor uuid := auth.uid();
  carga boolean := coalesce(current_setting('app.carga_migracao', true)::boolean, false);
begin
  if tg_op = 'UPDATE' then
    if new.etapa_id is distinct from old.etapa_id then
      insert into evento_negocio (negocio_id, tipo, valor_anterior, valor_novo, autor_id, origem_carga)
      values (new.id, 'etapa', old.etapa_id::text, new.etapa_id::text, autor, carga);
    end if;
    if new.valor is distinct from old.valor then
      insert into evento_negocio (negocio_id, tipo, valor_anterior, valor_novo, autor_id, origem_carga)
      values (new.id, 'valor', old.valor::text, new.valor::text, autor, carga);
    end if;
    if new.responsavel_id is distinct from old.responsavel_id then
      insert into evento_negocio (negocio_id, tipo, valor_anterior, valor_novo, autor_id, origem_carga)
      values (new.id, 'responsavel', old.responsavel_id::text, new.responsavel_id::text, autor, carga);
    end if;
    if new.status is distinct from old.status then
      insert into evento_negocio (negocio_id, tipo, valor_anterior, valor_novo, autor_id, origem_carga)
      values (new.id, 'status', old.status::text, new.status::text, autor, carga);
    end if;
  end if;
  return new;
end $$;

create trigger trg_evento_negocio
  after update on negocio
  for each row execute function registra_evento_negocio();
```

⚠️ **A coluna `origem_carga` resolve o problema levantado na 10.2:** a migração dos 2.453 negócios roda com `set local app.carga_migracao = true`, e os eventos gerados nascem marcados. Os indicadores de lead time filtram `origem_carga = false` e não são contaminados por 2.453 eventos falsos com a data da migração.

### 3.8 Criação automática do usuário (D-084)

```sql
create or replace function cria_usuario_do_dominio()
returns trigger language plpgsql security definer as $$
begin
  if split_part(new.email, '@', 2) = current_setting('app.dominio_empresa') then
    insert into usuario (id, nome, email, papel_id)
    values (new.id,
            coalesce(new.raw_user_meta_data->>'full_name', new.email),
            new.email,
            (select id from papel where nome = 'completo'))
    on conflict (id) do nothing;
  end if;
  return new;
end $$;

create trigger trg_cria_usuario
  after insert on auth.users
  for each row execute function cria_usuario_do_dominio();
```

### 3.9 Políticas de acesso (D-050, D-084)

Papel único de acesso total: a política não segmenta o que cada um vê, apenas garante que **só contas do domínio entram**.

```sql
alter table negocio enable row level security;

create policy dominio_le_tudo on negocio
  for select to authenticated
  using (split_part(auth.jwt()->>'email', '@', 2) = current_setting('app.dominio_empresa'));

create policy dominio_escreve_tudo on negocio
  for all to authenticated
  using (split_part(auth.jwt()->>'email', '@', 2) = current_setting('app.dominio_empresa'));
```

Repetir para todas as tabelas de domínio. **Consequência aceita e registrada:** qualquer conta do domínio vê a base inteira, inclusive valores e motivos de perda (risco no Doc 00, item de fase 2).

### 3.10 Índices — atendimento a R-006

```sql
create index on negocio (etapa_id, status);
create index on negocio (responsavel_id);
create index on negocio (organizacao_id);
create index on negocio (criado_em desc);
create index on atividade (data, concluida);
create index on atividade (negocio_id);
create index on evento_negocio (negocio_id, ocorrido_em);
create index on organizacao using gin (nome gin_trgm_ops);   -- busca por nome
```

**Nunca carregar a base inteira no navegador** (R-006): paginação no servidor, lista virtualizada na tela, e o Kanban carregando por partes conforme rola — especialmente a coluna Cold Lead, que será a mais cheia (D-086).

---

## 4. Ambientes e migrações (D-082)

| Ambiente | Supabase | Vercel | Dados |
|---|---|---|---|
| Desenvolvimento | projeto próprio | deploy próprio | cópia da base real extraída do Pipedrive |
| Produção | projeto na organização Pro existente | deploy de produção | base real |

**Regras:**

1. Nenhuma alteração de estrutura pelo painel. Tudo em `supabase/migrations/`, aplicado por CLI, versionado no git.
2. A migração de dados é ensaiada em desenvolvimento até as contagens baterem (critério 1 de D-098) antes de rodar em produção.
3. O limitador de gastos do Supabase permanece **ligado** (D-083).
4. Duas URLs de retorno OAuth no Google Cloud, uma por ambiente (P-026).

---

## 5. Aplicação

### 5.1 Estrutura proposta

```
/app                 rotas (Next.js App Router)
  /negocios          lista, kanban, [id]
  /atividades
  /contatos
  /produtos
  /api
    /bubble/clientes    proxy do GET ao Bubble — token nunca vai ao navegador
/components
  /ui                shadcn/ui
  /dominio           CartaoNegocio, LinhaLista, DialogoDesfecho…
/lib
  /supabase          clientes servidor e navegador
  /regras            trava de desfecho, follow-up, notificações
/supabase
  /migrations        estrutura versionada
  /seed              listas configuráveis
```

### 5.2 Variáveis de ambiente

| Variável | Onde |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | navegador |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | navegador |
| `SUPABASE_SERVICE_ROLE_KEY` | **somente servidor** |
| `BUBBLE_API_TOKEN` | **somente servidor** (D-076) |
| `BUBBLE_API_URL` | somente servidor |
| `DOMINIO_EMPRESA` | ambos |

⚠️ Nenhum token do Bubble ou chave de serviço em variável `NEXT_PUBLIC_`. Foi a razão decisiva pelo Next.js sobre Vite (D-080).

### 5.3 Integração com o Bubble (D-076, D-077)

Rota `/api/bubble/clientes` faz o GET na Data API do Bubble com o token do servidor e devolve a lista ao diálogo de Ganho. **Se falhar, o diálogo mostra o erro e permite concluir o Ganho assim mesmo** — o vínculo é opcional e nunca trava o negócio (D-077).

---

## 6. Pendências deste documento

| # | Item | Situação |
|---|---|---|
| P-022 | Habilitar a Data API do Bubble e obter token | depende do maestro |
| P-025 | Confirmar Tailwind v3 × v4; remover o bloco `spacing` | ver Doc 08, seção 7 |
| P-026 | Apontar as duas URLs de retorno OAuth | depende do maestro |
| — | Modelagem da entidade Notificação | A-07, ainda aberto no Doc 06 |
| — | Tabelas `indicador` e `painel_usuario` | fora do MVP (D-093); modelar na fase 2 |

---

## Changelog

- **v0.2** — 13/08/2026 — Convenções técnicas validadas: português nos nomes (D-099) e exclusão real com restrição nos vínculos (D-100). T-02 a T-05 e T-07 aprovados em bloco.
- **v0.1** — 13/08/2026 — Criação a partir do Doc 06 v0.5 e das decisões do Bloco 10 (D-078 a D-084). Sete propostas técnicas abertas para validação. Gatilho do log com marcação de carga de migração.
