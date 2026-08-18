"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/* ---------- organização ---------- */

export type DadosOrganizacao = {
  nome: string;
  cidade: string;
  website: string;
  bubbleId: string;
};

export async function criarOrganizacao(d: DadosOrganizacao) {
  const nome = d.nome.trim();
  if (!nome) return { erro: "O nome é obrigatório." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizacao")
    .insert({
      nome,
      cidade: d.cidade.trim() || null,
      website: d.website.trim() || null,
      bubble_id: d.bubbleId.trim() || null,
    })
    .select("id")
    .single();

  if (error) return { erro: error.message };
  revalidatePath("/contatos");
  return { ok: true, id: data.id };
}

export async function editarOrganizacao(id: string, d: DadosOrganizacao) {
  const nome = d.nome.trim();
  if (!nome) return { erro: "O nome é obrigatório." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizacao")
    .update({
      nome,
      cidade: d.cidade.trim() || null,
      website: d.website.trim() || null,
      bubble_id: d.bubbleId.trim() || null,
    })
    .eq("id", id);

  if (error) return { erro: error.message };
  revalidatePath("/contatos");
  revalidatePath(`/contatos/organizacoes/${id}`);
  return { ok: true };
}

/**
 * B-095: organização com negócios não é excluída — o banco recusa, porque
 * `negocio.organizacao_id` é obrigatório e não tem cascata. A mensagem do
 * Postgres (violação de chave estrangeira, código 23503) é traduzida para
 * algo que o usuário entende.
 */
export async function excluirOrganizacao(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("organizacao").delete().eq("id", id);

  if (error) {
    if (error.code === "23503") {
      return {
        erro: "Esta organização tem negócios vinculados e não pode ser excluída. Reatribua ou exclua os negócios antes.",
      };
    }
    return { erro: error.message };
  }
  revalidatePath("/contatos");
  return { ok: true };
}

/* ---------- pessoa ---------- */

export async function criarPessoa(nome: string) {
  const limpo = nome.trim();
  if (!limpo) return { erro: "O nome é obrigatório." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pessoa")
    .insert({ nome: limpo })
    .select("id")
    .single();

  if (error) return { erro: error.message };
  revalidatePath("/contatos");
  return { ok: true, id: data.id };
}

export async function editarPessoa(id: string, nome: string) {
  const limpo = nome.trim();
  if (!limpo) return { erro: "O nome é obrigatório." };

  const supabase = await createClient();
  const { error } = await supabase.from("pessoa").update({ nome: limpo }).eq("id", id);

  if (error) return { erro: error.message };
  revalidatePath("/contatos");
  revalidatePath(`/contatos/pessoas/${id}`);
  return { ok: true };
}

/** B-094: excluir pessoa leva junto vínculos e formas de contato (cascata
 *  no schema), sem deixar órfãos. Atividades/anotações da pessoa também
 *  caem por cascata — é o comportamento do Pipedrive ao apagar um contato. */
export async function excluirPessoa(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("pessoa").delete().eq("id", id);

  if (error) return { erro: error.message };
  revalidatePath("/contatos");
  return { ok: true };
}

/* ---------- vínculo pessoa ↔ organização (o cargo mora aqui, D-036) ---------- */

export async function vincularOrganizacao(
  pessoaId: string,
  organizacaoId: string,
  cargo: string
) {
  const supabase = await createClient();
  const { error } = await supabase.from("pessoa_organizacao").insert({
    pessoa_id: pessoaId,
    organizacao_id: organizacaoId,
    cargo: cargo.trim() || null,
  });

  if (error) {
    if (error.code === "23505") return { erro: "Esta pessoa já está vinculada a essa organização." };
    return { erro: error.message };
  }
  revalidatePath(`/contatos/pessoas/${pessoaId}`);
  revalidatePath(`/contatos/organizacoes/${organizacaoId}`);
  return { ok: true };
}

export async function editarCargo(
  pessoaId: string,
  organizacaoId: string,
  cargo: string
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("pessoa_organizacao")
    .update({ cargo: cargo.trim() || null })
    .eq("pessoa_id", pessoaId)
    .eq("organizacao_id", organizacaoId);

  if (error) return { erro: error.message };
  revalidatePath(`/contatos/pessoas/${pessoaId}`);
  revalidatePath(`/contatos/organizacoes/${organizacaoId}`);
  return { ok: true };
}

export async function desvincularOrganizacao(
  pessoaId: string,
  organizacaoId: string
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("pessoa_organizacao")
    .delete()
    .eq("pessoa_id", pessoaId)
    .eq("organizacao_id", organizacaoId);

  if (error) return { erro: error.message };
  revalidatePath(`/contatos/pessoas/${pessoaId}`);
  revalidatePath(`/contatos/organizacoes/${organizacaoId}`);
  return { ok: true };
}

/* ---------- formas de contato (B-092) ---------- */

export async function adicionarFormaContato(
  pessoaId: string,
  tipo: "telefone" | "email",
  valor: string
) {
  const limpo = valor.trim();
  if (!limpo) return { erro: "O valor é obrigatório." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("forma_contato")
    .insert({ pessoa_id: pessoaId, tipo, valor: limpo });

  if (error) return { erro: error.message };
  revalidatePath(`/contatos/pessoas/${pessoaId}`);
  return { ok: true };
}

export async function removerFormaContato(id: string, pessoaId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("forma_contato").delete().eq("id", id);

  if (error) return { erro: error.message };
  revalidatePath(`/contatos/pessoas/${pessoaId}`);
  return { ok: true };
}

/* ---------- busca de organização (para vincular) ---------- */

export async function buscarOrganizacoes(termo: string) {
  const limpo = termo.trim().replace(/[%,()]/g, " ");
  if (limpo.length < 2) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("organizacao")
    .select("id, nome, cidade")
    .ilike("nome", `%${limpo}%`)
    .order("nome")
    .limit(8);

  return data ?? [];
}

export async function buscarPessoas(termo: string) {
  const limpo = termo.trim().replace(/[%,()]/g, " ");
  if (limpo.length < 2) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("pessoa")
    .select("id, nome")
    .ilike("nome", `%${limpo}%`)
    .order("nome")
    .limit(8);

  return data ?? [];
}
