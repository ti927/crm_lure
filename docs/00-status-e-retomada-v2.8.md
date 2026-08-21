# 00 — Status e Retomada (v2.8)

| Campo | Valor |
|---|---|
| **Documento** | Status e Retomada da Consultoria |
| **Projeto** | CRM próprio (substituição do Pipedrive) |
| **Versão** | v2.8 |
| **Última atualização** | 21/08/2026 — Sessão 12 |
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
| `00-status-e-retomada-v2.8.md` |
| `01-plano-de-execucao-v0.3.md` |
| `02-roteiro-de-entrevistas-v1.1.md` |
| `03-log-de-decisoes-v0.19.md` |
| `06-modelo-de-dominio-v0.5.md` |
| `04-visao-de-produto-v0.1.md` |
| `05-requisitos-funcionais-v0.1.md` |
| `08-ui-e-design-system-v0.1.md` |
| `09-arquitetura-tecnica-v0.7.md` |
| `10-plano-de-fases-de-construcao-v0.2.md` |
| `11-backlog-e-criterios-de-aceite-v0.3.md` |
| `12-claude-md-v0.12.md` *(vai para a raiz do repositório como `CLAUDE.md`)* |
| `13-glossario-v0.1.md` |
| `14-migracao-do-pipedrive-v0.2.md` |
| `15-plano-central-de-notificacoes-v0.3.md` |
| `14-referencia-api-pipedrive-v0.1.md` *(rascunho técnico de apoio — não é o Doc 14 oficial)* |
| `lure-crm-tokens.css` e `tailwind.config.ts` *(insumos do Doc 08 — versão anterior à revisão da seção 3; os tokens em uso estão em `app/tokens.css`)* |

> Ao subir uma versão nova, **renomeie o arquivo com `git mv`** — a versão faz parte do nome, e o `git mv` preserva o histórico daquele documento. Nunca deixe as duas versões lado a lado: o git guarda o passado, o nome do arquivo guarda o presente.

> Ao renomear, conferir se a tabela acima, o `README.md` e as referências cruzadas entre documentos ainda apontam para arquivos que existem.

---

## 2. O PROJETO EM UMA PÁGINA

**Quem.** Empresa de **consultoria empresarial**. Clientes 99% PJ, mercado 100% privado. Hoje apenas os **sócios** usam o CRM; há plano de profissionalizar com SDR, BDR, closer e coordenação, chegando a ~10 usuários.

**Por quê.** Substituir o Pipedrive **exclusivamente por custo**: R$ 3.500/ano para 4 usuários, e 10 usuários quase dobrariam esse valor. **Não há dores funcionais.**

**✅ Prazo — revogado em 19/08 (D-125).** A virada era datada em 3/9 porque a API do Pipedrive fecharia junto com o contrato. **A extração e a carga aconteceram em 17/08 e estão conferidas**: a base inteira está no Supabase e não depende mais do Pipedrive. D-069 e R-008 estão revogadas; o desligamento acontece quando o sistema estiver pronto. *(Histórico: a virada seca sem operação em paralelo foi decidida em 13/08 e o risco de prazo, assumido pelo maestro.)*

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

**Fase:** **F10, a virada — em andamento.** **F0 a F9 concluídas** — a F8 saiu de "adiada" (D-124) e foi construída em 20/08. Falta o dia de operação real dos sócios.
**Perguntas respondidas:** 80 · 12 blocos · **145 decisões** · 153 requisitos · 126 itens de backlog

✅ **Não há mais contagem regressiva** (D-125, 19/08/2026). Os dados estão no Supabase desde 17/08, conferidos — a virada é decidida por prontidão, não por data.

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
| **F9 — Mobile** | ✅ **construída 18/08.** Lista de negócios em cartões (B-110), filtros em gaveta própria (B-111), Kanban uma etapa por vez com seletor e **sem arrastar** (B-112), ficha empilhada (B-113), marcar concluída (B-114). Navegação lateral vira gaveta no celular |
| **F8 — Automações** | ✅ **construída 20/08.** Sino no cabeçalho com contador, lista agrupada e marcar como lida; painel `/notificacoes` com os quatro blocos; follow-up ao ganhar nos quatro caminhos de Ganho. Alertas **derivados na leitura**, sem agendador — a entidade Notificação não virou tabela. Uma migração, duas tabelas, duas funções. Doc 15 v0.3 |
| **Financeiro** | ✅ **construído 19/08** (D-131). Aba própria em `/estatisticas/financeiro`, no padrão do Insights do Pipedrive: receita realizada com comparativo de período, ticket médio, pipeline em aberto, valor perdido, evolução mês a mês, receita por vendedor/origem/cliente/área, dez maiores contratos e CSV. **Ancorado em `fechado_em`**, não em `criado_em`. Gráficos com neon e animação (D-132) |
| **Estatísticas** | ✅ **construída e refeita 19/08.** Duas abas em `/estatisticas` — **Comercial** (por data de entrada) e **Financeiro** (por data de fechamento). Recorte com período pronto, ano, etapa, status, faixa de valor, motivo, responsável, origem, produto e área. Gráficos validados por medição (D-133), brilho opcional só no escuro (D-135), gêmeo em tabela em todo painel e CSV. **Indicadores que só o volume sustenta** (D-134): ciclo de venda × taxa de ganho, ticket típico com mediana, perdas em valor |
| *(detalhe)* | ✅ **construída 19/08** (D-130, revoga a D-093). Os treze indicadores da D-063 em `/estatisticas`, calculados por sete funções versionadas no banco, com os recortes da D-064, interruptor de parados (D-067) e exportação CSV (D-066). **3.406 eventos históricos do Pipedrive carregados no log** (D-129) — sem eles os indicadores 7, 8 e 9 nasceriam cegos |
| **F10 — Virada** | 🔵 **iniciada 19/08.** Os sete critérios da D-098 passaram a ser medidos por script contra a base real: **cinco técnicos verdadeiros**, um bloqueado por três negócios legados (ver 4.2) e dois — operação real e celular — dependendo de gente. A verificação encontrou a **C-08** |
| **F7 — Contatos e Produtos** | ✅ **construída 18/08.** Contatos com abas Organizações/Pessoas, CRUD completo, fichas com histórico derivado (B-090 a B-095) e **agrupamento de cadastros duplicados**; Produtos com nome e área (B-096) |
| **F6 — Atividades** | ✅ **construída 18/08.** Três abas: **Lista** (um dia por vez, abrindo em Hoje, padrão do Pipedrive, com navegação ‹ › entre dias), **Vencidas** (a pilha de atrasadas, cada uma com a data em que venceu e há quantos dias, número na aba) e **Calendário** mensal; criação com vínculo opcional a negócio/organização/pessoa (D-108); conclusão; registro retroativo; filtros por situação/tipo/responsável; exportação CSV. **Sem migração** — o schema já sustentava os três vínculos |

**Scripts que passam a existir:**

| Arquivo | O que faz |
|---|---|
| `scripts/extrai-pipedrive.mjs` | Extrai as 13 entidades, JSON bruto por entidade |
| `scripts/extrai-changelog.mjs` | Histórico campo a campo dos 2.458 negócios. Retoma de onde parou |
| `scripts/carga-migracao.mjs` | A carga. **`--ensaio` roda tudo e desfaz** — use sempre antes |
| `scripts/recupera-acentos.mjs` | Repara acentos perdidos na extração. Ensaia por padrão; `--aplicar` grava |
| `scripts/carga-changelog.mjs` | **Carrega o histórico do Pipedrive no log** (D-129). Ensaia por padrão; `--aplicar` grava. Recusa rodar duas vezes |
| `scripts/carga-fechamento.mjs` | **Preenche `negocio.fechado_em`** com `won_time`/`lost_time` da extração (D-131). Ensaia por padrão |
| `scripts/verifica-virada.mjs` | **Mede os sete critérios da D-098 contra a base real.** Somente leitura — pode rodar com os sócios usando. Sai com código 1 se houver falha técnica. Reexecutar na véspera do desligamento |

⚠️ **A carga é reversível enquanto ninguém estiver usando o sistema**: `evento_negocio` tem `on delete cascade` no negócio. Deixa de ser no instante em que os sócios começarem a trabalhar, porque aí evento real e evento de carga se misturam.

### 4.2 Próxima ação

⭐ **O que falta é o critério 2: os dois sócios operarem um dia inteiro sem abrir o Pipedrive.** Com a C-08 corrigida, não há mais impedimento técnico conhecido para isso — antes havia, e ninguém sabia.

**Estado dos sete critérios em 19/08** (medidos por `scripts/verifica-virada.mjs`, não por leitura de documento):

| # | Critério | Situação |
|---|---|---|
| 1 | Migração completa | ✅ contagens batendo, ganhos ao centavo, vínculos migrados |
| 2 | ⭐ Um dia sem o Pipedrive | ⏳ **depende de ser marcado com os sócios** |
| 3 | Log gravando | ✅ 9 eventos reais, gatilho ativo, `update`/`delete` revogados |
| 4 | ~~Trava de desfecho~~ → **perdido sempre tem motivo** | ⛔ **o critério mudou em 20/08 (D-145, revoga a D-047).** Nenhuma etapa exige desfecho, então não há trava a medir. O que resta é regra de dado: `perdido_exige_motivo` no banco. ✅ `scripts/verifica-virada.mjs` foi realinhado em 21/08: mede a restrição, os perdidos sem motivo e a dispersão das perdas por etapa |
| 5 | Lista e Kanban | ✅ nenhuma consulta acima de 160 ms |
| 6 | Celular | ⏳ depende de uso no aparelho |
| 7 | Login por Google | ✅ **5 dos 6 usuários já entraram** (medido em 21/08); RLS em todas as tabelas. Falta a Patrícia |

⚠️ *(histórico — a D-145 dissolveu a questão)* **Três negócios em Aguardando Contrato sem desfecho declarado** — *Plano de Carreira*, *Melhoria de Processos 2* e *Vaga Ger Planejamento*. **A trava não está furada:** os três têm `atualizado_em` no instante exato da carga e zero eventos, ou seja, vieram assim do Pipedrive, que não tinha essa trava. São negócios genuinamente em aberto parados na etapa final, e o sistema novo nunca deixaria esse estado nascer. **P-039**: decidir se são declarados (Ganho/Perdido) ou devolvidos a Proposta Enviada.

⚠️ **A C-08 foi encontrada nesta sessão e é a razão de a F10 não ter começado antes:** o negócio era a única entidade do sistema sem caminho de criação. Ver 4.6.

✅ **A F8 está desbloqueada desde 20/08.** O **Doc 15 subiu a v0.2 e está validado**: as três definições que faltavam foram respondidas (**D-139**, **D-140**, **D-141**), mais uma quarta que a medição levantou (**D-142**). **P-014, P-027 e P-036 encerradas.** Não há definição pendente para o passo 1.

**Duas frentes independentes, portanto:**

| Frente | Situação |
|---|---|
| ⭐ **Critério 2 — um dia sem o Pipedrive** | ⏳ depende de ser marcado com os sócios. Nenhum impedimento técnico conhecido |
| 🔴 **Push no celular** | ⛔ **bloqueado numa variável.** Falta `SUPABASE_SERVICE_ROLE_KEY` na Vercel — ver 4.9 |
| ⚠️ **Conferência nos dois temas** | nada do que entrou em 20/08 foi visto por olho humano |
| **F8 — central de notificações** | ✅ **construída em 20/08.** Falta ver nos dois temas |

⚠️ **A medição de 20/08 confirmou o motor da F8 e inverteu a preocupação.** O Doc 15 v0.1 punha um teto de ~200 ms na consulta derivada; o real é **1,65 ms de execução** — os 151 ms observados de fora eram latência de rede do pooler. O risco não é custo de consulta, é **número de idas ao banco**: a ~150 ms por viagem, os quatro alertas têm de sair de uma função só.

### 4.9 O que a sessão 11 deixou pronto, e o que ficou preso

✅ **A F8 inteira, mais o push.** Sino, painel `/notificacoes`, marcar como lida, follow-up ao ganhar (D-139 a D-143), e depois o push no celular (D-144): service worker, tela de aceitar, rota de envio e agendamento por `pg_cron`.

🔴 **O push está preso numa variável, e só o maestro destrava.** A rota responde `{"faltando":["SUPABASE_SERVICE_ROLE_KEY"]}` em produção.

⚠️ **Essa chave é usada por UM arquivo do sistema e por mais nenhum** — `app/api/enviar-push/route.ts`. Todo o resto do CRM funciona com a chave anônima + RLS (D-050), e é por isso que ela nunca precisou existir na Vercel antes. **A pergunta em aberto: ela aparece na aba *Project* ou na aba *Shared* da Vercel?** Se for Shared sem estar vinculada, é a armadilha da sessão 06 outra vez.

⚠️ **O `pg_cron` está ATIVO** (`lure-push`, `5 * * * *`) e vai bater na rota de hora em hora até a variável entrar, recebendo 500 e sem gravar nada. Foi aplicado sem querer: `supabase db push` leva **todas** as migrações pendentes.

✅ **Dados atualizados parcialmente.** A API do Pipedrive **continua viva** — o contrato não fechou. Nova extração feita, snapshot de 17/08 preservado em `dados/pipedrive-snapshot-17-08/`. Dos 216 registros que divergiram em três dias, **os 66 novos entraram** por `scripts/sincroniza-novos.mjs` (idempotente, ensaia por padrão).

⚠️ **Os 144 alterados e as 6 atividades apagadas no Pipedrive continuam fora**, por decisão do maestro. **Não há como alcançá-los:** o schema não guarda o id do Pipedrive, então não há como dizer que "aquela linha de lá" é "esta daqui". A divergência cresce a cada dia até a virada.

⛔ **A D-145 revogou a D-047 — a única trava do sistema.** Nenhuma etapa exige desfecho. O Kanban passou a mostrar só os **307 abertos**; ganho e perdido somem do funil e ficam na Lista. E declarar desfecho **não move mais a etapa**, porque fazer isso destruía a informação de onde o negócio morreu.

⚠️ **A lição que se repetiu TRÊS vezes nesta sessão: quando algo "não existe" neste sistema, a primeira hipótese é que existe e está invisível.**

| O pedido | O que se descobriu |
|---|---|
| "criar atividade dentro do negócio" | já existia desde a D-137, aba ao lado de Anotação |
| "filtro de motivo de perda na Lista" | coluna e filtro existiam, mas com `esconde: "xl"` — só acima de 1280px |
| "filtrar por usuário nas Estatísticas" | existia e funcionava, atrás de um botão chamado **Recorte** |

Em nenhum dos três o problema era ausência: era **descoberta**. O terceiro virou correção de vocabulário — a tela passou a dizer *Filtros*, enquanto o documento continua dizendo recorte (D-064).

✅ **Passada de interface**, toda vinda de defeito estrutural e não de descuido:

- **Nenhum botão do sistema tinha `cursor: pointer`** — o Preflight do Tailwind v4 deixou de pô-lo em `<button>`, e o projeto nasceu no v4. Uma linha faltando no `globals.css` aparecia como "falta feedback em vários lugares".
- O botão primário amarelo **não tinha hover em nenhum dos 16 lugares**; os tokens `--accent-hover`/`--accent-active` existiam sem uso desde o início.
- `--surface-hover` era `#f5f5f5` sobre branco: **3% de diferença**, invisível na prática.
- **A corrente de altura estava solta desde a F3**: `min-h-svh` no layout fazia o `h-full` de todas as telas de lista não resolver contra nada. Era isso que empurrava a barra de rolagem horizontal para fora da tela. Virou `h-svh`, e **nenhuma tela precisou mudar** — elas já estavam escritas para um pai com altura definida que nunca existiu.

✅ **Atalho na tela de início (PWA)**, com `start_url` em `/contatos` — pedido do maestro. ⚠️ No iPhone o push **só funciona depois** de o app estar na tela de início, então o convite não é acessório: é pré-requisito.

✅ **Busca na tela de Atividades**, sem acento ("reuniao" achava 5 e "reunião" achava 300), cobrindo negócio, organização, pessoa e tipo. Mora numa função no banco por causa da C-04.

---

### 4.10 O que a medição de 21/08 mostrou

`scripts/verifica-virada.mjs` rodou em 21/08 contra a base real: **21 verificações passaram, 1 aviso, 0 falhas.** O aviso é bom notícia disfarçada.

⭐ **Os sócios já estão trabalhando no sistema.** A base cresceu além do que o Pipedrive tinha, e o crescimento não veio de carga nenhuma:

| | Pipedrive (17/08) | Base (21/08) |
|---|---|---|
| Negócios | 2.458 | **2.461** |
| Organizações | 2.889 | **2.897** |
| Pessoas | 4.589 | **4.604** |
| Atividades | 6.483 | **6.524** |
| Anotações | 922 | **929** |
| Produtos | 0 | **7** |

⚠️ **Produtos saíram de zero.** O `CLAUDE.md` diz que "a base nasce vazia aqui e o cadastro passa a ser feito neste sistema" — passou a ser. Receita por produto e por área deixam de nascer vazias nas Estatísticas.

✅ **5 dos 6 usuários já entraram pelo Google** (era 4 em 19/08). Falta apenas a Patrícia.

⚠️ **O log não recebeu evento novo desde 18/08 16:41** — 3.415 eventos, nenhum de carga. Não é defeito: criar não gera evento (o gatilho é `after update`), e os cadastros novos são criações. Significa que ninguém moveu etapa, valor, responsável ou status pelo sistema ainda. **O critério 2 não aconteceu.**

✅ **A D-145 está de pé no dado.** As perdas seguem espalhadas pelas seis etapas — Cold Lead 147, Proposta Enviada 786, Aguardando Contrato 21 —, ou seja, a etapa preserva onde o negócio morreu. O verificador passou a medir isso: se as perdas se concentrarem numa etapa só, alguém religou o empurrão que a D-145 tirou.

✅ **Os 3 negócios em Aguardando Contrato sem desfecho deixaram de ser exceção.** Sob a D-047 eram violação tolerada (D-128); sob a D-145 são o estado legítimo que motivou a revogação. O verificador os reporta como informação, não como falha.

⚠️ **Desempenho no teto do confortável:** nenhuma consulta passa de **164 ms**, mas nenhuma desce de 158 ms — é o piso da rede do pooler, não o custo da consulta. Mesmo padrão que a F8 encontrou (1,65 ms de execução, 151 ms de viagem).

### 4.8 O que a sessão 10 quebrou, e o que isso ensina

⚠️ **A rota `/estatisticas` foi ao ar quebrada duas vezes**, e as duas na mesma fronteira servidor→cliente (C-09 e C-10, Doc 09 §3.11). Uma por passar um formatador como propriedade a um componente de cliente; outra por reexportar uma referência de cliente através de um `const`.

O que torna isso registro e não desabafo: **o aviso já estava escrito no `CLAUDE.md`** desde a sessão 09, e mesmo assim aconteceu. Aviso não protege — o que protege é **rodar a página**.

**O método que funciona**, já que o Google OAuth impede o agente de logar:

1. desligar `PUBLICAS` em `proxy.ts` **localmente**;
2. `npm run build && npm run start`;
3. pedir a rota por `curl` e ler a pilha real no log do servidor;
4. **restaurar o `proxy.ts`**.

⚠️ **`tsc`, `eslint` e `next build` passam felizes** por erro de serialização — ele é de tempo de execução.
⚠️ **Limite:** sem sessão a RLS devolve vazio, então isso exercita o caminho de **dado vazio**. Pega erro de serialização, que independe do dado; não pega defeito que só aparece com dado real.

### 4.7 Estatísticas — o que o histórico revelou

O módulo entrou em 19/08 (D-130). O que os indicadores dizem sobre a operação, medido na base real:

- **Funil:** Cold Lead → Hot Lead converte **7,6%**; Apresentação Realizada → Proposta Enviada, **62,2%**. O gargalo está na entrada, não no fechamento.
- **Lead time:** Cold Lead segura um negócio **40,5 dias**; Hot Lead, **75,7**; Apresentação Realizada passa em **9,6**.
- **Taxa de ganho:** **47,9%** sobre 2.152 desfechos.
- **Valor inicial × fechado:** dos 292 negócios com valor revisado, a soma **caiu 30,8%** entre a primeira e a última revisão.
- **Perdas:** "Lead não respondeu mais" lidera com 282 negócios e R$ 9,8 mi.

**O financeiro, medido na base real:** receita total **R$ 27.015.293,04** em 1.031 contratos · ticket médio **R$ 26.203** · pipeline em aberto **R$ 4,85 mi** em 164 negócios · valor perdido R$ 35,1 mi. Por vendedor, o contraste que salta: Patrícia fechou 575 contratos com ticket de R$ 11.448; Daniela, 20 contratos com ticket de R$ 77.879.

⚠️ **A receita por ano só está certa por causa da D-131.** Pelo eixo antigo, 2021 teria 137 ganhos; pela data real de fechamento, tem **477**. A soma dos seis anos fecha em R$ 27.015.293,04, batendo ao centavo com o total conferido em 17/08.

⚠️ **Produtos seguem em zero**, então receita por produto e por área nasce vazia — os cortes existem e se preenchem sozinhos conforme vocês cadastrarem.

⚠️ **Nada disso existiria sem a D-129.** O log tinha 9 eventos; o passado estava num arquivo de 3,5 MB fora do banco, e a API que o gerou fecha com o contrato.

### 4.6 A correção que a verificação da F10 revelou (C-08)

O inventário de escrita do sistema mostrou que organização, pessoa, produto, atividade e anotação tinham CRUD completo — e o **negócio**, a entidade que dá nome ao CRM, só tinha edição de campos, movimento de etapa e desfecho. **Não havia `insert` na tabela `negocio` em lugar nenhum.**

Não era defeito de código: é escopo que nunca entrou no backlog. Os itens B-040 a B-076 cobrem Lista, detalhe e Kanban, e nenhum dizia "criar negócio" — embora a D-017 ("negócio pode ser criado em qualquer etapa") e o RF-024 ("mover **ou criar** negócio em Aguardando Contrato") já o pressupusessem. Passou despercebido porque F3, F4 e F5 foram construídas sobre 2.458 negócios já migrados: nunca houve o momento em que alguém precisou de um novo.

O efeito era direto sobre o critério 2 — todo contato novo vira um negócio em Cold Lead, e não havia onde registrá-lo.

**Construído em 19/08 (D-126, B-127 a B-133):**

- **Criar negócio**, com botão na Lista e no Kanban. Título e organização obrigatórios (D-023); status vem de `etapa.status_inicial` (D-045), não da tela.
- **A trava de desfecho vale na criação** (D-047/RF-024): escolher Aguardando Contrato revela Ganho/Perdido no próprio formulário, e a *server action* recusa sem desfecho.
- **Excluir negócio**, com confirmação que nomeia a cascata — atividades, anotações, vínculos e **o histórico da linha do tempo**.
- **Título editável** no cabeçalho e **organização trocável** na zona lateral (útil entre os 668 grupos de nome repetido da D-121).
- **Vincular e desvincular pessoas** do negócio — `negocio_pessoa` era só lida.
- **Organização criada de dentro do diálogo** só com o nome (**D-127, 🟡 aguarda validação**).

⚠️ **Verificado em transação com `rollback` contra a base real**, sem gravar nada: o insert funciona, o status nasce da etapa, **criar não gera evento** (o gatilho é `after update` e `tipo_evento` só tem etapa/valor/responsável/status — o log registra trajetória, não nascimento), a primeira mudança de etapa depois disso **gera** evento com `origem_carga = false`, e excluir leva o log junto por cascata. Mais `tsc`, `eslint`, `next build` e a varredura de C-06 (nenhum manipulador de evento em Server Component).

⚠️ **Sem verificação visual pelo agente**, como sempre — o Google OAuth barra o login automatizado.

### 4.2.1 Notas da sessão 07 (histórico)

⚠️ **F3 fechou na sessão 07, mas sem verificação visual.** O login por Google impede o agente de abrir o navegador sozinho — tudo foi conferido por `tsc`, `eslint` e `next build` reais contra o banco de produção, mais leitura cuidadosa do código, mas ninguém *viu* a tela. Antes de considerar B-042/044/045/047 realmente prontos, abrir `/negocios` nos dois temas e conferir: filtro em cada cabeçalho de coluna, o funil de indicador quando um filtro está ativo, se a combinação volta igual depois de deslogar e logar de novo, o CSV abrindo certo no Excel em português, e a rolagem da lista virtualizada.

Também corrigidos nesta sessão: o link "voltar" do detalhe do negócio agora leva à Lista ou ao Kanban conforme a origem do clique (antes sempre voltava para `/negocios`), e o seletor de responsável — que aparecia atrás do cabeçalho fixo da tabela — foi reescrito sobre `Popover` do Radix (portal, já era dependência do projeto), o que tira o bug de vez em vez de só ajustar um número de `z-index`.

✅ **O log de eventos começou a gravar** — 9 eventos em 18/08, verificados na base. Era o item que o `CLAUDE.md` marca como não recuperável, e ele nasceu limpo (a carga não gerou evento).

⚠️ *(histórico)* **O log de eventos ainda não tinha uma única linha,** até onde a sessão 06 apurou. A carga não dispara o gatilho, que é `after update`. Ele passa a gravar na primeira edição feita no detalhe do negócio — vale conferir que gravou, porque é o item que o `CLAUDE.md` marca como não recuperável. Não verificado nesta sessão.

✅ **Pedido do maestro em 17/08 — atendido na sessão 09:** **acesso rápido a clientes pelo celular.** A Lista de contatos entrega cartões no celular (`app/(sistema)/contatos/cartoes-contato.tsx`), com busca, ampliando a D-097 que tinha deixado Contatos de fora do recorte mobile. *(Este parágrafo dizia "ainda não construído" até 19/08 — era erro de registro, não de código.)*

**Depois:** **F10 (virada)** e a **F8**, que deixou de depender de definição em 20/08 — ver 4.2.

✅ **A F8 foi adiada em 18/08 e destravada em 20/08.** As três definições que faltavam foram respondidas pelo maestro:

| O que faltava | Resposta |
| **Quantos dias sem movimento tornam um negócio "parado"** | **Escolha do usuário**, em degraus de 30/45/60/90, padrão **60** (D-139) |
| **Antecedência do lembrete de próxima atividade** | **Escolha do usuário**, em degraus de 1/2/3/7, padrão **1** (D-140) |
| **O desenho do painel de configuração** | Doc 15 §5.2 — quatro blocos, um por tipo, interruptor e degraus |

O motor continua o que a D-124 escolheu: alertas **derivados na leitura**, sem agendador nem tabela de fila — agora com medição que o sustenta (Doc 15 §2.1).

⚠️ **P-014 e P-027 foram respondidas por negativa deliberada:** a entidade Notificação **não vira tabela**. O que se grava é preferência e leitura; a notificação é derivada a cada abertura. Foi essa inversão que permitiu dispensar o agendador.

⚠️ **Duas descobertas da medição que quem for construir precisa saber.** (a) A curva do alerta de parado é **quase plana** — 30 dias acendem 79 negócios e 90 dias acendem 52, dos 164 abertos —, porque os negócios abertos desta base já estão parados há muito tempo; o limite regula o dia 30 em diante, não o dia 1. (b) A distribuição **não é parelha**: no padrão de 60 dias, 49 dos 63 alertas são de um único responsável.

⚠️ **As duas tabelas novas serão as primeiras do sistema com RLS por usuário.** Todas as outras usam `pertence_ao_dominio()` (D-050). A política tem de comparar com `public.usuario_atual()` e **nunca com `auth.uid()`** — desde a D-109 os dois são diferentes, e a comparação errada deixaria o sino mudo exatamente para quem veio da carga, sem erro nenhum na tela. É a armadilha da C-05.

⚠️ **Desvio consciente do B-115:** o critério dizia que não haveria formulário de criação nem edição no celular. Os diálogos construídos nas F6 e F7 são responsivos e funcionam no celular — foram mantidos. É a favor do usuário, não contra; mas registro que o sistema hoje **excede** o recorte da D-097 nesse ponto.

⚠️ **Acentos corrompidos, corrigidos em 18/08:** 388 registros (386 pessoas, 2 organizações) chegaram com `U+FFFD` no lugar de letras acentuadas — "Marco Aurélio" virou "Marco Aur�lio". **A carga não teve culpa**: os arquivos brutos da extração já traziam o defeito, só nos campos `name`/`first_name` de `persons.json`, e o mesmo nome aparece íntegro em `deals.json` e `organizations.json` — a corrupção está no dado do próprio Pipedrive. **343 foram recuperados (88%)** por `scripts/recupera-acentos.mjs`, que cruza o nome quebrado com as strings íntegras da própria extração, primeiro inteiro e depois palavra a palavra, aceitando só o que casa com um único candidato. Organizações ficaram 100% limpas. **Restam 45 pessoas** listadas em `acentos-pendentes.tsv` (fora do git — o repositório é público e são nomes reais), para conserto à mão pela ficha, que agora é editável.

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
| 00 | Status e Retomada | v2.7 | vivo | — |
| 01 | Plano de Execução | v0.3 | validado — **consultoria encerrada na Fase 6** | — |
| 02 | Roteiro de Entrevistas | v1.1 | **concluído** — revisões entram como nota | — |
| 03 | Log de Decisões | v0.19 | vivo — **145 decisões** | — |
| 04 | Visão de Produto | v0.1 | rascunho | criado 13/08 |
| 05 | Requisitos Funcionais | v0.1 | rascunho — 153 requisitos | criado 13/08 |
| 06 | Modelo de Domínio | v0.5 | ✅ **validado** | — |
| 07 | UX — Fluxos e Arquitetura de Informação | — | **único não criado** | Material acumulado nos Docs 05, 08 e 11. Escrever se as telas exigirem detalhamento maior |
| 08 | UI e Design System | v0.1 | rascunho — **aguarda validação** | criado 13/08 |
| 09 | Arquitetura Técnica | v0.6 | rascunho — **schema no ar**; **seção 3.11 com as correções C-01 a C-05** | atualizado 17/08 |
| 10 | Plano de Fases de Construção | v0.2 | rascunho — 11 fases | atualizado 14/08 |
| 11 | Backlog e Critérios de Aceite | v0.3 | rascunho — 126 itens | atualizado 14/08 |
| 12 | CLAUDE.md | v0.12 | vivo — **na raiz do repositório** | atualizado 20/08, sessão 11 |
| 13 | Glossário | v0.1 | rascunho | criado 13/08 |
| 14 | Migração do Pipedrive | v0.2 | rascunho — mapeamento completo | atualizado 14/08 |
| 15 | Plano da Central de Notificações | v0.3 | ✅ **construído** — os sete passos de pé | atualizado 20/08 |
| 14* | *Referência da API Pipedrive* | v0.1 | **anexo do Doc 14** | endpoints e limites de uso |

---

## 7. DECISÕES JÁ TOMADAS

Registro completo no documento **03 — Log de Decisões**: **145 decisões (D-001 a D-145)**, 13 extras (E-001 a E-013) e 9 restrições de arquitetura (R-001 a R-009).

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
- **Critério de pronto** com sete itens, incluindo um dia inteiro de operação real dos sócios sem abrir o Pipedrive. ⚠️ O "antes de 3/9" saiu com a D-125 — o critério continua, a data não.
- **Nomes de tabela e coluna em português**; exclusão real com restrição nos vínculos.

---

## 8. PENDÊNCIAS EM ABERTO

| # | Item | Bloqueia | Situação |
|---|---|---|---|
| P-005 | Inventário funcional do que a equipe usa no Pipedrive | Doc 05 | Amplamente coberto pelos prints; revisar na Fase 2 |
| P-006 | Estimar custo de manutenção contínua | Doc 09/10 | **Infraestrutura encerrada** (D-083 + D-101): planos Pro já existentes e **um projeto só**, sem os ~US$ 10/mês do projeto adicional. Sobra o custo do tempo do maestro conduzindo o Claude Code |
| ~~P-014~~ | ~~Modelar a entidade Notificação~~ | — | ✅ **encerrada 20/08 por negativa deliberada** (Doc 15 §3): a entidade não vira tabela. Grava-se preferência e leitura; a notificação é derivada |
| P-016 | Revisitar cartão do Kanban: responsável e indicador de atividade | Doc 07 | Revisar no Bloco 11 |
| P-018 | Definir papéis e permissões granulares | Fase 2 | Adiado por decisão do maestro (D-049) |
| ~~P-020~~ | ~~Extrair a base do Pipedrive~~ | — | ✅ **encerrada 17/08.** 13 entidades em `dados/pipedrive/` |
| ~~P-021~~ | ~~Reconstituir trajetória pelos changelogs~~ | — | ✅ **encerrada 17/08 — resposta parcial:** só 675 dos 2.458 têm mudança de etapa. 10.923 mudanças salvas |
| P-022 | Habilitar a Data API do Bubble e obter token | fase final | **Saiu do caminho crítico** por D-110 |
| P-023 | Mapear os eixos admissíveis de cada um dos treze indicadores | Doc 05/07 | A-09 — trabalho de Fase 2 |
| ~~P-024~~ | ~~Obter os vetores do logotipo, símbolo "+" e monograma~~ | — | ✅ **encerrada 18/08.** O maestro subiu o handoff de marca (BR/BAUEN). Símbolo, favicon e assinatura implementados; referência em `docs/marca/` |
| ~~P-027~~ | ~~Modelar a entidade Notificação no schema~~ | — | ✅ **encerrada 20/08.** Duas tabelas — `preferencia_notificacao` e `notificacao_lida` —, nenhuma delas guardando a notificação em si. SQL completo no Doc 15 §3 |
| ~~P-036~~ | ~~Prazo do alerta de "negócio parado" e antecedência do lembrete~~ | — | ✅ **encerrada 20/08 por D-139 e D-140.** Os dois viraram **escolha do usuário em degraus** — 30/45/60/90 com padrão 60, e 1/2/3/7 com padrão 1 — em vez de constante do sistema. Era a pendência que bloqueava a F8 |
| P-046 | 🔴 **`SUPABASE_SERVICE_ROLE_KEY` na Vercel: aba Project ou Shared?** | push | **Criada 20/08.** É a única coisa entre o push e funcionar. Se estiver em Shared sem vínculo, é a armadilha da sessão 06 |
| P-047 | **A aba "Agendar atividade" da ficha deve virar formulário embutido**, como no Pipedrive, ou o diálogo atual serve? | UX | **Criada 20/08.** Existe e funciona; a dúvida é de forma |
| P-048 | **Como alcançar os 144 registros alterados no Pipedrive?** | dados | **Criada 20/08.** Exige `pipedrive_id` no schema. A divergência cresce a cada dia |
| P-042 | **O prazo do follow-up ao ganhar (90 dias) deve ser editável no painel?** | F8 | **Criada 20/08.** A D-021 só diz "desativável". Não bloqueia: o `check` do schema já aceita 1 a 365, e é acrescentar o campo à tela |
| P-037 | **Curar os 45 nomes com acento perdido** | qualidade | **Criada 18/08.** Listados em `acentos-pendentes.tsv`, fora do git porque o repositório é público. Conserto pela ficha, que agora é editável (C-07) |
| ~~P-039~~ | ~~Os 3 negócios legados em Aguardando Contrato~~ | — | ✅ **encerrada 19/08 por D-128**: ficam como estão. O verificador passou a separar legado de violação por regra — quem entrou na etapa pelo sistema tem evento de `etapa` no log; quem não tem, veio da carga |
| P-040 | **Validar a D-127** — organização criada de dentro do diálogo de negócio | escopo | **Criada 19/08.** Mesma natureza da P-038. Sem isso, registrar um lead novo exige ir a Contatos e voltar; com isso, cria-se organização fora da tela de Contatos |
| P-038 | **Validar a criação de área embutida no cadastro de produto** | escopo | **Criada 18/08.** A base nasceu com zero áreas e as listas configuráveis não têm tela no MVP — sem isso o campo nunca poderia ser preenchido. Se o maestro preferir, volta a ser só painel do Supabase |
| ~~P-028~~ | ~~Regra de conversão de status~~ | — | ✅ **aplicada na carga de 17/08**, conforme a proposta da seção 5.1 |
| ~~P-026~~ | ~~URL de retorno OAuth~~ | — | ✅ **encerrada 17/08.** Login por Google funcionando em produção |
| ~~P-031~~ | ~~Publicar na Vercel~~ | — | ✅ **encerrada 17/08.** `crm-lure.vercel.app`. ⚠️ Plano **Hobby**, cujo uso comercial contraria os termos da Vercel — decisão pendente |
| ~~P-032~~ | ~~Desabilitar o provedor Email~~ | — | ✅ **encerrada 17/08.** `email: false` verificado na base |
| *(era)* | *Provedor Email* | segurança | Hoje ativo com cadastro aberto. Como a chave anônima é pública, qualquer pessoa cria conta por e-mail e senha. Não vê dado nenhum — a RLS barra quem não é do domínio, verificado — mas polui `auth.users` e contraria D-050 |

| P-033 | Curar os 107 motivos de perda | qualidade | 12 ativos, 95 inativos. Edição pelo painel do Supabase |
| ~~P-034~~ | ~~Conferir as telas nos dois temas~~ | — | ✅ **encerrada 19/08** pelo maestro, agora incluindo as telas das sessões 07 a 09: "as telas para ambos os temas estão esteticamente agradáveis e ótimas". Era a dívida mais antiga do projeto — a regra 4 do `CLAUDE.md` estava em aberto desde a sessão 05 |
| P-035 | Plano Hobby da Vercel para uso comercial | risco | Contraria os termos de uso |

Pendências encerradas: P-001 (stack), P-002 (migração), P-003 (identidade), P-004, P-007, P-008, **P-009 e P-013 (escopo — Bloco 12)**, P-010, P-011, P-012, P-015, P-017, P-019, **P-025 (Tailwind — v4, bloco `spacing` removido)**, **P-029 (domínio `lureconsultoria.com.br` confirmado pelo maestro em 14/08)**, **P-030 (projeto Supabase criado e schema aplicado em 14/08)**.

---

## 9. RISCOS ATIVOS DO PROJETO

| Risco | Observação |
|---|---|
| ~~⚠️ **Prazo × escopo**~~ | ✅ **morto em 19/08 (D-125).** O risco era ter escopo demais para a data de 3/9. Com a data revogada, ele deixa de existir: o que faltar entra depois. *(Histórico: em 14/08 eram 20 dias para construir Kanban, Lista, detalhe, atividades, automações, celular e a migração — e o maestro assumiu o risco.)* |
| ~~Carga direto em produção~~ | ✅ **resolvido em 17/08.** Rodou, conferida pelas dez verificações do Doc 14 §8. O modo `--ensaio` permitiu ensaiar na base real sem gravar — a transação devolveu o ensaio que a D-106 tirou |
| ~~Janela de extração~~ | ✅ **resolvido em 17/08.** Base e changelogs salvos antes de 3/9 |
| ⚠️ **Repositório público** | D-114: o Doc 03 inteiro, o custo do Pipedrive, o ticket médio, o raciocínio comercial e as fotos de quatro funcionários estão legíveis por qualquer pessoa. Nenhuma credencial vazou — verificado no histórico do git. **Risco assumido pelo maestro** |
| ⚠️ **Prazo de construção** | Os dados estão salvos e carregados — esse risco morreu. Falta F4 (detalhe do negócio), F6 (atividades), F7, F8, F9 e a virada. É risco de escopo, não mais de perda irreversível |
| *(histórico)* **Carga direto em produção** | D-101 eliminou o ambiente de nuvem intermediário. A carga dos 2.453 negócios roda uma única vez, na base que os sócios vão usar. Se falhar no meio, o conserto é em produção. Mitigações que restam: ensaio no banco local (D-102), ordem de carga do Doc 14, marcação `origem_carga` e backup verificado antes de começar. **Nenhuma delas substitui um ambiente separado. Risco assumido pelo maestro** |
| ⚠️ **Sem ensaio da carga** | **Novo em 14/08.** D-106 revoga a D-102: não haverá ambiente de ensaio. A carga dos 2.453 negócios roda **uma única vez, direto na base definitiva**. Mitigações que restam: ordem de carga do Doc 14, marcação `origem_carga` e backup verificado antes de começar. **Risco assumido pelo maestro** |
| *(histórico)* **Janela de extração** | Depois de 3/9 o acesso à API do Pipedrive se encerraria junto com o contrato. Se a extração não acontecesse antes, os 2.453 negócios ficariam inacessíveis. **Agravado por D-105**, que adiou a F1 para depois do front-end. ✅ Resolvido em 17/08 — e é o motivo pelo qual o prazo pôde cair (D-125) |
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
| 10 | 19/08/2026 | **O prazo caiu, a F10 começou e as Estatísticas nasceram.** **D-125** revoga a data de 3/9 e com ela a D-069 e a R-008: o prazo existia porque a API do Pipedrive fecharia com o contrato, e a extração de 17/08 desfez essa dependência — a biblioteca inteira foi varrida para não pressionar mais por calendário. **P-034 encerrada**: o maestro conferiu os dois temas, fechando a dívida aberta desde a sessão 05. **F10 iniciada** com `scripts/verifica-virada.mjs`, que mede os sete critérios da D-098 contra a base real em vez de contra o documento — e foi ele que encontrou a **C-08**: **o negócio era a única entidade do sistema sem caminho de criação**, omissão do backlog que tornava o critério 2 impossível. Corrigida com o pacote completo de paridade (**D-126**): criar, excluir, título, organização e pessoas, com a trava de desfecho valendo também na criação. Verificado em transação com `rollback` contra a base real. ⚠️ **Segunda metade da sessão:** o módulo de Estatísticas nasceu (D-130), com o histórico do Pipedrive carregado no log (D-129, 3.406 eventos) e a data de fechamento trazida para o banco (D-131, 2.152 desfechos). O relatório financeiro veio junto. Os gráficos foram refeitos **três vezes** até passarem por medição em vez de gosto (D-133), e ganharam indicadores que só o volume sustenta (D-134). Entraram filtros de paridade com o Pipedrive (D-136), agendar atividade na ficha (D-137) e o WhatsApp sem aba (D-138). **A rota de estatísticas foi ao ar quebrada duas vezes** — ver 4.8. | ⭐ **Falta marcar o dia de operação real dos sócios.** F8 desenhada no Doc 15, aguardando três definições. P-039 a P-042 abertas |
| 09 | 18/08/2026 | **A maratona: F3, F6, F7 e F9 fechadas, marca implantada e dois defeitos de dado resolvidos.** F3 concluída (filtro por coluna, persistência por usuário, CSV, lista virtualizada). **F6** — atividades em lista por dia e calendário, com as vencidas em aba própria depois de duas rodadas de ajuste com o maestro. **Identidade visual** do handoff BR/BAUEN implantada, encerrando a **P-024**: símbolo, assinatura, favicon, login em split-screen e rodapé; a navegação fica na lateral por decisão explícita (**D-120**). **F7** — Contatos com CRUD completo e histórico derivado, mais o **agrupamento de duplicatas** (**D-121**: 1.195 dos 2.889 cadastros são repetição) com os negócios como referência (**D-122**); e Produtos. **F9** — celular com lista em cartões, filtros em gaveta e Kanban uma etapa por vez. **Dois defeitos de dado:** o crash da aba Pessoas (**C-06**) e **388 registros com acento destruído na origem** (**C-07**), dos quais 343 recuperados. Rodada de UI/UX: avisos de ação, busca instantânea, foco nos diálogos, esqueletos, barra de progresso e navegação no celular. **F8 adiada** (**D-124**). | **F10, a virada.** Nada foi conferido em tela pelo agente — o Google OAuth impede login automatizado. 45 nomes seguem com acento perdido, listados fora do git |
| 11 | 20/08/2026 | **A F8 saiu do papel.** As três perguntas que bloqueavam a central de notificações desde 18/08 foram respondidas (**D-139** a **D-141**), mais uma quarta que a medição levantou (**D-142**). O limite de "negócio parado" e a antecedência do lembrete deixaram de ser constante do sistema e viraram **escolha do usuário em degraus** — o que mudou o modelo de dados, não só o número: o `check` da tabela passa a guardar os degraus e o padrão precisa morar no banco. **Medição contra a base real antes de decidir**, e não depois: a curva do alerta de parado é quase plana (79 negócios a 30 dias, 52 a 90), a distribuição é concentrada num só responsável, e há **139 atividades vencidas herdadas** — o sino de uma sócia nasce marcando 96, e o maestro decidiu mostrar (D-142). O teto de desempenho do plano foi verificado por `explain (analyze)`: **1,65 ms**, contra os ~200 ms temidos; os 151 ms observados eram rede. **E a F8 foi construída na mesma sessão**, os sete passos do Doc 15 §6: migração com as duas tabelas e a função de derivação, sino no cabeçalho, marcar como lida, painel `/notificacoes` e follow-up ao ganhar. Tudo verificado contra a base real em transação com `rollback`, sem gravar nada. **Doc 15 a v0.3.** **P-014, P-027, P-036 e P-043 encerradas; P-042 aberta.** | ⭐ **Falta marcar o dia de operação real dos sócios.** E ver o sino e o painel **nos dois temas** — o OAuth impede o agente |
| 12 | 21/08/2026 | **A biblioteca voltou a bater com o repositório, e um campo invisível apareceu.** A sessão 11 terminou sem commitar: o Doc 00 v2.7 inteiro e o `git mv` estavam só na árvore de trabalho, e o `README.md` apontava para um arquivo que já não existia — **link quebrado num repositório público**. Três contradições internas corrigidas, todas herdadas da **D-145**: a seção 4 ainda dizia "F8 adiada", o critério 4 ainda era "trava de desfecho", e o parágrafo dos 3 negócios legados falava da trava como regra viva. ⚠️ **O verificador oficial da virada media uma regra revogada** — `scripts/verifica-virada.mjs` procurava negócios em Aguardando Contrato sem desfecho e chamava aquilo de "A TRAVA FUROU", quando desde a D-145 esse estado é legítimo. Reescrito para medir o que existe: a restrição `perdido_exige_motivo`, os perdidos sem motivo, e a **dispersão das perdas por etapa** — que é como se detecta, pelo dado, se alguém religou o empurrão que a D-145 tirou. O Kanban tinha **código morto** da trava: `pendente` nunca mais era preenchido, então aquele `DialogoDesfecho` não renderizava jamais; saiu junto com a consulta de motivos que ficou sem destinatário. Cinco comentários que descreviam a trava como viva foram reescritos. **C-11**: o campo de **cargo** era um input transparente sem rótulo escrito — existia, gravava, e um usuário real não o achou; ganhou rótulo, borda e fundo afundado nas duas fichas. Verificado por `tsc`, `eslint`, `next build` e pelas cinco rotas por `curl`. | ⭐ **O critério 2 continua sendo o que falta.** O push segue preso na variável da Vercel (P-046) e o `pg_cron` segue batendo de hora em hora |

---

## Changelog

- **v2.8** — 21/08/2026 — **Sessão 12: a biblioteca voltou a bater com o repositório.** A v2.7 nunca chegou a ser commitada — estava inteira na árvore de trabalho, com o `git mv` apenas *staged* e o `README.md` apontando para o nome antigo. Corrigidas três contradições que a **D-145** deixou para trás: a seção 4 dizia "F8 adiada", o critério 4 dizia "trava de desfecho" e o parágrafo dos 3 negócios legados tratava a trava como viva. ⚠️ **O `verifica-virada.mjs` media a trava revogada** e foi reescrito para medir a regra que existe — mais a dispersão das perdas por etapa, que é o sinal, no dado, de que ninguém religou o empurrão. Seção **4.10** nova com a medição de 21/08: **21 verificações, 0 falhas**, e a notícia que o aviso escondia — **os sócios já estão cadastrando no sistema** (2.461 negócios, e produtos saíram de zero para 7), com 5 dos 6 usuários já dentro. **C-11** registrada no Doc 09 (v0.7): o campo de cargo era invisível por não ter borda nem rótulo escrito. **145 decisões** — nenhuma nova.
- **v2.7** — 20/08/2026 — **Fim da sessão 11.** A F8 foi decidida, construída e ganhou push no celular (D-139 a D-144); a **D-145 revogou a D-047**, a única trava do sistema, e o Kanban passou a mostrar só os 307 abertos. Dados sincronizados em parte: os 66 registros novos do Pipedrive entraram, os 144 alterados **não têm como entrar** sem id de procedência no schema (P-048). Seção **4.9** nova, com o que ficou pronto e o que ficou preso — e com a lição que se repetiu três vezes: **quando algo "não existe" aqui, a primeira hipótese é que existe e está invisível**. 🔴 O push está bloqueado numa única variável da Vercel (P-046). **145 decisões.**
- **v2.6** — 20/08/2026 — **Fim da sessão 11: a F8 foi decidida e construída no mesmo dia.** A tabela da seção 4.1 tira a F8 de "adiada" e passa a descrever o que existe — sino, painel e follow-up. As duas frentes da 4.2 viram uma: só o dia de operação real dos sócios continua pendente, mais a conferência nos dois temas. Entra a **D-143** (**143 decisões**), que só apareceu quando o código encostou no problema: a preferência é por usuário e a RLS deixa cada um ler apenas a sua, então ganhar o negócio de outra pessoa precisava de regra. **P-043 encerrada.** Doc 03 a v0.18, Doc 12 e `CLAUDE.md` a v0.11, Doc 15 a v0.3.
- **v2.5** — 20/08/2026 — **Fim da sessão 11. A F8 deixou de depender de decisão.** As três perguntas da seção 7 do Doc 15 foram respondidas (**D-139**, **D-140**, **D-141**) e uma quarta, levantada pela medição, também (**D-142**). A seção 4.2 deixa de dizer que faltam definições e passa a descrever **duas frentes independentes**: o dia de operação real dos sócios, que depende de gente, e a F8, que não depende de mais nada. **P-014 e P-027 encerradas por negativa deliberada** — a entidade Notificação não vira tabela —, **P-036 encerrada** por D-139/D-140, e **P-042 aberta**. Registrado o que a medição contra a base real mostrou antes de a interface existir: a curva do alerta de parado é quase plana, a distribuição é concentrada, há 139 vencidas herdadas, e a consulta derivada custa **1,65 ms** e não os ~200 ms que o plano temia — a restrição verdadeira é número de idas ao banco. Doc 03 a v0.17 (**142 decisões**), Doc 15 a v0.2 (validado).
- **v2.4** — 19/08/2026 — **Fim da sessão 10.** Registra a segunda metade: Estatísticas e Financeiro de pé, com o histórico do Pipedrive no log e a data de fechamento no banco; gráficos refeitos até passarem por medição; filtros de paridade; atividade na ficha do negócio; WhatsApp sem aba. **Seção 4.8 nova** com as duas quebras da rota de estatísticas e o método de verificação que faltava — `tsc` e `next build` não pegam erro de serialização, só rodar a página pega. Doc 15 criado com o plano da central de notificações, encerrando o desenho da F8. Pendências novas: **P-041** (validar `whatsapp://`) e **P-042** (conferir a aba de atividade em tela).
- **v2.3** — 19/08/2026 — **Sessão 10, parte 2: a F10 começou e encontrou o que faltava.** `scripts/verifica-virada.mjs` passa a medir os sete critérios da D-098 contra a base real; cinco técnicos deram verdadeiro. O inventário revelou a **C-08** — **o negócio era a única entidade do sistema sem caminho de criação** —, corrigida pelo pacote completo de paridade (**D-126**, B-127 a B-133): criar com a trava valendo na criação, excluir, título editável, organização trocável e vínculo de pessoas. **D-127** (organização criada de dentro do diálogo) fica 🟡 aguardando validação, junto da **P-040**. **P-039** criada para os 3 negócios legados em Aguardando Contrato. **P-034 encerrada** — o maestro conferiu os dois temas, fechando a dívida mais antiga do projeto.
- **v2.2** — 19/08/2026 — **Sessão 10: o prazo saiu do projeto (D-125).** A data de 3/9 foi revogada a pedido do maestro, e com ela a **D-069** e a **R-008**. A razão é factual: o prazo existia porque a API do Pipedrive fecharia junto com o contrato e os dados ficariam presos lá — a extração e a carga de 17/08 desfizeram essa dependência, e a premissa da data caiu junto. A contagem regressiva saiu da seção 4, o risco "prazo × escopo" foi encerrado na seção 9, e a mesma varredura passou por `CLAUDE.md` (v0.7), `README.md` e os Docs 03 (v0.15), 04, 10, 11, 13 e 14. **Os sete critérios da D-098 continuam inteiros** — o que caiu foi o calendário, não o critério. Corrigido também um erro de registro: a seção 4.2 dava "acesso rápido a clientes pelo celular" como não construído, mas os cartões de contato existem desde a sessão 09.
- **v2.1** — 18/08/2026 — **Fim da sessão 09.** Registro do que fechou: **F3, F6, F7 e F9**, mais a identidade visual da marca (**P-024 encerrada**). **F8 adiada** por decisão do maestro (**D-124**), para voltar com painel de configuração e alertas derivados na leitura. Doc 03 vai a v0.14 com **D-119 a D-124**; Doc 09 vai a v0.5 com a seção **3.12** (as quatro migrações da sessão) e as correções **C-06** e **C-07**. Pendências novas: **P-036** (o prazo do "negócio parado", que nunca foi definido), **P-037** (45 nomes com acento perdido) e **P-038** (validar a criação de área embutida). ⚠️ **Nada foi conferido em tela pelo agente** — o Google OAuth impede login automatizado; toda a verificação foi por `tsc`, `eslint`, `next build` e consulta ao banco real.
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
