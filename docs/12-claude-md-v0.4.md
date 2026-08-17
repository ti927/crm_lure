# CLAUDE.md — CRM Lure

> Contexto permanente do desenvolvimento. **Leia este arquivo inteiro antes de qualquer tarefa.**
> Documento 12 da biblioteca do projeto · v0.3 · 14/08/2026

---

## O que é este projeto

CRM próprio de uma consultoria empresarial, substituindo o Pipedrive. Construído para **até 10 usuários internos**, todos do mesmo domínio de e-mail.

**Motivo único: custo.** O Pipedrive atende bem; sai por preço. Isso significa que o norte é **paridade funcional com o uso atual**, não superação. Funcionalidade que o Pipedrive não tem e ninguém pediu é escopo indevido.

⚠️ **Prazo imutável: 3 de setembro de 2026.** O contrato do Pipedrive encerra nessa data, sem operação em paralelo. Virada seca.

---

## Regras de trabalho — não violar

1. **Nunca altere a estrutura do banco pelo painel do Supabase.** Toda mudança vira arquivo em `supabase/migrations/`, versionado no git, aplicado por CLI. Há **uma única base na nuvem** (D-101): o repositório é a única descrição confiável do schema, e o banco local precisa poder ser recriado igual a ela.
2. **Nomes de tabela e coluna em português, `snake_case`** (`negocio`, `motivo_perda`, `responsavel_id`). Código da aplicação em inglês onde for convenção do framework.
3. **Nunca carregue a base inteira no navegador.** São 2.458 negócios, 2.889 organizações, 4.589 pessoas e 6.483 atividades na base real. Paginação no servidor, lista virtualizada, Kanban carregando por partes.
4. **Todo componente novo é verificado nos dois temas**, claro e escuro. É critério de aceite, não detalhe.
5. **Nenhum segredo em variável `NEXT_PUBLIC_`.** Token do Bubble e chave de serviço só no servidor.
6. **Arquivos em UTF-8 com BOM. CSV sempre com separador ponto-e-vírgula.**
7. **Não tome decisão de produto sozinho.** Se faltar definição, pergunte. O projeto tem 114 decisões registradas no Doc 03 — provavelmente a resposta existe.
8. **Há um ambiente só.** O projeto do Supabase é o definitivo — o que guarda os dados (D-101, D-106). Não existe banco de desenvolvimento nem de ensaio: `npm run dev` aponta para a base real.

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

✅ **A carga aconteceu em 17/08/2026** e está conferida: 2.458 negócios, 2.889 organizações, 4.589 pessoas, 6.483 atividades, 922 anotações, com a soma dos ganhos batendo ao centavo com o Pipedrive (R$ 27.015.293,04). Roda por `scripts/carga-migracao.mjs`.

⚠️ **A carga não gerou evento nenhum** — o gatilho do log é `after update`, não `after insert`. O medo descrito acima não se materializa neste schema. A marcação `origem_carga` continua valendo para qualquer correção futura que faça `update` em massa.

⚠️ **O ensaio foi recuperado sem ambiente extra:** a carga roda dentro de uma transação única e `--ensaio` desfaz no fim. É assim que se testa qualquer recarga daqui pra frente — nunca direto.

⚠️ Ao ler `app.carga_migracao`, use `nullif(current_setting(...), '')` antes de converter para booleano. Depois que um `set local` sai de escopo, a variável fica valendo string vazia em vez de deixar de existir, e a conversão direta levanta erro — quebrando toda escrita em `negocio` na mesma conexão. Ver Doc 09, correção C-02.

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

Cada etapa carrega um status inicial sugerido. Cold Lead nasce `parado`.

⚠️ **A extração de 17/08 desmentiu a suposição de que a maior parte da base estaria parada.** O real: 74% dos negócios estão nas duas últimas etapas — **Proposta Enviada 1.168** e **Aguardando Contrato 642** —, contra 360 em Cold Lead. Dos 2.458, apenas 306 seguem abertos: 1.121 foram perdidos e 1.031 ganhos. Qualquer decisão de carregamento, ordenação ou desempenho tem que partir daí, não da intuição anterior.

**Status `parado` congela o negócio:** nenhuma automação o monitora, e ele fica fora dos indicadores de desempenho por padrão.

Outras regras que costumam ser esquecidas:

- **Atividade pertence a negócio, organização ou pessoa** — os três vínculos são opcionais e independentes, como no Pipedrive (D-108, revoga parte da D-030). Não é preferência: 76% das atividades da base real não têm negócio, e entre elas 125 das 206 pendências vivas dos sócios. O mesmo vale para anotação.
- **Um produto por negócio** (relação N:1). ⚠️ O Pipedrive não tinha **nenhum** produto cadastrado: a base nasce vazia aqui e o cadastro passa a ser feito neste sistema.
- **Não existe data prevista de fechamento** — logo, não existe previsão de receita. Não invente o campo.
- **Campos são fixos.** O usuário não cria campo personalizado.
- Anotação pertence ao negócio; as fichas de organização e pessoa mostram histórico **derivado**.

---

## Stack

| Camada | Escolha |
|---|---|
| Banco | Supabase (PostgreSQL) — **uma base na nuvem** (D-101), mais o banco local em contêiner |
| Hospedagem | Vercel — **um deploy** |
| Aplicação | Next.js 16 (App Router) + TypeScript |
| Estilo | Tailwind CSS **v4** + shadcn/ui — tema em CSS, sem `tailwind.config.ts` (P-025) |
| Dados no cliente | TanStack Query |
| Kanban | dnd-kit |
| Gráficos | Recharts (fase 2) |
| Ícones | lucide-react |
| Fonte | Archivo (Google Fonts) |

**Onde mora cada regra:**

- **Banco** — log por gatilho, imutabilidade do log, status fixo, integridade referencial, acesso por domínio, motivo obrigatório na perda.
- **Next.js** — trava de desfecho, follow-up de 90 dias, chamada ao Bubble, notificações.
- **Cliente** — validação de formulário, diálogos, experiência.

**Autenticação:** Google OAuth via Supabase, autorizado por domínio. Usuário nunca é excluído — apenas marcado inativo.

⚠️ **`usuario` não depende de conta de login** (D-109). A tabela tem id próprio e uma coluna `auth_id`, preenchida no primeiro login casando **por e-mail**. Quem foi migrado já existe antes de entrar; quem entra sem registro prévio é criado na hora, ativo, com papel único. Sem isso a carga não teria como atribuir responsável, porque roda antes de as pessoas entrarem.

---

## Identidade visual

Manual da **Lure** (BR/BAUEN, 2015). Princípio: **preto e branco de base, cor pontuando**. Nenhuma cor de marca aparece sem significar algo — etapa, status, estado semântico ou série de gráfico.

- Tokens em **`app/tokens.css`**; a ponte para os utilitários do Tailwind fica no bloco `@theme inline` de **`app/globals.css`**. **Não existe `tailwind.config.ts`** — o Tailwind v4 define o tema em CSS (P-025). O `docs/lure-crm-tokens.css` é registro do insumo original, não o arquivo em uso.
- **`#ffdd00` nunca é cor de texto.** Funciona como fundo com texto preto. Para texto ou borda, usar a variante `-ink`.
- **A distinção de etapa nunca depende só de cor** — o nome da etapa sempre aparece escrito.
- Linha de tabela: **44px**. Tema claro e escuro, ambos.

⚠️ **Nome de classe do Tailwind nunca pode ser montado em tempo de execução.** O v4 varre o código à procura de literais; `bg-status-${x}` simplesmente não é gerado, e a cor some sem erro nenhum. Escreva as classes por extenso em mapas — é o que `components/dominio/etiquetas.tsx` faz.

---

## Escopo do MVP

**Entra:** Negócios (Kanban com arrastar-e-soltar, Lista de dez colunas com filtro e ordenação em todas, detalhe em três zonas com aba Linha do Tempo) · Atividades (lista e calendário) · Contatos · Produtos/Serviços · trava de desfecho · quatro automações com notificação interna · **log de eventos** · exportação CSV · dois temas · Google OAuth · migração completa · **celular em modo consulta e marcação**.

**Fora — não construa:** **seletor de cliente Bubble no Ganho** (D-110, foi para fase final) · telas de estatísticas e painel de indicadores · mesclagem de duplicados · transferência entre usuários · telas de configuração · criação e edição pelo celular · metas · Google Agenda · API pública e webhooks · envio de e-mail (nenhum, em hipótese alguma) · múltiplas moedas · módulo de LGPD.

**Sobre o celular:** no dia 1 o vendedor **consulta** — Lista em cartões, busca, ficha do negócio, atividades, anotações, linha do tempo, Kanban uma etapa por vez, e marcar atividade como concluída. Criação e edição pelo celular são fase 2. Telas próprias, não apenas redimensionadas.

**Sobre as listas configuráveis** (origem, motivo de perda, área, tipo de atividade, etapas): existem no banco, populadas pela migração. Sem tela no MVP; edição pelo painel do Supabase.

---

## Critério de pronto

O Pipedrive só é desligado quando tudo isto for verdade:

1. ✅ Os **2.458** negócios estão migrados com organizações, pessoas, contatos, atividades e anotações — **contagens conferidas em 17/08**. Produtos não existiam no Pipedrive.
2. ⭐ **Os dois sócios operam um dia inteiro sem abrir o Pipedrive.**
3. O log de eventos está gravando desde o primeiro registro em produção. ✅ Nasceu limpo: a carga não gerou evento.
4. A trava de desfecho funciona.
5. ✅ Lista e Kanban respondem com a base real.
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
| 03 | Log de Decisões | **114 decisões com justificativa.** Consulte antes de perguntar |
| 06 | Modelo de Domínio | Entidades e regras, conceitual |
| 08 | UI e Design System | Cores, tipografia, densidade |
| 09 | **Arquitetura Técnica** | Schema físico, gatilhos, políticas |
| 14 | Referência da API Pipedrive | Endpoints para a extração |

---

## Changelog

- **v0.4** — 17/08/2026 — **Sessão 06: a extração corrigiu o documento.** A afirmação de que "a maior parte da base está parada" saiu — 74% dos negócios estão nas duas últimas etapas, e só 306 dos 2.458 seguem abertos. A carga **aconteceu** e está conferida; o medo de contaminar o log não se materializou, porque o gatilho é `after update` e não `after insert`. **D-108** revoga parte da D-030: atividade e anotação podem pertencer a organização ou pessoa, como no Pipedrive — 76% das atividades da base não têm negócio. **D-109**: `usuario` deixa de depender de conta de login. **D-110**: o seletor do Bubble sai do MVP. Volume real corrigido em todo o documento: 2.458 negócios e 2.889 organizações, não 2.453 e 422.
- **v0.3** — 14/08/2026 — **Sessão 05.** Regra 8 acrescentada: há um ambiente só, e `npm run dev` aponta para a base real. A seção "A carga da migração" corrigida por **D-106**, que revogou a D-102 — não há ensaio, a carga é operação de uma tentativa só, e o backup verificado passa a ser a mitigação principal. Identidade visual corrigida: os tokens estão em `app/tokens.css` e a ponte em `app/globals.css`, **não** em `tailwind.config.ts`, que não existe — o texto anterior contradizia a própria tabela de stack. O aviso do bloco `spacing` saiu (resolvido em P-025) e deu lugar ao que de fato morde no Tailwind v4: nome de classe montado em tempo de execução não é gerado. Contagem de decisões atualizada para 106.
- **v0.2** — 14/08/2026 — D-101: base única na nuvem, carga direto em produção, ensaio no banco local. Aviso de C-02 (o `nullif` na leitura de `app.carga_migracao`) acrescentado à seção do que não pode dar errado. Stack atualizada para Next.js 16 e Tailwind v4 (P-025 encerrada).
- **v0.1** — 13/08/2026 — Criação ao fim da Fase 1, com 100 decisões registradas e o MVP recortado pelo Bloco 12.
