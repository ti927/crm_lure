# 05 — Requisitos Funcionais (v0.1)

| Campo | Valor |
|---|---|
| **Documento** | Requisitos Funcionais |
| **Projeto** | CRM próprio (substituição do Pipedrive) |
| **Versão** | v0.1 |
| **Data** | 13/08/2026 |
| **Status** | rascunho — consolida decisões já validadas |

> Cada requisito traz a decisão de origem. Nada aqui é novo; é a tradução das 100 decisões em forma verificável.
> **Coluna MVP:** ✅ entra · ⏸ fase 2.

---

## 1. Autenticação e usuários

| # | Requisito | Origem | MVP |
|---|---|---|---|
| RF-001 | Login exclusivamente por conta Google | D-050 | ✅ |
| RF-002 | Somente contas do domínio da empresa têm acesso; a restrição é aplicada na camada de política do banco | D-084 | ✅ |
| RF-003 | O primeiro login de uma conta do domínio cria o usuário automaticamente, ativo, com papel único | D-084 | ✅ |
| RF-004 | Usuário nunca é excluído; possui marcação ativo/inativo manual que controla apenas presença nas listas de seleção | D-051 | ✅ |
| RF-005 | Papel único de acesso total; a estrutura Usuário → Papel → Permissão existe no modelo desde o início | D-049 | ✅ |
| RF-006 | Tela de gestão de papéis e permissões granulares | D-049 | ⏸ |

## 2. Negócios

### 2.1 Cadastro

| # | Requisito | Origem | MVP |
|---|---|---|---|
| RF-010 | Negócio exige **título** e **organização**; demais campos opcionais | D-023 | ✅ |
| RF-011 | Campos do negócio: título, organização, pessoas, valor, etapa, status, origem, produto/serviço, responsável, motivo da perda | D-023, D-025 | ✅ |
| RF-012 | O valor é o valor total do contrato; recorrentes são normalizados como 12 parcelas anuais, digitados diretamente | D-006 | ✅ |
| RF-013 | **Não existe** data prevista de fechamento nem previsão de receita | D-024 | ✅ |
| RF-014 | Negócio pode ser criado em qualquer etapa e nasce com o status inicial daquela etapa | D-017, D-045 | ✅ |
| RF-015 | Um negócio tem **um** produto/serviço, não obrigatório | D-032, D-037 | ✅ |
| RF-016 | Um negócio pode ter várias pessoas vinculadas | Doc 06 | ✅ |
| RF-017 | Campos são fixos; o usuário não cria campo personalizado | D-028 | ✅ |

### 2.2 Etapas, status e transições

| # | Requisito | Origem | MVP |
|---|---|---|---|
| RF-020 | Status é lista **fixa** de quatro valores: Parado, Negociação, Ganho, Perdido. Não editável | D-042 | ✅ |
| RF-021 | Status e Etapa são dimensões independentes | D-043 | ✅ |
| RF-022 | Cada etapa carrega um status inicial sugerido, configurável | D-045 | ✅ |
| RF-023 | Movimentação livre entre etapas, inclusive retrocesso, por arrastar-e-soltar | D-018 | ✅ |
| RF-024 | ⚠️ **Trava única:** mover ou criar negócio em Aguardando Contrato abre diálogo obrigatório de desfecho | D-047 | ✅ |
| RF-025 | Se o desfecho for Perdido, o motivo da perda é obrigatório | D-047 | ✅ |
| RF-026 | Botões Ganho e Perdido na tela de detalhe movem o negócio para Aguardando Contrato e aplicam o status | D-048 | ✅ |
| RF-027 | Ao declarar Ganho, o diálogo apresenta seletor de cliente do sistema Bubble, por busca manual | D-076 | ✅ |
| RF-028 | O vínculo com o Bubble é **opcional**: falha ou ausência do serviço não impede a conclusão do Ganho | D-077 | ✅ |
| RF-029 | Status Parado suspende todas as automações do negócio | D-046 | ✅ |

### 2.3 Visualizações

| # | Requisito | Origem | MVP |
|---|---|---|---|
| RF-030 | Visão **Kanban** com as etapas em colunas e arrastar-e-soltar | D-018 | ✅ |
| RF-031 | Cartão do Kanban com quatro campos: título, organização, valor, status | D-053 | ✅ |
| RF-032 | Visão **Lista** com dez colunas fixas, não personalizáveis | D-054, D-056 | ✅ |
| RF-033 | Filtro e ordenação no cabeçalho de **toda** coluna, combináveis, com indicador visual de filtro ativo | D-055 | ✅ |
| RF-034 | Filtros e ordenação persistidos por usuário | D-055 | ✅ |
| RF-035 | Filtros salvos e nomeados | E-006 | ⏸ |
| RF-036 | Paginação no servidor e lista virtualizada; a base inteira nunca é carregada no navegador | R-006 | ✅ |
| RF-037 | O Kanban carrega cartões por partes conforme a rolagem, em especial na coluna Cold Lead | D-086 | ✅ |

### 2.4 Detalhe do negócio

| # | Requisito | Origem | MVP |
|---|---|---|---|
| RF-040 | Tela de detalhe em três zonas | D-057 | ✅ |
| RF-041 | Aba **Linha do Tempo** com seletor de três posições: Usuário · Sistema · Tudo | D-058 | ✅ |
| RF-042 | Atividades, anotações e histórico acessíveis a partir do negócio | Doc 06 | ✅ |

## 3. Atividades e anotações

| # | Requisito | Origem | MVP |
|---|---|---|---|
| RF-050 | **Toda atividade pertence a um negócio.** Não existe atividade órfã | D-030 | ✅ |
| RF-051 | Campos da atividade: tipo, título, data, hora início/fim, responsável, descrição, concluída | Doc 06 | ✅ |
| RF-052 | Tipos de atividade configuráveis: chamada, reunião, tarefa, e-mail | D-031 | ✅ |
| RF-053 | Tela de Atividades própria, com modo **lista** e modo **calendário** | D-060 | ✅ |
| RF-054 | Atividades passadas concluídas servem como histórico; futuras pendentes servem como agenda | Doc 06 | ✅ |
| RF-055 | Contatos anteriores à criação do negócio podem ser registrados retroativamente | Bloco 3 | ✅ |
| RF-056 | Anotação é entidade distinta de atividade: texto livre, sem data de agenda e sem conclusão | D-029 | ✅ |
| RF-057 | Fichas de organização e pessoa exibem histórico consolidado **derivado** dos negócios | D-039 | ✅ |

## 4. Contatos

| # | Requisito | Origem | MVP |
|---|---|---|---|
| RF-060 | Organização com nome, cidade, website e identificador externo do Bubble | D-025, D-075 | ✅ |
| RF-061 | Pessoa física é cadastrada como organização comum, sem diferenciação | D-027 | ✅ |
| RF-062 | Pessoa pode pertencer a várias organizações; **o cargo pertence ao vínculo** | D-036 | ✅ |
| RF-063 | Formas de contato em lista simples, sem rótulo e sem marcação de principal | D-034 | ✅ |
| RF-064 | Telefone gera hiperlink de protocolo para WhatsApp; e-mail gera link mailto | D-072 | ✅ |
| RF-065 | Organizações e pessoas podem existir sem negócio vinculado | D-019 | ✅ |
| RF-066 | Pessoa e suas formas de contato podem ser **excluídas** | D-088 | ✅ |
| RF-067 | Ferramenta de mesclagem de duplicados | D-094 | ⏸ |

## 5. Produtos e serviços

| # | Requisito | Origem | MVP |
|---|---|---|---|
| RF-070 | Cadastro de produto/serviço com nome e área | D-031 | ✅ |
| RF-071 | Área do produto é lista configurável — hoje 5 áreas | D-031 | ✅ |

## 6. Log de eventos

| # | Requisito | Origem | MVP |
|---|---|---|---|
| RF-080 | ⚠️ Todo negócio registra automaticamente mudanças de **etapa, valor, responsável e status** | D-033 | ✅ |
| RF-081 | O log é gerado por **gatilho no banco**, qualquer que seja a origem da escrita | D-081 | ✅ |
| RF-082 | A tabela do log é **somente inserção**: sem alteração, sem exclusão | D-081 | ✅ |
| RF-083 | O log registra autor e data/hora, e **nunca é reescrito** | D-033 | ✅ |
| RF-084 | Eventos gerados pela carga de migração ficam marcados e são excluídos dos cálculos de tempo | Doc 09 | ✅ |

## 7. Automações e notificações

| # | Requisito | Origem | MVP |
|---|---|---|---|
| RF-090 | Automação: negócio marcado como Ganho gera atividade de follow-up, prazo padrão 90 dias, desativável | D-021 | ✅ |
| RF-091 | Alerta de negócio parado | D-040 | ✅ |
| RF-092 | Alerta de atividade vencida | D-040 | ✅ |
| RF-093 | Lembrete de próxima atividade | D-040 | ✅ |
| RF-094 | Todos os alertas são **notificação interna ao aplicativo**. Nenhum e-mail é enviado | D-041, R-005 | ✅ |
| RF-095 | Negócios com status Parado não são monitorados por nenhuma automação | D-046 | ✅ |

## 8. Estatísticas

| # | Requisito | Origem | MVP |
|---|---|---|---|
| RF-100 | Catálogo de indicadores como entidade; painel montável e persistido por usuário | D-062 | ⏸ |
| RF-101 | Treze indicadores no catálogo inicial | D-063 | ⏸ |
| RF-102 | Recortes: período, usuário, origem, produto, área — os três últimos também como eixo de agrupamento | D-064 | ⏸ |
| RF-103 | Negócios Parados fora dos indicadores de desempenho por padrão, com interruptor "incluir parados" | D-067 | ⏸ |
| RF-104 | Indicador próprio de saúde da base para os Parados | D-067 | ⏸ |
| RF-105 | Acompanhamento de metas, como atributo do indicador | D-065 | ⏸ |
| RF-106 | Construtor de relatórios | E-008 | ⏸ |

> ⚠️ Ainda que todo o módulo esteja na fase 2, **o log que o alimenta é MVP** (RF-080 a RF-084). Os indicadores de funil de conversão, lead time e valor inicial × fechado dependem de registro contínuo desde o dia 1.

## 9. Exportação

| # | Requisito | Origem | MVP |
|---|---|---|---|
| RF-110 | Exportar o que está na tela, respeitando filtros e ordenação ativos | D-066 | ✅ |
| RF-111 | Formato CSV com separador **ponto-e-vírgula**, codificação **UTF-8 com BOM** | D-004, D-066 | ✅ |
| RF-112 | A exportação inclui o conjunto filtrado inteiro, não apenas a página visível | D-066 | ✅ |
| RF-113 | Aplicável a Lista de negócios, Atividades e, na fase 2, indicadores | D-066 | ✅ |

## 10. Configuração

| # | Requisito | Origem | MVP |
|---|---|---|---|
| RF-120 | Listas configuráveis existem no banco: origem, motivo de perda, área de produto, tipo de atividade, etapas do funil | D-020, D-031 | ✅ |
| RF-121 | Telas de administração dessas listas | D-096 | ⏸ |
| RF-122 | Múltiplos funis | E-002 | ⏸ |

## 11. Interface

| # | Requisito | Origem | MVP |
|---|---|---|---|
| RF-130 | Menu: Negócios · Atividades · Contatos · Produtos/Serviços · Estatísticas · Configurações | D-059 | ✅ |
| RF-131 | Tema claro e escuro, com alternador | D-091 | ✅ |
| RF-132 | Linha de tabela de 44px | D-090 | ✅ |
| RF-133 | Identidade Lure: preto e branco de base, cor pontuando | D-092 | ✅ |
| RF-134 | Português do Brasil, fuso de Brasília, real, datas dd/mm/aaaa | D-087 | ✅ |

## 12. Mobile

| # | Requisito | Origem | MVP |
|---|---|---|---|
| RF-140 | Telas próprias no celular — não apenas redimensionamento | D-085 | ✅ |
| RF-141 | Lista de negócios em cartões, com busca e filtro | D-097 | ✅ |
| RF-142 | Kanban uma etapa por vez, com seletor no lugar do arrastar | D-085 | ✅ |
| RF-143 | Ficha do negócio, atividades, anotações e linha do tempo em leitura | D-097 | ✅ |
| RF-144 | Marcar atividade como concluída pelo celular | D-097 | ✅ |
| RF-145 | Criação e edição de registros pelo celular | D-097 | ⏸ |

## 13. Migração

| # | Requisito | Origem | MVP |
|---|---|---|---|
| RF-150 | Migração **completa** da base do Pipedrive | D-068 | ✅ |
| RF-151 | Migra-se tudo que **cabe no modelo**; campos sem destino são descartados | D-068 | ✅ |
| RF-152 | Contagens conferidas contra o Pipedrive antes de considerar concluída | D-098 | ✅ |
| RF-153 | Datas convertidas de UTC para o fuso de Brasília | D-087 | ✅ |

---

## Pontos em aberto

| # | Item | Situação |
|---|---|---|
| A-07 | Modelagem da entidade Notificação — como são geradas, lidas e marcadas | aberto (P-027) |
| A-09 | Eixos admissíveis de cada um dos treze indicadores | fase 2 (P-023) |
| P-005 | Inventário funcional detalhado do uso atual do Pipedrive | amplamente coberto pelos prints; revisar se surgir lacuna |

---

## Changelog

- **v0.1** — 13/08/2026 — Criação ao fim da Fase 1. 153 requisitos derivados das 100 decisões registradas.
