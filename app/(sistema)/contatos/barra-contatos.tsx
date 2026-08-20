"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Building2, Users, Plus } from "lucide-react";
import { CampoBusca } from "@/components/dominio/campo-busca";
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

  const aplicarBusca = useCallback(
    (valor: string) => {
      const p = new URLSearchParams(params);
      if (valor) p.set("busca", valor);
      else p.delete("busca");
      // Busca nova sempre volta à primeira página: continuar na página 7
      // de um conjunto que encolheu mostraria vazio.
      p.delete("pagina");
      const s = p.toString();
      iniciar(() => router.push(s ? `${caminho}?${s}` : caminho));
    },
    [params, caminho, router, iniciar]
  );

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
          <CampoBusca
            valor={busca}
            aoBuscar={aplicarBusca}
            placeholder={aba === "organizacoes" ? "Buscar organização" : "Buscar pessoa"}
            className="min-w-0 flex-1 md:w-56 md:flex-none"
          />


          <button
            type="button"
            onClick={() => setDialogo(aba === "organizacoes" ? "organizacao" : "pessoa")}
            aria-label={aba === "organizacoes" ? "Nova organização" : "Nova pessoa"}
            className="h-control-md bg-brand text-brand-on hover:bg-brand-hover active:bg-brand-active inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 text-sm font-semibold md:px-3"
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
