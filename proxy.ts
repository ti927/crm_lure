import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * No Next.js 16 o antigo Middleware passou a se chamar Proxy — mesmo
 * comportamento, arquivo `proxy.ts` na raiz.
 *
 * Duas funcoes aqui: renovar a sessao do Supabase a cada requisicao, e
 * barrar quem nao esta autenticado. A autorizacao de verdade mora no
 * banco, nas politicas por dominio — isto e so a checagem otimista que
 * evita renderizar tela para quem nao entrou.
 */

/**
 * ⚠️ `/api/enviar-push` entra aqui de propósito, e não é buraco de
 * segurança: ela é chamada pelo `pg_cron` do Supabase, que não tem
 * sessão nem cookie, e se defende sozinha pelo segredo em cabeçalho
 * (`x-lure-segredo`). Sem esta linha o cron levaria um redirecionamento
 * para /login de hora em hora e o push nunca sairia — em silêncio,
 * porque `pg_net` é assíncrono e ninguém lê a tabela de respostas.
 *
 * ⚠️ `/api/inscricao-push` NÃO entra: aquela precisa da sessão para
 * saber de quem é o aparelho.
 *
 * ⚠️ `/api/mcp` e `/.well-known` entram pelo mesmo motivo do cron (D-172):
 * agente de IA não tem cookie. A rota do MCP se defende pelo token OAuth
 * no cabeçalho e responde 401 sem ele; `/.well-known` só publica onde
 * pedir o token. `/oauth/consent` NÃO entra: aprovar exige estar logado.
 */
const PUBLICAS = ["/login", "/auth", "/api/enviar-push", "/api/mcp", "/.well-known"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() e nao getSession(): so o primeiro revalida o token no
  // servidor de autenticacao. O segundo confia no cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const caminho = request.nextUrl.pathname;
  const ehPublica = PUBLICAS.some((p) => caminho.startsWith(p));

  if (!user && !ehPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // A query vai junto: sem ela /oauth/consent voltaria do login sem o
    // `authorization_id` e o pedido do agente se perderia.
    url.search = "";
    url.searchParams.set("proximo", caminho + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Tudo, menos arquivo estatico e imagem. O favicon e os assets nao
     * precisam de sessao renovada a cada carregamento.
     *
     * ⚠️ `sw.js` e `manifest.webmanifest` saem daqui por necessidade, nao
     * por economia. O navegador busca os dois FORA do contexto da pagina
     * — o service worker chega a ser buscado sem cookie nenhum —, e um
     * redirecionamento para /login faria o registro falhar em silencio:
     * sem service worker nao ha push, e sem manifesto nao ha atalho na
     * tela de inicio. Nenhum dos dois carrega segredo.
     */
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)",
  ],
};
