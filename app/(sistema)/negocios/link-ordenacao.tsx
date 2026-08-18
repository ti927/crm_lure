"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { salvarPreferenciaLista } from "./acoes";

/**
 * Cabecalho de coluna que ordena. Continua sendo um <Link> de verdade —
 * funciona sem JS, e o clique do meio/ctrl+clique abre em aba nova como
 * qualquer link — mas tambem grava a nova combinacao para o usuario
 * (B-045), o que um <Link> puro nao faria sozinho.
 */
export function LinkOrdenacao({
  href,
  className,
  children,
}: {
  href: string;
  className: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        const consulta = href.includes("?") ? href.split("?")[1] : "";
        const p = new URLSearchParams(consulta);
        p.delete("pagina");
        void salvarPreferenciaLista(p.toString());
      }}
    >
      {children}
    </Link>
  );
}
