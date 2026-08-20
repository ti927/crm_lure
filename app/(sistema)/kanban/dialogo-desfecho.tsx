"use client";

import { useEffect, useState } from "react";
import { useFocoDialogo } from "@/components/dominio/usar-foco-dialogo";
import { Trophy, XCircle } from "lucide-react";
import type { Desfecho } from "./constantes";

/**
 * ⚠️ A trava de desfecho (D-047) — a unica trava do sistema.
 *
 * Entrar em "Aguardando Contrato" obriga a declarar Ganho ou Perdido, e
 * Perdido obriga o motivo. Fechar o dialogo cancela a transicao: o
 * negocio nao vai para a etapa (B-054).
 *
 * O seletor de cliente do Bubble que a D-076 previa aqui saiu do MVP por
 * decisao do maestro em 17/08/2026 — fica para fase final.
 */
export function DialogoDesfecho({
  titulo,
  motivos,
  aoConfirmar,
  aoCancelar,
}: {
  titulo: string;
  motivos: { id: string; nome: string }[];
  aoConfirmar: (d: Desfecho) => void;
  aoCancelar: () => void;
}) {
  const [escolha, setEscolha] = useState<"ganho" | "perdido" | null>(null);
  const caixaDialogo = useFocoDialogo<HTMLDivElement>();
  const [motivoId, setMotivoId] = useState("");

  // Esc cancela a transicao, como fechar no X.
  useEffect(() => {
    const naTecla = (e: KeyboardEvent) => e.key === "Escape" && aoCancelar();
    document.addEventListener("keydown", naTecla);
    return () => document.removeEventListener("keydown", naTecla);
  }, [aoCancelar]);

  const podeConcluir = escolha === "ganho" || (escolha === "perdido" && motivoId);

  const botao =
    "flex flex-1 items-center justify-center gap-2 rounded-md border py-2.5 text-md font-medium";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && aoCancelar()}
    >
      <div
        ref={caixaDialogo}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-desfecho"
        className="border-border bg-surface w-full max-w-md rounded-lg border p-5 shadow-xl"
      >
        <h2 id="titulo-desfecho" className="text-lg font-semibold">
          Qual foi o desfecho?
        </h2>
        <p className="text-text-secondary mt-1 text-sm">
          <span className="font-medium">{titulo}</span> está entrando em
          Aguardando Contrato. Declare o resultado para concluir.
        </p>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => setEscolha("ganho")}
            aria-pressed={escolha === "ganho"}
            className={`${botao} ${
              escolha === "ganho"
                ? "border-success bg-success-bg text-success-ink"
                : "border-border hover:bg-surface-hover"
            }`}
          >
            <Trophy className="size-4" aria-hidden />
            Ganho
          </button>
          <button
            type="button"
            onClick={() => setEscolha("perdido")}
            aria-pressed={escolha === "perdido"}
            className={`${botao} ${
              escolha === "perdido"
                ? "border-danger bg-danger-bg text-danger-ink"
                : "border-border hover:bg-surface-hover"
            }`}
          >
            <XCircle className="size-4" aria-hidden />
            Perdido
          </button>
        </div>

        {escolha === "perdido" && (
          <div className="mt-4">
            <label
              htmlFor="motivo"
              className="text-text-secondary mb-1 block text-sm font-medium"
            >
              Motivo da perda <span className="text-danger-ink">*</span>
            </label>
            <select
              id="motivo"
              autoFocus
              value={motivoId}
              onChange={(e) => setMotivoId(e.target.value)}
              className="h-control-md bg-surface border-border text-md w-full rounded-md border px-2.5"
            >
              <option value="">Escolha um motivo…</option>
              {motivos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </select>
            <p className="text-text-muted mt-1 text-sm">
              Obrigatório — é a informação que não dá para recuperar depois.
            </p>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={aoCancelar}
            className="h-control-md text-text-secondary hover:bg-surface-hover rounded-md px-3 text-md font-medium"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!podeConcluir}
            onClick={() =>
              aoConfirmar(
                escolha === "perdido"
                  ? { status: "perdido", motivoId }
                  : { status: "ganho" }
              )
            }
            className="h-control-md bg-brand text-brand-on hover:bg-brand-hover active:bg-brand-active rounded-md px-4 text-md font-semibold disabled:opacity-40"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
}
