"use client";

import { useEffect, type RefObject } from "react";

/**
 * Faz a roda do mouse rolar de lado num container horizontal.
 *
 * ⚠️ Existe porque o padrão do navegador para rolar na horizontal é
 * `Shift` + roda, e ninguém descobre isso sozinho — foi exatamente a
 * queixa que originou este arquivo. Num quadro de seis colunas, a roda
 * "não fazer nada" é o pior estado possível: parece tela travada.
 *
 * ⚠️ Só assume a roda quando o container **não** pode rolar na vertical.
 * As colunas do Kanban rolam por dentro; se este atalho roubasse a roda
 * de lá, ficaria impossível ver o fim de uma coluna cheia. Por isso o
 * alvo do evento é conferido antes.
 */
export function useRolagemLateral(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const alvo = ref.current;
    if (!alvo) return;

    function naRoda(e: WheelEvent) {
      const caixa = ref.current;
      if (!caixa) return;

      // Gesto já horizontal (trackpad, mouse com roda lateral): o
      // navegador resolve sozinho.
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

      // O ponteiro está sobre algo que rola na vertical e ainda tem para
      // onde ir? Então a roda é daquilo, não do quadro.
      let no = e.target as HTMLElement | null;
      while (no && no !== caixa) {
        const podeVertical =
          no.scrollHeight > no.clientHeight &&
          ((e.deltaY < 0 && no.scrollTop > 0) ||
            (e.deltaY > 0 && no.scrollTop + no.clientHeight < no.scrollHeight - 1));
        if (podeVertical) return;
        no = no.parentElement;
      }

      if (caixa.scrollWidth <= caixa.clientWidth) return;

      e.preventDefault();
      caixa.scrollLeft += e.deltaY;
    }

    // `passive: false` é obrigatório: sem isso o `preventDefault` é
    // ignorado e a página inteira rola junto.
    alvo.addEventListener("wheel", naRoda, { passive: false });
    return () => alvo.removeEventListener("wheel", naRoda);
  }, [ref]);
}
