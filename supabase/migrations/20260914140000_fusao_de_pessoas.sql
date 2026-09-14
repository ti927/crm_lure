-- ============================================================
-- CRM Lure — fundir pessoas com exatamente o mesmo nome.
--
-- Pedido do maestro: "coloque a opcao de fundir pessoas com exatamente o
-- mesmo nome em organizacoes". A ferramenta ganha uma segunda aba, ao
-- lado da de organizacoes, e o desenho inteiro e o da D-156/D-164 — o
-- que muda e a entidade.
--
-- O tamanho do problema, medido: **625 grupos, 1.963 cadastros** de
-- pessoas com nome identico, de 4.606. E 43% da base de contatos —
-- proporcao parecida com os 41% de organizacoes que a D-121 achou.
--
-- ⚠️ AS CINCO CHAVES PARA `pessoa` SAO `on delete cascade`:
-- `pessoa_organizacao`, `forma_contato`, `negocio_pessoa`,
-- `atividade.pessoa_id` e `anotacao.pessoa_id`. Apagar a duplicada antes
-- de mover nao "perde o vinculo": apaga o telefone, o e-mail, a ligacao
-- com o negocio e a atividade junto, em silencio. E a mesma armadilha
-- que a D-156 registrou nas organizacoes, e aqui ela tem CINCO portas em
-- vez de tres. **Mover primeiro, apagar por ultimo** nao e estilo.
--
-- ⚠️ NOME IDENTICO, E NAO PARECIDO. O agrupamento sai de `nome_busca` —
-- a coluna gerada da migration 20260914120000 —, entao "Jose Carlos" e
-- "JOSE CARLOS" caem no mesmo grupo e "Jose Carlos" e "Jose Carlos
-- Pereira" nao. Fusao e operacao sem desfazer; parecenca nao e evidencia
-- suficiente para oferece-la.
--
-- ⚠️ `pessoa` NAO TEM O QUE ADOTAR. Diferente de `organizacao`, onde a
-- fusao preenche cidade, UF e website vazios, a tabela `pessoa` guarda
-- so o nome. Tudo que importa de uma pessoa vive nas tabelas ligadas —
-- e e por isso que aqui a fusao e quase toda movimento, com deduplicacao
-- em tres lugares:
--   · `pessoa_organizacao` tem chave (pessoa_id, organizacao_id), entao
--     o principal adota o CARGO que so a duplicada tinha antes de mover
--   · `negocio_pessoa` tem chave (negocio_id, pessoa_id) — `on conflict`
--   · `forma_contato` NAO tem chave nenhuma, entao o mesmo telefone
--     entraria duas vezes; a limpeza e explicita, por (tipo, valor)
--
-- ⚠️ A TRAVA E NO BANCO, nao na tela: `pertence_ao_dominio()`, como a
-- D-164 deixou para as organizacoes. E o `insert` do rastro mora DENTRO
-- da funcao — liberar uma sem liberar a politica da outra faria a fusao
-- passar e a transacao inteira cair com erro de politica que ninguem
-- liga a causa. A politica de `fusao_pessoa` entra junto, por isso.
-- ============================================================

-- ---------- rastro ----------
create table if not exists fusao_pessoa (
  id             uuid primary key default gen_random_uuid(),
  principal_id   uuid not null references pessoa(id),
  -- Sem FK: a duplicada deixa de existir no fim da operacao.
  duplicada_id   uuid not null,
  duplicada_nome text not null,
  movidos        jsonb not null,
  autor_id       uuid references usuario(id),
  criado_em      timestamptz not null default now()
);

alter table fusao_pessoa enable row level security;

drop policy if exists fusao_pessoa_leitura on fusao_pessoa;
create policy fusao_pessoa_leitura on fusao_pessoa
  for select using (public.pertence_ao_dominio());

drop policy if exists fusao_pessoa_escrita on fusao_pessoa;
create policy fusao_pessoa_escrita on fusao_pessoa
  for insert with check (public.pertence_ao_dominio());

comment on table fusao_pessoa is
  'Rastro das fusoes de pessoa. Guarda os IDS do que se moveu — e nao so contagens — porque e o unico caminho de volta de uma operacao sem desfazer.';

-- ---------- 1. os grupos ----------
create or replace function public.fusao_grupos_pessoa(
  p_termo        text    default null,
  p_limite       integer default 25,
  p_deslocamento integer default 0
)
returns table (
  chave      text,
  nome       text,
  quantidade bigint,
  contatos   bigint,
  vinculos   bigint,
  negocios   bigint,
  atividades bigint
)
language sql stable
set search_path = ''
as $$
  with alvo as (
    select public.sem_acento(lower(nullif(btrim(coalesce(p_termo, '')), ''))) as termo
  ),
  grupos as (
    select p.nome_busca as chave,
           -- O nome como aparece: o mais longo entre os iguais, que e o
           -- que costuma trazer o acento escrito.
           (array_agg(p.nome order by length(p.nome) desc, p.nome))[1] as nome,
           count(*) as quantidade
      from public.pessoa p
     cross join alvo
     where p.nome_busca is not null
       and (alvo.termo is null or p.nome_busca like '%' || alvo.termo || '%')
     group by p.nome_busca
    having count(*) > 1
  )
  select g.chave, g.nome, g.quantidade,
         (select count(*) from public.forma_contato f
           join public.pessoa p on p.id = f.pessoa_id where p.nome_busca = g.chave),
         (select count(*) from public.pessoa_organizacao po
           join public.pessoa p on p.id = po.pessoa_id where p.nome_busca = g.chave),
         (select count(*) from public.negocio_pessoa np
           join public.pessoa p on p.id = np.pessoa_id where p.nome_busca = g.chave),
         (select count(*) from public.atividade a
           join public.pessoa p on p.id = a.pessoa_id where p.nome_busca = g.chave)
    from grupos g
   order by g.quantidade desc, g.nome
  offset greatest(0, coalesce(p_deslocamento, 0))
   limit greatest(1, least(coalesce(p_limite, 25), 100))
$$;

create or replace function public.fusao_conta_grupos_pessoa(p_termo text default null)
returns bigint
language sql stable
set search_path = ''
as $$
  with alvo as (
    select public.sem_acento(lower(nullif(btrim(coalesce(p_termo, '')), ''))) as termo
  )
  select count(*) from (
    select 1
      from public.pessoa p
     cross join alvo
     where p.nome_busca is not null
       and (alvo.termo is null or p.nome_busca like '%' || alvo.termo || '%')
     group by p.nome_busca
    having count(*) > 1
  ) x
$$;

-- ---------- 2. os cadastros de um grupo ----------
-- ⚠️ Com NOMES, e nao so contagens. A pergunta que decide a fusao e "e a
-- mesma pessoa?", e contagem nao responde isso — e a licao da D-159.
create or replace function public.fusao_cadastros_pessoa(p_chave text)
returns table (
  id           uuid,
  nome         text,
  criado_em    timestamptz,
  contatos     text[],
  organizacoes text[],
  negocios     text[],
  atividades   bigint,
  anotacoes    bigint,
  peso         bigint
)
language sql stable
set search_path = ''
as $$
  select p.id, p.nome, p.criado_em,
         coalesce((select array_agg(f.valor order by f.tipo, f.valor)
                     from public.forma_contato f where f.pessoa_id = p.id), '{}'),
         coalesce((select array_agg(distinct o.nome)
                     from public.pessoa_organizacao po
                     join public.organizacao o on o.id = po.organizacao_id
                    where po.pessoa_id = p.id), '{}'),
         coalesce((select array_agg(n.titulo order by n.criado_em desc)
                     from public.negocio_pessoa np
                     join public.negocio n on n.id = np.negocio_id
                    where np.pessoa_id = p.id), '{}'),
         (select count(*) from public.atividade a where a.pessoa_id = p.id),
         (select count(*) from public.anotacao an where an.pessoa_id = p.id),
         -- Quem carrega mais historia e o candidato natural a principal.
         (select count(*) from public.forma_contato f where f.pessoa_id = p.id)
         + (select count(*) from public.pessoa_organizacao po where po.pessoa_id = p.id)
         + (select count(*) from public.negocio_pessoa np where np.pessoa_id = p.id)
         + (select count(*) from public.atividade a where a.pessoa_id = p.id)
         + (select count(*) from public.anotacao an where an.pessoa_id = p.id)
    from public.pessoa p
   where p.nome_busca = p_chave
   order by 9 desc, p.criado_em
$$;

-- ---------- 3. a previa ----------
create or replace function public.previa_fusao_pessoa(
  p_principal uuid,
  p_duplicada uuid
)
returns jsonb
language sql stable
set search_path = ''
as $$
  select jsonb_build_object(
    'principal', (select nome from public.pessoa where id = p_principal),
    'duplicada', (select nome from public.pessoa where id = p_duplicada),
    'move', jsonb_build_object(
      'contatos',   (select count(*) from public.forma_contato where pessoa_id = p_duplicada),
      'vinculos',   (select count(*) from public.pessoa_organizacao where pessoa_id = p_duplicada),
      'negocios',   (select count(*) from public.negocio_pessoa where pessoa_id = p_duplicada),
      'atividades', (select count(*) from public.atividade where pessoa_id = p_duplicada),
      'anotacoes',  (select count(*) from public.anotacao where pessoa_id = p_duplicada)
    ),
    -- ⚠️ O que o principal JA TEM e por isso nao vai duplicar. Sem este
    -- numero, "move 3 contatos" e a ficha ficar com 3 (e nao 6) pareceria
    -- a fusao ter perdido dados.
    'repetidos', jsonb_build_object(
      'contatos', (select count(*) from public.forma_contato d
                    where d.pessoa_id = p_duplicada
                      and exists (select 1 from public.forma_contato x
                                   where x.pessoa_id = p_principal
                                     and x.tipo = d.tipo and x.valor = d.valor)),
      'vinculos', (select count(*) from public.pessoa_organizacao d
                    where d.pessoa_id = p_duplicada
                      and exists (select 1 from public.pessoa_organizacao x
                                   where x.pessoa_id = p_principal
                                     and x.organizacao_id = d.organizacao_id)),
      'negocios', (select count(*) from public.negocio_pessoa d
                    where d.pessoa_id = p_duplicada
                      and exists (select 1 from public.negocio_pessoa x
                                   where x.pessoa_id = p_principal
                                     and x.negocio_id = d.negocio_id))
    )
  )
$$;

-- ---------- 4. a fusao ----------
create or replace function public.funde_pessoa(
  p_principal uuid,
  p_duplicada uuid
)
returns jsonb
language plpgsql volatile
set search_path = ''
as $$
declare
  princ   public.pessoa%rowtype;
  dupl    public.pessoa%rowtype;
  movidos jsonb;
begin
  -- ⚠️ A trava e AQUI, e nao na tela. Esconder o botao nao impede a
  -- chamada; recusar na funcao impede (D-164).
  if not public.pertence_ao_dominio() then
    raise exception 'Sem permissao para fundir contatos.'
      using errcode = 'insufficient_privilege';
  end if;

  if p_principal = p_duplicada then
    raise exception 'A pessoa principal e a duplicada sao a mesma.';
  end if;

  -- `for update`: duas fusoes simultaneas sobre o mesmo grupo poderiam
  -- mover linhas para um cadastro que a outra esta apagando.
  select * into princ from public.pessoa where id = p_principal for update;
  select * into dupl  from public.pessoa where id = p_duplicada for update;
  if princ.id is null or dupl.id is null then
    raise exception 'Pessoa nao encontrada.';
  end if;

  -- ---------- os ids, ANTES de mover ----------
  -- Depois do update eles ja pertencem ao principal, e nao haveria como
  -- distinguir o que veio desta fusao do que ja estava la.
  movidos := jsonb_build_object(
    'contatos',     coalesce((select jsonb_agg(f.id) from public.forma_contato f
                               where f.pessoa_id = dupl.id), '[]'::jsonb),
    'organizacoes', coalesce((select jsonb_agg(po.organizacao_id) from public.pessoa_organizacao po
                               where po.pessoa_id = dupl.id), '[]'::jsonb),
    'negocios',     coalesce((select jsonb_agg(np.negocio_id) from public.negocio_pessoa np
                               where np.pessoa_id = dupl.id), '[]'::jsonb),
    'atividades',   coalesce((select jsonb_agg(a.id) from public.atividade a
                               where a.pessoa_id = dupl.id), '[]'::jsonb),
    'anotacoes',    coalesce((select jsonb_agg(an.id) from public.anotacao an
                               where an.pessoa_id = dupl.id), '[]'::jsonb)
  );

  -- ---------- 1. MOVER (sempre antes de apagar) ----------

  -- Vinculo com organizacao: chave (pessoa_id, organizacao_id). O
  -- principal adota o CARGO que so a duplicada tinha — senao ele some
  -- junto com a linha, que e o mesmo cuidado da fusao de organizacoes.
  update public.pessoa_organizacao pp
     set cargo = pd.cargo
    from public.pessoa_organizacao pd
   where pp.pessoa_id = princ.id
     and pd.pessoa_id = dupl.id
     and pd.organizacao_id = pp.organizacao_id
     and coalesce(btrim(pp.cargo), '') = ''
     and coalesce(btrim(pd.cargo), '') <> '';

  insert into public.pessoa_organizacao (pessoa_id, organizacao_id, cargo)
  select princ.id, pd.organizacao_id, pd.cargo
    from public.pessoa_organizacao pd
   where pd.pessoa_id = dupl.id
  on conflict (pessoa_id, organizacao_id) do nothing;

  delete from public.pessoa_organizacao where pessoa_id = dupl.id;

  -- Negocio: chave (negocio_id, pessoa_id).
  insert into public.negocio_pessoa (negocio_id, pessoa_id)
  select nd.negocio_id, princ.id
    from public.negocio_pessoa nd
   where nd.pessoa_id = dupl.id
  on conflict (negocio_id, pessoa_id) do nothing;

  delete from public.negocio_pessoa where pessoa_id = dupl.id;

  -- ⚠️ `forma_contato` NAO tem chave unica: um `update` cego deixaria o
  -- mesmo telefone duas vezes na ficha. Descarta o que o principal ja
  -- tem e move o resto.
  delete from public.forma_contato d
   where d.pessoa_id = dupl.id
     and exists (select 1 from public.forma_contato x
                  where x.pessoa_id = princ.id
                    and x.tipo = d.tipo and x.valor = d.valor);

  update public.forma_contato set pessoa_id = princ.id where pessoa_id = dupl.id;

  -- Atividade e anotacao: vinculo simples, sem chave composta.
  update public.atividade set pessoa_id = princ.id where pessoa_id = dupl.id;
  update public.anotacao   set pessoa_id = princ.id where pessoa_id = dupl.id;

  -- ---------- 2. rastro, ANTES de apagar ----------
  insert into public.fusao_pessoa
    (principal_id, duplicada_id, duplicada_nome, movidos, autor_id)
  values
    (princ.id, dupl.id, dupl.nome, movidos, public.usuario_atual());

  -- ---------- 3. APAGAR, por ultimo ----------
  delete from public.pessoa where id = dupl.id;

  return jsonb_build_object('ok', true, 'movidos', movidos);
end;
$$;

revoke all on function public.fusao_grupos_pessoa(text, integer, integer) from anon;
revoke all on function public.fusao_conta_grupos_pessoa(text) from anon;
revoke all on function public.fusao_cadastros_pessoa(text) from anon;
revoke all on function public.previa_fusao_pessoa(uuid, uuid) from anon;
revoke all on function public.funde_pessoa(uuid, uuid) from anon;

grant execute on function public.fusao_grupos_pessoa(text, integer, integer) to authenticated;
grant execute on function public.fusao_conta_grupos_pessoa(text) to authenticated;
grant execute on function public.fusao_cadastros_pessoa(text) to authenticated;
grant execute on function public.previa_fusao_pessoa(uuid, uuid) to authenticated;
grant execute on function public.funde_pessoa(uuid, uuid) to authenticated;
