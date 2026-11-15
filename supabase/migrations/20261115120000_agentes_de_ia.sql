-- ============================================================
-- CRM Lure — agentes de IA, fase 2 do MCP (Doc 16).
-- D-173, D-176, D-178.
--
-- Duas coisas, e só duas:
--
--   1. `chamada_agente` — o registro de TODA chamada de ferramenta feita
--      por um agente, leitura inclusive (D-178: "tudo que for ação de
--      agente fica registrado").
--   2. `preferencia_agente` — o interruptor de escrita sensível de cada
--      usuário (D-176), que nasce LIGADO (D-178).
--
-- ⚠️ QUEM É O AGENTE NÃO VEM DO AGENTE. O token OAuth traz `session_id`;
-- a sessão em `auth.sessions` traz `oauth_client_id`; o cliente em
-- `auth.oauth_clients` traz o nome com que ele se cadastrou. As funções
-- abaixo leem os três do lado do banco, então um agente não consegue
-- gravar no registro um nome, um usuário ou um horário que não sejam os
-- dele — a tabela não aceita escrita direta de ninguém.
--
-- ⚠️ SESSÃO APAGADA = AGENTE DESCONECTADO, NA HORA. Desconectar em
-- /agentes chama `revokeGrant`, que apaga a sessão do agente. O token de
-- acesso que ele já tem continua com assinatura válida até vencer (~1 h),
-- e é por isso que `agente_atual()` confere a sessão a cada requisição:
-- sem a sessão, a função não devolve linha e a rota responde 401.
-- ============================================================

-- ---------- 0. Token de agente só vale pela porta do MCP ----------
-- ⚠️ A BRECHA QUE ISTO FECHA, achada em 15/11 ao desenhar a fase 2. O
-- token que o Supabase entrega ao agente é um token de usuário comum —
-- `role: authenticated`, com o e-mail do domínio — mais o `client_id`
-- do agente. A chave anônima é pública (vai no navegador), e o endereço
-- do Supabase está no próprio token. Ou seja: com o token na mão, o
-- agente podia falar DIRETO com o banco, pulando o MCP — ler sem
-- registro e ESCREVER sem regra, sem marca e sem interruptor. Tudo o
-- que a D-172 e a D-178 prometem moraria só na boa vontade dele.
--
-- A correção: token que traz `client_id` só passa pelas políticas quando
-- a requisição traz também o cabeçalho `x-lure-mcp` com o segredo que só
-- o servidor do CRM conhece (`MCP_SEGREDO_BANCO`, só na Vercel). O banco
-- guarda apenas o HASH dele, num esquema que a API não expõe, e o hash
-- é gravado pela CLI — nem ele entra no repositório (D-114).
--
-- ⚠️ Sem linha em `privado.segredo_mcp`, NENHUM agente passa. Falha
-- fechada: esquecer de gravar o hash desliga o MCP, não abre o banco.
--
-- Login comum (tela, cron, scripts) não traz `client_id` e não paga nada
-- por isto: o `not ... ?` decide antes de chegar ao hash.
create schema if not exists privado;
revoke all on schema privado from public, anon, authenticated;

create table if not exists privado.segredo_mcp (
  id   integer primary key default 1 check (id = 1),
  hash text not null
);

create or replace function public.porta_permitida()
returns boolean language sql stable security definer
set search_path = ''
as $$
  select not (coalesce(auth.jwt(), '{}'::jsonb) ? 'client_id')
      or exists (
        select 1 from privado.segredo_mcp s
        where s.hash = encode(extensions.digest(
                coalesce(current_setting('request.headers', true)::jsonb ->> 'x-lure-mcp', ''),
                'sha256'), 'hex')
      )
$$;

revoke all on function public.porta_permitida() from public, anon;
grant execute on function public.porta_permitida() to authenticated;

-- As duas portas de todas as políticas passam a exigir a porta certa.
-- Corpo idêntico ao original (20260813120200 e 20260817170000), mais a
-- condição — e é por elas que passam todas as tabelas, inclusive as
-- preferências por usuário e os anexos do Storage.
create or replace function public.pertence_ao_dominio()
returns boolean language sql stable
set search_path = ''
as $$
  select nullif(split_part(coalesce(auth.jwt() ->> 'email', ''), '@', 2), '')
         = public.dominio_empresa()
     and public.porta_permitida()
$$;

create or replace function public.usuario_atual()
returns uuid language sql stable
set search_path = ''
as $$
  select id from public.usuario where auth_id = auth.uid() and public.porta_permitida()
$$;

-- ---------- 1. O registro ----------
create table chamada_agente (
  id          bigint generated always as identity primary key,
  usuario_id  uuid not null references usuario(id),
  sessao_id   uuid,
  cliente_id  uuid,
  agente      text not null,
  ferramenta  text not null,
  argumentos  jsonb not null default '{}'::jsonb,
  sucesso     boolean not null,
  erro        text,
  ocorrido_em timestamptz not null default now()
);

comment on table chamada_agente is
  'Toda chamada de ferramenta feita por agente de IA pelo MCP (D-178). '
  'Gravada so por public.registra_chamada_agente, que tira usuario, '
  'agente e horario do token e da sessao, nunca do que o agente manda.';

create index chamada_agente_por_usuario on chamada_agente (usuario_id, ocorrido_em desc);

alter table chamada_agente enable row level security;

-- Leitura no domínio inteiro, como o log de negócios: papel único com
-- acesso total (D-049). A tela /agentes filtra as do próprio usuário.
create policy le_do_dominio on chamada_agente
  for select to authenticated
  using (public.pertence_ao_dominio());

-- ⚠️ Ninguém escreve direto: nem o agente, nem a tela, nem o painel por
-- engano. O único caminho é a função `security definer` abaixo. Sem
-- update e sem delete — registro que se apaga não é registro.
revoke insert, update, delete, truncate on chamada_agente from anon, authenticated, public;

-- ---------- 2. Quem está chamando ----------
-- Devolve uma linha se, e só se, o token é de um agente OAuth com a
-- sessão ainda viva e o usuário existe no CRM. Nenhuma linha = recusa.
create or replace function public.agente_atual()
returns table (usuario_id uuid, sessao_id uuid, cliente_id uuid, agente text)
language sql stable security definer
set search_path = ''
as $$
  select
    u.id,
    s.id,
    s.oauth_client_id,
    coalesce(nullif(trim(c.client_name), ''), 'Agente sem nome')
  from auth.sessions s
  join auth.oauth_clients c on c.id = s.oauth_client_id and c.deleted_at is null
  join public.usuario u on u.auth_id = s.user_id and u.ativo
  where s.id = nullif(auth.jwt() ->> 'session_id', '')::uuid
    and s.user_id = auth.uid()
    and (s.not_after is null or s.not_after > now())
    and public.pertence_ao_dominio()
$$;

revoke all on function public.agente_atual() from public, anon;
grant execute on function public.agente_atual() to authenticated;

-- ---------- 3. Gravar uma chamada ----------
create or replace function public.registra_chamada_agente(
  p_ferramenta text,
  p_argumentos jsonb,
  p_sucesso    boolean,
  p_erro       text default null
)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  a record;
begin
  select * into a from public.agente_atual();
  if not found then
    raise exception 'chamada sem agente valido: token sem sessao OAuth viva'
      using errcode = '42501';
  end if;

  insert into public.chamada_agente
    (usuario_id, sessao_id, cliente_id, agente, ferramenta, argumentos, sucesso, erro)
  values
    (a.usuario_id, a.sessao_id, a.cliente_id, a.agente,
     left(p_ferramenta, 100), coalesce(p_argumentos, '{}'::jsonb), p_sucesso, left(p_erro, 2000));
end;
$$;

revoke all on function public.registra_chamada_agente(text, jsonb, boolean, text) from public, anon;
grant execute on function public.registra_chamada_agente(text, jsonb, boolean, text) to authenticated;

-- ---------- 4. O interruptor de escrita sensível ----------
-- ⚠️ Linha ausente = LIGADO (D-178). A tabela guarda só quem quis
-- diferente, mesma regra de `preferencia_notificacao`.
create table preferencia_agente (
  usuario_id       uuid primary key references usuario(id) on delete cascade,
  escrita_sensivel boolean not null default true,
  atualizado_em    timestamptz not null default now()
);

comment on table preferencia_agente is
  'Interruptor de escrita sensivel do agente (etapa, valor, responsavel, '
  'desfecho), por usuario (D-176). Linha ausente = ligado (D-178).';

alter table preferencia_agente enable row level security;

-- Por usuário, e com `usuario_atual()`, nunca `auth.uid()` (D-109, C-05).
create policy propria_preferencia_agente on preferencia_agente
  for all to authenticated
  using      (usuario_id = public.usuario_atual())
  with check (usuario_id = public.usuario_atual());
