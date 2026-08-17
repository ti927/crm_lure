-- ============================================================
-- CRM Lure — o autor do evento passa a ser resolvido pelo auth_id.
--
-- ⚠️ DEFEITO EM PRODUCAO, corrigido aqui.
--
-- O gatilho do log gravava `autor uuid := auth.uid()` em
-- evento_negocio.autor_id, que e chave estrangeira para usuario(id).
-- Isso funcionava enquanto usuario.id ERA o id da conta de login.
--
-- A D-109 separou os dois: usuario.id virou id proprio e o id da conta
-- foi para usuario.auth_id. A partir dai, auth.uid() deixou de existir
-- em usuario(id) para todo mundo que veio da carga — a chave estrangeira
-- recusa e a ESCRITA INTEIRA falha.
--
-- Efeito real: Julio Manfrini, unico usuario migrado que ja entrou no
-- sistema, nao conseguia mover cartao no Kanban nem editar negocio.
-- Os outros quatro cairiam no mesmo assim que entrassem. So a conta que
-- existia antes da D-109 escapava, porque teve auth_id preenchido com o
-- proprio id no retrofit.
--
-- ⚠️ Licao que vale para o resto do projeto: mudar o significado de uma
-- chave primaria alcanca todo lugar que a referencia, inclusive gatilhos
-- escritos meses antes. A busca por `auth.uid()` no schema e obrigatoria
-- depois de qualquer mexida em identidade.
-- ============================================================

create or replace function public.registra_evento_negocio()
returns trigger language plpgsql security definer
set search_path = ''
as $$
declare
  -- Resolve o usuario do dominio a partir da conta de login (D-109).
  -- Null quando a escrita nao vem de sessao — carga, script, gatilho —
  -- e null e aceito: autor_id nao e obrigatorio.
  autor uuid := public.usuario_atual();
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
