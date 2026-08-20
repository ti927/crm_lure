"use client";

import { useEffect, useState } from "react";
import { useFocoDialogo } from "@/components/dominio/usar-foco-dialogo";
import { useAviso } from "@/components/dominio/avisos";
import { criarPessoa, editarPessoa } from "./acoes";

/**
 * Criar ou editar pessoa. A pessoa em si só tem nome (D-036: o cargo mora
 * no vínculo, não na pessoa). Vínculos com organizações e formas de
 * contato se gerenciam na ficha, depois de criada.
 */
export function DialogoPessoa({
  edicao,
  aoFechar,
}: {
  edicao?: { id: string; nome: string };
  aoFechar: (r: { mudou: boolean; id?: string }) => void;
}) {
  const [nome, setNome] = useState(edicao?.nome ?? "");
  const caixaDialogo = useFocoDialogo<HTMLDivElement>();
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const avisar = useAviso();

  useEffect(() => {
    const naTecla = (e: KeyboardEvent) =>
      e.key === "Escape" && aoFechar({ mudou: false });
    document.addEventListener("keydown", naTecla);
    return () => document.removeEventListener("keydown", naTecla);
  }, [aoFechar]);

  async function salvar() {
    setErro(null);
    setSalvando(true);
    const r = edicao
      ? await editarPessoa(edicao.id, nome)
      : await criarPessoa(nome);
    setSalvando(false);
    if (r?.erro) return setErro(r.erro);
    avisar(edicao ? "Pessoa atualizada." : "Pessoa criada.");
    aoFechar({ mudou: true, id: edicao?.id ?? (r as { id?: string }).id });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && aoFechar({ mudou: false })}
    >
      <div
        ref={caixaDialogo}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-pessoa"
        className="border-border bg-surface my-8 w-full max-w-md rounded-lg border p-5 shadow-xl"
      >
        <h2 id="titulo-pessoa" className="text-lg font-semibold">
          {edicao ? "Editar pessoa" : "Nova pessoa"}
        </h2>

        <div className="mt-4">
          <label htmlFor="pessoa-nome" className="text-text-secondary mb-1 block text-sm font-medium">
            Nome <span className="text-danger-ink">*</span>
          </label>
          <input
            id="pessoa-nome"
            type="text"
            autoFocus
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && nome.trim() && void salvar()}
            className="h-control-md bg-surface border-border text-md w-full rounded-md border px-2.5"
          />
          {!edicao && (
            <p className="text-text-muted mt-1 text-xs">
              Organizações e formas de contato entram na ficha, a seguir.
            </p>
          )}
        </div>

        {erro && (
          <p role="alert" className="text-danger-ink mt-3 text-sm">
            {erro}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => aoFechar({ mudou: false })}
            className="h-control-md text-text-secondary hover:bg-surface-hover rounded-md px-3 text-md font-medium"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void salvar()}
            disabled={salvando || !nome.trim()}
            className="h-control-md bg-brand text-brand-on hover:bg-brand-hover active:bg-brand-active rounded-md px-4 text-md font-semibold disabled:opacity-40"
          >
            {salvando ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
