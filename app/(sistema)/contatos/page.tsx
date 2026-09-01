import Link from "next/link";
import { Phone, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { texto, linkWhatsApp } from "@/lib/formato";
import { TabelaDados } from "@/components/dominio/tabela-dados";
import { Paginacao } from "@/components/dominio/paginacao";
import { BarraContatos } from "./barra-contatos";
import { CartoesPessoa } from "./cartoes-contato";
import { LinhaGrupo, type Grupo } from "./grupo-organizacao";
import {
  SELECAO_PESSOA,
  POR_PAGINA,
  parseFiltros,
  limparIlike,
  localParaValor,
  temLocal,
  type Busca,
  type LinhaPessoa,
  type Locais,
} from "./consulta";

/**
 * Agrupa o que `locais_das_organizacoes()` devolve — uma linha por par
 * (uf, cidade) — na forma que o seletor precisa: estados, e dentro de
 * cada um suas cidades.
 *
 * ⚠️ Feito AQUI e não no banco: o banco já entregou tudo numa viagem só,
 * e transformar 69 linhas em objeto é trabalho de milissegundos. Pedir
 * ao Postgres um `jsonb` aninhado só para poupar isto seria complicar a
 * função para economizar nada.
 *
 * ⚠️ O total da UF inclui os cadastros SEM cidade, e por isso pode ser
 * maior que a soma das cidades listadas. Não é erro de conta: "GO" tem
 * cadastros que só sabem o estado, e a opção do estado inteiro é o que
 * alcança todos eles.
 */
function agrupaLocais(
  linhas: { uf: string | null; cidade: string | null; quantidade: number }[]
): Locais {
  const porUf = new Map<string, { total: number; cidades: { nome: string; quantidade: number }[] }>();
  const semUf: { nome: string; quantidade: number }[] = [];
  let semLocal = 0;

  for (const l of linhas) {
    const n = Number(l.quantidade);
    if (!l.uf) {
      // A linha sem UF e sem cidade é a contagem de quem não tem
      // endereço — vem da mesma consulta, de propósito.
      if (l.cidade) semUf.push({ nome: l.cidade, quantidade: n });
      else semLocal += n;
      continue;
    }
    const atual = porUf.get(l.uf) ?? { total: 0, cidades: [] };
    atual.total += n;
    if (l.cidade) atual.cidades.push({ nome: l.cidade, quantidade: n });
    porUf.set(l.uf, atual);
  }

  return {
    // ⚠️ Estados por PESO, e não em ordem alfabética: 971 dos 1.025
    // cadastros são de Goiás, e uma lista alfabética poria "AL" com um
    // cadastro acima do estado que responde por 95% da base.
    ufs: [...porUf]
      .map(([uf, v]) => ({
        uf,
        total: v.total,
        cidades: v.cidades.sort((a, b) => b.quantidade - a.quantidade),
      }))
      .sort((a, b) => b.total - a.total),
    semUf: semUf.sort((a, b) => b.quantidade - a.quantidade),
    semLocal,
  };
}

export default async function PaginaContatos({
  searchParams,
}: {
  searchParams: Promise<Busca>;
}) {
  const p = await searchParams;
  const filtros = parseFiltros(p);
  const supabase = await createClient();

  const inicio = (filtros.pagina - 1) * POR_PAGINA;
  // ⚠️ `bg-surface-sunken` na CELULA, e nao so no `<thead>`: com
  // `border-collapse: collapse` o navegador nao pinta o fundo do thead,
  // e as linhas passariam visiveis por tras do cabecalho ao rolar.
  const th =
    "bg-surface-sunken border-border h-9 border-b px-3 text-left text-xs font-semibold uppercase tracking-caps text-text-muted";
  // ⚠️ `border-b` na CELULA, e nao no `<tr>`: no modelo de bordas
  // separado (ver `tabela-dados.tsx`) borda de linha nao e desenhada.
  const celula = "border-border border-b px-3 align-middle";

  let total = 0;
  let cabecalho: React.ReactNode = null;
  let linhas: React.ReactNode[] = [];
  // Os mesmos dados alimentam os cartões do celular, que não são a
  // tabela redimensionada e sim outra forma (D-097).
  let cartoes: React.ReactNode = null;
  /** Organizações: lista de grupos expansíveis, que serve celular e desktop. */
  let listaAgrupada: React.ReactNode = null;
  /** O menu do filtro de local. Nulo na aba Pessoas, que não tem endereço. */
  let locais: Locais | null = null;

  if (filtros.aba === "organizacoes") {
    /*
     * Organizações vêm AGRUPADAS por nome normalizado. 1.195 dos 2.889
     * registros são repetição vinda do Pipedrive ("Sicoob Credseguro"
     * aparece seis vezes), e listar linha a linha enchia a tela de
     * duplicata. A agregação roda no banco — paginar por grupo no
     * cliente exigiria carregar tudo, o que a R-006 proíbe.
     *
     * A mesma lista serve celular e desktop: é uma lista de linhas
     * expansíveis, não uma tabela de dez colunas.
     */
    const termo = filtros.busca ? limparIlike(filtros.busca) : null;
    const recorte = {
      p_uf: filtros.local.uf,
      p_cidade: filtros.local.cidade,
      p_sem_local: filtros.local.semLocal,
    };
    // ⚠️ Três idas ao banco em PARALELO, não em sequência: cada viagem ao
    // pooler custa ~150 ms, e encadeá-las somaria meio segundo à tela.
    // A lista dos locais não depende do recorte — ela é o menu, e um
    // menu que encolhe conforme o que já está filtrado tranca o usuário
    // na primeira escolha.
    const [{ data: grupos }, { data: qtd }, { data: locaisCrus }] = await Promise.all([
      supabase.rpc("organizacoes_agrupadas", {
        p_termo: termo,
        p_limite: POR_PAGINA,
        p_deslocamento: inicio,
        ...recorte,
      }),
      supabase.rpc("conta_organizacoes_agrupadas", { p_termo: termo, ...recorte }),
      supabase.rpc("locais_das_organizacoes"),
    ]);
    total = qtd ?? 0;
    locais = agrupaLocais(locaisCrus ?? []);

    listaAgrupada = (
      <ul>
        {(grupos ?? []).map((g) => (
          // ⚠️ O recorte desce para a linha porque expandir o grupo faz
          // OUTRA consulta, do cliente. Sem ele, o crachá diria 3 e a
          // expansão mostraria 18 — e o usuário deixaria de confiar nos
          // dois números.
          <LinhaGrupo key={g.chave} grupo={g as Grupo} recorte={filtros.local} />
        ))}
      </ul>
    );
  } else {
    let consulta = supabase
      .from("pessoa")
      .select(SELECAO_PESSOA, { count: "exact" })
      .order("nome");
    if (filtros.busca) consulta = consulta.ilike("nome", `%${limparIlike(filtros.busca)}%`);

    const { data, count } = await consulta
      .range(inicio, inicio + POR_PAGINA - 1)
      .returns<LinhaPessoa[]>();
    total = count ?? 0;
    cartoes = <CartoesPessoa pessoas={data ?? []} />;

    cabecalho = (
      <thead className="bg-surface-sunken sticky top-0 z-20">
        <tr>
          <th className={th}>Nome</th>
          <th className={th}>Organização</th>
          <th className={`${th} hidden md:table-cell`}>Contato</th>
        </tr>
      </thead>
    );

    linhas = (data ?? []).map((pe, i) => {
      const vinculo = pe.pessoa_organizacao?.[0];
      const maisOrgs = (pe.pessoa_organizacao?.length ?? 0) - 1;
      return (
        <tr
          key={pe.id}
          style={{ animationDelay: `${Math.min(i, 14) * 18}ms` }}
          className="hover:bg-surface-hover animate-in fade-in fill-mode-backwards duration-300 motion-safe:transition-colors"
        >
          <td className="h-row-cozy max-w-[22rem] truncate p-0 font-medium">
            <Link
              href={`/contatos/pessoas/${pe.id}`}
              className="hover:text-brand-ink block truncate px-3 py-2 underline-offset-4 hover:underline"
            >
              {pe.nome}
            </Link>
          </td>
          <td className={`${celula} max-w-[18rem]`}>
            {vinculo?.organizacao ? (
              <span className="block truncate">
                {vinculo.organizacao.nome}
                {vinculo.cargo && (
                  <span className="text-text-muted"> · {vinculo.cargo}</span>
                )}
                {maisOrgs > 0 && <span className="text-text-muted"> +{maisOrgs}</span>}
              </span>
            ) : (
              texto(null)
            )}
          </td>
          <td className={`${celula} hidden md:table-cell`}>
            <span className="flex flex-wrap gap-1.5">
              {(pe.forma_contato ?? []).slice(0, 3).map((c, j) =>
                c.tipo === "telefone" ? (
                  <a
                    key={j}
                    href={linkWhatsApp(c.valor)}
                    className="border-border hover:border-brand-ink inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-sm"
                  >
                    <Phone className="size-3" aria-hidden />
                    {c.valor}
                  </a>
                ) : (
                  <a
                    key={j}
                    href={`mailto:${c.valor}`}
                    className="border-border hover:border-brand-ink inline-flex max-w-[14rem] items-center gap-1 rounded-full border px-2 py-0.5 text-sm"
                  >
                    <Mail className="size-3 shrink-0" aria-hidden />
                    <span className="truncate">{c.valor}</span>
                  </a>
                )
              )}
            </span>
          </td>
        </tr>
      );
    });
  }

  const ultimaPagina = Math.max(1, Math.ceil(total / POR_PAGINA));

  /** A querystring atual sem a página — a paginação monta o resto. */
  const consultaSemPagina = (() => {
    const q = new URLSearchParams();
    if (filtros.aba === "pessoas") q.set("aba", "pessoas");
    if (filtros.busca) q.set("busca", filtros.busca);
    if (temLocal(filtros.local)) q.set("local", localParaValor(filtros.local));
    return q.toString();
  })();


  return (
    // ⚠️ Sem `h-full`: como a Lista, esta tela deixou de ser painel fixo
    // com rolagem por dentro e passou a fluir dentro do `main`, que é quem
    // rola. É o que faz o cabeçalho grudado ficar parado e o rodapé
    // aparecer depois da última linha (ver `tabela-dados.tsx`).
    <div className="flex min-w-0 flex-col">
      <BarraContatos aba={filtros.aba} total={total} locais={locais} />

      {total === 0 ? (
        // ⚠️ O vazio precisa dizer QUAL recorte esvaziou. "Nenhuma
        // organização" numa base de 2.903 se lê como defeito; a mesma
        // tela dizendo "nenhuma em Anápolis com esse nome" é resposta.
        <div className="px-4 py-16 text-center">
          <p className="text-text-secondary text-md font-medium">
            {filtros.busca && temLocal(filtros.local)
              ? "Nenhum contato corresponde à busca neste local."
              : temLocal(filtros.local)
                ? "Nenhuma organização neste local."
                : filtros.busca
                  ? "Nenhum contato corresponde à busca."
                  : filtros.aba === "organizacoes"
                    ? "Nenhuma organização."
                    : "Nenhuma pessoa."}
          </p>
          <p className="text-text-muted mt-1 text-sm">
            {temLocal(filtros.local)
              ? "Troque o local ou volte para “Todos os locais”."
              : filtros.busca
                ? "Ajuste ou limpe a busca."
                : "Crie o primeiro no botão acima."}
          </p>
        </div>
      ) : (
        listaAgrupada ? (
          // Organizações: a mesma lista agrupada nos dois tamanhos.
          <div>{listaAgrupada}</div>
        ) : (
          <>
            {/* Pessoas — celular: cartões; desktop: tabela. */}
            <div className="md:hidden">{cartoes}</div>
            <div className="hidden md:block">
              <TabelaDados cabecalho={cabecalho} linhas={linhas} />
            </div>
          </>
        )
      )}

      {ultimaPagina > 1 && (
        <div className="border-border bg-surface flex flex-wrap items-center justify-between gap-3 border-t px-4 py-2">
          <span className="text-text-muted text-sm">
            {inicio + 1}–{Math.min(inicio + POR_PAGINA, total)} de {total.toLocaleString("pt-BR")}
          </span>
          <Paginacao
            pagina={filtros.pagina}
            ultima={ultimaPagina}
            caminho="/contatos"
            consulta={consultaSemPagina}
          />
        </div>
      )}
    </div>
  );
}

