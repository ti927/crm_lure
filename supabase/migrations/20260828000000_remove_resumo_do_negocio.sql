-- ============================================================
-- CRM Lure — `negocio_resumo` sai.
--
-- ⚠️ Ela existiu por algumas horas para uma prévia em pop-up na Lista e
-- no Kanban (D-157), construída sobre uma leitura ERRADA do pedido: o
-- pop-up era para a ferramenta de fusão, não para as telas de trabalho.
-- O maestro pediu a reversão — na Lista os negócios devem abrir direto,
-- e a navegação do Next, com prefetch, já é mais rápida do que buscar um
-- resumo antes de mostrar qualquer coisa.
--
-- ⚠️ Cai em vez de ficar. Função sem chamador é dívida silenciosa: daqui
-- a três sessões alguém a encontra, supõe que serve para algo e constrói
-- em cima. O que a substituiu de verdade é `fusao_detalhe_cadastro`, na
-- ferramenta de manutenção.
--
-- Se a prévia voltar, ela está no histórico do git — em
-- `20260827223000_resumo_do_negocio_rotulos.sql`.
-- ============================================================

drop function if exists public.negocio_resumo(uuid);
