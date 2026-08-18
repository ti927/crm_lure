import Link from "next/link";
import { Phone, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { texto } from "@/lib/formato";
import { TabelaVirtual } from "@/components/dominio/tabela-virtual";
import { BarraContatos } from "./barra-contatos";
import { CartoesPessoa } from "./cartoes-contato";
import { LinhaGrupo, type Grupo } from "./grupo-organizacao";
import {
  SELECAO_PESSOA,
  POR_PAGINA,
  parseFiltros,
  limparIlike,
  paraWhatsApp,
  type Busca,
  type LinhaPessoa,
} from "./consulta";

export default async function PaginaContatos({
  searchParams,
}: {
  searchParams: Promise<Busca>;
}) {
  const p = await searchParams;
  const filtros = parseFiltros(p);
  const supabase = await createClient();

  const inicio = (filtros.pagina - 1) * POR_PAGINA;
  const th = "border-border h-9 border-b px-3 text-left text-xs font-semibold uppercase tracking-caps text-text-muted";
  const celula = "px-3 align-middle";

  let total = 0;
  let cabecalho: React.ReactNode = null;
  let linhas: React.ReactNode[] = [];
  // Os mesmos dados alimentam os cartões do celular, que não são a
  // tabela redimensionada e sim outra forma (D-097).
  let cartoes: React.ReactNode = null;
  /** Organizações: lista de grupos expansíveis, que serve celular e desktop. */
  let listaAgrupada: React.ReactNode = null;

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
    const [{ data: grupos }, { data: qtd }] = await Promise.all([
      supabase.rpc("organizacoes_agrupadas", {
        termo,
        limite: POR_PAGINA,
        deslocamento: inicio,
      }),
      supabase.rpc("conta_organizacoes_agrupadas", { termo }),
    ]);
    total = qtd ?? 0;
    listaAgrupada = (
      <ul>
        {(grupos ?? []).map((g) => (
          <LinhaGrupo key={g.chave} grupo={g as Grupo} />
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
          className="border-border hover:bg-surface-hover animate-in fade-in fill-mode-backwards border-b duration-300 motion-safe:transition-colors"
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
                    href={`https://wa.me/${paraWhatsApp(c.valor)}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="border-border hover:border-brand-ink inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-sm"
                  >
                    <Phone className="size-3" aria-hidden />
                    {c.valor}
                  </a>
                ) : (
                  <a
                    key={j}
                    href={`mailto:${c.valor}`}
                    onClick={(e) => e.stopPropagation()}
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

  function comPagina(n: number) {
    const q = new URLSearchParams();
    if (filtros.aba === "pessoas") q.set("aba", "pessoas");
    if (filtros.busca) q.set("busca", filtros.busca);
    if (n > 1) q.set("pagina", String(n));
    const s = q.toString();
    return s ? `/contatos?${s}` : "/contatos";
  }

  return (
    <div className="flex h-full min-w-0 flex-col">
      <BarraContatos aba={filtros.aba} total={total} />

      {total === 0 ? (
        <div className="px-4 py-16 text-center">
          <p className="text-text-secondary text-md font-medium">
            {filtros.busca
              ? "Nenhum contato corresponde à busca."
              : filtros.aba === "organizacoes"
                ? "Nenhuma organização."
                : "Nenhuma pessoa."}
          </p>
          <p className="text-text-muted mt-1 text-sm">
            {filtros.busca ? "Ajuste ou limpe a busca." : "Crie o primeiro no botão acima."}
          </p>
        </div>
      ) : (
        listaAgrupada ? (
          // Organizações: a mesma lista agrupada nos dois tamanhos.
          <div className="min-h-0 flex-1 overflow-auto">{listaAgrupada}</div>
        ) : (
          <>
            {/* Pessoas — celular: cartões; desktop: tabela virtualizada. */}
            <div className="min-h-0 flex-1 overflow-auto md:hidden">{cartoes}</div>
            <div className="hidden min-h-0 flex-1 flex-col md:flex">
              <TabelaVirtual cabecalho={cabecalho} linhas={linhas} />
            </div>
          </>
        )
      )}

      {ultimaPagina > 1 && (
        <div className="border-border bg-surface flex shrink-0 items-center justify-between gap-3 border-t px-4 py-2">
          <span className="text-text-muted text-sm">
            {inicio + 1}–{Math.min(inicio + POR_PAGINA, total)} de {total.toLocaleString("pt-BR")}
          </span>
          <div className="flex gap-1">
            <Paginacao href={comPagina(filtros.pagina - 1)} desabilitado={filtros.pagina <= 1}>
              Anterior
            </Paginacao>
            <Paginacao href={comPagina(filtros.pagina + 1)} desabilitado={filtros.pagina >= ultimaPagina}>
              Próxima
            </Paginacao>
          </div>
        </div>
      )}
    </div>
  );
}

function Paginacao({
  href,
  desabilitado,
  children,
}: {
  href: string;
  desabilitado: boolean;
  children: React.ReactNode;
}) {
  const base =
    "h-control-md border-border inline-flex items-center rounded-md border px-3 text-sm font-medium";
  if (desabilitado) {
    return <span aria-disabled className={`${base} text-text-muted opacity-50`}>{children}</span>;
  }
  return <Link href={href} className={`${base} hover:bg-surface-hover`}>{children}</Link>;
}
