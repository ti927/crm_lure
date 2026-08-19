# 14 — Migração do Pipedrive (v0.2)

| Campo | Valor |
|---|---|
| **Documento** | Migração do Pipedrive |
| **Projeto** | CRM próprio (substituição do Pipedrive) |
| **Versão** | v0.2 |
| **Data** | 14/08/2026 |
| **Status** | rascunho — aguarda validação do maestro |

> Estratégia de dados legados. O material técnico de apoio — endpoints, autenticação, paginação e limites de uso — está em `14-referencia-api-pipedrive-v0.1`, que continua válido como anexo deste documento.

---

## 1. Decisão de escopo

**Migração completa** (D-068). Negócios abertos e encerrados, organizações, pessoas, formas de contato, atividades, anotações, produtos, funis, etapas e usuários. Nada da base é descartado.

**A fronteira:** migra-se tudo que **cabe no modelo**. Campos que o Doc 06 não previu não têm destino e são deliberadamente perdidos.

✅ **A janela fechou a favor:** a extração e a carga aconteceram em **17/08/2026** e estão conferidas. O acesso à API do Pipedrive se encerra com o contrato, em 3/9/2026, mas isso não ameaça mais nada — e é por isso que o prazo do projeto pôde ser revogado (**D-125**). *(Histórico: enquanto a extração não acontecia, esta era a única tarefa do projeto que não dependia de nenhuma outra, e a única com prazo irrecuperável.)*

---

## 2. Estratégia em duas etapas

A separação entre **extrair** e **carregar** é o que protege o projeto do calendário.

```
Pipedrive  ──[extração]──►  JSON bruto no disco  ──[transformação e carga]──►  Supabase
             antes de 3/9         permanente              quantas vezes for preciso
```

**Etapa 1 — Extração.** Puxa os dados crus e grava em JSON, sem transformar nada. Independe da stack, do schema e do sistema estar pronto. **Depois dela, 3/9 deixa de ameaçar os dados.**

**Etapa 2 — Transformação e carga.** Lê os JSON, mapeia para o modelo e grava no Supabase. Pode ser repetida quantas vezes forem necessárias, sem tocar de novo na API.

Guardar o bruto também preserva o que **não** foi migrado: se um campo descartado fizer falta em 2027, ele está no arquivo.

---

## 3. Extração

Conforme o documento de referência da API:

1. Token lido de variável de ambiente. **Nunca em código, log ou documento.**
2. Uma chamada por entidade, com `limit=500`, paginando até o fim.
3. Pausa entre chamadas; `429` tratado com espera e nova tentativa.
4. Um arquivo JSON por entidade, gravado antes de qualquer transformação.
5. Conferência de contagens contra o Pipedrive.

**Entidades a extrair:** deals · organizations · persons · activities · notes · products · pipelines · stages · users · dealFields · personFields · organizationFields · activityTypes.

Os três `*Fields` não viram dados: servem para **interpretar** os campos personalizados, que no Pipedrive aparecem com chaves em formato de hash.

**Volume esperado:** irrelevante para os limites do Pipedrive. Dezenas de chamadas no total.

---

## 4. Mapeamento

### 4.1 Organização

| Pipedrive | Modelo | Observação |
|---|---|---|
| `name` | `nome` | |
| `address` / cidade | `cidade` | Extrair a cidade do endereço, se vier composto |
| — | `website` | Verificar se existe campo equivalente; senão, nasce vazio |
| — | `bubble_id` | **Não vem do Pipedrive.** Preenchido depois, pelo seletor de Ganho |
| `add_time` | `criado_em` | Converter UTC → Brasília |

**Sem destino:** setor, receita anual, nº de funcionários, etiquetas, proprietário.

### 4.2 Pessoa e formas de contato

| Pipedrive | Modelo | Observação |
|---|---|---|
| `name` | `pessoa.nome` | |
| `org_id` | `pessoa_organizacao` | Cria o vínculo |
| `job_title` (se houver) | `pessoa_organizacao.cargo` | ⚠️ O cargo vai para o **vínculo**, não para a pessoa (D-036) |
| `phone[]` | `forma_contato` tipo `telefone` | Uma linha por telefone; rótulos e "principal" **descartados** (D-034) |
| `email[]` | `forma_contato` tipo `email` | Idem |

### 4.3 Negócio

| Pipedrive | Modelo | Observação |
|---|---|---|
| `title` | `titulo` | |
| `org_id` | `organizacao_id` | ⚠️ **Obrigatório.** Ver regra 5.3 |
| `value` | `valor` | Moeda única; se houver valor em outra moeda, ver regra 5.4 |
| `stage_id` | `etapa_id` | Via mapa de etapas |
| `status` + `stage_id` | `status` | Ver regra 5.1 |
| — | `origem_id` | **Não existe no Pipedrive** (E-001). Nasce vazio |
| produto vinculado | `produto_id` | ⚠️ N:1 — ver regra 5.2 |
| `user_id` | `responsavel_id` | Via casamento de e-mail |
| `lost_reason` | `motivo_perda_id` | Ver regra 5.5 |
| `add_time` | `criado_em` | UTC → Brasília |

**Sem destino:** probabilidade, data prevista de fechamento (D-024), etiquetas, participantes secundários, arquivos anexos, e-mails sincronizados.

### 4.4 Atividade e anotação

| Pipedrive | Modelo | Observação |
|---|---|---|
| `subject` | `atividade.titulo` | |
| `type` | `tipo_id` | Via `activityTypes` |
| `due_date` / `due_time` | `data`, `hora_inicio` | UTC → Brasília |
| `duration` | `hora_fim` | Calculado |
| `done` | `concluida` | |
| `user_id` | `responsavel_id` | |
| `deal_id` | `negocio_id` | ⚠️ **Obrigatório** — ver regra 5.6 |
| `note.content` | `anotacao.texto` | HTML do Pipedrive precisa ser tratado |

### 4.5 Funil, etapa, produto e usuário

Migração direta. Etapas preservam ordem. Usuários casam por e-mail com as contas Google do domínio; **quem não casar precisa de conciliação manual**, sob pena de o negócio perder o responsável histórico.

---

## 5. Regras de transformação

### 5.1 Status — a transformação mais delicada
O Pipedrive tem `open`, `won`, `lost`, `deleted`. O modelo tem quatro status independentes da etapa.

| Pipedrive | Etapa | Status no modelo |
|---|---|---|
| `won` | qualquer | **Ganho** |
| `lost` | qualquer | **Perdido** |
| `open` | Cold Lead | **Parado** |
| `open` | demais etapas | **Negociação** |
| `deleted` | — | **Não migrar** |

⚠️ Esta regra é uma **proposta do consultor** e precisa de validação. A alternativa é trazer todos os `open` como Negociação — o que encheria os indicadores de desempenho de cadastros nunca tocados, exatamente o que D-067 quis evitar.

### 5.2 Produto — N:1 contra N:N
O Pipedrive permite **vários** produtos por negócio; o modelo aceita **um** (D-032). Se algum negócio tiver mais de um, é preciso escolher: o de maior valor, o primeiro, ou nenhum. **Decisão pendente** — depende de quantos casos existem, o que a extração revelará.

### 5.3 Negócio sem organização
O modelo exige organização (D-023). Se houver negócio órfão no Pipedrive, a saída é criar uma organização a partir do título do negócio, ou descartar. **Decisão pendente**, também dependente do que a extração mostrar.

### 5.4 Valores e moeda
Real como moeda única (D-087). Valor em outra moeda precisa de tratamento explícito. Improvável dado o mercado 100% nacional, mas verificável na extração.

### 5.5 Motivo de perda
No Pipedrive costuma ser **texto livre**; no modelo é **lista configurável**. A carga precisa: coletar os valores distintos, normalizar caixa e espaços, criar os itens da lista e então vincular. Variações do mesmo motivo escritas de formas diferentes devem ser unificadas — decisão humana, com a lista à vista.

### 5.6 Atividade órfã
Toda atividade pertence a um negócio (D-030). Atividade ligada apenas a uma organização ou pessoa não tem destino. **Decisão pendente:** descartar ou vincular a algum negócio daquela organização.

### 5.7 Fuso horário
⚠️ O Pipedrive grava em **UTC**. Toda data e hora é convertida para Brasília na carga. Sem isso, atividades da manhã viram madrugada do dia anterior e ninguém percebe até alguém abrir a agenda.

### 5.8 Campos personalizados
Aparecem com chaves em formato de hash e só são interpretáveis pelos `*Fields`. Como o modelo tem campos fixos (D-028), a maioria não tem destino — mas vale inspecionar antes de descartar: pode haver ali um dado que a equipe usa e que ninguém mencionou nas entrevistas.

---

## 6. Carga

1. Rodar **sempre primeiro no banco local**, em contêiner (D-101, D-102). Não existe ambiente de desenvolvimento na nuvem: depois do ensaio local, a próxima execução é na base de produção.
2. Executar com `set local app.carga_migracao = true`. ⚠️ **Sem isso, o log nasce com milhares de eventos falsos** datados do dia da migração, e todo cálculo de lead time é contaminado.
3. Ordem de carga, respeitando dependências:
   `papel` → `usuario` → listas configuráveis → `funil` → `etapa` → `area_produto` → `produto` → `organizacao` → `pessoa` → `pessoa_organizacao` → `forma_contato` → `negocio` → `negocio_pessoa` → `atividade` → `anotacao`
4. Conferir contagens.
5. Repetir do zero, com `supabase db reset`, até rodar **duas vezes seguidas** sem erro nem divergência.
6. **Verificar o backup do Supabase** (D-089) e só então carregar em produção.

⚠️ **Com D-101 este roteiro roda uma única vez na base real.** Não há ambiente de nuvem intermediário onde errar sem consequência, e a base de produção é a que os sócios vão usar no dia seguinte. O ensaio local do item 5 não é formalidade — é a única rede que existe. As mitigações que restam depois dele são a ordem de carga do item 3, a marcação `origem_carga` do item 2 e o backup do item 6.

---

## 7. Histórico de trajetória — investigação pendente (P-021)

O log de eventos do sistema novo pode, em tese, ser retroalimentado a partir dos endpoints de `changelog` do Pipedrive, que trazem histórico campo a campo.

**A investigar:** se é possível reconstituir a trajetória de etapa e valor de cada negócio.

- **Se for possível:** os indicadores 7, 8 e 9 nascem com passado.
- **Se não for:** o log começa zerado na virada, e esses indicadores só medem o que acontecer a partir de setembro. **Não é impeditivo** — é perda de informação histórica, registrada como risco no Doc 00.

Custa uma chamada em uma dúzia de negócios para descobrir. Vale fazer junto com a extração.

---

## 8. Validação

Sem isto, a migração não está concluída (critério 1 de D-098):

| # | Verificação |
|---|---|
| 1 | **2.453 negócios** no banco novo |
| 2 | **422 organizações** |
| 3 | Pessoas, formas de contato, atividades, anotações e produtos com contagens conferidas |
| 4 | Nenhum negócio sem organização |
| 5 | Nenhuma atividade sem negócio |
| 6 | Nenhum negócio Perdido sem motivo |
| 7 | Soma dos valores dos negócios ganhos bate com o Pipedrive |
| 8 | Dez negócios conferidos **manualmente**, campo a campo, contra a tela do Pipedrive |
| 9 | Todos os eventos do log com `origem_carga = true` |
| 10 | Datas e horas conferidas em uma amostra de atividades |

---

## 9. Pendências

| # | Item | Situação |
|---|---|---|
| P-020 | ⚠️ Executar a extração antes de 3/9 | **Não bloqueada por nada** |
| P-021 | Investigar reconstituição de trajetória pelos changelogs | Junto com a extração |
| 5.1 | Validar a regra de conversão de status | 🟡 proposta do consultor |
| 5.2 | Negócio com mais de um produto | Depende do que a extração revelar |
| 5.3 | Negócio sem organização | Idem |
| 5.6 | Atividade sem negócio | Idem |
| 5.8 | Campos personalizados com dado útil | Inspecionar antes de descartar |

---

## Changelog

- **v0.2** — 14/08/2026 — **D-101 incorporada à seção 6.** O ensaio passa a ser no banco local em contêiner; a carga real roda uma única vez, direto em produção. Acrescentados: exigência de duas execuções limpas antes de tocar na base real, verificação do backup antes da carga, e o registro de que o ensaio local é a única rede que resta.
- **v0.1** — 13/08/2026 — Criação ao fim da Fase 1. Estratégia em duas etapas, mapeamento campo a campo e oito regras de transformação. Substitui o rascunho técnico como documento oficial; a referência da API permanece como anexo.
