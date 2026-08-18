"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Persiste a ultima combinacao de filtro e ordenacao da Lista para o
 * usuario logado (B-045: "filtros e ordenacao voltam iguais apos
 * recarregar e apos novo login").
 *
 * A pagina nunca entra na string salva — pedir a pagina 7 de um recorte
 * que encolheu mostraria vazio. Quem monta a string ja tira "pagina"
 * antes de chamar isto (ver `usar-filtros-lista.ts` e `link-ordenacao.tsx`).
 */
export async function salvarPreferenciaLista(query: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("usuario")
    .update({ preferencia_lista_negocios: query })
    .eq("auth_id", user.id);
}
