"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Search } from "lucide-react";

export type ItemBusca = { id: string; nome: string; cidade?: string | null };

/**
 * Campo de busca com debounce que resolve por uma server action. Genérico
 * porque as duas fichas o usam: a da organização busca pessoas, a da
 * pessoa busca organizações.
 */
export function SeletorAsync({
  buscar,
  aoEscolher,
  placeholder,
  aoCriar,
  rotuloCriar,
}: {
  buscar: (termo: string) => Promise<ItemBusca[]>;
  aoEscolher: (item: ItemBusca) => void;
  placeholder: string;
  /**
   * Opcional. Quando existe, a lista oferece criar o que foi digitado —
   * é como o Pipedrive resolve o cliente que ainda não está cadastrado.
   * O nome vem do **termo buscado**, nunca de outro campo da tela.
   */
  aoCriar?: (termo: string) => void;
  rotuloCriar?: (termo: string) => string;
}) {
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<ItemBusca[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = termo.trim();
    if (t.length < 2) return;
    let vivo = true;
    const id = setTimeout(async () => {
      setBuscando(true);
      const r = await buscar(t);
      if (!vivo) return;
      setResultados(r);
      setBuscando(false);
    }, 250);
    return () => {
      vivo = false;
      clearTimeout(id);
    };
  }, [termo, buscar]);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      if (!caixa.current?.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, [aberto]);

  return (
    <div className="relative" ref={caixa}>
      <div className="relative">
        <Search
          className="text-text-muted pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2"
          aria-hidden
        />
        <input
          type="text"
          value={termo}
          onChange={(e) => {
            setTermo(e.target.value);
            setAberto(true);
          }}
          onFocus={() => setAberto(true)}
          placeholder={placeholder}
          className="h-control-md bg-surface border-border text-md w-full rounded-md border pl-8 pr-2.5"
        />
      </div>

      {aberto && termo.trim().length >= 2 && (
        <ul className="border-border bg-surface absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-md border p-1 shadow-lg">
          {buscando && <li className="text-text-muted px-2 py-2 text-sm">Buscando…</li>}
          {!buscando && resultados.length === 0 && !aoCriar && (
            <li className="text-text-muted px-2 py-2 text-sm">Nada encontrado.</li>
          )}
          {resultados.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => {
                  aoEscolher(r);
                  setTermo("");
                  setAberto(false);
                }}
                className="hover:bg-surface-hover flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left"
              >
                <span className="truncate">{r.nome}</span>
                {r.cidade && <span className="text-text-muted shrink-0 text-xs">{r.cidade}</span>}
              </button>
            </li>
          ))}

          {/* Criar o que foi digitado. Fica por último para não roubar o
              clique de quem já existe — cadastrar duplicata é o erro caro
              nesta base, onde 41% dos cadastros já são repetição (D-121). */}
          {!buscando && aoCriar && (
            <li className={resultados.length > 0 ? "border-border mt-1 border-t pt-1" : ""}>
              <button
                type="button"
                onClick={() => {
                  aoCriar(termo.trim());
                  setTermo("");
                  setAberto(false);
                }}
                className="hover:bg-surface-hover flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left text-sm font-medium"
              >
                <Plus className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">
                  {rotuloCriar?.(termo.trim()) ?? `Criar "${termo.trim()}"`}
                </span>
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
