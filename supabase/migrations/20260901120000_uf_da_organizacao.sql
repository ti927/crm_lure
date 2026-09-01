-- ============================================================
-- CRM Lure — o endereço da organização ganha estado, e para de morar
-- num campo de texto livre só.
--
-- ⚠️ O que havia: UMA coluna, `cidade`, texto livre. 594 das 2.903
-- organizações preenchidas — 20%. Sem estado, sem país, sem CEP.
--
-- ⚠️ O que a carga deixou para trás: no Pipedrive, **864 organizações
-- tinham endereço**; `scripts/carga-migracao.mjs` trouxe apenas
-- `address_locality` e descartou o resto. Das 864, **281 vieram com
-- `locality` vazio mesmo tendo endereço** ("Anápolis, GO, Brasil" com
-- locality "") — essas perderam tudo. Também se perderam o estado (705
-- registros na origem), o país (705) e o CEP (56).
--
-- ⚠️ Por que UF e não endereço postal completo: dos 864 endereços da
-- origem, **apenas 3 têm rua e número**. O "endereço" daquela base é
-- cidade + estado. Uma estrutura de logradouro/número/bairro/CEP
-- nasceria 99,7% vazia — sete campos para servir três cadastros. Cidade
-- e UF cobrem o dado que existe de verdade.
--
-- ⚠️ A UF fica em coluna PRÓPRIA, e não colada na cidade. Foi
-- exatamente a colagem que produziu a sujeira que este arquivo limpa
-- abaixo: "Goiânia" (380 registros) e "Goiânia, GO" (8) convivem hoje
-- como cidades diferentes, e agrupar ou ordenar por cidade separa o que
-- é a mesma.
--
-- ⚠️ Endereço é de ORGANIZAÇÃO, não de pessoa. Nenhuma das 4.604
-- pessoas do Pipedrive tem `postal_address` preenchido — zero, em todos
-- os treze subcampos. Não existe campo de endereço em `pessoa`, e não é
-- esquecimento.
--
-- A recuperação dos 281 é DADO, não schema, e mora em
-- `scripts/recupera-enderecos.mjs` — que ensaia por padrão, como o
-- `recupera-acentos.mjs`.
-- ============================================================

-- ------------------------------------------------------------
-- 1. A coluna
-- ------------------------------------------------------------

alter table organizacao add column uf text;

-- Sempre em caixa alta e sem espaço: sem isto, "go", "Go" e "GO " viram
-- três estados distintos no agrupamento — que é o defeito que a coluna
-- existe para não repetir.
alter table organizacao
  add constraint organizacao_uf_valida check (
    uf is null or uf in (
      'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
      'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
    )
  );

comment on column organizacao.uf is
  'Unidade federativa, duas letras maiúsculas. Nula para endereço de fora do Brasil — a base tem um cadastro em Luanda — e nula quando apenas a cidade é conhecida.';

-- ------------------------------------------------------------
-- 2. Separar a UF que hoje está colada dentro de `cidade`
--
-- São 13 registros: 'Goiânia, GO' (8), 'Anápolis -GO' (2), 'Catalão,
-- GO', 'Goianápolis, GO', 'Leopoldo de Bulhões, GO'. Poucos, e é
-- justamente por serem poucos que passam despercebidos numa lista de
-- 2.903 — a lista mostra "Goiânia" 380 vezes e "Goiânia, GO" oito, e
-- ninguém repara.
--
-- ⚠️ O sufixo só é aceito se as duas letras forem uma UF DE VERDADE.
-- Sem essa conferência, qualquer cidade terminada em duas letras depois
-- de um hífen perderia parte do próprio nome.
--
-- ⚠️ A UF sai da cidade ORIGINAL, e não da já recortada: no Postgres o
-- `set` de um `update` enxerga sempre o valor anterior da linha, então
-- as duas atribuições abaixo leem a mesma `cidade` de entrada. Fosse
-- sequencial, a segunda leria o texto já sem o sufixo.
-- ------------------------------------------------------------

update organizacao
   set cidade = btrim(regexp_replace(cidade, '\s*[,\-]\s*[A-Za-z]{2}$', '')),
       uf     = upper(right(btrim(cidade), 2))
 where cidade ~ '\s*[,\-]\s*[A-Za-z]{2}$'
   and upper(right(btrim(cidade), 2)) in (
     'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
     'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
   );

-- Espaço em volta e string vazia viram nulo: a ferramenta de fusão
-- pergunta "tem cidade?" com `coalesce(btrim(...), '') = ''` em quatro
-- lugares, e um campo com um espaço dentro responde que sim.
update organizacao
   set cidade = nullif(btrim(cidade), '')
 where cidade is distinct from nullif(btrim(cidade), '');

-- ------------------------------------------------------------
-- 3. A lista de organizações passa a devolver a UF
--
-- ⚠️ `drop` antes de `create`: `create or replace` não muda o tipo de
-- retorno de uma função existente — o Postgres recusa com "cannot
-- change return type". As duas ganham coluna.
--
-- ⚠️ E corrige, de passagem, um defeito que só aparece em grupo: o
-- representante era `(array_agg(cidade order by nome, id))[1]`, o valor
-- do PRIMEIRO cadastro — nulo inclusive. Com "Sicoob Credseguro" seis
-- vezes e a cidade preenchida só na quarta, a linha do grupo aparecia
-- sem cidade nenhuma embora o grupo soubesse dela. O `filter (where ...
-- is not null)` faz o grupo mostrar a cidade que ALGUÉM ali tem. Não é
-- palpite: o agrupamento é por nome normalizado e não afirma que são a
-- mesma empresa, por isso a cidade adotada é a de um cadastro real e
-- nunca uma média ou uma invenção — e expandir o grupo mostra de quem
-- ela é.
-- ------------------------------------------------------------

drop function if exists public.organizacoes_agrupadas(text, integer, integer);
drop function if exists public.organizacoes_do_grupo(text);

create function public.organizacoes_agrupadas(
  termo text default null,
  limite integer default 50,
  deslocamento integer default 0
)
returns table (
  chave text,
  nome text,
  quantidade bigint,
  representante_id uuid,
  cidade text,
  uf text,
  website text,
  negocios bigint,
  titulos text[],
  pessoas bigint,
  nomes_pessoas text[],
  atividades bigint,
  atividades_pendentes bigint,
  amostra_atividades jsonb
)
language sql
stable
set search_path = ''
as $$
  with filtrado as (
    select o.*
      from public.organizacao o
     where termo is null
        or termo = ''
        or o.nome ilike '%' || termo || '%'
  ),
  agrupado as (
    select
      f.chave_agrupamento as chave,
      (array_agg(f.nome order by f.nome, f.id))[1]    as nome,
      count(*)                                        as quantidade,
      (array_agg(f.id order by f.nome, f.id))[1]      as representante_id,
      -- ⚠️ `filter`: o primeiro que TEM, não o primeiro da ordem.
      (array_agg(f.cidade order by f.nome, f.id)
         filter (where f.cidade is not null))[1]      as cidade,
      (array_agg(f.uf order by f.nome, f.id)
         filter (where f.uf is not null))[1]          as uf,
      (array_agg(f.website order by f.nome, f.id))[1] as website,
      array_agg(f.id)                                 as ids
      from filtrado f
     group by f.chave_agrupamento
  )
  select
    a.chave,
    a.nome,
    a.quantidade,
    a.representante_id,
    a.cidade,
    a.uf,
    a.website,
    (select count(*) from public.negocio n where n.organizacao_id = any(a.ids)) as negocios,
    -- Os mais recentes primeiro: é o negócio de agora que identifica o
    -- cadastro, não um de 2019.
    (select array_agg(t.titulo)
       from (select n.titulo
               from public.negocio n
              where n.organizacao_id = any(a.ids)
              order by n.criado_em desc
              limit 6) t) as titulos,

    (select count(*) from public.pessoa_organizacao po
      where po.organizacao_id = any(a.ids)) as pessoas,
    -- ⚠️ O cargo entra no rótulo SÓ quando existe e ainda não está no
    -- nome. A base veio do Pipedrive com o cargo dentro do próprio nome
    -- ("Rildo Alves Dias - Supervisor RH"), e concatenar às cegas
    -- produziria "… - Supervisor RH — Supervisor RH".
    (select array_agg(t.rotulo)
       from (select p.nome ||
                    case
                      when po.cargo is null or btrim(po.cargo) = '' then ''
                      when p.nome ilike '%' || po.cargo || '%' then ''
                      else ' · ' || po.cargo
                    end as rotulo
               from public.pessoa_organizacao po
               join public.pessoa p on p.id = po.pessoa_id
              where po.organizacao_id = any(a.ids)
              order by p.nome
              limit 8) t) as nomes_pessoas,

    (select count(*) from public.atividade at
      where at.organizacao_id = any(a.ids)) as atividades,
    (select count(*) from public.atividade at
      where at.organizacao_id = any(a.ids) and not at.concluida) as atividades_pendentes,
    -- Pendente primeiro, e dentro de cada estado a mais recente antes:
    -- numa ficha de cliente, o que se pergunta é o que falta fazer.
    (select jsonb_agg(to_jsonb(t) - 'ordem')
       from (select coalesce(nullif(btrim(at.titulo), ''), ti.nome, 'Atividade') as rotulo,
                    at.data,
                    at.concluida,
                    at.concluida as ordem
               from public.atividade at
               left join public.tipo_atividade ti on ti.id = at.tipo_id
              where at.organizacao_id = any(a.ids)
              order by at.concluida, at.data desc
              limit 6) t) as amostra_atividades
    from agrupado a
   order by a.nome
   limit limite offset deslocamento
$$;

create function public.organizacoes_do_grupo(chave_grupo text)
returns table (
  id uuid,
  nome text,
  cidade text,
  uf text,
  website text,
  negocios bigint,
  titulos text[],
  pessoas bigint,
  nomes_pessoas text[],
  atividades bigint,
  atividades_pendentes bigint,
  amostra_atividades jsonb
)
language sql
stable
set search_path = ''
as $$
  select
    o.id,
    o.nome,
    o.cidade,
    o.uf,
    o.website,
    (select count(*) from public.negocio n where n.organizacao_id = o.id) as negocios,
    (select array_agg(t.titulo)
       from (select n.titulo
               from public.negocio n
              where n.organizacao_id = o.id
              order by n.criado_em desc
              limit 6) t) as titulos,

    (select count(*) from public.pessoa_organizacao po
      where po.organizacao_id = o.id) as pessoas,
    (select array_agg(t.rotulo)
       from (select p.nome ||
                    case
                      when po.cargo is null or btrim(po.cargo) = '' then ''
                      when p.nome ilike '%' || po.cargo || '%' then ''
                      else ' · ' || po.cargo
                    end as rotulo
               from public.pessoa_organizacao po
               join public.pessoa p on p.id = po.pessoa_id
              where po.organizacao_id = o.id
              order by p.nome
              limit 8) t) as nomes_pessoas,

    (select count(*) from public.atividade at
      where at.organizacao_id = o.id) as atividades,
    (select count(*) from public.atividade at
      where at.organizacao_id = o.id and not at.concluida) as atividades_pendentes,
    (select jsonb_agg(to_jsonb(t) - 'ordem')
       from (select coalesce(nullif(btrim(at.titulo), ''), ti.nome, 'Atividade') as rotulo,
                    at.data,
                    at.concluida,
                    at.concluida as ordem
               from public.atividade at
               left join public.tipo_atividade ti on ti.id = at.tipo_id
              where at.organizacao_id = o.id
              order by at.concluida, at.data desc
              limit 6) t) as amostra_atividades
    from public.organizacao o
   where o.chave_agrupamento = chave_grupo
   order by o.nome, o.id
$$;

revoke all on function public.organizacoes_agrupadas(text, integer, integer) from anon;
revoke all on function public.organizacoes_do_grupo(text) from anon;
grant execute on function public.organizacoes_agrupadas(text, integer, integer) to authenticated;
grant execute on function public.organizacoes_do_grupo(text) to authenticated;

-- ------------------------------------------------------------
-- 4. A fusão de organizações não pode perder a UF
--
-- ⚠️ Isto NÃO é escopo esticado, é a diferença entre fundir e perder.
-- `funde_organizacao` copia para o principal o que estava vazio nele e
-- depois APAGA a duplicada. Um campo novo que a função não conheça é um
-- campo que some em silêncio na primeira fusão — o mesmo risco que a
-- D-156 registrou sobre o `on delete cascade`, por outra porta. As três
-- funções da ferramenta tratam `uf` exatamente como já tratam `cidade`:
-- a prévia mostra o que será adotado e o que será descartado, e a
-- adoção só preenche o que está vazio.
-- ------------------------------------------------------------

drop function if exists public.fusao_cadastros(text);

create function public.fusao_cadastros(chave_grupo text)
returns table (
  id         uuid,
  nome       text,
  cidade     text,
  uf         text,
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
  select o.id, o.nome, o.cidade, o.uf, o.website, o.bubble_id, o.criado_em,
         (select count(*) from public.negocio n           where n.organizacao_id = o.id),
         (select count(*) from public.pessoa_organizacao p where p.organizacao_id = o.id),
         (select count(*) from public.atividade a         where a.organizacao_id = o.id),
         (select count(*) from public.anotacao an         where an.organizacao_id = o.id)
    from public.organizacao o
   where o.chave_agrupamento = chave_grupo
   order by o.criado_em, o.id
$$;

revoke all on function public.fusao_cadastros(text) from anon;
grant execute on function public.fusao_cadastros(text) to authenticated;

create or replace function public.fusao_detalhe_cadastro(p_id uuid)
returns jsonb
language sql stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id',        o.id,
    'nome',      o.nome,
    'cidade',    o.cidade,
    'uf',        o.uf,
    'website',   o.website,
    'bubble_id', o.bubble_id,
    'criado_em', o.criado_em,

    'pessoas', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', p.id,
               'nome', p.nome,
               'cargo', po.cargo,
               'contatos', coalesce((
                 select jsonb_agg(jsonb_build_object('tipo', fc.tipo, 'valor', fc.valor))
                   from public.forma_contato fc where fc.pessoa_id = p.id), '[]'::jsonb)
             ) order by p.nome)
        from public.pessoa_organizacao po
        join public.pessoa p on p.id = po.pessoa_id
       where po.organizacao_id = o.id), '[]'::jsonb),

    -- ⚠️ Sem teto. As contagens da tela já dizem o tamanho, e um cadastro
    -- com 20 negócios é justamente aquele em que cortar a lista em 6
    -- esconderia o que decide. O maior grupo da base tem 18 cadastros e
    -- nenhum deles chega perto de um volume que pese aqui.
    'negocios', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', n.id, 'titulo', n.titulo, 'valor', n.valor,
               'status', n.status, 'etapa', e.nome, 'responsavel', u.nome,
               'criado_em', n.criado_em
             ) order by n.criado_em desc)
        from public.negocio n
        left join public.etapa e on e.id = n.etapa_id
        left join public.usuario u on u.id = n.responsavel_id
       where n.organizacao_id = o.id), '[]'::jsonb),

    'atividades', coalesce((
      select jsonb_agg(jsonb_build_object(
               'rotulo', coalesce(nullif(btrim(a.titulo), ''), ti.nome, 'Atividade'),
               'data', a.data, 'concluida', a.concluida, 'responsavel', u.nome
             ) order by a.concluida, a.data desc)
        from public.atividade a
        left join public.tipo_atividade ti on ti.id = a.tipo_id
        left join public.usuario u on u.id = a.responsavel_id
       where a.organizacao_id = o.id), '[]'::jsonb),

    'anotacoes', coalesce((
      select jsonb_agg(jsonb_build_object(
               'texto', an.texto, 'criado_em', an.criado_em, 'autor', au.nome
             ) order by an.criado_em desc)
        from public.anotacao an
        left join public.usuario au on au.id = an.autor_id
       where an.organizacao_id = o.id), '[]'::jsonb)
  )
    from public.organizacao o
   where o.id = p_id
$$;

revoke execute on function public.fusao_detalhe_cadastro(uuid) from anon;
grant execute on function public.fusao_detalhe_cadastro(uuid) to authenticated;

-- A prévia passa a declarar a UF entre o que se adota e o que se
-- descarta. ⚠️ `funde_organizacao` lê o `adota` DESTA função para gravar
-- o rastro em `fusao_organizacao`: se a UF não entrasse aqui, ela seria
-- copiada sem aparecer no histórico da fusão, e o rastro deixaria de
-- descrever o que a operação fez.
--
-- ⚠️ Para `uf` o teste é `is null`, e não `coalesce(btrim(..), '') = ''`
-- como nos campos de texto livre: a restrição `organizacao_uf_valida`
-- recusa string vazia e espaço, então nulo é o único estado de "não
-- tem".
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
        select 'uf', dupl.uf
         where princ.uf is null and dupl.uf is not null
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
        select 'uf', dupl.uf
         where princ.uf is not null and dupl.uf is not null
           and princ.uf is distinct from dupl.uf
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

-- A fusão passa a adotar a UF vazia. ⚠️ Só muda a etapa 2 ("adotar o que
-- estava vazio"); o resto é idêntico ao da D-156 e continua valendo
-- palavra por palavra — em especial a ordem, que é o que separa fundir
-- de perder: mover primeiro, apagar por último.
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
         uf        = coalesce(uf, dupl.uf),
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

revoke execute on function public.previa_fusao_organizacao(uuid, uuid) from anon;
revoke execute on function public.funde_organizacao(uuid, uuid) from anon;
grant execute on function public.previa_fusao_organizacao(uuid, uuid) to authenticated;
grant execute on function public.funde_organizacao(uuid, uuid) to authenticated;
