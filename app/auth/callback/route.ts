import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Retorno do Google OAuth. Uma URL por ambiente, apontada no Google Cloud
 * (P-026, D-082):
 *   http://localhost:3000/auth/callback
 *   https://<dominio-de-producao>/auth/callback
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const proximo = searchParams.get("proximo") ?? "/";

  const paraLogin = (erro: string) =>
    NextResponse.redirect(`${base()}/login?erro=${erro}`);

  // Atras do proxy da Vercel o `origin` da requisicao e o interno.
  function base() {
    const forwardedHost = request.headers.get("x-forwarded-host");
    if (!forwardedHost) return origin;
    const protocolo = process.env.NODE_ENV === "development" ? "http" : "https";
    return `${protocolo}://${forwardedHost}`;
  }

  if (!code) return paraLogin("sem_codigo");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) return paraLogin("falha_na_troca");

  /*
   * Autorizacao por dominio (D-050). O gatilho do banco ja se recusa a
   * criar o registro de usuario para quem e de fora, mas sem esta
   * checagem a conta estranha ficaria autenticada no Supabase Auth e
   * veria uma tela vazia em vez de uma recusa clara.
   */
  const dominio = process.env.DOMINIO_EMPRESA ?? "";
  const dominioDoEmail = (data.user.email ?? "").split("@")[1] ?? "";

  if (!dominio || dominioDoEmail !== dominio) {
    await supabase.auth.signOut();
    return paraLogin("fora_do_dominio");
  }

  return NextResponse.redirect(`${base()}${proximo}`);
}
