import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { PainelAgentes, type AgenteConectado, type Chamada } from "./painel-agentes";

/**
 * Agentes de IA — preferência pessoal (Doc 16, fase 2; D-176, D-178).
 *
 * Fica ao lado de Notificações, e pelo mesmo motivo: é escolha de quem
 * está logado sobre o próprio agente, não administração do sistema
 * (a tela de Configurações da D-096 segue fora do MVP).
 */

export const dynamic = "force-dynamic";

export default async function PaginaAgentes() {
  const supabase = await createClient();

  const [{ data: eu }, grants, preferencia] = await Promise.all([
    supabase.rpc("usuario_atual"),
    supabase.auth.oauth.listGrants(),
    supabase.from("preferencia_agente").select("escrita_sensivel").maybeSingle(),
  ]);

  // As chamadas são lidas no domínio inteiro pela RLS (D-049); aqui
  // ficam só as de quem está logado, que é o que esta tela responde.
  const { data: chamadas } = eu
    ? await supabase
        .from("chamada_agente")
        .select("id, agente, ferramenta, argumentos, sucesso, erro, ocorrido_em")
        .eq("usuario_id", eu)
        .order("ocorrido_em", { ascending: false })
        .limit(50)
    : { data: [] };

  const conectados: AgenteConectado[] = (grants.data ?? []).map((g) => ({
    clienteId: g.client.id,
    nome: g.client.name || "Agente sem nome",
    desde: g.granted_at,
  }));

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const protocolo = process.env.NODE_ENV === "development" ? "http" : "https";

  return (
    <PainelAgentes
      enderecoMcp={`${protocolo}://${host}/api/mcp`}
      escritaSensivel={preferencia.data?.escrita_sensivel ?? true}
      conectados={conectados}
      falhaAoListar={Boolean(grants.error)}
      chamadas={(chamadas ?? []) as Chamada[]}
    />
  );
}
