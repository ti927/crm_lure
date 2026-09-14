-- ============================================================
-- CRM Lure — a aba Organizações dos Contatos passa a buscar sem acento.
--
-- A migration anterior (20260914120000) resolveu tudo que a aplicação
-- pergunta pelo PostgREST. A lista de Organizações não passa por ali:
-- ela sai de `organizacoes_agrupadas`, no banco, e o termo era comparado
-- com `ilike` cru — procurar "Goiania" não achava "Goiânia".
--
-- ⚠️ É UMA LINHA, e é uma linha por causa da D-161. Ela registrou que o
-- filtro da lista agrupada entra em TRÊS funções — a listagem, a
-- contagem que alimenta a paginação e a expansão do grupo — e por isso
-- pôs o predicado numa função única, `organizacao_no_recorte`. Sem
-- aquela decisão, esta correção seria três `where` para achar e acertar,
-- e o dia em que alguém esquecesse um deles a paginação anunciaria um
-- número que a lista não mostra.
--
-- ⚠️ A NORMALIZAÇÃO ACONTECE AQUI DENTRO, e não na aplicação. É o
-- contrário do que a `nome_busca` faz, e de propósito: onde o PostgREST
-- consegue chegar, quem normaliza é `termoDeBusca()` em
-- `lib/formato.ts`, porque não há outro jeito; onde existe função no
-- banco, quem normaliza é o banco, porque é onde a definição já mora.
-- Menos um lugar para as duas divergirem.
--
-- ⚠️ `p_nome` é PARÂMETRO, não coluna: esta comparação nunca usou índice
-- e continua não usando. Não é descuido — a função é chamada linha a
-- linha sobre 2.897 organizações, e `sem_acento` é `immutable`, então o
-- lado do termo é calculado uma vez só. O custo medido da tela inteira
-- fica em milissegundos; o que custa nesta base é ida ao pooler (~180ms),
-- e esta correção não acrescenta nenhuma.
-- ============================================================

create or replace function public.organizacao_no_recorte(
  p_nome        text,
  p_uf_linha    text,
  p_cidade_linha text,
  p_termo       text,
  p_uf          text,
  p_cidade      text,
  p_sem_local   boolean
)
returns boolean
language sql
immutable
parallel safe
set search_path = ''
as $$
  select
    (
      p_termo is null or p_termo = ''
      or public.sem_acento(lower(p_nome))
         ilike '%' || public.sem_acento(lower(p_termo)) || '%'
    )
    and (
      case
        -- "Sem local" ignora UF e cidade de propósito: pedir as duas
        -- coisas ao mesmo tempo é contradição, e o seletor da tela nunca
        -- as envia juntas.
        when p_sem_local then p_uf_linha is null and p_cidade_linha is null
        when p_cidade is not null and p_cidade <> ''
          then p_cidade_linha = p_cidade
               and (p_uf is null or p_uf = '' or p_uf_linha = p_uf)
        when p_uf is not null and p_uf <> '' then p_uf_linha = p_uf
        else true
      end
    )
$$;

revoke all on function public.organizacao_no_recorte(text, text, text, text, text, text, boolean) from anon;
grant execute on function public.organizacao_no_recorte(text, text, text, text, text, text, boolean) to authenticated;
