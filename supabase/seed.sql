-- ============================================================
-- CRM Lure — semente
--
-- So o minimo para o sistema existir: o funil e suas seis etapas.
-- As listas configuraveis (origem, motivo de perda, area, tipo de
-- atividade) NAO entram aqui — elas vem da migracao do Pipedrive
-- (F2, Doc 14). Semear valores inventados agora criaria duplicata
-- na hora da carga.
-- ============================================================

insert into funil (nome)
values ('Comercial')
on conflict do nothing;

-- Funil unico de seis etapas (Doc 00, secao 2). Ganho e Perdido NAO sao
-- etapas — sao status.
--
-- status_inicial e o status sugerido ao entrar na etapa (D-045).
-- Cold Lead nasce `parado`: a maior parte da base esta parada, e isso e
-- normal, nao e anomalia a sinalizar.
--
-- ⚠️ Aguardando Contrato entra como `negociacao` porque a trava de
-- desfecho (D-047) exige declarar Ganho ou Perdido no momento da
-- entrada. O status inicial e apenas o ponto de partida do dialogo.
insert into etapa (funil_id, nome, ordem, status_inicial)
select f.id, e.nome, e.ordem, e.status_inicial
from funil f
cross join (values
  ('Cold Lead',               1, 'parado'::status_negocio),
  ('Hot Lead',                2, 'negociacao'::status_negocio),
  ('Contato Realizado',       3, 'negociacao'::status_negocio),
  ('Apresentação Realizada',  4, 'negociacao'::status_negocio),
  ('Proposta Enviada',        5, 'negociacao'::status_negocio),
  ('Aguardando Contrato',     6, 'negociacao'::status_negocio)
) as e(nome, ordem, status_inicial)
where f.nome = 'Comercial'
on conflict (funil_id, ordem) do nothing;
