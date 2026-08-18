# 00 — Status e Retomada (v2.0)

| Campo | Valor |
|---|---|
| **Documento** | Status e Retomada da Consultoria |
| **Projeto** | CRM próprio (substituição do Pipedrive) |
| **Versão** | v2.0 |
| **Última atualização** | 18/08/2026 — Sessão 08 |
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
| `00-status-e-retomada-v2.0.md` |
| `01-plano-de-execucao-v0.3.md` |
| `02-roteiro-de-entrevistas-v1.1.md` |
| `03-log-de-decisoes-v0.13.md` |
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

**Volume real da base** (extração de 17/08, não mais estimativa): **2.458 negócios · 2.889 organizações · 4.589 pessoas · 6.483 atividades (206 em aberto) · 922 anotações**. Valor total R$ 67.083.588,04; ganhos R$ 27.015.293,04.

⚠️ Os números antigos deste documento — 422 organizações e 33 atividades — estavam errados por larga margem.

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

**Fase:** **construção**. **F0, F1 e F2 concluídas.** F3 parcial, F5 iniciada.
**Perguntas respondidas:** 80 · 12 blocos · **118 decisões** · 153 requisitos · 126 itens de backlog

⚠️ **Ordem alterada por D-105:** F0 → F3 → OAuth/Vercel → F1 → F2. O Doc 10 descreve a ordem original.

**Repositório:** `https://github.com/ti927/crm_lure.git` — ⚠️ **público**, por decisão do maestro (D-114).
**Aplicação:** **`https://crm.lureconsultoria.com`** — no ar, com a base real. O endereço `crm-lure.vercel.app` continua respondendo.

⚠️ **Ao trocar de domínio, o Supabase precisa saber.** Se o endereço de retorno não estiver na lista autorizada, o login conclui e joga o usuário para o *Site URL* — foi assim que um login feito de outra máquina caiu em `localhost:3000`. Em *Authentication → URL Configuration*, o **Site URL** tem que ser o domínio de produção, e a lista de **Redirect URLs** precisa conter os três: produção, Vercel e `localhost` para desenvolver.

### 4.1 O que está de pé

| Fase | Situação |
|---|---|
| **F0 — Fundação** | ✅ **fechada.** Google OAuth funcionando, Vercel publicando, schema em produção |
| **F1 — Extração** | ✅ **fechada.** P-020 e P-021 encerradas. Dados brutos em `dados/pipedrive/`, fora do git |
| **F2 — Carga** | ✅ **rodou em 17/08**, conferida pelas dez verificações do Doc 14 §8 |
| **F3 — Lista** | ✅ **fechada 18/08.** Filtro nas dez colunas, indicador de coluna filtrada, persistência por usuário, exportação CSV e lista virtualizada — ver 4.2 sobre a verificação visual que falta |
| **F4 — Detalhe** | ✅ **três zonas, linha do tempo, anotações, trava nos três caminhos** |
| **F5 — Kanban** | ✅ seção própria em `/kanban`, arrastar-e-soltar, carregamento por partes, filtro por responsável e **trava de desfecho (D-047)** funcionando |
| **F7 — Contatos e Produtos** | ✅ **construída 18/08.** Contatos com abas Organizações/Pessoas, CRUD completo, fichas com histórico derivado (B-090 a B-095) e **agrupamento de cadastros duplicados**; Produtos com nome e área (B-096) |
| **F6 — Atividades** | ✅ **construída 18/08.** Três abas: **Lista** (um dia por vez, abrindo em Hoje, padrão do Pipedrive, com navegação ‹ › entre dias), **Vencidas** (a pilha de atrasadas, cada uma com a data em que venceu e há quantos dias, número na aba) e **Calendário** mensal; criação com vínculo opcional a negócio/organização/pessoa (D-108); conclusão; registro retroativo; filtros por situação/tipo/responsável; exportação CSV. **Sem migração** — o schema já sustentava os três vínculos |

**Scripts que passam a existir:**

| Arquivo | O que faz |
|---|---|
| `scripts/extrai-pipedrive.mjs` | Extrai as 13 entidades, JSON bruto por entidade |
| `scripts/extrai-changelog.mjs` | Histórico campo a campo dos 2.458 negócios. Retoma de onde parou |
| `scripts/carga-migracao.mjs` | A carga. **`--ensaio` roda tudo e desfaz** — use sempre antes |

⚠️ **A carga é reversível enquanto ninguém estiver usando o sistema**: `evento_negocio` tem `on delete cascade` no negócio. Deixa de ser no instante em que os sócios começarem a trabalhar, porque aí evento real e evento de carga se misturam.

### 4.2 Próxima ação

⚠️ **F3 fechou na sessão 07, mas sem verificação visual.** O login por Google impede o agente de abrir o navegador sozinho — tudo foi conferido por `tsc`, `eslint` e `next build` reais contra o banco de produção, mais leitura cuidadosa do código, mas ninguém *viu* a tela. Antes de considerar B-042/044/045/047 realmente prontos, abrir `/negocios` nos dois temas e conferir: filtro em cada cabeçalho de coluna, o funil de indicador quando um filtro está ativo, se a combinação volta igual depois de deslogar e logar de novo, o CSV abrindo certo no Excel em português, e a rolagem da lista virtualizada.

Também corrigidos nesta sessão: o link "voltar" do detalhe do negócio agora leva à Lista ou ao Kanban conforme a origem do clique (antes sempre voltava para `/negocios`), e o seletor de responsável — que aparecia atrás do cabeçalho fixo da tabela — foi reescrito sobre `Popover` do Radix (portal, já era dependência do projeto), o que tira o bug de vez em vez de só ajustar um número de `z-index`.

⚠️ **O log de eventos ainda não tem uma única linha,** até onde a sessão 06 apurou. A carga não dispara o gatilho, que é `after update`. Ele passa a gravar na primeira edição feita no detalhe do negócio — vale conferir que gravou, porque é o item que o `CLAUDE.md` marca como não recuperável. Não verificado nesta sessão.

**Pedido do maestro em 17/08, ainda não construído:** **acesso rápido a clientes pelo celular** — uma lista de clientes com busca, como porta de entrada do mobile. Isso amplia a D-097, que definiu o celular em torno do negócio e deixou Contatos de fora. O banco já sustenta; o trabalho é de tela.

**Depois:** F8 (automações), F9 (mobile), F10 (virada).

⚠️ **Duplicatas de organização, medidas em 18/08:** **1.195 dos 2.889 cadastros são repetição** — 668 grupos de nome idêntico, 41% da lista; "Sicoob Credseguro" aparece 6 vezes, "Amaral Group" 18. Vieram assim do Pipedrive. A Lista **agrupa na apresentação** (1.687 linhas em vez de 2.889) e mostra os **títulos dos negócios** de cada cadastro como referência — é o que distingue um "Sicoob Credseguro" do outro, já que cidade e site estão vazios. **Não é mesclagem**, que segue fora do MVP: nada foi fundido nem apagado. Se o maestro quiser de fato unificar os cadastros, isso é decisão e trabalho à parte.

⚠️ **Exceção assumida na F7, a validar:** a base nasceu com **zero áreas de produto** e zero produtos. Como as listas configuráveis não têm tela no MVP, o campo "área" do produto nunca poderia ser preenchido — o B-096 ficaria pela metade. O seletor de área ganhou um "+" que cria a área na hora. Não é tela de configuração: renomear, reordenar e desativar seguem no painel do Supabase.

**Organização das Atividades (ajustada em duas rodadas com o maestro, 18/08):** três abas. A **Lista** abre **no dia atual**, um dia por vez, com navegação ‹ › e botão "Hoje" — mostra só as atividades daquele dia, sem as vencidas junto. As **Vencidas** ganharam **aba própria** (o maestro pediu que não empurrassem as de hoje para baixo), cada uma com a data em que venceu e há quantos dias, e o total aparece como número vermelho na aba. O **Calendário** ficou em visão **mensal** — não a grade semanal com faixas de hora do Pipedrive, que seria esforço além da paridade. O filtro de responsável mostra todos por padrão (dois sócios que querem ver o que há na mesa).

⚠️ **Dívida aberta desde a sessão 05, agravada nesta:** nenhuma tela foi conferida nos dois temas — nem as novas (filtro por coluna, exportação CSV) nem as antigas. É a regra 4 do `CLAUDE.md` e continua descumprida.

### 4.3 O que os dados desmentiram

Vale ler antes de confiar em qualquer suposição antiga:

- **A base não está parada.** 74% dos negócios estão em Proposta Enviada (1.168) e Aguardando Contrato (642). Cold Lead tem 360. Só 306 seguem abertos
- **76% das atividades não têm negócio** — daí a D-108
- **A coluna Origem não tem fonte** no Pipedrive (só `ManuallyCreated`/`Import`)
- **Produtos: zero registros** no Pipedrive
- **A carga não gera evento**, porque o gatilho é `after update`
- **P-021: parcial** — só 675 dos 2.458 têm mudança de etapa registrada

### 4.4 Validações que ainda dependem do maestro

| Item | Onde |
|---|---|
| Doc 08, Doc 10, Doc 11 — em rascunho | aguardam leitura |
| Curadoria dos 107 motivos de perda | painel do Supabase; 12 estão ativos |
| ~~P-032~~ — provedor Email | ✅ **encerrada 17/08** |
| Repositório público (D-114) | risco assumido |

### 4.5 Recorte do MVP

**Entra:** Negócios (Kanban ✅, Lista, detalhe em três zonas, Linha do Tempo) · Atividades · Contatos · Produtos · trava de desfecho ✅ · quatro automações · log de eventos ✅ · exportação CSV · dois temas · Google OAuth ✅ · migração ✅ · celular em consulta.

**Saiu em 17/08:** o **seletor de cliente Bubble** (D-110) — vai para fase final.

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
| 00 | Status e Retomada | v2.0 | vivo | — |
| 01 | Plano de Execução | v0.3 | validado — **consultoria encerrada na Fase 6** | — |
| 02 | Roteiro de Entrevistas | v1.1 | **concluído** — revisões entram como nota | — |
| 03 | Log de Decisões | v0.13 | vivo | — |
| 04 | Visão de Produto | v0.1 | rascunho | criado 13/08 |
| 05 | Requisitos Funcionais | v0.1 | rascunho — 153 requisitos | criado 13/08 |
| 06 | Modelo de Domínio | v0.5 | ✅ **validado** | — |
| 07 | UX — Fluxos e Arquitetura de Informação | — | **único não criado** | Material acumulado nos Docs 05, 08 e 11. Escrever se as telas exigirem detalhamento maior |
| 08 | UI e Design System | v0.1 | rascunho — **aguarda validação** | criado 13/08 |
| 09 | Arquitetura Técnica | v0.4 | rascunho — **schema no ar**; **seção 3.11 com as correções C-01 a C-05** | atualizado 17/08 |
| 10 | Plano de Fases de Construção | v0.2 | rascunho — 11 fases | atualizado 14/08 |
| 11 | Backlog e Critérios de Aceite | v0.2 | rascunho — 126 itens | atualizado 14/08 |
| 12 | CLAUDE.md | v0.5 | rascunho — **na raiz do repositório** | atualizado 17/08, sessão 06 |
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
| ~~P-020~~ | ~~Extrair a base do Pipedrive~~ | — | ✅ **encerrada 17/08.** 13 entidades em `dados/pipedrive/` |
| ~~P-021~~ | ~~Reconstituir trajetória pelos changelogs~~ | — | ✅ **encerrada 17/08 — resposta parcial:** só 675 dos 2.458 têm mudança de etapa. 10.923 mudanças salvas |
| P-022 | Habilitar a Data API do Bubble e obter token | fase final | **Saiu do caminho crítico** por D-110 |
| P-023 | Mapear os eixos admissíveis de cada um dos treze indicadores | Doc 05/07 | A-09 — trabalho de Fase 2 |
| ~~P-024~~ | ~~Obter os vetores do logotipo, símbolo "+" e monograma~~ | — | ✅ **encerrada 18/08.** O maestro subiu o handoff de marca (BR/BAUEN). Símbolo, favicon e assinatura implementados; referência em `docs/marca/` |
| P-027 | Modelar a entidade Notificação no schema | Doc 09 | A-07 — pendente desde o Bloco 4 |
| ~~P-028~~ | ~~Regra de conversão de status~~ | — | ✅ **aplicada na carga de 17/08**, conforme a proposta da seção 5.1 |
| ~~P-026~~ | ~~URL de retorno OAuth~~ | — | ✅ **encerrada 17/08.** Login por Google funcionando em produção |
| ~~P-031~~ | ~~Publicar na Vercel~~ | — | ✅ **encerrada 17/08.** `crm-lure.vercel.app`. ⚠️ Plano **Hobby**, cujo uso comercial contraria os termos da Vercel — decisão pendente |
| ~~P-032~~ | ~~Desabilitar o provedor Email~~ | — | ✅ **encerrada 17/08.** `email: false` verificado na base |
| *(era)* | *Provedor Email* | segurança | Hoje ativo com cadastro aberto. Como a chave anônima é pública, qualquer pessoa cria conta por e-mail e senha. Não vê dado nenhum — a RLS barra quem não é do domínio, verificado — mas polui `auth.users` e contraria D-050 |

| P-033 | Curar os 107 motivos de perda | qualidade | 12 ativos, 95 inativos. Edição pelo painel do Supabase |
| ~~P-034~~ | ~~Conferir as telas nos dois temas~~ | — | ✅ **encerrada 17/08** pelo maestro |
| P-035 | Plano Hobby da Vercel para uso comercial | risco | Contraria os termos de uso |

Pendências encerradas: P-001 (stack), P-002 (migração), P-003 (identidade), P-004, P-007, P-008, **P-009 e P-013 (escopo — Bloco 12)**, P-010, P-011, P-012, P-015, P-017, P-019, **P-025 (Tailwind — v4, bloco `spacing` removido)**, **P-029 (domínio `lureconsultoria.com.br` confirmado pelo maestro em 14/08)**, **P-030 (projeto Supabase criado e schema aplicado em 14/08)**.

---

## 9. RISCOS ATIVOS DO PROJETO

| Risco | Observação |
|---|---|
| ⚠️ **Prazo × escopo** | 20 dias entre 14/08 e 3/9. **F0 está quase fechada** — falta o que depende do maestro. O que resta é substancial: Kanban com arrastar-e-soltar, Lista de dez colunas com filtro em todas, detalhe em três zonas, atividades com calendário, quatro automações, celular em consulta e a migração completa. **Risco assumido pelo maestro** |
| ~~Carga direto em produção~~ | ✅ **resolvido em 17/08.** Rodou, conferida pelas dez verificações do Doc 14 §8. O modo `--ensaio` permitiu ensaiar na base real sem gravar — a transação devolveu o ensaio que a D-106 tirou |
| ~~Janela de extração~~ | ✅ **resolvido em 17/08.** Base e changelogs salvos antes de 3/9 |
| ⚠️ **Repositório público** | D-114: o Doc 03 inteiro, o custo do Pipedrive, o ticket médio, o raciocínio comercial e as fotos de quatro funcionários estão legíveis por qualquer pessoa. Nenhuma credencial vazou — verificado no histórico do git. **Risco assumido pelo maestro** |
| ⚠️ **Prazo de construção** | Os dados estão salvos e carregados — esse risco morreu. Falta F4 (detalhe do negócio), F6 (atividades), F7, F8, F9 e a virada. É risco de escopo, não mais de perda irreversível |
| *(histórico)* **Carga direto em produção** | D-101 eliminou o ambiente de nuvem intermediário. A carga dos 2.453 negócios roda uma única vez, na base que os sócios vão usar. Se falhar no meio, o conserto é em produção. Mitigações que restam: ensaio no banco local (D-102), ordem de carga do Doc 14, marcação `origem_carga` e backup verificado antes de começar. **Nenhuma delas substitui um ambiente separado. Risco assumido pelo maestro** |
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
| 05 | 14/08/2026 | **A base de produção entrou no ar.** Projeto do Supabase criado (`qyitrhflinkfcylobsfp`, us-east-1) e as três migrações mais a semente aplicadas — **P-029 e P-030 encerradas**. Conexão verificada de ponta a ponta: 20 tabelas, tipos do código batendo com o banco, leitura e escrita anônimas negadas. **F3 iniciada fora de ordem** (D-105): moldura do sistema e Lista de negócios com as dez colunas de D-104, paginação no servidor, ordenação em todas, busca e filtros. **C-04 encontrada** — o PostgREST não aceita coluna de tabela vinculada dentro de um `or`, o que quebrava a busca; corrigida em dois passos. D-103 (região), D-106 (ambiente único, **revoga D-102**). P-032 criada. **`CLAUDE.md` corrigido** (Doc 12 v0.3): saiu a instrução de ensaiar a carga no banco local, revogada por D-106, e a referência a um `tailwind.config.ts` inexistente. Tudo publicado no GitHub. | **F0 bloqueada no Google OAuth (P-026) e na Vercel (P-031).** Nada da F3 foi conferido em tela — é a primeira coisa a fazer quando o login funcionar || 06 | 17/08/2026 | **A base real entrou no sistema, e o CRM virou sistema de trabalho.** F0 fechada (Google OAuth e Vercel, depois de uma longa caçada a variáveis de ambiente cadastradas na área compartilhada da conta em vez do projeto). **F1 e F2 concluídas:** 2.458 negócios, 2.889 organizações, 4.589 pessoas, 6.483 atividades e 922 anotações carregados numa transação única, com ensaio por rollback. **Oito decisões (D-107 a D-114)**, três delas revogando regras tomadas antes de existir extração. Kanban com arrastar-e-soltar e **trava de desfecho** funcionando; filtro por responsável com foto. **F4 concluída** no fim da sessão: detalhe em três zonas, linha do tempo e trava valendo nos três caminhos. Passada de animação com guarda de acessibilidade. **P-032 e P-034 encerradas.** Encontrado e corrigido um defeito que a própria D-109 desta sessão criou (C-05). | F3 incompleta; **log de eventos ainda com zero linhas**; acesso a clientes pelo celular pedido e não construído |
| 07 | 18/08/2026 | **F3 fechada.** Filtro por coluna nas dez colunas (B-042) substituindo a barra de filtros única, indicador de coluna filtrada (B-044), persistência da combinação de filtro/ordenação por usuário via nova coluna `usuario.preferencia_lista_negocios` (B-045, migração aplicada em produção), exportação CSV do conjunto filtrado inteiro por rota dedicada (B-047), lista virtualizada com `@tanstack/react-virtual`. Corrigidos dois defeitos apontados pelo maestro: o link "voltar" do detalhe do negócio agora respeita se a origem foi a Lista ou o Kanban, e o seletor de responsável — que renderizava atrás de outros elementos — foi reescrito sobre `Popover` do Radix (Portal), eliminando a causa (conflito de `z-index` com o cabeçalho fixo da tabela) em vez de só ajustar um número. Verificado por `tsc`, `eslint` e `next build` contra o banco de produção; **nenhuma tela foi aberta no navegador** — o Google OAuth impede login automatizado pelo agente. | **Verificação visual pendente nos dois temas**, inclusive das telas novas desta sessão; log de eventos não checado nesta sessão; acesso a clientes pelo celular continua sem construir |
| 08 | 18/08/2026 | **F6 — Atividades.** Tela própria em dois modos: lista **um dia por vez (abre em Hoje, padrão do Pipedrive)** com navegação entre dias e vencidas fixas no topo, e calendário mensal, alternáveis. Criação em diálogo com tipo, título, data, horas, responsável, descrição e vínculo opcional a negócio/organização/pessoa (D-108) via busca única das três entidades; conclusão otimista pela lista; registro retroativo (data no passado, "já concluída"); filtros por situação, tipo e responsável; exportação CSV (B-085). O recorte "abre em Hoje" foi um ajuste pedido pelo maestro depois da primeira versão, que mostrava todas as pendentes de uma vez. Sem migração — o schema de 17/08 já tinha `organizacao_id`/`pessoa_id` e o gatilho que encadeia a organização. Verificado por `tsc`, `eslint` e `next build`. | **Verificação visual pendente** (Google OAuth barra o agente); F7 (contatos e produtos) é a próxima; acesso a clientes pelo celular continua sem construir |

---

## Changelog

- **v2.0** — 18/08/2026 — **F7 concluída (Contatos e Produtos), mais uma rodada de UI/UX.** Contatos com as duas abas, CRUD completo, fichas com histórico derivado, e o **agrupamento de duplicatas** (1.195 dos 2.889 cadastros são repetição) com os títulos dos negócios como referência para distinguir cadastros de mesmo nome. Produtos com nome e área, com criação de área embutida no seletor por a base ter nascido vazia. **Corrigido um crash na aba Pessoas** — handler de evento em Server Component passado a Client Component; o app inteiro foi auditado. Fluidez: **avisos de ação** (nenhuma ação confirmava nada até aqui), **busca instantânea** com atalho `/`, **foco preso e devolvido nos diálogos**, esqueletos legíveis no tema escuro, **barra de progresso de navegação** e filtros que esmaecem enquanto respondem. **Navegação no celular voltou** — a sidebar sumia e não havia como trocar de seção.
- **v1.9** — 18/08/2026 — **Identidade visual da marca implementada (P-024 encerrada).** O maestro subiu o handoff BR/BAUEN. O símbolo "+" em cinco blocos (miolo amarelo) virou componente React (`components/dominio/marca.tsx`), com os braços em `currentColor` para servir os dois temas sem variantes. O placeholder "L" da sidebar deu lugar à assinatura **LURE + chip CRM**; a tela de login ganhou o split-screen da marca (painel escuro com tagline "Organize potencial em resultados." + acesso Google); favicon e apple-icon vieram dos vetores do handoff. A pasta de referência foi movida de `components/ui/` para **`docs/marca/`**. Navegação segue na sidebar (decisão do maestro — nada foi para a top bar). **Dois ajustes após revisão do maestro:** no login em tema escuro os dois painéis ficavam ambos pretos e se fundiam — o painel de acesso passou a `bg-surface` (mais claro que o painel de marca) com borda divisória; e o **rodapé da marca** (footer.html do handoff) entrou no sistema, faixa escura fixa no pé com o símbolo, "Ferramenta interna · Lure Consultoria" e copyright, sem os links do protótipo que ainda não têm página.
- **v1.8** — 18/08/2026 — **Sessão 08: F6 construída.** Tela de Atividades em dois modos — lista **um dia por vez, abrindo em Hoje** (padrão do Pipedrive, ajustado a pedido do maestro), com vencidas fixas no topo, e calendário mensal. Criação com campos completos e vínculo opcional a negócio, organização ou pessoa (D-108), conclusão otimista, registro retroativo, filtros por situação/tipo/responsável e exportação CSV (B-085). **Sem migração** — o schema já sustentava os três vínculos desde a carga. ⚠️ Sem verificação visual (Google OAuth barra o agente); o calendário ficou em visão mensal, anotado em 4.2.
- **v1.7** — 18/08/2026 — **Fim da sessão 07. F3 fechada**: filtro nas dez colunas (B-042), indicador de filtro ativo (B-044), persistência por usuário via `usuario.preferencia_lista_negocios` (B-045, nova migração), exportação CSV (B-047) e lista virtualizada. Corrigidos o link "voltar" do detalhe (respeita a origem, Lista ou Kanban) e o seletor de responsável, reescrito sobre `Popover` do Radix para tirar de vez o bug de sobreposição. ⚠️ **Sem verificação visual** — o agente não consegue logar via Google OAuth sozinho; falta abrir as telas novas (e as antigas) nos dois temas.
- **v1.6** — 17/08/2026 — **Fim da sessão 06.** **F4 concluída**: detalhe do negócio em três zonas, linha do tempo com o seletor da D-058, anotações, e a trava de desfecho valendo nos três caminhos. **P-032 e P-034 encerradas** — o provedor Email foi desligado e as telas foram conferidas nos dois temas, dívida aberta desde a sessão 05. D-115 a D-118 e a correção **C-05**, um defeito que a própria D-109 desta sessão criou e que impedia um usuário real de trabalhar. ⚠️ O log de eventos continua com zero linhas: ele passa a gravar na primeira edição feita no detalhe.
- **v1.5** — 17/08/2026 — Domínio de produção passa a ser **`crm.lureconsultoria.com`**, com o aviso de que trocar de domínio exige atualizar o *Site URL* e os *Redirect URLs* no Supabase — foi o que fez um login cair em `localhost`. **O prazo dos dados acabou:** base e changelogs salvos e carregados, restando só prazo de construção. Kanban vira seção própria do menu lateral, em `/kanban`, com filtro por responsável.
- **v1.4** — 17/08/2026 — **Sessão 06: F0, F1 e F2 concluídas.** O volume real substitui as estimativas — 2.458 negócios e 2.889 organizações, não 2.453 e 422. Seção 4 reescrita em torno do que está de pé, com **4.3 nova** listando o que os dados desmentiram: a base não está parada, 76% das atividades não têm negócio, a coluna Origem não tem fonte e a carga não contamina o log. **P-020, P-021, P-026, P-028 e P-031 encerradas**; P-033, P-034 e P-035 criadas. Dois riscos saíram (carga sem ensaio e janela de extração) e dois entraram (repositório público, plano Hobby). **118 decisões.**
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
