-- Data de fechamento do negocio (D-131) — o eixo do relatorio financeiro.
--
-- ⚠️ Por que uma coluna e nao o log. Um relatorio financeiro responde
-- "quando entrou dinheiro", e o sistema so sabia responder "quando o lead
-- entrou" (`criado_em`). O log tem eventos de status, mas cobre apenas
-- 58,5% dos ganhos: negocio fechado antes da janela do changelog nao tem
-- o evento. Ancorar por ali daria 137 ganhos em 2021, quando o numero
-- real e 477 — errado por 3,5x justamente no ano de maior volume.
--
-- Os 1.031 `won_time` e os 1.121 `lost_time` estao 100% completos na
-- extracao de 17/08, num arquivo em disco. Trazer isso para o banco
-- agora e a diferenca entre um relatorio financeiro correto e um que
-- mente sobre os anos antigos — e o arquivo nao fica no disco para
-- sempre.
--
-- ⚠️ NAO existe data PREVISTA de fechamento, e esta coluna nao e isso
-- (D-024). Ela so registra quando o desfecho ACONTECEU. Nao ha forecast
-- neste sistema, e esta coluna nao abre a porta para inventar um.

alter table negocio add column fechado_em timestamptz;

comment on column negocio.fechado_em is
  'Quando o negocio foi ganho ou perdido. Nulo enquanto aberto. Preenchido pela migracao a partir de won_time/lost_time do Pipedrive e mantido pelo gatilho daqui em diante. NAO e previsao de fechamento — essa nao existe (D-024).';

-- O relatorio financeiro varre por janela de fechamento; sem indice isso
-- e varredura completa a cada troca de periodo.
create index if not exists negocio_fechado_em on negocio (fechado_em desc)
  where fechado_em is not null;

-- ---------- manutencao automatica ----------
-- Pelo mesmo motivo do log de eventos: o carimbo tem que nascer da
-- escrita, qualquer que seja a origem — tela, script ou agente futuro.
-- Se dependesse da aplicacao, bastaria um caminho novo esquecer de
-- carimbar para o relatorio financeiro passar a mentir em silencio.
create or replace function public.carimba_fechamento()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    -- Nascer ja fechado e possivel: a trava de desfecho (D-047) permite
    -- criar um negocio direto em Aguardando Contrato declarando Ganho.
    if new.status in ('ganho', 'perdido') and new.fechado_em is null then
      new.fechado_em := now();
    end if;

  elsif tg_op = 'UPDATE' then
    if new.status in ('ganho', 'perdido')
       and old.status not in ('ganho', 'perdido') then
      new.fechado_em := now();

    elsif new.status not in ('ganho', 'perdido')
          and old.status in ('ganho', 'perdido') then
      -- Reabriu: nao esta mais fechado, e guardar a data antiga faria o
      -- negocio contar como receita de um mes em que ele nao fechou.
      new.fechado_em := null;
    end if;
    -- ⚠️ Trocar de ganho para perdido (ou o contrario) NAO recarimba: a
    -- data do desfecho original continua sendo quando aquilo aconteceu.
    -- E a carga historica escreve `fechado_em` sem mexer no status, entao
    -- nao passa por nenhum dos ramos acima.
  end if;

  return new;
end $$;

create trigger trg_carimba_fechamento
  before insert or update on negocio
  for each row execute function public.carimba_fechamento();
