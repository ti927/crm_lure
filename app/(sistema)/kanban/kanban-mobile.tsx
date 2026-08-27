"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Building2 } from "lucide-react";
import { real } from "@/lib/formato";
import { EtiquetaStatus, faixaDaEtapa } from "@/components/dominio/etiquetas";
import { AvatarUsuario } from "@/components/dominio/avatar-usuario";
import { maisDaEtapa } from "./acoes";
import type { ColunaEtapa, Cartao } from "./consulta";

const POR_VEZ = 20;

/**
 * Kanban no celular: uma etapa por vez, com seletor (B-112).
 *
 * ⚠️ **Sem arrastar**, por decisão da D-097 — o celular é consulta e
 * marcação. Arrastar cartão entre colunas numa tela de 390px, com a trava
 * de desfecho no meio do caminho, é onde o erro acontece: um deslize
 * involuntário move um negócio de etapa e dispara o diálogo obrigatório.
 * Quem precisa mover, move pelo computador ou pela barra de etapas da
 * própria ficha, que continua funcionando aqui.
 */
export function KanbanMobile({
  colunas,
  responsavelId,
  termo,
}: {
  colunas: ColunaEtapa[];
  responsavelId?: string;
  /** Termo da barra de busca — precisa vir junto para que "carregar
   *  mais" continue dentro do mesmo recorte. */
  termo?: string;
}) {
  const [indice, setIndice] = useState(0);
  const [extras, setExtras] = useState<Record<string, Cartao[]>>({});
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (colunas.length === 0) return null;

  const coluna = colunas[Math.min(indice, colunas.length - 1)];
  const cartoes = [...coluna.cartoes, ...(extras[coluna.id] ?? [])];
  const faltam = coluna.total - cartoes.length;

  async function carregarMais() {
    setCarregando(true);
    setErro(null);
    const r = await maisDaEtapa(
      coluna.id,
      cartoes.length,
      POR_VEZ,
      responsavelId,
      termo
    );
    setCarregando(false);
    if (r.erro) return setErro(r.erro);
    setExtras((e) => ({
      ...e,
      [coluna.id]: [...(e[coluna.id] ?? []), ...(r.cartoes as Cartao[])],
    }));
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col md:hidden">
      {/* Seletor de etapa: as setas andam uma a uma e a lista suspensa
          pula direto, para não obrigar a passar por cinco etapas. */}
      <div className="border-border bg-surface flex shrink-0 items-center gap-2 border-b px-3 py-2">
        <button
          type="button"
          onClick={() => setIndice((i) => Math.max(0, i - 1))}
          disabled={indice === 0}
          aria-label="Etapa anterior"
          className="border-border hover:bg-surface-hover inline-flex size-9 shrink-0 items-center justify-center rounded-md border disabled:opacity-30"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </button>

        <select
          value={coluna.id}
          onChange={(e) =>
            setIndice(colunas.findIndex((c) => c.id === e.target.value))
          }
          aria-label="Escolher etapa"
          className="h-control-lg bg-surface border-border text-md min-w-0 flex-1 rounded-md border px-2 font-medium"
        >
          {colunas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome} ({c.total})
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setIndice((i) => Math.min(colunas.length - 1, i + 1))}
          disabled={indice >= colunas.length - 1}
          aria-label="Próxima etapa"
          className="border-border hover:bg-surface-hover inline-flex size-9 shrink-0 items-center justify-center rounded-md border disabled:opacity-30"
        >
          <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>

      {erro && (
        <p role="alert" className="text-danger-ink px-4 py-2 text-sm">
          {erro}
        </p>
      )}

      <ul className="min-h-0 flex-1 overflow-y-auto">
        {cartoes.length === 0 && (
          <li className="text-text-muted px-4 py-16 text-center text-sm">
            {termo
              ? `Nada nesta etapa para “${termo}”.`
              : "Nenhum negócio nesta etapa."}
          </li>
        )}
        {cartoes.map((c, i) => (
          <li
            key={c.id}
            style={{ animationDelay: `${Math.min(i, 10) * 24}ms` }}
            className="animate-in fade-in fill-mode-backwards duration-300"
          >
            <Link
              href={`/negocios/${c.id}?de=kanban`}
              className={`border-border hover:bg-surface-hover active:bg-surface-hover faixa-etapa flex flex-col gap-1.5 border-b px-4 py-3 ${faixaDaEtapa(
                coluna.ordem
              )}`}
            >
              <span className="flex items-start justify-between gap-3">
                <span className="text-md min-w-0 flex-1 font-medium leading-snug">
                  {c.titulo}
                </span>
                <span className="tabular shrink-0 text-md font-semibold">
                  {real(c.valor)}
                </span>
              </span>
              {c.organizacao?.nome && (
                <span className="text-text-secondary flex min-w-0 items-center gap-1.5 text-sm">
                  <Building2 className="size-3.5 shrink-0" aria-hidden />
                  <span className="truncate">{c.organizacao.nome}</span>
                </span>
              )}
              <span className="flex items-center gap-2">
                <EtiquetaStatus status={c.status} />
                {c.usuario && (
                  <span className="ml-auto">
                    <AvatarUsuario
                      nome={c.usuario.nome}
                      foto={c.usuario.foto_url}
                      tamanho="sm"
                    />
                  </span>
                )}
              </span>
            </Link>
          </li>
        ))}

        {faltam > 0 && (
          <li className="p-3">
            <button
              type="button"
              onClick={() => void carregarMais()}
              disabled={carregando}
              className="border-border text-text-secondary hover:bg-surface-hover h-control-lg w-full rounded-md border border-dashed text-sm disabled:opacity-50"
            >
              {carregando
                ? "Carregando…"
                : `Carregar mais ${Math.min(POR_VEZ, faltam)} de ${faltam.toLocaleString("pt-BR")}`}
            </button>
          </li>
        )}
      </ul>
    </div>
  );
}
