# 10 — Plano de Fases de Construção (v0.1)

| Campo | Valor |
|---|---|
| **Documento** | Plano de Fases de Construção |
| **Projeto** | CRM próprio (substituição do Pipedrive) |
| **Versão** | v0.2 |
| **Data** | 14/08/2026 |
| **Status** | rascunho — F0 em execução |

> Roteiro de execução para o Claude Code. **Prazo imutável: 3/9/2026** (R-008). Em 14/08 restam 20 dias.

---

## 1. Princípios de sequenciamento

Quatro regras determinaram a ordem abaixo. Elas importam mais que o cronograma, porque sobrevivem a qualquer atraso.

1. **O log antes de qualquer tela.** Se a estrutura do log não estiver de pé antes de haver dado real em produção, os indicadores 7, 8 e 9 nascem cegos e não há recuperação (D-033).
2. **A extração do Pipedrive é a primeira coisa e não depende de nada.** Depois de 3/9 a API fecha junto com o contrato. Extrair cedo transforma um prazo duro em um arquivo no disco.
3. **A Lista antes do Kanban.** A Lista é a tela mais usada e a que revela cedo os problemas de paginação, filtro e volume com base real (R-006). O Kanban é mais vistoso e menos diagnóstico.
4. **Mobile depois do desktop, sobre telas já estáveis.** Redesenhar quatro telas que ainda mudam é fazer o trabalho duas vezes.

---

## 2. Fases

### F0 — Fundação
**Objetivo:** repositório, banco e deploy de pé, com o log funcionando antes de existir qualquer tela.

- Repositório, Next.js + TypeScript + Tailwind + shadcn/ui
- Remover o bloco `spacing` do `tailwind.config.ts` (P-025); confirmar Tailwind v3 × v4
- Tokens da Lure aplicados; alternador de tema claro/escuro
- **Um** projeto no Supabase (D-101); Supabase CLI e `supabase/migrations/`; banco local em contêiner para a construção
- Primeira migração: schema completo do Doc 09
- **Gatilho do log de eventos e revogação de update/delete**
- Políticas de acesso por domínio; gatilho de criação de usuário no primeiro login
- Google OAuth com a URL de retorno apontada para o Supabase (P-026, Doc 09 §4.1)
- Deploy inicial na Vercel, ambiente único

**Encerra quando:** um usuário do domínio faz login, um negócio criado à mão muda de etapa, e o evento aparece em `evento_negocio`.

---

### F1 — Extração do Pipedrive ⚠️ *pode começar imediatamente, em paralelo a F0*
**Objetivo:** tirar a base do Pipedrive de dentro do Pipedrive.

- Script de extração com token em variável de ambiente
- Paginação até o fim de cada entidade; pausa entre chamadas; tratamento de `429`
- **Persistir JSON bruto por entidade, antes de qualquer transformação**
- Investigar os changelogs (P-021): dá para reconstituir a trajetória dos negócios?
- Conferir contagens contra o Pipedrive

**Encerra quando:** existem arquivos JSON com 2.453 negócios, 422 organizações, pessoas, atividades, anotações, produtos, funis, etapas e usuários — e as contagens batem.

> Depois desta fase, o dia 3/9 deixa de ameaçar os dados. Ameaça só o sistema.

---

### F2 — Carga de ensaio, no banco local
**Objetivo:** dado real no banco de construção, cedo — e o roteiro da carga em produção ensaiado até não errar.

- Mapeamento campo a campo (Doc 14)
- Transformações: UTC → Brasília, status, motivo de perda como lista, valores
- Carga com `app.carga_migracao = true`
- Conferência de contagens e amostragem manual
- **Repetir do zero** com `supabase db reset` até rodar duas vezes seguidas sem erro nem divergência

**Encerra quando:** o banco local tem a base real, o log não foi contaminado, e a carga rodou limpa do início ao fim duas vezes.

> A partir daqui, **toda tela é construída contra 2.453 registros de verdade**. É o que faz os problemas de volume aparecerem na semana 1 e não na véspera.

⚠️ **Esta fase mudou de peso com a D-101.** Antes ela era conveniência — dado real cedo para construir as telas. Agora ela é a **única** rede de proteção da carga: como não há ambiente de nuvem intermediário, a próxima vez que este roteiro rodar é na base que os sócios vão usar. Cortar ou apressar a F2 é a decisão que mais custa caro neste plano.

---

### F3 — Negócios: Lista
- Dez colunas fixas; paginação no servidor; lista virtualizada
- Filtro e ordenação em todas as colunas, combináveis, com indicador visual
- Persistência de filtro por usuário
- Busca por organização e título
- Exportação CSV do conjunto filtrado

### F4 — Negócios: detalhe e trava de desfecho
- Tela em três zonas; aba Linha do Tempo com seletor Usuário · Sistema · Tudo
- Edição dos campos; anotações
- **Trava de D-047**: diálogo obrigatório de desfecho
- Motivo de perda obrigatório quando Perdido
- Botões Ganho e Perdido no topo
- Rota `/api/bubble/clientes` e seletor de cliente no Ganho, com falha tolerada (D-077)

### F5 — Negócios: Kanban
- Seis colunas, arrastar-e-soltar com dnd-kit
- Cartão com título, organização, valor, status
- Carregamento por partes na rolagem, sobretudo em Cold Lead
- A trava de desfecho vale também no arrastar

### F6 — Atividades
- Tela própria com modo lista e modo calendário
- Criação vinculada a negócio; conclusão; registro retroativo
- Exportação CSV

### F7 — Contatos e Produtos
- Organizações e pessoas, com vínculo carregando cargo
- Formas de contato com link WhatsApp e mailto
- Histórico consolidado derivado nas fichas
- Exclusão de pessoa e formas de contato
- Produtos com área

### F8 — Automações e notificações
- Follow-up de 90 dias ao ganhar, desativável
- Negócio parado, atividade vencida, lembrete de próxima atividade
- Central de notificações internas. **Nenhum e-mail**
- Automações ignoram negócios com status Parado

### F9 — Mobile (consulta e marcação)
- Lista em cartões, com busca e filtro
- Kanban uma etapa por vez, com seletor
- Ficha do negócio, atividades, anotações e linha do tempo em leitura
- Marcar atividade como concluída

### F10 — Virada
- Migração ensaiada no banco local até as contagens baterem
- **Carga em produção** — a primeira e única vez que este roteiro roda na base real (D-101)
- ⭐ **Ensaio de operação real: os dois sócios um dia inteiro sem abrir o Pipedrive**
- Verificação dos sete critérios de D-098
- Desligamento do Pipedrive

---

## 3. Ordem, dependências e paralelismo

```
F1 Extração ──────────────┐
                          ▼
F0 Fundação ──► F2 Carga de ensaio (banco local)
                          │
                          ├──► F3 Lista ──► F4 Detalhe ──► F5 Kanban
                          │                     │
                          ├──► F6 Atividades ◄──┘
                          │
                          └──► F7 Contatos e Produtos
                                        │
                          F8 Automações ◄┘
                                        │
                          F9 Mobile ◄───┘   (sobre telas estáveis)
                                        │
                                   F10 Virada
```

**F1 não depende de F0.** É a única fase que pode começar hoje, antes de qualquer decisão de código.

---

## 4. Se o prazo apertar

Ordem de sacrifício, do que dói menos ao que dói mais. Registrada agora, com a cabeça fria, para não ser improvisada em 30 de agosto.

| Ordem | O que cortar | O que se perde | O que **não** muda |
|---|---|---|---|
| 1º | **Modo calendário** das atividades | A agenda visual; a lista continua | Nada do registro |
| 2º | **Automações** (F8) menos o follow-up | Alertas de parado, vencida, lembrete | Os dados; as automações entram depois sem migração |
| 3º | **Mobile** (F9) | Consulta pelo celular no dia 1 | Entra em setembro; nada é perdido |
| 4º | **Tema escuro** | Preferência visual | Trivial de acrescentar depois |
| 5º | **Exportação CSV** | Cópia manual e relatórios avulsos | O dado está no banco |

⛔ **Nunca cortar, em nenhuma hipótese:** o log de eventos e seu gatilho · a trava de desfecho · a migração completa · o login por domínio.

⚠️ A razão é sempre a mesma: tudo o que está na lista de corte pode ser acrescentado depois sem perda. O que está na lista proibida, não.

---

## 5. Riscos de execução

| Risco | Mitigação |
|---|---|
| A extração não acontece a tempo | F1 é a primeira fase e independe de tudo |
| A migração falha na véspera | Ensaiada no banco local desde F2, não em F10. ⚠️ **Mitigação enfraquecida por D-101**: sem ambiente de nuvem, a carga real acontece direto em produção. Risco assumido pelo maestro |
| A carga falha no meio, em produção | Ordem de carga do Doc 14 respeitada; `origem_carga = true` marcando tudo; backup diário do Supabase (D-089). Nenhuma dessas substitui um ambiente separado |
| Telas construídas com dados de teste quebram com a base real | F2 antes de F3: toda tela nasce contra 2.453 registros |
| O log entra depois | F0 o coloca antes de qualquer tela |
| Escopo cresce durante a construção | Doc 05 marca o que é fase 2; CLAUDE.md lista o que não construir |

---

## Changelog

- **v0.2** — 14/08/2026 — **D-101 incorporada**: um projeto no Supabase, um deploy na Vercel, carga direto em produção. A F2 deixa de ser "carga em desenvolvimento" e passa a ser "carga de ensaio, no banco local" — e muda de peso, porque vira a única rede de proteção da carga real. Risco de falha da carga em produção acrescentado à seção 5.
- **v0.1** — 13/08/2026 — Criação a partir do escopo recortado no Bloco 12 e da arquitetura do Doc 09. Onze fases, com ordem de sacrifício definida antecipadamente.
