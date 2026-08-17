-- ============================================================
-- CRM Lure — o registro de usuario deixa de depender de conta de login.
--
-- ⚠️ Como estava, `usuario.id` era chave estrangeira para `auth.users`:
-- so existia usuario se ja existisse login. Duas consequencias
-- descobertas ao preparar a carga (17/08/2026):
--
--   1. Nenhum dos 5 usuarios do Pipedrive pode ser criado antes de
--      entrar no sistema — e sem eles, `responsavel_id` nasce nulo nos
--      2.458 negocios.
--   2. A carga precisa rodar antes de as pessoas entrarem no sistema.
--      Exigir login previo inverteria a ordem: os cinco teriam de
--      abrir o CRM, um a um, so para que a carga pudesse atribuir
--      responsavel — e qualquer atraso de um deles pararia a virada.
--      A D-084 tambem pede que usuario inativo continue existindo,
--      o que um vinculo obrigatorio com conta de login nao sustenta.
--
-- Depois desta migracao:
--   `usuario` e uma entidade do dominio, com id proprio.
--   `auth_id` liga ao login quando (e se) ele existir.
--   O gatilho do primeiro login casa por e-mail: se ja ha registro
--   migrado, adota-o em vez de criar outro.
-- ============================================================

-- ---------- solta o vinculo com auth.users ----------
do $$
declare
  restricao text;
begin
  select conname into restricao
    from pg_constraint
   where conrelid = 'public.usuario'::regclass
     and contype = 'f'
     and confrelid = 'auth.users'::regclass;

  if restricao is not null then
    execute format('alter table public.usuario drop constraint %I', restricao);
  end if;
end $$;

alter table usuario alter column id set default gen_random_uuid();

alter table usuario
  add column auth_id uuid unique references auth.users(id) on delete set null;

-- Quem entrou antes desta migracao tinha id = id da conta de login.
-- Preserva esse vinculo.
update usuario set auth_id = id where auth_id is null;

-- ---------- o gatilho passa a casar por e-mail ----------
-- Antes ele so inseria. Agora, se a carga ja trouxe a pessoa, o primeiro
-- login apenas adota o registro existente — senao o e-mail unico
-- recusaria a insercao e a pessoa ficaria sem conseguir entrar.
create or replace function public.cria_usuario_do_dominio()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  if split_part(new.email, '@', 2) <> public.dominio_empresa() then
    return new;
  end if;

  update public.usuario
     set auth_id = new.id,
         ativo   = true
   where email = new.email
     and auth_id is null;

  if not found then
    insert into public.usuario (nome, email, papel_id, auth_id)
    values (
      coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
      new.email,
      (select id from public.papel where nome = 'completo'),
      new.id
    )
    on conflict (email) do nothing;
  end if;

  return new;
end $$;

-- ---------- quem sou eu ----------
-- A aplicacao precisava resolver o usuario pelo id da sessao, que agora
-- e o auth_id e nao mais a chave primaria.
create or replace function public.usuario_atual()
returns uuid language sql stable
set search_path = ''
as $$
  select id from public.usuario where auth_id = auth.uid()
$$;
