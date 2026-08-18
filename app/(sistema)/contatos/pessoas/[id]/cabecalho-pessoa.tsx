"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { DialogoPessoa } from "../../dialogo-pessoa";
import { excluirPessoa } from "../../acoes";

/** Nome da pessoa com editar e excluir (B-094: exclusão leva vínculos e
 *  formas de contato por cascata). */
export function CabecalhoPessoa({ pessoa }: { pessoa: { id: string; nome: string } }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function excluir() {
    setErro(null);
    setExcluindo(true);
    const r = await excluirPessoa(pessoa.id);
    setExcluindo(false);
    if (r?.erro) {
      setConfirmando(false);
      return setErro(r.erro);
    }
    router.push("/contatos?aba=pessoas");
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">{pessoa.nome}</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="h-control-md border-border hover:bg-surface-hover inline-flex items-center gap-1.5 rounded-md border px-3 text-sm font-medium"
          >
            <Pencil className="size-3.5" aria-hidden />
            Editar
          </button>
          <button
            type="button"
            onClick={() => setConfirmando(true)}
            className="h-control-md text-danger-ink hover:bg-danger-bg inline-flex items-center gap-1.5 rounded-md px-3 text-sm font-medium"
          >
            <Trash2 className="size-3.5" aria-hidden />
            Excluir
          </button>
        </div>
      </div>

      {erro && (
        <p role="alert" className="bg-danger-bg text-danger-ink mt-2 rounded-md px-3 py-2 text-sm">
          {erro}
        </p>
      )}

      {editando && (
        <DialogoPessoa
          edicao={pessoa}
          aoFechar={(r) => {
            setEditando(false);
            if (r.mudou) router.refresh();
          }}
        />
      )}

      {confirmando && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(e) => e.target === e.currentTarget && setConfirmando(false)}
        >
          <div role="dialog" aria-modal="true" className="border-border bg-surface w-full max-w-md rounded-lg border p-5 shadow-xl">
            <h2 className="text-lg font-semibold">Excluir pessoa?</h2>
            <p className="text-text-secondary mt-1 text-md">
              <span className="font-medium">{pessoa.nome}</span> será removida, junto
              dos vínculos com organizações e das formas de contato.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmando(false)}
                className="h-control-md text-text-secondary hover:bg-surface-hover rounded-md px-3 text-md font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void excluir()}
                disabled={excluindo}
                className="h-control-md bg-danger text-text-inverse rounded-md px-4 text-md font-semibold disabled:opacity-50"
              >
                {excluindo ? "Excluindo…" : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
