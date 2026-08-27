"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CornerDownLeft } from "lucide-react";

/**
 * "Ir para a página N".
 *
 * ⚠️ Recebe **strings** e monta o endereço aqui dentro. Passar uma função
 * que gera o href seria mandar função para o cliente — a fronteira que já
 * derrubou este sistema três vezes (C-06, C-09, C-10), e que `tsc`,
 * `eslint` e `next build` não pegam.
 *
 * ⚠️ É `<form>` de verdade: Enter envia, e envia sem depender de JS. O
 * número é preso ao intervalo antes de navegar — digitar 99 numa lista de
 * 27 páginas leva à 27, e não a uma página vazia que parece fim de dados.
 */
export function IrParaPagina({
  ultima,
  caminho,
  consulta,
  paramPagina,
}: {
  ultima: number;
  caminho: string;
  consulta: string;
  paramPagina: string;
}) {
  const router = useRouter();
  const [valor, setValor] = useState("");

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(valor);
    if (!Number.isFinite(n) || n < 1) return;
    const alvo = Math.min(Math.max(Math.trunc(n), 1), ultima);

    const p = new URLSearchParams(consulta);
    if (alvo > 1) p.set(paramPagina, String(alvo));
    else p.delete(paramPagina);
    const s = p.toString();

    setValor("");
    router.push(s ? `${caminho}?${s}` : caminho);
  }

  return (
    <form onSubmit={enviar} className="ml-2 flex items-center gap-1">
      <label htmlFor="ir-pagina" className="text-text-muted text-sm">
        Ir para
      </label>
      <input
        id="ir-pagina"
        type="number"
        min={1}
        max={ultima}
        inputMode="numeric"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        placeholder={String(ultima)}
        aria-label={`Ir para a página, de 1 a ${ultima}`}
        className="h-control-sm bg-surface border-border tabular w-14 rounded-md border px-2 text-center text-sm"
      />
      <button
        type="submit"
        aria-label="Ir"
        disabled={valor.trim() === ""}
        className="h-control-sm border-border hover:bg-surface-hover inline-flex items-center justify-center rounded-md border px-1.5 disabled:opacity-40"
      >
        <CornerDownLeft className="size-3.5" aria-hidden />
      </button>
    </form>
  );
}
