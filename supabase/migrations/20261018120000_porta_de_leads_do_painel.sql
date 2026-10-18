-- ============================================================
-- CRM Lure — porta de entrada dos leads do Painel de Marketing (D-170)
--
-- O Painel Lure (Vercel, projeto à parte) tem uma aba Leads com dois
-- botões por lead: "Levar ao CRM" e "Arquivar". Esta migration é o lado
-- do CRM: uma tabela que guarda a situação de cada lead, uma função que
-- faz a importação inteira de uma vez, e a lista de origens.
--
-- É a primeira porta de entrada EXTERNA do sistema — o que a D-074
-- deixava para a fase 2 (E-012, R-009). Não é API pública: quem chama é
-- o servidor do painel, com a chave de serviço guardada só na Vercel,
-- atrás do login Google do domínio.
--
-- ⚠️ Criar negócio por aqui NÃO gera evento no log, e está certo: o
-- gatilho é `after update` e registra trajetória, não nascimento — o
-- mesmo de `criarNegocio` na aplicação.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Situação de cada lead do painel
-- ------------------------------------------------------------
create table lead_marketing (
  lead_id    text primary key,              -- id do lead no quadro Leads do Batuta
  situacao   text not null check (situacao in ('no_crm', 'arquivado')),
  -- ⚠️ `on delete cascade`: se o negócio for excluído no CRM, o lead volta
  -- a ficar pendente no painel. Com `restrict`, a exclusão de negócio —
  -- que a ficha já oferece — passaria a falhar para todo lead importado.
  negocio_id uuid references negocio(id) on delete cascade,
  motivo     text,                          -- motivo do arquivamento
  por_email  text,                          -- e-mail Google de quem clicou no painel
  em         timestamptz not null default now(),

  -- Levado ao CRM tem negócio; arquivado não tem.
  constraint lead_marketing_negocio_coerente check (
    (situacao = 'no_crm' and negocio_id is not null)
    or (situacao = 'arquivado' and negocio_id is null)
  )
);

create index on lead_marketing (negocio_id) where negocio_id is not null;

comment on table lead_marketing is
  'Situação de cada lead do Painel de Marketing: levado ao CRM (com o negócio criado) ou arquivado (com motivo). Escrita pelo servidor do painel com a chave de serviço (D-170).';

-- Mesmo padrão das outras tabelas (acesso_e_usuarios): o domínio lê e
-- escreve, anon não vê nada. A chave de serviço passa por cima do RLS.
alter table lead_marketing enable row level security;
create policy acesso_por_dominio on lead_marketing
  for all to authenticated
  using (public.pertence_ao_dominio())
  with check (public.pertence_ao_dominio());
revoke all on lead_marketing from anon;

-- ------------------------------------------------------------
-- 2. A importação, numa transação só
--
-- Entrada:
-- {
--   "lead_id": "...",                         obrigatório
--   "por_email": "...",                       quem clicou no painel
--   "pessoa": {"id", "nome", "email", "telefone", "cargo"},   opcional
--   "organizacao": {"id", "nome", "cidade", "uf"},            id OU nome
--   "negocio": {"titulo", "responsavel_id", "produto_id", "origem_id"},
--   "anotacao": "texto simples"               opcional
-- }
-- Retorno:
-- {"negocio_id", "pessoa_id", "organizacao_id", "pessoa_reusada", "ja_existia"}
--
-- Uma função plpgsql já roda inteira dentro da transação de quem a
-- chama: qualquer `raise` desfaz tudo o que ela gravou antes.
-- ------------------------------------------------------------
create function public.importa_lead_marketing(dados jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lead      text := nullif(btrim(dados->>'lead_id'), '');
  v_por_email text := nullif(lower(btrim(dados->>'por_email')), '');
  p           jsonb := coalesce(dados->'pessoa', '{}'::jsonb);
  o           jsonb := coalesce(dados->'organizacao', '{}'::jsonb);
  n           jsonb := coalesce(dados->'negocio', '{}'::jsonb);
  v_anotacao  text := nullif(btrim(dados->>'anotacao'), '');

  v_email     text := nullif(lower(btrim(p->>'email')), '');
  v_telefone  text := nullif(btrim(p->>'telefone'), '');
  v_cargo     text := nullif(btrim(p->>'cargo'), '');
  v_uf        text := nullif(upper(btrim(o->>'uf')), '');
  v_titulo    text := nullif(btrim(n->>'titulo'), '');

  v_pessoa       uuid;
  v_reusada      boolean := false;
  v_org          uuid;
  v_negocio      uuid;
  v_responsavel  uuid;
  v_etapa        uuid;
  v_status       public.status_negocio;
  v_autor        uuid;
  v_situacao     text;
begin
  if v_lead is null then
    raise exception 'lead_id é obrigatório';
  end if;

  -- Dois cliques no mesmo lead não podem criar dois negócios: o segundo
  -- espera o primeiro terminar e cai no "já existe" logo abaixo.
  perform pg_advisory_xact_lock(hashtext('lead_marketing:' || v_lead));

  select situacao, negocio_id into v_situacao, v_negocio
    from public.lead_marketing where lead_id = v_lead;

  if v_situacao = 'no_crm' then
    return jsonb_build_object(
      'negocio_id', v_negocio,
      'organizacao_id', (select organizacao_id from public.negocio where id = v_negocio),
      'pessoa_id', (select pessoa_id from public.negocio_pessoa
                     where negocio_id = v_negocio order by pessoa_id limit 1),
      'pessoa_reusada', true,
      'ja_existia', true
    );
  end if;

  if v_titulo is null then
    raise exception 'negocio.titulo é obrigatório';
  end if;

  -- ---------- organização ----------
  if nullif(o->>'id', '') is not null then
    select id into v_org from public.organizacao where id = (o->>'id')::uuid;
    if v_org is null then
      raise exception 'organizacao.id % não existe', o->>'id';
    end if;
  else
    if nullif(btrim(o->>'nome'), '') is null then
      raise exception 'organizacao.id ou organizacao.nome é obrigatório';
    end if;
    -- A restrição organizacao_uf_valida recusaria de qualquer jeito; a
    -- mensagem aqui diz qual campo, em vez do nome da restrição.
    if v_uf is not null and v_uf not in (
      'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
      'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
    ) then
      raise exception 'organizacao.uf inválida: %', o->>'uf';
    end if;
    -- D-160: UF mora na própria coluna, nunca colada em `cidade`.
    insert into public.organizacao (nome, cidade, uf)
    values (btrim(o->>'nome'), nullif(btrim(o->>'cidade'), ''), v_uf)
    returning id into v_org;
  end if;

  -- ---------- pessoa ----------
  if nullif(p->>'id', '') is not null then
    select id into v_pessoa from public.pessoa where id = (p->>'id')::uuid;
    if v_pessoa is null then
      raise exception 'pessoa.id % não existe', p->>'id';
    end if;
    v_reusada := true;
  elsif v_email is not null then
    select pessoa_id into v_pessoa
      from public.forma_contato
     where tipo = 'email' and lower(btrim(valor)) = v_email
     order by pessoa_id
     limit 1;
    v_reusada := v_pessoa is not null;
  end if;

  if v_pessoa is null and nullif(btrim(p->>'nome'), '') is not null then
    insert into public.pessoa (nome) values (btrim(p->>'nome'))
    returning id into v_pessoa;
  end if;

  if v_pessoa is not null then
    -- `forma_contato` não tem chave única (D-169): a deduplicação é
    -- explícita. E-mail compara em caixa baixa; telefone, só os dígitos.
    if v_email is not null and not exists (
      select 1 from public.forma_contato
       where pessoa_id = v_pessoa and tipo = 'email' and lower(btrim(valor)) = v_email
    ) then
      insert into public.forma_contato (pessoa_id, tipo, valor)
      values (v_pessoa, 'email', v_email);
    end if;

    if v_telefone is not null and not exists (
      select 1 from public.forma_contato
       where pessoa_id = v_pessoa and tipo = 'telefone'
         and regexp_replace(valor, '\D', '', 'g') = regexp_replace(v_telefone, '\D', '', 'g')
    ) then
      insert into public.forma_contato (pessoa_id, tipo, valor)
      values (v_pessoa, 'telefone', v_telefone);
    end if;

    -- D-036: o cargo é do vínculo. Vínculo que já existe fica como está.
    insert into public.pessoa_organizacao (pessoa_id, organizacao_id, cargo)
    values (v_pessoa, v_org, v_cargo)
    on conflict (pessoa_id, organizacao_id) do nothing;
  end if;

  -- ---------- negócio ----------
  if nullif(n->>'responsavel_id', '') is not null then
    select id into v_responsavel from public.usuario
     where id = (n->>'responsavel_id')::uuid and ativo;
    if v_responsavel is null then
      raise exception 'negocio.responsavel_id % não é usuário ativo', n->>'responsavel_id';
    end if;
  else
    select id into v_responsavel from public.usuario
     where email = 'daniela.abalem@lureconsultoria.com.br' and ativo;
  end if;

  -- Etapa inicial do funil (Cold Lead hoje), e o status sai dela (D-045).
  select id, status_inicial into v_etapa, v_status
    from public.etapa order by ordem limit 1;

  insert into public.negocio
    (titulo, organizacao_id, etapa_id, status, responsavel_id, produto_id, origem_id)
  values
    (v_titulo, v_org, v_etapa, v_status, v_responsavel,
     nullif(n->>'produto_id', '')::uuid, nullif(n->>'origem_id', '')::uuid)
  returning id into v_negocio;

  if v_pessoa is not null then
    insert into public.negocio_pessoa (negocio_id, pessoa_id) values (v_negocio, v_pessoa);
  end if;

  -- ---------- anotação ----------
  if v_anotacao is not null then
    if v_por_email is not null then
      select id into v_autor from public.usuario where lower(email) = v_por_email;
    end if;
    insert into public.anotacao (negocio_id, pessoa_id, organizacao_id, autor_id, texto)
    values (v_negocio, v_pessoa, v_org, v_autor, v_anotacao);
  end if;

  -- ---------- situação no painel ----------
  -- Lead arquivado que é levado ao CRM deixa de estar arquivado.
  insert into public.lead_marketing (lead_id, situacao, negocio_id, motivo, por_email, em)
  values (v_lead, 'no_crm', v_negocio, null, v_por_email, now())
  on conflict (lead_id) do update
    set situacao = 'no_crm', negocio_id = excluded.negocio_id, motivo = null,
        por_email = excluded.por_email, em = now();

  return jsonb_build_object(
    'negocio_id', v_negocio,
    'pessoa_id', v_pessoa,
    'organizacao_id', v_org,
    'pessoa_reusada', v_reusada,
    'ja_existia', false
  );
end $$;

comment on function public.importa_lead_marketing(jsonb) is
  'Leva um lead do Painel de Marketing ao CRM: pessoa (reusa por e-mail), organização, vínculo, negócio em Cold Lead, anotação e a linha em lead_marketing — tudo ou nada. Só service_role (D-170).';

revoke execute on function public.importa_lead_marketing(jsonb) from public, anon, authenticated;
grant execute on function public.importa_lead_marketing(jsonb) to service_role;

-- ------------------------------------------------------------
-- 3. Origens do negócio
--
-- A tabela nasceu vazia: o Pipedrive não tinha o campo. Lista confirmada
-- pelo maestro em 18/10/2026. Edição posterior segue pelo painel do
-- Supabase (D-096); `on conflict` deixa a migration rodar de novo sem
-- duplicar.
-- ------------------------------------------------------------
insert into origem (nome, ordem) values
  ('Anúncio LinkedIn',   1),
  ('Anúncio Google',     2),
  ('Anúncio Meta',       3),
  ('Página de links',    4),
  ('Blog/site',          5),
  ('Diagnóstico de IA',  6),
  ('Material gratuito',  7),
  ('Indicação',          8),
  ('Direto',             9)
on conflict (nome) do nothing;
