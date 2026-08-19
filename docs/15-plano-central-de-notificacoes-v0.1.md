# 15 — Plano da Central de Notificações (v0.1)

| Campo | Valor |
|---|---|
| **Documento** | Plano de Implementação — Central de Notificações |
| **Projeto** | CRM próprio (substituição do Pipedrive) |
| **Versão** | v0.1 |
| **Data** | 19/08/2026 |
| **Status** | **proposta — aguarda validação do maestro** |

> Encerra a dívida da **F8**, adiada em 18/08 pela **D-124**, e as pendências **P-014** e **P-027** (modelar a entidade Notificação), abertas desde o Bloco 4.

---

## 1. O que já estava decidido, e o que não estava

Isto não nasce do zero. Cinco decisões já delimitam o terreno:

| # | O que diz |
|---|---|
| **D-040** | Quatro automações: follow-up ao ganhar, negócio parado, atividade vencida, lembrete de próxima atividade |
| **D-041** | Alerta é **notificação no aplicativo — sem e-mail**. Reconfirmada em 13/08 depois de considerar SMTP |
| **D-046** | **Status `parado` suspende todas as automações**. Cadastro dormente não gera alerta |
| **D-021** | Negócio ganho gera follow-up com prazo padrão de 90 dias, **desativável** |
| **D-124** | A F8 volta **acompanhada de um painel de configuração**, e os alertas são **derivados na leitura** — sem agendador |

⚠️ **Três definições continuam faltando** e este documento não as inventa — elas estão na seção 7, como perguntas.

---

## 2. A decisão técnica que sustenta tudo: derivar na leitura

A D-124 já escolheu o motor, e vale reafirmar por quê, porque tudo abaixo depende disso.

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

---

## 3. Modelo de dados

Duas tabelas. **Nenhuma delas guarda a notificação em si** — isso é o ponto.

### 3.1 `preferencia_notificacao` — o que cada um quer ser avisado

```
usuario_id        uuid    → usuario(id)
tipo              enum    negocio_parado | atividade_vencida |
                          lembrete_atividade | follow_up_ganho
ativo             boolean default true
dias              integer  -- o parâmetro do tipo; ver abaixo
criado_em         timestamptz
primary key (usuario_id, tipo)
```

O campo `dias` significa coisa diferente por tipo, e é justamente o que o maestro quer controlar:

| Tipo | O que `dias` quer dizer |
|---|---|
| `negocio_parado` | Sem movimento há N dias vira alerta |
| `lembrete_atividade` | Avisa N dias antes da atividade |
| `atividade_vencida` | Ignorado — vencida é vencida |
| `follow_up_ganho` | Dias após o ganho para criar o follow-up (padrão 90, D-021) |

⚠️ **Linha ausente = padrão do sistema.** Ninguém precisa configurar nada para o sistema funcionar; a tabela só guarda quem quis diferente. Isso evita ter de criar quatro linhas para cada usuário novo e mantém o padrão num lugar só, no código.

### 3.2 `notificacao_lida` — o que já foi visto

```
usuario_id     uuid
chave          text     -- identidade estável do alerta; ver 3.3
lido_em        timestamptz
primary key (usuario_id, chave)
```

⚠️ **Guardar o que foi LIDO, e não o que foi gerado.** É a inversão que faz o modelo funcionar sem agendador: a notificação é derivada toda vez, e esta tabela apenas a esconde. Quando a causa desaparece — a atividade é concluída, o negócio se move —, o alerta some sozinho e a linha de leitura vira lixo inofensivo.

### 3.3 A chave estável

`negocio_parado:<negocio_id>:<marco>`, onde `marco` é o dia em que o negócio cruzou o limite.

⚠️ **Sem o marco, marcar como lido silenciaria o alerta para sempre.** Com ele, um negócio que parar de novo depois de se mover gera chave nova, e volta a avisar. Foi o detalhe que decidiu o formato.

### 3.4 O que NÃO entra

- **Fila de notificações.** Não há o que enfileirar sem agendador.
- **Notificação por usuário gravada.** 2.458 negócios × 6 usuários × 4 tipos seria escrita constante para um dado que se recalcula em milissegundos.
- **Histórico de notificações.** O log de eventos já guarda o que aconteceu; notificação é uma *leitura* dele.

---

## 4. Os quatro alertas

### 4.1 Negócio parado (D-040)

Negócios do usuário sem evento no log e sem atividade há mais de N dias.

⚠️ **Status `parado` fica fora** (D-046). São 142 na base — sem essa exclusão o sino nasceria com 142 alertas e ninguém olharia de novo.
⚠️ **Ganho e perdido também ficam fora:** negócio encerrado não fica parado, fica pronto.

### 4.2 Atividade vencida

Atividades do usuário com data anterior a hoje e não concluídas. **Hoje são 206 pendências vivas na base**, das quais 125 sem negócio vinculado — então o alerta precisa funcionar para atividade solta, não só para atividade de negócio (D-108).

### 4.3 Lembrete de próxima atividade

Atividades do usuário nos próximos N dias, ainda não concluídas.

### 4.4 Follow-up ao ganhar (D-021)

Ao marcar Ganho, cria-se uma atividade de follow-up com prazo padrão de 90 dias. **Desativável**, e por isso mora na mesma tabela de preferência.

⚠️ Este é o único dos quatro que **escreve** — cria uma atividade. Os outros três só leem. Ele é, portanto, o único que precisa de gatilho ou de *server action*, e cabe naturalmente na ação que declara o desfecho.

---

## 5. As telas

### 5.1 O sino

Na barra lateral, junto do avatar. Número quando há algo não lido; sem número, sem cor — sino que grita todo dia vira sino que ninguém ouve.

Ao abrir, uma lista agrupada por tipo, cada item levando ao negócio ou à atividade, com "marcar como lida" individual e "marcar todas".

### 5.2 O painel de configuração (D-124)

Uma tela por usuário, quatro blocos — um por tipo —, cada um com interruptor e o campo de dias quando o tipo o usa. Texto dizendo o que cada alerta faz, em português, sem jargão.

⚠️ **A configuração é por usuário, não por empresa.** O papel é único no MVP (D-049), mas cadência de alerta é preferência pessoal: o que incomoda um ajuda o outro.

---

## 6. Ordem de construção

| # | Passo | Depende de |
|---|---|---|
| 1 | Migração das duas tabelas + RLS por usuário | as respostas da seção 7 |
| 2 | Função de banco que deriva os alertas do usuário | 1 |
| 3 | Sino com contagem e lista | 2 |
| 4 | Marcar como lida | 2 |
| 5 | Painel de configuração | 1 |
| 6 | Follow-up ao ganhar | 5 |

⚠️ **O passo 2 é o que decide se o plano funciona.** A consulta roda a cada abertura de tela: se passar de ~200 ms com a base real, o modelo de derivar na leitura precisa ser revisto antes de a interface existir. **Medir antes de construir o sino.**

---

## 7. O que falta o maestro decidir

Três perguntas. As duas primeiras bloqueiam o passo 1.

| # | Pergunta | Por que importa |
|---|---|---|
| **P-036a** | **Quantos dias sem movimento tornam um negócio "parado"?** | Nunca foi definido em documento nenhum. Referência da base: o lead time médio em Proposta Enviada é de 45 dias, e 74% dos negócios estão nas duas últimas etapas — um limite de 30 dias acenderia meio funil |
| **P-036b** | **Com quanta antecedência chega o lembrete de próxima atividade?** | Um dia avisa tarde para reunião; sete dias vira ruído para tarefa curta |
| **P-037a** | **O sino conta os quatro tipos juntos, ou só os que exigem ação?** | Lembrete de atividade futura não é pendência. Contá-lo infla o número e o número é o que faz alguém clicar |

---

## Changelog

- **v0.1** — 19/08/2026 — Criação, a pedido do maestro. Encerra o desenho que a D-124 deixou em aberto ao adiar a F8. Modelo de duas tabelas, com a inversão de guardar o que foi **lido** em vez do que foi gerado — é o que permite derivar na leitura sem agendador. Três perguntas continuam abertas e bloqueiam o início.
