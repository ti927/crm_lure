"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartColumn, Wallet } from "lucide-react";

/**
 * As duas leituras de Estatísticas.
 *
 * ⚠️ Não são a mesma coisa vista de outro jeito: elas usam **eixos de
 * tempo diferentes**. Comercial pergunta "quando o lead entrou"
 * (`criado_em`); Financeiro pergunta "quando entrou dinheiro"
 * (`fechado_em`). Separá-las em abas é o que impede alguém de somar os
 * dois e achar que fecham.
 */
const ABAS = [
  { href: "/estatisticas", rotulo: "Comercial", Icone: ChartColumn },
  { href: "/estatisticas/financeiro", rotulo: "Financeiro", Icone: Wallet },
];

export function AbasEstatisticas({ consulta }: { consulta?: string }) {
  const caminho = usePathname();

  return (
    <nav aria-label="Visões de estatísticas" className="flex gap-1">
      {ABAS.map(({ href, rotulo, Icone }) => {
        const ativa = caminho === href;
        // O recorte acompanha a troca de aba: quem filtrou 2025 no
        // comercial quer 2025 no financeiro também.
        const destino = consulta ? `${href}?${consulta}` : href;
        return (
          <Link
            key={href}
            href={destino}
            aria-current={ativa ? "page" : undefined}
            className={`h-control-md inline-flex items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors ${
              ativa
                ? "bg-surface-hover text-text font-semibold"
                : "text-text-secondary hover:bg-surface-hover hover:text-text"
            }`}
          >
            <Icone className="size-3.5" aria-hidden />
            {rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
