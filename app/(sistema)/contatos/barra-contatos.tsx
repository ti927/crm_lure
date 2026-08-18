"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Building2, Users, Search, Plus, X } from "lucide-react";
import { DialogoOrganizacao } from "./dialogo-organizacao";
import { DialogoPessoa } from "./dialogo-pessoa";
import type { Aba } from "./consulta";

/**
 * Barra da Lista de Contatos: abas Organizações/Pessoas, busca por nome e
 * o botão de criar (que abre o diálogo da aba atual). Ao criar, leva
 * direto para a ficha nova, onde se completa vínculos e contatos.
 */
export function BarraContatos({
  aba,
  total,
}: {
  aba: Aba;
  total: number;
}) {
  const router = useRouter();
  const caminho = usePathname();
  const params = useSearchParams();
  const [pendente, iniciar] = useTransition();
  const [dialogo, setDialogo] = useState<"organizacao" | "pessoa" | null>(null);

  const busca = params.get("busca") ?? "";

  function trocarAba(nova: Aba) {
    const p = new URLSearchParams();
    if (nova === "pessoas") p.set("aba", "pessoas");
    // Busca e página não sobrevivem à troca de aba: são recortes de
    // conjuntos diferentes.
    const s = p.toString();
    iniciar(() => router.push(s ? `${caminho}?${s}` : caminho));
  }

  function aplicarBusca(valor: string) {
    const p = new URLSearchParams(params);
    if (valor) p.set("busca", valor);
    else p.delete("busca");
    p.delete("pagina");
    iniciar(() => router.push(`${caminho}?${p}`));
  }

  function aoFecharDialogo(r: { mudou: boolean; id?: string }) {
    setDialogo(null);
    if (r.mudou && r.id) {
      const destino =
        dialogo === "organizacao"
          ? `/contatos/organizacoes/${r.id}`
          : `/contatos/pessoas/${r.id}`;
      router.push(destino);
    }
  }

  const abaClasse = (a: Aba) =>
    `inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-md font-medium ${
      aba === a ? "bg-surface-hover text-text" : "text-text-muted hover:text-text"
    }`;

  return (
    <>
      <div
        className="border-border flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3"
        data-pendente={pendente || undefined}
      >
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">Contatos</h1>
          <div className="border-border flex rounded-md border p-0.5">
            <button type="button" onClick={() => trocarAba("organizacoes")} className={abaClasse("organizacoes")}>
              <Building2 className="size-4" aria-hidden />
              Organizações
            </button>
            <button type="button" onClick={() => trocarAba("pessoas")} className={abaClasse("pessoas")}>
              <Users className="size-4" aria-hidden />
              Pessoas
            </button>
          </div>
          <span className="text-text-muted text-sm">
            {total.toLocaleString("pt-BR")}
          </span>
        </div>

        {/* No celular a busca ocupa a linha inteira: é a ação principal
            da tela, e um campo de 14rem espremido ao lado do botão seria
            pequeno demais para o polegar. */}
        <div className="flex w-full items-center gap-2 md:w-auto">
          <form
            className="relative min-w-0 flex-1 md:flex-none"
            onSubmit={(e) => {
              e.preventDefault();
              const dado = new FormData(e.currentTarget);
              aplicarBusca(String(dado.get("busca") ?? "").trim());
            }}
          >
            <Search
              className="text-text-muted pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2"
              aria-hidden
            />
            <input
              name="busca"
              type="search"
              defaultValue={busca}
              key={busca}
              placeholder={aba === "organizacoes" ? "Buscar organização" : "Buscar pessoa"}
              aria-label="Buscar por nome"
              className="h-control-md bg-surface border-border text-md w-full rounded-md border pl-8 pr-2.5 md:w-56"
            />
          </form>

          {busca && (
            <button
              type="button"
              onClick={() => aplicarBusca("")}
              className="h-control-md text-text-secondary hover:bg-surface-hover inline-flex items-center gap-1 rounded-md px-2 text-sm font-medium"
            >
              <X className="size-3.5" aria-hidden />
              Limpar
            </button>
          )}

          <button
            type="button"
            onClick={() => setDialogo(aba === "organizacoes" ? "organizacao" : "pessoa")}
            aria-label={aba === "organizacoes" ? "Nova organização" : "Nova pessoa"}
            className="h-control-md bg-brand text-brand-on inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 text-sm font-semibold md:px-3"
          >
            <Plus className="size-4" aria-hidden />
            {/* No celular o rótulo sai e fica só o "+": a linha já está
                ocupada pela busca. */}
            <span className="hidden md:inline">
              {aba === "organizacoes" ? "Nova organização" : "Nova pessoa"}
            </span>
          </button>
        </div>
      </div>

      {dialogo === "organizacao" && <DialogoOrganizacao aoFechar={aoFecharDialogo} />}
      {dialogo === "pessoa" && <DialogoPessoa aoFechar={aoFecharDialogo} />}
    </>
  );
}
