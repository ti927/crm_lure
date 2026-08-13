# 14 (rascunho técnico) — Referência da API Pipedrive para Extração de Dados (v0.1)

| Campo | Valor |
|---|---|
| **Documento** | Referência Técnica — API Pipedrive para Extração/Migração |
| **Projeto** | CRM próprio (substituição do Pipedrive) |
| **Versão** | v0.1 |
| **Data** | 11/08/2026 |
| **Status** | rascunho técnico de apoio — **não é o Doc 14 oficial** |
| **Autor** | Claude (consultor) |

---

## 0. Natureza deste documento

Este documento **não é** ainda o Doc 14 — Migração do Pipedrive da biblioteca oficial (Doc 01, seção 5). Sua criação formal está prevista para a **Fase 5**, após o **Bloco 8** (Migração e Integrações), ainda não iniciado.

Este é um **material de referência técnica**, produzido a pedido explícito do maestro, para que o **Claude Code** tenha, no futuro, tudo o que precisa para escrever o script de extração do Pipedrive e regravação no banco de destino — sem precisar buscar essa documentação de novo.

**O que este documento define:** os comandos de API (endpoints GET), autenticação, paginação, formato de resposta e limites de uso.
**O que este documento NÃO define:** schema do banco de destino, nomes de tabelas/colunas no Supabase, mapeamento campo a campo Pipedrive → Modelo de Domínio, nem se haverá migração de fato (isso depende da P-002, ainda em aberto, e do Bloco 8). O uso de **Supabase como destino é tratado aqui apenas como exemplo ilustrativo do fluxo**, não como decisão técnica validada — isso pertence à Fase 4 (Bloco 10), regra 2 do Doc 00.

**Fonte:** documentação oficial em `https://pipedrive.readme.io/docs/`, consultada em 11/08/2026.

---

## 1. Autenticação

Toda requisição precisa do header `x-api-token`:

```bash
curl --request GET \
  --url "https://{SEU_DOMINIO}.pipedrive.com/api/v1/deals" \
  --header "x-api-token: {SEU_TOKEN}"
```

- O token é obtido em **Configurações pessoais → Chaves de API** dentro do próprio Pipedrive.
- Está atrelado a um usuário e à empresa; dá acesso a **todos os dados daquele usuário**.
- Só existe **um token ativo por vez** — se for trocado, integrações antigas param de funcionar.
- `{SEU_DOMINIO}` é o subdomínio da empresa no Pipedrive (ex.: `suaempresa.pipedrive.com`).

⚠️ O token nunca deve ser colado em texto puro nesta conversa nem em nenhum documento da biblioteca do projeto. No momento da extração real, ele deve ser fornecido ao Claude Code como variável de ambiente (`.env`, não versionado).

---

## 2. Paginação — obrigatória para extrair a base completa

Uma chamada nunca traz todos os registros; é necessário iterar até o fim.

### 2.1 Offset pagination (usada pela maioria dos endpoints v1 de listagem)

Parâmetros: `start` (padrão 0) e `limit` (padrão 100, **máximo 500**).

```
GET /v1/deals?start=0&limit=500
```

Resposta traz:
```json
{
  "success": true,
  "data": [ /* registros */ ],
  "additional_data": {
    "pagination": {
      "start": 0,
      "limit": 500,
      "more_items_in_collection": true,
      "next_start": 500
    }
  }
}
```
Repetir trocando `start` pelo `next_start`, até `more_items_in_collection` vir `false`.

### 2.2 Cursor pagination (endpoints `/collection` e toda a API v2)

Parâmetros: `cursor` (opaco) e `limit` (máximo 500).

```
GET /v1/deals/collection?cursor=eyJkZWFsIjo0Mn0&limit=500
```

Resposta traz `additional_data.next_cursor`. Repetir usando esse valor até ele vir `null`.

---

## 3. Formato de resposta

Toda resposta é JSON, com o mesmo envelope:

**Sucesso:**
```json
{
  "success": true,
  "data": { /* ou array, ou null */ },
  "additional_data": { /* paginação, se aplicável */ }
}
```

**Erro:**
```json
{
  "success": false,
  "error": "mensagem principal",
  "error_info": "orientação adicional",
  "data": null,
  "additional_data": null
}
```

O script de extração deve sempre checar `success` antes de processar `data`.

---

## 4. Limites de uso (rate limiting)

Desde o rollout iniciado em março/2025, o Pipedrive usa **limite por orçamento diário de tokens**, não mais por contagem simples de requisições.

- **Orçamento diário** = `30.000 × multiplicador do plano × nº de assentos` (+ eventuais top-ups comprados).
- Multiplicador por plano: Lite = 1 · Growth = 2 · Premium = 5 · Ultimate = 7.
- **Custo por tipo de chamada** (referência aproximada — valores exatos por endpoint estão no API Reference):

| Tipo de operação | Custo em tokens |
|---|---|
| Buscar 1 registro | 2 |
| Buscar lista de registros | 20 |
| Atualizar 1 registro | 10 |
| Excluir 1 registro | 6 |
| Excluir lista | 10 |
| Busca (search) | 40 |

- Endpoints da **API v2** custam menos tokens que os equivalentes em v1 — vale considerar v2 quando disponível para a entidade.
- **Limite de rajada (burst):** por token de API, janela rolante de 2 segundos. Ex.: plano Lite = 20 requisições/2s; Growth = 40/2s; Premium = 100/2s; Ultimate = 120/2s.
- Ao estourar o orçamento diário: erro `429 Too Many Requests`, bloqueado até a virada do dia (fuso do servidor do Pipedrive, não necessariamente o do Brasil).
- Dado o **volume baixo do projeto** (dezenas a poucas centenas de negócios/ano — D-014, R-006), o orçamento diário dificilmente será um problema; o cuidado maior é não disparar chamadas em loop sem pausa (respeitar o burst limit de 2s).

**Ação recomendada para o Claude Code no script de extração:** paginar com `limit=500`, inserir pequeno intervalo entre chamadas, e tratar `429` com espera e nova tentativa (retry with backoff).

---

## 5. Endpoints GET relevantes para a extração

Todos com base em `https://{SEU_DOMINIO}.pipedrive.com/api/v1/...`, salvo indicação de v2.

| Entidade Pipedrive | Endpoint (lista) | Endpoint (detalhe) | Entidade correspondente no Modelo de Domínio (Doc 06) |
|---|---|---|---|
| Deals | `GET /v1/deals` (ou `/deals/collection`) | `GET /v1/deals/{id}` | Negócio |
| Organizations | `GET /v1/organizations` (ou `/collection`) | `GET /v1/organizations/{id}` | Organização |
| Persons | `GET /v1/persons` (ou `/collection`) | `GET /v1/persons/{id}` | Pessoa |
| Activities | `GET /v1/activities` (ou `/collection`) | `GET /v1/activities/{id}` | Atividade |
| Notes | `GET /v1/notes` | `GET /v1/notes/{id}` | Anotação |
| Products | `GET /v1/products` | `GET /v1/products/{id}` | Produto/Serviço |
| Pipelines | `GET /v1/pipelines` | `GET /v1/pipelines/{id}` | Funil |
| Stages | `GET /v1/stages` | `GET /v1/stages/{id}` | Etapa |
| Users | `GET /v1/users` | `GET /v1/users/{id}` | Usuário |
| Deal fields | `GET /v1/dealFields` | — | Metadados de campos (mapeamento de customFields, se houver) |
| Person fields | `GET /v1/personFields` | — | idem |
| Organization fields | `GET /v1/organizationFields` | — | idem |
| Activity types | `GET /v1/activityTypes` | — | Lista configurável de tipos de atividade |
| Deal → Changelog | `GET /v1/deals/{id}/changelog` (cursor) | — | Possível fonte para reconstituir Evento de Negócio (log), se decidido migrar histórico |
| Deal → Participants changelog | `GET /v1/deals/{id}/participantsChangelog` (cursor) | — | Histórico de pessoas vinculadas ao negócio |
| Person → Changelog | `GET /v1/persons/{id}/changelog` (cursor) | — | Histórico de alterações da pessoa |
| Organization → Changelog | `GET /v1/organizations/{id}/changelog` (cursor) | — | Histórico de alterações da organização |

> ⚠️ Nota importante para o Bloco 5/Doc 06: o Pipedrive não expõe nativamente um log unificado de "mudança de etapa + valor + responsável" pronto para uso — os endpoints de `changelog` trazem histórico de campo a campo. Vale avaliar, quando chegarmos na extração de fato, se dá para reconstituir o **Evento de Negócio (log)** definido no Doc 06 a partir desses changelogs, ou se o log novo simplesmente começa zerado a partir da entrada em produção do sistema novo (ver risco "perda de histórico" no Doc 00, seção 9).

---

## 6. API v1 vs v2

O Pipedrive mantém duas versões da API. Existe um guia oficial de migração entre elas (`pipedrive-api-v2-migration-guide`), ainda não lido em detalhe. Pontos já sabidos:
- Todos os endpoints `/collection` e a v2 usam cursor pagination.
- Endpoints v2 custam menos tokens de rate limit.
- **Decisão sobre qual versão usar na extração ainda não foi tomada** — não é decisão técnica implícita; fica para quando o Bloco 8 for aberto e/ou a extração for de fato executada.

---

## 7. Esboço do fluxo de extração (para o Claude Code executar no futuro)

Este é um esboço de **sequência de operações**, não uma decisão de arquitetura:

1. Ler token da API a partir de variável de ambiente.
2. Para cada entidade da tabela da seção 5:
   a. Chamar o endpoint de lista com `limit=500`.
   b. Acumular os registros de `data`.
   c. Repetir com o próximo `start`/`cursor` até paginação esgotar.
   d. Aguardar um pequeno intervalo entre chamadas (respeitar burst limit).
3. Persistir os dados brutos extraídos (ex.: JSON por entidade) **antes** de qualquer transformação — permite reprocessar sem bater na API de novo.
4. Mapear os campos brutos do Pipedrive para as entidades do Modelo de Domínio (Doc 06) — **este mapeamento ainda não existe** e deve ser produzido junto com o Bloco 8.
5. Gravar no banco de destino (Supabase, ou o que for decidido no Bloco 10).
6. Validar contagens (nº de negócios, organizações, pessoas, atividades extraídos vs. existentes no Pipedrive) antes de considerar a migração concluída.

---

## 8. Pendências que este documento não resolve

| Item | Motivo |
|---|---|
| Confirmação de que haverá migração de dados | P-002, aguarda Bloco 8 |
| Banco de dados de destino (Supabase ou outro) | Aguarda Bloco 10 — decisão do maestro |
| Mapeamento campo a campo Pipedrive → Modelo de Domínio | Aguarda Bloco 8 |
| Tratamento de custom fields do Pipedrive (se existirem, usam chaves hash) | Não investigado ainda — página `core-api-concepts-custom-fields` não lida em detalhe |
| Escolha entre API v1 e v2 para extração | Não é decisão técnica implícita — aguarda execução real |
| Reconstituição (ou não) do histórico de negócios via changelog | Aguarda decisão junto ao Bloco 8, à luz do risco de perda de histórico (Doc 00) |

---

## Changelog

- **v0.1** — 11/08/2026 — Criação do documento a pedido do maestro, a partir da leitura das páginas de Autenticação, Paginação, Respostas e Rate Limiting da documentação oficial do Pipedrive.
