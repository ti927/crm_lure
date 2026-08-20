-- ============================================================
-- CRM Lure — central de notificações (F8).
-- Doc 15 v0.2. D-040, D-041, D-046, D-021, D-124, D-139 a D-142.
--
-- ⚠️ A entidade Notificação NÃO existe como tabela, e isso é o desenho
-- e não uma omissão — é a resposta a P-014 e P-027, abertas desde o
-- Bloco 4. O que se grava aqui é (a) a preferência de cada um e (b) o
-- que cada um já leu. A notificação em si é DERIVADA a cada abertura.
--
-- É essa inversão que dispensa o agendador. Não há pg_cron nem Vercel
-- Cron na stack, e um trabalho agendado que não roda não avisa que não
-- rodou; aqui, ou a consulta roda ou a tela não abre. E quando a causa
-- desaparece — a atividade é concluída, o negócio se move — o alerta
-- some sozinho, sem rotina de limpeza.
--
-- ⚠️ Medido ANTES de construir (Doc 15 §2.1): a derivação custa 1,65 ms
-- na base real, contra o teto de 200 ms que o plano temia. A restrição
-- verdadeira não é custo de consulta, é NÚMERO DE IDAS AO BANCO — cada
-- viagem pelo pooler custa ~150 ms de latência. Por isso os alertas
-- saem de UMA função só, e não de quatro consultas.
-- ============================================================

-- ---------- Os quatro tipos (D-040) ----------
-- Fixos em enum, não em tabela configurável: cada tipo tem regra própria
-- escrita em SQL na função de derivação. Um tipo novo é código novo, não
-- linha nova — então tabela configurável daria só a ilusão de extensão.
create type tipo_notificacao as enum (
  'negocio_parado',
  'atividade_vencida',
  'lembrete_atividade',
  'follow_up_ganho'
);

-- ---------- O padrão do sistema ----------
-- ⚠️ O padrão mora AQUI, no banco, e não no componente da tela.
-- A derivação (função `notificacoes`) e o painel de configuração
-- precisam dos mesmos números. Se cada um tivesse o seu, um dia
-- divergiriam sem ninguém notar — nenhum teste compara constante de
-- React com constante de PostgreSQL.
create or replace function public.padrao_notificacao(p_tipo public.tipo_notificacao)
returns integer language sql immutable
set search_path = ''
as $$
  select case p_tipo
    when 'negocio_parado'     then 60    -- D-139: degraus 30/45/60/90
    when 'lembrete_atividade' then 1     -- D-140: degraus 1/2/3/7
    when 'follow_up_ganho'    then 90    -- D-021
    when 'atividade_vencida'  then null  -- vencida é vencida, não tem prazo
  end
$$;

-- ---------- 1. Preferência: o que cada um quer ser avisado ----------
create table preferencia_notificacao (
  usuario_id uuid not null references usuario(id) on delete cascade,
  tipo       tipo_notificacao not null,
  ativo      boolean not null default true,
  dias       integer,
  criado_em  timestamptz not null default now(),
  primary key (usuario_id, tipo),

  -- ⚠️ D-139 e D-140 escritas como RESTRIÇÃO, e não como combinado.
  -- Os degraus da tela não podem ser a única guarda: a tabela é
  -- gravável pela API e o painel do Supabase também escreve nela.
  --
  -- ⚠️ `dias is null` é permitido de propósito, e significa "use o
  -- padrão do sistema". É a mesma regra da linha ausente, um nível
  -- abaixo: quem desliga o alerta não precisa escolher um prazo para
  -- um alerta que não vai tocar.
  constraint dias_do_tipo check (
    case tipo
      when 'negocio_parado'     then dias is null or dias in (30, 45, 60, 90)
      when 'lembrete_atividade' then dias is null or dias in (1, 2, 3, 7)
      when 'follow_up_ganho'    then dias is null or dias between 1 and 365
      when 'atividade_vencida'  then dias is null
    end
  )
);

comment on table preferencia_notificacao is
  'Guarda apenas quem quis DIFERENTE do padrao. Linha ausente = padrao do '
  'sistema (public.padrao_notificacao). Doc 15 secao 3.1.';

-- ---------- 2. Leitura: o que já foi visto ----------
-- ⚠️ Guarda o que foi LIDO, e não o que foi gerado. É a inversão que
-- faz o modelo funcionar sem agendador: a notificação é derivada toda
-- vez, e esta tabela apenas a esconde do contador. Quando a causa
-- desaparece, a linha vira lixo inofensivo — nunca dado errado.
create table notificacao_lida (
  usuario_id uuid not null references usuario(id) on delete cascade,
  chave      text not null,
  lido_em    timestamptz not null default now(),
  primary key (usuario_id, chave)
);

comment on table notificacao_lida is
  'O que cada usuario ja dispensou, pela chave estavel do alerta. '
  'A chave carrega um marco (Doc 15 secao 3.3): negocio que para de '
  'novo, ou atividade que vence de novo, gera chave nova e volta a '
  'avisar.';

-- ---------- Acesso ----------
-- ⚠️ Estas são as PRIMEIRAS tabelas do sistema com RLS por usuário.
-- Todas as outras usam `pertence_ao_dominio()` — papel único, acesso
-- total (D-049, D-050). Aqui é por pessoa, coerente com a D-124: a
-- configuração é do usuário e não da empresa, e ninguém tem o que
-- fazer com a caixa de notificação alheia.
--
-- ⚠️ A comparação é com `public.usuario_atual()`, NUNCA com
-- `auth.uid()`. Desde a D-109 a chave primária de `usuario` não é o id
-- da conta de login: quem veio da carga tem `id` próprio e `auth_id`
-- separado. Com `auth.uid()` a política devolveria vazio exatamente
-- para quem foi migrado — os sócios —, e o sino ficaria eternamente
-- mudo, sem erro nenhum na tela. É a armadilha da C-05, que já custou
-- um usuário real sem conseguir trabalhar.
alter table preferencia_notificacao enable row level security;
alter table notificacao_lida        enable row level security;

create policy propria_preferencia on preferencia_notificacao
  for all to authenticated
  using      (usuario_id = public.usuario_atual())
  with check (usuario_id = public.usuario_atual());

create policy propria_leitura on notificacao_lida
  for all to authenticated
  using      (usuario_id = public.usuario_atual())
  with check (usuario_id = public.usuario_atual());

-- Política de RLS sozinha não dá acesso a nada: o Postgres exige os
-- dois sinais verdes, o privilégio de tabela e a política. Sem o grant
-- a conta bate em "permission denied" antes de a política ser avaliada.
revoke all on preferencia_notificacao from anon;
revoke all on notificacao_lida        from anon;
grant select, insert, update, delete on preferencia_notificacao to authenticated;
grant select, insert, update, delete on notificacao_lida        to authenticated;

-- ---------- A derivação ----------
-- Uma função, uma ida ao banco. Devolve os alertas do usuário da sessão
-- já cruzados com o que ele leu.
--
-- ⚠️ `conta` sai daqui e não da tela. A D-141 — o número do sino conta
-- só o que exige ação — é regra de produto e mora num lugar só; o
-- componente soma `where conta and not lida` e não decide nada.
--
-- ⚠️ `lida` marca, mas não remove. Notificação lida some do CONTADOR,
-- não da lista: sumir da lista tiraria do usuário a chance de rever o
-- que dispensou.
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
language sql stable
set search_path = ''
as $$
with eu as (
  -- Falha fechada: sem usuário resolvido, nenhuma CTE devolve linha.
  select public.usuario_atual() as id
),
hoje as (
  -- ⚠️ T-05: "hoje" é o dia em São Paulo, não em UTC. O servidor roda em
  -- UTC na Vercel, e às 21h de Brasília já é o dia seguinte lá. Sem
  -- isto a atividade de hoje viraria "vencida" três horas antes da
  -- meia-noite — e o sino discordaria da aba Vencidas, que calcula em
  -- São Paulo. Dois números para o mesmo fato é o que a D-142 evita.
  select (now() at time zone 'America/Sao_Paulo')::date as dia
),
pref as (
  -- Linha ausente, ou `dias` nulo, caem no padrão do sistema.
  select
    t.tipo,
    coalesce(p.ativo, true) as ativo,
    coalesce(p.dias, public.padrao_notificacao(t.tipo)) as dias
  from unnest(enum_range(null::public.tipo_notificacao)) as t(tipo)
  left join public.preferencia_notificacao p
         on p.tipo = t.tipo
        and p.usuario_id = (select id from eu)
),

-- ---------- 1. Negócio parado (D-040, D-139) ----------
-- Último sinal de vida = o mais recente entre a criação, o último
-- evento REAL do log e a última atividade registrada no negócio.
--
-- ⚠️ `not origem_carga` inclui os 3.406 eventos importados do Pipedrive
-- (D-129): são história verdadeira, e ignorá-los faria negócios que se
-- moveram em 2025 parecerem parados desde a criação.
sinal as (
  select
    n.id,
    n.titulo,
    n.organizacao_id,
    greatest(
      n.criado_em,
      coalesce((select max(e.ocorrido_em)
                  from public.evento_negocio e
                 where e.negocio_id = n.id
                   and not e.origem_carga), n.criado_em),
      coalesce((select max(a.criado_em)
                  from public.atividade a
                 where a.negocio_id = n.id), n.criado_em)
    ) as ultimo_sinal
  from public.negocio n
  where n.responsavel_id = (select id from eu)
    -- D-046: status `parado` congela o negócio, nenhuma automação o
    -- monitora. Ganho e perdido também ficam fora: negócio encerrado
    -- não fica parado, fica pronto.
    and n.status = 'negociacao'
    and (select ativo from pref where pref.tipo = 'negocio_parado')
),
parado as (
  select
    'negocio_parado'::public.tipo_notificacao as tipo,
    -- ⚠️ O marco é o dia em que o negócio CRUZOU o limite. Sem ele,
    -- marcar como lido silenciaria o alerta para sempre; com ele, um
    -- negócio que para de novo depois de se mover gera chave nova.
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

-- ---------- 2. Atividade vencida (D-040, D-142) ----------
-- ⚠️ Pendura na atividade e não no negócio: 4.934 das 6.483 atividades
-- não têm negócio (D-108), e entre as pendências vivas dos sócios essa
-- é a maioria.
--
-- ⚠️ As vencidas herdadas do Pipedrive entram sem corte por idade
-- (D-142), inclusive as de 2022. A aba Vencidas já mostra essa mesma
-- pilha; filtrar aqui criaria dois números para o mesmo fato, e o
-- usuário confiaria no menor.
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
  where a.responsavel_id = (select id from eu)
    and not a.concluida
    and a.data < (select dia from hoje)
    and (select ativo from pref where pref.tipo = 'atividade_vencida')
),

-- ---------- 3. Lembrete de próxima atividade (D-040, D-140) ----------
-- ⚠️ `conta = false` (D-141). Compromisso de amanhã não é pendência, e
-- inflar o número é o caminho mais curto para o sino ser ignorado.
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
  where a.responsavel_id = (select id from eu)
    and not a.concluida
    and a.data >= (select dia from hoje)
    and a.data <= (select dia from hoje) + d.dias
    and (select ativo from pref where pref.tipo = 'lembrete_atividade')
),

-- ⚠️ `follow_up_ganho` não aparece aqui: é o único dos quatro que
-- ESCREVE (cria uma atividade de retorno) em vez de ler. Ele mora na
-- server action do desfecho, junto do update que grava o Ganho.
tudo as (
  select * from parado
  union all select * from vencida
  union all select * from proxima
)
select
  tudo.tipo,
  tudo.chave,
  tudo.titulo,
  tudo.detalhe,
  tudo.referencia,
  tudo.destino,
  tudo.conta,
  (l.chave is not null) as lida
from tudo
left join public.notificacao_lida l
       on l.usuario_id = (select id from eu)
      and l.chave = tudo.chave
-- Ordem do enum agrupa como a tela mostra: parados, vencidas, próximas.
-- `referencia` crescente serve aos três: o mais parado, o mais atrasado
-- e o mais próximo aparecem primeiro.
order by tudo.tipo, tudo.referencia
$$;

revoke execute on function public.notificacoes() from anon;
grant  execute on function public.notificacoes() to authenticated;

revoke execute on function public.padrao_notificacao(public.tipo_notificacao) from anon;
grant  execute on function public.padrao_notificacao(public.tipo_notificacao) to authenticated;
