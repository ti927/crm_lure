# 16 — Plano do MCP para Agentes de IA (v0.5)

| Campo | Valor |
|---|---|
| **Documento** | Plano de Implementação — servidor MCP do CRM para agentes de IA |
| **Projeto** | CRM próprio (substituição do Pipedrive) |
| **Versão** | v0.5 |
| **Data** | 15/11/2026 |
| **Status** | 🟢 **fases 1 a 4 no ar (16/11)** — fase 1 conferida em produção pelo maestro; fases 2 a 4 publicadas e aguardando o teste geral dele. P-056, P-058 e P-059 respondidas (D-179 a D-181); P-055 (Grok) em aberto |

> Tira do papel a **E-012** (API pública / MCP para agentes de IA), adiada para a fase 2 pela **D-074** e transformada em critério de arquitetura pela **R-009**. A **D-170** abriu a primeira porta externa, pela via mais estreita: uma função no banco. Este plano abre a segunda, para agentes de IA.

---

## 1. O que já estava decidido

| # | O que diz |
|---|---|
| **D-074** | Sem API pública no MVP. A intenção declarada é incorporar agentes de IA **via endpoints ou MCP** |
| **D-081** | O dado será escrito por três caminhos — tela, script e **futuro agente de IA**. Regra que mora só na tela não vale para os outros dois |
| **R-009** | A arquitetura deve expor leitura e escrita **sem reescrever a camada de regras** |
| **D-049** | Papel único com acesso total. **Não muda** com este plano (ver D-173) |
| **D-170** | Porta de contrato fechado, nunca escrita livre nas tabelas |

---

## 2. As decisões deste plano (15/11/2026)

| # | Decisão |
|---|---|
| **D-172** | O MCP mora **dentro do próprio app**, em `/api/mcp`, e chama **as mesmas regras que as telas chamam**. Nada de SQL livre, nada de MCP do Supabase |
| **D-173** | O agente é **a secretária do usuário**: age com a conta dele, a responsabilidade é dele, o que faz conta nos indicadores como do usuário, e **vê todos os campos** |
| **D-174** | Toda ação do agente é **marcada "via Agente IA"**, além do nome do usuário. O **campo Origem do negócio não muda** — continua dizendo de onde veio o cliente |
| **D-175** | Atende **todos os agentes** — Grok bot (prioridade), claude.ai, Batuta e Claude Code. **Porta principal: login Google do domínio por OAuth**; porta secundária: **chave de agente** gerada pelo usuário em Configurações |
| **D-176** | Escrita sensível (etapa, valor, responsável, desfecho) é **opção de cada usuário em Configurações** |
| **D-177** | Primeiro uso real: **resumo diário de pendências**, só leitura. Ordem das fases na seção 6 |
| **D-178** | O interruptor de escrita sensível **nasce ligado** — quem não quiser desliga o seu. Em troca, **toda chamada de agente fica registrada** (usuário, agente, ferramenta, quando, o que foi pedido — leitura inclusive), além da marca "via Agente IA" em cada escrita |

---

## 3. Por que dentro do app, e não direto no banco

Três regras vivem hoje **só no código das telas** e seriam puladas por um agente que gravasse direto no Supabase:

| Regra | Onde mora | O que quebraria |
|---|---|---|
| Follow-up ao ganhar (D-021) | `declararDesfecho` e `editarCampo` | Negócio ganho pelo agente sem follow-up |
| Aviso de organização de nome repetido (D-168) | `criarOrganizacao` | Agente engordando os 41% de duplicatas |
| Atualização das telas | `revalidatePath` em cada ação | Tela mostrando dado velho |

⚠️ **O trabalho de fundo é tirar as ações das pastas `acoes.ts`** — são ~55 funções — **para uma camada comum** que a tela e o MCP chamem igual. É a maior parte do esforço e o maior risco: mexer nessa camada pode quebrar uma tela que hoje funciona. Por isso a extração vai **aos poucos, fase a fase**, só com as funções que cada fase usa, e cada tela tocada é conferida nos dois temas.

⚠️ **O MCP do Supabase fica descartado**: dá SQL livre sobre a base real, e não existe base de teste (D-101).

---

## 4. Identidade — quem o agente é para o CRM

O agente age **como o usuário** (D-173). As políticas de acesso olham o e-mail do domínio no token, e o log grava `autor_id = auth.uid()`. A identidade precisa chegar ao banco como **a do usuário**, sem atalho:

| Porta | Para quem | Como |
|---|---|---|
| **OAuth com login Google do domínio** (principal) | Grok bot, claude.ai | O usuário conecta o agente, entra com o próprio Google, e o agente recebe um acesso em nome dele. O banco vê o usuário de verdade |
| **Chave de agente** (secundária) | Batuta, Claude Code | O usuário gera a chave em Configurações, vê uma vez, revoga quando quiser. Guardada só em hash |

⛔ **Chave de serviço, nunca.** Ela passa por cima das políticas e deixa o log **sem autor** — não se saberia mais quem mexeu.

⚠️ **O Grok exige OAuth.** A documentação da xAI (grok.com/connectors) diz que conector próprio é cadastrado pela URL e autenticado ao conectar, e os conectores dela usam OAuth. O claude.ai pede o mesmo. Por isso o OAuth deixou de ser fase opcional e virou a porta principal (D-175).

---

## 5. O que o agente pode fazer

| Grupo | Ferramentas | Liberado |
|---|---|---|
| **Leitura** | buscar organização / pessoa / negócio (paginado); ficha completa; atividades pendentes de alguém; funil por etapa; histórico de eventos; indicadores; listas (etapas, origens, produtos, motivos de perda) | sempre |
| **Escrita reversível** | criar anotação; criar, editar e concluir atividade; criar pessoa, organização (com o aviso de homônima da D-168) e negócio | sempre, com **modo ensaio** |
| **Escrita sensível** | mover etapa; alterar valor; trocar responsável; declarar ganho ou perdido (perdido exige motivo) | **só se o usuário ligou** em Configurações (D-176) |
| **Fora do MCP** | excluir qualquer coisa; fundir organizações ou pessoas; mexer em etapas, produtos e listas; anexos; SQL livre | nunca |

⚠️ **As listas vêm do banco, não do código.** A tabela `origem` tem hoje onze valores, dois deles incluídos direto no banco. Ferramenta com lista escrita no código nunca conheceria origem nova.

⚠️ **Leitura é sempre paginada** (R-006): teto de linhas por chamada, como nas telas.

⚠️ **Toda resposta de escrita devolve o id e o link do registro** — o agente pode narrar sucesso sem ter feito; o link é a prova.

---

## 6. Fases

| Fase | Entrega | Risco |
|---|---|---|
| **1 — Prova técnica** | `/api/mcp` com **uma** ferramenta de leitura, conectada pelo **Grok** e pelo **claude.ai** via OAuth, e pelo Claude Code via chave. Prova que o banco vê o usuário certo | ataca primeiro a maior incerteza |
| **2 — Resumo de pendências** | Ferramentas de leitura; tela de **Configurações** com chave de agente e o interruptor de escrita sensível | baixo |
| **3 — Escrita reversível** | Anotação e atividade, pessoa, organização, negócio; **modo ensaio**; **marca "via Agente IA"**; limite diário por usuário | baixo a médio |
| **4 — Escrita sensível** | Etapa, valor, responsável, desfecho — atrás do interruptor | médio |

### 6.1 Fase 1 — entregue em 15/11/2026

**Endereço do conector:** `https://crm.lureconsultoria.com/api/mcp` (o `crm-lure.vercel.app` também responde).

| Peça | Onde |
|---|---|
| Rota do MCP, sem sessão, uma requisição por chamada | `app/api/mcp/route.ts` |
| Conferência do token (assinatura ES256, vencimento, e-mail do domínio) | `lib/mcp/acesso.ts` |
| Ferramenta `minhas_atividades_pendentes` (só leitura, teto de 100 linhas) | `lib/mcp/servidor.ts` |
| Onde o agente descobre como pedir acesso (RFC 9728) | `app/.well-known/oauth-protected-resource/` |
| Página de aprovação | `app/oauth/consent/` |
| `/api/mcp` e `/.well-known` fora do login por cookie; o login guarda a query de volta | `proxy.ts` |

**Conferido em produção:** o claude.ai (pelo celular) cadastrou-se sozinho, o maestro entrou com o Google e aprovou, e a ferramenta devolveu **exatamente** as duas atividades pendentes que o banco tem para ele — conferido por consulta direta. Prova que o token traz o e-mail e que as políticas do banco valem para o agente como valem para a tela.

**Configuração no Supabase** (*Authentication*):

| Tela | Valor |
|---|---|
| *OAuth Server* | ligado; *Authorization Path* `/oauth/consent`; *Allow Dynamic OAuth Apps* ligado |
| *URL Configuration* | *Site URL* = `https://crm.lureconsultoria.com` — é dele que o Supabase monta o endereço da página de aprovação |

⚠️ **A chave do *OAuth Server* parece ligada e não salva.** Ligada pelo celular, ela voltou desligada ao recarregar a página, e o Supabase seguia respondendo `feature_disabled`. A prova de que está ligada é de fora: `/.well-known/oauth-authorization-server/auth/v1` do projeto devolve os endereços, e não erro 404.

⚠️ **A página de aprovação usa a sessão do CRM que já está aberta no navegador.** Quem tem mais de uma conta Google via sempre a mesma (caso do Cursor, em 16/11). Correção: o link **"Não é esta conta? Entrar com outra"** encerra a sessão e volta ao login com o mesmo pedido, e o botão do Google passa a pedir a escolha de conta (`prompt=select_account`) — em todo login do CRM, não só no do agente. Se o Supabase recusar o pedido depois da troca, basta o agente conectar de novo.

⚠️ **O cadastro automático de agentes não abre o CRM.** Qualquer agente consegue se cadastrar, mas para receber token ainda precisa que alguém do domínio entre com o Google e aprove na página do CRM.

**Ficou para depois:** o teste com o **Grok** (P-055) A chave de agente foi dispensada (D-181): todo agente entra por OAuth. O adaptador de MCP da Vercel não foi usado: o próprio SDK já traz o transporte para `Request`/`Response` da Web, que é o que a rota do Next.js recebe.

### 6.2 Fase 2 — leitura e tela Agentes de IA (15/11/2026)

| Peça | Onde |
|---|---|
| Ferramentas de leitura: `resumo_de_pendencias` (o mesmo do sino), `minhas_atividades_pendentes`, `buscar_no_crm`, `ver_negocio`, `ver_organizacao`, `ver_pessoa`, `listas_do_crm` | `lib/mcp/servidor.ts` |
| Registro de toda chamada (D-178): sem registro, sem resposta | `lib/mcp/registro.ts`, tabela `chamada_agente` |
| Tela **Agentes de IA** (menu pessoal, ao lado de Notificações): endereço do conector, agentes conectados com **Desconectar**, interruptor de mudanças sensíveis, últimas 50 chamadas | `app/(sistema)/agentes/` |

⛔ **A brecha que a fase 2 fechou.** O token que o Supabase entrega ao agente é um token comum de usuário. Sem trava, o agente poderia usá-lo **direto na API do Supabase** e pular o MCP: sem registro, sem limite, sem as regras. A trava é `porta_permitida()` (migration `20261115120000`): token com `client_id` só passa pela RLS se a requisição trouxer o cabeçalho `x-lure-mcp` com o segredo do servidor (variável `MCP_SEGREDO_BANCO` na Vercel; o banco guarda só o hash, em `privado.segredo_mcp`). `pertence_ao_dominio()` e `usuario_atual()` passaram a exigir isso.

⚠️ **Toda política de acesso nova tem de passar por `pertence_ao_dominio()` ou `usuario_atual()`.** Política escrita com `auth.uid()` direto reabre a brecha para aquela tabela.

⚠️ **Desconectar vale na hora.** A assinatura do token vale até ele vencer (~1 h), mas o MCP confere a sessão viva a cada chamada (`agente_atual()`), e desconectar apaga a sessão.

### 6.3 Fases 3 e 4 — escrita (15/11/2026)

| Peça | Onde |
|---|---|
| **Camada comum de regras** — o trabalho de fundo da seção 3. As Server Actions de negócio, Kanban, atividade, anotação e contatos passaram a chamá-la, e o MCP chama a mesma | `lib/regras/` |
| Escrita reversível: `criar_anotacao`, `criar_atividade`, `editar_atividade`, `concluir_atividade`, `criar_organizacao` (com o aviso de homônima da D-168), `criar_pessoa`, `criar_negocio` | `lib/mcp/escrita.ts` |
| Escrita sensível, atrás do interruptor (D-176): `mover_etapa`, `alterar_valor`, `trocar_responsavel`, `declarar_desfecho` (perdido exige motivo; ganho agenda o follow-up da D-021) | `lib/mcp/escrita.ts` |
| **Modo ensaio** em toda escrita (`ensaio=true`): confere tudo e diz o que faria, sem gravar | `lib/regras/` |
| **Marca "via agente"** (D-174) e o limite diário | migration `20261115140000_escrita_de_agentes.sql` |

**A marca "via agente" (D-179).** Coluna `via_agente` com o **nome** do agente em `negocio`, `anotacao`, `atividade` e `evento_negocio`. Quem preenche é um **gatilho no banco**, a partir do `client_id` do token — nunca o que vem na requisição. Assim o agente não apaga a própria marca e uma pessoa não se passa por agente. Ela diz quem **criou**; num update fica como estava, e quem mudou o quê depois está no `evento_negocio`, que tem a marca própria. Na ficha do negócio, a linha do tempo mostra o selo "via Claude".

⚠️ **`organizacao` e `pessoa` ficaram sem a coluna, de propósito.** Campo novo em `organizacao` obriga a mexer na fusão (CLAUDE.md). Quem criou o cadastro fica em `chamada_agente.alvo`, o link do registro.

**Limite diário (D-180): 300 gravações por usuário por dia**, somando todos os agentes dele. Ensaio não conta. O teto mora em `LIMITE_DIARIO_DE_ESCRITAS` (`lib/mcp/registro.ts`). A contagem é `escritas_de_agente_hoje()`, pelo dia de São Paulo. A tela mostra "Gravações hoje: X de 300".

**Conferido antes de publicar.** A migration foi ensaiada contra o banco real, numa transação desfeita no fim, e a marca saiu certa nos quatro caminhos: agente, pessoa, script e chave de serviço. As 18 ferramentas montam com esquema válido, e as recusas de regra passam pelo registro. **Não conferido:** uma escrita de ponta a ponta por um agente de verdade. É o teste geral do maestro.

⚠️ **Quem passa o agente ao claude.ai precisa reconectar o conector** depois de cada atualização: o claude.ai guarda a lista antiga de ferramentas.

---

## 7. Perigos e mitigação

| Perigo | Mitigação |
|---|---|
| **Instrução escondida em texto lido pelo agente** (*prompt injection*): um e-mail ou anotação diz "marque todos como perdidos" | Escrita estreita; nenhuma exclusão; escrita sensível desligável; limite diário |
| **Não há base de teste** — agente em loop grava direto na base real | Modo ensaio em toda ferramenta de escrita; limite diário; nada em massa |
| **Chave vazada dá acesso como o usuário**, e o repositório é público | Chave nunca no código; guardada em hash; revogável na tela; segurança não depende de esconder caminho |
| **Dados de clientes passando por provedores de IA** | Decisão do maestro (D-173): a IA vê tudo. Risco assumido e registrado |
| **Agente diz que fez e não fez** | Resposta de escrita traz id e link |
| **Excesso de chamadas** no plano **Hobby** da Vercel (P-035) | Medir na fase 1; teto por chamada e por dia |

---

## 8. Recursos

| Item | Detalhe |
|---|---|
| Bibliotecas | SDK oficial de MCP para TypeScript e o adaptador de MCP da Vercel para Next.js — versões conferidas na hora de implementar |
| Banco | Migrations: chave de agente (hash, dono, criada, revogada), preferência de escrita sensível, marca "via Agente IA" (P-056) |
| Vercel | Variáveis só de servidor para o OAuth |
| Teste | MCP Inspector e Claude Code local; depois Grok, claude.ai e `conectar_mcp` do Batuta |
| Custo | Infraestrutura ≈ **R$ 0/ano** (mesmo deploy, mesmo Supabase). Tokens de IA são pagos onde o agente roda |

---

## 9. Perguntas em aberto

| # | Pergunta | Bloqueia |
|---|---|---|
| ~~**P-054**~~ | ✅ **Respondida em 15/11: sim.** O servidor OAuth 2.1 do Supabase, com cadastro automático de clientes e página de aprovação nossa, aceita o login Google existente e emite token com o e-mail. As chaves do projeto já eram ES256, sem preparação. Custo zero. Ver 6.1 | — |
| **P-055** | Como o **Grok bot** (agente autônomo da xAI) se conecta — pelos mesmos conectores do grok.com, ou por outro caminho? Nada específico foi encontrado em 15/11 | fase 1 |
| **P-056** | ✅ **Respondida em 16/11 → D-179:** marca em `negocio`, `anotacao`, `atividade` e `evento_negocio`; organização e pessoa sem ela | — |
| ~~**P-057**~~ | ✅ **Respondida em 15/11 (D-178): nasce ligado.** O maestro recusou a proposta de nascer desligado | — |
| **P-058** | ✅ **Respondida em 16/11 → D-180: 300 gravações por usuário por dia**, agentes somados, ensaio fora | — |
| **P-059** | ✅ **Respondida em 16/11 → D-181:** sem chave de agente; Claude Code, Batuta e Cursor entram por OAuth como o claude.ai | — |

---

## Changelog

- **v0.5** — 16/11/2026 — P-056, P-058 e P-059 respondidas pelo maestro: **D-179** (onde mora a marca), **D-180** (limite sobe para 300 por dia) e **D-181** (sem chave de agente).
- **v0.4** — 16/11/2026 — Fases 2 a 4 **publicadas** (commit `afde271`). Na seção 6.1, a armadilha da conta única na página de aprovação, achada ao conectar o Cursor, e a correção: trocar de conta na própria página e escolha de conta no login com Google.
- **v0.3** — 15/11/2026 — **Fases 2, 3 e 4 construídas.** Seções 6.2 e 6.3. Leitura completa, tela Agentes de IA e a trava `porta_permitida()` contra o uso do token direto no Supabase. Camada comum de regras (`lib/regras`), que telas e MCP passam a chamar. Escrita reversível e sensível, com ensaio, marca "via agente" e limite diário. P-056 e P-058 recebem proposta aplicada, a validar. Entra a P-059 (dispensar a chave de agente).
- **v0.2** — 15/11/2026 — **Fase 1 entregue e conferida em produção.** Entra a **D-178** (interruptor nasce ligado; toda chamada de agente registrada), respondendo à P-057. Entra a seção 6.1: o que foi construído, a prova feita pelo claude.ai no celular, a configuração do Supabase e as duas armadilhas dela. P-054 respondida. Endereço oficial do conector no domínio da Lure.
- **v0.1** — 15/11/2026 — Primeira versão. Plano discutido com o maestro na sessão 19: seis respostas dele viraram D-172 a D-177. A descoberta que mudou a ordem: Grok e claude.ai exigem OAuth, então o login Google do domínio virou porta principal e a fase 1 ataca justamente isso.
