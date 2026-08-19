-- Procedencia dos eventos do log (sessao 10, 19/08/2026 — D-129).
--
-- `origem_carga` marca evento SINTETICO: gerado pelo gatilho durante uma
-- escrita em massa da migracao, datado do dia da carga e nao do dia em
-- que a coisa aconteceu. A regra do CLAUDE.md — "todo indicador filtra
-- origem_carga = false" — existe para barrar exatamente esses.
--
-- O changelog do Pipedrive e outra coisa. Sao 3.412 mudancas de etapa,
-- valor e status que ACONTECERAM, com data e autor verdadeiros, entre
-- 26/08/2021 e 17/08/2026 — so que naquele sistema. Marca-las como carga
-- as excluiria dos indicadores, que e o oposto do que se quer; marca-las
-- como operacao real apagaria a procedencia para sempre, e `evento_negocio`
-- e somente insercao: nao ha update depois que se erra.
--
-- Dai a terceira marca. Com ela as duas perguntas ficam separaveis:
--
--   aconteceu de verdade     = not origem_carga
--   aconteceu NESTE sistema  = not origem_carga and not importado_do_pipedrive
--
-- E a regra do CLAUDE.md segue valendo palavra por palavra, sem emenda.

alter table evento_negocio
  add column importado_do_pipedrive boolean not null default false;

comment on column evento_negocio.importado_do_pipedrive is
  'Evento reconstituido do changelog do Pipedrive: aconteceu de verdade, com data e autor originais, mas fora deste sistema. Entra nos indicadores como qualquer evento real.';

-- O gatilho nao muda: ele nunca informa esta coluna, e o default false
-- diz a verdade sobre tudo que nascer daqui pra frente.

-- Funil de conversao e lead time (indicadores 7 e 8) varrem por tipo
-- dentro de uma janela de tempo. O indice existente cobre `ocorrido_em`
-- para eventos reais; este cobre a pergunta como o funil a faz.
create index if not exists evento_negocio_tipo_ocorrido
  on evento_negocio (tipo, ocorrido_em)
  where origem_carga = false;
