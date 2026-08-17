# 13 — Glossário (v0.1)

| Campo | Valor |
|---|---|
| **Documento** | Glossário |
| **Projeto** | CRM próprio (substituição do Pipedrive) |
| **Versão** | v0.1 |
| **Data** | 13/08/2026 |
| **Status** | rascunho |

> Vocabulário padronizado. Onde o termo do projeto difere do uso comum de mercado, isso está dito — é justamente aí que nascem os mal-entendidos.

---

## Domínio

**Negócio**
A oportunidade comercial. ⚠️ **Neste projeto, "negócio" é qualquer contato registrado, não uma oportunidade qualificada.** Cada contato novo vira um negócio entrando por Cold Lead (D-086). Por isso a base tem 2.453 negócios para 422 organizações, e por isso a maioria está com status Parado. Exige título e organização; nada mais.

**Organização**
Entidade central do modelo. A empresa cliente ou prospecto. Clientes pessoa física são cadastrados como organização comum, sem diferenciação (D-027).

**Pessoa**
O contato humano dentro de uma ou mais organizações. ⚠️ **O cargo não pertence à pessoa** — pertence ao vínculo com cada organização (D-036).

**Forma de contato**
Telefone ou e-mail de uma pessoa. Lista simples, sem rótulo e sem marcação de principal (D-034).

**Atividade**
Ação vinculada a um negócio: chamada, reunião, tarefa, e-mail. Serve como **histórico** quando passada e concluída, e como **agenda** quando futura e pendente. ⚠️ Pertence a **negócio, organização ou pessoa** — vínculos opcionais e independentes (D-108, revoga parte da D-030).

**Anotação**
Texto livre vinculado ao negócio. Entidade **distinta** de atividade: não tem data de agenda nem conclusão (D-029).

**Produto/Serviço**
O que está sendo vendido. Um por negócio, não obrigatório (D-032, D-037). Pertence a uma área.

**Área**
Classificação do produto/serviço. Lista configurável — hoje cinco.

**Origem**
De onde veio o negócio. Lista configurável. Campo que não existe no Pipedrive atual — é o extra E-001, aprovado para o MVP.

**Motivo de perda**
Por que o negócio foi perdido. Lista configurável. **Obrigatório** quando o desfecho é Perdido.

---

## Funil

**Funil**
O conjunto ordenado de etapas. Hoje um só; o modelo comporta vários (E-002, sem tela no MVP).

**Etapa**
Posição do negócio no funil. Configurável. As seis atuais:
Cold Lead → Hot Lead → Contato Realizado → Apresentação Realizada → Proposta Enviada → **Aguardando Contrato**

⚠️ **Cold Lead e Hot Lead são classificações de entrada equivalentes**, não progressão (D-013).

**Aguardando Contrato**
A sexta e última etapa. É a etapa de fechamento, e a **única com trava**: entrar nela exige declarar o desfecho.

**Status**
Estado do negócio, em dimensão **independente** da etapa (D-043). ⚠️ **Fixo em quatro valores, não configurável** (D-042):

| Status | Significado |
|---|---|
| **Parado** | Cadastro dormente ou negócio congelado. Suspende todas as automações. Fica fora dos indicadores de desempenho por padrão. **É a maioria da base — não é anomalia** |
| **Negociação** | Negócio ativo, em condução |
| **Ganho** | Desfecho positivo. Encerra o negócio |
| **Perdido** | Desfecho negativo. Exige motivo. Encerra o negócio |

⚠️ **Ganho e Perdido não são etapas** — são status (D-044). Erro comum, porque no Pipedrive aparecem como colunas.

**Status inicial sugerido**
O status que um negócio assume ao entrar em determinada etapa. Configurável por etapa (D-045). Cold Lead sugere Parado; as demais, Negociação.

**Trava de desfecho**
⚠️ A **única** regra de bloqueio do sistema (D-047). Mover ou criar um negócio em Aguardando Contrato abre diálogo obrigatório pedindo Ganho ou Perdido. Todas as outras transições entre etapas são livres.

---

## Sistema

**Evento de negócio / Log**
Registro automático de toda mudança de etapa, valor, responsável ou status. Gerado por **gatilho no banco**, não pela aplicação (D-081). Tabela **somente inserção**: nunca alterada, nunca excluída. ⚠️ Item **não-postergável**: sem ele em produção desde o dia 1, os indicadores de funil de conversão, lead time e valor inicial × fechado não são recuperáveis (D-033).

**Carga de migração**
A entrada única dos dados do Pipedrive. Roda com marcação especial para que os eventos gerados não contaminem os cálculos de tempo (`origem_carga = true`).

**Linha do Tempo**
Aba da tela de detalhe que exibe o histórico do negócio, com seletor de três posições: **Usuário · Sistema · Tudo** (D-058). Separa o que uma pessoa escreveu do que o sistema registrou.

**Indicador**
Entidade do catálogo de estatísticas: nome, métrica, eixos admissíveis, tipo de gráfico (D-062). Treze no catálogo inicial. **Todo o módulo é fase 2** (D-093) — mas o log que o alimenta é MVP.

**Painel do usuário**
A relação entre um usuário e os indicadores que ele escolheu exibir, com ordem e filtros salvos. Fase 2.

**Notificação**
Alerta interno ao aplicativo. ⚠️ **Nunca por e-mail** (D-041, R-005).

**Papel**
Agrupamento de permissões. No MVP existe **um só**, de acesso total (D-049). A estrutura Usuário → Papel → Permissão existe no modelo desde o início, sem tela de gestão.

---

## Projeto e método

**Maestro**
O decisor do projeto. Nenhuma decisão de produto ou técnica entra na documentação sem validação explícita dele (Doc 01, princípio 1).

**Consultor**
Papel de quem conduz a documentação: propõe, organiza, aponta riscos e alternativas. Não decide.

**Extra (E-00x)**
Item que **ultrapassa a paridade** com o uso atual do Pipedrive. Treze registrados. Marcá-los é regra do método, para que o escopo não cresça sem que se perceba.

**Decisão (D-00x)**
Registro validado no Doc 03, com data e justificativa. Cem até aqui.

**Restrição de arquitetura (R-00x)**
Limite que qualquer solução técnica precisa respeitar. Nove registradas.

**Ponto em aberto (A-0x) / Pendência (P-0xx)**
Questão ainda não resolvida. As `A` pertencem ao modelo de domínio; as `P` ao andamento do projeto.

**Paridade**
O norte do produto: fazer o que o Pipedrive faz **no uso atual da empresa**, não tudo o que o Pipedrive oferece (D-008).

---

## Sistemas externos

**Pipedrive**
O CRM sendo substituído. Contrato encerra em **3/9/2026**, quando o acesso à API também termina.

**Bubble**
Plataforma onde a empresa mantém seu **sistema interno próprio**, para onde o cliente migra depois do ganho (D-075). Única integração do MVP: o seletor de cliente no diálogo de Ganho.

**Identificador externo (Bubble)**
Campo da Organização que guarda o ID do cliente correspondente no sistema Bubble. Preenchido por busca manual, nunca por casamento automático de nome (D-076).

**Supabase**
Banco de dados PostgreSQL gerenciado. Também provê autenticação e políticas de acesso.

**Vercel**
Hospedagem da aplicação Next.js.

---

## Convenções

**CSV do projeto**
Sempre com separador **ponto-e-vírgula** e codificação **UTF-8 com BOM** (D-004). Vale para exportação do sistema e para qualquer arquivo da biblioteca.

**Nomes no banco**
Português, `snake_case` (D-099).

**Formato brasileiro**
Datas dd/mm/aaaa, valores R$ 100.000,00, fuso de Brasília, real como moeda única (D-087).

---

## Changelog

- **v0.1** — 13/08/2026 — Criação ao fim da Fase 1.
