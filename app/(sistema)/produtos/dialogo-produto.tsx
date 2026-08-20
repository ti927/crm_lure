"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useAviso } from "@/components/dominio/avisos";
import { useFocoDialogo } from "@/components/dominio/usar-foco-dialogo";
import { criarProduto, editarProduto, excluirProduto, criarArea } from "./acoes";

export type Area = { id: string; nome: string };
export type ProdutoEdicao = { id: string; nome: string; areaId: string | null };

/** Cadastro de produto: nome e área (B-096). Um produto por negócio (D-032). */
export function DialogoProduto({
  edicao,
  areas,
  aoFechar,
}: {
  edicao?: ProdutoEdicao;
  areas: Area[];
  aoFechar: (mudou: boolean) => void;
}) {
  const [nome, setNome] = useState(edicao?.nome ?? "");
  const caixaDialogo = useFocoDialogo<HTMLDivElement>();
  const [areaId, setAreaId] = useState(edicao?.areaId ?? "");
  const [areaNova, setAreaNova] = useState("");
  const [criandoArea, setCriandoArea] = useState(false);
  const [lista, setLista] = useState(areas);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const avisar = useAviso();

  useEffect(() => {
    const naTecla = (e: KeyboardEvent) => e.key === "Escape" && aoFechar(false);
    document.addEventListener("keydown", naTecla);
    return () => document.removeEventListener("keydown", naTecla);
  }, [aoFechar]);

  async function adicionarArea() {
    setErro(null);
    const r = await criarArea(areaNova);
    if (r?.erro) return setErro(r.erro);
    const area = (r as { area?: Area }).area;
    if (area) {
      setLista((l) => [...l, area].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")));
      setAreaId(area.id);
    }
    setAreaNova("");
    setCriandoArea(false);
    avisar("Área criada.");
  }

  async function salvar() {
    setErro(null);
    setSalvando(true);
    const r = edicao
      ? await editarProduto(edicao.id, nome, areaId || null)
      : await criarProduto(nome, areaId || null);
    setSalvando(false);
    if (r?.erro) return setErro(r.erro);
    avisar(edicao ? "Produto atualizado." : "Produto criado.");
    aoFechar(true);
  }

  async function excluir() {
    if (!edicao) return;
    setErro(null);
    setExcluindo(true);
    const r = await excluirProduto(edicao.id);
    setExcluindo(false);
    if (r?.erro) return setErro(r.erro);
    avisar("Produto excluído.");
    aoFechar(true);
  }

  const rotulo = "text-text-secondary mb-1 block text-sm font-medium";
  const campo =
    "h-control-md bg-surface border-border text-md w-full rounded-md border px-2.5";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && aoFechar(false)}
    >
      <div
        ref={caixaDialogo}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-produto"
        className="border-border bg-surface my-8 w-full max-w-md rounded-lg border p-5 shadow-xl"
      >
        <h2 id="titulo-produto" className="text-lg font-semibold">
          {edicao ? "Editar produto" : "Novo produto"}
        </h2>

        <div className="mt-4 flex flex-col gap-4">
          <div>
            <label htmlFor="prod-nome" className={rotulo}>
              Nome <span className="text-danger-ink">*</span>
            </label>
            <input
              id="prod-nome"
              type="text"
              autoFocus
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Consultoria em Gestão da Estratégia…"
              className={campo}
            />
          </div>

          <div>
            <label htmlFor="prod-area" className={rotulo}>
              Área
            </label>
            {criandoArea ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  autoFocus
                  value={areaNova}
                  onChange={(e) => setAreaNova(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && areaNova.trim()) {
                      e.preventDefault();
                      void adicionarArea();
                    }
                  }}
                  placeholder="Nome da área"
                  aria-label="Nome da nova área"
                  className={campo}
                />
                <button
                  type="button"
                  onClick={() => void adicionarArea()}
                  disabled={!areaNova.trim()}
                  className="h-control-md border-border hover:bg-surface-hover shrink-0 rounded-md border px-3 text-sm font-medium disabled:opacity-40"
                >
                  Criar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCriandoArea(false);
                    setAreaNova("");
                  }}
                  className="h-control-md text-text-secondary hover:bg-surface-hover shrink-0 rounded-md px-2 text-sm"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <select
                  id="prod-area"
                  value={areaId}
                  onChange={(e) => setAreaId(e.target.value)}
                  className={campo}
                >
                  <option value="">Sem área</option>
                  {lista.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nome}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setCriandoArea(true)}
                  aria-label="Nova área"
                  title="Nova área"
                  className="h-control-md border-border hover:bg-surface-hover inline-flex shrink-0 items-center rounded-md border px-2.5"
                >
                  <Plus className="size-4" aria-hidden />
                </button>
              </div>
            )}
            {lista.length === 0 && !criandoArea && (
              <p className="text-text-muted mt-1 text-xs">
                Nenhuma área cadastrada ainda — crie a primeira no “+”.
              </p>
            )}
          </div>
        </div>

        {erro && (
          <p role="alert" className="text-danger-ink mt-3 text-sm">
            {erro}
          </p>
        )}

        <div className="mt-5 flex items-center justify-between gap-2">
          {edicao ? (
            <button
              type="button"
              onClick={() => void excluir()}
              disabled={excluindo || salvando}
              className="text-danger-ink hover:bg-danger-bg inline-flex items-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium disabled:opacity-50"
            >
              <Trash2 className="size-4" aria-hidden />
              Excluir
            </button>
          ) : (
            <span />
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => aoFechar(false)}
              className="h-control-md text-text-secondary hover:bg-surface-hover rounded-md px-3 text-md font-medium"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void salvar()}
              disabled={salvando || excluindo || !nome.trim()}
              className="h-control-md bg-brand text-brand-on hover:bg-brand-hover active:bg-brand-active rounded-md px-4 text-md font-semibold disabled:opacity-40"
            >
              {salvando ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
