# 16 — Plano do MCP para Agentes de IA (v0.2)

| Campo | Valor |
|---|---|
| **Documento** | Plano de Implementação — servidor MCP do CRM para agentes de IA |
| **Projeto** | CRM próprio (substituição do Pipedrive) |
| **Versão** | v0.2 |
| **Data** | 15/11/2026 |
| **Status** | 🟢 **fase 1 entregue e conferida em produção (15/11).** Decisões D-172 a D-178 validadas pelo maestro; P-054 e P-057 respondidas; P-055, P-056 e P-058 em aberto |

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

⚠️ **O cadastro automático de agentes não abre o CRM.** Qualquer agente consegue se cadastrar, mas para receber token ainda precisa que alguém do domínio entre com o Google e aprove na página do CRM.

**Ficou para a fase 2:** a chave de agente (porta secundária do Claude Code e do Batuta) e o teste com o **Grok** (P-055). O adaptador de MCP da Vercel não foi usado: o próprio SDK já traz o transporte para `Request`/`Response` da Web, que é o que a rota do Next.js recebe.

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
| **P-056** | **Onde guardar a marca "via Agente IA"**: coluna no `evento_negocio` (o gatilho precisa saber de onde veio a escrita), e em `anotacao` e `atividade` | fase 3 |
| ~~**P-057**~~ | ✅ **Respondida em 15/11 (D-178): nasce ligado.** O maestro recusou a proposta de nascer desligado | — |
| **P-058** | **Limite diário** de escritas por usuário via agente — qual número? | fase 3 |

---

## Changelog

- **v0.2** — 15/11/2026 — **Fase 1 entregue e conferida em produção.** Entra a **D-178** (interruptor nasce ligado; toda chamada de agente registrada), respondendo à P-057. Entra a seção 6.1: o que foi construído, a prova feita pelo claude.ai no celular, a configuração do Supabase e as duas armadilhas dela. P-054 respondida. Endereço oficial do conector no domínio da Lure.
- **v0.1** — 15/11/2026 — Primeira versão. Plano discutido com o maestro na sessão 19: seis respostas dele viraram D-172 a D-177. A descoberta que mudou a ordem: Grok e claude.ai exigem OAuth, então o login Google do domínio virou porta principal e a fase 1 ataca justamente isso.
