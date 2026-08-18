"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { salvarPreferenciaLista } from "./acoes";

/**
 * Estado do filtro por coluna mora na URL — sobrevive ao recarregar, pode
 * ser compartilhado por link, e volta certo no botao "voltar" (mesmo
 * padrao dos filtros do Kanban).
 *
 * Toda mudanca tambem grava a combinacao no usuario (B-045): e assim que
 * ela volta igual depois de um login novo, quando a pagina chega sem
 * parametro nenhum (ver `buscaCrua` em consulta.ts, que decide quando
 * restaurar).
 */
export function useFiltrosLista() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pendente, iniciar] = useTransition();

  function ir(proximos: URLSearchParams) {
    // Qualquer filtro novo devolve a leitura para a primeira pagina:
    // continuar na pagina 7 de um conjunto que encolheu mostra vazio.
    proximos.delete("pagina");
    const s = proximos.toString();
    iniciar(() => router.push(s ? `${pathname}?${s}` : pathname));
    void salvarPreferenciaLista(s);
  }

  function aplicar(chave: string, valor: string) {
    const p = new URLSearchParams(params);
    if (valor) p.set(chave, valor);
    else p.delete(chave);
    ir(p);
  }

  function aplicarVarios(troca: Record<string, string>) {
    const p = new URLSearchParams(params);
    for (const [chave, valor] of Object.entries(troca)) {
      if (valor) p.set(chave, valor);
      else p.delete(chave);
    }
    ir(p);
  }

  // "Limpar filtros" grava a combinacao vazia — se nao gravasse, a proxima
  // visita crua restauraria a combinacao anterior e o botao pareceria nao
  // fazer nada.
  function limpar() {
    ir(new URLSearchParams());
  }

  return { params, aplicar, aplicarVarios, limpar, pendente };
}
