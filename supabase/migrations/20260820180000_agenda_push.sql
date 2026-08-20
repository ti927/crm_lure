-- ============================================================
-- CRM Lure — o agendamento do push (D-144).
--
-- ⚠️ ESTA MIGRACAO SO APLICA DEPOIS QUE AS EXTENSOES ESTIVEREM
-- HABILITADAS no painel do Supabase (Database -> Extensions):
--   · pg_cron  — o relogio
--   · pg_net   — a chamada HTTP saindo do banco
--
-- Elas nao sao habilitaveis por migracao: exigem privilegio que o papel
-- que aplica migracao nao tem (mesma limitacao que a D-050 encontrou com
-- `alter database ... set`). Por isso ficam como passo manual, uma vez.
--
-- ⚠️ O segredo e a URL NAO ficam neste arquivo. O repositorio e PUBLICO
-- (D-114). Eles moram no Vault do Supabase, e o agendamento os le de la.
-- Gravar segredo em migracao versionada seria publicar a chave.
-- ============================================================

-- ---------- Guarda: nao aplicar sem as extensoes ----------
do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise exception
      'pg_cron nao esta habilitado. Ligue em Database -> Extensions no painel do Supabase e aplique de novo.';
  end if;
  if not exists (select 1 from pg_extension where extname = 'pg_net') then
    raise exception
      'pg_net nao esta habilitado. Ligue em Database -> Extensions no painel do Supabase e aplique de novo.';
  end if;
end $$;

-- ---------- Guarda: o segredo precisa existir no Vault ----------
-- ⚠️ Sem isto o agendamento seria criado e chamaria a rota sem
-- credencial, tomando 401 de hora em hora — em silencio, porque
-- `pg_net` e assincrono e ninguem olha a tabela de respostas.
do $$
begin
  if not exists (select 1 from vault.decrypted_secrets where name = 'lure_push_url') then
    raise exception 'Falta o segredo "lure_push_url" no Vault do Supabase.';
  end if;
  if not exists (select 1 from vault.decrypted_secrets where name = 'lure_push_segredo') then
    raise exception 'Falta o segredo "lure_push_segredo" no Vault do Supabase.';
  end if;
end $$;

-- ---------- A chamada ----------
create or replace function public.dispara_push()
returns void language plpgsql security definer
set search_path = ''
as $$
declare
  url     text;
  segredo text;
begin
  select decrypted_secret into url
    from vault.decrypted_secrets where name = 'lure_push_url';
  select decrypted_secret into segredo
    from vault.decrypted_secrets where name = 'lure_push_segredo';

  if url is null or segredo is null then
    raise warning 'push nao disparado: segredo ausente no Vault';
    return;
  end if;

  -- ⚠️ O segredo vai em CABECALHO e nunca na URL: query string entra em
  -- log de servidor, historico e referer.
  perform net.http_post(
    url     := url,
    headers := jsonb_build_object(
                 'Content-Type',   'application/json',
                 'x-lure-segredo', segredo
               ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 55000
  );
end $$;

revoke execute on function public.dispara_push() from public, anon, authenticated;

-- ---------- O relogio ----------
-- De hora em hora, no minuto 5. A propria rota recusa fora do horario
-- civilizado (8h-20h de Brasilia) — a decisao mora la, e nao aqui,
-- porque o cron trabalha em UTC e o horario de Brasilia muda de
-- distancia se o pais voltar a ter horario de verao.
select cron.unschedule('lure-push')
 where exists (select 1 from cron.job where jobname = 'lure-push');

select cron.schedule('lure-push', '5 * * * *', $$ select public.dispara_push(); $$);

comment on function public.dispara_push is
  'Chama /api/enviar-push na aplicacao. Agendado por pg_cron como '
  '"lure-push". Ver Doc 15 e D-144.';
