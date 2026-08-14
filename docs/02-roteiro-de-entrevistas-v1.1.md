# 02 — Roteiro de Entrevistas (v1.1)

| Campo | Valor |
|---|---|
| **Documento** | Roteiro de Entrevistas |
| **Projeto** | CRM próprio (substituição do Pipedrive) |
| **Versão** | v1.1 |
| **Data** | 14/08/2026 |
| **Status** | **concluído** — Fase 1 encerrada. Respostas não são reescritas; revisões posteriores entram como nota |

> **Regra:** uma pergunta por vez. As perguntas são um mapa, não um script rígido. As respostas do maestro ficam registradas abaixo de cada pergunta.
>
> **Ordem revista (D-070):** 1 → 8, depois **10**, depois 9, 11 e 12.

---

## Bloco 1 — Contexto e Objetivo

**Status:** 🟢 concluído — 10/08/2026

- **1.1** Motivação central para sair do Pipedrive?
  - *Resposta:* **Fator único: custo.** Não há frustração funcional.
- **1.2** Custo atual e teto aceitável?
  - *Resposta:* R$ 3.500/ano com 4 usuários; necessidade real de 10 (~R$ 7.000/ano).
  - *Implicação:* cobrança por assento é eliminatória.
- **1.3** Quantas pessoas e em quais papéis?
  - *Resposta:* Hoje só os sócios. Plano de SDR, BDR, closer e coordenação. Acessos parametrizáveis. *Revisto no Bloco 5.*
- **1.4** Qual o negócio, o cliente e o modelo de venda?
  - *Resposta:* Consultoria empresarial, clientes majoritariamente PJ, valor total do contrato, todos os canais, sem licitações.
- **1.5** Como será medido o sucesso?
  - *Resposta:* Paridade funcional com o Pipedrive já é sucesso, somada à soberania de evoluir.

## Bloco 2 — Processo Comercial

**Status:** 🟢 concluído — 10/08/2026

- **2.1** Caminho de uma oportunidade? — *Qualificação da organização primeiro; depois o negócio é criado.*
- **2.2** Mais de um funil? — *Hoje um, com desejo de criar outros.*
- **2.3** O que faz avançar de etapa? — *Cold e hot são equivalentes. Retrocesso por arrastar-e-soltar. Revisto no Bloco 6: existe uma exceção.*
- **2.4** Ciclo e ticket médio? — *Ciclo longo, meses. Ticket ~R$ 100.000.*
- **2.5** Origem da oportunidade? — *Não existe hoje; o maestro quer o campo, com tipos cadastráveis (E-001).*
- **2.6** Motivos de perda? — *Já existem como lista configurável.*
- **2.7** Acompanhamento após o ganho? — *Follow-up de 90 dias, configurável e não obrigatório.*

## Bloco 3 — Entidades e Dados

**Status:** 🟢 concluído — 10/08/2026

- **3.1 / 3.2** Negócio — *organização, pessoas, valor, etapa, origem, título, responsável. Sem data prevista de fechamento. Só título e organização obrigatórios.*
- **3.3** Organização — *nome, cidade e website.*
- **3.4** Pessoa — *nome, cargo, telefones e e-mails.*
- **3.5** Vínculos — *pessoa em várias organizações; negócio com várias pessoas; negócio não existe sem organização.*
- **3.6** Pessoa física — *cadastrada como organização comum.*
- **3.7** Atividades — *anotações e atividades são distintas. Chamada, reunião, tarefa, e-mail.*
- **3.8 / 3.9** Atividade sem negócio? — *Não. Prospecção anterior é registrada retroativamente.*
- **3.10** Campos customizáveis? — *Fixos.*
- **3.11 / 3.12** Produtos — *nome e área; relação um para um.*
- **3.13** Histórico do negócio? — *Log automático de eventos, item não-postergável.*
- **3.14** Etiqueta e principal nas formas de contato? — *Não.*

## Bloco 4 — Regras de Negócio e Automações

**Status:** 🟢 concluído — 10/08/2026

- **4.1** Cold/hot permanecem etapas? — *Sim. Revisto parcialmente no Bloco 6.*
- **4.2** Cargo pertence a quê? — *Ao vínculo.*
- **4.3** Produto obrigatório? — *Não.*
- **4.4** Duplicidade? — *Ferramenta de mesclagem.*
- **4.5** Anotações nas fichas? — *Sim, o raio-x é importante.*
- **4.6** Automações e canal? — *Follow-up, negócio parado, atividade vencida, lembrete. Somente notificação no app.*

## Validação do Modelo de Domínio (v0.2 → v0.3)

**Status:** 🟢 concluído — 12/08/2026

- **V.1** Negócio → Produto é N:1? — *Sim.*
- **V.2** Status e Etapa coexistem? — *Sim, os dois. Desdobramento: status **fixo em quatro valores** — Parado · Negociação · Ganho · Perdido. Parados ficam congelados.*
- **V.3** Anotações derivadas em organização e pessoa? — *Sim.*
- **V.4** Ganho e Perdido permanecem como etapas? — *Não. Etapa de fechamento única, que já existe: "Aguardando Contrato".*
- **V.5** Mover para o fechamento exige desfecho? — *Sim, diálogo obrigatório.*
- **V.6** Botões Ganho/Perdido permanecem? — *Sim.*

## Bloco 5 — Usuários, Papéis e Permissões

**Status:** 🟢 concluído — 12/08/2026

- **5.1** Quais papéis? — *Decisão adiada. Todos no mesmo nível, com esqueleto de papéis no código.*
- **5.2** Um vendedor vê os negócios dos outros? — *Sim.*
- **5.3** Cadastro e autenticação? — *Google, autorização por domínio. App já criado no Google Cloud.*
- **5.4** Usuário que sai? — *Cancela-se a conta no Google. Marcação ativo/inativo manual e ferramenta de migração de negócios e atividades futuras.*
- **5.5** Permissões granulares? — *Adiada para a fase 2.*

## Bloco 6 — Visualizações e UX

**Status:** 🟢 concluído — 12/08/2026

- **6.1** Cartão do Kanban? — *Nome do negócio, organização, valor total, status.*
- **6.2** Colunas da Lista? — *Dez colunas fixas; sai a data de fechamento esperada, entram etapa e origem.*
- **6.3** Filtros e ordenação? — *Em todas as colunas, no próprio cabeçalho, combináveis, salvos por usuário, com destaque visual.*
- **6.4** Tela de detalhe? — *Segue o Pipedrive com os campos do modelo. Log na aba Linha do Tempo, com seletor de três posições. Botões Ganho/Perdido no topo.*
- **6.5** Outras telas? — *Atividades, Contatos, Produtos, Estatísticas, Configurações. ⚠️ Descoberta da etapa "Aguardando Contrato" e do volume real da base.*
- **6.6** O que é irritante hoje? — *Nada.*

## Bloco 7 — Estatísticas e Relatórios

**Status:** 🟢 concluído — 13/08/2026

- **7.1** Quais perguntas o gestor precisa responder olhando o dashboard?
  - *Resposta:* "Podemos fazer com **estatísticas tradicionais** mesmo; importante deixar o módulo de relatórios/dashboard **flexível para novos indicadores**."
  - *Desdobramento:* investigado o que "flexível" significa, em três níveis — painel fixo em código (A), catálogo de indicadores com painel montável pelo usuário (B), construtor de relatórios completo (C).
  - *Resposta final:* **nível B** (D-062). O C fica registrado como E-008.
  - *Implicação:* o indicador vira **entidade**; o painel do usuário vira relação. É o que torna barato acrescentar indicador depois.

- **7.2** Quais indicadores compõem o catálogo inicial?
  - *Proposta do consultor:* cinco de paridade com o Insights atual + oito habilitados pelo log de eventos e pelo campo origem.
  - *Resposta:* **"todos esses são necessários"** — os treze no MVP (D-063).
  - *Registro:* os itens 6 a 13 ultrapassam a paridade (E-009). Não custam campo nem tela novos, custam construção — é onde há gordura se o prazo apertar.
  - ⚠️ *Dependência:* 7, 8 e 9 exigem o log em produção desde o dia 1.

- **7.3** Quais recortes de análise, além de período e usuário?
  - *Resposta:* **origem, produto, área.** Ficam de fora etapa, motivo de perda e status como recorte.
  - **7.3b** Como filtro ou como eixo de agrupamento? — *Resposta:* **os três como eixo de agrupamento**, com o filtro vindo junto (D-064).

- **7.4** Haverá metas a serem acompanhadas?
  - *Resposta:* **"sim existem metas, mas gostaria de implementar o acompanhamento depois que o MVP estiver pronto"** (D-065, E-010).
  - *Cuidado registrado:* na fase 2 a meta entra como **atributo do indicador**, não como módulo paralelo.

- **7.5** É necessário exportar dados? Em quais formatos?
  - *Resposta:* **exportar o que está na tela**, começando por **CSV UTF-8 com BOM** (D-066). Exportação da base inteira, Excel e PDF ficam fora.
  - *Decorrência:* exporta o conjunto filtrado inteiro, não a página visível.

- **7.6** Como os negócios **Parados** entram nas estatísticas?
  - *Resposta:* **opções 1 e 3** — excluídos por padrão dos indicadores de desempenho, com interruptor "incluir parados", **e** com indicador próprio de saúde da base (D-067).
  - *Implicação:* **ponto A-08 encerrado.**

## Bloco 8 — Migração e Integrações

**Status:** 🟢 concluído — 13/08/2026

- **8.1** Os dados históricos serão migrados? Tudo ou parte?
  - *Resposta:* **tudo** (D-068). **P-002 encerrada.**
  - *Fronteira registrada:* migra-se tudo que **cabe no modelo** — campos cortados por D-025 e pelo Bloco 6 não têm destino.
  - *Investigação obrigatória para o Doc 14:* se os changelogs do Pipedrive permitem reconstituir a trajetória de etapa/valor de cada negócio, ou se o log começa zerado na virada.

- **8.2** Haverá período de operação em paralelo?
  - *Resposta:* **"não, dia 3 de setembro encerra o Pipedrive, já precisamos estar com nosso MVP no ar, virada imediata"** (D-069, R-008).
  - *Risco apresentado pelo consultor:* 21 dias a partir de 13/08, com a documentação em ~70% da Fase 1 e nenhuma linha de código escrita. **Risco apresentado e assumido pelo maestro** — "3/9 é o limite, mas vamos conseguir, temos tempo".
  - *Ação desacoplada identificada:* a **extração da base do Pipedrive** não depende de stack nem do sistema pronto, e precisa acontecer **antes** de 3/9. Vira P-020.

- **8.3** Quais integrações externas são necessárias?
  - *Resposta:* **Google Agenda depois do MVP** (D-071, E-011). **WhatsApp como hiperlink de protocolo**, coisa simples (D-072). **Assinatura eletrônica totalmente desnecessária** (D-073).
  - *Sobre e-mail:* o maestro levantou SMTP com conta própria. Investigado para quê serviria; **resposta final: "deixa como estava — sem e-mail no MVP"**. D-041 e R-005 permanecem. Registrado que, se a fase 2 quiser notificação por e-mail, o caminho é SMTP próprio e não serviço pago.

- **8.4** Precisa de API pública ou webhooks?
  - *Resposta:* **"num futuro pretendemos incorporar agentes de IA com nosso CRM, então vamos precisar de endpoints ou MCP, mas é projeto pra depois do MVP"** (D-074, E-012).
  - *Implicação:* vira **critério de arquitetura** — R-009.

- **8.5** Há sistemas internos com os quais o CRM deve conversar?
  - *Resposta:* **sistema interno em Bubble.io.** A integração pretendida é no fim do funil: identificar a qual cliente daquele sistema o negócio corresponde (D-075).
  - **8.5b** Qual versão da integração? — *Resposta:* **busca manual**, não automática: "assim como colocamos motivo após perda, poderíamos indicar o cliente/Bubble após ganho, só pra criar um link e posteriormente fazer algum estudo; em resumo, seria um pop fazendo um GET na tabela de clientes" (D-076).
  - **8.5c** Se o Bubble não responder, o Ganho conclui? — *Resposta:* **opcional, pode pular e vincular depois** (D-077).
  - *Nota técnica:* a Data API do Bubble precisa ser habilitada nas configurações da aplicação, com token. Casamento por nome é armadilha — daí o identificador externo na Organização.

## Bloco 10 — Restrições e Preferências Técnicas

**Status:** 🟢 concluído — 13/08/2026 · *antecipado por D-070*

> Bloco de **decisão do maestro**. O consultor apresenta opções com prós, contras e custo.

- **10.1** Há stack, linguagem ou framework de preferência, ou já em uso?
  - *Resposta:* "O que importa é que o sistema seja **fluido**, responda bem no navegador, **não ocupe memória RAM demais**, tenha nível **aceitável/padrão de segurança**. Gostaria de manter o padrão de outros sistemas meus: **banco Supabase, hospedagem Vercel**. O resto, sugira o padrão de mercado e de fácil desenvolvimento pelo Claude Code. **Ele será o mantenedor, eu apenas conduzo.**"
  - *Decisões:* D-078 (Supabase), D-079 (Vercel).
  - *Proposta do consultor, aprovada:* Next.js + TypeScript + Tailwind + shadcn/ui + TanStack Query + dnd-kit + Recharts (D-080).
  - *Alternativa apresentada e descartada:* Vite + React puro. Mais leve e mais simples, mas sem servidor próprio onde guardar o token da API do Bubble (D-076). O maestro pediu o comparativo detalhado antes de decidir e optou por **Next.js**.
  - *Nota sobre R-004:* o mantenedor será o Claude Code conduzido pelo maestro — não há vigilância ativa do sistema.

- **10.2** Onde moram as regras de negócio — no banco, no servidor ou no cliente?
  - *Nota de condução:* a primeira formulação misturou segurança de acesso com integridade de dado, e o maestro apontou a confusão com razão — a API REST do Supabase **já está ligada desde o dia 1**, não é algo que se abre na fase 2; e como o papel é único e o acesso total (D-049), não há nada a proteger do próprio usuário. Reformulada só sobre integridade.
  - *Resposta:* **log no banco, resto na aplicação** (D-081).
  - *Decorrência para o Doc 14:* a carga inicial da migração roda com o gatilho suspenso, ou marca os eventos como de carga — senão o log nasce com 2.453 eventos falsos e contamina o lead time.
- **10.3** Estratégia de ambientes?
  - *Resposta:* **dois — desenvolvimento e produção** (D-082). O argumento decisivo foi ensaiar a migração onde errar é de graça.
  - *Regra decorrente:* nenhuma alteração de estrutura à mão pelo painel do Supabase; tudo por migração versionada.
  - *Nota:* o ambiente de desenvolvimento recebe cópia da base real — testar filtro e paginação com dez registros esconde o que 2.453 revelam (R-006).
  - ⚠️ **Revisto em 14/08/2026 (D-101).** O maestro decidiu por **uma base só**, por custo, com a carga rodando direto em produção. A regra da migração versionada permanece; o ensaio migra para o banco local em contêiner (D-102), e a nota sobre construir contra a base real continua valendo — ela passa a se referir ao banco local. *A resposta acima fica registrada como foi dada.*
- **10.4** Quem mantém o sistema depois de pronto? — *respondida em 10.1: Claude Code, conduzido pelo maestro.*
- **10.5** Restrições de orçamento, prazo ou licenciamento?
  - *Resposta:* **planos Pro já existentes** em Supabase e Vercel (D-083). Prazo já respondido em 8.2 (R-008).
  - *Verificado na fonte:* Pro do Supabase é por organização, não por projeto; projeto adicional a partir de ~US$ 10/mês; limitador de gastos ligado por padrão e deve permanecer. Vercel cobra por assento de quem publica, não por usuário do CRM.
- **10.6** Autenticação Google OAuth sobre o Supabase.
  - *Resposta:* **primeiro login do domínio cria o usuário**, ativo, papel único (D-084).
  - *Pendência de execução:* apontar as URLs de retorno no app do Google Cloud — **duas**, uma por ambiente.
  - ⚠️ **Corrigido em 14/08/2026.** Com base única (D-101) é **uma** URL no Google Cloud — e ela aponta para o **Supabase**, não para a aplicação: `https://<ref>.supabase.co/auth/v1/callback`. As URLs da aplicação vão na configuração do próprio Supabase. Ver Doc 09, seção 4.1.

## Bloco 9 — Requisitos Não-Funcionais

**Status:** 🟢 concluído — 13/08/2026

- **9.1** Onde o sistema será usado: desktop, mobile, ambos?
  - *Resposta:* **ambos, com telas diferentes no celular** (D-085). **P-017 encerrada.**
  - *Custo registrado:* cinco telas desenhadas duas vezes. Maior expansão de escopo do projeto — vira E-013, a olhar no Bloco 12.
- **9.2** Volume esperado de dados e de crescimento.
  - *Resposta inicial:* 2.000 a 3.000 negócios novos por ano. *Corrigida pelo maestro:* **"exagerei, não chegaremos a 1000 no ano"** (D-086).
  - *Esclarecimento importante:* **"o vendedor só de ter um contato novo cria um negócio"** — negócio é contato registrado, não oportunidade qualificada.
  - *Implicação de UX:* a coluna Cold Lead será a mais cheia do Kanban; carregar por partes conforme rola. Anotado para o Doc 07.
- **9.3** Idioma, fuso horário, moeda, formatos.
  - *Resposta:* **"tudo Brasil"** (D-087). Moeda única, sem multimoeda.
- **9.4** LGPD, auditoria e retenção.
  - *Resposta:* **"é um CRM interno, no máximo 10 usuários, não precisa de nada relacionado"** (D-088).
  - *Ressalva do consultor, registrada:* a LGPD olha de quem é o dado, e os titulares são contatos de empresas prospectadas. Risco baixo; escolha consciente. Mantida a exclusão de Pessoa como função normal de cadastro.
- **9.5** Disponibilidade, backup e recuperação.
  - *Resposta:* **backup diário do Supabase basta** (D-089). Restauração ponto-a-ponto (~US$ 100/mês) descartada.

## Bloco 11 — Identidade Visual e UI

**Status:** 🟢 concluído — 13/08/2026

- **11.1 / 11.2** Existe marca ou manual a seguir?
  - *Resposta:* sim — **manual de identidade visual da Lure**, feito pelo escritório BR/BAUEN em 2015, 106 páginas, fornecido em PDF (D-092).
  - *Extraído:* base **preto e branco**, com cor pontuando; paleta de oito cores com hexadecimais; **amarelo como destaque padrão**, azul-claro pontuando detalhes; símbolo "+"; tipografias Akkurat Bold (logotipo), Flama (institucional) e Farnham (uso restrito).
  - *Lacuna do manual:* trata de papelaria, sinalização e redes sociais — **não há orientação para interface de software**. A tradução foi feita via Claude Design.
  - *Restrição:* Flama e Akkurat são comerciais; licença web conflita com R-002. Substituta livre adotada: **Archivo**.
- **11.3** Densidade de informação?
  - *Resposta:* **confortável, 44px** por linha (D-090).
- **11.4** Tema claro, escuro ou ambos?
  - *Resposta:* **ambos, com alternador** (D-091).
- **11.5** Tratamento visual do Parado e da distinção usuário × sistema.
  - *Resolvido nos tokens:* Parado em neutro apagado, sem alarme. Distinção da Linha do Tempo permanece com o seletor de D-058.

## Bloco 12 — Escopo do MVP e Fases

**Status:** 🟢 concluído — 13/08/2026

- **12.1** Se o sistema entrasse no ar em 30 dias, o que **precisa** existir?
  - *Resposta:* **"talvez os relatórios, dashboard podem ficar pra depois, mas o resto tudo é utilizado diariamente pelo vendedor"** (D-093).
  - *Ressalva do consultor, aceita:* adiar as **telas** de estatística é seguro; adiar o **log de eventos** não é. O gatilho e a tabela permanecem no MVP.
  - *Desdobramento:* testados três itens que não são uso diário de vendedor — mesclagem, transferência e telas de configuração. **Resposta: "sim, podem ser em outras fases"** (D-094, D-095, D-096). **P-013 encerrada.**
- **12.2** O que pode ficar para uma segunda fase?
  - *Item em disputa:* o mobile (E-013), maior massa de trabalho restante.
  - *Resposta:* **"vendedor consulta Pipedrive no celular constantemente, tem que entrar no MVP"**.
  - **12.2b** No celular, criar e editar no dia 1 ou consultar basta? — *Resposta:* **consulta e marcação no MVP; criar/editar na fase 2** (D-097).
  - *Lacuna consciente registrada:* no dia 1 o vendedor **vê** pelo celular e **escreve** pelo computador.
- **12.3** Prazo e data imutável — *respondida em 8.2: 3/9/2026, imutável (R-008).*
- **12.4** Critério para considerar o MVP pronto?
  - *Proposta do consultor, aprovada:* sete itens (D-098), com destaque para o segundo — os sócios operarem um dia inteiro sem abrir o Pipedrive, **antes** de 3/9.

---

## Changelog

- **v1.1** — 14/08/2026 — Notas de revisão em 10.3 (D-101 reduz os dois ambientes a uma base só) e 10.6 (a URL de retorno do OAuth aponta para o Supabase, não para a aplicação). **As respostas originais não foram alteradas** — este documento é registro histórico, e reescrever o que foi dito destruiria o rastro da decisão.
- **v1.0** — 13/08/2026 — **Bloco 12 concluído e Fase 1 encerrada.** 80 perguntas respondidas em 12 blocos. Documento fecha como registro histórico das entrevistas.
- **v0.9** — 13/08/2026 — Bloco 10 concluído (10.2 a 10.6), Bloco 9 concluído e Bloco 11 concluído com o manual de marca Lure. Registrada a correção de rumo em 10.2 e a correção de volume em 9.2.
- **v0.8** — 13/08/2026 — Blocos 7 e 8 concluídos. Bloco 10 iniciado e antecipado na ordem (D-070); 10.1 respondida com as três primeiras decisões técnicas. Perguntas 7.3b, 8.5b, 8.5c, 10.2 e 10.3 acrescentadas por decorrência.
- **v0.7** — 12/08/2026 — Validação do Doc 06 como seção própria. Blocos 5 e 6 concluídos.
- **v0.6** — 10/08/2026 — Bloco 5 iniciado.
- **v0.5** — 10/08/2026 — Bloco 4 concluído.
- **v0.4** — 10/08/2026 — Bloco 3 concluído.
- **v0.3** — 10/08/2026 — Bloco 2 concluído.
- **v0.2** — 10/08/2026 — Bloco 1 concluído.
- **v0.1** — 10/08/2026 — Criação do documento com os 12 blocos.
