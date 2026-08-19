# 11 — Backlog e Critérios de Aceite (v0.3)

| Campo | Valor |
|---|---|
| **Documento** | Backlog e Critérios de Aceite |
| **Projeto** | CRM próprio (substituição do Pipedrive) |
| **Versão** | v0.3 |
| **Data** | 14/08/2026 |
| **Status** | rascunho — aguarda validação do maestro |

> Cada item tem critério **verificável**. "Funciona" não é critério; "arrastar o cartão da etapa 2 para a 3 grava um evento com valor anterior e novo" é.
> Fases definidas no Doc 10. Requisitos no Doc 05.

---

## Critérios que valem para **todo** item

Nenhuma tarefa é considerada pronta sem isto:

| # | Critério transversal |
|---|---|
| T1 | Verificado nos **dois temas**, claro e escuro (D-091) |
| T2 | Verificado em **desktop e em largura de celular** — no mobile, ao menos sem quebra de layout |
| T3 | Nenhuma consulta carrega a base inteira; listas paginam no servidor (R-006) |
| T4 | Textos, datas e valores em português do Brasil, dd/mm/aaaa, R$ 0.000,00 (D-087) |
| T5 | Nenhum segredo em variável `NEXT_PUBLIC_` |
| T6 | Alteração de estrutura de banco entra como migração versionada, nunca pelo painel. Com base única (D-101), o repositório é a única descrição confiável do schema |
| T7 | Nomes de tabela e coluna em português, `snake_case` (D-099) |

---

## F0 — Fundação

| # | Item | Critério de aceite |
|---|---|---|
| B-001 | Projeto Next.js com Tailwind e shadcn/ui | Página inicial renderiza com a fonte Archivo e os tokens da Lure aplicados |
| B-002 | Corrigir o `tailwind.config.ts` | Bloco `spacing` removido; um componente do shadcn renderiza com espaçamento correto; versão do Tailwind confirmada e registrada |
| B-003 | Alternador de tema | Botão alterna claro/escuro; a escolha persiste ao recarregar |
| B-004 | Projeto único no Supabase (D-101) | O projeto de produção existe, dentro da organização Pro já assinada; limitador de gastos **ligado**; banco local sobe com `npx supabase start` |
| B-005 | Migração inicial do schema | `supabase db reset` recria o schema inteiro do zero, sem intervenção manual |
| B-006 | Tipo `status_negocio` | Tentar gravar um quinto valor de status resulta em erro do banco |
| B-007 | ⚠️ **Gatilho do log** | Alterar etapa, valor, responsável ou status de um negócio insere linha em `evento_negocio` com tipo, valor anterior, valor novo, autor e data |
| B-008 | ⚠️ **Imutabilidade do log** | `update` e `delete` em `evento_negocio` por usuário autenticado retornam erro de permissão |
| B-009 | Marcação de carga | Com `app.carga_migracao = true`, os eventos gerados nascem com `origem_carga = true` |
| B-010 | Política de acesso por domínio | Conta de fora do domínio autentica no Google mas não lê nenhuma linha |
| B-011 | Criação automática de usuário | Primeiro login de conta do domínio cria linha em `usuario`, ativa, com papel `completo` |
| B-012 | Deploy na Vercel | `git push` publica; o login por Google funciona no endereço publicado e em `localhost` |

## F1 — Extração do Pipedrive ⚠️ *prioridade máxima*

| # | Item | Critério de aceite |
|---|---|---|
| B-020 | Script de extração autenticado | Token lido de variável de ambiente; **nunca** aparece em código ou log |
| B-021 | Paginação completa | Cada entidade é percorrida até o fim; nenhum registro perdido no último lote |
| B-022 | Respeito ao limite de uso | Pausa entre chamadas; `429` tratado com espera e nova tentativa |
| B-023 | Persistência bruta | Um arquivo JSON por entidade, gravado **antes** de qualquer transformação |
| B-024 | Conferência | Contagens do JSON batem com as do Pipedrive: 2.453 negócios, 422 organizações, atividades, pessoas, anotações, produtos, funis, etapas, usuários |
| B-025 | Investigação dos changelogs (P-021) | Relatório curto respondendo: dá para reconstituir a trajetória de etapa e valor dos negócios? |

## F2 — Carga de ensaio, no banco local

| # | Item | Critério de aceite |
|---|---|---|
| B-030 | Mapeamento campo a campo | Documentado no Doc 14; todo campo do modelo tem origem declarada ou é declarado como sem origem |
| B-031 | Conversão de fuso | Uma atividade que no Pipedrive é 14h em Brasília aparece como 14h no sistema novo |
| B-032 | Conversão de status | Regra do Doc 14 aplicada; nenhum negócio fica sem status |
| B-033 | Motivos de perda | Textos livres do Pipedrive viram itens da lista `motivo_perda`, sem duplicatas por diferença de caixa |
| B-034 | Carga sem contaminar o log | Após a carga, todos os eventos têm `origem_carga = true`; nenhum evento de usuário existe |
| B-035 | Conferência pós-carga | Contagens no banco batem com o JSON; dez negócios conferidos manualmente contra a tela do Pipedrive |

## F3 — Lista de negócios

| # | Item | Critério de aceite |
|---|---|---|
| B-040 | Dez colunas fixas | As dez colunas definidas aparecem; não há como personalizá-las |
| B-041 | Paginação no servidor | Com 2.453 negócios, a primeira pintura da tela não excede ~1s e o navegador não recebe a base inteira |
| B-042 | Filtro em toda coluna | Cada cabeçalho filtra; filtros combinam entre si |
| B-043 | Ordenação em toda coluna | Cada cabeçalho ordena, ascendente e descendente |
| B-044 | Indicador de filtro ativo | Coluna filtrada é visualmente distinta de coluna sem filtro |
| B-045 | Persistência por usuário | Filtros e ordenação voltam iguais após recarregar e após novo login |
| B-046 | Linha de 44px | Altura conferida; ~15 linhas visíveis em monitor comum |
| B-047 | Exportação CSV | Arquivo sai com **ponto-e-vírgula**, UTF-8 **com BOM**, contendo o conjunto filtrado inteiro; abre no Excel em português sem quebrar acento |

## F4 — Detalhe do negócio e trava de desfecho

| # | Item | Critério de aceite |
|---|---|---|
| B-050 | Tela em três zonas | Layout conforme Doc 07/08 |
| B-051 | Edição de campos | Alterar valor, etapa, responsável ou status grava e **gera evento no log** |
| B-052 | Aba Linha do Tempo | Seletor de três posições filtra corretamente registro de usuário, de sistema e tudo |
| B-053 | Anotações | Criar, editar e excluir anotação vinculada ao negócio |
| B-054 | ⚠️ **Trava de desfecho** | Mover para Aguardando Contrato **não conclui** sem escolher Ganho ou Perdido. Fechar o diálogo cancela a transição |
| B-055 | ⚠️ **Motivo obrigatório** | Perdido sem motivo é recusado pela aplicação **e** pelo banco |
| B-056 | Botões Ganho e Perdido | Movem o negócio para Aguardando Contrato e aplicam o status em uma ação |
| B-057 | Seletor de cliente Bubble | O diálogo de Ganho lista clientes do Bubble e grava o identificador na organização |
| B-058 | ⚠️ **Tolerância a falha do Bubble** | Com a API do Bubble fora do ar, o Ganho **conclui normalmente**, com aviso; o vínculo pode ser feito depois pela ficha |
| B-059 | Segredo protegido | O token do Bubble não aparece em nenhuma requisição visível no navegador |
| B-060 | Follow-up ao ganhar | Ganho cria atividade de follow-up com prazo padrão de 90 dias; é possível desativar |

## F5 — Kanban

| # | Item | Critério de aceite |
|---|---|---|
| B-070 | Seis colunas | Uma por etapa, na ordem do funil |
| B-071 | Cartão com quatro campos | Título, organização, valor, status. Nada além |
| B-072 | Arrastar-e-soltar | Mover cartão entre colunas altera a etapa e **gera evento no log** |
| B-073 | Trava no arrastar | Arrastar para Aguardando Contrato abre o diálogo obrigatório; cancelar devolve o cartão à origem |
| B-074 | Carregamento por partes | Cold Lead com milhares de cartões carrega em blocos conforme a rolagem, sem travar |
| B-075 | Status Parado | Visualmente apagado, sem aparência de erro ou alerta |
| B-076 | Etapa nunca só por cor | O nome da etapa aparece escrito no cartão ou no cabeçalho da coluna |

## F6 — Atividades

| # | Item | Critério de aceite |
|---|---|---|
| B-080 | Tela própria com dois modos | Lista e calendário, alternáveis |
| B-081 | Atividade exige negócio | Não há caminho na interface para criar atividade sem negócio |
| B-082 | Campos completos | Tipo, título, data, hora início/fim, responsável, descrição, concluída |
| B-083 | Conclusão | Marcar como concluída persiste e reflete na lista e no calendário |
| B-084 | Registro retroativo | É possível criar atividade com data no passado |
| B-085 | Exportação CSV | Mesmo padrão de B-047 |

## F7 — Contatos e Produtos

| # | Item | Critério de aceite |
|---|---|---|
| B-090 | Organização | Nome, cidade, website e identificador Bubble editáveis |
| B-091 | Pessoa em várias organizações | O mesmo contato aparece em duas organizações **com cargos diferentes** |
| B-092 | Formas de contato | Lista simples; telefone abre WhatsApp por `wa.me`; e-mail abre mailto |
| B-093 | Histórico derivado | Ficha da organização mostra negócios, atividades e anotações vindos dos negócios |
| B-094 | Exclusão de pessoa | Excluir pessoa remove vínculos e formas de contato, sem deixar órfãos |
| B-095 | Restrição na exclusão | Tentar excluir organização com negócios é recusado pelo banco |
| B-096 | Produtos | Cadastro com nome e área; área vem da lista configurável |

## F8 — Automações e notificações

| # | Item | Critério de aceite |
|---|---|---|
| B-100 | Central de notificações | Alertas aparecem no aplicativo; podem ser marcados como lidos |
| B-101 | Negócio parado | Alerta dispara conforme regra definida |
| B-102 | Atividade vencida | Alerta dispara no dia seguinte ao vencimento |
| B-103 | Lembrete de próxima atividade | Alerta dispara antes da atividade |
| B-104 | ⚠️ **Nenhum e-mail** | Não existe biblioteca de envio de e-mail no projeto, nem credencial SMTP |
| B-105 | Parado suspende automações | Negócio com status Parado não gera nenhum dos alertas acima |

## F9 — Mobile (consulta e marcação)

| # | Item | Critério de aceite |
|---|---|---|
| B-110 | Lista em cartões | Em largura de celular, a Lista vira cartões legíveis, sem rolagem horizontal |
| B-111 | Busca e filtro | Acessíveis em painel próprio, com o dedo |
| B-112 | Kanban por etapa | Uma etapa por vez, com seletor; sem arrastar |
| B-113 | Ficha do negócio | Zonas empilhadas; atividades, anotações e linha do tempo legíveis |
| B-114 | Marcar concluída | Atividade pode ser concluída pelo celular |
| B-115 | Escrita fora de escopo | Não há formulário de criação nem edição no celular — é lacuna consciente (D-097) |

## Negócio — criação e ciclo completo (D-126)

⚠️ **Itens criados em 19/08/2026, depois da C-08.** Esta seção não existia: o backlog cobria Lista, detalhe e Kanban e **nunca disse "criar negócio"**, embora a D-017 e o RF-024 já pressupusessem a criação. A omissão só apareceu quando `scripts/verifica-virada.mjs` inventariou o que o sistema sabe escrever.

| # | Item | Critério de aceite |
|---|---|---|
| B-127 | **Criar negócio** | Botão "Novo negócio" na Lista e no Kanban; título e organização obrigatórios, o resto opcional. O negócio aparece na Lista e na coluna certa do Kanban sem recarregar a página à mão |
| B-128 | ⚠️ **Trava de desfecho na criação** | Escolher "Aguardando Contrato" no formulário obriga a declarar Ganho ou Perdido, e Perdido obriga o motivo. A *server action* recusa a criação sem desfecho mesmo que o formulário seja contornado |
| B-129 | **Status vem da etapa** | Negócio criado em Cold Lead nasce `parado`; a tela não oferece escolha de status na criação (D-045) |
| B-130 | **Excluir negócio** | Confirmação nomeia o que se perde — atividades, anotações, vínculos e **o histórico da linha do tempo**. Organização e pessoas continuam existindo |
| B-131 | **Título e organização editáveis** | O título edita no próprio cabeçalho; a organização troca pela zona lateral, com busca |
| B-132 | **Pessoas do negócio** | Vincular e desvincular contatos já cadastrados. Desvincular não apaga a pessoa; o cargo continua sendo do vínculo com a organização (D-036) |
| B-133 | **Organização nova pelo diálogo** | Informando só o nome, sem sair do formulário de negócio (D-127 — 🟡 aguarda validação) |

---

## F10 — Virada

| # | Item | Critério de aceite |
|---|---|---|
| B-120 | ⚠️ **Ensaio da migração** | A carga roda **no banco local** do zero ao fim, com contagens batendo, ao menos duas vezes seguidas. Com D-101 este é o único ensaio que existe: a próxima execução é na base real |
| B-121 | Carga em produção | Contagens conferidas: 2.453 negócios, 422 organizações, e as demais entidades. Backup do Supabase verificado **antes** de começar |
| B-122 | Log gravando | Primeiro negócio alterado em produção gera evento com `origem_carga = false` |
| B-123 | ⭐ **Ensaio de operação** | Os dois sócios trabalham um dia inteiro sem abrir o Pipedrive. *(A data "antes de 3/9" saiu com a D-125 — o ensaio continua sendo pré-requisito do desligamento.)* |
| B-124 | Login do domínio | Todas as contas da equipe entram |
| B-125 | Celular utilizável | Um sócio consulta um negócio pelo celular, fora do escritório |
| B-126 | Sete critérios de D-098 | Todos verificados e registrados. ✅ **Automatizado** em `scripts/verifica-virada.mjs`, somente leitura, reexecutável a qualquer momento — os critérios 2 e 6 aparecem marcados como humanos, porque script nenhum os verifica |

---

## Itens fora do MVP

Não construir. Registrados para não serem esquecidos na fase 2: telas de estatísticas e painel de indicadores (RF-100 a RF-104) · metas · construtor de relatórios · mesclagem · transferência entre usuários · telas de configuração · criação e edição pelo celular · Google Agenda · API pública e webhooks.

---

## Changelog

- **v0.3** — 19/08/2026 — **Seção "Negócio — criação e ciclo completo" criada (B-127 a B-133)**, depois da C-08: o backlog cobria Lista, detalhe e Kanban e nunca dizia "criar negócio", embora a D-017 e o RF-024 já o pressupusessem. B-123 perde a data de 3/9 (D-125) e B-126 passa a apontar o verificador automático. **133 itens.**
- **v0.2** — 14/08/2026 — **D-101 incorporada.** B-004 passa a pedir um projeto único; B-012 deixa de falar em duas URLs de retorno; a F2 vira "carga de ensaio, no banco local"; B-120 ganha o aviso de que é o único ensaio existente e B-121 passa a exigir backup verificado antes da carga. T6 reescrito.
- **v0.1** — 13/08/2026 — Criação a partir do Doc 10. 126 itens com critério verificável, agrupados por fase, mais sete critérios transversais.
