# CRM Lure

CRM próprio da Lure Consultoria, em substituição ao Pipedrive.

> ✅ **Sem prazo de virada** (D-125). Os dados do Pipedrive foram extraídos e carregados em 17/08, conferidos ao centavo — a base vive no Supabase. O desligamento acontece quando o sistema estiver pronto.

## Antes de escrever qualquer código

Leia [CLAUDE.md](CLAUDE.md) por inteiro. Ele carrega as regras que não podem ser violadas — log de eventos por gatilho, trava de desfecho, nomes em português, nenhum segredo em `NEXT_PUBLIC_`.

## Biblioteca de documentos

Toda a documentação viva está em [docs/](docs/). Comece por [00 — Status e Retomada](docs/00-status-e-retomada-v3.2.md), que diz onde o projeto está e qual é a próxima ação.

| # | Documento | Para quê |
|---|---|---|
| 00 | [Status e Retomada](docs/00-status-e-retomada-v3.2.md) | Onde o projeto está e o que vem a seguir |
| 01 | [Plano de Execução](docs/01-plano-de-execucao-v0.3.md) | Método da consultoria — encerrada na Fase 6 |
| 02 | [Roteiro de Entrevistas](docs/02-roteiro-de-entrevistas-v1.1.md) | As 80 perguntas e suas respostas |
| 03 | [Log de Decisões](docs/03-log-de-decisoes-v0.24.md) | **154 decisões com justificativa.** Consulte antes de perguntar |
| 04 | [Visão de Produto](docs/04-visao-de-produto-v0.1.md) | Por que o sistema existe |
| 05 | [Requisitos Funcionais](docs/05-requisitos-funcionais-v0.1.md) | 153 requisitos |
| 06 | [Modelo de Domínio](docs/06-modelo-de-dominio-v0.5.md) | Entidades e regras, conceitual |
| 08 | [UI e Design System](docs/08-ui-e-design-system-v0.1.md) | Cores, tipografia, densidade |
| 09 | [Arquitetura Técnica](docs/09-arquitetura-tecnica-v0.10.md) | Schema físico, gatilhos, políticas |
| 10 | [Plano de Fases de Construção](docs/10-plano-de-fases-de-construcao-v0.2.md) | Ordem das fases F0 a F10 |
| 11 | [Backlog e Critérios de Aceite](docs/11-backlog-e-criterios-de-aceite-v0.3.md) | 133 itens com critério de pronto |
| 12 | [CLAUDE.md](docs/12-claude-md-v0.17.md) | Fonte do `CLAUDE.md` da raiz |
| 13 | [Glossário](docs/13-glossario-v0.1.md) | Vocabulário do projeto |
| 15 | [Plano da Central de Notificações](docs/15-plano-central-de-notificacoes-v0.3.md) | A F8, **construída** — sino, painel e follow-up ao ganhar |
| 14 | [Migração do Pipedrive](docs/14-migracao-do-pipedrive-v0.2.md) | Mapeamento campo a campo |
| 14* | [Referência da API Pipedrive](docs/14-referencia-api-pipedrive-v0.1.md) | Endpoints para a extração |

O documento 07 (UX — Fluxos e Arquitetura de Informação) é o único não criado; o material está distribuído nos documentos 05, 08 e 11.

## Stack

Supabase (PostgreSQL) · Vercel · Next.js 16 (App Router) + TypeScript · Tailwind CSS v4 + shadcn/ui · TanStack Query · dnd-kit · Recharts (fase 2) · lucide-react · fonte Archivo.

## Como rodar

Precisa de **Node 22+**.

```bash
npm install
cp .env.example .env.local     # preencha URL e NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

⚠️ **Há um ambiente só** (D-101, D-106). O projeto do Supabase é o definitivo — o que guarda os dados. Não existe banco de desenvolvimento: `npm run dev` aponta para a base real, e não há ensaio antes da carga de migração.

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção, com checagem de tipos |
| `npm run lint` | ESLint |

Para aplicar uma migração nova na base:

```bash
npx supabase db push --dry-run --db-url "$URL"   # confira primeiro
npx supabase db push --db-url "$URL"
```

⚠️ A `$URL` é a do **Session pooler**, não a da conexão direta: `db.<ref>.supabase.co` resolve apenas em IPv6 e é inalcançável de rede IPv4. O *Transaction pooler* (porta 6543) também não serve — não mantém sessão entre comandos, e `create type`, `do $$ … $$` e `set local` quebram nele. Se a migração incluir semente, acrescente `--include-seed`; sem essa flag o `seed.sql` não é aplicado.

⚠️ **Toda mudança de estrutura do banco vira arquivo em `supabase/migrations/`.** Nunca pelo painel do Supabase. Há **uma única base na nuvem** (D-101): o repositório é a única descrição confiável do schema, e o banco local precisa poder ser recriado idêntico a ela.

## Estrutura

```
app/            rotas (App Router) e tokens de tema
components/
  ui/           shadcn/ui
  dominio/      componentes do domínio
lib/supabase/   clientes de servidor e navegador, tipos gerados
supabase/
  migrations/   estrutura versionada
  seed.sql      funil e etapas
proxy.ts        renovação de sessão e barreira de autenticação
docs/           biblioteca de documentos
```

## Convenções

- Arquivos em **UTF-8 com BOM**; CSV sempre com separador **ponto-e-vírgula**.
- Nomes de tabela e coluna em **português, `snake_case`**.
- Nenhuma alteração de estrutura do banco pelo painel do Supabase — tudo em `supabase/migrations/`, versionado e aplicado por CLI.
