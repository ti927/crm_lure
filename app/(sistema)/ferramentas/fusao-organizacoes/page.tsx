import Link from "next/link";
import { AlertTriangle, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { dataHora } from "@/lib/formato";
import { PainelGrupo, type Cadastro } from "./painel-grupo";
import { PainelGrupoPessoa, type CadastroPessoa } from "./painel-grupo-pessoa";
import { Paginacao } from "@/components/dominio/paginacao";

/**
 * Ferramenta de fusão de organizações duplicadas — **para todo o
 * domínio**.
 *
 * ⚠️ **Isto altera o escopo do MVP**, onde "mesclagem de duplicados"
 * estava na lista do que não se constrói e a D-121 registrou que o
 * agrupamento da Lista é apresentação, não fusão. Entrou pela D-156, como
 * ferramenta trancada em duas pessoas.
 *
 * ⚠️ **A tranca saiu**, por decisão do maestro: revoga a restrição da
 * D-156, não a decisão inteira. O `notFound()` que escondia a rota de
 * quem não era desenvolvedor saiu junto — ele existia para não anunciar
 * uma ferramenta que ia recusar quem clicasse, e agora ela não recusa
 * mais ninguém do domínio. O que decide se duas "Sicoob Credseguro" são
 * a mesma empresa é quem atende a conta.
 *
 * ⚠️ **O que NÃO mudou é o que segurava o risco:** uma duplicada por
 * vez, prévia obrigatória antes, rastro em `fusao_organizacao` com os
 * ids de tudo que se moveu, e a recusa morando no banco e não na tela.
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

  /**
   * ⚠️ Qual entidade a ferramenta está fundindo. Duas abas na MESMA rota,
   * e não uma rota nova: é a mesma tarefa de manutenção, com a mesma
   * regra ("mover primeiro, apagar por último") e o mesmo risco. Separar
   * em duas telas duplicaria o aviso do topo, que é o que segura a mão de
   * quem clica.
   */
  const entidade = um(p.entidade) === "pessoas" ? "pessoas" : "organizacoes";
  const ehPessoa = entidade === "pessoas";

  const supabase = await createClient();

  const [{ data: grupos }, { data: total }, { data: historico }] = await Promise.all([
    ehPessoa
      ? supabase.rpc("fusao_grupos_pessoa", {
          p_termo: termo || null,
          p_limite: POR_PAGINA,
          p_deslocamento: (pagina - 1) * POR_PAGINA,
        })
      : supabase.rpc("fusao_grupos", {
          termo: termo || null,
          limite: POR_PAGINA,
          deslocamento: (pagina - 1) * POR_PAGINA,
        }),
    ehPessoa
      ? supabase.rpc("fusao_conta_grupos_pessoa", { p_termo: termo || null })
      : supabase.rpc("fusao_conta_grupos", { termo: termo || null }),
    ehPessoa
      ? supabase
          .from("fusao_pessoa")
          .select("id, duplicada_nome, criado_em, movidos, usuario(nome)")
          .order("criado_em", { ascending: false })
          .limit(8)
      : supabase
          .from("fusao_organizacao")
          .select("id, duplicada_nome, criado_em, movidos, usuario(nome)")
          .order("criado_em", { ascending: false })
          .limit(8),
  ]);

  let cadastros: Cadastro[] = [];
  let cadastrosPessoa: CadastroPessoa[] = [];
  let nomeGrupo = "";
  if (chave) {
    if (ehPessoa) {
      const { data } = await supabase.rpc("fusao_cadastros_pessoa", { p_chave: chave });
      cadastrosPessoa = (data ?? []) as CadastroPessoa[];
      nomeGrupo = cadastrosPessoa[0]?.nome ?? "";
    } else {
      const { data } = await supabase.rpc("fusao_cadastros", { chave_grupo: chave });
      cadastros = (data ?? []) as Cadastro[];
      nomeGrupo = cadastros[0]?.nome ?? "";
    }
  }

  const comParametros = (troca: Record<string, string | null>) => {
    const q = new URLSearchParams();
    if (ehPessoa) q.set("entidade", "pessoas");
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

  /** A querystring atual sem a página — a paginação monta o resto. */
  const consultaSemPagina = (() => {
    const q = new URLSearchParams();
    if (ehPessoa) q.set("entidade", "pessoas");
    if (termo) q.set("q", termo);
    if (chave) q.set("grupo", chave);
    return q.toString();
  })();

  return (
    <div className="flex min-w-0 flex-col">
      <div className="border-border border-b px-4 py-3">
        <h1 className="text-xl font-semibold tracking-tight">Fundir duplicadas</h1>
        <p className="text-text-muted text-sm">
          {(total ?? 0).toLocaleString("pt-BR")} grupos com nome repetido ·{" "}
          {ehPessoa ? "contatos" : "organizações"} · ferramenta de manutenção
        </p>

        {/* ⚠️ Trocar de aba ZERA o grupo escolhido e a página: a chave de
            um grupo de organização não existe do lado das pessoas, e
            carregá-la adiante deixaria a tela pedindo um grupo que não
            existe — vazia, sem dizer por quê. */}
        <div
          role="tablist"
          aria-label="O que fundir"
          className="border-border bg-surface-sunken mt-3 inline-flex rounded-md border p-0.5"
        >
          {[
            { chave: "organizacoes", rotulo: "Organizações", href: "/ferramentas/fusao-organizacoes" },
            { chave: "pessoas", rotulo: "Contatos", href: "/ferramentas/fusao-organizacoes?entidade=pessoas" },
          ].map((t) => (
            <Link
              key={t.chave}
              href={t.href}
              role="tab"
              aria-selected={entidade === t.chave}
              className={`rounded px-3 py-1 text-sm font-medium transition-all duration-150 ${
                entidade === t.chave
                  ? "bg-surface text-text shadow-sm"
                  : "text-text-secondary hover:text-text"
              }`}
            >
              {t.rotulo}
            </Link>
          ))}
        </div>
      </div>

      {/* ⚠️ O aviso fica no topo e não é dispensável. A operação não tem
          desfazer, e o agrupamento é por NOME — nome igual não prova que
          é a mesma empresa. */}
      <div className="border-warning bg-warning-bg mx-4 mt-3 flex items-start gap-2 rounded-md border px-3 py-2">
        <AlertTriangle className="text-warning-ink mt-0.5 size-4 shrink-0" aria-hidden />
        {ehPessoa ? (
          <p className="text-warning-ink text-sm">
            <strong>Não há desfazer.</strong> Os contatos são agrupados por nome
            idêntico, e em pessoa isso prova menos do que em empresa: na base,{" "}
            <strong>&ldquo;Gustavo&rdquo; aparece 20 vezes</strong> e são vinte pessoas
            de vinte empresas. Confira a <strong>organização</strong> de cada cadastro
            antes — é ela que responde se são a mesma pessoa. Contatos, vínculos,
            negócios, atividades e anotações passam para o cadastro principal.
          </p>
        ) : (
          <p className="text-warning-ink text-sm">
            <strong>Não há desfazer.</strong> Os cadastros são agrupados por nome, e nome
            igual não prova que é a mesma empresa — confira os negócios, as pessoas e a
            cidade de cada um antes. Tudo que a duplicada carrega passa para a principal;
            só o cadastro vazio é apagado.
          </p>
        )}
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-px lg:grid-cols-[22rem_minmax(0,1fr)]">
        {/* Coluna esquerda: os grupos */}
        <div className="lg:border-r lg:border-border flex flex-col p-4">
          <form action="/ferramentas/fusao-organizacoes" className="relative mb-3">
            {/* A aba viaja junto: sem isto, buscar do lado dos contatos
                jogaria de volta para as organizações. */}
            {ehPessoa && <input type="hidden" name="entidade" value="pessoas" />}
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

          {/* ⚠️ 668 grupos de 25 em 25 dão 27 páginas, e com "Anterior /
              Próxima" chegar ao fim custava 26 cliques. A querystring vai
              sem o parâmetro de página: quem monta cada endereço é o
              componente. */}
          {ultima > 1 && (
            <div className="mt-3">
              <Paginacao
                pagina={pagina}
                ultima={ultima}
                caminho="/ferramentas/fusao-organizacoes"
                consulta={consultaSemPagina}
              />
            </div>
          )}
        </div>

        {/* Coluna direita: o grupo escolhido */}
        <div className="min-w-0 p-4">
          {!chave ? (
            <p className="text-text-muted py-16 text-center text-sm">
              Escolha um grupo à esquerda.
            </p>
          ) : ehPessoa ? (
            <PainelGrupoPessoa nome={nomeGrupo} cadastros={cadastrosPessoa} />
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
                        {soma("anotacoes")} anot ·{" "}
                        {ehPessoa
                          ? `${soma("contatos")} cont · ${soma("organizacoes")} org`
                          : `${soma("pessoas")} pes`}
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

