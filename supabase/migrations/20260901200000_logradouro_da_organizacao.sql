-- ============================================================
-- CRM Lure — o logradouro, para os poucos que têm.
--
-- ⚠️ A D-160 mediu e concluiu certo: **840 dos 864 endereços do
-- Pipedrive (97,2%) são literalmente "Cidade, UF, Brasil"**, e os 56
-- CEPs de lá são de MUNICÍPIO (todos terminam em `-000`), não de rua.
-- Não existe cadastro postal naquela base, e por isso não entram sete
-- campos de logradouro/número/bairro/complemento/CEP.
--
-- ⚠️ O que a D-160 deixou passar: **24 cadastros têm endereço digitado à
-- MÃO no campo de texto livre**, fora do formato do autocompletar, e 13
-- deles trazem rua e número de verdade:
--
--     "R. 3, Qd. 19 - Lt. 11, Nº 389 - Vila Abajá, Goiânia - GO, 74550-460"
--     "R. 86, 445 - St. Sul, Goiânia - GO, 74083-385"
--
-- Esse texto nunca chegou ao banco: a carga leu só `address_locality`, e
-- a recuperação da D-160 só reconhecia a forma "Cidade, UF". Resultado
-- medido: **12 desses 24 estão hoje sem cidade nenhuma** e 10 com metade
-- — embora a cidade esteja escrita, legível, no texto de origem.
--
-- ⚠️ UMA coluna de texto, e não um formulário de endereço. O conteúdo
-- que existe é uma linha escrita por uma pessoa, com quadra, lote e
-- fazenda no meio ("Av. Anápolis, Qd. 00 Lt. 02 Fazenda Planície
-- Petrópolis"). Espremer isso em campos separados obrigaria a inventar
-- onde cada pedaço mora, e treze cadastros não justificam um formulário
-- que 2.890 deixariam vazio. A cidade e a UF continuam estruturadas,
-- porque são elas que filtram e agrupam (D-161); o logradouro é texto
-- porque só serve para ser lido.
--
-- ⚠️ `endereco` guarda SÓ o que a cidade e a UF não dizem. Repetir
-- "Goiânia, GO" aqui em 840 cadastros seria encher a ficha de eco. Quem
-- preenche essa regra é `scripts/recupera-enderecos.mjs`.
-- ============================================================

alter table organizacao add column endereco text;

comment on column organizacao.endereco is
  'Logradouro, número, bairro e complemento, em texto livre, como a pessoa escreveu. NÃO repete cidade nem UF, que têm colunas próprias. Nulo na esmagadora maioria: a base de origem tem 13 cadastros com rua.';

-- O `btrim` que a tela e o script assumem: campo com um espaço dentro
-- responde "sim" a `coalesce(btrim(...), '') = ''`, que é a pergunta que
-- a ferramenta de fusão faz em quatro lugares.
alter table organizacao
  add constraint organizacao_endereco_nao_vazio
  check (endereco is null or btrim(endereco) <> '');

-- ------------------------------------------------------------
-- A fusão precisa conhecer o campo novo
--
-- ⚠️ Mesma razão da D-160, e é a segunda vez que este arquivo a repete
-- porque é a que apaga dado em silêncio: `funde_organizacao` adota o que
-- está vazio no principal e depois APAGA a duplicada. Campo que ela não
-- conhece some sem erro na primeira fusão.
-- ------------------------------------------------------------

drop function if exists public.fusao_cadastros(text);

create function public.fusao_cadastros(chave_grupo text)
returns table (
  id         uuid,
  nome       text,
  cidade     text,
  uf         text,
  endereco   text,
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
  select o.id, o.nome, o.cidade, o.uf, o.endereco, o.website, o.bubble_id, o.criado_em,
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
    'endereco',  o.endereco,
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
    -- esconderia o que decide.
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

-- A prévia e a fusão: `endereco` entra como os demais campos de texto.
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
        select 'endereco', dupl.endereco
         where coalesce(btrim(princ.endereco), '') = '' and coalesce(btrim(dupl.endereco), '') <> ''
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
        select 'endereco', dupl.endereco
         where coalesce(btrim(princ.endereco), '') <> '' and coalesce(btrim(dupl.endereco), '') <> ''
           and btrim(princ.endereco) is distinct from btrim(dupl.endereco)
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

  select * into princ from public.organizacao where id = p_principal for update;
  select * into dupl  from public.organizacao where id = p_duplicada for update;
  if princ.id is null or dupl.id is null then
    raise exception 'Organização não encontrada.';
  end if;

  adotados := (public.previa_fusao_organizacao(p_principal, p_duplicada)) -> 'adota';

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
         endereco  = coalesce(nullif(btrim(endereco), ''), nullif(btrim(dupl.endereco), '')),
         website   = coalesce(nullif(btrim(website), ''), nullif(btrim(dupl.website), '')),
         bubble_id = coalesce(nullif(btrim(bubble_id), ''), nullif(btrim(dupl.bubble_id), ''))
   where id = princ.id;

  -- ---------- 3. o rastro, ANTES de apagar ----------
  insert into public.fusao_organizacao
    (principal_id, duplicada_id, duplicada_nome, movidos, adotados, autor_id)
  values (princ.id, dupl.id, dupl.nome, movidos, adotados, public.usuario_atual());

  -- ---------- 4. apagar, por último ----------
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
