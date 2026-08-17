# 06 — Modelo de Domínio conceitual (v0.5)

| Campo | Valor |
|---|---|
| **Documento** | Modelo de Domínio |
| **Projeto** | CRM próprio (substituição do Pipedrive) |
| **Versão** | v0.5 |
| **Data** | 13/08/2026 |
| **Status** | **validado** — v0.3 validada pelo maestro em 13/08/2026; v0.5 incorpora os Blocos 7 a 11 |

> ⚠️ Este documento é **conceitual**. Não define schema de banco, tipos de coluna ou índices. Nomes de campos são descritivos, não definitivos. A modelagem física será elaborada no Doc 09, sobre Supabase (D-078).

---

## 1. Entidades

### Organização
Entidade central do modelo. Clientes pessoa física são cadastrados como organização comum, sem diferenciação.

| Campo | Observação |
|---|---|
| Nome | Obrigatório |
| Cidade | |
| Website | |
| **Identificador externo (Bubble)** | ID do cliente correspondente no sistema interno em Bubble.io (D-075). Opcional; preenchido pelo seletor do diálogo de Ganho (D-076) ou manualmente na ficha |

### Pessoa
Contato dentro de uma ou mais organizações.

| Campo | Observação |
|---|---|
| Nome | Obrigatório |
| — | O **cargo não pertence à pessoa**: é atributo do vínculo com cada organização (D-036) |

### Forma de Contato
Telefones e e-mails de uma pessoa. Lista simples, sem rótulo e sem marcação de principal.

> **Nota (D-088):** Pessoa e suas formas de contato **podem ser excluídas** — como função normal de cadastro, não como módulo de conformidade. Não há módulo de LGPD no MVP, mas a exclusão precisa existir.

| Campo | Observação |
|---|---|
| Tipo | Telefone ou e-mail |
| Valor | Telefone gera hiperlink para WhatsApp (D-072); e-mail gera link mailto |

### Negócio
A oportunidade comercial.

| Campo | Obrigatório | Observação |
|---|---|---|
| Título | ✅ | Único campo texto obrigatório |
| Organização | ✅ | Negócio não existe sem organização |
| Valor total/anual | | Digitado diretamente; recorrentes contam como 12 parcelas anuais |
| Etapa do funil | | Lista configurável |
| **Status** | | **Lista fixa de quatro valores** |
| Origem | | Lista configurável |
| Produto/Serviço | | Relação N:1 — um por negócio. Não obrigatório (D-037) |
| Responsável | | Existe, sem obrigatoriedade hoje |
| Motivo da perda | | Lista configurável; obrigatório quando o desfecho é Perdido |

**Não existe** data prevista de fechamento — logo, não há previsão de receita (D-024).

#### Status do Negócio — fixo, quatro valores (D-042)

| Status | Significado | Efeito |
|---|---|---|
| **Parado** | Cadastro sem trabalho em curso, ou negócio congelado | **Suspende todas as automações** (D-046). **Fora dos indicadores de desempenho por padrão** (D-067) |
| **Negociação** | Negócio ativo, em condução | Monitorado por todas as automações de D-040 |
| **Ganho** | Desfecho positivo | Dispara follow-up (D-021). Abre o seletor de cliente Bubble (D-076). Encerra o negócio |
| **Perdido** | Desfecho negativo | Exige motivo da perda. Encerra o negócio |

O status **não é editável** pelo usuário — os quatro valores são fixos em código.

#### Status × Etapa — dimensões independentes (D-043)

Status e etapa são dois eixos distintos. A única relação é o **status inicial sugerido por etapa** (D-045):

| Etapa | Status inicial |
|---|---|
| Cold Lead | Parado |
| Hot Lead | Negociação |
| Contato Realizado | Negociação |
| Apresentação Realizada | Negociação |
| Proposta Enviada | Negociação |
| Aguardando Contrato | Definido no diálogo obrigatório de desfecho |

Configurável na tela de etapas. O usuário pode sobrepor o status a qualquer momento.

### Produto/Serviço

| Campo | Observação |
|---|---|
| Nome | |
| Área | Lista configurável — hoje 5 áreas |

### Atividade
Ações vinculadas ao negócio. Serve como histórico (passado, concluída) e como agenda (futuro, pendente).

| Campo | Observação |
|---|---|
| Tipo | Chamada, reunião, tarefa, e-mail — configurável |
| Título | |
| Data | Realização ou a realizar |
| Hora início / fim | |
| Responsável | |
| Descrição | |
| Concluída | Sim/não |

### Anotação
Texto livre, sem data de agenda e sem conclusão. Pertence ao negócio; **visualizada de forma derivada** nas fichas de organização e pessoa (D-039).

### Evento de Negócio (log)
⚠️ **Item não-postergável.** Registro automático gerado pelo sistema.

| Campo | Observação |
|---|---|
| Negócio | |
| Tipo de evento | Mudança de etapa, de valor, de responsável, de status |
| Valor anterior / novo | |
| Data e hora | |
| Autor | |

Habilita os indicadores 7, 8 e 9 do catálogo (funil de conversão, lead time, valor inicial × fechado). **Sem o log em produção desde o dia 1, esses três indicadores não são recuperáveis.**

O log **nunca é reescrito**. A transferência entre usuários (D-052) altera o responsável atual, não a autoria histórica.

⚠️ **Onde ele é gerado (D-081):** por **gatilho no banco**, não pela aplicação. Assim o evento nasce qualquer que seja a origem da escrita — tela, script de migração ou futuro agente de IA. Tabela **somente inserção**: sem alteração, sem exclusão. É a garantia de que os indicadores 7, 8 e 9 não nascem cegos por atalho de implementação ou pressa de prazo.

### Funil e Etapa
Configuráveis. Hoje um funil, com **seis etapas**:

Cold Lead → Hot Lead → Contato Realizado → Apresentação Realizada → Proposta Enviada → **Aguardando Contrato**

Ganho e Perdido **não são etapas** — são status (D-044). Cada etapa carrega nome, ordem e status inicial sugerido.

### Usuário

| Campo | Observação |
|---|---|
| Nome | |
| E-mail | Conta Google do domínio da empresa |
| Papel | Único no MVP (acesso total) |
| **Ativo / Inativo** | Marcação **manual** (D-051). Não controla acesso — apenas presença nas listas de seleção |

- Autenticação por **Google OAuth**; autorização por **domínio** (D-050), aplicada na camada de política do banco.
- **O primeiro login de uma conta do domínio cria o Usuário automaticamente** (D-084), ativo e com papel único. Sem convite, sem cadastro prévio.
- Acesso encerrado pelo cancelamento da conta no Google.
- **Usuário nunca é excluído.**

### Papel e Permissão
Estrutura **Usuário → Papel → Permissão existe desde o primeiro dia**, com papel único de acesso total (D-049). Sem tela de gestão no MVP.

### Notificação
Alertas internos ao aplicativo, sem e-mail (D-041, reconfirmada). Modelagem detalhada pendente (A-07).

### Indicador
⚠️ **Entidade nova (D-062).** O módulo de estatísticas é um **catálogo**, não um conjunto de telas fixas.

| Campo | Observação |
|---|---|
| Nome | |
| Métrica | Contagem, soma de valor, tempo médio, razão |
| Eixos admissíveis | Quais dimensões aquele indicador aceita como agrupamento — origem, produto, área, tempo. Definido por indicador, não global |
| Tipo de gráfico | Barra, linha, funil, número único |
| Inclui parados | Falso por padrão (D-067) |

**Extensão prevista para a fase 2 (E-010):** a meta entra aqui como atributo do indicador — valor alvo, período de vigência, a quem se aplica —, não como módulo paralelo.

### Painel do Usuário
Relação entre o usuário e os indicadores que ele escolheu exibir, com ordem e filtros salvos. É o que torna o painel montável e persistente (D-062).

### Listas configuráveis
Origem · Motivo de perda · Área de produto · Tipo de atividade · Etapas do funil

**Não configurável:** Status do negócio (fixo em quatro valores).

---

## 2. Relacionamentos

| Relação | Cardinalidade | Observação |
|---|---|---|
| Organização → Negócio | 1 : N | |
| Negócio → Organização | N : 1 | **Obrigatória** |
| Pessoa ↔ Organização | N : N | **O vínculo carrega o cargo** |
| Negócio ↔ Pessoa | N : N | |
| Pessoa → Forma de Contato | 1 : N | |
| Negócio → Produto/Serviço | N : 1 | **Um produto por negócio** |
| Produto → Área | N : 1 | |
| Negócio → Atividade | 1 : N | Atividade **sempre** pertence a um negócio |
| Negócio → Anotação | 1 : N | |
| Negócio → Evento (log) | 1 : N | Gerado automaticamente |
| Funil → Etapa | 1 : N | |
| Etapa → Negócio | 1 : N | |
| Usuário → Negócio (responsável) | 1 : N | |
| Usuário → Papel | N : 1 | Papel único no MVP |
| Usuário ↔ Indicador | N : N | Via Painel do Usuário |

---

## 3. Regras de domínio já definidas

1. Atividade pertence a **negócio, organização ou pessoa** — os três vínculos são opcionais e independentes, como no Pipedrive (**D-108**, revoga esta parte da D-030). ⚠️ A regra antiga caiu diante dos dados: 76% das atividades da base real não têm negócio, e entre elas 125 das 206 pendências vivas dos sócios.
2. Organizações e pessoas podem existir sem negócio vinculado.
3. Contatos anteriores à criação do negócio são registrados **retroativamente**.
4. Um negócio pode ser criado em qualquer etapa, e nasce com o status inicial daquela etapa.
5. **Não há regras de bloqueio na transição entre etapas, com uma única exceção** (regra 6).
6. ⚠️ **Trava única do sistema (D-047):** mover ou criar um negócio em **Aguardando Contrato** abre diálogo obrigatório pedindo o desfecho. Se Perdido, o motivo também é obrigatório.
7. Os botões **Ganho** e **Perdido** na tela de detalhe movem o negócio para Aguardando Contrato e aplicam o status (D-048).
8. ⚠️ **Ao declarar Ganho**, o diálogo apresenta o **seletor de cliente do sistema Bubble** (D-076). A escolha grava o identificador externo na Organização. O vínculo é **opcional** — falha ou ausência do serviço externo **não impede** a conclusão do Ganho (D-077).
9. Cold Lead e Hot Lead são classificações de entrada equivalentes, não progressão.
10. Ao marcar como Ganho, o sistema cria atividade de follow-up com prazo configurável (padrão 90 dias) — desativável.
11. **Status Parado suspende todas as automações.**
12. ⚠️ **Status Parado fica fora, por padrão, dos indicadores de desempenho comercial** — conversão, lead time, taxa de ganho, ranking —, com interruptor "incluir parados" no painel. Os Parados alimentam um **indicador próprio de saúde da base** (D-067).
13. Campos são **fixos**; não há customização pelo usuário.
14. Fichas de organização e pessoa exibem **histórico consolidado derivado**. Consequência aceita: organização sem negócio não recebe anotação.
15. Organizações e pessoas duplicadas podem ser **mescladas**.
16. Negócios e **atividades futuras em aberto** podem ser **transferidos** entre usuários. Concluídas ficam com o autor original. A transferência **não altera o log**.
17. Alertas: negócio parado, atividade vencida, lembrete de próxima atividade, follow-up ao ganhar — todos como **notificação interna, sem e-mail**.
18. Toda listagem exportável gera **CSV ponto-e-vírgula em UTF-8 com BOM**, contendo o conjunto filtrado inteiro e não apenas a página visível (D-066).

---

## 4. Pontos em aberto

| # | Questão | Situação |
|---|---|---|
| ~~A-01~~ | ~~Cargo pertence à pessoa ou ao vínculo?~~ | ✅ vínculo (D-036) |
| ~~A-02~~ | ~~Temperatura como etapa ou campo?~~ | ✅ permanece como etapa |
| ~~A-03~~ | ~~Produto obrigatório?~~ | ✅ não obrigatório (D-037) |
| ~~A-04~~ | ~~Duplicidade de cadastros~~ | ✅ ferramenta de mesclagem (D-038) |
| A-05 | Obrigatoriedade de campo configurável por papel | ⛔ sem suporte no MVP (D-049). Fase 2 |
| ~~A-06~~ | ~~Histórico em pessoa/organização~~ | ✅ histórico consolidado derivado (D-039) |
| A-07 | Entidade Notificação: como são geradas, lidas e marcadas | 🟡 parcialmente endereçada (D-058); falta modelar a notificação |
| ~~A-08~~ | ~~Tratamento de negócios Parados nas estatísticas~~ | ✅ **encerrado** — fora por padrão + indicador de saúde da base (D-067) |
| A-09 | Mapeamento do eixo admissível de cada um dos treze indicadores | 🟡 trabalho de Fase 2, não depende do maestro |
| ~~A-10~~ | ~~Onde moram as regras de negócio~~ | ✅ **encerrado** — log no banco por gatilho; regras de processo na aplicação; validação no cliente (D-081) |

---

## Changelog

- **v0.5** — 13/08/2026 — A-10 encerrado (D-081): log gerado por gatilho no banco, tabela somente inserção. Usuário criado no primeiro login do domínio (D-084). Nota de exclusão de Pessoa (D-088). Volume projetado registrado (D-086): ~1.000 negócios novos por ano, sendo "negócio" um contato registrado e não uma oportunidade qualificada.
- **v0.4** — 13/08/2026 — Documento **validado** pelo maestro. Entidades **Indicador** e **Painel do Usuário** criadas (D-062). Organização ganha **identificador externo** do sistema Bubble (D-075). Regras 8, 12 e 18 acrescentadas (seletor de cliente no Ganho, Parados nas estatísticas, exportação). A-08 encerrado; A-09 e A-10 abertos.
- **v0.3** — 12/08/2026 — Status fixo de quatro valores, funil de seis etapas, status inicial por etapa, trava única de transição, entidade Usuário detalhada, Papel e Permissão como esqueleto.
- **v0.2** — 10/08/2026 — Incorporadas as decisões do Bloco 4.
- **v0.1** — 10/08/2026 — Criação a partir dos Blocos 1 a 3.
