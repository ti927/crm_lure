"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * A decisão do usuário na página de autorização (D-175).
 *
 * `skipBrowserRedirect` porque isto roda no servidor: quem leva o
 * navegador de volta ao agente é o `redirect` daqui, com o código de
 * autorização (ou a recusa) na URL que o Supabase devolveu.
 */
export async function decide(formData: FormData) {
  const autorizacao = String(formData.get("autorizacao") ?? "");
  const aprovar = formData.get("decisao") === "aprovar";
  if (!autorizacao) redirect("/");

  const supabase = await createClient();
  const { data, error } = aprovar
    ? await supabase.auth.oauth.approveAuthorization(autorizacao, { skipBrowserRedirect: true })
    : await supabase.auth.oauth.denyAuthorization(autorizacao, { skipBrowserRedirect: true });

  if (error || !data?.redirect_url) {
    redirect(`/oauth/consent?authorization_id=${encodeURIComponent(autorizacao)}&falha=1`);
  }
  redirect(data.redirect_url);
}
