# 09 — Arquitetura Técnica (v0.8)

| Campo | Valor |
|---|---|
| **Documento** | Arquitetura Técnica |
| **Projeto** | CRM próprio (substituição do Pipedrive) |
| **Versão** | v0.8 |
| **Data** | 14/08/2026 |
| **Status** | rascunho — **schema aplicado em produção em 14/08**; convenções validadas (D-099, D-100); seção 3.11 com as correções C-01 a C-12 |

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
| T-07 | **Migrações** | Supabase CLI, arquivos versionados em `supabase/migrations/` | Painel do Supabase | Estrutura reprodutível entre o banco local e a produção. Com base única (D-101) o repositório é a **única** descrição confiável do schema |

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

⚠️ `negocio_id` **deixou de ser obrigatório** em 17/08 (D-108, migração `20260817160000`). Atividade e anotação ganharam `organizacao_id` e `pessoa_id`, e um gatilho replica o encadeamento do Pipedrive: vínculo com negócio herda a organização dele; vínculo com pessoa herda a dela. O caminho inverso não existe — organização pode ter vários negócios, e escolher um seria inventar.

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
returns trigger language plpgsql security definer
set search_path = '' as $$
declare
  autor uuid := auth.uid();
  -- ⚠️ O nullif não é enfeite — ver a correção C-02 abaixo.
  carga boolean := coalesce(
    nullif(current_setting('app.carga_migracao', true), '')::boolean,
    false
  );
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
returns trigger language plpgsql security definer
set search_path = '' as $$
begin
  if split_part(new.email, '@', 2) = public.dominio_empresa() then
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

O domínio vem de duas funções auxiliares, e não de `current_setting` — ver a correção C-01 abaixo:

```sql
create or replace function public.dominio_empresa()
returns text language sql immutable
set search_path = '' as $$
  select 'lureconsultoria.com.br'::text
$$;

-- Falha fechada: e-mail ausente ou sem domínio devolve null,
-- e null em política de RLS nega. Nunca o contrário.
create or replace function public.pertence_ao_dominio()
returns boolean language sql stable
set search_path = '' as $$
  select nullif(split_part(coalesce(auth.jwt() ->> 'email', ''), '@', 2), '')
         = public.dominio_empresa()
$$;
```

Uma política por tabela, e não o par `select` + `all`: políticas permissivas se somam, então `for all` já cobre o `select`.

```sql
alter table negocio enable row level security;

create policy acesso_por_dominio on negocio
  for all to authenticated
  using (public.pertence_ao_dominio())
  with check (public.pertence_ao_dominio());

-- ⚠️ Sem esta linha a política nunca chega a ser avaliada — ver C-03.
grant select, insert, update, delete on negocio to authenticated;
revoke all on negocio from anon;
```

Repetir para todas as tabelas de domínio. Três exceções, que escrevem regras já decididas como privilégio em vez de combinado:

| Tabela | Privilégio | Por quê |
|---|---|---|
| `usuario` | sem `delete` | D-051 — usuário nunca é excluído, apenas marcado inativo |
| `papel` · `permissao` · `papel_permissao` | só `select` | D-096 — sem tela no MVP, edição pelo painel |
| `evento_negocio` | só `select` | O log é somente inserção, e quem insere é o gatilho |

**Consequência aceita e registrada:** qualquer conta do domínio vê a base inteira, inclusive valores e motivos de perda (risco no Doc 00, item de fase 2).

### 3.11 Correções aplicadas ao aplicar as migrações

Quatro coisas descritas neste documento **não funcionam como estavam escritas**. Não são opiniões — foram descobertas contra o PostgreSQL e o PostgREST reais, em 14/08/2026.

| # | O que estava escrito | O que acontece | Correção |
|---|---|---|---|
| **C-01** | O domínio viria de `current_setting('app.dominio_empresa')`, sem dizer onde o valor seria definido | O caminho natural — `alter database ... set` — é **negado pelo Supabase**: o papel que aplica migrações não é dono do banco (`SQLSTATE 42501`) | O domínio virou o corpo da função `public.dominio_empresa()`. Fica melhor do que a configuração de servidor pretendida: uma configuração pode divergir entre bancos sem deixar rastro, uma migração versionada não |
| **C-02** | `coalesce(current_setting('app.carga_migracao', true)::boolean, false)` | Depois que um `set local` sai de escopo, o PostgreSQL **não** devolve a variável ao estado de inexistente — ela fica como marcador de valor **vazio**. `current_setting` passa a devolver `''`, o `coalesce` não pega, e `''::boolean` levanta `invalid input syntax for type boolean`. Na prática: **toda escrita em `negocio` quebraria depois da carga de migração, na mesma conexão** — e com pool de conexões isso vaza para produção | `nullif(..., '')` antes da conversão. Coberto por teste de regressão |
| **C-03** | Apenas as políticas de RLS | Política de RLS **sozinha não dá acesso a nada**. O PostgreSQL exige dois sinais verdes: o privilégio de tabela e a política. Sem o `grant`, a conta do domínio esbarra em `permission denied for table negocio` antes de a política ser sequer avaliada | `grant` explícito por tabela, junto da política |
| **C-04** | A busca da Lista por título **ou** organização (Doc 10, F3) sairia como um `or` do PostgREST cobrindo as duas colunas | O PostgREST aceita filtrar por coluna de tabela vinculada isoladamente (`organizacao.nome=ilike.*x*`) e aceita `or` entre colunas próprias, mas **não aceita coluna vinculada dentro de um `or`**: devolve `PGRST100 — failed to parse logic tree`, apontando a posição exata onde o nome da relação começa. Não é problema de codificação: `%` e `*` falham igual | Busca em dois passos. Os ids das organizações que casam saem numa consulta à parte e entram no `or` como `organizacao_id.in.(...)`, que é coluna própria de `negocio`. São **2.889** organizações na base real (a estimativa de 422 estava errada), com teto de 200 ids para não estourar a URL. Se a base crescer muito, a saída é uma visão achatada com `security_invoker = true` |

#### C-06 — manipulador de evento em Server Component (18/08/2026)

| Onde | Sintoma | Causa | Correção |
|---|---|---|---|
| **C-06** | A aba **Pessoas** de `/contatos` quebrava ao ser aberta; a aba Organizações funcionava | As linhas da tabela são montadas no Server Component e passadas como `ReactNode[]` para `TabelaVirtual`, que é Client Component. Os links de telefone e e-mail levavam `onClick={(e) => e.stopPropagation()}` — e **função não atravessa a fronteira servidor→cliente**: a serialização do RSC falha e a rota inteira cai. A aba Organizações escapava por ter passado a usar `LinhaGrupo`, que é client | Os `stopPropagation` eram inúteis (a linha não é clicável, só o nome é link) e saíram. ⚠️ **Lição:** montar JSX no servidor e entregá-lo a um componente cliente é um padrão útil, mas tudo que for função morre na fronteira. Depois de qualquer edição em página que faça isso, vale varrer os Server Components à procura de `onClick=`, `onChange=`, `onSubmit=` e `onBlur=` |

#### C-07 — acentos destruídos na origem, não na carga (18/08/2026)

| Onde | Sintoma | Causa | Correção |
|---|---|---|---|
| **C-07** | 388 registros (386 pessoas, 2 organizações) exibiam `U+FFFD` no lugar de letra acentuada: "Marco Aurélio" aparecia como "Marco Aur�lio" | **Não foi a carga.** Os arquivos brutos da extração já traziam o defeito, e só nos campos `name`/`first_name` de `persons.json`; o mesmo nome aparece íntegro em `deals.json` e `organizations.json`, obtidos na mesma sessão de requisições. A corrupção está no dado do próprio Pipedrive, o que também significa que **reextrair não resolveria** | `scripts/recupera-acentos.mjs` cruza cada nome quebrado com as strings íntegras da própria extração: cada `U+FFFD` vira curinga de um caractere e só vale o que casa com **um único** candidato. Duas passadas — o nome inteiro e, depois, palavra a palavra. Havendo mais de um candidato, vale o acentuado: o `U+FFFD` só existe onde havia byte **não-ASCII**, então a versão sem acento nunca poderia ter se corrompido. **343 de 388 recuperados (88%)**, organizações 100% limpas; os 45 restantes ficam como estão, porque nome de cliente não se adivinha |

#### C-08 — o negócio não podia ser criado (19/08/2026)

| Onde | Sintoma | Causa | Correção |
|---|---|---|---|
| **C-08** | **Não existia nenhum caminho para criar um negócio** — nem botão, nem diálogo, nem *server action*. Também faltavam excluir negócio, editar o título, trocar a organização e vincular pessoas ao negócio (`negocio_pessoa` era só lida) | **Omissão de escopo, não defeito de código.** O backlog cobre a Lista (B-040 a B-047), o detalhe (B-050 a B-060) e o Kanban (B-070 a B-076) e **nenhum item diz "criar negócio"** — a D-017 e o RF-024 já pressupunham a criação, mas ela nunca virou item. Passou despercebido porque as F3, F4 e F5 foram construídas sobre 2.458 negócios já migrados: nunca houve o momento em que alguém precisou de um novo. O efeito é direto sobre o critério 2 da D-098 — no vocabulário deste projeto todo contato novo vira um negócio em Cold Lead, e não havia onde registrá-lo | Pacote completo de paridade (D-126): `criarNegocio` com a trava de desfecho valendo também na criação, `excluirNegocio` com confirmação que nomeia a cascata, título editável no cabeçalho, organização trocável na zona lateral e `vincularPessoa`/`desvincularPessoa`. Botão "Novo negócio" na Lista e no Kanban |

> **Como foi encontrado.** Não por alguém usando o sistema, e sim por `scripts/verifica-virada.mjs`, escrito para medir os sete critérios da D-098 contra a base real. Ao inventariar quais entidades o sistema sabe escrever, o negócio apareceu como a única com escrita parcial. ⚠️ **Lição:** construir telas sobre uma base migrada esconde os caminhos de criação, porque o dado já está lá. Vale perguntar de cada entidade não "a tela mostra?" mas "existe `insert`?".

#### C-09 — função atravessando a fronteira servidor→cliente (19/08/2026)

| Onde | Sintoma | Causa | Correção |
|---|---|---|---|
| **C-09** | `/estatisticas` fora do ar em produção com *"A server error occurred"*; no console, `Minified React error #441`. Funcionava em desenvolvimento | A página é Server Component e passava `formata={(v) => realCurto(Number(v))}` para um gráfico, que é Client Component. **Função não atravessa a fronteira servidor→cliente**: a serialização do RSC falha e derruba a rota inteira. O erro #441 é só um invólucro genérico — *"An error occurred in the Server Components render"* — e não diz a causa | A propriedade passa a ser um **nome** de formato (`"numero" \| "moeda"`); quem escolhe a função é o componente de cliente |

⚠️ **É a mesma família da C-06**, que derrubou a aba Pessoas na sessão 09. Lá era `onClick`, aqui um formatador. O aviso já estava escrito no `CLAUDE.md` — e ainda assim aconteceu, o que diz que o aviso sozinho não basta: **o que protege é rodar a página**.

> **Como foi encontrada, sem conseguir logar.** O Google OAuth impede o agente de abrir a tela. O caminho que funcionou: desligar a barreira de autenticação **localmente** em `proxy.ts`, rodar `npm run build && npm run start`, pedir a rota por `curl` e ler a pilha real no log do servidor — depois restaurar o `proxy.ts`. `tsc`, `eslint` e `next build` **passam felizes** por este defeito, porque ele é de tempo de execução na serialização.
>
> ⚠️ **Limite do método:** sem sessão, a RLS devolve vazio. O teste exercita o caminho de **dado vazio** — suficiente para pegar erro de serialização, que independe do dado, mas **não** valida o caminho com dado real.

#### C-10 — reexportação de referência de cliente (19/08/2026)

| Onde | Sintoma | Causa | Correção |
|---|---|---|---|
| **C-10** | Mesma tela, mesmo sintoma. Encontrada antes da C-09 e corrigida primeiro, mas **não era a causa daquela queda** | Um módulo de servidor fazia `import { Painel } from "./grafico-base"` (módulo `"use client"`) e reexportava por atribuição: `export const Painel = PainelCliente`. Num módulo de servidor, importar de um `"use client"` devolve uma **referência de cliente**, não o componente; reatribuí-la a um `const` e reexportar quebra o vínculo com o módulo | As páginas importam o componente direto do módulo `"use client"`. Sem indireção |

#### C-11 — o campo de cargo era invisível (21/08/2026)

| Onde | Sintoma | Causa | Correção |
|---|---|---|---|
| **C-11** | Um usuário real não conseguiu encontrar onde se preenche o **cargo** de uma pessoa. O campo existia, funcionava e gravava | Duas coisas somadas. (a) **O cargo pertence ao vínculo pessoa↔organização (D-036)**, não à pessoa — então ele não está no diálogo de criar/editar pessoa, que é o primeiro lugar onde alguém procura. (b) Nas duas fichas ele era um `<input>` com `border-transparent bg-transparent`, texto `text-text-muted text-sm` e rótulo só em `aria-label`: **só ganhava contorno no hover**. Lia-se como texto exibido, não como campo editável. O `placeholder` "Cargo" reforçava o engano — parecia rótulo | **Borda e fundo permanentes**: `border-strong` de repouso e `surface-sunken`, que afunda contra o `surface` do painel nos dois temas. O realce de ponteiro continua existindo, mas virou **reforço** — passou a ser mudança de fundo (`surface-hover`), nunca mais a única pista de que ali se digita |

#### C-12 — os rótulos das etapas não paravam em lugar nenhum (27/08/2026)

| Onde | Sintoma | Causa | Correção |
|---|---|---|---|
| **C-12** | No Kanban, cartão aparecia **acima** da faixa de nomes das etapas, e ao rolar para baixo os rótulos **iam embora** em vez de ficar. O quadro parecia bugado | **Duas causas somadas, e nenhuma delas era o `sticky` em si.** (a) Os rótulos eram `sticky top-0` **dentro** do container que rola os cartões, e esse container tem `padding` no topo — sobra uma faixa acima do ponto onde o rótulo trava, e cartão passa por ela. (b) O `main` **também** rola, ~41px, por causa do rodapé que a D-146 pôs lá dentro (**P-049**): esse segundo scroll leva o quadro inteiro para cima, rótulos `sticky` incluídos. Rótulo preso ao quadro não sobrevive ao quadro subir | A faixa de rótulos **saiu da rolagem dos cartões** e virou irmã dela. Os dois defeitos somem por construção: nada passa por cima do que está em outro container, e o `sticky top-0` passa a valer contra o `main`, que é quem de fato rola. O preço é `rotulos-alinhados.ts`, que faz as duas faixas concordarem em largura |

⚠️ **O preço tem duas parcelas, e as duas são medidas em vez de chutadas.** A barra de rolagem vertical do quadro ocupa largura real (12px, fixados por `rolagem-visivel`); sem compensar, a faixa de rótulos ficaria 12px mais larga e as seis colunas sairiam progressivamente do lugar — 2px na primeira, 12px na última. `offsetWidth - clientWidth` dá o número certo naquele navegador. E abaixo do piso de 160px por coluna (D-148) o quadro volta a rolar de lado, então a faixa precisa ser empurrada junto: **rótulo que nomeia a coluna errada é pior do que rótulo nenhum.**

⚠️ **A lição é sobre `sticky`, e vale para as outras telas.** `position: sticky` gruda no **scrollport mais próximo**. Havendo dois scrolls aninhados — e neste sistema há, desde a D-146 —, grudar no de dentro não protege de nada quando é o de fora que se move. Antes de usar `sticky`, a pergunta é *qual* container rola, não *se* algum rola.

⚠️ **A causa (b) foi eliminada na mesma sessão, e não só contornada.** A **D-150** revogou a D-146 e devolveu o rodapé à coluna externa: o `main` parou de transbordar, e as telas de altura cheia voltaram a ter exatamente uma rolagem. A faixa de rótulos fora da rolagem continua valendo — ela resolve a causa (a), que é independente, e deixa o quadro imune caso um segundo scroll volte a existir um dia.

⚠️ **O compilador do React recusou a primeira versão do hook**, e estava certo: ela recebia os dois `ref` como argumento e escrevia em `faixa.style.marginRight`. Quem cria o ref é quem pode mexer nele — o hook passou a ser dono dos dois e a devolvê-los.

⚠️ **É o quarto caso do mesmo padrão em duas sessões.** Os outros três estão no Doc 00 §4.9: criar atividade dentro do negócio, filtro de motivo de perda na Lista, filtrar por usuário nas Estatísticas. Em nenhum dos quatro o problema era ausência — era **descoberta**. A regra que sai daí: **quando alguém disser que algo "não existe" neste sistema, a primeira hipótese é que existe e está invisível**, e a correção é de apresentação, não de função.

⚠️ **A primeira correção errou a mão para o outro lado.** Ela acrescentou um rótulo escrito acima do campo (*"Cargo em Quick Aviação"*), o que resolvia a descoberta mas gastava uma linha inteira numa coluna de 20rem, para dizer o que o nome da organização logo acima já dizia. O maestro corrigiu: **o problema nunca foi a falta de rótulo, era o campo não parecer campo.** A versão que ficou mantém o `placeholder` "Cargo" e o `aria-label`, e gasta a tinta na borda.

⚠️ **Affordance não é enfeite.** Um campo que só se revela no hover não existe para quem não passa o mouse por cima dele — e não existe de jeito nenhum no celular, onde não há hover. Campo editável carrega borda.

⚠️ **Duas quebras no mesmo dia, ambas na fronteira servidor→cliente.** O padrão de montar JSX no servidor e entregá-lo ao cliente é útil e usado aqui, mas **tudo que for função — ou referência a componente — morre na travessia**.

⚠️ **C-02 é o mais grave dos quatro** e o mais silencioso: só aparece depois da carga, que é exatamente o momento em que menos se quer descobrir um defeito. Com D-101 a carga roda em produção, então este era o defeito com maior chance de estragar a virada.

> **Como C-04 foi encontrada, sem poder consultar dado nenhum.** Erro de sintaxe do PostgREST (`PGRST100`) e erro de relacionamento (`PGRST200`) acontecem **antes** da checagem de permissão; `42501` só aparece quando a consulta já foi entendida. Isso permite validar a forma de uma consulta contra a base real usando apenas a chave anônima, sem ter acesso a linha nenhuma: se volta `42501`, a sintaxe está correta. Vale para toda a construção enquanto o login não existir.

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

### 3.12 Acréscimos da sessão 09 (18/08/2026)

Quatro migrações entraram, todas ensaiadas em transação com `rollback` antes de valer:

| Migração | O que acrescenta |
|---|---|
| `20260818120000_preferencia_lista_negocios` | `usuario.preferencia_lista_negocios text` — guarda a última combinação de filtro e ordenação da Lista como a própria *query string* (B-045). Texto, e não `jsonb`: não há estrutura a validar, e decompor e recompor um objeto a cada coluna nova de filtro seria trabalho sem ganho |
| `20260818210000_agrupa_organizacoes_iguais` | `public.chave_nome(text)` — normaliza para minúsculas, sem acento e sem pontuação — e `organizacao.chave_agrupamento`, **coluna gerada e indexada** a partir dela. ⚠️ `unaccent` é `stable`, não `immutable`, e coluna gerada exige função imutável; o invólucro fixa o dicionário explicitamente, o que torna o resultado determinístico |
| `20260818211000_lista_organizacoes_agrupadas` | `organizacoes_agrupadas`, `conta_organizacoes_agrupadas` e `organizacoes_do_grupo`. O PostgREST não expõe `group by`, e paginar por linha traria a mesma organização repetida em páginas diferentes — a agregação roda no banco e a página continua carregando 50 registros (R-006) |
| `20260818230000_negocios_como_referencia_no_contato` | As duas funções de listagem passam a devolver `titulos text[]` com os negócios mais recentes (D-122). ⚠️ Precisaram **cair e renascer**: o Postgres recusa `create or replace` que mude o tipo de retorno |

⚠️ **A repetição de organizações é estrutural na base, não um acidente:** 1.195 dos 2.889 cadastros são duplicata de nome, em 668 grupos. O agrupamento é de **apresentação** — mesclar continua fora do MVP.

---

**Nunca carregar a base inteira no navegador** (R-006): paginação no servidor, lista virtualizada na tela, e o Kanban carregando por partes conforme rola — especialmente a coluna Cold Lead, que será a mais cheia (D-086).
| **C-05** | O gatilho do log gravava `autor uuid := auth.uid()` em `evento_negocio.autor_id`, que referencia `usuario(id)` | Correto **até a D-109**, que separou as duas coisas: `usuario.id` virou id próprio e o id da conta de login foi para `usuario.auth_id`. A partir daí `auth.uid()` deixou de existir em `usuario(id)` para todo mundo vindo da carga — a chave estrangeira recusa e **a escrita inteira falha**. Não era hipótese: Julio Manfrini, único usuário migrado que já tinha entrado, não conseguia mover cartão no Kanban; os outros quatro cairiam no mesmo ao entrar. Só a conta anterior à D-109 escapava, por ter `auth_id` igual ao próprio id | O gatilho passa a resolver o autor por `public.usuario_atual()`. Verificado simulando a sessão do Julio numa transação com `rollback`. ⚠️ **Lição:** mudar o significado de uma chave primária alcança todo lugar que a referencia, inclusive gatilhos escritos meses antes — procurar `auth.uid()` no schema inteiro passa a ser obrigatório depois de qualquer mexida em identidade |

---

## 4. Ambientes e migrações (D-101)

⚠️ **D-101 revogou a primeira metade de D-082.** Não há ambiente de desenvolvimento na nuvem. Um único projeto no Supabase, um único deploy na Vercel, e a **carga de migração roda direto em produção**. A razão é custo — o projeto adicional sairia por ~US$ 10/mês, e cortar custo é a razão de existir deste projeto.

| Camada | Onde | Custo | Para quê |
|---|---|---|---|
| **Produção** | projeto único no Supabase, na organização Pro existente · deploy de produção na Vercel | já coberto pelo Pro | **Ambiente único**: a construção, a base real e a virada de 3/9 |

⚠️ **Existe um ambiente só** (D-101 + D-106). O projeto do Supabase criado em 14/08 é o definitivo — é ele que guarda os dados. Não há banco de ensaio, e a **D-102 foi revogada**: a carga dos 2.453 negócios roda **uma única vez**, direto nessa base. As mitigações que restam são a ordem de carga do Doc 14, a marcação `origem_carga` e o backup verificado antes de começar (D-089).

**Dados concretos do projeto** (aplicado em 14/08/2026):

| Item | Valor |
|---|---|
| Referência | `qyitrhflinkfcylobsfp` |
| Região | `us-east-1` — Norte da Virgínia (D-103) |
| URL | `https://qyitrhflinkfcylobsfp.supabase.co` |
| Migrações aplicadas | as três, com histórico registrado no remoto |
| Semente | funil Comercial e as seis etapas |

⚠️ **O host de conexão direta (`db.<ref>.supabase.co`) resolve apenas em IPv6.** De rede IPv4 ele é inalcançável, e o complemento de IPv4 dedicado é pago. O caminho gratuito é o **Session pooler** (`aws-0-us-east-1.pooler.supabase.com:5432`, usuário `postgres.<ref>`), que aceita DDL e é por onde as migrações foram aplicadas. O *Transaction pooler* (porta 6543) **não** serve para migração: não mantém sessão entre comandos, e `create type`, `do $$ … $$` e `set local` quebram nele.

**Regras:**

1. Nenhuma alteração de estrutura pelo painel. Tudo em `supabase/migrations/`, aplicado por CLI, versionado no git. Esta metade de D-082 **continua valendo** — com uma base só, ela vale mais, não menos: sem ambiente de ensaio na nuvem, o repositório é a única descrição confiável da estrutura.
2. A migração de dados é ensaiada **no banco local** até as contagens baterem (critério 1 de D-098) antes de rodar em produção. `supabase db reset` recria tudo do zero.
3. O limitador de gastos do Supabase permanece **ligado** (D-083).
4. **Uma** URL de retorno OAuth por destino — ver seção 4.1.

⚠️ **Consequência aceita conscientemente pelo maestro:** a carga dos 2.453 negócios acontece na base que os sócios vão usar. Se ela falhar no meio, o conserto é em produção. As mitigações que restam são o ensaio local, a marcação `origem_carga` e a ordem de carga do Doc 14 — nenhuma delas substitui um ambiente separado.

### 4.1 URLs de retorno do OAuth (P-026)

O Doc 00 registrava "duas URLs de retorno no Google Cloud, uma por ambiente". Isso está errado por dois motivos, e continuaria errado mesmo com dois ambientes: **quem recebe o retorno do Google é o Supabase, não a aplicação.** São dois lugares distintos.

**No Google Cloud** — *Authorized redirect URIs* do cliente OAuth:

```
https://<ref-do-projeto>.supabase.co/auth/v1/callback
```

**No Supabase** — *Authentication → URL Configuration*, onde entram as URLs da aplicação, atendidas por `app/auth/callback/route.ts`:

```
http://localhost:3000/**          (desenvolvimento na máquina)
https://<dominio-na-vercel>/**    (produção)
```

Com um projeto só, o Google Cloud recebe **uma** URL. As duas do Supabase continuam existindo porque a construção acontece em `localhost`.

---

## 5. Aplicação

### 5.1 Estrutura proposta

```
/app                 rotas (Next.js App Router)
  globals.css        ponte dos tokens para o Tailwind
  tokens.css         tokens da Lure, tema claro e escuro
  /login             entrada por Google
  /auth/callback     retorno do OAuth, com recusa a conta de fora do domínio
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
  /supabase          clientes servidor e navegador, tipos gerados do schema
  /regras            trava de desfecho, follow-up, notificações
/supabase
  /migrations        estrutura versionada
  seed.sql           funil e etapas
proxy.ts             renovação de sessão e barreira de autenticação
```

⚠️ **No Next.js 16 o antigo `middleware.ts` passou a se chamar `proxy.ts`**, na raiz do projeto, exportando `proxy`. Mesmo comportamento, nome novo.

A barreira de autenticação do `proxy.ts` é **checagem otimista**, não autorização: ela evita renderizar tela para quem não entrou. A autorização de verdade está nas políticas do banco, e é lá que ela precisa continuar estando.

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

⚠️ **Arquivo `.env` não leva BOM.** A regra 7 do Doc 00 pede UTF-8 com BOM, mas ela vale para documentos e CSVs. O CLI do Supabase recusa um `.env` com marca de ordem de byte: *unexpected character in variable name*. Verificado.

`DOMINIO_EMPRESA` precisa bater com o valor devolvido pela função `public.dominio_empresa()` do banco — ver seção 3.9. São dois lugares para o mesmo dado porque a checagem acontece nas duas camadas: a aplicação recusa o login com mensagem clara, o banco recusa a leitura de qualquer linha.

### 5.3 Integração com o Bubble (D-076, D-077)

Rota `/api/bubble/clientes` faz o GET na Data API do Bubble com o token do servidor e devolve a lista ao diálogo de Ganho. **Se falhar, o diálogo mostra o erro e permite concluir o Ganho assim mesmo** — o vínculo é opcional e nunca trava o negócio (D-077).

---

## 6. Pendências deste documento

| # | Item | Situação |
|---|---|---|
| P-022 | Habilitar a Data API do Bubble e obter token | depende do maestro |
| P-025 | Confirmar Tailwind v3 × v4; remover o bloco `spacing` | ✅ **encerrada** em 14/08 — **v4**. A v3 congelou em 3.4.19; o Next 16 e o shadcn 4.x instalam v4. Tema em CSS, sem `tailwind.config.ts`. Bloco `spacing` removido por construção |
| P-026 | Apontar a URL de retorno OAuth no Google Cloud | depende do maestro — **uma**, não duas (D-101). Ver seção 4.1: o Google aponta para o Supabase, não para a aplicação |
| P-029 | Confirmar o domínio gravado em `public.dominio_empresa()` | 🟡 o consultor gravou `lureconsultoria.com.br`, deduzido do e-mail do maestro. É o que decide quem entra no sistema |
| — | Modelagem da entidade Notificação | A-07, ainda aberto no Doc 06 |
| — | Tabelas `indicador` e `painel_usuario` | fora do MVP (D-093); modelar na fase 2 |

---

## Changelog

- **v0.8** — 27/08/2026 — **Sessão 13.** Correção **C-12**: os rótulos das etapas do Kanban não paravam em lugar nenhum — cartão passava acima deles e rolar para baixo os levava junto. Duas causas somadas, e nenhuma era o `sticky` em si: a faixa de `padding` acima do ponto de trava, e o **segundo scroll** que o rodapé da D-146 criou no `main` (P-049). A faixa de rótulos saiu da rolagem dos cartões. Fica a regra: **`sticky` gruda no scrollport mais próximo**, e havendo dois scrolls aninhados, grudar no de dentro não protege quando é o de fora que se move — a pergunta antes de usar `sticky` é *qual* container rola, não *se* algum rola.
- **v0.7** — 21/08/2026 — **Sessão 12.** Correção **C-11** acrescentada à seção 3.11: o campo de cargo existia e gravava, mas era um input transparente sem rótulo escrito — um usuário real não o encontrou. É o quarto caso do mesmo padrão em duas sessões, e o registro fixa a regra que sai dele: quando alguém disser que algo "não existe" aqui, a primeira hipótese é que existe e está invisível. Registrado também que **campo editável carrega borda** — affordance só no hover não existe no celular.
- **v0.6** — 19/08/2026 — **Sessão 10.** Sete migrações novas: procedência do log (`importado_do_pipedrive`), data de fechamento do negócio (`fechado_em`, com gatilho de carimbo), e as funções de indicador — comerciais, financeiras, de volume — mais a ampliação do recorte. Correções **C-08** (o negócio era a única entidade sem caminho de criação), **C-09** (função atravessando a fronteira servidor→cliente, que derrubou `/estatisticas` em produção) e **C-10** (reexportação de referência de cliente). ⚠️ Registrado o **método que encontrou a C-09**, já que o OAuth impede o agente de logar: desligar a barreira localmente, rodar o build de produção, pedir a rota e ler a pilha — `tsc`, `eslint` e `next build` não pegam erro de serialização.
- **v0.5** — 18/08/2026 — **Sessão 09.** Seção **3.12** criada com as quatro migrações da sessão: a preferência de filtro por usuário, a chave de agrupamento de organizações (coluna gerada e indexada, com o cuidado do `unaccent` imutável), as funções que paginam por grupo — o PostgREST não expõe `group by` — e os títulos de negócio como referência. Correções **C-06** (manipulador de evento cruzando a fronteira servidor→cliente, que derrubava a aba Pessoas) e **C-07** (388 registros com acento destruído **na origem**, no dado do próprio Pipedrive, com 343 recuperados por cruzamento com a própria extração) acrescentadas à seção 3.11.
- **v0.4** — 14/08/2026 — **O schema saiu do papel: as três migrações e a semente foram aplicadas na base de produção.** Seção 4 ganha os dados concretos do projeto (referência, região, URL) e passa a descrever **um ambiente só**: D-106 revoga a D-102, não haverá banco de ensaio e a carga roda uma única vez na base definitiva. Registrado também que o host de conexão direta resolve só em IPv6, tornando o *Session pooler* o único caminho gratuito para aplicar migração. **C-04 acrescentada à seção 3.11** — o PostgREST não aceita coluna de tabela vinculada dentro de um `or`, o que quebrava a busca da Lista — junto do método que permite validar a forma de uma consulta contra a base real usando só a chave anônima.
- **v0.3** — 14/08/2026 — **Seção 4 reescrita por D-101**: base única, sem ambiente de desenvolvimento na nuvem, carga direto em produção; ensaio no banco local. Seção 4.1 criada para corrigir o entendimento de P-026 — o retorno do OAuth vai para o Supabase, não para a aplicação. **Seção 3.11 criada com as três correções (C-01 a C-03) descobertas ao aplicar as migrações contra um PostgreSQL real**; seções 3.7, 3.8 e 3.9 corrigidas de acordo. Seção 5.1 atualizada com a estrutura real, incluindo `proxy.ts` (o `middleware.ts` do Next 16). P-025 encerrada em favor do Tailwind v4; P-029 criada.
- **v0.2** — 13/08/2026 — Convenções técnicas validadas: português nos nomes (D-099) e exclusão real com restrição nos vínculos (D-100). T-02 a T-05 e T-07 aprovados em bloco.
- **v0.1** — 13/08/2026 — Criação a partir do Doc 06 v0.5 e das decisões do Bloco 10 (D-078 a D-084). Sete propostas técnicas abertas para validação. Gatilho do log com marcação de carga de migração.
