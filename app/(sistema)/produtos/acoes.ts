"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/* ---------- produto (B-096) ---------- */

export async function criarProduto(nome: string, areaId: string | null) {
  const limpo = nome.trim();
  if (!limpo) return { erro: "O nome é obrigatório." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("produto")
    .insert({ nome: limpo, area_id: areaId });

  if (error) return { erro: error.message };
  revalidatePath("/produtos");
  return { ok: true };
}

export async function editarProduto(
  id: string,
  nome: string,
  areaId: string | null
) {
  const limpo = nome.trim();
  if (!limpo) return { erro: "O nome é obrigatório." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("produto")
    .update({ nome: limpo, area_id: areaId })
    .eq("id", id);

  if (error) return { erro: error.message };
  revalidatePath("/produtos");
  return { ok: true };
}

/**
 * Excluir produto. Um produto preso a negócios é recusado pelo banco
 * (`negocio.produto_id` referencia produto sem cascata) — a mensagem crua
 * do Postgres vira algo legível.
 */
export async function excluirProduto(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("produto").delete().eq("id", id);

  if (error) {
    if (error.code === "23503") {
      return {
        erro: "Este produto está vinculado a negócios e não pode ser excluído. Troque o produto desses negócios antes.",
      };
    }
    return { erro: error.message };
  }
  revalidatePath("/produtos");
  return { ok: true };
}

/* ---------- área ---------- */

/**
 * ⚠️ As listas configuráveis (origem, motivo de perda, área, tipo de
 * atividade) não ganham tela no MVP — a edição é pelo painel do Supabase.
 * A área é a exceção necessária: a base nasceu com **zero** áreas e zero
 * produtos, porque o Pipedrive não tinha nenhum. Sem poder criar a área
 * aqui, o campo "área" do produto nunca poderia ser preenchido e o B-096
 * ficaria pela metade.
 *
 * É criação avulsa a partir do seletor, não uma tela de configuração:
 * renomear, reordenar e desativar continuam no painel.
 */
export async function criarArea(nome: string) {
  const limpo = nome.trim();
  if (!limpo) return { erro: "O nome da área é obrigatório." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("area_produto")
    .insert({ nome: limpo })
    .select("id, nome")
    .single();

  if (error) {
    if (error.code === "23505") return { erro: "Já existe uma área com esse nome." };
    return { erro: error.message };
  }
  revalidatePath("/produtos");
  return { ok: true, area: data };
}
