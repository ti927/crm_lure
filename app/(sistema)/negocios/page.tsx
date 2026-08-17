import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { real, data, texto } from "@/lib/formato";
import {
  EtiquetaStatus,
  EtiquetaEtapa,
  faixaDaEtapa,
} from "@/components/dominio/etiquetas";
import { UsuarioComFoto } from "@/components/dominio/avatar-usuario";
import { Filtros } from "./filtros";
import { AlternaVisao } from "./alterna-visao";
import {
  COLUNAS,
  POR_PAGINA,
  ESCONDE_CLASSE,
  LIMITE_ORGANIZACOES,
} from "./colunas";
import type { Database } from "@/lib/supabase/types";

type Status = Database["public"]["Enums"]["status_negocio"];
type Nomeado = { nome: string } | null;

/* Forma da linha depois dos vinculos. Declarada a mao e aplicada com
   .returns<>() porque a inferencia do supabase-js sobre embutidos varia
   conforme o join seja inner ou nao, e aqui ele e inner. */
type LinhaNegocio = {
  id: string;
  titulo: string;
  valor: number | null;
  status: Status;
  criado_em: string;
  organizacao: Nomeado;
  etapa: { nome: string; ordem: number } | null;
  origem: Nomeado;
  produto: Nomeado;
  usuario: { nome: string; foto_url: string | null } | null;
  motivo_perda: Nomeado;
};

const SELECAO = `
  id, titulo, valor, status, criado_em,
  organizacao!inner(nome),
  etapa(nome, ordem),
  origem(nome),
  produto(nome),
  usuario(nome, foto_url),
  motivo_perda(nome)
`;

type Busca = Promise<Record<string, string | string[] | undefined>>;

const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function PaginaNegocios({
  searchParams,
}: {
  searchParams: Busca;
}) {
  const p = await searchParams;
  const busca = um(p.busca)?.trim() ?? "";
  const status = um(p.status) ?? "";
  const etapaId = um(p.etapa) ?? "";
  const responsavelId = um(p.responsavel) ?? "";
  const ordenarPor = um(p.ordenar) ?? "criado_em";
  const crescente = um(p.dir) === "asc";
  const pagina = Math.max(1, Number(um(p.pagina) ?? 1) || 1);

  // Coluna de ordenacao vem da URL: so vale se estiver na lista fixa.
  // Sem esta checagem, `?ordenar=` arbitrario vira expressao no PostgREST.
  const coluna =
    COLUNAS.find((c) => c.chave === ordenarPor) ??
    COLUNAS.find((c) => c.chave === "criado_em")!;

  const supabase = await createClient();

  /*
   * Busca por titulo OU organizacao (Doc 10, F3), em dois passos.
   *
   * ⚠️ Nao da para escrever
   *      or=(titulo.ilike.*x*,organizacao.nome.ilike.*x*)
   * O PostgREST aceita coluna de tabela vinculada como filtro isolado, e
   * aceita `or` entre colunas proprias, mas NAO aceita coluna vinculada
   * dentro de um `or`: devolve PGRST100 "failed to parse logic tree".
   * Verificado contra o PostgREST deste projeto, nao suposto.
   *
   * Entao os ids das organizacoes que casam saem antes, numa consulta a
   * parte, e entram no `or` como `organizacao_id.in.(...)` — que e coluna
   * propria de negocio. Sao 422 organizacoes na base real: a consulta e
   * barata e a lista de ids cabe na URL.
   */
  const termo = busca.replace(/[%,()]/g, " ");
  let idsOrganizacao: string[] = [];

  if (termo) {
    const { data: orgs } = await supabase
      .from("organizacao")
      .select("id")
      .ilike("nome", `%${termo}%`)
      .limit(LIMITE_ORGANIZACOES);
    idsOrganizacao = (orgs ?? []).map((o) => o.id);
  }

  let consulta = supabase
    .from("negocio")
    .select(SELECAO, { count: "exact" })
    .order(coluna.ordenacao, { ascending: crescente, nullsFirst: false });

  if (termo) {
    const alvos = [`titulo.ilike.%${termo}%`];
    if (idsOrganizacao.length > 0) {
      alvos.push(`organizacao_id.in.(${idsOrganizacao.join(",")})`);
    }
    consulta = consulta.or(alvos.join(","));
  }
  if (status) consulta = consulta.eq("status", status as Status);
  if (etapaId) consulta = consulta.eq("etapa_id", etapaId);
  if (responsavelId) consulta = consulta.eq("responsavel_id", responsavelId);

  const inicio = (pagina - 1) * POR_PAGINA;
  const { data: linhas, count, error } = await consulta
    .range(inicio, inicio + POR_PAGINA - 1)
    .returns<LinhaNegocio[]>();

  const { data: etapas } = await supabase
    .from("etapa")
    .select("id, nome, ordem")
    .order("ordem");

  // Só quem está ativo entra no filtro: ex-integrante continua existindo
  // como responsável de negócio antigo (D-084), mas não faz sentido
  // oferecê-lo como opção de recorte novo.
  const { data: usuarios } = await supabase
    .from("usuario")
    .select("id, nome, foto_url")
    .eq("ativo", true)
    .order("nome");

  const total = count ?? 0;
  const ultimaPagina = Math.max(1, Math.ceil(total / POR_PAGINA));

  /** Preserva os demais parametros ao trocar um deles. */
  function comParametros(troca: Record<string, string | null>) {
    const q = new URLSearchParams();
    if (busca) q.set("busca", busca);
    if (status) q.set("status", status);
    if (etapaId) q.set("etapa", etapaId);
    if (responsavelId) q.set("responsavel", responsavelId);
    if (ordenarPor !== "criado_em") q.set("ordenar", ordenarPor);
    if (crescente) q.set("dir", "asc");
    if (pagina > 1) q.set("pagina", String(pagina));
    for (const [k, v] of Object.entries(troca)) {
      if (v === null) q.delete(k);
      else q.set(k, v);
    }
    const s = q.toString();
    return s ? `/negocios?${s}` : "/negocios";
  }

  const celula = "px-3 align-middle";

  return (
    <div className="flex h-full min-w-0 flex-col">
      <div className="border-border flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Negócios</h1>
          <p className="text-text-muted text-sm">
            {total === 0
              ? "Nenhum negócio"
              : `${total.toLocaleString("pt-BR")} ${total === 1 ? "negócio" : "negócios"}`}
            {total > POR_PAGINA && ` · página ${pagina} de ${ultimaPagina}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AlternaVisao atual="lista" />
          <Filtros etapas={etapas ?? []} usuarios={usuarios ?? []} />
        </div>
      </div>

      {error ? (
        <div className="m-4 rounded-md bg-danger-bg px-4 py-3">
          <p className="text-danger-ink text-md font-medium">
            Não foi possível carregar os negócios.
          </p>
          <p className="text-danger-ink mt-1 font-mono text-xs">
            {error.code} — {error.message}
          </p>
        </div>
      ) : (
        <>
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full border-collapse text-base">
              <thead className="bg-surface-sunken sticky top-0 z-20">
                <tr>
                  {COLUNAS.map((c) => {
                    const ativa = c.chave === ordenarPor;
                    const proximaDir = ativa && crescente ? null : "asc";
                    const Icone = !ativa
                      ? ChevronsUpDown
                      : crescente
                        ? ArrowUp
                        : ArrowDown;
                    return (
                      <th
                        key={c.chave}
                        scope="col"
                        aria-sort={
                          ativa
                            ? crescente
                              ? "ascending"
                              : "descending"
                            : "none"
                        }
                        className={`border-border h-9 border-b text-left font-semibold ${
                          c.esconde ? ESCONDE_CLASSE[c.esconde] : ""
                        }`}
                      >
                        <Link
                          href={comParametros({
                            ordenar: c.chave,
                            dir: proximaDir,
                            pagina: null,
                          })}
                          className={`hover:text-text flex h-9 items-center gap-1 px-3 text-xs uppercase tracking-caps ${
                            c.numerica ? "justify-end" : ""
                          } ${ativa ? "text-text" : "text-text-muted"}`}
                        >
                          {c.rotulo}
                          <Icone className="size-3 shrink-0" aria-hidden />
                        </Link>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {(linhas ?? []).map((n) => (
                  <tr
                    key={n.id}
                    className="border-border hover:bg-surface-hover border-b"
                  >
                    {/* A faixa de cor da etapa acompanha o nome escrito na
                        coluna Etapa — nunca substitui (B-076). */}
                    <td
                      className={`h-row-cozy faixa-etapa max-w-[22rem] truncate font-medium ${celula} ${faixaDaEtapa(
                        n.etapa?.ordem
                      )}`}
                    >
                      {n.titulo}
                    </td>
                    <td className={`${celula} max-w-[16rem] truncate`}>
                      {texto(n.organizacao?.nome)}
                    </td>
                    <td className={`${celula} tabular whitespace-nowrap text-right`}>
                      {real(n.valor)}
                    </td>
                    <td className={`${celula} whitespace-nowrap`}>
                      <EtiquetaEtapa
                        nome={n.etapa?.nome}
                        ordem={n.etapa?.ordem}
                      />
                    </td>
                    <td className={celula}>
                      <EtiquetaStatus status={n.status} />
                    </td>
                    <td className={`${celula} ${ESCONDE_CLASSE.lg} truncate`}>
                      {texto(n.origem?.nome)}
                    </td>
                    <td className={`${celula} ${ESCONDE_CLASSE.lg} truncate`}>
                      {texto(n.produto?.nome)}
                    </td>
                    <td className={`${celula} ${ESCONDE_CLASSE.md} truncate`}>
                      {n.usuario ? (
                        <UsuarioComFoto
                          nome={n.usuario.nome}
                          foto={n.usuario.foto_url}
                          tamanho="sm"
                        />
                      ) : (
                        texto(null)
                      )}
                    </td>
                    <td className={`${celula} ${ESCONDE_CLASSE.xl} truncate`}>
                      {texto(n.motivo_perda?.nome)}
                    </td>
                    <td
                      className={`${celula} ${ESCONDE_CLASSE.md} tabular whitespace-nowrap`}
                    >
                      {data(n.criado_em)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {total === 0 && (
              <div className="px-4 py-16 text-center">
                <p className="text-text-secondary text-md font-medium">
                  {busca || status || etapaId || responsavelId
                    ? "Nenhum negócio corresponde aos filtros."
                    : "A base ainda não tem negócios."}
                </p>
                <p className="text-text-muted mt-1 text-sm">
                  {busca || status || etapaId || responsavelId
                    ? "Ajuste ou limpe os filtros acima."
                    : "Nenhum negócio cadastrado."}
                </p>
              </div>
            )}
          </div>

          {ultimaPagina > 1 && (
            <div className="border-border bg-surface flex shrink-0 items-center justify-between gap-3 border-t px-4 py-2">
              <span className="text-text-muted text-sm">
                {inicio + 1}–{Math.min(inicio + POR_PAGINA, total)} de{" "}
                {total.toLocaleString("pt-BR")}
              </span>
              <div className="flex gap-1">
                <Paginacao
                  href={comParametros({ pagina: String(pagina - 1) })}
                  desabilitado={pagina <= 1}
                >
                  Anterior
                </Paginacao>
                <Paginacao
                  href={comParametros({ pagina: String(pagina + 1) })}
                  desabilitado={pagina >= ultimaPagina}
                >
                  Próxima
                </Paginacao>
              </div>
            </div>
          )}
        </>
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
    return (
      <span aria-disabled className={`${base} text-text-muted opacity-50`}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className={`${base} hover:bg-surface-hover`}>
      {children}
    </Link>
  );
}
