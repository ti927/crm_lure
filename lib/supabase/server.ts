import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./types";

/**
 * Cliente de servidor — Server Components, Route Handlers e Server Actions.
 * Um por requisicao: o cliente carrega os cookies daquela requisicao e nao
 * pode ser reaproveitado entre elas.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component nao pode escrever cookie. O proxy.ts ja
            // renova a sessao antes de chegar aqui, entao ignorar e seguro.
          }
        },
      },
    }
  );
}
