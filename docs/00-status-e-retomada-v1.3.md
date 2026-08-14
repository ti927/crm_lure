# 00 — Status e Retomada (v1.3)

| Campo | Valor |
|---|---|
| **Documento** | Status e Retomada da Consultoria |
| **Projeto** | CRM próprio (substituição do Pipedrive) |
| **Versão** | v1.3 |
| **Última atualização** | 14/08/2026 — Sessão 05 |
| **Status** | vivo — atualizado ao fim de cada sessão |
| **Consultor** | Claude |
| **Maestro** | quem decide tudo neste projeto |

---

## 1. COMO RETOMAR — leia isto primeiro

⚠️ **A biblioteca deixou de ser um anexo de conversa e passou a ser o repositório.** Desde 14/08/2026 os documentos vivem em `docs/`, dentro de `https://github.com/ti927/crm_lure.git`. Isso muda como se retoma.

### 1.1 Retomando no Claude Code — o caminho normal

Abra a pasta do repositório e cole:

> Retomando o projeto CRM. Leia `CLAUDE.md` e depois `docs/00-status-e-retomada`, e siga a partir de "Próxima ação" (seção 4.2). Mantenha as regras de trabalho da seção 3: uma pergunta por vez e nenhuma decisão, especialmente técnica, sem minha validação explícita.

Não é preciso anexar nada. O `CLAUDE.md` da raiz é carregado sozinho, e o resto da biblioteca está a um `Read` de distância.

### 1.2 Retomando numa conversa avulsa, sem o repositório

Aí sim é preciso anexar os arquivos da tabela abaixo. Fora do repositório o Claude não enxerga nada — e sem o Doc 03 ele vai reperguntar coisas já decididas.

**Documentos da biblioteca:**

| Arquivo (a versão faz parte do nome) |
|---|
| `00-status-e-retomada-v1.3.md` |
| `01-plano-de-execucao-v0.3.md` |
| `02-roteiro-de-entrevistas-v1.1.md` |
| `03-log-de-decisoes-v0.11.md` |
| `06-modelo-de-dominio-v0.5.md` |
| `04-visao-de-produto-v0.1.md` |
| `05-requisitos-funcionais-v0.1.md` |
| `08-ui-e-design-system-v0.1.md` |
| `09-arquitetura-tecnica-v0.4.md` |
| `10-plano-de-fases-de-construcao-v0.2.md` |
| `11-backlog-e-criterios-de-aceite-v0.2.md` |
| `12-claude-md-v0.3.md` *(vai para a raiz do repositório como `CLAUDE.md`)* |
| `13-glossario-v0.1.md` |
| `14-migracao-do-pipedrive-v0.2.md` |
| `14-referencia-api-pipedrive-v0.1.md` *(rascunho técnico de apoio — não é o Doc 14 oficial)* |
| `lure-crm-tokens.css` e `tailwind.config.ts` *(insumos do Doc 08 — versão anterior à revisão da seção 3; os tokens em uso estão em `app/tokens.css`)* |

> Ao subir uma versão nova, **renomeie o arquivo com `git mv`** — a versão faz parte do nome, e o `git mv` preserva o histórico daquele documento. Nunca deixe as duas versões lado a lado: o git guarda o passado, o nome do arquivo guarda o presente.

> Ao renomear, conferir se a tabela acima, o `README.md` e as referências cruzadas entre documentos ainda apontam para arquivos que existem.

---

## 2. O PROJETO EM UMA PÁGINA

**Quem.** Empresa de **consultoria empresarial**. Clientes 99% PJ, mercado 100% privado. Hoje apenas os **sócios** usam o CRM; há plano de profissionalizar com SDR, BDR, closer e coordenação, chegando a ~10 usuários.

**Por quê.** Substituir o Pipedrive **exclusivamente por custo**: R$ 3.500/ano para 4 usuários, e 10 usuários quase dobrariam esse valor. **Não há dores funcionais.**

**⚠️ Prazo.** O contrato do Pipedrive **encerra em 3/9/2026**. Virada imediata, sem operação em paralelo (D-069, R-008). Risco de prazo apresentado pelo consultor e **assumido conscientemente pelo maestro**.

**Como vendem.** Todos os canais. **Ciclo longo** (meses), **ticket médio ~R$ 100 mil** por contrato anual.

**Volume real da base:** 2.453 negócios, 422 organizações, 33 atividades em aberto.

**Funil atual (único), seis etapas.** Cold Lead → Hot Lead → Contato Realizado → Apresentação Realizada → Proposta Enviada → **Aguardando Contrato**. Ganho e Perdido **não são etapas** — são status.

**Status do negócio, fixo em quatro valores:** Parado · Negociação · Ganho · Perdido.

**Sistema vizinho.** A empresa opera um **sistema interno em Bubble.io**, para onde o cliente migra depois do ganho. Única integração do MVP.

**Stack decidida.** Supabase · Vercel · Next.js 16 + TypeScript · Tailwind v4 · shadcn/ui · TanStack Query · dnd-kit · Recharts. **Uma base na nuvem** (D-101), mais o banco local em contêiner; regras de processo na aplicação e **log de eventos por gatilho no banco**.

**Identidade visual.** Manual da **Lure** (BR/BAUEN, 2015): preto e branco de base, cor pontuando. Paleta de oito cores; Archivo no lugar da Flama. Tema claro e escuro.

---

## 3. REGRAS DE TRABALHO — não violar

1. **O maestro decide.** O consultor propõe, organiza, aponta riscos e alternativas.
2. **Zero decisão técnica implícita.** Tudo é apresentado como opções com prós e contras.
3. **Uma pergunta por vez.** Nunca questionários.
4. **Todo item que ultrapassa a paridade com o Pipedrive é marcado como "extra"** (E-00x no Doc 03).
5. **Documentação viva e versionada**, com cabeçalho e changelog em cada arquivo.
6. **Ao fim de cada sessão, atualizar este documento.**
7. Arquivos em **UTF-8 com BOM**; CSVs com separador **ponto-e-vírgula**.

---

## 4. ONDE ESTAMOS

**Fase:** **construção**. Documentação concluída (13 dos 14 documentos); **F0 quase fechada — a base de produção está no ar**; F3 iniciada.
**Perguntas respondidas:** 80 · 12 blocos · **106 decisões** · 153 requisitos · 126 itens de backlog

⚠️ **A ordem das fases mudou** (D-105): o maestro pediu front-end funcionando antes da migração, então a sequência passou a ser F0 → F3 → OAuth/Vercel → F1 → F2. O Doc 10 continua descrevendo a ordem original, que era a recomendada.

**Repositório:** `https://github.com/ti927/crm_lure.git` — biblioteca em `docs/`, `CLAUDE.md` na raiz.

### 4.1 O que já está de pé (F0)

| Item | Situação |
|---|---|
| Repositório, biblioteca versionada, `CLAUDE.md` | ✅ |
| Next.js 16 + TypeScript + Tailwind v4 + shadcn/ui | ✅ P-025 encerrada em favor da **v4** |
| Tokens da Lure com as três correções do Doc 08; dois temas | ✅ conferidos na tela |
| Schema do Doc 09 em três migrações versionadas + semente do funil | ✅ |
| Gatilho do log, imutabilidade, marcação de carga | ✅ verificado contra PostgreSQL real |
| Acesso por domínio e criação automática de usuário | ✅ verificado |
| Clientes Supabase, barreira de autenticação, login por Google | ✅ código pronto, **provedor Google ainda não habilitado** |
| **Projeto no Supabase criado** — `qyitrhflinkfcylobsfp`, região us-east-1 | ✅ **P-030 encerrada** |
| **Schema aplicado em produção** — as três migrações, com histórico registrado | ✅ 20 tabelas |
| **Semente aplicada** — funil Comercial e as seis etapas | ✅ `funil` 1 · `etapa` 6 · `papel` 1 |
| Acesso anônimo verificado contra a base real | ✅ leitura e escrita **negadas** (`42501`) |

### 4.1.1 O que já está de pé (F3 — Lista de negócios)

| Item | Situação |
|---|---|
| Moldura do sistema: barra lateral, cabeçalho, tema, sair | ✅ código pronto |
| Lista com as dez colunas de D-104 | ✅ código pronto |
| Paginação no servidor, 50 por página (R-006) | ✅ |
| Ordenação em todas as dez colunas | ✅ |
| Busca por título ou organização | ✅ — ver correção **C-04** do Doc 09 |
| Filtro por etapa e por status | ✅ |
| Filtro nas dez colunas (B-042) · persistência (B-045) · CSV (B-047) | ⬜ pendente |

⚠️ **Nada disso foi aberto no navegador.** Sem o provedor Google habilitado, o `proxy.ts` manda toda rota para `/login`. O código compila e passa no ESLint, e todas as consultas foram validadas contra o PostgREST real — mas **nenhum componente foi conferido nos dois temas**, o que é a regra 4 do `CLAUDE.md`. É a primeira coisa a fazer quando o login funcionar.

⚠️ **Três trechos do Doc 09 não funcionavam como estavam escritos** e foram corrigidos — ver Doc 09, seção 3.11 (C-01, C-02, C-03). O mais grave, C-02, quebraria toda escrita em `negocio` depois da carga de migração.

### 4.2 Próxima ação

**Bloqueado no maestro — F0 não fecha sem isto:**

1. **Google Cloud**: cliente OAuth *Web application*, com a URL de retorno apontando para o **Supabase**, não para a aplicação (Doc 09, §4.1):
   `https://qyitrhflinkfcylobsfp.supabase.co/auth/v1/callback`
2. Habilitar o provedor **Google** no painel do Supabase e colar Client ID e Secret
3. Em *Authentication → URL Configuration*: `http://localhost:3000/**` e, depois, a URL da Vercel
4. **Desabilitar o provedor Email** — hoje ele está ativo com cadastro aberto (P-032)
5. **Deploy na Vercel**, região `iad1` para ficar colada ao banco (D-103)

**Logo depois:** abrir cada tela da F3 nos dois temas e corrigir o que aparecer — a dívida registrada em 4.1.1.

**Com prazo próprio e não recuperável:** **F1 — extração da base do Pipedrive** (P-020). A API fecha com o contrato em **3/9**. Precisa de um token da API do Pipedrive. Adiada por D-105.

**Depois:** F2 — a carga. ⚠️ D-106 revogou a D-102: **não há ensaio**. Ela roda uma única vez, direto na base definitiva.

### 4.3 Validações que ainda dependem do maestro

| Item | Onde |
|---|---|
| Doc 08 (design system), Doc 10 (fases), Doc 11 (backlog), Doc 14 (migração) — todos em rascunho | aguardam leitura |
| Regra de conversão de status na migração | Doc 14, seção 5.1 |
| ~~D-102 — ensaiar a migração~~ | ⛔ **revogada por D-106** em 14/08. Não haverá ambiente de ensaio |
| P-022 · P-024 · P-026 — ações práticas fora da conversa | seção 8 |

### 4.4 Recorte do MVP (Bloco 12)

**Entra:** Negócios (Kanban, Lista de dez colunas, detalhe em três zonas, Linha do Tempo) · Atividades (lista e calendário) · Contatos · Produtos/Serviços · trava de desfecho e seletor Bubble · quatro automações com notificação interna · **log de eventos por gatilho** · exportação CSV · dois temas · Google OAuth · migração completa · **celular em modo consulta e marcação**.

**Fica para a fase 2:** telas de estatísticas · mesclagem · transferência · telas de configuração · criação e edição pelo celular · metas · Google Agenda · API para agentes de IA · construtor de relatórios.

### 4.5 Tarefa fora do fluxo de entrevistas

⚠️ **A extração da base do Pipedrive (P-020) não depende de mais nenhuma decisão.** É código pequeno, independente da stack, e precisa acontecer **antes de 3/9**, quando o acesso à API se encerra junto com o contrato. O material de referência para escrevê-la já está na biblioteca (`14-referencia-api-pipedrive-v0.1`). Persistir os dados brutos em JSON desacopla a migração do prazo do sistema.

---

## 5. PAINEL DE BLOCOS DE ENTREVISTA

| # | Bloco | Status | Perguntas |
|---|---|---|---|
| 1 | Contexto e objetivo | 🟢 concluído | 5/5 |
| 2 | Processo comercial | 🟢 concluído | 7/7 |
| 3 | Entidades e dados | 🟢 concluído | 14/14 |
| 4 | Regras de negócio e automações | 🟢 concluído | 6/6 |
| — | Validação do Modelo de Domínio | 🟢 concluído | 6/6 |
| 5 | Usuários, papéis e permissões | 🟢 concluído | 5/5 |
| 6 | Visualizações e UX | 🟢 concluído | 6/6 |
| 7 | Estatísticas e relatórios | 🟢 concluído | 6/6 |
| 8 | Migração e integrações | 🟢 concluído | 5/5 |
| 10 | Restrições e preferências técnicas | 🟢 concluído | 6/6 |
| 9 | Requisitos não-funcionais | 🟢 concluído | 5/5 |
| 11 | Identidade visual e UI | 🟢 concluído | 5/5 |
| 12 | Escopo do MVP e fases | 🟢 concluído | 4/4 |

Legenda: ⚪ não iniciado · 🔵 em andamento · 🟢 concluído · 🟡 pendente de validação

---

## 6. PAINEL DE DOCUMENTOS DA BIBLIOTECA

| # | Documento | Versão | Status | Quando será criado |
|---|---|---|---|---|
| 00 | Status e Retomada | v1.3 | vivo | — |
| 01 | Plano de Execução | v0.3 | validado — **consultoria encerrada na Fase 6** | — |
| 02 | Roteiro de Entrevistas | v1.1 | **concluído** — revisões entram como nota | — |
| 03 | Log de Decisões | v0.11 | vivo | — |
| 04 | Visão de Produto | v0.1 | rascunho | criado 13/08 |
| 05 | Requisitos Funcionais | v0.1 | rascunho — 153 requisitos | criado 13/08 |
| 06 | Modelo de Domínio | v0.5 | ✅ **validado** | — |
| 07 | UX — Fluxos e Arquitetura de Informação | — | **único não criado** | Material acumulado nos Docs 05, 08 e 11. Escrever se as telas exigirem detalhamento maior |
| 08 | UI e Design System | v0.1 | rascunho — **aguarda validação** | criado 13/08 |
| 09 | Arquitetura Técnica | v0.4 | rascunho — **schema no ar**; **seção 3.11 com as correções C-01 a C-04** | atualizado 14/08 |
| 10 | Plano de Fases de Construção | v0.2 | rascunho — 11 fases | atualizado 14/08 |
| 11 | Backlog e Critérios de Aceite | v0.2 | rascunho — 126 itens | atualizado 14/08 |
| 12 | CLAUDE.md | v0.3 | rascunho — **na raiz do repositório** | atualizado 14/08, sessão 05 |
| 13 | Glossário | v0.1 | rascunho | criado 13/08 |
| 14 | Migração do Pipedrive | v0.2 | rascunho — mapeamento completo | atualizado 14/08 |
| 14* | *Referência da API Pipedrive* | v0.1 | **anexo do Doc 14** | endpoints e limites de uso |

---

## 7. DECISÕES JÁ TOMADAS

Registro completo no documento **03 — Log de Decisões**: **102 decisões (D-001 a D-102)**, 13 extras (E-001 a E-013) e 9 restrições de arquitetura (R-001 a R-009).

**As mais estruturais:**

- Negócio exige **título e organização**. Não há data prevista de fechamento, portanto **não há previsão de receita**.
- **Status e Etapa são dimensões independentes.** Status é **fixo** (Parado · Negociação · Ganho · Perdido); etapas são configuráveis.
- **Status Parado congela o negócio** — nenhuma automação o monitora, e ele fica **fora dos indicadores de desempenho** por padrão.
- **Única trava de transição:** entrar em Aguardando Contrato exige declarar Ganho ou Perdido (e o motivo, se perdido).
- **Ao declarar Ganho**, o diálogo oferece o **seletor de cliente do sistema Bubble** — vínculo opcional, que não trava a conclusão.
- **Campos fixos.** **Toda atividade pertence a um negócio.** **Um produto por negócio.**
- **Log automático de eventos** é obrigatório e **não-postergável**. Nunca é reescrito.
- **Autenticação por Google OAuth**, autorização por domínio. Usuário nunca é excluído.
- **MVP com papel único de acesso total.**
- Alertas apenas como **notificação interna — sem envio de e-mail** (reconfirmado).
- **Estatísticas como catálogo de indicadores**, com painel montável por usuário. **Treze indicadores no MVP.** Recortes por período, usuário, origem, produto e área.
- **Exportação do que está na tela** em CSV ponto-e-vírgula, UTF-8 com BOM.
- **Migração completa** dos dados do Pipedrive.
- **Stack:** Supabase · Vercel · Next.js + TypeScript · Tailwind · shadcn/ui · TanStack Query · dnd-kit · Recharts.
- **Log de eventos gerado por gatilho no banco**, tabela somente inserção. Regras de processo na aplicação.
- **Uma base na nuvem** (D-101, revoga metade de D-082), com migrações versionadas. Sem alteração de estrutura à mão. A carga roda direto em produção; o ensaio, no banco local.
- **Primeiro login do domínio cria o usuário**, ativo, papel único.
- **Desktop e celular**, com telas próprias no celular para as telas densas.
- **Brasil como localização única**, real como moeda única.
- **Sem módulo de LGPD/auditoria**; backup diário do Supabase basta.
- **Identidade Lure**: preto e branco de base, cor pontuando; densidade confortável de 44px; tema claro e escuro.
- **MVP recortado (Bloco 12):** fora ficam as telas de estatísticas, mesclagem, transferência e telas de configuração. O **log de eventos permanece** — é a única coisa não recuperável depois.
- **Celular em modo consulta** no dia 1; criação e edição pelo celular na fase 2.
- **Critério de pronto** com sete itens, incluindo um dia inteiro de operação real antes de 3/9.
- **Nomes de tabela e coluna em português**; exclusão real com restrição nos vínculos.

---

## 8. PENDÊNCIAS EM ABERTO

| # | Item | Bloqueia | Situação |
|---|---|---|---|
| P-005 | Inventário funcional do que a equipe usa no Pipedrive | Doc 05 | Amplamente coberto pelos prints; revisar na Fase 2 |
| P-006 | Estimar custo de manutenção contínua | Doc 09/10 | **Infraestrutura encerrada** (D-083 + D-101): planos Pro já existentes e **um projeto só**, sem os ~US$ 10/mês do projeto adicional. Sobra o custo do tempo do maestro conduzindo o Claude Code |
| P-014 | Modelar a entidade Notificação | Doc 06 | A-07, ainda aberto |
| P-016 | Revisitar cartão do Kanban: responsável e indicador de atividade | Doc 07 | Revisar no Bloco 11 |
| P-018 | Definir papéis e permissões granulares | Fase 2 | Adiado por decisão do maestro (D-049) |
| P-020 | ⚠️ **Extrair a base do Pipedrive antes de 3/9** | Doc 14 | **Não bloqueada por nada.** Pode ser feita a qualquer momento |
| P-021 | Investigar se os changelogs do Pipedrive permitem reconstituir a trajetória dos negócios | Doc 14 | Investigação técnica, não decisão do maestro |
| P-022 | Habilitar a Data API do Bubble e obter token | Doc 09 | Depende de ação do maestro no sistema Bubble |
| P-023 | Mapear os eixos admissíveis de cada um dos treze indicadores | Doc 05/07 | A-09 — trabalho de Fase 2 |
| P-024 | Obter os vetores do logotipo, símbolo "+" e monograma | Doc 08 | Estão no pacote que acompanha o manual — depende do maestro |
| P-027 | Modelar a entidade Notificação no schema | Doc 09 | A-07 — pendente desde o Bloco 4 |
| P-028 | Validar a regra de conversão de status na migração | Doc 14 | 🟡 proposta do consultor — seção 5.1 |
| P-026 | Apontar a URL de retorno OAuth no Google Cloud | F0 | **Uma** (D-101), e ela aponta para o **Supabase**, não para a aplicação — ver Doc 09, §4.1 |
| P-031 | Publicar na Vercel, região `iad1` | **F0** | Bloqueia o encerramento de F0 |
| P-032 | **Desabilitar o provedor Email** no Supabase | segurança | Hoje ativo com cadastro aberto. Como a chave anônima é pública, qualquer pessoa cria conta por e-mail e senha. Não vê dado nenhum — a RLS barra quem não é do domínio, verificado — mas polui `auth.users` e contraria D-050 |

Pendências encerradas: P-001 (stack), P-002 (migração), P-003 (identidade), P-004, P-007, P-008, **P-009 e P-013 (escopo — Bloco 12)**, P-010, P-011, P-012, P-015, P-017, P-019, **P-025 (Tailwind — v4, bloco `spacing` removido)**, **P-029 (domínio `lureconsultoria.com.br` confirmado pelo maestro em 14/08)**, **P-030 (projeto Supabase criado e schema aplicado em 14/08)**.

---

## 9. RISCOS ATIVOS DO PROJETO

| Risco | Observação |
|---|---|
| ⚠️ **Prazo × escopo** | 20 dias entre 14/08 e 3/9. **F0 está quase fechada** — falta o que depende do maestro. O que resta é substancial: Kanban com arrastar-e-soltar, Lista de dez colunas com filtro em todas, detalhe em três zonas, atividades com calendário, quatro automações, celular em consulta e a migração completa. **Risco assumido pelo maestro** |
| ⚠️ **Carga direto em produção** | D-101 eliminou o ambiente de nuvem intermediário. A carga dos 2.453 negócios roda uma única vez, na base que os sócios vão usar. Se falhar no meio, o conserto é em produção. Mitigações que restam: ensaio no banco local (D-102), ordem de carga do Doc 14, marcação `origem_carga` e backup verificado antes de começar. **Nenhuma delas substitui um ambiente separado. Risco assumido pelo maestro** |
| ⚠️ **Sem ensaio da carga** | **Novo em 14/08.** D-106 revoga a D-102: não haverá ambiente de ensaio. A carga dos 2.453 negócios roda **uma única vez, direto na base definitiva**. Mitigações que restam: ordem de carga do Doc 14, marcação `origem_carga` e backup verificado antes de começar. **Risco assumido pelo maestro** |
| ⚠️ **Janela de extração** | Depois de 3/9 o acesso à API do Pipedrive se encerra junto com o contrato. Se a extração não acontecer antes, os 2.453 negócios ficam inacessíveis. **Agravado por D-105**, que adiou a F1 para depois do front-end |
| Perda de histórico | O log de eventos precisa existir desde o primeiro dia em produção — não é recuperável depois. Os indicadores 7, 8 e 9 dependem disso |
| Economia menor que a esperada | O custo real não está na hospedagem, e sim na manutenção |
| Escopo crescendo por configurabilidade | Vários itens exigem telas de administração. O Bloco 12 precisa separar bem MVP de fase 2 |
| Ausência de forecast | Decisão consciente do maestro (D-024) |
| Acesso amplo demais | Autorização por domínio (D-050) e papel único (D-049): qualquer funcionário vê valores de contrato e motivos de perda. A resolver na fase 2 |
| Dependência externa no Ganho | O seletor de cliente Bubble depende da Data API daquele sistema. Mitigado por D-077 — o vínculo é opcional e não trava o negócio |
| Divergência entre documentação e realidade | Sempre que possível, confirmar o processo descrito contra a tela real |

---

## 10. HISTÓRICO DE SESSÕES

| Sessão | Data | O que foi feito | Onde parou |
|---|---|---|---|
| 01 | 10/08/2026 | Método e biblioteca. Documentos 00, 01, 02, 03 e 06. **Blocos 1 a 4** — 32 perguntas, 41 decisões. | Pergunta 5.1 formulada |
| 02 | 12/08/2026 | Doc 06 reescrito (v0.3). Separação Status × Etapa, funil de seis etapas, trava única. **Blocos 5 e 6** — 20 decisões (D-042 a D-061). | Bloco 7 a iniciar |
| 03 | 13/08/2026 | Doc 06 **validado**. **Blocos 7, 8, 10, 9, 11 e 12 concluídos** — Fase 1 encerrada com 100 decisões. Estatísticas como catálogo; migração completa; **prazo imutável de 3/9 revelado**; integração Bubble; **stack definida**; log por gatilho; dois ambientes; desktop e celular; **manual Lure incorporado** (Doc 08); **MVP recortado**; **Docs 09 e 12 escritos** — caminho crítico concluído. | Desenvolvimento desbloqueado; Docs 10 e 11 a escrever |
| 04 | 14/08/2026 | **Primeira sessão de construção.** Repositório criado e publicado; biblioteca movida para `docs/`. **P-025 encerrada em favor do Tailwind v4.** F0 executada até onde não depende do maestro: scaffold, tokens da Lure com as três correções do Doc 08, dois temas conferidos na tela, schema do Doc 09 em três migrações, gatilho do log, acesso por domínio, clientes Supabase e login por Google. **Três defeitos do Doc 09 encontrados e corrigidos** (C-01 a C-03) ao aplicar as migrações contra um PostgreSQL real. **D-101**: base única, carga direto em produção — biblioteca inteira revista de acordo. | F0 bloqueada em P-030 e P-031; F1 sem token |
| 05 | 14/08/2026 | **A base de produção entrou no ar.** Projeto do Supabase criado (`qyitrhflinkfcylobsfp`, us-east-1) e as três migrações mais a semente aplicadas — **P-029 e P-030 encerradas**. Conexão verificada de ponta a ponta: 20 tabelas, tipos do código batendo com o banco, leitura e escrita anônimas negadas. **F3 iniciada fora de ordem** (D-105): moldura do sistema e Lista de negócios com as dez colunas de D-104, paginação no servidor, ordenação em todas, busca e filtros. **C-04 encontrada** — o PostgREST não aceita coluna de tabela vinculada dentro de um `or`, o que quebrava a busca; corrigida em dois passos. D-103 (região), D-106 (ambiente único, **revoga D-102**). P-032 criada. **`CLAUDE.md` corrigido** (Doc 12 v0.3): saiu a instrução de ensaiar a carga no banco local, revogada por D-106, e a referência a um `tailwind.config.ts` inexistente. Tudo publicado no GitHub. | **F0 bloqueada no Google OAuth (P-026) e na Vercel (P-031).** Nada da F3 foi conferido em tela — é a primeira coisa a fazer quando o login funcionar |

---

## Changelog

- **v1.3** — 14/08/2026 — **Sessão 05: a base de produção entrou no ar e o front-end começou.** Seção 4.1 registra o projeto do Supabase criado e o schema aplicado; **4.1.1 criada** com o estado da Lista de negócios e a dívida de verificação — nada foi aberto no navegador porque o login ainda não existe, o que deixa a regra 4 do `CLAUDE.md` em aberto. Seção 4.2 reescrita: o que falta para fechar a F0 é o Google OAuth e a Vercel. **D-103 a D-106** acrescentadas ao Doc 03; **D-106 revoga a D-102** — não haverá ambiente de ensaio, e a carga roda uma única vez na base definitiva, o que vira risco próprio na seção 9. **P-029 e P-030 encerradas**, P-032 criada (provedor Email ativo com cadastro aberto). Ordem das fases alterada por D-105, com o risco da janela de 3/9 assumido pelo maestro. **Doc 12 a v0.3**, com o `CLAUDE.md` da raiz sincronizado: a instrução de ensaiar a carga no banco local saiu (revogada por D-106), a identidade visual deixou de apontar para um `tailwind.config.ts` que não existe, e entrou a regra 8 — há um ambiente só, e `npm run dev` fala com a base real.
- **v1.2** — 14/08/2026 — Seção 1 reescrita: a biblioteca deixou de ser anexo de conversa e virou repositório, então a retomada no Claude Code (1.1) e a retomada avulsa (1.2) passam a ser caminhos distintos. Instrução de versionamento troca "remova a anterior" por `git mv`, que preserva o histórico do documento, com lembrete de conferir as referências cruzadas depois de renomear.
- **v1.1** — 14/08/2026 — **Construção iniciada; D-101 propagada por toda a biblioteca.** Base única no Supabase, carga direto em produção, ensaio no banco local — Docs 02, 03, 09, 10, 11, 12 e 14 revistos. Seção 4 reescrita: o projeto deixa de estar "sem nenhuma linha de código" e passa a ter F0 quase fechada. P-025 encerrada (Tailwind v4); P-029, P-030 e P-031 criadas. Risco de carga direto em produção acrescentado à seção 9. Registro das correções C-01 a C-03 do Doc 09.
- **v1.0** — 13/08/2026 — **Biblioteca concluída.** Criados os Docs 04 (Visão de Produto), 05 (Requisitos Funcionais, 153 itens), 10 (Plano de Fases, 11 fases com ordem de sacrifício), 11 (Backlog, 126 critérios de aceite), 13 (Glossário) e 14 (Migração, com mapeamento campo a campo). Resta apenas o Doc 07. A próxima ação passa a ser **construção**, não documentação.
- **v0.12** — 13/08/2026 — **Caminho crítico concluído.** Docs 09 (Arquitetura Técnica) e 12 (CLAUDE.md) criados. Convenções técnicas validadas (D-099, D-100) — **100 decisões**. Próxima ação passa a ser a extração do Pipedrive e os Docs 10 e 11.
- **v0.11** — 13/08/2026 — **Bloco 12 concluído e Fase 1 encerrada.** 98 decisões. MVP recortado: estatísticas, mesclagem, transferência e telas de configuração fora; celular em modo consulta. Critério de pronto definido (D-098). P-009 e P-013 encerradas. Próxima ação passa a ser o Doc 09 e o Doc 12.
- **v0.10** — 13/08/2026 — Blocos 10, 9 e 11 concluídos (D-081 a D-092). **Doc 08 criado** a partir do manual de marca Lure. E-013 (mobile) criado. P-003 e P-017 encerradas; P-024 a P-026 criadas. Resta apenas o Bloco 12.
- **v0.9** — 13/08/2026 — Blocos 7 e 8 concluídos; Bloco 10 iniciado e antecipado (D-070). Doc 06 validado (v0.4). Stack definida — P-001 e P-002 encerradas. Prazo imutável de 3/9 incorporado ao resumo e aos riscos (R-008). Sistema interno em Bubble.io incorporado. Pendências P-020 a P-023 criadas; P-015 e P-019 encerradas. Riscos de prazo × escopo e de janela de extração acrescentados.
- **v0.8** — 12/08/2026 — Blocos 5 e 6 concluídos. Funil corrigido para seis etapas. Volume real da base registrado.
- **v0.7** — 10/08/2026 — Versão passa a constar no nome do arquivo e no título.
- **v0.6** — 10/08/2026 — Reescrita completa para autossuficiência de retomada.
- **v0.5** — 10/08/2026 — Bloco 4 concluído.
- **v0.4** — 10/08/2026 — Bloco 3 concluído. Doc 06 criado.
- **v0.3** — 10/08/2026 — Bloco 2 concluído.
- **v0.2** — 10/08/2026 — Bloco 1 concluído. Doc 03 criado.
- **v0.1** — 10/08/2026 — Criação do documento.
