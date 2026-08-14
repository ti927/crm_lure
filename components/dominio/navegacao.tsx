"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, Calendar, Users, Package } from "lucide-react";

/**
 * Menu lateral.
 *
 * D-059 lista seis destinos: Negocios, Atividades, Contatos,
 * Produtos/Servicos, Estatisticas e Configuracoes. Os dois ultimos ficaram
 * FORA do MVP (D-093 e D-096) e por isso nao aparecem aqui — item de menu
 * que leva a lugar nenhum e defeito, nao antecipacao. Entram na fase 2,
 * junto das telas que eles abrem.
 */
const DESTINOS = [
  { href: "/negocios", rotulo: "Negócios", Icone: Briefcase },
  { href: "/atividades", rotulo: "Atividades", Icone: Calendar },
  { href: "/contatos", rotulo: "Contatos", Icone: Users },
  { href: "/produtos", rotulo: "Produtos", Icone: Package },
];

export function Navegacao() {
  const caminho = usePathname();

  return (
    <nav aria-label="Seções do sistema" className="flex flex-col gap-0.5 p-2">
      {DESTINOS.map(({ href, rotulo, Icone }) => {
        const ativo = caminho === href || caminho.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={ativo ? "page" : undefined}
            className={`h-control-lg flex items-center gap-2.5 rounded-md px-2.5 text-md transition-colors ${
              ativo
                ? "bg-surface-hover text-text font-semibold"
                : "text-text-secondary hover:bg-surface-hover hover:text-text font-medium"
            }`}
          >
            {/* A faixa amarela marca o item ativo sem depender so da cor do
                texto — o #ffdd00 aqui e fundo, nunca tinta (Doc 08). */}
            <span
              className={`h-5 w-0.5 shrink-0 rounded-pill ${ativo ? "bg-brand" : "bg-transparent"}`}
              aria-hidden
            />
            <Icone className="size-4 shrink-0" aria-hidden />
            {rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
