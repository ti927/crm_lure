"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * D-144 — guarda e remove a inscrição de push de um aparelho.
 *
 * ⚠️ O `endpoint` é a identidade da inscrição, e ele vem único de
 * fábrica do serviço de push (FCM no Android, APNs no iPhone). Não há
 * `usuario_id` vindo da tela: quem está gravando é resolvido no
 * servidor por `usuario_atual()`, como em toda escrita deste módulo.
 *
 * ⚠️ Uma pessoa tem VÁRIOS aparelhos, e isso é o caso normal e não a
 * exceção: celular e computador se inscrevem separadamente. Por isso a
 * chave é o endpoint e não o usuário.
 */

export type Inscricao = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

async function eu() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("usuario_atual");
  return { supabase, id: (data as string | null) ?? null };
}

export async function salvarInscricao(inscricao: Inscricao, aparelho: string) {
  if (!inscricao?.endpoint || !inscricao.keys?.p256dh || !inscricao.keys?.auth) {
    return { erro: "Inscrição incompleta." };
  }

  const { supabase, id } = await eu();
  if (!id) return { erro: "Não foi possível identificar o usuário." };

  // Reinscrever o mesmo aparelho não cria linha nova: o navegador reemite
  // o mesmo endpoint. O `onConflict` também cobre o caso de o aparelho
  // trocar de dono — a inscrição passa a ser de quem está logado agora,
  // que é o comportamento certo num aparelho compartilhado.
  const { error } = await supabase.from("inscricao_push").upsert(
    {
      usuario_id: id,
      endpoint: inscricao.endpoint,
      p256dh: inscricao.keys.p256dh,
      auth: inscricao.keys.auth,
      aparelho: aparelho.slice(0, 120) || null,
    },
    { onConflict: "endpoint" },
  );

  if (error) return { erro: error.message };
  return {};
}

export async function removerInscricao(endpoint: string) {
  const { supabase, id } = await eu();
  if (!id) return { erro: "Não foi possível identificar o usuário." };

  const { error } = await supabase
    .from("inscricao_push")
    .delete()
    .eq("usuario_id", id)
    .eq("endpoint", endpoint);

  if (error) return { erro: error.message };
  return {};
}

/** Quantos aparelhos deste usuário estão recebendo. */
export async function contarInscricoes() {
  const { supabase, id } = await eu();
  if (!id) return { total: 0 };
  const { count } = await supabase
    .from("inscricao_push")
    .select("id", { count: "exact", head: true })
    .eq("usuario_id", id);
  return { total: count ?? 0 };
}
