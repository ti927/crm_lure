"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  ExternalLink,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Phone,
  X,
} from "lucide-react";
import { real, data as fdata, dataHora, linkWhatsApp, local } from "@/lib/formato";
import { EtiquetaStatus } from "@/components/dominio/etiquetas";
import { useFocoDialogo } from "@/components/dominio/usar-foco-dialogo";
import { detalheDoCadastro, type DetalheCadastro } from "./acoes";

/**
 * O cadastro inteiro em pop-up, dentro da ferramenta de fusão.
 *
 * ⚠️ Existe porque a decisão que a tela pede não é "qual carrega mais" —
 * isso as contagens já respondem. É **"é a mesma empresa?"**, e para
 * responder é preciso ver os nomes: quais pessoas, quais negócios, quais
 * atividades. Antes disto, conferir custava abrir a ficha da organização
 * em outra aba, ler, voltar, e repetir para cada um dos 18 cadastros de
 * "Amaral Group".
 *
 * ⚠️ Numa operação **sem desfazer**, encarecer a conferência é fazer com
 * que se confira menos. O pop-up é uma ida ao banco (~156 ms) contra uma
 * navegação inteira.
 *
 * ⚠️ Sem teto nas listas: um cadastro com 20 negócios é justamente aquele
 * em que cortar em seis esconderia o que decide.
 */
export function DialogoCadastro({
  id,
  aoFechar,
}: {
  id: string;
  aoFechar: () => void;
}) {
  const caixa = useFocoDialogo<HTMLDivElement>();
  const [d, setD] = useState<DetalheCadastro | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    detalheDoCadastro(id).then((r) => {
      if (!vivo) return;
      if (r.erro || !r.detalhe) setErro(r.erro ?? "Cadastro não encontrado.");
      else setD(r.detalhe);
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
        aria-label={d?.nome ?? "Cadastro"}
        className="bg-surface border-border animate-in fade-in zoom-in-95 my-auto w-full max-w-3xl rounded-lg border shadow-2xl duration-150"
      >
        <div className="border-border flex items-start justify-between gap-3 border-b px-5 py-4">
          <div className="min-w-0">
            {d ? (
              <>
                <h2 className="flex items-center gap-2 text-lg font-semibold leading-tight">
                  <Building2 className="text-text-muted size-4 shrink-0" aria-hidden />
                  <span className="truncate">{d.nome}</span>
                </h2>
                <p className="text-text-muted mt-0.5 flex flex-wrap items-center gap-x-3 text-sm">
                  <span className="font-mono text-xs">{d.id.slice(0, 8)}</span>
                  <span>criado {fdata(d.criado_em)}</span>
                  {local(d.cidade, d.uf) && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3" aria-hidden />
                      {local(d.cidade, d.uf)}
                    </span>
                  )}
                  {d.endereco && <span className="truncate">{d.endereco}</span>}
                  {d.website && (
                    <span className="inline-flex items-center gap-1">
                      <Globe className="size-3" aria-hidden />
                      {d.website}
                    </span>
                  )}
                  {d.bubble_id && <span>Bubble: {d.bubble_id}</span>}
                </p>
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

        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
          {erro && <p className="text-danger-ink text-sm">{erro}</p>}

          {!d && !erro && (
            <p className="text-text-muted flex items-center gap-2 py-8 text-sm">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Carregando…
            </p>
          )}

          {d && (
            <div className="flex flex-col gap-5">
              <Secao titulo={`Pessoas (${d.pessoas.length})`}>
                {d.pessoas.length === 0 ? (
                  <Vazio>Nenhuma pessoa vinculada.</Vazio>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {d.pessoas.map((p) => (
                      <li key={p.id} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-md font-medium">{p.nome}</span>
                        {p.cargo && (
                          <span className="text-text-muted text-sm">· {p.cargo}</span>
                        )}
                        {/* D-138: telefone abre o aplicativo, nunca `wa.me`. */}
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
                )}
              </Secao>

              <Secao titulo={`Negócios (${d.negocios.length})`}>
                {d.negocios.length === 0 ? (
                  <Vazio>Nenhum negócio.</Vazio>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {d.negocios.map((n) => (
                      <li
                        key={n.id}
                        className="border-border flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border px-3 py-2"
                      >
                        <span className="text-md min-w-0 flex-1 truncate font-medium">
                          {n.titulo}
                        </span>
                        <span className="text-text-muted shrink-0 text-sm">{n.etapa}</span>
                        <EtiquetaStatus status={n.status} />
                        <span className="tabular shrink-0 text-md font-medium">
                          {real(n.valor)}
                        </span>
                        <span className="text-text-muted w-full text-xs sm:w-auto">
                          {n.responsavel ?? "—"} · {fdata(n.criado_em)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Secao>

              <Secao titulo={`Atividades (${d.atividades.length})`}>
                {d.atividades.length === 0 ? (
                  <Vazio>Nenhuma atividade.</Vazio>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {d.atividades.map((a, i) => (
                      <li key={i} className="text-md flex items-center gap-2">
                        {/* Estado nunca é só cor: a data vem escrita ao lado
                            e a concluída fica esmaecida (Doc 08, B-076). */}
                        <span
                          className={`size-1.5 shrink-0 rounded-full ${
                            a.concluida ? "bg-success" : "bg-border-strong"
                          }`}
                          aria-hidden
                        />
                        <span
                          className={`truncate ${a.concluida ? "text-text-muted" : ""}`}
                        >
                          {a.rotulo}
                        </span>
                        <span className="text-text-muted ml-auto shrink-0 text-sm">
                          {a.responsavel ?? "—"}
                        </span>
                        <span className="text-text-muted tabular shrink-0 text-sm">
                          {fdata(a.data)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Secao>

              <Secao titulo={`Anotações (${d.anotacoes.length})`}>
                {d.anotacoes.length === 0 ? (
                  <Vazio>Nenhuma anotação.</Vazio>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {d.anotacoes.map((an, i) => (
                      <li key={i} className="border-border rounded-md border px-3 py-2">
                        <p className="text-md whitespace-pre-wrap">{an.texto}</p>
                        <p className="text-text-muted mt-1 text-xs">
                          {an.autor ?? "—"} · {dataHora(an.criado_em)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </Secao>
            </div>
          )}
        </div>

        <div className="border-border flex items-center justify-between gap-3 border-t px-5 py-3">
          <p className="text-text-muted text-xs">
            Conferência — nada aqui é editável.
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
              href={`/contatos/organizacoes/${id}`}
              target="_blank"
              className="h-control-md border-border hover:bg-surface-hover inline-flex items-center gap-1.5 rounded-md border px-3 text-md font-medium"
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

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-text-muted tracking-caps mb-1.5 text-xs font-semibold uppercase">
        {titulo}
      </h3>
      {children}
    </section>
  );
}

function Vazio({ children }: { children: React.ReactNode }) {
  return <p className="text-text-muted text-sm">{children}</p>;
}
