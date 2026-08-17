"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { X } from "lucide-react";
import {
  SeletorResponsavel,
  type Usuario,
} from "@/components/dominio/seletor-responsavel";

/**
 * Filtro do Kanban.
 *
 * Só responsável por enquanto: etapa é a própria coluna e status vem
 * junto do desfecho, então filtrar por eles aqui seria esconder metade do
 * quadro sem ganho. O estado mora na URL, como na Lista.
 */
export function FiltroKanban({ usuarios }: { usuarios: Usuario[] }) {
  const router = useRouter();
  const caminho = usePathname();
  const params = useSearchParams();
  const [pendente, iniciar] = useTransition();

  const responsavel = params.get("responsavel") ?? "";

  function aplicar(id: string) {
    const p = new URLSearchParams(params);
    if (id) p.set("responsavel", id);
    else p.delete("responsavel");
    const s = p.toString();
    iniciar(() => router.push(s ? `${caminho}?${s}` : caminho));
  }

  return (
    <div
      className="flex items-center gap-2"
      data-pendente={pendente || undefined}
    >
      <SeletorResponsavel
        usuarios={usuarios}
        escolhido={responsavel}
        aoEscolher={aplicar}
        classe="h-control-md bg-surface border-border text-md rounded-md border px-2.5"
      />

      {responsavel && (
        <button
          type="button"
          onClick={() => aplicar("")}
          className="h-control-md text-text-secondary hover:bg-surface-hover hover:text-text inline-flex items-center gap-1 rounded-md px-2 text-sm font-medium"
        >
          <X className="size-3.5" aria-hidden />
          Limpar
        </button>
      )}
    </div>
  );
}
