-- ============================================================
-- CRM Lure — a fusão de duplicadas deixa de ser ferramenta de
-- desenvolvedor e passa a valer para todo o domínio.
--
-- ⚠️ **Isto revoga a restrição da D-156**, não a decisão inteira. A D-156
-- abriu a mesclagem — que o MVP proibia e a D-121 tinha deixado como
-- apresentação apenas — e a trancou em duas pessoas "enquanto a base é
-- limpa". Por decisão explícita do maestro, a tranca sai: são 668 grupos
-- e 1.204 cadastros, e quem sabe se "Sicoob Credseguro" das seis é a
-- mesma empresa é quem atende a conta, não quem escreveu o código.
--
-- ⚠️ **O que NÃO muda, e é o que segurava o risco:** a operação continua
-- sendo uma duplicada por vez, continua exigindo a prévia antes, continua
-- gravando em `fusao_organizacao` os IDS de tudo que se moveu — e continua
-- movendo primeiro e apagando por último, que é a diferença entre fundir
-- e perder (três tabelas têm `on delete cascade` para `organizacao`).
-- Abrir para todos aumenta quem pode errar; não aumenta o que um erro
-- destrói, e não apaga o rastro de quem o cometeu.
--
-- ⚠️ **`sou_desenvolvedor()` e a coluna `usuario.desenvolvedor` FICAM.**
-- Não custam nada e existe uso futuro para elas; derrubá-las agora só
-- criaria trabalho para recriá-las. O que sai é a comparação dentro de
-- `funde_organizacao` e a política de escrita do rastro.
-- ============================================================

-- ------------------------------------------------------------
-- 1. O rastro passa a aceitar escrita de qualquer um do domínio
--
-- ⚠️ Sem esta troca a fusão passaria e o rastro falharia — e como o
-- `insert` do rastro está dentro da função, a transação inteira seria
-- desfeita. A tela mostraria "nova violação de política" e ninguém
-- entenderia por quê. Trocar a política da função sem trocar esta seria
-- abrir a porta e deixar a corrente.
-- ------------------------------------------------------------

drop policy if exists fusao_escrita_por_desenvolvedor on fusao_organizacao;

create policy fusao_escrita_por_dominio on fusao_organizacao
  for insert to authenticated
  with check (public.pertence_ao_dominio());

-- ------------------------------------------------------------
-- 2. A função
--
-- Reproduzida por inteiro, e não corrigida por pedaço: `create or
-- replace function` substitui o corpo todo, e um corpo parcial apagaria
-- o resto. O texto abaixo é o da 20260901200000 — que já conhece `uf` e
-- `endereco` — com a checagem de desenvolvedor trocada pela de domínio.
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
  -- ⚠️ A trava continua sendo AQUI, e não na tela. O que mudou é o
  -- tamanho dela: era `sou_desenvolvedor()`, virou o domínio. Esconder
  -- o botão nunca impediu a chamada; recusar na função impede.
  if not public.pertence_ao_dominio() then
    raise exception 'Sem permissão para fundir organizações.'
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
  -- ⚠️ Campo novo em `organizacao` entra AQUI, na prévia e no descarte —
  -- os três. O que a fusão não conhece some em silêncio quando a
  -- duplicada é apagada.
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

revoke execute on function public.funde_organizacao(uuid, uuid) from anon;
grant execute on function public.funde_organizacao(uuid, uuid) to authenticated;
