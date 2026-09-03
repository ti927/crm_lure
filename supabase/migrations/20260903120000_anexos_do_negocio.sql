-- ============================================================
-- CRM Lure — anexos do negócio: arquivo enviado OU link.
--
-- Pedido da Daniela, por WhatsApp: "na parte de negócios, onde podemos
-- anexar a proposta que foi entregue... no Pipe eu colocava em negócios".
-- É paridade com o Pipedrive, não escopo novo: lá o negócio tinha Files,
-- e é onde a proposta enviada ficava registrada.
--
-- ⚠️ **Arquivo E link, e não um dos dois.** Ela pediu os dois na mesma
-- frase ("anexar documentos... ou colocar um link"), e não é redundância:
-- quem gera a proposta em PDF sobe o arquivo; quem a mantém num Drive
-- compartilhado registra o endereço, e obrigá-lo a baixar-e-subir criaria
-- uma segunda cópia que envelhece sozinha. Uma tabela só, com `tipo`
-- discriminando — duas tabelas para a mesma pergunta ("o que foi enviado
-- neste negócio?") teriam que ser unidas em toda leitura.
--
-- ⚠️ **O balde é PRIVADO.** Um balde público entrega qualquer proposta a
-- quem adivinhar o endereço, sem login e sem rastro — e proposta comercial
-- com valor é exatamente o que não pode vazar. A leitura passa por URL
-- assinada, emitida no servidor e válida por minutos.
--
-- ⚠️ **O arquivo NÃO sobe por Server Action.** O corpo de uma Server
-- Action tem teto de 1 MB por padrão no Next, e proposta em PDF passa
-- disso sem esforço. O envio vai do navegador direto ao Storage, com a
-- sessão do próprio usuário — que é o que estas políticas autorizam. A
-- Server Action só grava a linha depois que o arquivo já está lá.
-- ============================================================

create table anexo_negocio (
  id         uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocio(id) on delete cascade,

  -- 'arquivo' = subiu para o Storage; 'link' = mora fora daqui.
  tipo       text not null check (tipo in ('arquivo', 'link')),

  -- O que a pessoa lê na tela. Para arquivo nasce do nome original; para
  -- link pode ser um rótulo ("Proposta v3") — endereço não é nome.
  nome       text not null check (btrim(nome) <> ''),

  -- Só para 'link'.
  url        text,
  -- Só para 'arquivo': o caminho dentro do balde `anexos`.
  caminho    text,
  tamanho    bigint,
  mime       text,

  autor_id   uuid references usuario(id),
  criado_em  timestamptz not null default now(),

  -- ⚠️ A exclusividade é do BANCO, e não da tela. Uma linha com `url` e
  -- `caminho` ao mesmo tempo não teria resposta para "onde está o
  -- arquivo?", e a tela que a gerasse só seria descoberta na hora de
  -- baixar.
  constraint anexo_arquivo_ou_link check (
    (tipo = 'arquivo' and caminho is not null and btrim(caminho) <> '' and url is null)
    or
    (tipo = 'link'    and url is not null     and btrim(url) <> ''     and caminho is null)
  )
);

-- Um caminho no balde pertence a um anexo só: se dois registros
-- apontassem para o mesmo objeto, apagar um deixaria o outro cego.
create unique index anexo_negocio_caminho_idx
  on anexo_negocio (caminho) where caminho is not null;

create index anexo_negocio_negocio_idx
  on anexo_negocio (negocio_id, criado_em desc);

comment on table anexo_negocio is
  'Propostas e documentos do negócio: arquivo no balde `anexos` ou link externo.';

-- ------------------------------------------------------------
-- Acesso: o mesmo de todo dado de domínio (D-050).
--
-- ⚠️ `pertence_ao_dominio()`, e NÃO `usuario_atual()`: o anexo é do
-- negócio, não de quem o subiu. Amarrá-lo ao autor faria a proposta
-- sumir da tela do sócio que atende o mesmo cliente — que é o oposto de
-- "deixar registrado".
-- ------------------------------------------------------------

alter table anexo_negocio enable row level security;

create policy acesso_por_dominio on anexo_negocio
  for all to authenticated
  using (public.pertence_ao_dominio())
  with check (public.pertence_ao_dominio());

revoke all on anexo_negocio from anon;
grant select, insert, update, delete on anexo_negocio to authenticated;

-- ------------------------------------------------------------
-- O balde
--
-- ⚠️ `on conflict do nothing`: a migration precisa poder rodar de novo
-- sobre um banco que já a aplicou. Balde não é tabela — não há
-- `create ... if not exists` aqui.
-- ------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit)
values ('anexos', 'anexos', false, 26214400)  -- 25 MiB
on conflict (id) do update
   set public = false,
       file_size_limit = 26214400;

-- ------------------------------------------------------------
-- Políticas do balde
--
-- ⚠️ Estas são o que de fato protege o arquivo. A linha em
-- `anexo_negocio` é só o registro: quem soubesse o caminho poderia pedir
-- o objeto direto ao Storage, e é `storage.objects` que recusa.
--
-- ⚠️ Sem `update`: anexo se substitui apagando e subindo outro. Permitir
-- sobrescrever um caminho faria a proposta que alguém abriu ontem ser
-- outra hoje, com o mesmo nome e a mesma data na tela.
-- ------------------------------------------------------------

create policy anexos_le_por_dominio on storage.objects
  for select to authenticated
  using (bucket_id = 'anexos' and public.pertence_ao_dominio());

create policy anexos_envia_por_dominio on storage.objects
  for insert to authenticated
  with check (bucket_id = 'anexos' and public.pertence_ao_dominio());

create policy anexos_apaga_por_dominio on storage.objects
  for delete to authenticated
  using (bucket_id = 'anexos' and public.pertence_ao_dominio());
