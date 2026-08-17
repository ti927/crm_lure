# 03 — Log de Decisões (v0.13)

| Campo | Valor |
|---|---|
| **Documento** | Log de Decisões |
| **Projeto** | CRM próprio (substituição do Pipedrive) |
| **Versão** | v0.11 |
| **Data** | 14/08/2026 |
| **Status** | vivo |

> Registro de toda decisão validada pelo maestro. Nada entra aqui sem confirmação explícita.

**Tipos:** Método · Negócio · Produto · UX/UI · Técnica · Escopo
**Situação:** ✅ validada · 🟡 proposta (aguarda validação) · ⛔ revertida

---

## Decisões de Método

| # | Data | Decisão | Justificativa | Situação |
|---|---|---|---|---|
| D-001 | 10/08/2026 | Biblioteca de 14 documentos versionados e 12 blocos de entrevista na ordem definida | Garantir cobertura completa e rastreável antes do desenvolvimento | ✅ |
| D-002 | 10/08/2026 | Entrevistas conduzidas com uma pergunta por vez | Permitir que cada resposta redirecione a investigação | ✅ |
| D-003 | 10/08/2026 | Nenhuma decisão técnica registrada sem validação explícita do maestro | Evitar escolhas por inércia do consultor | ✅ |
| D-004 | 10/08/2026 | Arquivos em UTF-8 com BOM; CSVs, quando houver, com separador ponto-e-vírgula | Padrão do maestro | ✅ |
| D-070 | 13/08/2026 | **Reordenação da Fase 1**: Bloco 10 (técnico) antecipado para logo após o Bloco 8. Blocos 9, 11 e 12 na sequência | O Bloco 10 é o único que bloqueia o início do desenvolvimento. Com o prazo de R-008, adiá-lo custa dias de construção | ✅ |

## Decisões de Negócio

| # | Data | Decisão | Justificativa | Situação |
|---|---|---|---|---|
| D-005 | 10/08/2026 | O motivador exclusivo do projeto é **custo**. Não há dores funcionais a resolver | Pipedrive atende plenamente às necessidades atuais | ✅ |
| D-006 | 10/08/2026 | O valor de um negócio é o **valor total do contrato**. Contratos recorrentes são normalizados como contrato anual de 12 parcelas | Simplifica o modelo e reflete como a empresa mede a venda | ✅ |
| D-007 | 10/08/2026 | Mercado 100% privado — **não há suporte a licitações** no escopo | Não faz parte da atuação da empresa | ✅ |
| D-012 | 10/08/2026 | ⚠️ **CORRIGIDA em 12/08/2026 — ver D-044.** | Redação original omitia "Aguardando Contrato" | ⛔ substituída |
| D-013 | 10/08/2026 | Cold lead e hot lead são **classificações equivalentes de entrada**, não progressão | Esclarecimento do maestro | ✅ |
| D-014 | 10/08/2026 | Ciclo de venda longo (meses); ticket médio de ~R$ 100.000 por contrato anual | Perfil da operação | ✅ |
| D-015 | 10/08/2026 | Sem conceito de contrato ativo, vigência ou renovação no escopo. O negócio encerra ao ser ganho | Definição do maestro no Bloco 2 | ✅ |
| D-069 | 13/08/2026 | ⚠️ **Virada imediata em 3/9/2026**, sem operação em paralelo. O contrato do Pipedrive encerra nessa data e o MVP precisa estar no ar | Decisão do maestro, com o risco de prazo explicitamente apresentado e assumido | ✅ |
| D-075 | 13/08/2026 | Existe **sistema interno próprio construído em Bubble.io**, para onde o cliente migra depois do ganho | Informação nova do Bloco 8 — primeiro sistema vizinho do CRM | ✅ |

## Decisões de Produto

| # | Data | Decisão | Justificativa | Situação |
|---|---|---|---|---|
| D-008 | 10/08/2026 | O norte do produto é **paridade funcional** com o uso atual do Pipedrive, não superação | Sucesso definido pelo maestro | ✅ |
| D-009 | 10/08/2026 | Papéis e permissões parametrizáveis | Plano de profissionalizar departamentos | 🟡 **reduzida por D-049** |
| D-010 | 10/08/2026 | **Organização é a entidade central**; Pessoa é contato vinculado | 99% dos clientes são PJ | 🟡 |
| D-011 | 10/08/2026 | Sem motor de recorrência/faturamento no MVP | Decorrência de D-006 | 🟡 |
| D-016 | 10/08/2026 | **Funis e etapas configuráveis** pelo usuário | Desejo de criar outros funis | ✅ |
| D-017 | 10/08/2026 | Negócio pode ser criado em qualquer etapa | Prática atual | ✅ |
| D-018 | 10/08/2026 | Movimentação livre entre etapas via arrastar-e-soltar | Decisão do maestro | ✅ **exceção única em D-047** |
| D-019 | 10/08/2026 | Organizações e pessoas podem existir **sem negócio vinculado** | Qualificação antecede o negócio | ✅ |
| D-020 | 10/08/2026 | Listas de **origem** e **motivo de perda** cadastráveis | Necessidade analítica | ✅ |
| D-021 | 10/08/2026 | Automação: negócio ganho gera follow-up (padrão 90 dias), desativável | Comportamento atual do Pipedrive | ✅ |
| D-022 | 10/08/2026 | **Configurabilidade é princípio de produto** | Padrão observado | 🟡 **exceção: status é fixo** (D-042) |
| D-023 | 10/08/2026 | Negócio exige **título e organização**. Demais campos opcionais | Definição do maestro | ✅ |
| D-024 | 10/08/2026 | **Não haverá data prevista de fechamento** — sem forecast | Não é usada hoje. Reconfirmada em 12/08 | ✅ |
| D-025 | 10/08/2026 | Organização terá **nome, cidade e website** | Escopo mínimo | ✅ **acrescido do ID externo (D-075)** |
| D-026 | 10/08/2026 | Pessoa terá **nome, cargo, telefones e e-mails** | Escopo mínimo | ✅ |
| D-027 | 10/08/2026 | **PF é cadastrada como organização comum** | Menos de 1% da base | ✅ |
| D-028 | 10/08/2026 | **Campos fixos** — sem customização pelo usuário | Economia de construção | ✅ |
| D-029 | 10/08/2026 | **Anotações e Atividades são entidades distintas** | Uso real no Pipedrive | ✅ |
| D-030 | 10/08/2026 | **Toda atividade pertence a um negócio** | Definição do maestro | ✅ |
| D-031 | 10/08/2026 | Cadastro de **Produto/Serviço** com nome e área configurável | Necessidade da operação | ✅ |
| D-032 | 10/08/2026 | Relação **Negócio → Produto é N:1** | Confirmado em 12/08/2026 | ✅ |
| D-033 | 10/08/2026 | **Log automático de eventos** é obrigatório e **não-postergável** | Lead time e valor inicial × fechado | ✅ |
| D-034 | 10/08/2026 | Formas de contato em **lista simples**, com link WhatsApp e mailto | Definição do maestro | ✅ |
| D-035 | 10/08/2026 | ~~Cold/hot e ganho/perdido como etapas~~ | — | ⛔ **parcialmente revertida por D-044** |
| D-036 | 10/08/2026 | **Cargo pertence ao vínculo** pessoa-organização | Mesma pessoa, cargos distintos | ✅ |
| D-037 | 10/08/2026 | **Produto/serviço não é obrigatório em nenhuma etapa** | Coerência com D-023 | ✅ |
| D-038 | 10/08/2026 | Haverá **ferramenta de mesclagem** de duplicados | Duplicidade é inevitável | ✅ |
| D-039 | 10/08/2026 | Fichas de organização e pessoa exibem **histórico consolidado derivado** | Visão de raio-x do cliente | ✅ |
| D-040 | 10/08/2026 | Automações: follow-up ao ganhar, negócio parado, atividade vencida, lembrete de próxima atividade | Ciclo longo exige acompanhamento | ✅ |
| D-041 | 10/08/2026 | Alertas apenas como **notificação no aplicativo — sem e-mail** | Elimina dependência externa, custo e risco. **Reconfirmada em 13/08/2026**: o envio por SMTP foi considerado e descartado | ✅ |

### Decisões de modelo — Sessão 02

| # | Data | Decisão | Justificativa | Situação |
|---|---|---|---|---|
| D-042 | 12/08/2026 | **Status do negócio é lista fixa de quatro valores**: Parado · Negociação · Ganho · Perdido | Automações e estatísticas precisam de marcos estáveis | ✅ |
| D-043 | 12/08/2026 | **Status e Etapa são dimensões independentes** | Flexibilidade pedida pelo maestro | ✅ |
| D-044 | 12/08/2026 | **Funil de seis etapas**, terminando em **Aguardando Contrato**. Ganho e Perdido não são etapas | Correção de D-012 | ✅ |
| D-045 | 12/08/2026 | Cada etapa carrega um **status inicial sugerido, configurável** | Cold lead é cadastro, não trabalho em curso | ✅ |
| D-046 | 12/08/2026 | **Status Parado suspende todas as automações** | Alerta sobre registro nunca tocado gera ruído | ✅ |
| D-047 | 12/08/2026 | **Trava única de transição**: Aguardando Contrato exige escolher o desfecho | O dado perdido aqui não é recuperável | ✅ |
| D-048 | 12/08/2026 | Botões **Ganho** e **Perdido** movem para Aguardando Contrato e aplicam o status | Dois cliques a menos | ✅ |

### Decisões do Bloco 5 — Usuários, Papéis e Permissões

| # | Data | Decisão | Justificativa | Situação |
|---|---|---|---|---|
| D-049 | 12/08/2026 | **MVP com papel único de acesso total**; estrutura Usuário → Papel → Permissão no modelo desde o início | Modelar permissão sem saber o que restringir produz regra irreal | ✅ |
| D-050 | 12/08/2026 | **Autenticação por Google OAuth**; autorização por domínio da empresa | Já definido pelo maestro | ✅ |
| D-051 | 12/08/2026 | **Usuário nunca é excluído**; marcação ativo/inativo manual | Preserva histórico e autoria | ✅ |
| D-052 | 12/08/2026 | **Ferramenta de transferência** de negócios e atividades futuras | Evita negócio sem dono ativo | ✅ |

### Decisões do Bloco 6 — Visualizações e UX

| # | Data | Decisão | Justificativa | Situação |
|---|---|---|---|---|
| D-053 | 12/08/2026 | **Cartão do Kanban com quatro campos**: título, organização, valor, status | Cartão enxuto | ✅ |
| D-054 | 12/08/2026 | **Lista com dez colunas fixas** | Espelha o uso atual | ✅ |
| D-055 | 12/08/2026 | **Filtro e ordenação no cabeçalho de toda coluna**, combináveis, persistidos por usuário, com indicador visual | Agilidade na gestão de leads | ✅ |
| D-056 | 12/08/2026 | **Colunas não personalizáveis** | Coerente com D-028 | ✅ |
| D-057 | 12/08/2026 | **Tela de detalhe em três zonas** | Segue a estrutura do Pipedrive | ✅ |
| D-058 | 12/08/2026 | **Aba Linha do Tempo** com seletor Usuário · Sistema · Tudo | Separa registro humano de registro de sistema | ✅ |
| D-059 | 12/08/2026 | **Menu**: Negócios · Atividades · Contatos · Produtos/Serviços · Estatísticas · Configurações | Espelha a navegação atual | ✅ |
| D-060 | 12/08/2026 | **Tela de Atividades própria**, com modo lista e calendário | É a agenda do vendedor | ✅ |
| D-061 | 12/08/2026 | **Não há irritações de UX do Pipedrive a corrigir** | Resposta 6.6 | ✅ |

### Decisões do Bloco 7 — Estatísticas e Relatórios

| # | Data | Decisão | Justificativa | Situação |
|---|---|---|---|---|
| D-062 | 13/08/2026 | **Módulo de estatísticas em nível B**: catálogo interno de indicadores, painel montável e persistido por usuário. Indicador novo entra no catálogo sem reforma de tela | Entrega a flexibilidade pedida a custo próximo do painel fixo, e é a fundação sobre a qual o construtor genérico (E-008) se ergue na fase 2 | ✅ |
| D-063 | 13/08/2026 | **Catálogo inicial de treze indicadores**, todos no MVP — ver seção "Catálogo de Indicadores" abaixo | Maestro confirmou todos como necessários | ✅ |
| D-064 | 13/08/2026 | **Recortes**: período · usuário · origem · produto/serviço · área do produto. Origem, produto e área servem tanto como **filtro transversal** quanto como **eixo de agrupamento** | Filtro dá foco; eixo dá diagnóstico. Os três recortes escolhidos são os que mudam decisão comercial na consultoria | ✅ |
| D-065 | 13/08/2026 | **Metas existem na operação, mas o acompanhamento fica para a fase 2.** Fora do MVP | Os indicadores funcionam com ou sem meta. Na fase 2, a meta entra como **atributo do indicador** (valor alvo, vigência, a quem se aplica), não como módulo paralelo | ✅ |
| D-066 | 13/08/2026 | **Exportação do que está na tela**, respeitando filtros e ordenação, em **CSV ponto-e-vírgula, UTF-8 com BOM**. Aplica-se a Lista, Atividades e indicadores. Exporta o conjunto filtrado inteiro, não a página visível | Coerente com D-004. Exportação da base completa, Excel e PDF ficam fora do MVP | ✅ |
| D-067 | 13/08/2026 | **Negócios Parados ficam fora, por padrão, de todos os indicadores de desempenho comercial**, com interruptor "incluir parados" no painel. Em paralelo, ganham **indicador próprio de saúde da base** (volume, tempo de dormência, distribuição por origem) | Encerra o ponto A-08. Cadastro dormente não é negociação em curso, mas é matéria-prima de prospecção | ✅ |

### Decisões do Bloco 8 — Migração e Integrações

| # | Data | Decisão | Justificativa | Situação |
|---|---|---|---|---|
| D-068 | 13/08/2026 | **Migração completa** dos dados do Pipedrive: negócios abertos e encerrados, organizações, pessoas, formas de contato, atividades, anotações, produtos, funis, etapas e usuários | Encerra P-002. Nada da base atual é descartado. Limite implícito: migra-se tudo **que cabe no modelo** — campos cortados por D-025 e pelo Bloco 6 não têm destino | ✅ |
| D-071 | 13/08/2026 | **Integração com Google Agenda fica para depois do MVP** | Útil, não essencial para a virada | ✅ (E-011) |
| D-072 | 13/08/2026 | **WhatsApp permanece como hiperlink** de protocolo (`wa.me`), sem integração | Confirma D-034. É atalho, não integração | ✅ |
| D-073 | 13/08/2026 | **Assinatura eletrônica fora do escopo**, sem previsão | Desnecessária na operação | ✅ |
| D-074 | 13/08/2026 | **Sem API pública nem webhooks no MVP.** A intenção declarada é incorporar **agentes de IA** ao CRM no futuro, via endpoints ou MCP | Fase 2 (E-012). Vira **critério de arquitetura** — ver R-009 | ✅ |
| D-076 | 13/08/2026 | Ao declarar um negócio como **Ganho**, o diálogo de desfecho apresenta um **seletor de cliente do sistema Bubble**, alimentado por GET na tabela de clientes. A escolha grava o **identificador externo** na Organização. Busca **manual**, sem casamento automático | Torna D-047 simétrico: quem perde informa o motivo, quem ganha informa o cliente. O humano resolve nomes divergentes olhando a lista, que é onde o algoritmo erraria | ✅ |
| D-077 | 13/08/2026 | O vínculo com o cliente do Bubble é **opcional**. Se o serviço não responder ou o cliente não estiver lá, o Ganho conclui normalmente e o vínculo pode ser feito depois pela ficha da organização | Nenhum negócio fica travado por sistema externo. A única trava do sistema continua sendo D-047 | ✅ |

### Decisões do Bloco 10 — Definição Técnica

> Primeiras decisões técnicas do projeto. Tomadas explicitamente pelo maestro, conforme regra 2.

| # | Data | Decisão | Justificativa | Situação |
|---|---|---|---|---|
| D-078 | 13/08/2026 | **Banco de dados: Supabase** (PostgreSQL gerenciado) | Padrão já usado pelo maestro em outros sistemas. Sem cobrança por assento (R-001); autenticação Google com restrição por domínio embutida (R-007); API REST automática sobre as tabelas (R-009) | ✅ |
| D-079 | 13/08/2026 | **Hospedagem: Vercel** | Padrão já usado pelo maestro. Integração nativa com Next.js; deploy por git push | ✅ |
| D-080 | 13/08/2026 | **Pilha da aplicação: Next.js (React) + TypeScript**, com **Tailwind CSS** e **shadcn/ui**, **TanStack Query** (dados no cliente), **dnd-kit** (Kanban) e **Recharts** (indicadores) | Proposta do consultor, aprovada pelo maestro. Razão decisiva pelo Next.js sobre Vite: a chamada à API do Bubble (D-076) carrega segredo e precisa de servidor onde morar. Alternativa Vite + React foi apresentada e descartada | ✅ |

### Decisões do Bloco 10 — Definição Técnica (continuação)

| # | Data | Decisão | Justificativa | Situação |
|---|---|---|---|---|
| D-081 | 13/08/2026 | **Camadas de regra.** No **banco**: o log de eventos é gerado por **gatilho**, a cada alteração de etapa, valor, responsável ou status, qualquer que seja a origem da escrita; o log é **somente inserção**, sem alteração nem exclusão. Na **aplicação (Next.js)**: as regras de processo — trava de D-047, motivo de perda, follow-up de 90 dias, chamada ao Bubble, mesclagem, transferência. No **cliente**: validação de formulário e diálogos | Encerra A-10. Não é questão de segurança contra o usuário (papel único, D-049), e sim de **integridade**: o dado será escrito por três caminhos ao longo do tempo — tela, script de migração e futuro agente de IA (E-012). Regra que mora na tela não vale para os outros dois, e buraco no log **não é recuperável** | ✅ |
| D-082 | 13/08/2026 | ~~**Dois ambientes**: desenvolvimento e produção. Dois projetos no Supabase, dois deploys na Vercel.~~ **Revista por D-101 em 14/08/2026** — permanece válida apenas a segunda metade: alterações de estrutura por **migrações versionadas no repositório**, nunca à mão pelo painel | A migração de 2.453 negócios precisa ser ensaiada até dar certo antes de valer. Pré-visualizações por branch da Vercel entram como facilidade, não como terceiro ambiente | ⛔ revista |
| D-083 | 13/08/2026 | **Sem custo incremental de assinatura.** O maestro já mantém planos Pro em Supabase e Vercel para outros sistemas; o CRM entra na infraestrutura existente | Supabase Pro é cobrado **por organização**, não por projeto; projetos adicionais a partir de ~US$ 10/mês. Vercel cobra por assento de quem publica código, não por usuário do sistema. **Limitador de gastos deve permanecer ligado.** Encerra a parte de infraestrutura de P-006 | ✅ |
| D-084 | 13/08/2026 | **Google OAuth via Supabase.** Restrição por domínio na camada de política do banco. O **primeiro login de conta do domínio cria o Usuário** automaticamente, com papel único, ativo. Sem convite nem cadastro prévio | Formaliza D-050 e R-007. Consequência aceita: qualquer conta do domínio vê a base inteira, inclusive valores e motivos de perda — item de fase 2 | ✅ |

### Decisões do Bloco 9 — Requisitos Não-Funcionais

| # | Data | Decisão | Justificativa | Situação |
|---|---|---|---|---|
| D-085 | 13/08/2026 | **Desktop e celular**, com **telas próprias no celular** para Lista, Kanban, detalhe, atividades e estatísticas. Lista vira cartões; Kanban vira uma etapa por vez, com seletor no lugar do arrastar | Registrar a reunião no carro, logo após o cliente, é o uso que mais melhora a qualidade do dado. **Maior expansão de escopo desde o início** — ver E-013. Não exige aplicativo de loja: é o mesmo sistema no navegador | ✅ |
| D-086 | 13/08/2026 | **Volume: até ~1.000 negócios novos por ano.** Cada contato novo vira um negócio, entrando por Cold Lead. Base estimada em 5 a 6 mil registros em três anos | Corrige estimativa inicial de 2.000–3.000. Confirma que **"negócio" significa contato registrado**, não oportunidade qualificada — o que reforça o acerto de D-067 | ✅ |
| D-087 | 13/08/2026 | **Brasil como localização única**: português, fuso de Brasília, **real como moeda única** (sem conversão), datas dd/mm/aaaa, valores R$ 100.000,00 | Elimina câmbio, data de conversão e soma de moedas nos indicadores. ⚠️ O Pipedrive grava em UTC — converter na migração (Doc 14) | ✅ |
| D-088 | 13/08/2026 | **Sem módulo de conformidade, auditoria de acesso ou retenção formal no MVP** | Sistema interno, dez usuários do domínio. Ressalva registrada pelo consultor: a LGPD olha de quem é o dado, e os titulares aqui são contatos de empresas prospectadas. Risco baixo, escolha consciente. **Mantida a exclusão de Pessoa e formas de contato** como função normal de cadastro | ✅ |
| D-089 | 13/08/2026 | **Backup diário do Supabase é suficiente.** Sem rotina própria e sem restauração ponto-a-ponto (~US$ 100/mês) | Consequência aceita: perda acidental recupera o banco do dia anterior; o trabalho do dia se perde. A exportação CSV (D-066) serve de cópia manual | ✅ |

### Decisões do Bloco 11 — Identidade Visual e UI

| # | Data | Decisão | Justificativa | Situação |
|---|---|---|---|---|
| D-090 | 13/08/2026 | **Densidade confortável** — linha de tabela de **44px** | ~15 negócios por tela contra 20 na compacta. Coerente com D-055: a navegação se dá por filtro, não por rolagem | ✅ |
| D-091 | 13/08/2026 | **Tema claro e escuro, ambos no MVP**, com alternador | Os tokens já trazem os dois conjuntos completos. Vira critério de aceite: todo componente verificado nas duas variantes | ✅ |
| D-092 | 13/08/2026 | **O CRM segue a identidade Lure**: base preto e branco, cor pontuando; paleta oficial de oito cores; **Archivo** como substituta livre da Flama | Manual BR/BAUEN (2015) fornecido pelo maestro. Flama e Akkurat são comerciais e licenciá-las para web conflita com R-002 | ✅ |

### Decisões do Bloco 12 — Escopo do MVP e Fases

> Bloco de recorte. Aqui os treze extras enfrentaram o calendário de R-008.

| # | Data | Decisão | Justificativa | Situação |
|---|---|---|---|---|
| D-093 | 13/08/2026 | **Módulo de Estatísticas fora do MVP** — telas de indicadores e painel montável vão para a fase 2. ⚠️ **O log de eventos permanece no MVP**, por gatilho no banco | Estatística não é ferramenta de trabalho, é de avaliação do trabalho; em setembro nem haveria período completo para comparar. Mas adiar as **telas** é seguro, adiar o **log** não é: os indicadores 7, 8 e 9 dependem de registro desde o dia 1 e não são recuperáveis. D-033 e D-081 permanecem intactos | ✅ |
| D-094 | 13/08/2026 | **Mesclagem de duplicados fora do MVP** (E-005) | Uso eventual. A base migrada vem com as duplicidades que já tem; unir dois registros exige regra para atividades, log e vínculos — custo médio-alto sem impacto no trabalho diário | ✅ |
| D-095 | 13/08/2026 | **Transferência entre usuários fora do MVP** (E-007) | Só se usa quando alguém entra ou sai. Com dois sócios operando, não há para quem transferir. **Encerra P-013** | ✅ |
| D-096 | 13/08/2026 | **Telas de configuração fora do MVP.** As listas configuráveis (origem, motivo de perda, área, tipo de atividade, etapas) existem no banco, populadas pela migração; edição pelo painel do Supabase quando necessário | Configuração é uso de entrada, não de rotina. A tela vem na fase 2 sem alterar o modelo | ✅ |
| D-097 | 13/08/2026 | **Celular no MVP em modo consulta e marcação** (E-013 parcial). No dia 1, pelo celular: Lista em cartões, busca e filtro, ficha do negócio, atividades, anotações, linha do tempo, Kanban uma etapa por vez e **marcar atividade como concluída**. **Criação e edição pelo celular vão para a fase 2** | O maestro registrou que o vendedor consulta o Pipedrive no celular constantemente — o verbo é *consultar*. Formulário em tela pequena é onde mora o grosso do trabalho mobile. Lacuna consciente: no dia 1 o vendedor **vê** pelo celular e **escreve** pelo computador. É o primeiro item da fase 2 | ✅ |
| D-098 | 13/08/2026 | **Critério de pronto do MVP**, sete itens — ver seção "Critério de Pronto" abaixo | Vira a lista de verificação do dia da virada | ✅ |

### Decisões de convenção técnica — Doc 09

| # | Data | Decisão | Justificativa | Situação |
|---|---|---|---|---|
| D-099 | 13/08/2026 | **Nomes de tabela e coluna em português**, `snake_case` (`negocio`, `motivo_perda`, `responsavel_id`). Código da aplicação segue a convenção do framework | Toda a documentação e o vocabulário do maestro estão em português; cada tradução mental é uma chance de erro de mapeamento, sobretudo na migração. Alto custo de reverter depois de semanas de código | ✅ |
| D-100 | 13/08/2026 | **Exclusão real** de registros, com `on delete restrict` nos vínculos que importam. Sem exclusão lógica (`deleted_at`) | D-088 pede exclusão de Pessoa como função normal. Exclusão lógica dobraria a complexidade de toda consulta. O `restrict` evita o acidente de apagar organização com negócios — mitigação necessária porque o backup é diário (D-089) | ✅ |
| — | 13/08/2026 | Aprovadas em bloco, sem controvérsia: chave primária `uuid`, valor `numeric(14,2)`, data e hora `timestamptz`, status como `enum` do Postgres, migrações por Supabase CLI versionadas no git | Padrão de mercado; nenhuma delas tem alternativa relevante para este projeto | ✅ |

### Decisões da fase de construção

| # | Data | Decisão | Justificativa | Situação |
|---|---|---|---|---|
| D-101 | 14/08/2026 | **Um único projeto no Supabase e um único deploy na Vercel.** A carga de migração é executada **direto na base de produção**, antes da virada. **Revoga a primeira metade de D-082** | Custo. O projeto adicional sairia por ~US$ 10/mês e o projeto inteiro existe para cortar custo. O maestro assumiu conscientemente o risco de prazo e de carga sem ambiente de nuvem intermediário | ✅ |
| D-102 | 14/08/2026 | **O ensaio da migração passa a ser feito no banco local** do Supabase CLI, em contêiner, e não em projeto de nuvem. `supabase db reset` recria o schema do zero quantas vezes for necessário | Preserva o critério 1 de D-098 sem custo. É o mesmo PostgreSQL e as mesmas migrações; a base tem 2.453 negócios, volume em que a diferença entre contêiner e nuvem é irrelevante | ⛔ **revogada por D-106** em 14/08 — nunca chegou a ser validada |

### Decisões da sessão 05 — 14/08/2026

| # | Data | Decisão | Justificativa | Situação |
|---|---|---|---|---|
| D-103 | 14/08/2026 | **O projeto do Supabase fica em `us-east-1` (Norte da Virgínia)**, e o deploy da Vercel vai para `iad1`, na mesma região | O projeto foi criado em us-east-1; o consultor apontou que São Paulo (`sa-east-1`) daria dezenas de ms em vez de ~120ms por ida e volta para 100% dos usuários, e que trocar seria gratuito enquanto a base está vazia. **O maestro optou por manter.** A mitigação que resta é colar a Vercel ao banco, para que só o salto navegador→Vercel atravesse | ✅ |
| D-104 | 14/08/2026 | **As dez colunas da Lista são exatamente os dez campos que o Doc 14 §4.3 mapeia do Pipedrive**: Título · Organização · Valor · Etapa · Status · Origem · Produto · Responsável · Motivo de perda · Criado em. **Não são imutáveis** — servem de base e podem ser alteradas durante a construção | D-054 dizia "dez colunas fixas" sem enumerá-las, e os prints que embasaram a decisão não estão no repositório. O mapeamento do Doc 14 é o inventário sobrevivente do que a equipe usa hoje, e fecha com o Doc 02 §6.2 ("sai a data de fechamento esperada, entram etapa e origem") — a data prevista está na linha "Sem destino" do Doc 14, por D-024. **Flexibiliza D-056** quanto ao conjunto, não quanto à personalização pelo usuário final | ✅ |
| D-105 | 14/08/2026 | **A ordem de construção passa a ser F0 → F3 → (Google OAuth, Vercel) → F1 → F2**, em vez da ordem do Doc 10 | O maestro pediu front-end funcionando antes da migração. ⚠️ **O consultor registrou o risco e o maestro o assumiu:** a API do Pipedrive fecha em 3/9 junto com o contrato, e a F1 é a única fase cujo prazo não é recuperável. O Doc 10 §3 dizia que F1 é a única fase que pode começar sem depender de nada | ✅ |
| D-106 | 14/08/2026 | **O sistema roda na Vercel, contra o projeto único do Supabase — e esse projeto é o definitivo, o que guarda os dados.** Não haverá ambiente nem banco de ensaio. **Revoga a D-102** | Decisão do maestro, coerente com D-101 e pela mesma razão: custo. A D-102 previa carregar os 2.453 negócios num ambiente descartável, conferir contagens, apagar e repetir até sair limpa; isso não vai acontecer. ⚠️ **Consequência aceita:** a carga roda **uma única vez, direto na base que os sócios vão usar**. As mitigações que restam são a ordem de carga do Doc 14, a marcação `origem_carga` e o backup diário verificado antes de começar (D-089) | ✅ |

### Decisões da sessão 06 — 17/08/2026

Esta sessão é a primeira em que **os dados mandaram**. Sete das oito decisões abaixo foram forçadas pela extração da base real, e três revogam decisões tomadas em entrevista, antes de existir extração.

| # | Data | Decisão | Justificativa | Situação |
|---|---|---|---|---|
| D-107 | 17/08/2026 | **`responsavel_id` recebe o dono nativo do Pipedrive**, não o criador nem o campo personalizado "Responsável" | Os três divergem: criador e dono não batem em **847 dos 2.458** negócios. Ronaldo criou 1.169 e é dono de 322 — ele cadastra, não trabalha. O campo personalizado está vazio em 1.258 e lista "Lorrayne Alves", que não é usuária. Só o dono nativo está preenchido nos 2.458 | ✅ |
| D-108 | 17/08/2026 | **Atividade e anotação podem pertencer a organização ou pessoa, sem negócio. Revoga a parte da D-030** que exigia negócio em toda atividade | **4.934 das 6.483** atividades não têm negócio — 76%. Entre elas, **125 das 206 atividades em aberto**, que são as pendências vivas dos sócios. Mantida a regra antiga, a carga descartaria 61% do que eles têm para fazer e o **critério 2 da D-098 ficaria impossível de cumprir**. O desenho adotado é o do próprio Pipedrive, onde `deal_id`, `person_id` e `org_id` são vínculos independentes e opcionais | ✅ |
| D-109 | 17/08/2026 | **O registro de usuário deixa de depender de conta de login.** `usuario.id` vira id próprio e `auth_id` liga à conta quando ela existir | Como estava, só existia usuário se já houvesse login — e a carga roda **antes** de as pessoas entrarem. Os 2.458 negócios nasceriam sem responsável. Exigir login prévio inverteria a ordem da virada e qualquer atraso de uma pessoa pararia tudo | ✅ |
| D-110 | 17/08/2026 | **O seletor de cliente do Bubble sai do MVP** e vai para fase final. Adia D-076 e D-077 | Decisão do maestro. A trava de desfecho (D-047) continua inteira; o diálogo apenas deixa de oferecer o seletor. P-022 sai do caminho crítico | ✅ |
| D-111 | 17/08/2026 | **Os 107 motivos de perda entram todos**, com `ativo = true` nos 12 usados cinco vezes ou mais e `ativo = false` na cauda. Mais um "Não informado" | O Pipedrive guarda texto livre no formato `motivo \| comentário`; cortando o comentário sobram 107 valores, e os 12 primeiros cobrem 950 dos 1.068 negócios perdidos. Migrar tudo preserva o histórico; a marcação `ativo` mantém a lista de escolha limpa. **53 perdidos não tinham motivo** e a restrição do banco os recusaria — daí o "Não informado" | ✅ |
| D-112 | 17/08/2026 | **Os 9 negócios sem organização ganham uma organização criada a partir do próprio título.** Resolve o pendente de Doc 14 §5.3 | São negócios reais, quatro deles ganhos. Descartar perderia receita registrada; a D-023 exige organização | ✅ |
| D-113 | 17/08/2026 | **As fotos dos usuários são baixadas e servidas de `public/usuarios/`**, não referenciadas em `usericons.pipedrive.com` | As URLs de origem morrem com o contrato em 3/9. Referenciá-las deixaria os avatares vazios no dia seguinte à virada | ✅ |
| D-114 | 17/08/2026 | **O repositório permanece público**, com as fotos dos usuários versionadas | Decisão do maestro em 17/08, com o risco apresentado: o repositório expõe o Doc 03 inteiro, o custo do Pipedrive, o ticket médio e o raciocínio comercial da consultoria, além de imagens de quatro pessoas identificáveis. **Risco assumido** | ⚠️ |

**Descobertas da extração que não viraram decisão, mas corrigem a documentação:**

- **A base é maior do que se registrava:** 2.458 negócios (não 2.453), **2.880 organizações (não 422)** e 206 atividades em aberto (não 33).
- **A base não está parada.** 74% dos negócios estão em Proposta Enviada (1.168) e Aguardando Contrato (642); Cold Lead tem 360. O `CLAUDE.md` afirmava o contrário, e o Doc 10 planejava o carregamento do Kanban "sobretudo em Cold Lead".
- **A coluna Origem não tem fonte.** O campo do Pipedrive só contém `ManuallyCreated` e `Import` — registro técnico, não origem comercial. Nasce vazia.
- **Produtos: zero registros.** O módulo permanece no MVP por decisão do maestro; o cadastro passa a ser feito no CRM novo.
- **A carga não gera evento nenhum**, porque o gatilho do log é `after update` e não `after insert`. O temor central do `CLAUDE.md` — "o log nasce com milhares de eventos falsos" — não se materializa neste schema.
- **P-021 respondida parcialmente:** só **675 dos 2.458** negócios têm alguma mudança de etapa no changelog. Reconstituir trajetória é possível para 27% da base, não para ela toda.
- **O ensaio foi recuperado sem ambiente extra:** a carga roda dentro de uma transação, e `--ensaio` desfaz no fim. A D-106 tirou o ensaio; a transação devolveu.


### Decisões da sessão 06 — parte 2, 17/08/2026

| # | Data | Decisão | Justificativa | Situação |
|---|---|---|---|---|
| D-115 | 17/08/2026 | **O Kanban é seção própria do menu lateral**, em `/kanban`, e não uma visão alternativa dentro de Negócios. O endereço antigo redireciona | Pedido do maestro. Como subitem de `/negocios`, os dois itens do menu acendiam ao mesmo tempo. A alternância *Lista \| Kanban* saiu junto: com os dois no menu, ela duplicava o caminho | ✅ |
| D-116 | 17/08/2026 | **Movimento é parte do design, com três regras fixas:** entrada escalonada tem teto (dez a catorze itens), o que se arrasta sai do plano da tela em vez de deslizar nele, e **`prefers-reduced-motion` desliga tudo** | Pedido do maestro por uma experiência mais viva. O teto evita que cascata vire espera. A guarda de acessibilidade não é opcional: movimento não pedido causa enjoo e desorientação em quem tem sensibilidade vestibular, e o sistema operacional já declara essa preferência — nada some, só para | ✅ |
| D-117 | 17/08/2026 | **A etapa não é editável na zona de dados do detalhe** — muda-se pela trilha do topo | Ter dois caminhos para a mesma mudança, um deles sem passar pela trava de desfecho (D-047), seria convite a erro. A trava agora vale nos três caminhos: arrastar no Kanban, clicar na trilha e apertar Ganho/Perdido, sempre verificada na *server action* | ✅ |
| D-118 | 17/08/2026 | **O Kanban tem sensor de teclado**: espaço pega o cartão, setas escolhem a coluna, espaço solta | Sem ele, mover negócio de etapa era **impossível** para quem não usa mouse — o Kanban é a tela principal de trabalho, e deixá-la só no arrasto excluiria gente do sistema | ✅ |

**Correção registrada:** **C-05** no Doc 09 §3.11 — o gatilho do log gravava `auth.uid()` em `evento_negocio.autor_id`, quebrado pela própria D-109 desta sessão. Julio Manfrini não conseguia mover cartão no Kanban. Corrigido para resolver o autor por `public.usuario_atual()`.


---

## Critério de Pronto do MVP (D-098)

Tudo isto precisa ser verdadeiro para o Pipedrive ser desligado em 3/9:

| # | Critério |
|---|---|
| 1 | Os **2.453 negócios** estão no sistema novo, com organizações, pessoas, formas de contato, atividades, anotações e produtos — e as **contagens batem** com as do Pipedrive |
| 2 | ⭐ **Os dois sócios conseguem operar um dia inteiro** sem precisar abrir o Pipedrive |
| 3 | O **log de eventos está gravando** desde o primeiro registro em produção |
| 4 | A **trava de desfecho funciona** — nenhum negócio entra em Aguardando Contrato sem Ganho ou Perdido declarado |
| 5 | **Lista e Kanban respondem** com a base real carregada, não com dados de teste |
| 6 | O **celular abre e é utilizável** para consulta |
| 7 | **Login por Google funciona** para as contas do domínio |

O item 2 é o único não-técnico e o mais importante: é ensaio de operação real antes da data.

---

## Catálogo de Indicadores (D-063)

**Grupo 1 — paridade com o Insights em uso hoje**

| # | Indicador |
|---|---|
| 1 | Negócios iniciados no período |
| 2 | Negócios ganhos no período |
| 3 | Valor ganho no período |
| 4 | Negócios em andamento — contagem e valor em aberto |
| 5 | Séries "ao longo do tempo" dos itens 1 a 3, em barras mensais |

**Grupo 2 — habilitados pelo log de eventos (D-033) e pelo campo origem (E-001)** — ver E-009

| # | Indicador |
|---|---|
| 6 | Taxa de ganho — ganhos sobre total de desfechos |
| 7 | Funil de conversão etapa a etapa |
| 8 | Lead time médio por etapa e lead time total |
| 9 | Valor inicial × valor fechado |
| 10 | Perdas por motivo |
| 11 | Negócios por origem |
| 12 | Distribuição da base por status |
| 13 | Ranking por vendedor |

⚠️ **Dependência dura:** os indicadores 7, 8 e 9 só existem se o log de eventos estiver em produção desde o primeiro dia. Se entrar depois, nascem cegos e não há recuperação. Reforça D-033 como não-postergável.

---

## Itens além da paridade com o Pipedrive

| # | Item | Custo estimado | Recomendação | Situação |
|---|---|---|---|---|
| E-001 | Campo de **origem do negócio** com lista cadastrável | Baixo | Incluir no MVP — alto retorno analítico | ✅ **no MVP** |
| E-002 | Múltiplos funis configuráveis | Médio | Modelado desde já; sem tela no MVP (D-096) | ⏸ fase 2 |
| E-003 | Obrigatoriedade de campo configurável por papel | Médio | ⛔ sem suporte no MVP (D-049) | ⛔ adiado |
| E-004 | Log de eventos com estatísticas de lead time | Médio | **Incluir no MVP — não-postergável** (D-033) | ✅ definido |
| E-005 | Ferramenta de mesclagem de duplicados | Médio-alto | Fora do MVP (D-094) | ⏸ fase 2 |
| E-006 | **Filtros salvos nomeados** | Baixo-médio | Fora do MVP. D-055 (filtro persistido por usuário) permanece | ⏸ fase 2 |
| E-007 | **Ferramenta de transferência** de negócios entre usuários | Médio | Fora do MVP (D-095) | ⏸ fase 2 |
| E-008 | **Construtor de relatórios** (nível C do módulo de estatísticas) | Alto | Fase 2, depois do próprio módulo (D-093) | ⏸ fase 2 |
| E-009 | **Indicadores 6 a 13** do catálogo | Médio | Fora do MVP junto com todo o módulo (D-093). O **log que os alimenta permanece** | ⏸ fase 2 |
| E-010 | **Acompanhamento de metas** | Médio | Fase 2, por decisão do maestro (D-065) | ⏸ adiado |
| E-011 | **Integração com Google Agenda** | Médio | Fase 2, por decisão do maestro (D-071) | ⏸ adiado |
| E-012 | **API pública / MCP para agentes de IA** | Alto | Fase 2 (D-074). Condiciona a arquitetura — ver R-009 | ⏸ adiado |
| E-013 | **Versão mobile das telas densas** | Alto | **Parcialmente no MVP** (D-097): consulta e marcação entram; criação e edição vão para a fase 2 | 🟡 **parcial** |

---

## Restrições de Arquitetura

| # | Data | Restrição | Origem | Situação |
|---|---|---|---|---|
| R-001 | 10/08/2026 | Custo marginal por usuário adicional ≈ zero. Cobrança por assento é eliminatória | D-005 | ✅ atendida por D-078/D-079 |
| R-002 | 10/08/2026 | Custo total de operação muito abaixo de R$ 580/mês | Custo Pipedrive projetado | ✅ atendida por D-078/D-079 |
| R-003 | 10/08/2026 | Arquitetura modular e bem documentada, para evolução autônoma | Soberania sobre o roadmap | 🟡 |
| R-004 | 10/08/2026 | Custo de manutenção deve ser considerado, não só o de construção | Risco do consultor | 🟡 **nota:** o mantenedor será o Claude Code, conduzido pelo maestro. Não há vigilância ativa do sistema — quem detecta falha é o usuário |
| R-005 | 10/08/2026 | **Sem serviço de envio de e-mail** na arquitetura | D-041 | ✅ reconfirmada em 13/08 |
| R-006 | 12/08/2026 | Volume real: 2.453 negócios, 422 organizações. Filtro, ordenação e paginação são requisito de UX. **Nunca carregar a base inteira no navegador** — paginação no servidor e lista virtualizada | Prints da base | ✅ |
| R-007 | 12/08/2026 | Autenticação delegada ao **Google (OAuth)**, com autorização por domínio | D-050 | ✅ atendida por D-078 |
| R-008 | 13/08/2026 | ⚠️ **Prazo imutável: 3/9/2026.** O MVP precisa estar no ar quando o Pipedrive encerrar | D-069 | ✅ |
| R-009 | 13/08/2026 | A arquitetura deve permitir **expor endpoints de leitura e escrita sem reescrita da camada de regras** | E-012 (agentes de IA) | ✅ atendida por D-078 |

---

## Changelog

- **v0.13** — 17/08/2026 — **Sessão 06, parte 2.** D-115 a D-118: Kanban vira seção própria, movimento entra como parte do design com guarda de `prefers-reduced-motion`, a etapa deixa de ser editável na zona de dados para não haver caminho sem trava, e o Kanban ganha sensor de teclado. Registrada a **C-05**: a D-109 desta mesma sessão quebrou o gatilho do log, e o defeito foi encontrado com um usuário real afetado. **118 decisões.**
- **v0.12** — 17/08/2026 — **Sessão 06: os dados mandaram.** D-107 a D-114. Três revogações vindas da extração: a D-030 deixa de exigir negócio em toda atividade (D-108), o usuário deixa de depender de conta de login (D-109) e o seletor do Bubble sai do MVP (D-110). Registradas as descobertas que corrigem a documentação — a base tem 2.880 organizações e não 422, não está parada, a coluna Origem não tem fonte, e a carga não contamina o log porque o gatilho é `after update`. **114 decisões.**
- **v0.11** — 14/08/2026 — **Sessão 05: a base de produção entrou no ar.** D-103 (região us-east-1 mantida; Vercel vai para iad1 para ficar colada ao banco), D-104 (as dez colunas da Lista, derivadas do Doc 14 §4.3, com o conjunto deixando de ser imutável), D-105 (ordem de construção alterada — front-end antes da migração, com o risco da janela de 3/9 assumido pelo maestro) e D-106 (o projeto do Supabase é o definitivo; **revoga a D-102** — não haverá ambiente de ensaio, e a carga roda uma única vez na base real). **P-029 e P-030 encerradas.**
- **v0.10** — 14/08/2026 — **Fase de construção iniciada.** D-101: um único projeto no Supabase, um único deploy na Vercel, carga direto em produção — **revoga a primeira metade de D-082**, que passa a ⛔ revista. D-102 registrada como proposta do consultor: ensaiar a migração no banco local do CLI, que preserva o critério 1 de D-098 sem custo.
- **v0.9** — 13/08/2026 — Convenções técnicas do Doc 09 validadas (D-099, D-100). **Cem decisões registradas.**
- **v0.8** — 13/08/2026 — **Bloco 12 concluído** (D-093 a D-098) e Fase 1 encerrada. Estatísticas, mesclagem, transferência e telas de configuração saem do MVP; celular entra em modo consulta. Critério de pronto definido. Situação de todos os extras atualizada. P-013 encerrada.
- **v0.7** — 13/08/2026 — Conclusão do Bloco 10 (D-081 a D-084), Bloco 9 (D-085 a D-089) e Bloco 11 (D-090 a D-092). Extra E-013 (mobile) criado. A-10 encerrado por D-081. Parte de infraestrutura de P-006 encerrada por D-083.
- **v0.6** — 13/08/2026 — Bloco 7 (D-062 a D-067), Bloco 8 (D-068 a D-077) e início do Bloco 10 (D-078 a D-080, primeiras decisões técnicas do projeto). Reordenação de blocos (D-070). Catálogo de treze indicadores incorporado. Extras E-008 a E-012 criados. Restrições R-008 (prazo) e R-009 (endpoints) criadas; R-001, R-002, R-007 e R-009 marcadas como atendidas. D-041 e R-005 reconfirmadas após consideração de SMTP. D-025 acrescida do identificador externo.
- **v0.5** — 12/08/2026 — Decisões de modelo D-042 a D-048, Bloco 5 (D-049 a D-052), Bloco 6 (D-053 a D-061). D-012 corrigida, D-035 parcialmente revertida. Extras E-006 e E-007. R-006 ajustada; R-007 criada.
- **v0.4** — 10/08/2026 — Decisões do Bloco 4 (D-035 a D-041), extra E-005, restrições R-005 e R-006.
- **v0.3** — 10/08/2026 — Decisões do Bloco 3 (D-023 a D-034) e extras E-003 e E-004.
- **v0.2** — 10/08/2026 — Decisões do Bloco 2 (D-012 a D-022).
- **v0.1** — 10/08/2026 — Criação do documento com as decisões do Bloco 1.
