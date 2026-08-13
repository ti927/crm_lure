-- ============================================================
-- CRM Lure — log de eventos do negocio
-- Doc 09, secao 3.7. D-033 e D-081.
--
-- ⛔ NAO CORTAR, EM NENHUMA HIPOTESE (Doc 10, secao 4).
--
-- Se o log entrar depois da virada, os indicadores de funil de
-- conversao, lead time e valor inicial x fechado nascem cegos, e nao
-- ha como recuperar. As telas de estatistica ficaram para a fase 2.
-- O log, nao.
-- ============================================================

create table evento_negocio (
  id             bigserial primary key,
  negocio_id     uuid not null references negocio(id) on delete cascade,
  tipo           tipo_evento not null,
  valor_anterior text,
  valor_novo     text,
  autor_id       uuid references usuario(id),
  ocorrido_em    timestamptz not null default now(),

  -- true = evento gerado pela carga de migracao, nao por operacao real.
  -- Todo indicador filtra origem_carga = false.
  origem_carga   boolean not null default false
);

create index on evento_negocio (negocio_id, ocorrido_em);
create index on evento_negocio (ocorrido_em desc) where origem_carga = false;

-- Somente insercao, garantido por permissao e nao por convencao.
-- O gatilho abaixo e security definer e escreve como dono da tabela,
-- entao a revogacao nao o impede.
revoke update, delete on evento_negocio from authenticated, anon;
revoke update, delete on evento_negocio from public;

-- ---------- O gatilho ----------
-- Gerado no banco, nunca pela aplicacao: assim o evento nasce qualquer
-- que seja a origem da escrita — tela, script de migracao ou futuro
-- agente de IA.
create or replace function public.registra_evento_negocio()
returns trigger language plpgsql security definer
set search_path = ''
as $$
declare
  autor uuid := auth.uid();
  -- A carga dos 2.453 negocios roda com
  --   set local app.carga_migracao = true
  -- e os eventos nascem marcados. Sem isso o log nasceria com milhares
  -- de eventos falsos datados do dia da migracao, e todo calculo de
  -- lead time viraria ficcao.
  --
  -- ⚠️ O nullif nao e enfeite. Depois que um `set local` sai de escopo,
  -- o Postgres nao devolve a variavel ao estado de inexistente: ela fica
  -- como marcador de valor VAZIO. Entao current_setting(...) devolve ''
  -- em vez de null, o coalesce nao pega, e ''::boolean levanta
  -- "invalid input syntax for type boolean". Na pratica: toda escrita em
  -- negocio quebraria depois da carga de migracao, na mesma conexao —
  -- e com pool de conexoes isso vaza para producao.
  carga boolean := coalesce(
    nullif(current_setting('app.carga_migracao', true), '')::boolean,
    false
  );
begin
  if tg_op = 'UPDATE' then
    if new.etapa_id is distinct from old.etapa_id then
      insert into public.evento_negocio (negocio_id, tipo, valor_anterior, valor_novo, autor_id, origem_carga)
      values (new.id, 'etapa', old.etapa_id::text, new.etapa_id::text, autor, carga);
    end if;

    if new.valor is distinct from old.valor then
      insert into public.evento_negocio (negocio_id, tipo, valor_anterior, valor_novo, autor_id, origem_carga)
      values (new.id, 'valor', old.valor::text, new.valor::text, autor, carga);
    end if;

    if new.responsavel_id is distinct from old.responsavel_id then
      insert into public.evento_negocio (negocio_id, tipo, valor_anterior, valor_novo, autor_id, origem_carga)
      values (new.id, 'responsavel', old.responsavel_id::text, new.responsavel_id::text, autor, carga);
    end if;

    if new.status is distinct from old.status then
      insert into public.evento_negocio (negocio_id, tipo, valor_anterior, valor_novo, autor_id, origem_carga)
      values (new.id, 'status', old.status::text, new.status::text, autor, carga);
    end if;
  end if;

  return new;
end $$;

create trigger trg_evento_negocio
  after update on negocio
  for each row execute function public.registra_evento_negocio();
