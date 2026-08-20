# CLAUDE.md — CRM Lure

> Contexto permanente do desenvolvimento. **Leia este arquivo inteiro antes de qualquer tarefa.**
> Documento 12 da biblioteca do projeto · v0.11 · 20/08/2026

---

## O que é este projeto

CRM próprio de uma consultoria empresarial, substituindo o Pipedrive. Construído para **até 10 usuários internos**, todos do mesmo domínio de e-mail.

**Motivo único: custo.** O Pipedrive atende bem; sai por preço. Isso significa que o norte é **paridade funcional com o uso atual**, não superação. Funcionalidade que o Pipedrive não tem e ninguém pediu é escopo indevido.

✅ **Não há prazo de virada** (D-125, 19/08/2026 — revoga D-069 e R-008). O prazo de 3/9 existia por um motivo só: a API do Pipedrive fecharia junto com o contrato e os dados ficariam inacessíveis. **A extração e a carga aconteceram em 17/08 e estão conferidas ao centavo** — a base inteira vive no Supabase, independente do Pipedrive. A virada acontece quando o sistema estiver pronto, não numa data. Não trate prazo como argumento em decisão nenhuma.

---

## Regras de trabalho — não violar

1. **Nunca altere a estrutura do banco pelo painel do Supabase.** Toda mudança vira arquivo em `supabase/migrations/`, versionado no git, aplicado por CLI. Há **uma única base na nuvem** (D-101): o repositório é a única descrição confiável do schema, e o banco local precisa poder ser recriado igual a ela.
2. **Nomes de tabela e coluna em português, `snake_case`** (`negocio`, `motivo_perda`, `responsavel_id`). Código da aplicação em inglês onde for convenção do framework.
3. **Nunca carregue a base inteira no navegador.** São 2.458 negócios, 2.889 organizações, 4.589 pessoas e 6.483 atividades na base real. Paginação no servidor, lista virtualizada, Kanban carregando por partes.
4. **Todo componente novo é verificado nos dois temas**, claro e escuro. É critério de aceite, não detalhe.
5. **Nenhum segredo em variável `NEXT_PUBLIC_`.** Token do Bubble e chave de serviço só no servidor.
6. **Arquivos em UTF-8 com BOM. CSV sempre com separador ponto-e-vírgula.** ⚠️ **Exceção: arquivos `.css` não levam BOM** — um BOM antes de `@import` quebra o parser do Tailwind com "Invalid dangling combinator in selector", e o erro aponta para o arquivo gerado, não para a causa.
7. **Não tome decisão de produto sozinho.** Se faltar definição, pergunte. O projeto tem 143 decisões registradas no Doc 03 — provavelmente a resposta existe.
8. **Há um ambiente só.** O projeto do Supabase é o definitivo — o que guarda os dados (D-101, D-106). Não existe banco de desenvolvimento nem de ensaio: `npm run dev` aponta para a base real.

---

## O que não pode dar errado

Três coisas neste sistema não são recuperáveis se saírem erradas. Elas têm prioridade sobre prazo, sobre elegância e sobre qualquer atalho.

### 1. O log de eventos precisa existir desde o primeiro dia em produção

A tabela `evento_negocio` registra toda mudança de **etapa, valor, responsável e status** de um negócio. Ela é gerada por **gatilho no banco**, nunca pela aplicação — assim o evento nasce qualquer que seja a origem da escrita: tela, script de migração ou futuro agente de IA.

- A tabela é **somente inserção**. `update` e `delete` são revogados. Não é convenção, é permissão.
- Se o log entrar depois da virada, os indicadores de funil de conversão, lead time e valor inicial × fechado nascem cegos, **e não há como recuperar**.
- ✅ **As telas de estatística voltaram ao escopo em 19/08 (D-130)** — e só foram possíveis porque o log existia. A D-093 as tinha adiado; metade da justificativa era o prazo, que caiu com a D-125.

### 2. A carga da migração não pode contaminar o log

Os 2.453 negócios entram de uma vez. Se isso disparar o gatilho normalmente, o log nasce com milhares de eventos falsos datados do dia da migração, e todo cálculo de lead time vira ficção.

A carga roda com `set local app.carga_migracao = true`, e os eventos gerados ficam marcados em `origem_carga`. Todo indicador filtra `origem_carga = false`.

⚠️ **Procedência tem TRÊS estados desde 19/08 (D-129)**, não dois. `evento_negocio` ganhou a coluna `importado_do_pipedrive`:

| Pergunta | Filtro |
|---|---|
| Aconteceu de verdade? | `not origem_carga` — **inclui** o histórico importado |
| Aconteceu **neste** sistema? | `not origem_carga and not importado_do_pipedrive` |

A regra acima segue valendo palavra por palavra: os indicadores filtram `origem_carga = false`. O que mudou é que **3.406 eventos reais de 2021 a 2026**, reconstituídos do changelog do Pipedrive, agora entram nessa conta — sem eles, funil de conversão, lead time e valor inicial × fechado nasceriam cegos. Carregados por `scripts/carga-changelog.mjs`, que ensaia por padrão e recusa rodar duas vezes.

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

⚠️ **A base tem duas sujeiras estruturais, medidas em 18/08.** (a) **1.195 das 2.889 organizações são duplicata de nome** — 668 grupos, 41% da lista; "Sicoob Credseguro" aparece seis vezes. A Lista **agrupa na apresentação** (D-121), o que **não é mesclagem** — mesclar segue fora do MVP. (b) **388 registros vieram com acento destruído** direto do Pipedrive, não da carga; 343 foram recuperados por `scripts/recupera-acentos.mjs` e **45 seguem quebrados** (C-07).

⚠️ **A extração de 17/08 desmentiu a suposição de que a maior parte da base estaria parada.** O real: 74% dos negócios estão nas duas últimas etapas — **Proposta Enviada 1.168** e **Aguardando Contrato 642** —, contra 360 em Cold Lead. Dos 2.458, apenas 306 seguem abertos: 1.121 foram perdidos e 1.031 ganhos. Qualquer decisão de carregamento, ordenação ou desempenho tem que partir daí, não da intuição anterior.

**Status `parado` congela o negócio:** nenhuma automação o monitora, e ele fica fora dos indicadores de desempenho por padrão.

Outras regras que costumam ser esquecidas:

- **Atividade pertence a negócio, organização ou pessoa** — os três vínculos são opcionais e independentes, como no Pipedrive (D-108, revoga parte da D-030). Não é preferência: 76% das atividades da base real não têm negócio, e entre elas 125 das 206 pendências vivas dos sócios. O mesmo vale para anotação.
- **Um produto por negócio** (relação N:1). ⚠️ O Pipedrive não tinha **nenhum** produto cadastrado: a base nasce vazia aqui e o cadastro passa a ser feito neste sistema.
- **Não existe data prevista de fechamento** — logo, não existe previsão de receita. Não invente o campo. ⚠️ `negocio.fechado_em` (D-131) **não é isso**: ela registra quando o desfecho *aconteceu*, e é o eixo do relatório financeiro. Nunca use para prever.
- **Campos são fixos.** O usuário não cria campo personalizado.
- Anotação pertence ao negócio; as fichas de organização e pessoa mostram histórico **derivado**.
- **Telefone abre o WhatsApp por `whatsapp://`**, nunca por `wa.me` (D-138). O link universal carrega uma página antes de abrir o aplicativo e deixa uma aba órfã por clique. Função única em `lib/formato.ts`.

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
| Gráficos | Recharts — **em uso** desde 19/08 (D-130) |
| Ícones | lucide-react |
| Fonte | Archivo (Google Fonts) |

**Onde mora cada regra:**

- **Banco** — log por gatilho, imutabilidade do log, status fixo, integridade referencial, acesso por domínio, motivo obrigatório na perda.
- **Next.js** — trava de desfecho, follow-up de 90 dias, chamada ao Bubble, notificações.
- **Cliente** — validação de formulário, diálogos, experiência.

**Autenticação:** Google OAuth via Supabase, autorizado por domínio. Usuário nunca é excluído — apenas marcado inativo.

⚠️ **Depois de qualquer mexida em identidade, procure `auth.uid()` no schema inteiro.** A D-109 quebrou o gatilho do log sem que nada acusasse: ele gravava `auth.uid()` numa coluna que aponta para `usuario(id)`, e a escrita inteira passou a falhar para quem veio da carga. Um usuário real ficou sem conseguir trabalhar até isso ser achado (C-05, Doc 09 §3.11).

⚠️ **`usuario` não depende de conta de login** (D-109). A tabela tem id próprio e uma coluna `auth_id`, preenchida no primeiro login casando **por e-mail**. Quem foi migrado já existe antes de entrar; quem entra sem registro prévio é criado na hora, ativo, com papel único. Sem isso a carga não teria como atribuir responsável, porque roda antes de as pessoas entrarem.

---

## Identidade visual

Manual da **Lure** (BR/BAUEN, 2015). Princípio: **preto e branco de base, cor pontuando**. Nenhuma cor de marca aparece sem significar algo — etapa, status, estado semântico ou série de gráfico.

- Tokens em **`app/tokens.css`**; a ponte para os utilitários do Tailwind fica no bloco `@theme inline` de **`app/globals.css`**. **Não existe `tailwind.config.ts`** — o Tailwind v4 define o tema em CSS (P-025). O `docs/lure-crm-tokens.css` é registro do insumo original, não o arquivo em uso.
- **`#ffdd00` nunca é cor de texto.** Funciona como fundo com texto preto. Para texto ou borda, usar a variante `-ink`.
- **A distinção de etapa nunca depende só de cor** — o nome da etapa sempre aparece escrito.
- Linha de tabela: **44px**. Tema claro e escuro, ambos.

**Gráficos** (D-133): nenhum hex entra sem passar pelo validador de paleta — banda de luminosidade, croma, separação sob daltonismo e contraste são **medidos**. Categoria nominal não ganha uma cor por item (vira arco-íris e a cor troca de dono ao filtrar); a hierarquia vem da intensidade e do rótulo escrito. Cor por item só onde significa: **status** e **etapa**. Nunca dois eixos no mesmo gráfico. O brilho neon exige **tema escuro e interruptor ligado** (D-135).

**Movimento** (D-116): entrada escalonada sempre com teto — dez a catorze itens, senão cascata vira espera. O que se arrasta **sai do plano da tela** (inclina, cresce, ganha sombra) em vez de deslizar nele. ⚠️ **`prefers-reduced-motion` desliga tudo**, por guarda global no `globals.css`: movimento não pedido causa enjoo em quem tem sensibilidade vestibular. Nada some, só para.

⚠️ **NADA QUE SEJA FUNÇÃO atravessa a fronteira servidor→cliente.** Este aviso já existia e ainda assim derrubou a rota de estatísticas em 19/08 — duas vezes no mesmo dia (C-09 e C-10). Vale para `onClick`, `onChange`, `onSubmit`, `onBlur`, **e também para um formatador passado como propriedade** (`formata={(v) => ...}`) ou para a reexportação de um componente de cliente por `const`. Passe um **nome** e deixe o componente de cliente escolher a função.

⚠️ **`tsc`, `eslint` e `next build` NÃO pegam esse defeito** — ele é de tempo de execução, na serialização. O que pega é rodar a página. Como o Google OAuth impede o agente de logar, o caminho é: desligar `PUBLICAS` em `proxy.ts` **localmente**, `npm run build && npm run start`, pedir a rota por `curl`, ler a pilha no log do servidor e **restaurar o `proxy.ts`**. Sem sessão a RLS devolve vazio, então isso testa o caminho de dado vazio — suficiente para erro de serialização, insuficiente para o resto.

⚠️ *(histórico)* **Manipulador de evento não atravessa a fronteira servidor→cliente.** Montar JSX num Server Component e entregá-lo a um Client Component é padrão útil e usado aqui (a tabela virtualizada recebe as linhas prontas), mas qualquer `onClick`, `onChange`, `onSubmit` ou `onBlur` nesse JSX **derruba a rota inteira** na serialização. Foi o que quebrou a aba Pessoas (C-06, Doc 09 §3.11). Depois de mexer numa página desse tipo, varra os Server Components à procura desses atributos.

⚠️ **Nome de classe do Tailwind nunca pode ser montado em tempo de execução.** O v4 varre o código à procura de literais; `bg-status-${x}` simplesmente não é gerado, e a cor some sem erro nenhum. Escreva as classes por extenso em mapas — é o que `components/dominio/etiquetas.tsx` faz.

---

## Escopo do MVP

**Entra:** Negócios (Kanban com arrastar-e-soltar, Lista de dez colunas com filtro e ordenação em todas, detalhe em três zonas com aba Linha do Tempo) · Atividades (lista e calendário) · Contatos · Produtos/Serviços · trava de desfecho · quatro automações com notificação interna · **log de eventos** · exportação CSV · dois temas · Google OAuth · migração completa · **celular em modo consulta e marcação** · **Estatísticas** (D-130: os treze indicadores da D-063, com recortes e CSV).

✅ **A F8 (automações e notificações) está construída** desde 20/08 — **Doc 15 v0.3**. Sino no cabeçalho, painel em `/notificacoes`, follow-up ao ganhar. O que sustenta o desenho:

- Os alertas são **derivados na leitura** (D-124) — não há agendador, e a consulta custa **1,65 ms** na base real. A restrição é **número de idas ao banco**, não custo de consulta: os quatro alertas saem de **uma função só**.
- O limite de "negócio parado" e a antecedência do lembrete são **escolha do usuário em degraus** — 30/45/60/90 com padrão 60 (D-139) e 1/2/3/7 com padrão 1 (D-140).
- O número do sino conta **só o que exige ação** (D-141). Lembrete de atividade futura aparece sem contar.
- ⚠️ **A entidade Notificação não vira tabela** (encerra P-014 e P-027). Grava-se **preferência** e **o que foi lido**; a notificação em si é derivada. Guardar o lido em vez do gerado é o que permite dispensar o agendador — quando a causa some, o alerta some sozinho.

⚠️ **`preferencia_notificacao` e `notificacao_lida` são as primeiras tabelas com RLS por usuário.** Todas as outras usam `pertence_ao_dominio()` (D-050). A política compara com `public.usuario_atual()` e **nunca com `auth.uid()`** — desde a D-109 os dois são diferentes, e a comparação errada deixaria o sino mudo exatamente para quem veio da carga, sem erro nenhum na tela. É a armadilha da C-05.

⚠️ **Ela mordeu de novo, no lugar mais improvável: no próprio teste.** A primeira rodada de `scripts/ensaia-notificacoes.mjs` devolveu zero alerta para todo mundo. A causa não era a política — era o JWT falso do ensaio, com e-mail inventado: `usuario_atual()` não é `security definer`, então lê `usuario` sob RLS, e a política daquela tabela confere o **domínio do e-mail**. Domínio errado, consulta vazia, `usuario_atual()` nulo, sino mudo. **Nenhum erro em lugar nenhum.** É o mesmo sintoma da C-05 por uma terceira porta — e a lição é que o alerta vazio nunca deve ser lido como "não há alertas" sem antes conferir quem o banco acha que você é.

⚠️ **O sino vive no LAYOUT, não numa rota.** Um erro de serialização ali derruba **todas as telas de uma vez**. O layout passa só dados; o sino é que é Client Component. Ver o método de verificação por `curl` acima — foi ele que confirmou as sete rotas respondendo 200.

**Fora — não construa:** **seletor de cliente Bubble no Ganho** (D-110, foi para fase final) · **construtor genérico de relatórios** (E-008 — o catálogo de indicadores existe, o construtor não) · metas e seu acompanhamento · mesclagem de duplicados · transferência entre usuários · telas de configuração · criação e edição pelo celular · Google Agenda · API pública e webhooks · envio de e-mail (nenhum, em hipótese alguma) · múltiplas moedas · módulo de LGPD.

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
| 03 | Log de Decisões | **143 decisões com justificativa.** Consulte antes de perguntar |
| 06 | Modelo de Domínio | Entidades e regras, conceitual |
| 08 | UI e Design System | Cores, tipografia, densidade |
| 09 | **Arquitetura Técnica** | Schema físico, gatilhos, políticas |
| 14 | Referência da API Pipedrive | Endpoints para a extração |
| 15 | **Central de Notificações** | O plano da F8, validado — schema, alertas, telas e critérios de aceite |

---

## Changelog

- **v0.11** — 20/08/2026 — **A F8 saiu do papel na mesma sessão que a destravou.** O bloco da F8 deixa de descrever um plano e passa a descrever o que existe. Entra o aviso que esta sessão pagou para aprender: a armadilha da C-05 apareceu por uma **terceira porta** — não na política nova, mas no e-mail falso do próprio script de ensaio, porque `usuario_atual()` lê `usuario` sob RLS e aquela política confere o domínio do e-mail. Zero alerta, zero erro. Fica a regra: **sino vazio não é prova de que não há alertas**. Reforçado que o sino mora no layout, onde um defeito derruba todas as telas de uma vez. **143 decisões.**
- **v0.10** — 20/08/2026 — **A F8 deixou de depender de decisão.** O bloco que dizia "faltam definir o prazo do negócio parado e a antecedência do lembrete" foi substituído pelo que ficou decidido (**D-139** a **D-142**, Doc 15 v0.2): os dois prazos viraram **escolha do usuário em degraus**, o sino conta **só o que exige ação**, e a entidade Notificação **não vira tabela** — encerrando P-014 e P-027, abertas desde o Bloco 4. Entra o aviso de que as duas tabelas novas são as **primeiras com RLS por usuário** e por isso comparam com `usuario_atual()` e nunca com `auth.uid()` — a armadilha da C-05, escrita antes de morder desta vez. O Doc 15 entra na biblioteca de documentos. **142 decisões.**
- **v0.9** — 19/08/2026 — **Fim da sessão 10.** O aviso da fronteira servidor→cliente foi reescrito e ampliado: ele já existia e ainda assim derrubou a rota de estatísticas **duas vezes no mesmo dia** — uma por formatador passado como propriedade, outra por reexportação de referência de cliente. Entra junto o método que encontrou o defeito, porque `tsc`, `eslint` e `next build` passam por ele. Acrescentadas as regras de gráfico (D-133) e o link do WhatsApp por aplicativo (D-138).
- **v0.8** — 19/08/2026 — **Estatísticas voltam ao escopo (D-130) e a procedência do log ganha um terceiro estado (D-129).** A seção "o que não pode dar errado" passa a descrever os três estados de `evento_negocio`: sintético da carga, importado do Pipedrive, e nascido neste sistema — com a regra dos indicadores intacta. Recharts sai de "fase 2" e entra em uso. O recorte do MVP passa a incluir Estatísticas; sai da lista de proibidos o painel de indicadores e entra, no lugar, o **construtor genérico de relatórios** (E-008), que é o que de fato continua fora.
- **v0.7** — 19/08/2026 — **O prazo saiu do documento (D-125).** A linha "prazo imutável: 3 de setembro" foi apagada daqui, do `README.md` e dos Docs 00, 03, 10 e 11: ela existia porque a API do Pipedrive fecharia com o contrato, e isso deixou de valer quando a extração e a carga rodaram em 17/08. **D-069 e R-008 revogadas.** A virada passa a ser decidida por prontidão, não por calendário — e prazo deixa de ser argumento admissível em qualquer decisão de escopo.
- **v0.6** — 18/08/2026 — **Fim da sessão 09.** Entram os dois avisos que custaram tempo nesta sessão: manipulador de evento não atravessa a fronteira servidor→cliente (C-06, derrubou a aba Pessoas) e as duas sujeiras estruturais da base — 41% das organizações são duplicata de nome e 388 registros vieram com acento destruído da origem, 45 ainda quebrados. Registrado que a **F8 foi adiada** (D-124) com o motor já escolhido. Do MVP, só falta a virada: F0 a F7 e F9 estão de pé.
- **v0.5** — 17/08/2026 — **Fim da sessão 06.** Movimento entra na identidade visual como regra (D-116), com a guarda de `prefers-reduced-motion`. A trava de desfecho passa a valer nos três caminhos que movem um negócio, sempre verificada no servidor. Acrescentado o aviso que custou caro nesta sessão: mexeu em identidade, procure `auth.uid()` no schema inteiro — a D-109 quebrou o gatilho do log e só se descobriu porque um usuário real não conseguia trabalhar.
- **v0.4** — 17/08/2026 — **Sessão 06: a extração corrigiu o documento.** A afirmação de que "a maior parte da base está parada" saiu — 74% dos negócios estão nas duas últimas etapas, e só 306 dos 2.458 seguem abertos. A carga **aconteceu** e está conferida; o medo de contaminar o log não se materializou, porque o gatilho é `after update` e não `after insert`. **D-108** revoga parte da D-030: atividade e anotação podem pertencer a organização ou pessoa, como no Pipedrive — 76% das atividades da base não têm negócio. **D-109**: `usuario` deixa de depender de conta de login. **D-110**: o seletor do Bubble sai do MVP. Volume real corrigido em todo o documento: 2.458 negócios e 2.889 organizações, não 2.453 e 422.
- **v0.3** — 14/08/2026 — **Sessão 05.** Regra 8 acrescentada: há um ambiente só, e `npm run dev` aponta para a base real. A seção "A carga da migração" corrigida por **D-106**, que revogou a D-102 — não há ensaio, a carga é operação de uma tentativa só, e o backup verificado passa a ser a mitigação principal. Identidade visual corrigida: os tokens estão em `app/tokens.css` e a ponte em `app/globals.css`, **não** em `tailwind.config.ts`, que não existe — o texto anterior contradizia a própria tabela de stack. O aviso do bloco `spacing` saiu (resolvido em P-025) e deu lugar ao que de fato morde no Tailwind v4: nome de classe montado em tempo de execução não é gerado. Contagem de decisões atualizada para 106.
- **v0.2** — 14/08/2026 — D-101: base única na nuvem, carga direto em produção, ensaio no banco local. Aviso de C-02 (o `nullif` na leitura de `app.carga_migracao`) acrescentado à seção do que não pode dar errado. Stack atualizada para Next.js 16 e Tailwind v4 (P-025 encerrada).
- **v0.1** — 13/08/2026 — Criação ao fim da Fase 1, com 100 decisões registradas e o MVP recortado pelo Bloco 12.
