# 04 — Visão de Produto (v0.1)

| Campo | Valor |
|---|---|
| **Documento** | Visão de Produto |
| **Projeto** | CRM próprio (substituição do Pipedrive) |
| **Versão** | v0.1 |
| **Data** | 13/08/2026 |
| **Status** | rascunho — consolida decisões já validadas |

> Este documento não introduz decisão nova. Consolida, em forma de visão, o que os Blocos 1 a 12 estabeleceram.

---

## 1. O problema

A empresa paga **R$ 3.500/ano** pelo Pipedrive com 4 usuários. O plano de profissionalizar a área comercial — SDR, BDR, closer, coordenação — levaria a base a **10 usuários**, e o custo a cerca de R$ 7.000/ano.

O problema **não é funcional**. O Pipedrive atende plenamente a operação atual; não há frustração de uso a resolver (D-005, D-061). O problema é que o modelo de cobrança por assento transforma crescimento de equipe em crescimento de custo, num sistema cujo uso não muda proporcionalmente.

**Segundo problema, menos óbvio:** dependência. Cada evolução do processo comercial depende do que o fornecedor decidir oferecer. Um sistema próprio devolve à empresa a soberania sobre o próprio roadmap (R-003).

---

## 2. O que é este produto

Um CRM de funil de vendas para uso interno, cobrindo o ciclo comercial de uma consultoria empresarial: da prospecção ao ganho.

**Norte declarado: paridade funcional com o uso atual do Pipedrive** (D-008). Não superação. O sucesso é a equipe trabalhar em 4 de setembro exatamente como trabalhava em 2 de setembro, sem sentir falta.

**O que ele não é:** não é ERP, não é sistema de contratos, não é ferramenta de execução de projetos. O negócio **encerra no ganho** (D-015); o que vem depois vive no sistema interno em Bubble.

---

## 3. Quem usa

| Perfil | Hoje | Previsto |
|---|---|---|
| **Sócios** | 2, operam tudo | continuam |
| SDR / BDR | — | prospecção, alto volume de cadastro |
| Closer | — | condução da negociação |
| Coordenação | — | acompanhamento |

Até **10 usuários**, todos do mesmo domínio de e-mail. No MVP, **papel único de acesso total** (D-049): qualquer um vê e edita tudo. A granularidade de permissões espera a equipe existir — modelar restrição sem saber o que restringir produz regra irreal.

**Contexto de uso:** desktop no escritório, celular entre reuniões. O vendedor consulta o CRM no celular constantemente (D-085, D-097).

---

## 4. O ciclo comercial que o produto representa

A organização é qualificada primeiro; o negócio nasce depois (Bloco 2). **Cada contato novo vira um negócio** entrando por Cold Lead — o que significa que "negócio" aqui é contato registrado, não oportunidade qualificada (D-086).

**Funil único, seis etapas:**
Cold Lead → Hot Lead → Contato Realizado → Apresentação Realizada → Proposta Enviada → Aguardando Contrato

**Status independente da etapa**, fixo em quatro valores: Parado · Negociação · Ganho · Perdido.

**Perfil da venda:** ciclo longo, de meses. Ticket médio de ~R$ 100 mil por contrato anual. Mercado 100% privado, sem licitações. Todos os canais de origem.

---

## 5. Objetivos do produto

| # | Objetivo | Como se verifica |
|---|---|---|
| 1 | Substituir o Pipedrive sem perda de função no uso diário | Os sócios operam um dia inteiro sem abri-lo (D-098, item 2) |
| 2 | Eliminar o custo por assento | Custo mensal de infraestrutura próximo de zero (D-083) |
| 3 | Preservar a base histórica | 2.453 negócios migrados, contagens conferidas |
| 4 | Registrar a trajetória do negócio desde o dia 1 | Log de eventos gravando em produção (D-033) |
| 5 | Devolver o roadmap à empresa | Arquitetura documentada e modular (R-003) |

---

## 6. O que o produto deliberadamente não faz

Registrar o "não" é regra do método (Doc 01, princípio 7).

| Não faz | Por quê |
|---|---|
| **Previsão de receita / forecast** | Não existe data prevista de fechamento; não é usada hoje (D-024) |
| **Envio de e-mail** | Todos os alertas são notificação interna. Elimina dependência, custo e risco (D-041, R-005) |
| **Múltiplas moedas** | Real como moeda única (D-087) |
| **Campos personalizados** | Campos fixos, por economia de construção (D-028) |
| **Licitações** | Fora da atuação da empresa (D-007) |
| **Contratos, vigência, renovação, faturamento** | O negócio encerra no ganho (D-015) |
| **Assinatura eletrônica** | Desnecessária na operação (D-073) |
| **Módulo de conformidade / auditoria de acesso** | Sistema interno, dez usuários (D-088) |
| **API pública e webhooks** | Fase 2, junto com os agentes de IA (D-074) |

---

## 7. Medida de sucesso

**No dia da virada:** os sete critérios de D-098, com destaque para o segundo — um dia inteiro de operação real antes de 3/9.

**Em três meses:** a equipe não pede o Pipedrive de volta, e o custo de infraestrutura permanece irrelevante.

**Em um ano:** o sistema evoluiu pelo menos uma vez por decisão interna — o que prova que a soberania do objetivo 5 é real e não retórica.

---

## 8. Riscos assumidos

| Risco | Situação |
|---|---|
| **Prazo de 21 dias** para construir o MVP inteiro | Apresentado pelo consultor e assumido conscientemente pelo maestro (R-008) |
| **Acesso amplo** — qualquer conta do domínio vê valores e motivos de perda | Consequência de D-049 e D-050. Item de fase 2 |
| **Sem histórico de trajetória** se os changelogs do Pipedrive não permitirem reconstituição | Investigação técnica pendente (P-021) |
| **Recuperação limitada** a backup diário | Escolha consciente (D-089) |
| **Lacuna do mobile** — no dia 1, vê pelo celular, escreve pelo computador | Primeiro item da fase 2 (D-097) |

---

## Changelog

- **v0.1** — 13/08/2026 — Criação ao fim da Fase 1, consolidando os Blocos 1 a 12.
