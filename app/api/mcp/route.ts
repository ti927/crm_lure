import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import {
  origemPublica,
  tokenDoCabecalho,
  verificaAcesso,
} from "@/lib/mcp/acesso";
import { criaServidor } from "@/lib/mcp/servidor";

/**
 * Porta do MCP para agentes de IA (D-172, Doc 16).
 *
 * ⚠️ Fica fora do login por cookie do `proxy.ts` de propósito, e não é
 * buraco: agente não tem cookie. Esta rota se defende sozinha — sem token
 * válido do domínio responde 401 e aponta, pelo `WWW-Authenticate`, onde
 * o agente descobre como pedir um (RFC 9728).
 */

export const dynamic = "force-dynamic";

async function atende(request: Request): Promise<Response> {
  const token = tokenDoCabecalho(request);
  const acesso = token ? await verificaAcesso(token) : null;

  if (!acesso || "motivo" in acesso) {
    const metadados = `${origemPublica(request)}/.well-known/oauth-protected-resource/api/mcp`;
    const descricao = acesso ? acesso.motivo : "falta o token de acesso";
    return new Response(JSON.stringify({ error: "invalid_token", error_description: descricao }), {
      status: 401,
      headers: {
        "content-type": "application/json",
        // Cabeçalho só em ASCII: o motivo, com acento, vai no corpo.
        "www-authenticate": `Bearer error="invalid_token", resource_metadata="${metadados}"`,
      },
    });
  }

  const servidor = criaServidor(acesso, origemPublica(request));
  const transporte = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // sem sessão: cada chamada traz o token
    enableJsonResponse: true,
  });
  await servidor.connect(transporte);

  return transporte.handleRequest(request, {
    authInfo: {
      token: acesso.token,
      clientId: acesso.agente,
      scopes: [],
      extra: { usuarioId: acesso.usuarioId, email: acesso.email, agente: acesso.agente },
    },
  });
}

export { atende as GET, atende as POST, atende as DELETE };
