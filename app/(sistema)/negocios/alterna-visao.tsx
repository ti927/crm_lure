import Link from "next/link";
import { List, Columns3 } from "lucide-react";

/**
 * Lista ou Kanban — as duas visoes dos mesmos negocios (D-053).
 *
 * Link e nao botao: cada visao tem URL propria, entao volta, recarrega e
 * link compartilhado funcionam sozinhos.
 */
const VISOES = [
  { chave: "lista", rotulo: "Lista", href: "/negocios", Icone: List },
  { chave: "kanban", rotulo: "Kanban", href: "/negocios/kanban", Icone: Columns3 },
] as const;

export function AlternaVisao({ atual }: { atual: "lista" | "kanban" }) {
  return (
    <div
      role="group"
      aria-label="Visão dos negócios"
      className="border-border bg-surface-sunken inline-flex rounded-md border p-0.5"
    >
      {VISOES.map(({ chave, rotulo, href, Icone }) => {
        const ativa = chave === atual;
        return (
          <Link
            key={chave}
            href={href}
            aria-current={ativa ? "page" : undefined}
            className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-sm font-medium ${
              ativa
                ? "bg-surface text-text shadow-sm"
                : "text-text-secondary hover:text-text"
            }`}
          >
            <Icone className="size-3.5" aria-hidden />
            {rotulo}
          </Link>
        );
      })}
    </div>
  );
}
