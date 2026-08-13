# 01 — Plano de Execução do Projeto (v0.2)

| Campo | Valor |
|---|---|
| **Documento** | Plano de Execução |
| **Projeto** | CRM próprio (substituição do Pipedrive) |
| **Versão** | v0.2 |
| **Data** | 10/08/2026 |
| **Status** | validado |

---

## 1. Objetivo deste projeto de documentação

Produzir um conjunto completo e versionado de documentos que definam **o produto, o design (UX/UI) e o plano de construção em fases**, de modo que o desenvolvimento possa ser executado pelo Claude Code com o mínimo de ambiguidade e o mínimo de retrabalho.

Este projeto **não é** o desenvolvimento. É a engenharia de requisitos que o antecede.

## 2. Escopo do produto a ser documentado

Aplicativo de CRM inspirado no Pipedrive, contemplando:

- Negócios / oportunidades
- Cadastro de organizações
- Cadastro de pessoas
- Formas de contato por pessoa (e-mail, telefone, outros)
- Cadastro e controle de atividades, com histórico de ações vinculado às oportunidades
- Visualização em Kanban e em Lista
- Estatísticas sobre a evolução dos negócios e sobre a base cadastrada

Detalhamento, limites e prioridades serão definidos nas entrevistas.

## 3. Princípios de trabalho

1. **O maestro decide.** O consultor propõe, organiza, aponta riscos e alternativas. Nenhuma definição entra na documentação sem validação explícita.
2. **Zero decisão técnica implícita.** Linguagem, framework, banco de dados, schema, hospedagem, autenticação, bibliotecas — tudo é apresentado como opções com prós e contras, e decidido pelo maestro.
3. **Uma pergunta por vez.** Sem questionários. Cada resposta pode redirecionar a pergunta seguinte.
4. **Documentação viva e versionada.** Cada documento tem versão, status e changelog.
5. **Rastreabilidade.** Toda decisão relevante vai para o Log de Decisões (Doc 03) com data e justificativa.
6. **Continuidade entre sessões.** O Doc 00 é atualizado ao fim de cada sessão para permitir retomada sem perda de contexto.
7. **Registrar o "não".** O que ficou fora do escopo é documentado tão explicitamente quanto o que ficou dentro.

## 4. Fases da consultoria

### Fase 1 — Descoberta
Entrevistas dos blocos 1 a 9. Entendimento do negócio, do processo comercial, dos dados, das regras, dos usuários e das expectativas de uso.
**Entregáveis:** Docs 02, 03, 04, 05, 13.

### Fase 2 — Definição do Produto
Consolidação dos requisitos funcionais e do modelo de domínio conceitual. Priorização MVP × pós-MVP.
**Entregáveis:** Docs 05, 06.

### Fase 3 — Design (UX e UI)
Fluxos, jornadas, arquitetura de informação, wireframes descritivos, identidade visual e design system.
**Entregáveis:** Docs 07, 08. Entrevistas dos blocos 6 e 11.

### Fase 4 — Definição Técnica
Escolha de stack, arquitetura, banco, hospedagem, estratégia de dados e segurança — **conduzida por decisão do maestro**.
**Entregáveis:** Doc 09. Entrevista do bloco 10.

### Fase 5 — Plano de Construção
Fatiamento em fases executáveis, backlog com critérios de aceite, e o arquivo de contexto permanente para o Claude Code.
**Entregáveis:** Docs 10, 11, 12, 14. Entrevista do bloco 12.

### Fase 6 — Handoff
Revisão final da biblioteca, checagem de consistência entre documentos e liberação para início do desenvolvimento.

## 5. Biblioteca de documentos

| # | Documento | Fase | Função |
|---|---|---|---|
| 00 | Status e Retomada | todas | Continuidade entre sessões |
| 01 | Plano de Execução | 0 | Método e governança |
| 02 | Roteiro de Entrevistas | 1 | Perguntas e respostas registradas |
| 03 | Log de Decisões | todas | Rastreabilidade |
| 04 | Visão de Produto | 1 | Problema, objetivos, usuários, sucesso |
| 05 | Requisitos Funcionais | 2 | Módulos, funcionalidades, regras |
| 06 | Modelo de Domínio | 2 | Entidades e relacionamentos (conceitual) |
| 07 | UX | 3 | Fluxos, jornadas, arquitetura de informação |
| 08 | UI e Design System | 3 | Identidade, componentes, tokens |
| 09 | Arquitetura Técnica | 4 | Stack, banco, hospedagem |
| 10 | Plano de Fases de Construção | 5 | Roadmap para o Claude Code |
| 11 | Backlog e Critérios de Aceite | 5 | Tarefas com definição de pronto |
| 12 | CLAUDE.md | 5 | Contexto permanente do desenvolvimento |
| 13 | Glossário | 1 | Vocabulário padronizado do domínio |
| 14 | Migração do Pipedrive | 5 | Estratégia de dados legados |

## 6. Padrão de versionamento

- Todo documento abre com cabeçalho: documento, projeto, versão, data, status.
- Status possíveis: `rascunho` · `em revisão` · `validado` · `vivo` · `obsoleto`.
- Versões: `v0.x` enquanto rascunho; `v1.0` na validação do maestro; incrementos a partir daí.
- Todo documento fecha com changelog datado.
- Nomenclatura de arquivo: `NN-nome-do-documento-vX.Y.md` — a versão faz parte do nome, para que se saiba qual arquivo manter e qual descartar da biblioteca.
- O título (H1) de cada documento também traz a versão.
- Codificação: UTF-8 com BOM. Arquivos CSV, quando houver, com separador ponto-e-vírgula.

## 7. Riscos do processo

| Risco | Mitigação |
|---|---|
| Perda de contexto entre sessões | Doc 00 atualizado ao fim de cada sessão |
| Decisão técnica tomada por inércia | Regra explícita: consultor propõe, maestro decide |
| Escopo inflado por espelhar 100% do Pipedrive | Bloco 12 dedicado a recorte de MVP |
| Documentação genérica demais para o Claude Code executar | Doc 11 com critérios de aceite verificáveis |
| Divergência entre documentos | Fase 6 de revisão de consistência |

---

## Changelog

- **v0.2** — 10/08/2026 — Versão passa a constar no nome do arquivo e no título do documento.
- **v0.1** — 10/08/2026 — Criação do documento. Método aprovado pelo maestro.
