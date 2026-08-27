-- ============================================================
-- CRM Lure — o resumo do negócio passa a devolver NOMES nos eventos.
--
-- ⚠️ Acerto da migração anterior, que subiu minutos antes: `evento_negocio`
-- guarda `valor_anterior`/`valor_novo` como TEXTO, e para os tipos `etapa`
-- e `responsavel` esse texto é um uuid. A prévia mostraria
-- "de 4a67528f-… para 29f0271d-…", que não é informação — é ruído com
-- cara de dado.
--
-- Vai num arquivo novo, e não editando o anterior, porque aquele já foi
-- aplicado: migração aplicada não se reescreve, senão o repositório
-- deixa de descrever o banco (regra 1).
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
    -- fora, mas o histórico IMPORTADO do Pipedrive entra (D-129): 3.406
    -- eventos reais de 2021 a 2026. Sem eles, a prévia de um negócio
    -- antigo pareceria não ter história nenhuma.
    --
    -- ⚠️ `nullif(...,'')::uuid` antes de resolver: o valor é texto, e um
    -- evento pode ter lado vazio (etapa que era nula). Converter direto
    -- levantaria erro e derrubaria a prévia inteira por causa de um
    -- evento.
    'eventos', coalesce((
      select jsonb_agg(to_jsonb(t)) from (
        select ev.tipo,
               case ev.tipo
                 when 'etapa' then (select x.nome from public.etapa x
                                     where x.id = nullif(ev.valor_anterior, '')::uuid)
                 when 'responsavel' then (select x.nome from public.usuario x
                                           where x.id = nullif(ev.valor_anterior, '')::uuid)
                 else ev.valor_anterior
               end as de,
               case ev.tipo
                 when 'etapa' then (select x.nome from public.etapa x
                                     where x.id = nullif(ev.valor_novo, '')::uuid)
                 when 'responsavel' then (select x.nome from public.usuario x
                                           where x.id = nullif(ev.valor_novo, '')::uuid)
                 else ev.valor_novo
               end as para,
               ev.ocorrido_em,
               ev.importado_do_pipedrive,
               au.nome as autor
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
