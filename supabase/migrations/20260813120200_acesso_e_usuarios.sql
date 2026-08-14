-- ============================================================
-- CRM Lure — acesso por dominio e criacao automatica de usuario
-- Doc 09, secoes 3.8 e 3.9. D-050, D-084.
-- ============================================================

-- ---------- O dominio da empresa ----------
-- O Doc 09 usa current_setting('app.dominio_empresa') e nao diz onde o
-- valor e definido. A resposta natural seria
--   alter database ... set app.dominio_empresa = ...
-- mas o Supabase nega: o papel que aplica as migracoes nao e dono do
-- banco (SQLSTATE 42501). Testado, nao suposto.
--
-- O dominio vira entao o corpo desta funcao. Fica melhor do que a
-- configuracao de servidor pretendida: uma configuracao pode divergir
-- entre o banco local e a producao sem deixar rastro, a funcao nao —
-- ela e migracao versionada em git. Com base unica (D-101) isso pesa
-- mais, porque o repositorio e a unica descricao confiavel do schema.
--
-- ⚠️ P-029: o valor abaixo decide quem entra no sistema. Deduzido do
-- e-mail do maestro, aguarda confirmacao.
--
-- ⚠️ Para trocar o dominio, crie uma migracao nova com um
-- `create or replace` desta funcao. Nunca pelo painel — regra 1 do
-- CLAUDE.md.
create or replace function public.dominio_empresa()
returns text language sql immutable
set search_path = ''
as $$
  select 'lureconsultoria.com.br'::text
$$;

-- Falha fechada: e-mail ausente ou sem dominio devolve null, e null em
-- politica de RLS nega. Nunca o contrario.
create or replace function public.pertence_ao_dominio()
returns boolean language sql stable
set search_path = ''
as $$
  select nullif(split_part(coalesce(auth.jwt() ->> 'email', ''), '@', 2), '')
         = public.dominio_empresa()
$$;

-- ---------- 3.8 Criacao automatica do usuario (D-084) ----------
-- O primeiro login de uma conta do dominio cria o usuario, ativo, com
-- papel unico de acesso total.
create or replace function public.cria_usuario_do_dominio()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  if split_part(new.email, '@', 2) = public.dominio_empresa() then
    insert into public.usuario (id, nome, email, papel_id)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
      new.email,
      (select id from public.papel where nome = 'completo')
    )
    on conflict (id) do nothing;
  end if;

  return new;
end $$;

create trigger trg_cria_usuario
  after insert on auth.users
  for each row execute function public.cria_usuario_do_dominio();

-- ---------- 3.9 Politicas de acesso (D-050, D-084) ----------
-- Papel unico de acesso total: a politica nao segmenta o que cada um ve,
-- apenas garante que so contas do dominio entram.
--
-- Consequencia aceita e registrada: qualquer conta do dominio ve a base
-- inteira, inclusive valores e motivos de perda. Risco no Doc 00, item
-- de fase 2 (P-018).
--
-- Uma politica `for all` por tabela, e nao o par select + all do Doc 09:
-- politicas permissivas se somam, entao `for all` ja cobre o select. O
-- efeito e identico e sobra menos superficie para divergir.
--
-- ⚠️ Politica de RLS sozinha nao da acesso a nada. O Doc 09 so descreve
-- as politicas, mas o Postgres exige DOIS sinais verdes: o privilegio de
-- tabela (grant) e a politica. Sem o grant, a conta do dominio bate em
-- "permission denied for table negocio" antes de a politica ser sequer
-- avaliada. Testado.
do $$
declare
  t text;
  -- Tabelas de dado do dominio: acesso total, papel unico (D-049, D-050).
  dados text[] := array[
    'origem', 'motivo_perda', 'area_produto', 'tipo_atividade',
    'organizacao', 'pessoa', 'pessoa_organizacao', 'forma_contato',
    'funil', 'etapa', 'produto', 'negocio', 'negocio_pessoa',
    'atividade', 'anotacao'
  ];
  -- Tabelas de estrutura de permissao: sem tela no MVP (D-096), editadas
  -- pelo painel. Leitura basta para a aplicacao resolver o papel.
  estrutura text[] := array['papel', 'permissao', 'papel_permissao'];
begin
  foreach t in array dados || estrutura || array['usuario'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy acesso_por_dominio on public.%I
         for all to authenticated
         using (public.pertence_ao_dominio())
         with check (public.pertence_ao_dominio())',
      t
    );
    -- anon nunca ve nada: nao ha area publica neste sistema.
    execute format('revoke all on public.%I from anon', t);
  end loop;

  foreach t in array dados loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;

  foreach t in array estrutura loop
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end $$;

-- D-051: usuario nunca e excluido, apenas marcado inativo. A ausencia do
-- delete e a regra escrita como privilegio, e nao como combinado.
grant select, insert, update on usuario to authenticated;

-- O log e a excecao: leitura pelo dominio, escrita so pelo gatilho.
-- Sem politica de insert/update/delete, nenhuma delas passa pela API.
-- A revogacao da migracao anterior cobre o mesmo por outro caminho.
alter table evento_negocio enable row level security;

create policy dominio_le_o_log on evento_negocio
  for select to authenticated
  using (public.pertence_ao_dominio());

revoke all on evento_negocio from anon;
grant select on evento_negocio to authenticated;
