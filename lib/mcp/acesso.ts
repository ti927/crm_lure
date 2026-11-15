import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/**
 * Quem está do outro lado do MCP (D-173, D-175, Doc 16 §4).
 *
 * O agente age COMO o usuário que o conectou: o token que ele traz é um
 * token do próprio Supabase, emitido pelo servidor OAuth depois que o
 * usuário entrou com o Google do domínio e aprovou em /oauth/consent.
 * Por isso o cliente devolvido aqui carrega esse token, e o banco aplica
 * as mesmas políticas da tela — `pertence_ao_dominio()` lê o e-mail do
 * token, e o gatilho do log grava `autor_id = auth.uid()`.
 *
 * ⛔ Nunca a chave de serviço: ela passa por cima das políticas e grava
 * o log sem autor.
 */

export type Acesso = {
  supabase: SupabaseClient<Database>;
  usuarioId: string;
  email: string;
  /** Agente que pediu o acesso. Ausente quando o token é de sessão comum. */
  clienteOAuth: string | null;
  token: string;
};

export type Recusa = { motivo: string };

export function tokenDoCabecalho(request: Request): string | null {
  const h = request.headers.get("authorization") ?? "";
  const [tipo, valor] = h.split(" ");
  if (tipo?.toLowerCase() !== "bearer" || !valor) return null;
  return valor.trim();
}

export async function verificaAcesso(token: string): Promise<Acesso | Recusa> {
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );

  // getClaims confere a assinatura pela chave pública do projeto (ES256,
  // conferida em 15/11) e o vencimento, sem ida ao servidor de autenticação.
  // ⚠️ Token malformado não volta como `error`: a biblioteca LANÇA exceção
  // ("Invalid UTF-8 sequence"), e sem o try a rota respondia 500 em vez
  // de 401 — e o agente não saberia que precisa pedir login.
  let claims;
  try {
    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims?.sub) return { motivo: "token inválido ou vencido" };
    claims = data.claims;
  } catch {
    return { motivo: "token inválido ou vencido" };
  }

  const email = typeof claims.email === "string" ? claims.email : "";

  /*
   * ⚠️ Sem e-mail no token, `pertence_ao_dominio()` devolve falso e TODA
   * consulta volta vazia — com aparência de "não há nada". Recusar aqui
   * troca uma lista vazia mentirosa por um erro que diz a causa.
   */
  const dominio = process.env.DOMINIO_EMPRESA ?? "";
  if (!email) return { motivo: "o token não traz e-mail do usuário" };
  if (!dominio || email.split("@")[1] !== dominio) {
    return { motivo: "usuário fora do domínio da empresa" };
  }

  return {
    supabase,
    usuarioId: claims.sub,
    email,
    clienteOAuth: typeof claims.client_id === "string" ? claims.client_id : null,
    token,
  };
}

/**
 * Endereço público do CRM. Atrás do proxy da Vercel a URL da requisição
 * traz o host interno — é a mesma razão do `base()` de /auth/callback.
 */
export function origemPublica(request: Request): string {
  const { origin } = new URL(request.url);
  const host = request.headers.get("x-forwarded-host");
  if (!host) return origin;
  const protocolo = process.env.NODE_ENV === "development" ? "http" : "https";
  return `${protocolo}://${host}`;
}

/** Servidor de autorização: o OAuth 2.1 do próprio Supabase (P-054). */
export function servidorDeAutorizacao(): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1`;
}
