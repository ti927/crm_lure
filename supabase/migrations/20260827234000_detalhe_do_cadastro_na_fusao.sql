-- ============================================================
-- CRM Lure — o cadastro inteiro, para decidir a fusão sem sair da tela.
--
-- A ferramenta de fusão mostra as quatro CONTAGENS de cada cadastro, e
-- elas bastam para escolher qual sobrevive. Não bastam para a pergunta
-- que de fato importa antes de apertar o botão: **é a mesma empresa?**
-- Para isso é preciso ver os nomes — quais pessoas, quais negócios,
-- quais atividades.
--
-- ⚠️ Hoje isso custa abrir a ficha da organização em outra aba, ler,
-- voltar, e repetir para cada um dos 18 cadastros de "Amaral Group". A
-- operação não tem desfazer, então o custo de conferir é exatamente o
-- que não se pode cobrar caro — senão se confere menos.
--
-- ⚠️ Uma ida ao banco, como a `negocio_resumo`: a restrição deste
-- sistema é número de viagens ao pooler (~150 ms cada), não custo de
-- consulta.
--
-- ⚠️ `security invoker` (o padrão): a RLS continua valendo. Esta função
-- é de LEITURA e não verifica `sou_desenvolvedor` — quem funde é
-- `funde_organizacao`, e a trava mora lá.
-- ============================================================

create or replace function public.fusao_detalhe_cadastro(p_id uuid)
returns jsonb
language sql stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id',        o.id,
    'nome',      o.nome,
    'cidade',    o.cidade,
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
