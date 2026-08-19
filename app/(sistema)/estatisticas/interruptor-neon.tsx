"use client";

import { useSyncExternalStore } from "react";
import { Sparkles } from "lucide-react";

const CHAVE = "lure:neon";

/**
 * Interruptor de brilho, para comparar com e sem (D-135).
 *
 * ⚠️ Ele só **acende** no tema escuro. A regra mora no CSS
 * (`.dark[data-neon="1"]`), não aqui: no tema claro o seletor nem casa,
 * então não existe combinação de estado que ponha neon sobre branco.
 * Este componente só liga e desliga o atributo.
 *
 * A escolha fica no navegador, não no banco. É comparação visual, não
 * preferência de produto — não vale uma coluna em `usuario` nem uma
 * viagem ao servidor a cada clique.
 *
 * ⚠️ O estado de verdade é o atributo no `<html>`, e não um `useState`.
 * `useSyncExternalStore` lê dele: no servidor devolve `false` (não há
 * documento), no cliente devolve o que está lá. Assim a primeira pintura
 * do servidor e a do cliente concordam, e não há efeito escrevendo estado
 * depois da montagem.
 */
const assinantes = new Set<() => void>();

function inscrever(aoMudar: () => void) {
  assinantes.add(aoMudar);
  return () => assinantes.delete(aoMudar);
}

const lerAqui = () => document.documentElement.getAttribute("data-neon") === "1";
const lerNoServidor = () => false;

function alternar() {
  const raiz = document.documentElement;
  const novo = !lerAqui();
  if (novo) raiz.setAttribute("data-neon", "1");
  else raiz.removeAttribute("data-neon");
  window.localStorage.setItem(CHAVE, novo ? "1" : "0");
  for (const avisar of assinantes) avisar();
}

export function InterruptorNeon() {
  const ligado = useSyncExternalStore(inscrever, lerAqui, lerNoServidor);

  return (
    <button
      type="button"
      onClick={alternar}
      aria-pressed={ligado}
      title={
        ligado
          ? "Brilho ligado — só aparece no tema escuro"
          : "Ligar brilho (só aparece no tema escuro)"
      }
      className={`h-control-md inline-flex items-center gap-1.5 rounded-md border px-2.5 text-sm font-medium transition-colors ${
        ligado
          ? "border-brand-ink text-text"
          : "border-border text-text-secondary hover:bg-surface-hover hover:text-text"
      }`}
    >
      <Sparkles className="size-3.5" aria-hidden />
      Brilho
      {ligado && <span className="bg-brand size-1.5 rounded-pill" aria-hidden />}
    </button>
  );
}

/**
 * Restaura a escolha antes da primeira pintura.
 *
 * ⚠️ Vai no `<head>`, como o alternador de tema faz: se esperasse o React
 * montar, quem deixou o brilho ligado veria os gráficos sem brilho por um
 * quadro e depois acenderem. Piscar assim é pior que não ter o recurso.
 */
export const SCRIPT_NEON = `try{if(localStorage.getItem('${CHAVE}')==='1')document.documentElement.setAttribute('data-neon','1')}catch(e){}`;
