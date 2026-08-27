-- ============================================================
-- CRM Lure — ferramenta de fusão de organizações duplicadas.
--
-- ⚠️ **Isto altera o escopo do MVP**, onde "mesclagem de duplicados"
-- estava na lista do que NÃO se constrói, e a D-121 registrou que o
-- agrupamento da Lista é apresentação e não fusão. Entra por decisão
-- explícita do maestro, como ferramenta **restrita aos desenvolvedores**
-- enquanto a base é limpa: são 668 grupos e 1.204 cadastros que
-- desapareceriam se todos fossem fundidos.
--
-- ⚠️ **A operação é IRREVERSÍVEL e a ordem das etapas é inegociável.**
-- Três das quatro tabelas que apontam para `organizacao` têm
-- `on delete cascade` — `anotacao`, `atividade` e `pessoa_organizacao`.
-- Apagar a duplicada antes de mover os registros os apagaria **em
-- silêncio**, sem erro nenhum. Mover primeiro, apagar por último.
-- (`negocio` é `no action`, então ele é a única rede de proteção
-- automática: se sobrasse um negócio, o `delete` falharia.)
--
-- ⚠️ **A fusão não aparece no log de eventos.** `registra_evento_negocio`
-- só registra etapa, valor, responsável e status — trocar
-- `organizacao_id` de um negócio não gera evento. É exatamente por isso
-- que existe a tabela `fusao_organizacao` abaixo: sem ela, a operação
-- mais destrutiva do sistema seria a única que não deixa rastro.
--
-- ⚠️ **Guarda `encadeia_vinculo_atividade`:** verificado que ela só
-- preenche `organizacao_id` quando ele é NULO. Mover uma atividade para
-- outra organização não é desfeito por ela.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Quem é desenvolvedor
--
-- ⚠️ Coluna booleana, e NÃO um papel novo. A D-050 desenhou o acesso com
-- papel único ("completo") e domínio de e-mail; inventar um segundo papel
-- mudaria o modelo de autorização inteiro para marcar duas pessoas. Isto
-- é uma marca temporária, do tamanho do problema que resolve.
-- ------------------------------------------------------------

alter table usuario
  add column if not exists desenvolvedor boolean not null default false;

comment on column usuario.desenvolvedor is
  'Acesso às ferramentas de manutenção (fusão de organizações). Temporário, enquanto a base é limpa.';

update usuario
   set desenvolvedor = true
 where lower(email) in (
   'julio.manfrini@lureconsultoria.com.br',
   'fabio.miranda@lureconsultoria.com.br'
 );

/**
 * ⚠️ `usuario_atual()`, e NUNCA `auth.uid()`: desde a D-109 os dois são
 * diferentes, e comparar com o errado devolveria falso justamente para
 * quem veio da carga — que são os dois desenvolvedores. É a armadilha da
 * C-05, escrita antes de morder.
 */
create or replace function public.sou_desenvolvedor()
returns boolean
language sql stable
set search_path = ''
as $$
  select coalesce(
    (select u.desenvolvedor from public.usuario u where u.id = public.usuario_atual()),
    false
  )
$$;

revoke execute on function public.sou_desenvolvedor() from anon;
grant execute on function public.sou_desenvolvedor() to authenticated;

-- ------------------------------------------------------------
-- 2. O rastro
--
-- ⚠️ Guarda os IDS de tudo que se moveu, e não só as contagens. Contagem
-- responde "quanto"; id responde "o quê", que é a única coisa que
-- permitiria desfazer. A operação não tem desfazer hoje — mas escolher
-- não guardar o suficiente para construí-lo seria fechar essa porta de
-- graça, numa operação irreversível.
-- ------------------------------------------------------------

create table if not exists fusao_organizacao (
  id             uuid primary key default gen_random_uuid(),
  principal_id   uuid not null references organizacao(id),
  -- Sem FK: a duplicada deixa de existir no fim da operação.
  duplicada_id   uuid not null,
  duplicada_nome text not null,
  movidos        jsonb not null,
  adotados       jsonb not null default '{}'::jsonb,
  autor_id       uuid references usuario(id),
  criado_em      timestamptz not null default now()
);

create index if not exists fusao_organizacao_principal_idx
  on fusao_organizacao (principal_id);

alter table fusao_organizacao enable row level security;

-- Ler: qualquer pessoa do domínio — o rastro não é segredo, e esconder
-- de quem opera o sistema uma mudança que apagou cadastros seria pior.
create policy fusao_leitura_por_dominio on fusao_organizacao
  for select using (public.pertence_ao_dominio());

-- Escrever: só desenvolvedor. A função de fusão é `security invoker`, e
-- é esta política que a impede de gravar por outras mãos.
create policy fusao_escrita_por_desenvolvedor on fusao_organizacao
  for insert with check (public.sou_desenvolvedor());

-- ------------------------------------------------------------
-- 3. Leitura: os grupos e os cadastros de cada grupo
-- ------------------------------------------------------------

create or replace function public.fusao_grupos(
  termo        text    default null,
  limite       integer default 25,
  deslocamento integer default 0
)
returns table (chave text, nome text, quantidade bigint)
language sql stable
set search_path = ''
as $$
  select o.chave_agrupamento,
         (array_agg(o.nome order by o.criado_em, o.id))[1],
         count(*)
    from public.organizacao o
   where btrim(coalesce(termo, '')) = ''
      or o.nome ilike '%' || btrim(termo) || '%'
   group by o.chave_agrupamento
  having count(*) > 1
   order by count(*) desc, 2
   limit greatest(1, least(coalesce(limite, 25), 100))
  offset greatest(0, coalesce(deslocamento, 0))
$$;

create or replace function public.fusao_conta_grupos(termo text default null)
returns bigint
language sql stable
set search_path = ''
as $$
  select count(*) from (
    select 1
      from public.organizacao o
     where btrim(coalesce(termo, '')) = ''
        or o.nome ilike '%' || btrim(termo) || '%'
     group by o.chave_agrupamento
    having count(*) > 1
  ) t
$$;

/**
 * Os cadastros de um grupo, cada um com o peso do que carrega.
 *
 * ⚠️ As quatro contagens são o que decide qual cadastro deve sobreviver:
 * fundir o mais gordo dentro do mais magro move muito mais linhas sem
 * necessidade, e é onde um erro custa mais caro.
 */
create or replace function public.fusao_cadastros(chave_grupo text)
returns table (
  id         uuid,
  nome       text,
  cidade     text,
  website    text,
  bubble_id  text,
  criado_em  timestamptz,
  negocios   bigint,
  pessoas    bigint,
  atividades bigint,
  anotacoes  bigint
)
language sql stable
set search_path = ''
as $$
  select o.id, o.nome, o.cidade, o.website, o.bubble_id, o.criado_em,
         (select count(*) from public.negocio n           where n.organizacao_id = o.id),
         (select count(*) from public.pessoa_organizacao p where p.organizacao_id = o.id),
         (select count(*) from public.atividade a         where a.organizacao_id = o.id),
         (select count(*) from public.anotacao an         where an.organizacao_id = o.id)
    from public.organizacao o
   where o.chave_agrupamento = chave_grupo
   order by o.criado_em, o.id
$$;

-- ------------------------------------------------------------
-- 4. A prévia
--
-- ⚠️ Nenhuma fusão acontece sem que isto tenha sido mostrado antes. O
-- número que a tela exibe e o número que a operação move saem da MESMA
-- consulta — duas consultas parecidas divergem no dia em que alguém
-- mexer só numa.
-- ------------------------------------------------------------

create or replace function public.previa_fusao_organizacao(
  p_principal uuid,
  p_duplicada uuid
)
returns jsonb
language plpgsql stable
set search_path = ''
as $$
declare
  princ public.organizacao%rowtype;
  dupl  public.organizacao%rowtype;
begin
  if p_principal = p_duplicada then
    raise exception 'A organização principal e a duplicada são a mesma.';
  end if;

  select * into princ from public.organizacao where id = p_principal;
  select * into dupl  from public.organizacao where id = p_duplicada;
  if princ.id is null or dupl.id is null then
    raise exception 'Organização não encontrada.';
  end if;

  return jsonb_build_object(
    'principal', jsonb_build_object('id', princ.id, 'nome', princ.nome),
    'duplicada', jsonb_build_object('id', dupl.id, 'nome', dupl.nome),
    'move', jsonb_build_object(
      'negocios',   (select count(*) from public.negocio n where n.organizacao_id = dupl.id),
      'atividades', (select count(*) from public.atividade a where a.organizacao_id = dupl.id),
      'anotacoes',  (select count(*) from public.anotacao an where an.organizacao_id = dupl.id),
      'pessoas',    (select count(*) from public.pessoa_organizacao p
                      where p.organizacao_id = dupl.id
                        and not exists (select 1 from public.pessoa_organizacao q
                                         where q.organizacao_id = princ.id
                                           and q.pessoa_id = p.pessoa_id))
    ),
    -- Vínculo que a pessoa já tem com o principal: nada a mover, o da
    -- duplicada some. A tela precisa dizer isso, senão a soma não fecha.
    'ja_vinculadas', (select count(*) from public.pessoa_organizacao p
                       where p.organizacao_id = dupl.id
                         and exists (select 1 from public.pessoa_organizacao q
                                      where q.organizacao_id = princ.id
                                        and q.pessoa_id = p.pessoa_id)),
    -- ⚠️ Só o que está VAZIO no principal é preenchido. Nada sobrescreve
    -- valor existente: numa operação sem volta, o dado que já estava lá
    -- é o que tem dono conhecido.
    'adota', (
      select coalesce(jsonb_object_agg(campo, valor), '{}'::jsonb) from (
        select 'cidade' campo, dupl.cidade valor
         where coalesce(btrim(princ.cidade), '') = '' and coalesce(btrim(dupl.cidade), '') <> ''
        union all
        select 'website', dupl.website
         where coalesce(btrim(princ.website), '') = '' and coalesce(btrim(dupl.website), '') <> ''
        union all
        select 'bubble_id', dupl.bubble_id
         where coalesce(btrim(princ.bubble_id), '') = '' and coalesce(btrim(dupl.bubble_id), '') <> ''
      ) t
    ),
    -- O que se perde: valor preenchido nos dois, diferente, que NÃO será
    -- copiado. Some com o cadastro. A tela avisa antes.
    'descarta', (
      select coalesce(jsonb_object_agg(campo, valor), '{}'::jsonb) from (
        select 'cidade' campo, dupl.cidade valor
         where coalesce(btrim(princ.cidade), '') <> '' and coalesce(btrim(dupl.cidade), '') <> ''
           and btrim(princ.cidade) is distinct from btrim(dupl.cidade)
        union all
        select 'website', dupl.website
         where coalesce(btrim(princ.website), '') <> '' and coalesce(btrim(dupl.website), '') <> ''
           and btrim(princ.website) is distinct from btrim(dupl.website)
        union all
        select 'bubble_id', dupl.bubble_id
         where coalesce(btrim(princ.bubble_id), '') <> '' and coalesce(btrim(dupl.bubble_id), '') <> ''
           and btrim(princ.bubble_id) is distinct from btrim(dupl.bubble_id)
      ) t
    )
  );
end;
$$;

-- ------------------------------------------------------------
-- 5. A fusão
--
-- ⚠️ Uma função é atômica: ou tudo acontece, ou nada. É isso que garante
-- que nunca exista o estado intermediário em que os negócios já mudaram
-- de dono e as atividades ainda não.
-- ------------------------------------------------------------

create or replace function public.funde_organizacao(
  p_principal uuid,
  p_duplicada uuid
)
returns jsonb
language plpgsql volatile
set search_path = ''
as $$
declare
  princ    public.organizacao%rowtype;
  dupl     public.organizacao%rowtype;
  adotados jsonb;
  movidos  jsonb;
begin
  -- ⚠️ A trava é AQUI, e não na tela. Esconder o botão não impede a
  -- chamada; recusar na função impede.
  if not public.sou_desenvolvedor() then
    raise exception 'Apenas desenvolvedores podem fundir organizações.'
      using errcode = 'insufficient_privilege';
  end if;

  if p_principal = p_duplicada then
    raise exception 'A organização principal e a duplicada são a mesma.';
  end if;

  -- `for update`: duas fusões simultâneas sobre o mesmo grupo poderiam
  -- mover linhas para uma organização que a outra está apagando.
  select * into princ from public.organizacao where id = p_principal for update;
  select * into dupl  from public.organizacao where id = p_duplicada for update;
  if princ.id is null or dupl.id is null then
    raise exception 'Organização não encontrada.';
  end if;

  adotados := (public.previa_fusao_organizacao(p_principal, p_duplicada)) -> 'adota';

  -- ---------- os ids, ANTES de mover ----------
  -- Depois do update eles já pertencem ao principal e não haveria como
  -- distinguir o que veio desta fusão do que já estava lá.
  movidos := jsonb_build_object(
    'negocios',   coalesce((select jsonb_agg(n.id) from public.negocio n where n.organizacao_id = dupl.id), '[]'::jsonb),
    'atividades', coalesce((select jsonb_agg(a.id) from public.atividade a where a.organizacao_id = dupl.id), '[]'::jsonb),
    'anotacoes',  coalesce((select jsonb_agg(an.id) from public.anotacao an where an.organizacao_id = dupl.id), '[]'::jsonb),
    'pessoas',    coalesce((select jsonb_agg(p.pessoa_id) from public.pessoa_organizacao p where p.organizacao_id = dupl.id), '[]'::jsonb)
  );

  -- ---------- 1. mover ----------
  update public.negocio   set organizacao_id = princ.id where organizacao_id = dupl.id;
  update public.atividade set organizacao_id = princ.id where organizacao_id = dupl.id;
  update public.anotacao  set organizacao_id = princ.id where organizacao_id = dupl.id;

  -- ⚠️ O vínculo pessoa↔organização tem chave (pessoa_id, organizacao_id):
  -- um `update` cego colidiria quando a pessoa já estivesse nas duas.
  -- Antes de mover, o principal adota o cargo que só a duplicada tinha —
  -- senão a informação some junto com a linha.
  update public.pessoa_organizacao pp
     set cargo = pd.cargo
    from public.pessoa_organizacao pd
   where pp.organizacao_id = princ.id
     and pd.organizacao_id = dupl.id
     and pd.pessoa_id = pp.pessoa_id
     and coalesce(btrim(pp.cargo), '') = ''
     and coalesce(btrim(pd.cargo), '') <> '';

  insert into public.pessoa_organizacao (pessoa_id, organizacao_id, cargo)
  select pd.pessoa_id, princ.id, pd.cargo
    from public.pessoa_organizacao pd
   where pd.organizacao_id = dupl.id
  on conflict (pessoa_id, organizacao_id) do nothing;

  delete from public.pessoa_organizacao where organizacao_id = dupl.id;

  -- ---------- 2. adotar o que estava vazio ----------
  update public.organizacao
     set cidade    = coalesce(nullif(btrim(cidade), ''), nullif(btrim(dupl.cidade), '')),
         website   = coalesce(nullif(btrim(website), ''), nullif(btrim(dupl.website), '')),
         bubble_id = coalesce(nullif(btrim(bubble_id), ''), nullif(btrim(dupl.bubble_id), ''))
   where id = princ.id;

  -- ---------- 3. o rastro, ANTES de apagar ----------
  insert into public.fusao_organizacao
    (principal_id, duplicada_id, duplicada_nome, movidos, adotados, autor_id)
  values (princ.id, dupl.id, dupl.nome, movidos, adotados, public.usuario_atual());

  -- ---------- 4. apagar, por último ----------
  -- Se algo tiver escapado das etapas acima, o `on delete cascade` de
  -- anotacao/atividade/pessoa_organizacao apagaria em silêncio. Esta
  -- conferência transforma o silêncio em erro, e o erro desfaz tudo.
  if exists (select 1 from public.atividade where organizacao_id = dupl.id)
     or exists (select 1 from public.anotacao where organizacao_id = dupl.id)
     or exists (select 1 from public.pessoa_organizacao where organizacao_id = dupl.id)
     or exists (select 1 from public.negocio where organizacao_id = dupl.id) then
    raise exception 'Sobrou registro apontando para a duplicada; fusão desfeita.';
  end if;

  delete from public.organizacao where id = dupl.id;

  return jsonb_build_object(
    'ok', true,
    'principal_id', princ.id,
    'duplicada_nome', dupl.nome,
    'negocios',   jsonb_array_length(movidos -> 'negocios'),
    'atividades', jsonb_array_length(movidos -> 'atividades'),
    'anotacoes',  jsonb_array_length(movidos -> 'anotacoes'),
    'pessoas',    jsonb_array_length(movidos -> 'pessoas'),
    'adotados',   adotados
  );
end;
$$;

revoke execute on function public.fusao_grupos(text, integer, integer) from anon;
revoke execute on function public.fusao_conta_grupos(text) from anon;
revoke execute on function public.fusao_cadastros(text) from anon;
revoke execute on function public.previa_fusao_organizacao(uuid, uuid) from anon;
revoke execute on function public.funde_organizacao(uuid, uuid) from anon;

grant execute on function public.fusao_grupos(text, integer, integer) to authenticated;
grant execute on function public.fusao_conta_grupos(text) to authenticated;
grant execute on function public.fusao_cadastros(text) to authenticated;
grant execute on function public.previa_fusao_organizacao(uuid, uuid) to authenticated;
grant execute on function public.funde_organizacao(uuid, uuid) to authenticated;
