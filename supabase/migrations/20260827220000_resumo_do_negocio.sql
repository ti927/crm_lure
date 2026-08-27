-- ============================================================
-- CRM Lure — resumo do negócio, para a prévia em pop-up.
--
-- A ficha completa (`/negocios/[id]`) faz **onze** idas ao banco: o
-- negócio, seis listas de opções para os campos editáveis, mais eventos,
-- anotações, atividades e pessoas. Isso é correto para uma tela onde se
-- EDITA — mas para analisar um negócio e passar ao próximo, é peso que
-- não se paga.
--
-- ⚠️ Esta função devolve tudo numa ida só. A restrição real deste
-- sistema não é custo de consulta, é **número de viagens ao pooler**
-- (~150 ms cada) — a mesma medição que fez os quatro alertas do sino
-- saírem de uma função só (Doc 15 §2.1).
--
-- ⚠️ Ela é de LEITURA e não traz as listas de opções: quem só olha não
-- precisa da lista de etapas para escolher, e é justamente esse peso que
-- a prévia existe para não pagar. Editar continua sendo na ficha.
--
-- ⚠️ `security invoker` (o padrão): a RLS continua valendo em todas as
-- tabelas envolvidas.
-- ============================================================

create or replace function public.negocio_resumo(p_id uuid)
returns jsonb
language sql stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id',            n.id,
    'titulo',        n.titulo,
    'valor',         n.valor,
    'status',        n.status,
    'criado_em',     n.criado_em,
    'fechado_em',    n.fechado_em,
    'organizacao',   case when o.id is null then null
                          else jsonb_build_object('id', o.id, 'nome', o.nome, 'cidade', o.cidade) end,
    'etapa',         case when e.id is null then null
                          else jsonb_build_object('nome', e.nome, 'ordem', e.ordem) end,
    'responsavel',   case when u.id is null then null
                          else jsonb_build_object('nome', u.nome, 'foto_url', u.foto_url) end,
    'origem',        og.nome,
    'produto',       pr.nome,
    'motivo_perda',  mp.nome,

    -- As pessoas do negócio, com o telefone e o e-mail que a análise
    -- costuma procurar. O cargo vem do vínculo com a organização (D-036),
    -- e não da pessoa.
    'pessoas', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', p.id, 'nome', p.nome,
               'cargo', (select po.cargo from public.pessoa_organizacao po
                          where po.pessoa_id = p.id and po.organizacao_id = n.organizacao_id),
               'contatos', coalesce((
                 select jsonb_agg(jsonb_build_object('tipo', fc.tipo, 'valor', fc.valor))
                   from public.forma_contato fc where fc.pessoa_id = p.id), '[]'::jsonb)
             ) order by p.nome)
        from public.negocio_pessoa np
        join public.pessoa p on p.id = np.pessoa_id
       where np.negocio_id = n.id), '[]'::jsonb),

    -- ⚠️ Pendente primeiro, e só as seis mais próximas: numa prévia a
    -- pergunta é o que falta fazer, não o histórico inteiro.
    'atividades', coalesce((
      select jsonb_agg(to_jsonb(t) - 'ordem') from (
        select coalesce(nullif(btrim(a.titulo), ''), ti.nome, 'Atividade') as rotulo,
               a.data, a.concluida, a.concluida as ordem
          from public.atividade a
          left join public.tipo_atividade ti on ti.id = a.tipo_id
         where a.negocio_id = n.id
         order by a.concluida, a.data desc
         limit 6) t), '[]'::jsonb),

    'anotacoes', coalesce((
      select jsonb_agg(to_jsonb(t)) from (
        select an.texto, an.criado_em, au.nome as autor
          from public.anotacao an
          left join public.usuario au on au.id = an.autor_id
         where an.negocio_id = n.id
         order by an.criado_em desc
         limit 3) t), '[]'::jsonb),

    'total_atividades', (select count(*) from public.atividade a where a.negocio_id = n.id),
    'total_anotacoes',  (select count(*) from public.anotacao an where an.negocio_id = n.id),

    -- ⚠️ `not origem_carga` — os eventos sintéticos da carga ficam de
    -- fora, mas o histórico IMPORTADO do Pipedrive entra (D-129): são
    -- 3.406 eventos reais de 2021 a 2026, e sem eles a prévia de um
    -- negócio antigo pareceria não ter história nenhuma.
    'eventos', coalesce((
      select jsonb_agg(to_jsonb(t)) from (
        select ev.tipo, ev.valor_anterior, ev.valor_novo, ev.ocorrido_em,
               ev.importado_do_pipedrive, au.nome as autor
          from public.evento_negocio ev
          left join public.usuario au on au.id = ev.autor_id
         where ev.negocio_id = n.id and not ev.origem_carga
         order by ev.ocorrido_em desc
         limit 6) t), '[]'::jsonb)
  )
    from public.negocio n
    left join public.organizacao  o  on o.id  = n.organizacao_id
    left join public.etapa        e  on e.id  = n.etapa_id
    left join public.usuario      u  on u.id  = n.responsavel_id
    left join public.origem       og on og.id = n.origem_id
    left join public.produto      pr on pr.id = n.produto_id
    left join public.motivo_perda mp on mp.id = n.motivo_perda_id
   where n.id = p_id
$$;

revoke execute on function public.negocio_resumo(uuid) from anon;
grant execute on function public.negocio_resumo(uuid) to authenticated;
