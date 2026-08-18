"use client";

import { useEffect, useRef } from "react";

/**
 * Foco preso dentro do diálogo, e devolvido ao sair.
 *
 * Sem isto, duas coisas incomodam mesmo quem não usa leitor de tela: o
 * Tab escapa para os links da página atrás do fundo escurecido, e ao
 * fechar o diálogo o foco volta para o começo do documento — quem estava
 * no meio de uma lista longa perde o lugar e precisa rolar de novo até
 * onde estava.
 *
 * Devolve a `ref` que deve ir no elemento do diálogo.
 */
export function useFocoDialogo<T extends HTMLElement>() {
  const caixa = useRef<T>(null);

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    const alvo = caixa.current;

    // Se nada dentro pediu foco (autoFocus), põe no próprio diálogo para
    // que o Tab comece de dentro e o leitor de tela anuncie o título.
    if (alvo && !alvo.contains(document.activeElement)) {
      alvo.focus({ preventScroll: true });
    }

    function prendeTab(e: KeyboardEvent) {
      if (e.key !== "Tab" || !caixa.current) return;

      const focaveis = caixa.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focaveis.length === 0) return;

      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      const atual = document.activeElement;

      // Circula em vez de sair: do último volta ao primeiro, e vice-versa.
      if (e.shiftKey && (atual === primeiro || atual === caixa.current)) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && atual === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    }

    document.addEventListener("keydown", prendeTab);
    return () => {
      document.removeEventListener("keydown", prendeTab);
      // Devolve o foco a quem abriu o diálogo.
      anterior?.focus?.({ preventScroll: true });
    };
  }, []);

  return caixa;
}
