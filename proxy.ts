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

const PUBLICAS = ["/login", "/auth"];

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
    url.searchParams.set("proximo", caminho);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Tudo, menos arquivo estatico e imagem. O favicon e os assets nao
     * precisam de sessao renovada a cada carregamento.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)",
  ],
};
