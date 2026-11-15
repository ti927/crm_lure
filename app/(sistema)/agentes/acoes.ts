"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Escritas da tela "Agentes de IA" (Doc 16, fase 2).
 *
 * ⚠️ `usuario_id` nunca vem da tela: sai de `usuario_atual()`, mesma regra
 * das notificações (D-109). A RLS recusaria de qualquer forma.
 */

/**
 * Liga ou desliga a escrita sensível do agente (D-176).
 *
 * ⚠️ Ligado é o padrão (D-178), então LIGAR apaga a linha em vez de
 * gravá-la: a tabela guarda só quem quis diferente. Se um dia o padrão
 * mudar, quem nunca escolheu de verdade acompanha a mudança.
 */
export async function salvarEscritaSensivel(ligado: boolean) {
  const supabase = await createClient();
  const { data: id } = await supabase.rpc("usuario_atual");
  if (!id) return { erro: "Não foi possível identificar o usuário." };

  const { error } = ligado
    ? await supabase.from("preferencia_agente").delete().eq("usuario_id", id)
    : await supabase
        .from("preferencia_agente")
        .upsert({ usuario_id: id, escrita_sensivel: false, atualizado_em: new Date().toISOString() });

  if (error) return { erro: error.message };
  return {};
}

/**
 * Desconecta um agente: o Supabase marca a autorização como revogada e
 * apaga a sessão dele. O token que o agente já tem perde efeito na hora,
 * porque o MCP confere a sessão a cada chamada (`agente_atual()`).
 */
export async function desconectarAgente(clienteId: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.oauth.revokeGrant({ clientId: clienteId });
  if (error) return { erro: error.message };
  return {};
}
