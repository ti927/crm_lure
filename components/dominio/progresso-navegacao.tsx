"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Barra fina de progresso no topo, durante a navegação.
 *
 * Os esqueletos (`loading.tsx`) cobrem a troca de página inteira, mas não
 * cobrem o intervalo entre o clique e a resposta do servidor em
 * navegações que reaproveitam a mesma rota — trocar de filtro, de página
 * na lista, de dia nas atividades. Nesses casos a tela fica igual por um
 * instante e o clique parece não ter pegado. Esta barra dá o sinal de
 * "estou indo" em qualquer um dos casos.
 *
 * Detecta o fim pela mudança de rota/parâmetros: quando `pathname` ou a
 * query mudam, a navegação terminou.
 */
export function ProgressoNavegacao() {
  const caminho = usePathname();
  const params = useSearchParams();
  // Guarda a rota de onde a navegação partiu. Enquanto a rota atual for
  // essa, ainda estamos indo; quando muda, chegou. Comparar no render
  // evita zerar o estado por efeito.
  const [partiuDe, setPartiuDe] = useState<string | null>(null);

  const chave = `${caminho}?${params}`;
  const ativo = partiuDe !== null && partiuDe === chave;

  useEffect(() => {
    // Captura o clique em qualquer link interno antes do Next assumir.
    function aoClicar(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey) return;
      const alvo = (e.target as HTMLElement).closest("a");
      if (!alvo) return;

      const href = alvo.getAttribute("href");
      if (!href || !href.startsWith("/")) return;
      if (alvo.target === "_blank" || alvo.hasAttribute("download")) return;
      // Mesma URL: não há navegação, logo não há o que sinalizar.
      if (href === chave || href === caminho) return;

      setPartiuDe(chave);
    }

    document.addEventListener("click", aoClicar);
    return () => document.removeEventListener("click", aoClicar);
  }, [chave, caminho]);

  if (!ativo) return null;

  return (
    <div
      role="status"
      aria-label="Carregando"
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden"
    >
      <div className="bg-brand h-full w-1/3 animate-[desliza_1s_ease-in-out_infinite] rounded-pill" />
    </div>
  );
}
