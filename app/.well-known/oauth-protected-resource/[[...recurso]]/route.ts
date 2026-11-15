import { origemPublica, servidorDeAutorizacao } from "@/lib/mcp/acesso";

/**
 * Metadados do recurso protegido (RFC 9728) — é por aqui que o Grok, o
 * claude.ai e o Claude Code descobrem que o login do MCP é o servidor
 * OAuth do Supabase (P-054, Doc 16 §4).
 *
 * Responde na raiz e no caminho com sufixo (`/api/mcp`), porque cada
 * cliente procura num dos dois. Público e sem segredo: só diz onde pedir
 * o token.
 */

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const origem = origemPublica(request);
  return Response.json(
    {
      resource: `${origem}/api/mcp`,
      authorization_servers: [servidorDeAutorizacao()],
      bearer_methods_supported: ["header"],
      resource_name: "CRM Lure",
    },
    { headers: { "access-control-allow-origin": "*" } }
  );
}
