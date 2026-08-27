"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  ExternalLink,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  X,
} from "lucide-react";
import { real, data as fdata, dataHora, linkWhatsApp } from "@/lib/formato";
import { EtiquetaEtapa, EtiquetaStatus } from "@/components/dominio/etiquetas";
import { AvatarUsuario } from "@/components/dominio/avatar-usuario";
import { useFocoDialogo } from "@/components/dominio/usar-foco-dialogo";
import { resumoDoNegocio, type ResumoNegocio } from "@/app/(sistema)/negocios/resumo";

/* ---------- contexto ---------- */

const Contexto = createContext<((id: string) => void) | null>(null);

/**
 * Prévia de negócio em pop-up.
 *
 * ⚠️ Existe porque a ficha completa faz **onze** idas ao banco — o
 * negócio mais seis listas de opções para os campos editáveis, mais
 * eventos, anotações, atividades e pessoas. Isso é o preço certo de uma
 * tela onde se EDITA; para analisar um negócio e passar ao próximo, é
 * peso que não se paga. A prévia faz **uma** ida (`negocio_resumo`), e a
 * restrição real deste sistema nunca foi custo de consulta: é número de
 * viagens ao pooler, ~150 ms cada.
 *
 * ⚠️ **O link continua sendo um link.** `LinkNegocio` intercepta só o
 * clique simples; Ctrl/Cmd/meio/Shift passam direto para a ficha, como em
 * qualquer lista. Trocar o `<a>` por um `<button>` teria custado abrir em
 * aba nova, que é justamente o que se faz quando se analisa muito.
 */
export function ProvedorPrevia({ children }: { children: ReactNode }) {
  const [id, setId] = useState<string | null>(null);

  const abrir = useCallback((negocioId: string) => setId(negocioId), []);

  return (
    <Contexto.Provider value={abrir}>
      {children}
      {/* ⚠️ `key={id}`: trocar de negócio REMONTA o diálogo, e o estado
          nasce vazio sozinho. Zerar por efeito seria `setState` dentro de
          efeito — renderização em cascata, e o compilador do React
          recusa com razão. */}
      {id && <Dialogo key={id} id={id} aoFechar={() => setId(null)} />}
    </Contexto.Provider>
  );
}

/**
 * Abre a prévia por código — para quem não é um link, como o cartão
 * arrastável do Kanban. Devolve uma função inerte fora do provedor.
 */
export function usePrevia() {
  const abrir = useContext(Contexto);
  return useCallback((id: string) => abrir?.(id), [abrir]);
}

/**
 * Link para o negócio que abre a prévia no clique simples.
 *
 * Fora de um `ProvedorPrevia` ele é apenas um link — assim a mesma peça
 * serve telas que ainda não têm a prévia, sem quebrar.
 */
export function LinkNegocio({
  id,
  href,
  className,
  children,
}: {
  id: string;
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const abrir = useContext(Contexto);

  function aoClicar(e: MouseEvent<HTMLAnchorElement>) {
    if (!abrir) return;
    // Modificador ou botão do meio: é pedido explícito de nova aba.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    abrir(id);
  }

  return (
    <Link href={href} onClick={aoClicar} className={className}>
      {children}
    </Link>
  );
}

/* ---------- o pop-up ---------- */

function Dialogo({ id, aoFechar }: { id: string; aoFechar: () => void }) {
  const caixa = useFocoDialogo<HTMLDivElement>();
  const [r, setR] = useState<ResumoNegocio | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    resumoDoNegocio(id).then((resp) => {
      if (!vivo) return;
      if (resp.erro || !resp.resumo) setErro(resp.erro ?? "Negócio não encontrado.");
      else setR(resp.resumo);
    });
    return () => {
      vivo = false;
    };
  }, [id]);

  useEffect(() => {
    const naTecla = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    document.addEventListener("keydown", naTecla);
    return () => document.removeEventListener("keydown", naTecla);
  }, [aoFechar]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center"
      onClick={(e) => e.target === e.currentTarget && aoFechar()}
    >
      <div
        ref={caixa}
        role="dialog"
        aria-modal="true"
        aria-label={r?.titulo ?? "Prévia do negócio"}
        className="bg-surface border-border animate-in fade-in zoom-in-95 my-auto w-full max-w-3xl rounded-lg border shadow-2xl duration-150"
      >
        {/* ---------- cabeçalho ---------- */}
        <div className="border-border flex items-start justify-between gap-3 border-b px-5 py-4">
          <div className="min-w-0">
            {r ? (
              <>
                <h2 className="text-lg font-semibold leading-tight">{r.titulo}</h2>
                {r.organizacao && (
                  <Link
                    href={`/contatos/organizacoes/${r.organizacao.id}`}
                    className="text-text-secondary hover:text-text mt-0.5 inline-flex items-center gap-1.5 text-md"
                  >
                    <Building2 className="size-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{r.organizacao.nome}</span>
                    {r.organizacao.cidade && (
                      <span className="text-text-muted">· {r.organizacao.cidade}</span>
                    )}
                  </Link>
                )}
              </>
            ) : (
              <div className="bg-surface-sunken h-6 w-64 animate-pulse rounded" />
            )}
          </div>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="text-text-muted hover:bg-surface-hover hover:text-text shrink-0 rounded-md p-1.5"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        {/* ---------- corpo ---------- */}
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
          {erro && <p className="text-danger-ink text-sm">{erro}</p>}

          {!r && !erro && (
            <p className="text-text-muted flex items-center gap-2 py-8 text-sm">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Carregando…
            </p>
          )}

          {r && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="tabular text-xl font-semibold">{real(r.valor)}</span>
                <EtiquetaEtapa nome={r.etapa?.nome} ordem={r.etapa?.ordem} />
                <EtiquetaStatus status={r.status} />
                {r.responsavel && (
                  <span className="text-text-secondary ml-auto flex items-center gap-1.5 text-md">
                    <AvatarUsuario
                      nome={r.responsavel.nome}
                      foto={r.responsavel.foto_url}
                      tamanho="sm"
                    />
                    {r.responsavel.nome}
                  </span>
                )}
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
                <Campo rotulo="Origem" valor={r.origem} />
                <Campo rotulo="Produto" valor={r.produto} />
                <Campo rotulo="Criado em" valor={fdata(r.criado_em)} />
                <Campo
                  rotulo={r.status === "ganho" ? "Ganho em" : "Fechado em"}
                  valor={r.fechado_em ? fdata(r.fechado_em) : null}
                />
                {r.motivo_perda && (
                  <div className="col-span-2 sm:col-span-4">
                    <Campo rotulo="Motivo da perda" valor={r.motivo_perda} destaque />
                  </div>
                )}
              </dl>

              {r.pessoas.length > 0 && (
                <Secao titulo={`Pessoas (${r.pessoas.length})`}>
                  <ul className="flex flex-col gap-2">
                    {r.pessoas.map((p) => (
                      <li key={p.id} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <Link
                          href={`/contatos/pessoas/${p.id}`}
                          className="text-md hover:text-brand-ink font-medium hover:underline"
                        >
                          {p.nome}
                        </Link>
                        {p.cargo && (
                          <span className="text-text-muted text-sm">· {p.cargo}</span>
                        )}
                        {/* D-138: o telefone abre o aplicativo, nunca `wa.me` */}
                        {p.contatos.map((c, i) =>
                          c.tipo === "telefone" ? (
                            <a
                              key={i}
                              href={linkWhatsApp(c.valor)}
                              className="border-border hover:border-brand-ink inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-sm"
                            >
                              <Phone className="size-3" aria-hidden />
                              {c.valor}
                            </a>
                          ) : (
                            <a
                              key={i}
                              href={`mailto:${c.valor}`}
                              className="border-border hover:border-brand-ink inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-sm"
                            >
                              <Mail className="size-3 shrink-0" aria-hidden />
                              <span className="truncate">{c.valor}</span>
                            </a>
                          )
                        )}
                      </li>
                    ))}
                  </ul>
                </Secao>
              )}

              {r.atividades.length > 0 && (
                <Secao
                  titulo={`Atividades (${r.total_atividades})`}
                  nota={r.total_atividades > r.atividades.length ? "as 6 mais próximas" : undefined}
                >
                  <ul className="flex flex-col gap-1">
                    {r.atividades.map((a, i) => (
                      <li key={i} className="text-md flex items-center gap-2">
                        <span
                          className={`size-1.5 shrink-0 rounded-full ${
                            a.concluida ? "bg-success" : "bg-border-strong"
                          }`}
                          aria-hidden
                        />
                        <span className={`truncate ${a.concluida ? "text-text-muted" : ""}`}>
                          {a.rotulo}
                        </span>
                        <span className="text-text-muted tabular ml-auto shrink-0 text-sm">
                          {fdata(a.data)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Secao>
              )}

              {r.anotacoes.length > 0 && (
                <Secao
                  titulo={`Anotações (${r.total_anotacoes})`}
                  nota={r.total_anotacoes > r.anotacoes.length ? "as 3 últimas" : undefined}
                >
                  <ul className="flex flex-col gap-2">
                    {r.anotacoes.map((an, i) => (
                      <li key={i} className="border-border rounded-md border px-3 py-2">
                        <p className="text-md whitespace-pre-wrap">{an.texto}</p>
                        <p className="text-text-muted mt-1 flex items-center gap-1 text-xs">
                          <MessageSquare className="size-3" aria-hidden />
                          {an.autor ?? "—"} · {dataHora(an.criado_em)}
                        </p>
                      </li>
                    ))}
                  </ul>
                </Secao>
              )}

              {r.eventos.length > 0 && (
                <Secao titulo="Linha do tempo">
                  <ul className="flex flex-col gap-1">
                    {r.eventos.map((ev, i) => (
                      <li
                        key={i}
                        className="text-text-secondary flex flex-wrap items-center gap-x-2 text-sm"
                      >
                        <span className="text-text font-medium capitalize">{ev.tipo}</span>
                        {ev.de && <span className="text-text-muted">{ev.de}</span>}
                        <ArrowRight className="text-text-muted size-3" aria-hidden />
                        <span>{ev.para ?? "—"}</span>
                        <span className="text-text-muted ml-auto text-xs">
                          {ev.importado_do_pipedrive ? "Pipedrive · " : ""}
                          {ev.autor ?? "—"} · {dataHora(ev.ocorrido_em)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Secao>
              )}
            </div>
          )}
        </div>

        {/* ---------- rodapé ---------- */}
        <div className="border-border flex items-center justify-between gap-3 border-t px-5 py-3">
          <p className="text-text-muted text-xs">
            Prévia — para editar, abra a ficha.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={aoFechar}
              className="h-control-md border-border hover:bg-surface-hover rounded-md border px-3 text-md font-medium"
            >
              Fechar
            </button>
            <Link
              href={`/negocios/${id}`}
              className="h-control-md bg-brand text-brand-on hover:bg-brand-hover inline-flex items-center gap-1.5 rounded-md px-3 text-md font-semibold"
            >
              Abrir ficha
              <ExternalLink className="size-3.5" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Campo({
  rotulo,
  valor,
  destaque,
}: {
  rotulo: string;
  valor: string | null;
  destaque?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-text-muted tracking-caps text-2xs font-semibold uppercase">
        {rotulo}
      </dt>
      <dd className={`text-md truncate ${destaque ? "text-danger-ink font-medium" : ""}`}>
        {valor || "—"}
      </dd>
    </div>
  );
}

function Secao({
  titulo,
  nota,
  children,
}: {
  titulo: string;
  nota?: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h3 className="text-text-muted tracking-caps mb-1.5 flex items-baseline gap-2 text-xs font-semibold uppercase">
        {titulo}
        {nota && <span className="normal-case tracking-normal opacity-70">{nota}</span>}
      </h3>
      {children}
    </section>
  );
}
