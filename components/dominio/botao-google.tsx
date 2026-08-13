"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function BotaoGoogle({ proximo }: { proximo: string }) {
  const [entrando, setEntrando] = useState(false);

  async function entrarComGoogle() {
    setEntrando(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?proximo=${encodeURIComponent(proximo)}`,
      },
    });

    // Se deu certo o navegador ja saiu da pagina; so voltamos ao estado
    // normal quando houve falha.
    if (error) setEntrando(false);
  }

  return (
    <Button
      className="mt-6 w-full"
      size="lg"
      onClick={entrarComGoogle}
      disabled={entrando}
    >
      {entrando ? "Abrindo o Google…" : "Entrar com Google"}
    </Button>
  );
}
