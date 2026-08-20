-- ============================================================
-- CRM Lure — notificacao push no celular (D-144).
--
-- ⚠️ Isto REVOGA PARTE da D-124, e a parte revogada e exatamente a que
-- dizia "sem agendador". A D-124 continua valendo para o sino: os
-- alertas seguem DERIVADOS na leitura, e nada aqui grava notificacao.
-- O que muda e que passa a existir um segundo consumidor da mesma
-- derivacao — um trabalho horario que le e empurra para o aparelho.
--
-- ⚠️ O motivo de a D-124 ter recusado agendador segue verdadeiro: um
-- trabalho que nao roda nao avisa que nao rodou. A mitigacao e que o
-- SINO nao depende dele. Se o cron morrer, o push para e o sistema
-- continua correto — perde-se a interrupcao, nao a informacao. Essa
-- assimetria e o que torna o risco aceitavel.
--
-- Duas armadilhas que este desenho existe para evitar:
--
--   1. AVALANCHE. Um push por alerta significaria 97 vibracoes no
--      primeiro disparo da Daniela. O envio e AGREGADO: um aviso por
--      pessoa por rodada, com a contagem.
--
--   2. REPETICAO ETERNA. Alerta derivado nao "acaba": as mesmas 96
--      vencidas reapareceriam de hora em hora, para sempre. Por isso
--      `notificacao_enviada`, irma de `notificacao_lida`, usando a
--      MESMA chave estavel — o que ja foi empurrado nao volta, e um
--      negocio que para de novo gera chave nova e volta a avisar.
-- ============================================================

-- ---------- 1. Aparelhos inscritos ----------
create table inscricao_push (
  id           uuid primary key default gen_random_uuid(),
  usuario_id   uuid not null references usuario(id) on delete cascade,
  -- O endpoint E a identidade da inscricao para o servico de push, e
  -- vem unico de fabrica. Unique aqui deixa o mesmo aparelho reinscrever
  -- sem duplicar: o navegador reemite o mesmo endpoint.
  endpoint     text not null unique,
  p256dh       text not null,
  auth         text not null,
  aparelho     text,
  criado_em    timestamptz not null default now(),
  ultimo_envio timestamptz
);

create index on inscricao_push (usuario_id);

comment on table inscricao_push is
  'Aparelhos que aceitaram receber push. Uma pessoa pode ter varios. '
  'Inscricao morta (410/404 do servico de push) e apagada pelo enviador.';

-- ---------- 2. O que ja foi empurrado ----------
create table notificacao_enviada (
  usuario_id uuid not null references usuario(id) on delete cascade,
  chave      text not null,
  enviado_em timestamptz not null default now(),
  primary key (usuario_id, chave)
);

comment on table notificacao_enviada is
  'Irma de notificacao_lida, com a MESMA chave estavel. Impede que um '
  'alerta derivado seja empurrado de hora em hora para sempre.';

-- ---------- Acesso ----------
alter table inscricao_push        enable row level security;
alter table notificacao_enviada   enable row level security;

-- A inscricao e do aparelho de quem esta logado, como a preferencia.
-- Mesma regra da C-05: usuario_atual(), nunca auth.uid().
create policy propria_inscricao on inscricao_push
  for all to authenticated
  using      (usuario_id = public.usuario_atual())
  with check (usuario_id = public.usuario_atual());

-- ⚠️ `notificacao_enviada` NAO GANHA POLITICA NENHUMA, e e de proposito.
-- Sem policy, com RLS ligada, nenhum papel comum le nem escreve. So o
-- enviador (service_role, que ignora RLS) toca nela. E contabilidade do
-- sistema, nao dado do usuario: se a aplicacao pudesse apagar linhas
-- daqui, um bug de tela viraria enxurrada de push repetido.
revoke all on inscricao_push      from anon;
revoke all on notificacao_enviada from anon, authenticated;
grant select, insert, update, delete on inscricao_push to authenticated;

-- ---------- 3. A derivacao, agora para um usuario qualquer ----------
-- O enviador precisa dos alertas DE TODO MUNDO, e `notificacoes()` so
-- sabe responder sobre quem esta logado. Em vez de duplicar a consulta
-- — duas copias divergem, e ai o push discorda do sino —, a logica passa
-- a morar em `notificacoes_de(uuid)` e `notificacoes()` delega.
--
-- ⚠️ `security definer` + `revoke from authenticated` andam juntos. A
-- funcao ignora RLS por necessidade; se qualquer usuario pudesse
-- chama-la com o id de outro, seria uma porta para ler a carteira
-- alheia. Só o service_role executa.
create or replace function public.notificacoes_de(p_usuario uuid)
returns table (
  tipo       public.tipo_notificacao,
  chave      text,
  titulo     text,
  detalhe    text,
  referencia timestamptz,
  destino    text,
  conta      boolean,
  lida       boolean
)
language sql stable security definer
set search_path = ''
as $$
with hoje as (
  select (now() at time zone 'America/Sao_Paulo')::date as dia
),
pref as (
  select
    t.tipo,
    coalesce(p.ativo, true) as ativo,
    coalesce(p.dias, public.padrao_notificacao(t.tipo)) as dias
  from unnest(enum_range(null::public.tipo_notificacao)) as t(tipo)
  left join public.preferencia_notificacao p
         on p.tipo = t.tipo
        and p.usuario_id = p_usuario
),
sinal as (
  select
    n.id, n.titulo, n.organizacao_id,
    greatest(
      n.criado_em,
      coalesce((select max(e.ocorrido_em) from public.evento_negocio e
                 where e.negocio_id = n.id and not e.origem_carga), n.criado_em),
      coalesce((select max(a.criado_em) from public.atividade a
                 where a.negocio_id = n.id), n.criado_em)
    ) as ultimo_sinal
  from public.negocio n
  where n.responsavel_id = p_usuario
    and n.status = 'negociacao'
    and (select ativo from pref where pref.tipo = 'negocio_parado')
),
parado as (
  select
    'negocio_parado'::public.tipo_notificacao as tipo,
    'negocio_parado:' || s.id::text || ':'
      || to_char((s.ultimo_sinal + make_interval(days => d.dias))::date, 'YYYY-MM-DD') as chave,
    s.titulo as titulo,
    o.nome || ' · sem movimento há '
      || extract(day from now() - s.ultimo_sinal)::integer::text || ' dias' as detalhe,
    s.ultimo_sinal as referencia,
    '/negocios/' || s.id::text as destino,
    true as conta
  from sinal s
  join public.organizacao o on o.id = s.organizacao_id
  cross join (select dias from pref where tipo = 'negocio_parado') d
  where s.ultimo_sinal < now() - make_interval(days => d.dias)
),
vencida as (
  select
    'atividade_vencida'::public.tipo_notificacao as tipo,
    'atividade_vencida:' || a.id::text || ':' || to_char(a.data, 'YYYY-MM-DD') as chave,
    coalesce(nullif(btrim(a.titulo), ''), t.nome, 'Atividade sem título') as titulo,
    'venceu em ' || to_char(a.data, 'DD/MM/YYYY')
      || ' · há ' || ((select dia from hoje) - a.data)::text || ' dias' as detalhe,
    a.data::timestamptz as referencia,
    '/atividades?vista=vencidas' as destino,
    true as conta
  from public.atividade a
  left join public.tipo_atividade t on t.id = a.tipo_id
  where a.responsavel_id = p_usuario
    and not a.concluida
    and a.data < (select dia from hoje)
    and (select ativo from pref where pref.tipo = 'atividade_vencida')
),
proxima as (
  select
    'lembrete_atividade'::public.tipo_notificacao as tipo,
    'lembrete_atividade:' || a.id::text || ':' || to_char(a.data, 'YYYY-MM-DD') as chave,
    coalesce(nullif(btrim(a.titulo), ''), t.nome, 'Atividade sem título') as titulo,
    case
      when a.data = (select dia from hoje)     then 'hoje'
      when a.data = (select dia from hoje) + 1 then 'amanhã'
      else 'em ' || (a.data - (select dia from hoje))::text || ' dias'
    end
    || case
         when a.hora_inicio is null then ''
         else ', às ' || to_char(a.hora_inicio, 'HH24:MI')
       end as detalhe,
    a.data::timestamptz as referencia,
    '/atividades?dia=' || to_char(a.data, 'YYYY-MM-DD') as destino,
    false as conta
  from public.atividade a
  left join public.tipo_atividade t on t.id = a.tipo_id
  cross join (select dias from pref where tipo = 'lembrete_atividade') d
  where a.responsavel_id = p_usuario
    and not a.concluida
    and a.data >= (select dia from hoje)
    and a.data <= (select dia from hoje) + d.dias
    and (select ativo from pref where pref.tipo = 'lembrete_atividade')
),
tudo as (
  select * from parado
  union all select * from vencida
  union all select * from proxima
)
select
  tudo.tipo, tudo.chave, tudo.titulo, tudo.detalhe,
  tudo.referencia, tudo.destino, tudo.conta,
  (l.chave is not null) as lida
from tudo
left join public.notificacao_lida l
       on l.usuario_id = p_usuario
      and l.chave = tudo.chave
order by tudo.tipo, tudo.referencia
$$;

revoke execute on function public.notificacoes_de(uuid) from public, anon, authenticated;
grant  execute on function public.notificacoes_de(uuid) to service_role;

-- ---------- 4. `notificacoes()` passa a delegar ----------
-- Uma copia so da regra. Se um dia o push e o sino discordarem, sera por
-- dado diferente e nunca por consulta diferente.
--
-- ⚠️ Ela TAMBEM vira `security definer`, e nao por preferencia: o
-- privilegio de executar uma funcao e conferido contra o usuario
-- CORRENTE. Como `notificacoes_de` esta revogada para `authenticated`,
-- uma `notificacoes()` invoker bateria em "permission denied for
-- function notificacoes_de" — a chamada de dentro roda como quem
-- chamou, nao como a dona. Definer troca o usuario corrente pela dona
-- durante a execucao, e so entao a delegacao passa.
--
-- ⚠️ Isso NAO abre nada: o argumento nao vem da tela, vem de
-- `usuario_atual()`, que resolve pela sessao. Ninguem consegue pedir a
-- caixa de outro porque nao ha onde escrever o id.
create or replace function public.notificacoes()
returns table (
  tipo       public.tipo_notificacao,
  chave      text,
  titulo     text,
  detalhe    text,
  referencia timestamptz,
  destino    text,
  conta      boolean,
  lida       boolean
)
language sql stable security definer
set search_path = ''
as $$
  select * from public.notificacoes_de(public.usuario_atual())
$$;

revoke execute on function public.notificacoes() from anon;
grant  execute on function public.notificacoes() to authenticated;
