# CLAUDE.md — CRM Lure

> Contexto permanente do desenvolvimento. **Leia este arquivo inteiro antes de qualquer tarefa.**
> Documento 12 da biblioteca do projeto · v0.1 · 13/08/2026

---

## O que é este projeto

CRM próprio de uma consultoria empresarial, substituindo o Pipedrive. Construído para **até 10 usuários internos**, todos do mesmo domínio de e-mail.

**Motivo único: custo.** O Pipedrive atende bem; sai por preço. Isso significa que o norte é **paridade funcional com o uso atual**, não superação. Funcionalidade que o Pipedrive não tem e ninguém pediu é escopo indevido.

⚠️ **Prazo imutável: 3 de setembro de 2026.** O contrato do Pipedrive encerra nessa data, sem operação em paralelo. Virada seca.

---

## Regras de trabalho — não violar

1. **Nunca altere a estrutura do banco pelo painel do Supabase.** Toda mudança vira arquivo em `supabase/migrations/`, versionado no git, aplicado por CLI. Dois ambientes precisam de estrutura reprodutível.
2. **Nomes de tabela e coluna em português, `snake_case`** (`negocio`, `motivo_perda`, `responsavel_id`). Código da aplicação em inglês onde for convenção do framework.
3. **Nunca carregue a base inteira no navegador.** São 2.453 negócios hoje. Paginação no servidor, lista virtualizada, Kanban carregando por partes.
4. **Todo componente novo é verificado nos dois temas**, claro e escuro. É critério de aceite, não detalhe.
5. **Nenhum segredo em variável `NEXT_PUBLIC_`.** Token do Bubble e chave de serviço só no servidor.
6. **Arquivos em UTF-8 com BOM. CSV sempre com separador ponto-e-vírgula.**
7. **Não tome decisão de produto sozinho.** Se faltar definição, pergunte. O projeto tem 100 decisões registradas no Doc 03 — provavelmente a resposta existe.

---

## O que não pode dar errado

Três coisas neste sistema não são recuperáveis se saírem erradas. Elas têm prioridade sobre prazo, sobre elegância e sobre qualquer atalho.

### 1. O log de eventos precisa existir desde o primeiro dia em produção

A tabela `evento_negocio` registra toda mudança de **etapa, valor, responsável e status** de um negócio. Ela é gerada por **gatilho no banco**, nunca pela aplicação — assim o evento nasce qualquer que seja a origem da escrita: tela, script de migração ou futuro agente de IA.

- A tabela é **somente inserção**. `update` e `delete` são revogados. Não é convenção, é permissão.
- Se o log entrar depois da virada, os indicadores de funil de conversão, lead time e valor inicial × fechado nascem cegos, **e não há como recuperar**.
- As telas de estatística ficaram para a fase 2. **O log não.**

### 2. A carga da migração não pode contaminar o log

Os 2.453 negócios entram de uma vez. Se isso disparar o gatilho normalmente, o log nasce com milhares de eventos falsos datados do dia da migração, e todo cálculo de lead time vira ficção.

A carga roda com `set local app.carga_migracao = true`, e os eventos gerados ficam marcados em `origem_carga`. Todo indicador filtra `origem_carga = false`.

### 3. A trava de desfecho

Mover ou criar um negócio na etapa **Aguardando Contrato** abre diálogo obrigatório pedindo o desfecho: Ganho ou Perdido. Se Perdido, o motivo também é obrigatório — e isso está reforçado por restrição no banco.

É a **única trava do sistema**. Todo o resto das transições entre etapas é livre, por decisão explícita.

---

## Modelo de domínio, em resumo

Detalhamento no Doc 06; estrutura física no Doc 09.

**Organização** é a entidade central — clientes pessoa física entram como organização comum. **Negócio** exige título e organização; nada mais é obrigatório. **Pessoa** se vincula a organizações, e **o cargo pertence ao vínculo**, não à pessoa.

**Status e Etapa são dimensões independentes:**

- **Etapa** — configurável. Hoje seis: Cold Lead → Hot Lead → Contato Realizado → Apresentação Realizada → Proposta Enviada → Aguardando Contrato.
- **Status** — **fixo em código, quatro valores**: `parado`, `negociacao`, `ganho`, `perdido`. Não é lista configurável. Ganho e Perdido **não são etapas**.

Cada etapa carrega um status inicial sugerido. Cold Lead nasce `parado` — o que significa que **a maior parte da base está parada**, e isso é normal, não é problema a ser sinalizado.

**Status `parado` congela o negócio:** nenhuma automação o monitora, e ele fica fora dos indicadores de desempenho por padrão.

Outras regras que costumam ser esquecidas:

- **Toda atividade pertence a um negócio.** Não existe atividade órfã.
- **Um produto por negócio** (relação N:1).
- **Não existe data prevista de fechamento** — logo, não existe previsão de receita. Não invente o campo.
- **Campos são fixos.** O usuário não cria campo personalizado.
- Anotação pertence ao negócio; as fichas de organização e pessoa mostram histórico **derivado**.

---

## Stack

| Camada | Escolha |
|---|---|
| Banco | Supabase (PostgreSQL) |
| Hospedagem | Vercel |
| Aplicação | Next.js (App Router) + TypeScript |
| Estilo | Tailwind CSS + shadcn/ui |
| Dados no cliente | TanStack Query |
| Kanban | dnd-kit |
| Gráficos | Recharts (fase 2) |
| Ícones | lucide-react |
| Fonte | Archivo (Google Fonts) |

**Onde mora cada regra:**

- **Banco** — log por gatilho, imutabilidade do log, status fixo, integridade referencial, acesso por domínio, motivo obrigatório na perda.
- **Next.js** — trava de desfecho, follow-up de 90 dias, chamada ao Bubble, notificações.
- **Cliente** — validação de formulário, diálogos, experiência.

**Autenticação:** Google OAuth via Supabase, autorizado por domínio. O primeiro login de uma conta do domínio **cria o usuário automaticamente**, ativo, com papel único de acesso total. Usuário nunca é excluído — apenas marcado inativo.

---

## Identidade visual

Manual da **Lure** (BR/BAUEN, 2015). Princípio: **preto e branco de base, cor pontuando**. Nenhuma cor de marca aparece sem significar algo — etapa, status, estado semântico ou série de gráfico.

- Tokens em `lure-crm-tokens.css`; tema no `tailwind.config.ts`.
- **`#ffdd00` nunca é cor de texto.** Funciona como fundo com texto preto. Para texto ou borda, usar a variante `-ink`.
- **A distinção de etapa nunca depende só de cor** — o nome da etapa sempre aparece escrito.
- Linha de tabela: **44px**. Tema claro e escuro, ambos.

⚠️ O bloco `spacing` do `tailwind.config.ts` redefine a escala padrão e quebra os componentes do shadcn/ui. **Remover antes de começar.**

---

## Escopo do MVP

**Entra:** Negócios (Kanban com arrastar-e-soltar, Lista de dez colunas com filtro e ordenação em todas, detalhe em três zonas com aba Linha do Tempo) · Atividades (lista e calendário) · Contatos · Produtos/Serviços · trava de desfecho · seletor de cliente Bubble no Ganho · quatro automações com notificação interna · **log de eventos** · exportação CSV · dois temas · Google OAuth · migração completa · **celular em modo consulta e marcação**.

**Fora — não construa:** telas de estatísticas e painel de indicadores · mesclagem de duplicados · transferência entre usuários · telas de configuração · criação e edição pelo celular · metas · Google Agenda · API pública e webhooks · envio de e-mail (nenhum, em hipótese alguma) · múltiplas moedas · módulo de LGPD.

**Sobre o celular:** no dia 1 o vendedor **consulta** — Lista em cartões, busca, ficha do negócio, atividades, anotações, linha do tempo, Kanban uma etapa por vez, e marcar atividade como concluída. Criação e edição pelo celular são fase 2. Telas próprias, não apenas redimensionadas.

**Sobre as listas configuráveis** (origem, motivo de perda, área, tipo de atividade, etapas): existem no banco, populadas pela migração. Sem tela no MVP; edição pelo painel do Supabase.

---

## Critério de pronto

O Pipedrive só é desligado quando tudo isto for verdade:

1. Os 2.453 negócios estão migrados com organizações, pessoas, contatos, atividades, anotações e produtos — e **as contagens batem**.
2. ⭐ **Os dois sócios operam um dia inteiro sem abrir o Pipedrive.**
3. O log de eventos está gravando desde o primeiro registro em produção.
4. A trava de desfecho funciona.
5. Lista e Kanban respondem com a base real, não com dados de teste.
6. O celular abre e é utilizável para consulta.
7. Login por Google funciona para as contas do domínio.

---

## Vocabulário do projeto

| Termo | Significado aqui |
|---|---|
| **Negócio** | Qualquer contato registrado — **não** é oportunidade qualificada. Cada contato novo vira um negócio em Cold Lead |
| **Maestro** | O cliente/decisor do projeto. Nenhuma decisão de produto ou técnica acontece sem ele |
| **Etapa** | Posição no funil. Configurável |
| **Status** | Estado do negócio. Fixo em quatro valores |
| **Parado** | Cadastro dormente. É a maioria da base e não é anomalia |
| **Extra (E-0xx)** | Item que ultrapassa a paridade com o Pipedrive |
| **Bubble** | Sistema interno da empresa, onde o cliente entra depois do ganho |

---

## Biblioteca de documentos

| # | Documento | Para quê |
|---|---|---|
| 00 | Status e Retomada | Onde o projeto está |
| 03 | Log de Decisões | **100 decisões com justificativa.** Consulte antes de perguntar |
| 06 | Modelo de Domínio | Entidades e regras, conceitual |
| 08 | UI e Design System | Cores, tipografia, densidade |
| 09 | **Arquitetura Técnica** | Schema físico, gatilhos, políticas |
| 14 | Referência da API Pipedrive | Endpoints para a extração |

---

## Changelog

- **v0.1** — 13/08/2026 — Criação ao fim da Fase 1, com 100 decisões registradas e o MVP recortado pelo Bloco 12.
