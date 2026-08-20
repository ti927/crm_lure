# 15 — Plano da Central de Notificações (v0.3)

| Campo | Valor |
|---|---|
| **Documento** | Plano de Implementação — Central de Notificações |
| **Projeto** | CRM próprio (substituição do Pipedrive) |
| **Versão** | v0.3 |
| **Data** | 20/08/2026 |
| **Status** | ✅ **construído em 20/08 — os sete passos estão de pé** |

> Encerra a dívida da **F8**, adiada em 18/08 pela **D-124**, e as pendências **P-014** e **P-027** (modelar a entidade Notificação), abertas desde o Bloco 4.
> ✅ **As três perguntas que bloqueavam o início foram respondidas em 20/08** (D-139, D-140, D-141), mais uma quarta que a medição levantou (D-142). Não há mais definição pendente para o passo 1.

---

## 1. O que já estava decidido

Isto não nasce do zero. Nove decisões delimitam o terreno — cinco anteriores e quatro tomadas para fechar este plano:

| # | O que diz |
|---|---|
| **D-040** | Quatro automações: follow-up ao ganhar, negócio parado, atividade vencida, lembrete de próxima atividade |
| **D-041** | Alerta é **notificação no aplicativo — sem e-mail**. Reconfirmada em 13/08 depois de considerar SMTP |
| **D-046** | **Status `parado` suspende todas as automações**. Cadastro dormente não gera alerta |
| **D-021** | Negócio ganho gera follow-up com prazo padrão de 90 dias, **desativável** |
| **D-124** | A F8 volta **acompanhada de um painel de configuração**, e os alertas são **derivados na leitura** — sem agendador |
| **D-139** | O limite de "negócio parado" é **escolha do usuário**: degraus de **30 / 45 / 60 / 90** dias, padrão **60** |
| **D-140** | A antecedência do lembrete é **escolha do usuário**: degraus de **1 / 2 / 3 / 7** dias, padrão **1** |
| **D-141** | O número do sino conta **só o que exige ação** — negócio parado e atividade vencida. Lembrete aparece na lista sem contar |
| **D-142** | As atividades vencidas **herdadas do Pipedrive entram no sino** normalmente, sem corte por idade |
| **D-143** | No follow-up ao ganhar, a **tarefa nasce para o responsável pelo negócio** e a **preferência consultada é a de quem declarou** o Ganho |

---

## 2. O motor: derivar na leitura

A D-124 escolheu o motor, e agora há medição para sustentá-lo.

**Não há agendador.** Não existe `pg_cron` nem Vercel Cron na stack, e acrescentar essa peça significaria mais uma coisa que pode falhar em silêncio — um trabalho que não roda não avisa que não rodou.

**O alerta é calculado quando alguém abre o app.** Uma consulta responde "o que está pendente para mim agora", comparando o estado atual contra as regras configuradas.

| | Agendador | Derivar na leitura |
|---|---|---|
| Peça nova na stack | sim | **não** |
| Falha silenciosa | possível | impossível — ou a consulta roda, ou a tela não abre |
| Alerta some quando a causa some | precisa de limpeza | **automático** |
| Notificação fora do app | possível | não |
| Custo por usuário | contínuo | só quando alguém olha |

**O que se perde:** notificação por e-mail ou push fora do app. A D-041 já descartou e-mail, e o celular está em modo consulta — então não se perde nada que o MVP quisesse.

⚠️ **A consequência prática que precisa estar clara:** um alerta só aparece quando alguém abre o sistema. Se ninguém abrir por três dias, os alertas dos três dias estarão lá no quarto — corretos e completos, mas não terão *interrompido* ninguém.

### 2.1 A medição que confirma o motor

O §6 da v0.1 punha um teto: *"se a consulta passar de ~200 ms com a base real, o modelo precisa ser revisto antes de a interface existir"*. **Medido em 20/08 contra a base real, com `explain (analyze, buffers)`:**

| O quê | Medido |
|---|---|
| Execução da consulta no banco | **1,65 ms** |
| Planejamento | 1,31 ms |
| Ida e volta pelo pooler, a partir do `node` | 151 ms |

⚠️ **Os 151 ms são rede, não consulta.** A execução tem folga de **cem vezes** sobre o teto. O plano de derivar na leitura está confirmado por medida, e não por expectativa.

⚠️ **A restrição verdadeira é outra: número de idas ao banco.** Como cada viagem custa ~150 ms de latência, os quatro alertas têm de sair de **uma função só, numa chamada só**. Quatro consultas separadas seriam 600 ms de espera para 6 ms de trabalho. É por isso que a `public.notificacoes()` da seção 4.5 devolve os quatro tipos numa tabela única.

⚠️ **Os índices necessários já existem** — `evento_negocio (negocio_id, ocorrido_em)`, `atividade (negocio_id)` e `atividade (data, concluida)`. O plano de execução usa *index scan* nos três subplanos; **nenhum índice novo é preciso**. Conferido em `pg_indexes`, não suposto.

---

## 3. Modelo de dados

Duas tabelas. **Nenhuma delas guarda a notificação em si** — isso é o ponto.

### 3.1 `preferencia_notificacao` — o que cada um quer ser avisado

```sql
create type tipo_notificacao as enum (
  'negocio_parado', 'atividade_vencida', 'lembrete_atividade', 'follow_up_ganho'
);

create table preferencia_notificacao (
  usuario_id uuid not null references usuario(id) on delete cascade,
  tipo       tipo_notificacao not null,
  ativo      boolean not null default true,
  dias       integer,
  criado_em  timestamptz not null default now(),
  primary key (usuario_id, tipo),

  -- D-139 e D-140 escritas como restricao, e nao como combinado: os
  -- degraus da tela nao podem ser a unica guarda, porque a tabela e
  -- gravavel pela API e o painel do Supabase tambem escreve nela.
  constraint dias_do_tipo check (
    case tipo
      when 'negocio_parado'     then dias is null or dias in (30, 45, 60, 90)
      when 'lembrete_atividade' then dias is null or dias in (1, 2, 3, 7)
      when 'follow_up_ganho'    then dias is null or dias between 1 and 365
      when 'atividade_vencida'  then dias is null
    end
  )
);
```

O campo `dias` significa coisa diferente por tipo, e é justamente o que o usuário controla:

| Tipo | O que `dias` quer dizer | Degraus | Padrão |
|---|---|---|---|
| `negocio_parado` | Sem movimento há N dias vira alerta | 30 · 45 · 60 · 90 | **60** (D-139) |
| `lembrete_atividade` | Avisa N dias antes da atividade | 1 · 2 · 3 · 7 | **1** (D-140) |
| `atividade_vencida` | Ignorado — vencida é vencida | — | — |
| `follow_up_ganho` | Dias após o ganho para criar o follow-up | — | **90** (D-021) |

⚠️ **Linha ausente = padrão do sistema.** Ninguém precisa configurar nada para o sistema funcionar; a tabela só guarda quem quis diferente. Isso evita criar quatro linhas para cada usuário novo e mantém o padrão num lugar só.

⚠️ **`dias` nulo também cai no padrão, e o `check` permite** — refinamento descoberto ao construir, que a v0.2 não previa. Quem **desliga** um alerta grava a linha só para dizer `ativo = false`, e não tem prazo nenhum a escolher: exigir um número ali obrigaria a inventar preferência que a pessoa não expressou.

⚠️ **E esse lugar é o banco, não o React.** O padrão vive numa função `public.padrao_notificacao(tipo)`, lida tanto pela derivação quanto pelo painel. Se morasse no componente da tela, a função de derivação teria o seu próprio — e um dia os dois divergiriam sem ninguém notar, porque nenhum teste compara constante de tela com constante de banco.

### 3.2 `notificacao_lida` — o que já foi visto

```sql
create table notificacao_lida (
  usuario_id uuid not null references usuario(id) on delete cascade,
  chave      text not null,
  lido_em    timestamptz not null default now(),
  primary key (usuario_id, chave)
);
```

⚠️ **Guardar o que foi LIDO, e não o que foi gerado.** É a inversão que faz o modelo funcionar sem agendador: a notificação é derivada toda vez, e esta tabela apenas a esconde. Quando a causa desaparece — a atividade é concluída, o negócio se move —, o alerta some sozinho e a linha de leitura vira lixo inofensivo.

### 3.3 A chave estável

| Tipo | Chave |
|---|---|
| `negocio_parado` | `negocio_parado:<negocio_id>:<marco>` — `marco` é o **dia em que o negócio cruzou o limite** |
| `atividade_vencida` | `atividade_vencida:<atividade_id>:<data>` — `data` é o dia em que venceu |
| `lembrete_atividade` | `lembrete_atividade:<atividade_id>:<data>` |

⚠️ **Sem o marco, marcar como lido silenciaria o alerta para sempre.** Com ele, um negócio que parar de novo depois de se mover gera chave nova, e volta a avisar. Foi o detalhe que decidiu o formato.

⚠️ **A data na chave da atividade faz o mesmo trabalho:** reagendar uma atividade vencida e deixá-la vencer de novo produz chave nova. Marcar como lida silencia *aquele* atraso, não a atividade para sempre.

⚠️ **O marco muda quando o usuário muda a preferência,** porque `marco = ultimo_sinal + dias`. Trocar de 60 para 30 dias reacende alertas que já haviam sido lidos. É o comportamento certo — quem apertou o critério quer ver o que passou a caber nele —, mas precisa estar escrito para não ser confundido com defeito.

### 3.4 Acesso — a armadilha que a C-05 já cobrou uma vez

```sql
alter table preferencia_notificacao enable row level security;
alter table notificacao_lida        enable row level security;

-- Preferencia e leitura sao de cada um. Nao e segredo — e que ninguem
-- tem o que fazer com a caixa de notificacao alheia.
create policy propria_preferencia on preferencia_notificacao
  for all to authenticated
  using      (usuario_id = public.usuario_atual())
  with check (usuario_id = public.usuario_atual());

create policy propria_leitura on notificacao_lida
  for all to authenticated
  using      (usuario_id = public.usuario_atual())
  with check (usuario_id = public.usuario_atual());

revoke all on preferencia_notificacao, notificacao_lida from anon;
grant select, insert, update, delete
  on preferencia_notificacao, notificacao_lida to authenticated;
```

⚠️ **`usuario_id` compara com `public.usuario_atual()`, NUNCA com `auth.uid()`.** Desde a **D-109** a chave primária de `usuario` não é o id da conta de login: quem veio da carga tem `id` próprio e `auth_id` separado. Escrever `usuario_id = auth.uid()` faria a política devolver vazio **exatamente para quem foi migrado** — os sócios —, e o sino ficaria eternamente mudo, sem erro nenhum na tela. É a mesma armadilha da **C-05**, que quebrou o gatilho do log e só apareceu porque um usuário real não conseguia trabalhar.

⚠️ **É a política mais restritiva do sistema**, e de propósito. Todas as outras tabelas usam `pertence_ao_dominio()` (D-050, papel único vê tudo). Estas duas são as primeiras por usuário — coerente com a D-124, que fez a configuração pessoal e não da empresa.

### 3.5 O que NÃO entra

- **Fila de notificações.** Não há o que enfileirar sem agendador.
- **Notificação por usuário gravada.** 2.458 negócios × 6 usuários × 4 tipos seria escrita constante para um dado que se recalcula em 1,65 ms.
- **Histórico de notificações.** O log de eventos já guarda o que aconteceu; notificação é uma *leitura* dele.
- **Preferência por empresa.** A configuração é por usuário (D-124). Não há tela de administrador.

---

## 4. Os quatro alertas

### 4.1 Negócio parado (D-040, D-139)

Negócios **do usuário** cujo último sinal de vida é mais antigo que N dias.

**Último sinal de vida** é o maior entre três datas: a criação do negócio, o último evento **real** do log (`not origem_carga` — o que inclui os 3.406 eventos importados do Pipedrive, que são história verdadeira, D-129) e a última atividade registrada nele.

⚠️ **Status `parado` fica fora** (D-046). São 142 na base — sem essa exclusão o sino nasceria com 142 alertas e ninguém olharia de novo.
⚠️ **Ganho e perdido também ficam fora:** negócio encerrado não fica parado, fica pronto.

**O que isso produz na base real, medido em 20/08** (dos 164 em `negociacao`):

| Limite | 30 d | 45 d | **60 d** | 90 d |
|---|---|---|---|---|
| Negócios alertados | 79 | 68 | **63** | 52 |

⚠️ **A curva é quase plana, e isso é um achado, não um detalhe.** De 7 para 90 dias o número cai só de 87 para 52: os negócios abertos desta base já estão parados há muito tempo. **O limite escolhido quase não muda o dia 1** — ele regula o ritmo do dia 30 em diante, quando o pipeline já for do sistema novo.

⚠️ **A distribuição não é parelha.** No padrão de 60 dias, **49 dos 63 alertas são de um único responsável** (Rafael Saia), contra 7 da Patrícia e 6 do Ronaldo. Quem for testar o sino precisa saber disso antes de concluir que "está exagerado" — está concentrado.

### 4.2 Atividade vencida (D-040, D-142)

Atividades **do usuário** com `data` anterior a hoje e `concluida = false`.

⚠️ **Funciona para atividade solta.** 4.934 das 6.483 atividades não têm negócio (D-108), e entre as pendências vivas dos sócios essa é a maioria. O alerta se pendura na atividade, não no negócio.

**Na base real, hoje: 139 atividades vencidas** — Daniela 96, Patrícia 39, Julio 2, Ronaldo 2. A mais antiga da Patrícia é de **maio de 2022**.

⚠️ **Elas entram todas no sino, por D-142.** O sino da Daniela nasce marcando 96. A justificativa é que a aba **Vencidas** de Atividades já exibe essa mesma pilha: filtrar no sino criaria dois números diferentes para o mesmo fato, e o usuário confiaria no menor. O número cai sozinho conforme forem concluídas ou reagendadas.

### 4.3 Lembrete de próxima atividade (D-040, D-140)

Atividades **do usuário** com `data` entre hoje e hoje + N, ainda não concluídas.

⚠️ **Não conta no número do sino** (D-141) — aparece na lista, agrupado, sem inflar o contador. Compromisso de amanhã não é pendência.

**Na base real:** 4 atividades para hoje, 5 até amanhã (o padrão), 10 em cinco dias, 31 na semana. O degrau de 7 dias multiplica por seis o que aparece.

### 4.4 Follow-up ao ganhar (D-021)

Ao marcar Ganho, cria-se uma atividade de follow-up com prazo padrão de 90 dias. **Desativável**, e por isso mora na mesma tabela de preferência.

⚠️ Este é o único dos quatro que **escreve** — cria uma atividade. Os outros três só leem. Ele é, portanto, o único que precisa de gatilho ou de *server action*.

⚠️ **Onde ele entra, exatamente:** na *server action* do desfecho, junto do `update` que grava `status = 'ganho'`, **na mesma transação**. Não em gatilho de banco: a atividade precisa de `tipo_id` e de título em português, que são decisão de aplicação, e a D-047 já concentra os três caminhos de desfecho numa ação só — é lá que a regra tem um lugar único para morar.

⚠️ **Ele é o único que pode duplicar.** Um negócio marcado Ganho, revertido e marcado Ganho de novo geraria dois follow-ups. A guarda é procurar follow-up pendente do mesmo negócio antes de criar.

⚠️ **`dias` do follow-up não foi decidido como configurável** — a D-021 só diz "desativável". O painel mostra o interruptor e exibe os 90 dias como texto. **P-042** fica aberta: se o maestro quiser o prazo editável, o schema já suporta (o `check` aceita 1 a 365) e é só acrescentar o campo à tela.

⚠️ **Quem é o dono do follow-up (D-143, encerra a P-043).** A pergunta apareceu só ao construir: a preferência é por usuário e a RLS deixa cada um ler apenas a sua, então declarar Ganho num negócio **de outra pessoa** cria um descompasso. Ficou assim:

| | Quem |
|---|---|
| A tarefa nasce para | o **responsável pelo negócio** — quem tem a relação com o cliente |
| A preferência consultada é a de | **quem declarou** o Ganho — a única que a RLS deixa ler |

Na operação real os dois são a mesma pessoa: os sócios fecham os próprios negócios. A alternativa exigiria uma função `security definer` para ler preferência alheia, abrindo entre usuários uma brecha de leitura que hoje não existe — preço alto para um caso raro.

⚠️ **São QUATRO os caminhos que levam ao Ganho, não três.** A D-047 fala em três (mover no Kanban, declarar na ficha, criar já na etapa final), mas `editarCampo` ganha de duas formas — trocando a etapa com desfecho, ou editando o status direto. Todos os quatro chamam a mesma função: regra que só vale num caminho não é regra.

### 4.5 A função que deriva tudo

Uma função, uma ida ao banco (seção 2.1):

```sql
create or replace function public.notificacoes()
returns table (
  tipo        tipo_notificacao,
  chave       text,
  titulo      text,
  detalhe     text,
  referencia  timestamptz,   -- quando parou / quando vence
  destino     text,          -- caminho do clique: /negocios/<id> ou /atividades
  conta       boolean,       -- entra no numero do sino (D-141)
  lida        boolean
)
language sql stable
set search_path = ''
```

⚠️ **`conta` sai do banco, não da tela.** A D-141 é regra de produto e mora num lugar só; o componente do sino soma `where conta and not lida` e não decide nada.

⚠️ **`lida` vem da junção com `notificacao_lida`, e a linha continua aparecendo.** Notificação lida não some da lista — some do contador. Sumir da lista tiraria do usuário a chance de rever o que dispensou.

---

## 5. As telas

### 5.1 O sino

**Onde:** no cabeçalho superior, à esquerda do e-mail e do seletor de tema — `app/(sistema)/layout.tsx`. No celular a barra lateral vira gaveta (`components/dominio/menu-mobile.tsx`), e o sino fica **no cabeçalho**, não dentro da gaveta: alerta que só aparece depois de abrir um menu não é alerta.

**O número:** só quando há algo não lido que exija ação. Sem número, sem cor — sino que grita todo dia vira sino que ninguém ouve.

**Ao abrir:** lista agrupada por tipo, cada item levando ao negócio ou à atividade, com "marcar como lida" individual e "marcar todas".

```
🔔 (63)
├─ Negócios parados                    63
│    Consultoria Tributária — Amaral Group
│    sem movimento há 74 dias                        [ ✓ ]
│    …
├─ Atividades vencidas                  0
└─ Próximas atividades                   2   (não conta)
     Reunião de apresentação — amanhã
```

⚠️ **Teto de animação de entrada:** dez a catorze itens (D-116). Uma lista de 96 vencidas em cascata vira espera, não elegância. E `prefers-reduced-motion` desliga tudo, por guarda global.

⚠️ **Verificar nos dois temas** — regra 4 do `CLAUDE.md`, critério de aceite e não detalhe.

⚠️ **O sino é Client Component e o layout é Server Component.** Nenhuma função atravessa essa fronteira: o layout renderiza `<Sino />` e o próprio sino busca os dados. Passar um `onClick` ou um formatador daqui derruba **todas as telas do sistema de uma vez**, porque é o layout — não uma rota. Foi assim que C-06, C-09 e C-10 aconteceram, em três telas diferentes.

### 5.2 O painel de configuração (D-124)

Uma tela por usuário, em `/notificacoes` — quatro blocos, um por tipo, cada um com interruptor e os degraus quando o tipo os usa. Texto dizendo o que cada alerta faz, em português, sem jargão.

```
Negócio parado                                   [ ativo ]
Avisa quando um negócio seu fica sem movimento.
Movimento é mudança de etapa, valor, responsável
ou status, e também atividade registrada nele.
  ( ) 30 dias   ( ) 45 dias   (•) 60 dias   ( ) 90 dias
                               └─ padrão do sistema

Atividade vencida                                [ ativo ]
Avisa sobre atividades suas com data já passada
e ainda não concluídas.

Lembrete de próxima atividade                    [ ativo ]
Avisa com antecedência sobre o que está por vir.
  (•) 1 dia     ( ) 2 dias    ( ) 3 dias    ( ) 7 dias
   └─ padrão do sistema

Follow-up ao ganhar                              [ ativo ]
Ao marcar um negócio como Ganho, cria uma atividade
de retorno para daqui a 90 dias.
```

⚠️ **A configuração é por usuário, não por empresa.** O papel é único no MVP (D-049), mas cadência de alerta é preferência pessoal: o que incomoda um ajuda o outro.

⚠️ **Como o painel chega:** entrada no menu lateral e atalho no rodapé do sino. **Não** é a tela de Configurações da D-096, que segue fora do MVP — é uma tela de preferência pessoal, com escopo de um usuário só.

⚠️ **Gravar cria a linha; voltar ao padrão apaga.** Escolher exatamente o valor padrão apaga a linha em vez de gravá-la, para que a tabela continue significando "quem quis diferente" (§3.1). Sem isso, mudar o padrão no futuro não alcançaria quem "escolheu" o antigo sem querer.

---

## 6. Ordem de construção

✅ **Os sete passos foram construídos em 20/08.** O que de fato existe:

| # | Passo | Onde ficou |
|---|---|---|
| 1 | ✅ Migração — enum, duas tabelas, `check` dos degraus, RLS por `usuario_atual()`, `padrao_notificacao()` | `supabase/migrations/20260820120000_notificacoes.sql` |
| 2 | ✅ Função `notificacoes()` — os quatro tipos numa consulta | mesma migração |
| 3 | ✅ Medição por `explain (analyze)` na base real | ver §7 |
| 4 | ✅ Sino — contador, lista agrupada, link para o destino | `components/dominio/sino.tsx`, no `app/(sistema)/layout.tsx` |
| 5 | ✅ Marcar como lida — individual, todas e **desfazer** | `app/(sistema)/notificacoes/acoes.ts` |
| 6 | ✅ Painel `/notificacoes` | `app/(sistema)/notificacoes/` + entrada própria no menu |
| 7 | ✅ Follow-up ao ganhar, nos **quatro** caminhos de Ganho | `app/(sistema)/notificacoes/follow-up.ts` |

Mais um que o plano não previa: **`scripts/ensaia-notificacoes.mjs`**, que aplica a migração numa transação e desfaz — e, depois de aplicada, muda de papel sozinho e passa a **verificar** o que está no ar. É por ele que tudo acima foi conferido contra a base real sem gravar nada.

✅ **O passo 3 foi feito, e confirmou a folga.** A função inteira — os quatro alertas mais a junção com o que foi lido — custa **11,9 ms** de execução na base real, contra os 1,65 ms de uma consulta só e o teto de 200 ms. Nenhuma varredura sequencial, nenhum índice novo.

✅ **O passo 7 foi verificado como a criação de negócio foi**: em transação com `rollback` contra a base real, sem gravar nada. Confirmado que declarar Ganho gera evento de status no log com `origem_carga = false`, que o follow-up nasce para o responsável do negócio com a data 90 dias à frente, que **ganhar de novo não cria o segundo**, e que a tarefa recém-criada não aparece como vencida.

---

## 7. Critérios de aceite — e o que já foi medido

⚠️ **Nove dos treze foram verificados contra a base real por `scripts/ensaia-notificacoes.mjs`.** Os quatro restantes dependem de olho humano numa tela aberta, e o Google OAuth impede o agente de logar — é a mesma limitação de todas as sessões anteriores.

**O que a medição mostrou, por usuário, com os padrões da D-139/D-140:** Daniela **97** (1 parado + 96 vencidas), Ronaldo **8**, Julio **3**, e as próximas atividades aparecendo sem contar. ⚠️ **Rafael Saia e Patrícia Faria não puderam ser medidos** — são os dois dos seis que ainda não entraram no sistema, então não têm `auth_id` e não há sessão para simular. São justamente os dois de maior volume: 49 negócios parados e 39 atividades vencidas.

| # | Critério |
|---|---|
| 1 | O sino aparece em todas as telas do sistema, no cabeçalho, nos dois temas |
| 2 | O número conta apenas negócio parado + atividade vencida não lidos (D-141) |
| 3 | Um usuário sem linha em `preferencia_notificacao` recebe alertas nos padrões 60 / 1 / 90 |
| 4 | Marcar como lida esconde do contador e **mantém na lista** |
| 5 | Concluir a atividade faz o alerta sumir **sem nenhuma escrita em `notificacao_lida`** |
| 6 | Mover um negócio parado faz o alerta sumir; se ele parar de novo, o alerta **volta** (chave com marco) |
| 7 | Trocar o degrau no painel muda o que o sino mostra na recarga seguinte |
| 8 | Escolher o valor padrão **apaga** a linha de preferência |
| 9 | Um usuário não vê nem altera a preferência nem a leitura de outro |
| 10 | Negócio com status `parado`, `ganho` ou `perdido` nunca gera alerta de parado (D-046) |
| 11 | Atividade sem negócio vinculado gera alerta normalmente (D-108) |
| 12 | Marcar Ganho cria um follow-up; marcar Ganho de novo **não cria o segundo** |
| 13 | A função `notificacoes()` responde em uma ida ao banco, medida por `explain (analyze)` |

---

## 8. O que continua fora

- **Notificação fora do app** — e-mail (D-041), push, SMS. Não há motor para isso e não haverá no MVP.
- **Tela de Configurações da empresa** (D-096). O painel desta central é pessoal e não administra ninguém.
- **Histórico ou caixa de entrada de notificações.** O log de eventos já é o histórico.
- **Notificação de menção, comentário ou atribuição.** O Pipedrive tem; ninguém pediu, e escopo não pedido é escopo indevido.
- **Alerta configurável por regra ("me avise quando X").** Isso é construtor de automação, primo do E-008.

---

## 9. Pendências que este documento abre

| # | Pergunta | Bloqueia? |
|---|---|---|
| **P-042** | O prazo do follow-up ao ganhar (90 dias) deve ser editável no painel, ou fica fixo como a D-021 escreveu? | **Não.** O schema já aceita; é acrescentar um campo à tela depois |
| ~~P-043~~ | ~~De quem é o follow-up quando alguém ganha o negócio de outro?~~ | ✅ **encerrada 20/08 por D-143** |

⚠️ **E uma verificação que continua devendo:** o sino e o painel **não foram vistos nos dois temas** por olho humano. Tudo foi conferido por `tsc`, `eslint`, `next build` e pela rota respondendo 200 com o HTML certo — mas a regra 4 do `CLAUDE.md` pede a tela aberta, e o Google OAuth barra o agente. ⚠️ O sino vive no **layout**: um defeito visual nele aparece em todas as telas de uma vez.

---

## Changelog

- **v0.3** — 20/08/2026 — **O plano virou sistema.** Os sete passos da seção 6 foram construídos e verificados contra a base real na mesma sessão que os desbloqueou. Entra a **D-143** (encerra a P-043), que só apareceu ao construir: a preferência é por usuário e a RLS deixa cada um ler apenas a sua, então ganhar o negócio de outra pessoa precisava de regra — a tarefa nasce para o **responsável**, a preferência consultada é a de **quem declarou**. Registrado também que os caminhos que levam ao Ganho são **quatro e não três**, porque `editarCampo` ganha de duas formas. O `check` da tabela passa a aceitar `dias` nulo, que é o que permite desligar um alerta sem inventar um prazo. A função inteira custa **11,9 ms**. Fica devendo a conferência nos dois temas, que o OAuth impede o agente de fazer.

- **v0.2** — 20/08/2026 — **O plano sai de proposta e vira executável.** As três perguntas da seção 7 foram respondidas pelo maestro (**D-139**, **D-140**, **D-141**) e uma quarta, que a medição levantou, também (**D-142**: a pilha de 139 vencidas herdadas entra no sino sem corte por idade). O limite de "parado" e a antecedência do lembrete deixaram de ser constante do sistema e viraram **escolha do usuário em degraus** — o que muda o modelo: o `check` da tabela passa a guardar os degraus, e o padrão precisa morar no banco e não na tela. Entram a medição real (**1,65 ms de execução**, contra o teto de 200 ms — os 151 ms observados eram latência de rede), a constatação de que a restrição verdadeira é **número de idas ao banco** e não custo de consulta, o SQL concreto das duas tabelas com RLS, o aviso de que `usuario_id` compara com `usuario_atual()` e nunca com `auth.uid()` (a armadilha da C-05), os números reais de cada alerta na base, os treze critérios de aceite e a **P-042**.
- **v0.1** — 19/08/2026 — Criação, a pedido do maestro. Encerra o desenho que a D-124 deixou em aberto ao adiar a F8. Modelo de duas tabelas, com a inversão de guardar o que foi **lido** em vez do que foi gerado — é o que permite derivar na leitura sem agendador. Três perguntas continuam abertas e bloqueiam o início.
