"use client";

import { useEffect, useState } from "react";
import {
  criarOrganizacao,
  editarOrganizacao,
  type DadosOrganizacao,
} from "./acoes";

export type OrganizacaoEdicao = {
  id: string;
  nome: string;
  cidade: string;
  website: string;
  bubbleId: string;
};

/**
 * Criar ou editar organização (B-090): nome, cidade, website e o
 * identificador do Bubble. Só o nome é obrigatório (schema).
 */
export function DialogoOrganizacao({
  edicao,
  aoFechar,
}: {
  edicao?: OrganizacaoEdicao;
  aoFechar: (r: { mudou: boolean; id?: string }) => void;
}) {
  const [nome, setNome] = useState(edicao?.nome ?? "");
  const [cidade, setCidade] = useState(edicao?.cidade ?? "");
  const [website, setWebsite] = useState(edicao?.website ?? "");
  const [bubbleId, setBubbleId] = useState(edicao?.bubbleId ?? "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const naTecla = (e: KeyboardEvent) =>
      e.key === "Escape" && aoFechar({ mudou: false });
    document.addEventListener("keydown", naTecla);
    return () => document.removeEventListener("keydown", naTecla);
  }, [aoFechar]);

  async function salvar() {
    setErro(null);
    setSalvando(true);
    const dados: DadosOrganizacao = { nome, cidade, website, bubbleId };
    const r = edicao
      ? await editarOrganizacao(edicao.id, dados)
      : await criarOrganizacao(dados);
    setSalvando(false);
    if (r?.erro) return setErro(r.erro);
    aoFechar({ mudou: true, id: edicao?.id ?? (r as { id?: string }).id });
  }

  const rotulo = "text-text-secondary mb-1 block text-sm font-medium";
  const campo =
    "h-control-md bg-surface border-border text-md w-full rounded-md border px-2.5";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && aoFechar({ mudou: false })}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-org"
        className="border-border bg-surface my-8 w-full max-w-md rounded-lg border p-5 shadow-xl"
      >
        <h2 id="titulo-org" className="text-lg font-semibold">
          {edicao ? "Editar organização" : "Nova organização"}
        </h2>

        <div className="mt-4 flex flex-col gap-4">
          <div>
            <label htmlFor="org-nome" className={rotulo}>
              Nome <span className="text-danger-ink">*</span>
            </label>
            <input
              id="org-nome"
              type="text"
              autoFocus
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className={campo}
            />
          </div>
          <div>
            <label htmlFor="org-cidade" className={rotulo}>
              Cidade
            </label>
            <input
              id="org-cidade"
              type="text"
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              className={campo}
            />
          </div>
          <div>
            <label htmlFor="org-site" className={rotulo}>
              Website
            </label>
            <input
              id="org-site"
              type="text"
              inputMode="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="exemplo.com.br"
              className={campo}
            />
          </div>
          <div>
            <label htmlFor="org-bubble" className={rotulo}>
              Identificador Bubble
            </label>
            <input
              id="org-bubble"
              type="text"
              value={bubbleId}
              onChange={(e) => setBubbleId(e.target.value)}
              className={campo}
            />
            <p className="text-text-muted mt-1 text-xs">
              Vínculo com o sistema interno, preenchido depois do Ganho.
            </p>
          </div>
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
            className="h-control-md bg-brand text-brand-on rounded-md px-4 text-md font-semibold disabled:opacity-40"
          >
            {salvando ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
