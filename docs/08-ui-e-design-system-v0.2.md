# 08 — UI e Design System (v0.2)

| Campo | Valor |
|---|---|
| **Documento** | UI e Design System |
| **Projeto** | CRM próprio (substituição do Pipedrive) |
| **Versão** | v0.2 |
| **Data** | 13/08/2026 |
| **Status** | rascunho — aguarda validação do maestro |

> Base: manual de identidade visual da **Lure**, escritório BR/BAUEN, 2015 (D-092). Tokens gerados no Claude Design e revisados aqui. Arquivos de referência: `lure-crm-tokens.css` e `tailwind.config.ts`.

---

## 1. Princípio visual

O manual é explícito: **"trabalhamos em um mundo corporativo, por isso nossa cor base é o preto e o branco"**, e sobre essa base entra *"uma pitada de cor em abundância"* — a cor **pontua**, nunca domina.

Isso coincide com o que uma ferramenta de trabalho densa exige. Dez colunas, seis etapas e treze indicadores só são legíveis sobre neutro dominante. **Neutro é a espinha dorsal; a cor carrega significado, não decoração.**

Regra derivada: **nenhuma cor de marca aparece sem significar algo** — etapa, status, estado semântico ou série de gráfico.

---

## 2. Paleta oficial (imutável)

| Cor | Hex |
|---|---|
| Amarelo | `#ffdd00` |
| Azul-claro | `#0abaee` |
| Magenta | `#e5007d` |
| Verde | `#00973a` |
| Verde-oliva | `#7aa42c` |
| Roxo | `#5c2482` |
| Vinho | `#6f163a` |
| Verde-escuro | `#118937` |

**Hierarquia do manual:** amarelo é o destaque padrão, junto do preto; azul-claro pontua detalhes; as demais compõem sem protagonismo.

**Regra de contraste:** `#ffdd00` **nunca é cor de texto**. Funciona como fundo com texto preto. Para texto, ícone ou borda em amarelo, usar a variante escurecida `--brand-yellow-ink` (`#7a6600`). O mesmo vale para as demais: cada cor tem uma variante `-ink` acessível sobre branco e uma `-on-dark` para superfícies escuras.

---

## 3. Três correções aplicadas aos tokens gerados

Registradas como decorrência técnica, não como escolha de gosto.

### 3.1 O amarelo perde o papel de alerta
Nos tokens originais, `#ffdd00` acumulava três papéis: cor de ação (`--accent`), alerta (`--warning`) e etapa 6. Na tela de Kanban, o botão primário e a etapa Aguardando Contrato ficariam idênticos.

**Correção:** o amarelo permanece como **ação** e como **etapa 6**. O alerta migra para âmbar derivado — `--warning: #d99000`, `--warning-ink: #8a5a00`, `--warning-bg: #fdf3e0`.

### 3.2 A etapa 5 sai do verde-oliva
Etapa 4 (`#00973a`), etapa 5 (`#7aa42c`) e status Ganho (`#118937`) eram três verdes próximos. Sob deuteranopia, as etapas 4 e 5 — **vizinhas no funil** — ficam indistinguíveis.

**Correção:** etapa 5 passa ao **roxo** `#5c2482`, e a etapa 3 assume o **vinho** `#6f163a`. Progressão resultante:

| # | Etapa | Cor | Hex |
|---|---|---|---|
| 1 | Cold Lead | azul-claro | `#0abaee` |
| 2 | Hot Lead | magenta | `#e5007d` |
| 3 | Contato Realizado | vinho | `#6f163a` |
| 4 | Apresentação Realizada | verde | `#00973a` |
| 5 | Proposta Enviada | roxo | `#5c2482` |
| 6 | Aguardando Contrato | amarelo | `#ffdd00` |

⚠️ **Regra de acessibilidade:** a distinção de etapa **nunca depende só de cor**. O cartão do Kanban e a linha da Lista sempre trazem o nome da etapa por escrito.

### 3.3 Paleta de gráficos
Os treze indicadores (D-063) admitem agrupamento por origem, produto e área (D-064) — dimensões com número **variável** de valores. Sem sequência definida, cada gráfico nasceria com paleta própria.

**Sequência categórica, nesta ordem:**
`#0abaee` → `#e5007d` → `#00973a` → `#5c2482` → `#7aa42c` → `#6f163a` → `#d99000` → `#118937`

Acima de oito categorias, repetir a sequência com luminosidade reduzida em 20%. Para séries de valor contínuo (barras mensais), usar **uma única cor** — azul-claro — e não uma cor por barra.

---

## 4. Status do negócio

| Status | Cor | Hex | Intenção |
|---|---|---|---|
| Parado | neutro | `#9e9e9e` | Apagado, inativo, **sem alarme**. É a maioria da base |
| Negociação | azul-claro | `#0abaee` | Ativo, em condução |
| Ganho | verde-escuro | `#118937` | Desfecho positivo |
| Perdido | vinho | `#6f163a` | Desfecho negativo, **sem gritar** — perder faz parte |

---

## 5. Tipografia

- **Interface:** **Archivo** (Google Fonts), substituta livre da Flama. Grotesca de proporções próximas, com pesos suficientes para hierarquia densa.
- **Números tabulares:** ativar variante tabular nas colunas de valor, para os reais alinharem na vertical.
- **Monoespaçada:** IBM Plex Mono, uso restrito a identificadores.
- **Logotipo:** arte pronta em SVG, com a Flama original. Não se recompõe em código.
- Farnham fica **fora da interface** — o manual restringe seu uso ao carimbo institucional.

Escala base **13px** para corpo de tabela e **14px** para formulário — adequada à densidade escolhida.

---

## 6. Densidade e tema

- **Linha de tabela: 44px** (D-090). Cerca de 15 negócios por tela; a navegação se dá por filtro (D-055), não por rolagem.
- **Tema claro e escuro, ambos** (D-091), alternáveis por botão. Todo componente novo é verificado nas duas variantes — vira critério de aceite no Doc 11.

### 6.1 Linha de filtro em tabela densa

Regras que saíram de um defeito real: com dez colunas em ~1.216px, a linha de filtro da Lista ficou com texto quebrando dentro dos campos, frases cortadas no meio e controles de alturas diferentes. O maestro descreveu como "desleixado", e estava certo. O conserto não foi acertar números — foi tirar as causas.

**1. Rótulo de controle não repete o cabeçalho.** O `<select>` embaixo de **PRODUTO** diz **"Todos"**, não "Todos os produtos". A frase longa não cabe em 85px e o navegador a corta no meio (*"Todos os pr…"*), que é o que dá cara de improviso — e ela é redundante, porque o nome da coluna está escrito logo acima. ⚠️ **O nome não some da acessibilidade:** ele passa para o `aria-label`, que antes dizia a bobagem *"Filtrar por todos os produtos"* e agora diz *"Filtrar por Produto"*.

**2. Nenhum controle pode quebrar linha.** Duas linhas de texto dentro de um campo de 28px leem-se como defeito, não como informação. Todo gatilho leva `whitespace-nowrap`, `overflow-hidden` e um filho `min-w-0 truncate`; o valor inteiro vai no `title`. Foi o que o seletor de responsável exigiu — ele vive em duas larguras muito diferentes (barra do Kanban e coluna de 130px), então o texto de "sem filtro" virou propriedade.

**3. Uma medida só para a linha inteira.** Todos os controles de filtro compartilham a mesma constante de altura e padding. Com dez colunas lado a lado, 2px de diferença entre um `<select>` e um `<input>` aparecem como desalinhamento na linha toda.

**4. Célula de filtro alinha pelo topo (`align-top`).** Valor e Criado em têm **dois** controles empilhados; as outras têm um. Centralizado, o controle único flutuava no meio de uma célula alta e a linha inteira ficava irregular. Pelo topo, todos começam na mesma altura e o segundo campo desce por baixo, de propósito.

**5. Filtro de intervalo empilha, não divide a coluna.** Dois campos lado a lado numa coluna de ~110px ficam com ~40px cada e viram quadradinhos onde não se lê o que foi digitado. Empilhados, cada um usa a largura inteira — custa uma linha no cabeçalho, uma vez só.

**7. Um seletor por pergunta.** Um controle que mistura duas dimensões — *de quem* e *em que estado*, por exemplo — parece econômico e some com metade das combinações: uma lista de "Minhas pendentes / Todas pendentes / Todas" não tem como mostrar *as concluídas de uma pessoa*. Dois seletores lado a lado ocupam quase o mesmo espaço e cobrem o produto inteiro das opções. ⚠️ **E quando o recorte esconde tudo, a tela diz quantas** — *"Nenhuma atividade neste recorte, 22 estão escondidas pelo filtro"*. Vazio silencioso se lê como "não existe", que é a armadilha da C-05.

**6. Quando o rótulo não cabe de jeito nenhum, encurte o rótulo — não corte no meio.** "MOTIVO DE PERDA" mede ~120px em maiúsculas com `tracking-caps`, e a coluna tem ~77px úteis: não há largura que resolva sem roubar de outra coluna. O cabeçalho mostra **"MOTIVO"**, com o nome inteiro no `title` e no rótulo que o CSV usa. ⚠️ Reservar largura para o **funil de filtro ativo** quando a coluna nascer filtrada: desde a D-149 a coluna Responsável abre sempre filtrada, e esse ícone custa 12px permanentes.

---

## 7. Notas técnicas para o Claude Code

| # | Item | Ação |
|---|---|---|
| 1 | ⚠️ O bloco `spacing` do `tailwind.config.ts` **redefine a escala padrão** (`3` → 6px, `5` → 12px). Componentes do shadcn/ui vêm escritos com as classes padrão e renderizarão errado | **Remover o bloco `spacing`** e usar a escala padrão do Tailwind |
| 2 | O arquivo está na sintaxe do **Tailwind v3**; a v4 configura tema em CSS | Confirmar a versão antes de iniciar |
| 3 | Ícones não definidos | Adotar **lucide-react**, já presente no ecossistema shadcn/ui |
| 4 | Logotipo, símbolo "+" e monograma | Obter os vetores do pacote que acompanha o manual — **P-024** |
| 5 | Carregamento da fonte | `next/font` com Archivo, subconjunto latino |

---

## 8. Pontos em aberto

| # | Questão | Situação |
|---|---|---|
| B-01 | Componentes e telas de demonstração ainda não desenhados em detalhe | Fase 3, após validação deste documento |
| B-02 | Comportamento das telas densas em largura de celular (E-013) | Depende do Bloco 12 |
| B-03 | Vetores do logotipo | P-024 — depende do maestro |

---

## Changelog

- **v0.2** — 27/08/2026 — **Seção 6.1 nova: linha de filtro em tabela densa.** Seis regras tiradas de um defeito real — texto quebrando dentro dos campos, frases cortadas no meio e controles de alturas diferentes na Lista de dez colunas. Entra também a regra **um seletor por pergunta**. A que mais rende: **rótulo de controle não repete o cabeçalho** ("Todos", não "Todos os produtos"), porque a frase longa não cabe, o navegador a corta no meio e ela é redundante com o nome da coluna logo acima — o nome vai para o `aria-label`, onde faz falta.
- **v0.1** — 13/08/2026 — Criação a partir do manual de marca Lure e dos tokens gerados no Claude Design. Três correções aplicadas: amarelo perde o papel de alerta, etapa 5 sai do verde-oliva, paleta de gráficos definida.
