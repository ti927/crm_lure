# CLAUDE.md — CRM Lure

> Contexto permanente do desenvolvimento. **Leia este arquivo inteiro antes de qualquer tarefa.**
> Documento 12 da biblioteca do projeto · v0.23 · 03/09/2026

---

## O que é este projeto

CRM próprio de uma consultoria empresarial, substituindo o Pipedrive. Construído para **até 10 usuários internos**, todos do mesmo domínio de e-mail.

**Motivo único: custo.** O Pipedrive atende bem; sai por preço. Isso significa que o norte é **paridade funcional com o uso atual**, não superação. Funcionalidade que o Pipedrive não tem e ninguém pediu é escopo indevido.

✅ **Não há prazo de virada** (D-125, 19/08/2026 — revoga D-069 e R-008). O prazo de 3/9 existia por um motivo só: a API do Pipedrive fecharia junto com o contrato e os dados ficariam inacessíveis. **A extração e a carga aconteceram em 17/08 e estão conferidas ao centavo** — a base inteira vive no Supabase, independente do Pipedrive. A virada acontece quando o sistema estiver pronto, não numa data. Não trate prazo como argumento em decisão nenhuma.

---

## Regras de trabalho — não violar

1. **Nunca altere a estrutura do banco pelo painel do Supabase.** Toda mudança vira arquivo em `supabase/migrations/`, versionado no git, aplicado por CLI. Há **uma única base na nuvem** (D-101): o repositório é a única descrição confiável do schema, e o banco local precisa poder ser recriado igual a ela.
2. **Nomes de tabela e coluna em português, `snake_case`** (`negocio`, `motivo_perda`, `responsavel_id`). Código da aplicação em inglês onde for convenção do framework.
3. **Nunca carregue a base inteira no navegador.** São **2.461 negócios, 2.897 organizações, 4.606 pessoas e 6.561 atividades** na base real (sincronização de 27/08). Paginação no servidor, lista virtualizada, Kanban carregando por partes.
4. **Todo componente novo é verificado nos dois temas**, claro e escuro. É critério de aceite, não detalhe.
5. **Nenhum segredo em variável `NEXT_PUBLIC_`.** Token do Bubble e chave de serviço só no servidor.
6. **Arquivos em UTF-8 com BOM. CSV sempre com separador ponto-e-vírgula.** ⚠️ **Exceção: arquivos `.css` não levam BOM** — um BOM antes de `@import` quebra o parser do Tailwind com "Invalid dangling combinator in selector", e o erro aponta para o arquivo gerado, não para a causa.
7. **Não tome decisão de produto sozinho.** Se faltar definição, pergunte. O projeto tem 165 decisões registradas no Doc 03 — provavelmente a resposta existe.
8. **Há um ambiente só.** O projeto do Supabase é o definitivo — o que guarda os dados (D-101, D-106). Não existe banco de desenvolvimento nem de ensaio: `npm run dev` aponta para a base real.
9. **Filtro de tela abre no recorte de quem abriu, e a preferência tem TRÊS estados** (D-149). `usuario.preferencia_kanban`, `preferencia_atividades` e `preferencia_lista_negocios` guardam a querystring. **Nulo** = nunca escolheu → abre em "só os meus". **Preenchido** = volta igual. **Vazio** = escolheu ver tudo, e o padrão **não** volta por cima. ⚠️ Tratar nulo e vazio como a mesma coisa faz o botão "Limpar" ser desfeito pelo próprio padrão no carregamento seguinte — parece defeito e é regra mal escrita. O que se guarda é **curto de propósito**: termo de busca, dia em foco e mês ficam de fora, porque são pergunta de agora e não escolha de trabalho.

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

### 3. O motivo da perda

⛔ **A trava de desfecho FOI REVOGADA em 20/08 (D-145, revoga a D-047).** Nenhuma etapa exige declarar Ganho ou Perdido — nem no arrasto do Kanban, nem na troca de etapa da ficha, nem na criação. **Não existe mais trava de transição no sistema.**

Ela caiu porque contrariava a realidade: *Aguardando Contrato* é uma espera legítima — contrato em assinatura não é negócio ganho nem perdido —, e forçar a escolha na entrada obrigava a mentir. Os 3 negócios que a D-128 registrou parados ali sem desfecho eram o sintoma disso.

**O que sobrou, e este sim é inegociável:** perdido exige motivo, por `perdido_exige_motivo` no banco. Isso nunca foi a trava — é regra de dado, e é o que sustenta o indicador de perdas. São 1.121 negócios perdidos na base; sem motivo, nenhum deles explica coisa alguma.

⚠️ **Declarar desfecho NÃO move mais a etapa.** Antes empurrava o negócio para a etapa final, consequência da D-047. Sem a trava isso passou a destruir informação: perdido em Cold Lead ia parar em Aguardando Contrato e ninguém mais saberia onde ele morreu. A base herdada tem perdas em todas as etapas — 147 em Cold Lead, 786 em Proposta Enviada. **Etapa diz até onde chegou; status diz como terminou.**

⚠️ **O Kanban mostra só negócio aberto** (`parado` e `negociacao`). Ganho e perdido somem do funil ao serem marcados: são 2.153 dos 2.460, e com eles dentro o quadro deixa de ser funil e vira arquivo. **Eles não somem da Lista** — lá ficam todos, com filtro de status e de motivo de perda, e as Estatísticas dependem deles.

⚠️ **Pop-up serve onde a alternativa é ir e voltar; não onde a tela já é o destino** (D-157 revertida, D-159). Na ferramenta de fusão, conferir um cadastro exigia abrir a ficha em outra aba e voltar — 17 vezes num grupo de 18 —, e ali o pop-up economiza a viagem. **Na Lista, o clique É a viagem:** a navegação do Next com prefetch chega antes de qualquer busca de resumo, e pôr um pop-up ali trocou instantâneo por ~155 ms de espera. A medição que motivou o pop-up (onze consultas na ficha contra uma) era verdadeira e mesmo assim a conclusão era falsa — o custo estava sendo pago **depois** do clique, não antes. **Não devolva a prévia à Lista nem ao Kanban.**

⚠️ **Quem rola é o `main`, e as telas de lista NÃO rolam por dentro** (D-151). Lista, Contatos e o rodapé dependem disso: o cabeçalho de coluna gruda no `main`, e é só por isso que o rodapé pode ser o último elemento do conteúdo sem levar o cabeçalho embora. Não devolva `overflow` à tabela — foi a causa da C-12 e da C-13 do mesmo dia. A **paginação no servidor** é quem sustenta a R-006; a virtualização saiu porque 50 linhas não são problema para o DOM e ela exigia justamente o container de rolagem que quebrava tudo.

⚠️ **Par de argumentos do mesmo tipo é armadilha estrutural** (C-13). `vincularOrganizacao(pessoaId, organizacaoId, …)` foi chamada invertida na ficha da organização por semanas: os dois são `uuid`, nada no tipo acusa, e o `update` invertido casa com **zero linhas e devolve sucesso**. Ao escrever ou chamar função com dois `uuid` seguidos, confira a ordem contra a assinatura — e ao ver "salvou mas não mudou nada", suspeite disto antes de suspeitar de RLS.

⚠️ **`sticky` gruda no scrollport MAIS PRÓXIMO** (C-12, Doc 09 §3.11). Antes de usar `sticky`, a pergunta é *qual* container rola, não *se* algum rola: havendo dois scrolls aninhados, grudar no de dentro não protege de nada quando é o de fora que se move. Foi assim que os rótulos das etapas do Kanban sumiam — eram `sticky` dentro do quadro, e quem subia era a página. **A faixa de rótulos vive FORA da rolagem dos cartões**, e `rotulos-alinhados.ts` é o que mantém as duas faixas concordando em largura. Não a mova para dentro.

⚠️ **O quadro cabe numa tela só, e tem piso** (D-148). As seis colunas dividem a largura (`flex-1 basis-0`) em vez de somarem ~1.840px — mas com **`min-w-40` (160px) de piso**, e o piso é a parte que importa: abaixo dele a rolagem lateral volta **de propósito**, porque apertar até ficar ilegível troca um incômodo por um defeito. Se acrescentar coisa ao cartão, confira que ainda cabe em 160px; a última linha usa `flex-wrap` justamente para quebrar em vez de vazar.

⚠️ **A busca do Kanban sai de `kanban_coluna`, no banco** (D-147) — e a paginação da coluna foi junto para lá. Não a reescreva como consulta do PostgREST: a **C-04** recusa coluna vinculada dentro de `or`, e o cartão mostra o nome da organização. A saída de dois passos (ids em `in`) tem teto de URL sobre 2.897 organizações e devolveria resultado incompleto **calado**.

---

## Modelo de domínio, em resumo

Detalhamento no Doc 06; estrutura física no Doc 09.

**Organização** é a entidade central — clientes pessoa física entram como organização comum. **Negócio** exige título e organização; nada mais é obrigatório. **Pessoa** se vincula a organizações, e **o cargo pertence ao vínculo**, não à pessoa.

**Status e Etapa são dimensões independentes:**

- **Etapa** — configurável. Hoje seis: Cold Lead → Hot Lead → Contato Realizado → Apresentação Realizada → Proposta Enviada → Aguardando Contrato.
- **Status** — **fixo em código, quatro valores**: `parado`, `negociacao`, `ganho`, `perdido`. Não é lista configurável. Ganho e Perdido **não são etapas**.

Cada etapa carrega um status inicial sugerido. Cold Lead nasce `parado`.

⚠️ **A base tem duas sujeiras estruturais, medidas em 18/08.** (a) **1.195 das 2.889 organizações são duplicata de nome** — 668 grupos, 41% da lista; "Sicoob Credseguro" aparece seis vezes. A Lista **agrupa na apresentação** (D-121), o que **não é mesclagem**. ⚠️ **Mesclar existe desde 27/08 (D-156) e, desde 03/09, vale para TODO O DOMÍNIO (D-164)** — `/ferramentas/fusao-organizacoes`, um cadastro por vez, com a recusa no banco e não na tela: a trava passou de `sou_desenvolvedor()` para `pertence_ao_dominio()`. **Abrir para todos não mudou nada do que segurava o risco** — prévia obrigatória, aviso de "não há desfazer", rastro com os ids de tudo que se moveu, e mover primeiro / apagar por último. ⚠️ **Liberar a função sem liberar a política de escrita do rastro é meia-correção**: o `insert` do rastro mora DENTRO de `funde_organizacao`, então ele falhando desfaz a fusão inteira com um erro de política que ninguém liga à causa. (b) **388 registros vieram com acento destruído** direto do Pipedrive, não da carga; 343 foram recuperados por `scripts/recupera-acentos.mjs` e **45 seguem quebrados** (C-07).

⚠️ **O endereço da organização é CIDADE + UF, em colunas separadas** (D-160). Não existe logradouro, número, bairro nem CEP, e não é esquecimento: dos 864 endereços que a origem tinha, **apenas 3 traziam rua e número**. **Endereço é de organização, não de pessoa** — as 4.604 pessoas do Pipedrive têm `postal_address` vazio nos treze subcampos. ⚠️ **Nunca escreva a UF dentro de `cidade`.** Foi a colagem à mão que fez "Goiânia" (380) e "Goiânia, GO" (8) conviverem como cidades diferentes; a migration desfez os 13 casos e o formulário oferece **lista fechada**, com a restrição `organizacao_uf_valida` no banco recusando o resto. Para exibir, existe **uma função só** — `local(cidade, uf)` em `lib/formato.ts`. ⚠️ **Campo novo em `organizacao` obriga a mexer na FUSÃO**: `funde_organizacao` adota o que está vazio e depois apaga a duplicada, então um campo que ela não conheça some em silêncio na primeira fusão. Prévia, descarte e adoção — os três.

⚠️ **A recuperação de endereço herdou entre homônimos, e isso foi decidido** (D-160). Das 423 cidades recuperadas do snapshot, 241 não envolvem suposição e **182 vêm de um cadastro irmão**: "Elmo Engenharia" está nove vezes na base e só um dos nove tinha endereço. Quem decidiu foi o maestro, com a alternativa medida. Ao ler `organizacao.cidade` hoje, saiba que numa parte dos duplicados ela é inferência de nome igual, não dado conferido cadastro a cadastro.

⚠️ **Filtro em lista AGRUPADA entra em três funções, não em uma** (D-161). A lista de Contatos filtra por local em `organizacoes_agrupadas`, `conta_organizacoes_agrupadas` e `organizacoes_do_grupo` — listagem, paginação e expansão. Filtrar só a listagem faz a paginação anunciar 7 páginas e a lista mostrar 5; não filtrar a expansão faz o crachá dizer 3 e abrir mostrar 18. **Dois números que se contradizem na mesma tela não desacreditam o errado — desacreditam os dois.** O predicado é `organizacao_no_recorte`, função única: `where` repetido em três lugares diverge no dia em que alguém corrigir um.

⚠️ **O endereço postal do Pipedrive é cidade + UF, e só** (D-162): **840 dos 864 (97,2%)** são literalmente "Cidade, UF, Brasil", e os 56 CEPs de lá são de MUNICÍPIO — terminam em `-000`. Os outros 24 foram digitados à mão, e para esses existe `organizacao.endereco`: **uma** coluna de texto livre, não sete campos de formulário. **21 cadastros a preenchem.** ⚠️ E fica a lição que a D-160 pagou: **conservadorismo vira perda quando o dado está à vista.** Recusar palpite é certo; recusar o que está escrito e legível não é — 12 cadastros ficaram sem cidade nenhuma porque o reconhecimento só entendia um formato. Quem lê texto livre de endereço aqui usa o **dicionário de cidades** da extração, nunca uma expressão regular nova.

⚠️ **Texto vindo do Pipedrive é HTML, e só existe UMA conversão para texto puro** — `scripts/lib/html-para-texto.mjs` (D-165). Nunca escreva outra, e nunca `.replace(/<[^>]+>/g, " ")`: foi assim na carga de 17/08, e **toda tag virou um espaço, `<br>` inclusive** — uma anotação com cinco contatos em cinco linhas virou um blob de uma linha só, com `&nbsp;` literal no meio. 319 anotações e 2.125 descrições de atividade foram reconstituídas por `scripts/recupera-texto-html.mjs`. ⚠️ **A ordem é tag primeiro, entidade depois:** invertida, `&lt;dho@eneserra.com.br&gt;` — que é texto escapado e existe na base — vira tag e some. ⚠️ **Quebra de linha não sobrevive a `texto()`**, que colapsa `\s+` num espaço: normalize o branco DENTRO de cada linha, nunca através delas.

⚠️ **`carga-migracao.mjs` e `sincroniza-novos.mjs` reconhecem uma anotação já carregada por `texto = corpo`.** Mudar como o texto é convertido de um lado e não do outro faz a sincronização não casar **nenhuma** das 928 e inserir todas de novo, calada. As duas conversões são a mesma função de propósito.

⚠️ **Anexo do negócio é arquivo OU link, no balde PRIVADO `anexos`** (D-163). Não existe endereço fixo do arquivo — é URL assinada de cinco minutos a cada clique, e por isso abrir um anexo é ação de servidor e não `href` na listagem. ⚠️ **O arquivo sobe do navegador direto ao Storage, nunca por Server Action:** o corpo de uma Server Action tem teto de 1 MB por padrão e proposta em PDF passa disso. ⚠️ **O caminho é montado no servidor a partir do id do negócio**; o nome que o navegador manda é só sufixo higienizado, senão um `../` escreve fora da pasta.

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

✅ **O agente CONSEGUE ver as telas desde 27/08 (D-153).** `npm run telas` — ou `node scripts/ve-telas.mjs --rotas kanban,negocios --tema ambos --rolar 900 --como rafael.saia@lureconsultoria.com.br` — emite sessão local, abre num Chromium sem interface e grava captura em `capturas/`. **Use antes de dizer que uma tela está pronta.** Ele achou a C-14 na primeira hora, e a C-11 e a C-12 não teriam existido se ele existisse antes. ⚠️ Recusa qualquer destino que não seja `localhost`; a sessão é de usuário real, então **leitura apenas**. Não substitui o método do `curl` abaixo para erro de serialização quando a rota cai em 404 sem sessão — aí a saída continua sendo rota temporária.

⚠️ **`tsc`, `eslint` e `next build` NÃO pegam esse defeito** — ele é de tempo de execução, na serialização. O que pega é rodar a página. Como o Google OAuth impede o agente de logar, o caminho é: desligar `PUBLICAS` em `proxy.ts` **localmente**, `npm run build && npm run start`, pedir a rota por `curl`, ler a pilha no log do servidor e **restaurar o `proxy.ts`**. Sem sessão a RLS devolve vazio, então isso testa o caminho de dado vazio — suficiente para erro de serialização, insuficiente para o resto.

⚠️ *(histórico)* **Manipulador de evento não atravessa a fronteira servidor→cliente.** Montar JSX num Server Component e entregá-lo a um Client Component é padrão útil e usado aqui (a tabela virtualizada recebe as linhas prontas), mas qualquer `onClick`, `onChange`, `onSubmit` ou `onBlur` nesse JSX **derruba a rota inteira** na serialização. Foi o que quebrou a aba Pessoas (C-06, Doc 09 §3.11). Depois de mexer numa página desse tipo, varra os Server Components à procura desses atributos.

⚠️ **Nome de classe do Tailwind nunca pode ser montado em tempo de execução.** O v4 varre o código à procura de literais; `bg-status-${x}` simplesmente não é gerado, e a cor some sem erro nenhum. Escreva as classes por extenso em mapas — é o que `components/dominio/etiquetas.tsx` faz.

---

## Escopo do MVP

**Entra:** Negócios (Kanban com arrastar-e-soltar, Lista de dez colunas com filtro e ordenação em todas, detalhe em três zonas com aba Linha do Tempo e **anexos**, D-163) · Atividades (lista e calendário) · Contatos · Produtos/Serviços · trava de desfecho · quatro automações com notificação interna · **log de eventos** · exportação CSV · dois temas · Google OAuth · migração completa · **celular em modo consulta e marcação** · **Estatísticas** (D-130: os treze indicadores da D-063, com recortes e CSV).

✅ **A F8 (automações e notificações) está construída** desde 20/08 — **Doc 15 v0.3**. Sino no cabeçalho, painel em `/notificacoes`, follow-up ao ganhar. O que sustenta o desenho:

- Os alertas são **derivados na leitura** (D-124) — não há agendador, e a consulta custa **1,65 ms** na base real. A restrição é **número de idas ao banco**, não custo de consulta: os quatro alertas saem de **uma função só**.
- O limite de "negócio parado" e a antecedência do lembrete são **escolha do usuário em degraus** — 30/45/60/90 com padrão 60 (D-139) e 1/2/3/7 com padrão 1 (D-140).
- O número do sino conta **só o que exige ação** (D-141). Lembrete de atividade futura aparece sem contar.
- ⚠️ **A entidade Notificação não vira tabela** (encerra P-014 e P-027). Grava-se **preferência** e **o que foi lido**; a notificação em si é derivada. Guardar o lido em vez do gerado é o que permite dispensar o agendador — quando a causa some, o alerta some sozinho.

⚠️ **`preferencia_notificacao` e `notificacao_lida` são as primeiras tabelas com RLS por usuário.** Todas as outras usam `pertence_ao_dominio()` (D-050). A política compara com `public.usuario_atual()` e **nunca com `auth.uid()`** — desde a D-109 os dois são diferentes, e a comparação errada deixaria o sino mudo exatamente para quem veio da carga, sem erro nenhum na tela. É a armadilha da C-05.

⚠️ **Ela mordeu de novo, no lugar mais improvável: no próprio teste.** A primeira rodada de `scripts/ensaia-notificacoes.mjs` devolveu zero alerta para todo mundo. A causa não era a política — era o JWT falso do ensaio, com e-mail inventado: `usuario_atual()` não é `security definer`, então lê `usuario` sob RLS, e a política daquela tabela confere o **domínio do e-mail**. Domínio errado, consulta vazia, `usuario_atual()` nulo, sino mudo. **Nenhum erro em lugar nenhum.** É o mesmo sintoma da C-05 por uma terceira porta — e a lição é que o alerta vazio nunca deve ser lido como "não há alertas" sem antes conferir quem o banco acha que você é.

⚠️ **O sino vive no LAYOUT, não numa rota.** Um erro de serialização ali derruba **todas as telas de uma vez**. O layout passa só dados; o sino é que é Client Component. Ver o método de verificação por `curl` acima — foi ele que confirmou as sete rotas respondendo 200.

**Fora — não construa:** **seletor de cliente Bubble no Ganho** (D-110, foi para fase final) · **construtor genérico de relatórios** (E-008 — o catálogo de indicadores existe, o construtor não) · metas e seu acompanhamento · **mesclagem de duplicados no fluxo comum das telas** (existe como ferramenta de manutenção à parte, em `/ferramentas`, aberta a todo o domínio desde a D-164) · transferência entre usuários · telas de configuração · criação e edição pelo celular · Google Agenda · API pública e webhooks · envio de e-mail (nenhum, em hipótese alguma) · múltiplas moedas · módulo de LGPD.

**Sobre o celular:** no dia 1 o vendedor **consulta** — Lista em cartões, busca, ficha do negócio, atividades, anotações, linha do tempo, Kanban uma etapa por vez, e marcar atividade como concluída. Criação e edição pelo celular são fase 2. Telas próprias, não apenas redimensionadas.

**Sobre as listas configuráveis** (origem, motivo de perda, área, tipo de atividade, etapas): existem no banco, populadas pela migração. Sem tela no MVP; edição pelo painel do Supabase.

---

## Critério de pronto

O Pipedrive só é desligado quando tudo isto for verdade:

1. ✅ Os **2.458** negócios estão migrados com organizações, pessoas, contatos, atividades e anotações — **contagens conferidas em 17/08**. Produtos não existiam no Pipedrive.
2. ⭐ **Os dois sócios operam um dia inteiro sem abrir o Pipedrive.**
3. O log de eventos está gravando desde o primeiro registro em produção. ✅ Nasceu limpo: a carga não gerou evento.
4. ~~A trava de desfecho funciona.~~ ⛔ revogada pela D-145 — o critério vira: **perdido sempre tem motivo**.
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
| 03 | Log de Decisões | **162 decisões com justificativa.** Consulte antes de perguntar |
| 06 | Modelo de Domínio | Entidades e regras, conceitual |
| 08 | UI e Design System | Cores, tipografia, densidade |
| 09 | **Arquitetura Técnica** | Schema físico, gatilhos, políticas |
| 14 | Referência da API Pipedrive | Endpoints para a extração |
| 15 | **Central de Notificações** | O plano da F8, validado — schema, alertas, telas e critérios de aceite |

---

## Changelog

- **v0.23** — 03/09/2026 — **Três pedidos, e o do meio era o único que parecia ser o que era.** (a) O maestro relatou que "copiar e colar não está funcionando" e mandou o print de uma anotação salpicada de `&nbsp;`: **não era o copiar-e-colar** — o caminho de escrita está limpo — era a carga de 17/08, que trocou toda tag por um espaço e deixou entidade literal. **319 anotações e 2.125 descrições de atividade** reconstituídas (**D-165**), com a conversão virando função única. (b) Entram os **anexos do negócio** (**D-163**), arquivo ou link, pedido nominal da Daniela para registrar a proposta enviada — paridade com o Files do Pipedrive. (c) A **fusão de duplicadas abre para todo o domínio** (**D-164**), revogando a restrição da D-156. ⚠️ Ficam três regras: **uma conversão de HTML só**, e mudá-la de um lado sem o outro faz a sincronização reinserir 928 anotações em silêncio; **arquivo não sobe por Server Action** (teto de 1 MB); e **liberar uma função sem liberar a política que ela escreve por dentro é meia-correção** — a fusão passaria e o rastro derrubaria a transação. **165 decisões.**
- **v0.22** — 01/09/2026 — **Uma pergunta do maestro achou o que a D-160 tinha deixado passar.** "Os endereços do Pipedrive são só cidade-UF?" — sim, **97,2%** (840 de 864), e os 56 CEPs de lá são de município, não de rua. Mas os outros **24 foram digitados à mão**, e o reconhecimento da D-160 só entendia "Cidade, UF": **12 estavam sem cidade nenhuma** com a cidade escrita e legível na origem. A **D-162** abre `organizacao.endereco` (texto livre, uma coluna e não sete — 13 cadastros não justificam um formulário que 2.890 deixariam vazio) e troca a expressão regular por **dicionário de cidades**. ⚠️ Fica a regra: **conservadorismo vira perda quando o dado está à vista** — recusar palpite é certo, recusar o que está escrito não é. E duas armadilhas pegas no ensaio: limpeza sensível a acento fazia "Goiania" virar logradouro, e o estado por extenso fazia "Bahia, Brasil" virar endereço. **162 decisões.**
- **v0.21** — 01/09/2026 — **A lista de Contatos ganha filtro por localização (D-161)** — seletor único com três recortes: estado inteiro, cidade e **sem endereço** (1.877 organizações, a maioria da base, e o único caminho até elas para preencher o que falta). ⚠️ Fica a regra que este filtro cobrou: **em lista agrupada, filtro entra em TRÊS funções ao mesmo tempo** — a lista, a contagem que alimenta a paginação e a expansão do grupo. Filtrar só uma faz a paginação anunciar 7 páginas e a lista mostrar 5, ou o crachá dizer 3 e abrir mostrar 18 — e **dois números que se contradizem na mesma tela não desacreditam o errado, desacreditam os dois**. O predicado mora numa função só (`organizacao_no_recorte`) porque `where` repetido em três lugares é como eles divergem no dia em que alguém corrigir um. **161 decisões.**
- **v0.20** — 01/09/2026 — **Sessão 14: o endereço, e um pedaço da carga que ninguém tinha notado faltar.** A **D-160** dá à organização uma coluna `uf` própria e recupera do snapshot o que a `carga-migracao.mjs` descartou: **864 organizações tinham endereço no Pipedrive e a carga gravou só `address_locality`** — vazio em 281 delas, apesar do endereço preenchido. Cidade sai de 594 para **1.017**, UF de 0 para **1.025**, e o local ganha **coluna própria** na lista de Contatos, fora da linha de referência onde um título de negócio comprido o empurrava para fora. ⚠️ Ficam três regras: **UF nunca dentro de `cidade`**; **campo novo em `organizacao` obriga a mexer na fusão**, que apaga a duplicada e faria o campo sumir calado; e **182 das 423 cidades recuperadas são herança entre homônimos**, decisão tomada com a alternativa medida. ⚠️ Fica também o custo que só aparece rodando: um `update` por linha levava três minutos para 1.012 cadastros, e um `update` só sobre `unnest`, três segundos — a restrição é **ida ao pooler**, não custo de consulta. **160 decisões.**
- **v0.19** — 27/08/2026 — **Fecha a sessão 13, e registra um erro de leitura que vale mais que a funcionalidade.** O pop-up e a paginação foram pedidos **dentro da ferramenta de fusão** — a pista era "27 páginas", que é 668 grupos de 25 em 25, e não as 50 da Lista — e foram construídos na Lista e no Kanban. A **D-157 caiu** e a **D-159** ficou no lugar certo: "Conferir" abre o cadastro inteiro em pop-up, com nomes e não só contagens, porque a pergunta que decide a fusão é *é a mesma empresa?*. ⚠️ Fica a regra: **pop-up serve onde a alternativa é ir e voltar, não onde a tela já é o destino** — e uma medição verdadeira (onze consultas contra uma) pode sustentar uma conclusão falsa, se o custo estiver sendo pago depois do clique e não antes. **159 decisões.**
- **v0.18** — 27/08/2026 — **Mesclar deixou de ser proibido e virou ferramenta trancada (D-156).** `/ferramentas/fusao-organizacoes` funde um cadastro por vez, movendo negócios, atividades, anotações e vínculos — restrita a Julio e Fabio, com a recusa **no banco** e não na tela, e a rota devolvendo 404 para os demais. Antecipa a D-038 e suspende a D-094 só para os dois. ⚠️ Fica registrado o que quase apagou dados em silêncio: três tabelas têm `on delete cascade` para `organizacao`, então **mover primeiro e apagar por último** não é estilo, é a diferença entre fundir e perder. Nenhuma fusão foi executada. **156 decisões.**
- **v0.17** — 27/08/2026 — **O agente passou a enxergar (D-153).** `npm run telas` emite sessão local e grava captura das telas, nos dois temas e com rolagem — o que faltava desde sempre, porque `curl` lê HTML e os defeitos deste projeto são visuais. Confirmou em tela a D-148, a D-149 e a D-151, e achou na primeira hora a **C-14**: com `border-collapse: collapse` o Chromium pinta as linhas do corpo por cima do `<thead>` grudado. ⚠️ Ficam duas regras novas: **borda em `<tr>` não é desenhada** no modelo separado que passou a valer nas tabelas, e **medir no DOM antes de teorizar** — duas hipóteses erradas precederam a certa, e o que decidiu foi `getBoundingClientRect`. Aberta e **encerrada no mesmo dia** a P-050: 297 telefones corrompidos na origem ficam como estão (**D-154**) — os dígitos se perderam no Pipedrive. **154 decisões.**
- **v0.16** — 27/08/2026 — **A mesma causa em duas telas, e um defeito silencioso de semanas.** A **D-151** leva ao fim o que a C-12 começou: Lista e Contatos param de rolar por dentro, o cabeçalho gruda no `main`, as dez colunas cabem por largura percentual e o rodapé volta a ser o último elemento do conteúdo — as três coisas são a mesma, e é por isso que só funcionam juntas. A virtualização saiu; quem sustenta a R-006 é a paginação no servidor. Entra a **C-13**: a ficha da organização chamava três ações com `(uuid, uuid)` invertidos, e duas delas **mentiam em silêncio** — o que corrige o veredito da C-11, porque o campo de cargo gravava pela ficha da pessoa e nunca pela da organização. A **D-152** dá à ficha da organização o cadastro de pessoa e a criação de atividade. **152 decisões.**
- **v0.15** — 27/08/2026 — **O maestro abriu a tela, e o Kanban estava quebrado.** Entra a **C-12**: os rótulos das etapas não paravam em lugar nenhum — cartão passava por cima deles e rolar os levava embora. Duas causas somadas, e nenhuma era o `sticky` em si. Vira regra aqui: **`sticky` gruda no scrollport mais próximo**, e a pergunta antes de usá-lo é *qual* container rola. Entra a **D-150**, que **revoga a D-146** de seis dias atrás: o rodapé volta à coluna externa, largura inteira, por baixo da sidebar. O que a derrubou foi o preço que ela mesma tinha registrado como "consequência assumida" e ninguém tinha visto — a segunda rolagem de 41px nas telas de altura cheia, que foi justamente a segunda causa da C-12. **P-049 encerrada. 150 decisões.**
- **v0.14** — 27/08/2026 — **O funil coube na tela, e as telas passaram a saber de quem são.** Entram três decisões: **D-147** (busca no Kanban, por função no banco — a **C-04** não deixa alcançar o nome da organização de outro jeito, e a saída de dois passos teria teto silencioso sobre 2.897 cadastros), **D-148** (as seis colunas **dividem** a largura, com piso de 160px abaixo do qual a rolagem lateral volta de propósito) e **D-149** (Kanban, Atividades e Lista abrem em "só os meus", com a preferência ganhando **três estados** — e é o terceiro que impede o "Limpar" de ser desfeito pelo padrão). Volume da base atualizado pela sincronização de 27/08. ⚠️ Fica registrada a lição do script de sincronização: ele conferia se os eventos reais continuavam sendo **9**, número escrito à mão em 20/08, e por isso acusava falso toda vez que alguém trabalhava no sistema. **Marco medido à mão vira alarme que sempre toca**, e alarme que sempre toca esconde o de verdade — agora ele mede antes e compara com o depois. **149 decisões.**
- **v0.13** — 21/08/2026 — **A trava saiu do código, e um campo invisível ensinou a regra da vez.** A D-145 já estava escrita aqui, mas o **verificador oficial da virada ainda media a trava revogada** — chamava de "A TRAVA FUROU" um estado que a própria D-145 tornou legítimo. Corrigido, e com uma medição nova: a **dispersão das perdas por etapa**, que é como se detecta pelo dado se alguém religou o empurrão que a D-145 tirou. Entra a **C-11** (Doc 09 v0.7): o campo de cargo existia, gravava, e um usuário não o achou porque era um input transparente sem borda. É o **quarto caso do mesmo padrão em duas sessões**, e vira regra: **campo editável carrega borda** — affordance só no hover não existe no celular, que é metade do sistema (D-097). Entra também a **D-146**: o rodapé da marca rola com o conteúdo em vez de ficar cravado no pé. **146 decisões.**
- **v0.12** — 20/08/2026 — **A única trava do sistema caiu (D-145, revoga a D-047).** A seção 3 de "o que não pode dar errado" deixa de descrever a trava de desfecho e passa a descrever o que de fato é inegociável ali: **perdido exige motivo**. Registrado que declarar desfecho **não move mais a etapa** — fazia isso por causa da D-047 e passou a destruir a informação de onde o negócio morreu — e que o **Kanban mostra só negócio aberto**, enquanto a Lista continua com tudo. Entra também a **D-144**: o push revoga a parte da D-124 que dizia "sem agendador", com a assimetria que torna o risco aceitável — o sino não depende do cron. **145 decisões.**
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
