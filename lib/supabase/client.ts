import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

/**
 * Cliente do navegador. So enxerga as duas variaveis NEXT_PUBLIC_.
 * Chave de servico e token do Bubble nunca passam por aqui — foi a razao
 * decisiva pelo Next.js sobre o Vite (D-080).
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
