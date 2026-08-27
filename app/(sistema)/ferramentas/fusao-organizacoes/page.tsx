import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { dataHora } from "@/lib/formato";
import { PainelGrupo, type Cadastro } from "./painel-grupo";

/**
 * Ferramenta de fusão de organizações duplicadas — **só desenvolvedores**
 * (D-156).
 *
 * ⚠️ **Isto altera o escopo do MVP**, onde "mesclagem de duplicados"
 * estava na lista do que não se constrói e a D-121 registrou que o
 * agrupamento da Lista é apresentação, não fusão. Entra por decisão
 * explícita do maestro, como ferramenta de manutenção enquanto a base é
 * limpa: 668 grupos, 1.204 cadastros que desapareceriam se todos fossem
 * fundidos.
 *
 * ⚠️ **`notFound()`, e não uma tela de "sem permissão".** Para quem não é
 * desenvolvedor, esta rota não existe — anunciar que existe uma
 * ferramenta que apaga cadastros, e que você não pode usá-la, só cria a
 * pergunta. A recusa que importa está no banco, dentro de
 * `funde_organizacao`.
 */
type Busca = Record<string, string | string[] | undefined>;
const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const POR_PAGINA = 25;

export default async function PaginaFusao({
  searchParams,
}: {
  searchParams: Promise<Busca>;
}) {
  const p = await searchParams;
  const termo = (um(p.q) ?? "").trim();
  const chave = um(p.grupo) ?? "";
  const pagina = Math.max(1, Number(um(p.pagina) ?? 1) || 1);

  const supabase = await createClient();
  const { data: dev } = await supabase.rpc("sou_desenvolvedor");
  if (dev !== true) notFound();

  const [{ data: grupos }, { data: total }, { data: historico }] = await Promise.all([
    supabase.rpc("fusao_grupos", {
      termo: termo || null,
      limite: POR_PAGINA,
      deslocamento: (pagina - 1) * POR_PAGINA,
    }),
    supabase.rpc("fusao_conta_grupos", { termo: termo || null }),
    supabase
      .from("fusao_organizacao")
      .select("id, duplicada_nome, criado_em, movidos, usuario(nome)")
      .order("criado_em", { ascending: false })
      .limit(8),
  ]);

  let cadastros: Cadastro[] = [];
  let nomeGrupo = "";
  if (chave) {
    const { data } = await supabase.rpc("fusao_cadastros", { chave_grupo: chave });
    cadastros = (data ?? []) as Cadastro[];
    nomeGrupo = cadastros[0]?.nome ?? "";
  }

  const comParametros = (troca: Record<string, string | null>) => {
    const q = new URLSearchParams();
    if (termo) q.set("q", termo);
    if (chave) q.set("grupo", chave);
    if (pagina > 1) q.set("pagina", String(pagina));
    for (const [k, v] of Object.entries(troca)) {
      if (v === null) q.delete(k);
      else q.set(k, v);
    }
    const s = q.toString();
    return s ? `/ferramentas/fusao-organizacoes?${s}` : "/ferramentas/fusao-organizacoes";
  };

  const ultima = Math.max(1, Math.ceil((total ?? 0) / POR_PAGINA));

  return (
    <div className="flex min-w-0 flex-col">
      <div className="border-border border-b px-4 py-3">
        <h1 className="text-xl font-semibold tracking-tight">Fundir duplicadas</h1>
        <p className="text-text-muted text-sm">
          {(total ?? 0).toLocaleString("pt-BR")} grupos com nome repetido · ferramenta
          de manutenção, restrita aos desenvolvedores
        </p>
      </div>

      {/* ⚠️ O aviso fica no topo e não é dispensável. A operação não tem
          desfazer, e o agrupamento é por NOME — nome igual não prova que
          é a mesma empresa. */}
      <div className="border-warning bg-warning-bg mx-4 mt-3 flex items-start gap-2 rounded-md border px-3 py-2">
        <AlertTriangle className="text-warning-ink mt-0.5 size-4 shrink-0" aria-hidden />
        <p className="text-warning-ink text-sm">
          <strong>Não há desfazer.</strong> Os cadastros são agrupados por nome, e nome
          igual não prova que é a mesma empresa — confira os negócios, as pessoas e a
          cidade de cada um antes. Tudo que a duplicada carrega passa para a principal;
          só o cadastro vazio é apagado.
        </p>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-px lg:grid-cols-[22rem_minmax(0,1fr)]">
        {/* Coluna esquerda: os grupos */}
        <div className="lg:border-r lg:border-border flex flex-col p-4">
          <form action="/ferramentas/fusao-organizacoes" className="relative mb-3">
            <Search
              className="text-text-muted pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2"
              aria-hidden
            />
            <input
              type="text"
              name="q"
              defaultValue={termo}
              placeholder="Buscar por nome…"
              aria-label="Buscar grupo por nome"
              className="h-control-md bg-surface border-border text-md w-full rounded-md border pl-8 pr-2.5"
            />
          </form>

          <ul className="flex flex-col">
            {(grupos ?? []).length === 0 && (
              <li className="text-text-muted py-6 text-center text-sm">
                Nenhum grupo com nome repetido.
              </li>
            )}
            {(grupos ?? []).map((g) => {
              const ativo = g.chave === chave;
              return (
                <li key={g.chave}>
                  <Link
                    href={comParametros({ grupo: g.chave })}
                    className={`border-border flex items-center justify-between gap-2 border-b px-2 py-2 ${
                      ativo ? "bg-surface-hover font-semibold" : "hover:bg-surface-hover"
                    }`}
                  >
                    <span className="text-md min-w-0 truncate">{g.nome}</span>
                    <span className="bg-surface-sunken text-text-secondary tabular shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold">
                      {g.quantidade}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          {ultima > 1 && (
            <div className="text-text-muted mt-3 flex items-center justify-between text-sm">
              <Paginacao href={comParametros({ pagina: String(pagina - 1) })} desabilitado={pagina <= 1}>
                Anterior
              </Paginacao>
              <span className="tabular">
                {pagina} de {ultima}
              </span>
              <Paginacao href={comParametros({ pagina: String(pagina + 1) })} desabilitado={pagina >= ultima}>
                Próxima
              </Paginacao>
            </div>
          )}
        </div>

        {/* Coluna direita: o grupo escolhido */}
        <div className="min-w-0 p-4">
          {!chave ? (
            <p className="text-text-muted py-16 text-center text-sm">
              Escolha um grupo à esquerda.
            </p>
          ) : (
            <PainelGrupo nome={nomeGrupo} cadastros={cadastros} />
          )}

          {(historico ?? []).length > 0 && (
            <section className="mt-8">
              <h2 className="text-text-muted tracking-caps mb-2 text-xs font-semibold uppercase">
                Fusões recentes
              </h2>
              <ul className="flex flex-col gap-1">
                {(historico ?? []).map((h) => {
                  const m = h.movidos as Record<string, string[]>;
                  const soma = (c: string) => (m?.[c] ?? []).length;
                  return (
                    <li key={h.id} className="text-text-secondary flex flex-wrap items-baseline gap-x-2 text-sm">
                      <span className="text-text font-medium">{h.duplicada_nome}</span>
                      <span className="text-text-muted">
                        {soma("negocios")} neg · {soma("atividades")} ativ ·{" "}
                        {soma("anotacoes")} anot · {soma("pessoas")} pes
                      </span>
                      <span className="text-text-muted ml-auto text-xs">
                        {h.usuario?.nome ?? "—"} · {dataHora(h.criado_em)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      </div>
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
  const classe =
    "h-control-sm border-border inline-flex items-center rounded-md border px-2 text-sm font-medium";
  if (desabilitado) {
    return <span className={`${classe} opacity-40`}>{children}</span>;
  }
  return (
    <Link href={href} className={`${classe} hover:bg-surface-hover`}>
      {children}
    </Link>
  );
}
