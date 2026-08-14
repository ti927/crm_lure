"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/**
 * Encerra a sessao.
 *
 * `router.refresh()` depois do signOut nao e detalhe: sem ele o Next
 * continua servindo a arvore de Server Components renderizada com a
 * sessao antiga, e a tela so troca no proximo carregamento completo.
 */
export function BotaoSair() {
  const router = useRouter();
  const [saindo, setSaindo] = useState(false);

  async function sair() {
    setSaindo(true);
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={sair}
      disabled={saindo}
      className="h-control-md text-text-secondary hover:bg-surface-hover hover:text-text inline-flex items-center gap-1.5 rounded-md px-2.5 text-sm font-medium transition-colors disabled:opacity-50"
    >
      <LogOut className="size-3.5" aria-hidden />
      {saindo ? "Saindo…" : "Sair"}
    </button>
  );
}
