# CRM Lure

CRM próprio da Lure Consultoria, em substituição ao Pipedrive.

> ⚠️ **Prazo imutável: 3 de setembro de 2026.** O contrato do Pipedrive encerra nessa data, sem operação em paralelo.

## Antes de escrever qualquer código

Leia [CLAUDE.md](CLAUDE.md) por inteiro. Ele carrega as regras que não podem ser violadas — log de eventos por gatilho, trava de desfecho, nomes em português, nenhum segredo em `NEXT_PUBLIC_`.

## Biblioteca de documentos

Toda a documentação viva está em [docs/](docs/). Comece por [00 — Status e Retomada](docs/00-status-e-retomada-v1.0.md), que diz onde o projeto está e qual é a próxima ação.

| # | Documento | Para quê |
|---|---|---|
| 00 | [Status e Retomada](docs/00-status-e-retomada-v1.0.md) | Onde o projeto está e o que vem a seguir |
| 01 | [Plano de Execução](docs/01-plano-de-execucao-v0.2.md) | Método da consultoria |
| 02 | [Roteiro de Entrevistas](docs/02-roteiro-de-entrevistas-v1.0.md) | As 80 perguntas e suas respostas |
| 03 | [Log de Decisões](docs/03-log-de-decisoes-v0.9.md) | **100 decisões com justificativa.** Consulte antes de perguntar |
| 04 | [Visão de Produto](docs/04-visao-de-produto-v0.1.md) | Por que o sistema existe |
| 05 | [Requisitos Funcionais](docs/05-requisitos-funcionais-v0.1.md) | 153 requisitos |
| 06 | [Modelo de Domínio](docs/06-modelo-de-dominio-v0.5.md) | Entidades e regras, conceitual |
| 08 | [UI e Design System](docs/08-ui-e-design-system-v0.1.md) | Cores, tipografia, densidade |
| 09 | [Arquitetura Técnica](docs/09-arquitetura-tecnica-v0.2.md) | Schema físico, gatilhos, políticas |
| 10 | [Plano de Fases de Construção](docs/10-plano-de-fases-de-construcao-v0.1.md) | Ordem das fases F0 a F10 |
| 11 | [Backlog e Critérios de Aceite](docs/11-backlog-e-criterios-de-aceite-v0.1.md) | 126 itens com critério de pronto |
| 12 | [CLAUDE.md](docs/12-claude-md-v0.1.md) | Fonte do `CLAUDE.md` da raiz |
| 13 | [Glossário](docs/13-glossario-v0.1.md) | Vocabulário do projeto |
| 14 | [Migração do Pipedrive](docs/14-migracao-do-pipedrive-v0.1.md) | Mapeamento campo a campo |
| 14* | [Referência da API Pipedrive](docs/14-referencia-api-pipedrive-v0.1.md) | Endpoints para a extração |

O documento 07 (UX — Fluxos e Arquitetura de Informação) é o único não criado; o material está distribuído nos documentos 05, 08 e 11.

## Stack

Supabase (PostgreSQL) · Vercel · Next.js (App Router) + TypeScript · Tailwind CSS + shadcn/ui · TanStack Query · dnd-kit · Recharts (fase 2) · lucide-react · fonte Archivo.

## Convenções

- Arquivos em **UTF-8 com BOM**; CSV sempre com separador **ponto-e-vírgula**.
- Nomes de tabela e coluna em **português, `snake_case`**.
- Nenhuma alteração de estrutura do banco pelo painel do Supabase — tudo em `supabase/migrations/`, versionado e aplicado por CLI.
