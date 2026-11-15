-- =====================================================================
-- Escrita de agentes de IA pelo MCP — fases 3 e 4 do Doc 16.
--
-- 1. Marca "via Agente IA" (D-174, P-056). Coluna `via_agente` com o
--    NOME do agente ("Claude", "Grok"…) em negocio, anotacao, atividade
--    e evento_negocio. Nula = escrito por uma pessoa, pela tela.
--
--    ⚠️ Quem preenche é o BANCO, por gatilho, a partir do token — nunca
--    o que vem na requisição. O agente não consegue se passar por pessoa
--    (apagar a marca) nem uma pessoa se passar por agente. No UPDATE a
--    marca fica como estava: ela diz quem CRIOU; quem mudou o quê depois
--    está no evento_negocio (que leva a própria marca) e em chamada_agente.
--
--    ⚠️ Fica de fora de organizacao e pessoa DE PROPÓSITO: campo novo em
--    organizacao obriga a mexer na fusão (CLAUDE.md), e quem criou o
--    cadastro está em chamada_agente.alvo.
--
-- 2. chamada_agente ganha `escrita` (a chamada gravou de verdade — ensaio
--    não conta) e `alvo` (link do registro criado ou mudado). `escrita`
--    é o que o limite diário conta (P-058).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Quem é o agente desta requisição
-- ---------------------------------------------------------------------

/*
 * Nome do agente quando a requisição vem com token OAuth de agente;
 * nulo quando vem de uma pessoa (sessão do navegador), de script ou
 * de carga. Lê o `client_id` do token, que é assinado pelo Supabase.
 */
create or replace function public.agente_da_requisicao()
returns text
language sql stable security definer
set search_path = ''
as $$
  select coalesce(nullif(trim(c.client_name), ''), 'Agente sem nome')
  from auth.oauth_clients c
  where c.id = nullif(coalesce(auth.jwt(), '{}'::jsonb) ->> 'client_id', '')::uuid
$$;

revoke all on function public.agente_da_requisicao() from public, anon;
grant execute on function public.agente_da_requisicao() to authenticated;

-- ---------------------------------------------------------------------
-- 2. A marca
-- ---------------------------------------------------------------------

alter table negocio        add column if not exists via_agente text;
alter table anotacao       add column if not exists via_agente text;
alter table atividade      add column if not exists via_agente text;
alter table evento_negocio add column if not exists via_agente text;

comment on column negocio.via_agente is
  'Nome do agente de IA que criou o negocio pelo MCP; nulo = criado por pessoa (D-174). Preenchido por gatilho.';
comment on column anotacao.via_agente is
  'Nome do agente de IA que escreveu a anotacao pelo MCP; nulo = pessoa (D-174). Preenchido por gatilho.';
comment on column atividade.via_agente is
  'Nome do agente de IA que criou a atividade pelo MCP; nulo = pessoa (D-174). Preenchido por gatilho.';
comment on column evento_negocio.via_agente is
  'Nome do agente de IA que fez a mudanca pelo MCP; nulo = pessoa ou sistema (D-174). Preenchido por gatilho.';

-- ⚠️ security definer porque o gatilho também dispara em escrita de
-- script e da porta de leads (chave de serviço), papéis que não têm
-- execute em agente_da_requisicao(). Sem isso, essas escritas quebrariam.
create or replace function public.marca_via_agente()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.via_agente := public.agente_da_requisicao();
  else
    new.via_agente := old.via_agente;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_marca_via_agente on negocio;
create trigger trg_marca_via_agente before insert or update on negocio
  for each row execute function public.marca_via_agente();

drop trigger if exists trg_marca_via_agente on anotacao;
create trigger trg_marca_via_agente before insert or update on anotacao
  for each row execute function public.marca_via_agente();

drop trigger if exists trg_marca_via_agente on atividade;
create trigger trg_marca_via_agente before insert or update on atividade
  for each row execute function public.marca_via_agente();

-- evento_negocio é só inserção (update revogado): basta o insert.
drop trigger if exists trg_marca_via_agente on evento_negocio;
create trigger trg_marca_via_agente before insert on evento_negocio
  for each row execute function public.marca_via_agente();

-- ---------------------------------------------------------------------
-- 3. Registro: escrita e alvo
-- ---------------------------------------------------------------------

alter table chamada_agente add column if not exists escrita boolean not null default false;
alter table chamada_agente add column if not exists alvo text;

comment on column chamada_agente.escrita is
  'A chamada gravou no CRM de verdade (ensaio nao conta). E o que o limite diario conta (P-058).';
comment on column chamada_agente.alvo is
  'Link do registro criado ou alterado pela chamada, quando houver.';

-- A assinatura muda (dois parâmetros novos): a antiga sai para não
-- haver duas versões chamáveis.
drop function if exists public.registra_chamada_agente(text, jsonb, boolean, text);

create or replace function public.registra_chamada_agente(
  p_ferramenta text,
  p_argumentos jsonb,
  p_sucesso    boolean,
  p_erro       text    default null,
  p_escrita    boolean default false,
  p_alvo       text    default null
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
    (usuario_id, sessao_id, cliente_id, agente, ferramenta, argumentos, sucesso, erro, escrita, alvo)
  values
    (a.usuario_id, a.sessao_id, a.cliente_id, a.agente,
     left(p_ferramenta, 100), coalesce(p_argumentos, '{}'::jsonb), p_sucesso, left(p_erro, 2000),
     coalesce(p_escrita, false) and p_sucesso, left(p_alvo, 500));
end;
$$;

revoke all on function public.registra_chamada_agente(text, jsonb, boolean, text, boolean, text) from public, anon;
grant execute on function public.registra_chamada_agente(text, jsonb, boolean, text, boolean, text) to authenticated;

-- ---------------------------------------------------------------------
-- 4. Limite diário (P-058)
-- ---------------------------------------------------------------------

/*
 * Quantas escritas de verdade os agentes do usuário atual fizeram hoje,
 * no dia de São Paulo. O teto em si mora no código do MCP, que é quem
 * recusa — o agente não alcança o banco sem passar por ele
 * (porta_permitida).
 */
create or replace function public.escritas_de_agente_hoje()
returns integer
language sql stable security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.chamada_agente c
  where c.usuario_id = public.usuario_atual()
    and c.escrita
    and c.ocorrido_em >= (date_trunc('day', now() at time zone 'America/Sao_Paulo')
                          at time zone 'America/Sao_Paulo')
$$;

revoke all on function public.escritas_de_agente_hoje() from public, anon;
grant execute on function public.escritas_de_agente_hoje() to authenticated;
