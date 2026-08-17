-- ============================================================
-- CRM Lure — foto do usuario, para o filtro por responsavel.
--
-- ⚠️ Guarda caminho local, nao a URL do Pipedrive. As imagens vinham de
-- usericons.pipedrive.com e morreriam junto com o contrato em 3/9/2026 —
-- os avatares ficariam vazios no dia seguinte a virada. Baixadas em
-- 17/08/2026 para public/usuarios/.
--
-- Quem nao tem foto fica com null: a interface desenha as iniciais.
-- ============================================================

alter table usuario add column foto_url text;
