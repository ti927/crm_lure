"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { termoDeBusca } from "@/lib/formato";
import { normalizaUf } from "@/lib/uf";
import {
  adicionaFormaContato,
  criaOrganizacao,
  criaPessoa,
  organizacoesComMesmoNome as homonimas,
  vinculaPessoaOrganizacao,
  type Homonima,
} from "@/lib/regras/contatos";

/* ---------- organização ---------- */

export type DadosOrganizacao = {
  nome: string;
  cidade: string;
  /** Sigla de duas letras, ou string vazia. Normalizada no servidor. */
  uf: string;
  /** Logradouro, número e bairro em texto livre. Não repete cidade/UF. */
  endereco: string;
  website: string;
  bubbleId: string;
};

export type { Homonima };

/**
 * Cadastros com o MESMO nome, ignorando acento e caixa.
 *
 * ⚠️ Nome igual, e não nome parecido. "Sicoob Credseguro" e "Sicoob
 * Credisul" são empresas diferentes, e um aviso que dispara em cima de
 * parecença vira barulho — avisado toda vez, ninguém lê na vez que
 * importa. `nome_busca` é a coluna gerada: "Elmo Engenharia" e "ELMO
 * ENGENHARIA" caem no mesmo valor, que é exatamente o caso que a base
 * tem 668 vezes.
 */
export async function organizacoesComMesmoNome(nome: string): Promise<Homonima[]> {
  const supabase = await createClient();
  return homonimas(supabase, nome);
}

/**
 * Cria uma organização.
 *
 * ⚠️ RECUSA NA PRIMEIRA TENTATIVA quando já existe cadastro de mesmo
 * nome, e devolve quais são. Não é trava: `confirmado` passa por cima.
 * O ponto é que a pessoa VEJA a lista antes, porque a base tem **1.195
 * das 2.889 organizações duplicadas por nome** — 41% — e cada uma
 * nasceu de alguém que não sabia que a outra existia.
 *
 * ⚠️ A checagem mora na AÇÃO, e não no formulário, porque existem DOIS
 * caminhos que criam organização: o diálogo dos Contatos e o "Criar
 * organização …" de dentro do diálogo de negócio. Regra que vale num
 * caminho só não é regra — e o segundo caminho é justamente o apressado,
 * onde a duplicata nasce.
 */
export async function criarOrganizacao(
  d: DadosOrganizacao,
  opcoes?: { confirmado?: boolean }
) {
  // A regra — aviso de homônima incluído — mora em lib/regras/contatos,
  // a mesma que o agente de IA usa (D-172).
  const supabase = await createClient();
  const r = await criaOrganizacao(supabase, d, { confirmado: opcoes?.confirmado });
  if ("erro" in r) return { erro: r.erro };
  if ("duplicadas" in r) return { duplicadas: r.duplicadas };
  revalidatePath("/contatos");
  return { ok: true, id: r.id! };
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
      uf: normalizaUf(d.uf),
      endereco: d.endereco.trim() || null,
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
  const supabase = await createClient();
  const r = await criaPessoa(supabase, nome);
  if ("erro" in r) return { erro: r.erro };
  revalidatePath("/contatos");
  return { ok: true, id: r.id! };
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
  const r = await vinculaPessoaOrganizacao(supabase, pessoaId, organizacaoId, cargo);
  if ("erro" in r) return { erro: r.erro };
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
  const supabase = await createClient();
  const r = await adicionaFormaContato(supabase, pessoaId, tipo, valor);
  if ("erro" in r) return { erro: r.erro };
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
  const limpo = termoDeBusca(termo);
  if (limpo.length < 2) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("organizacao")
    .select("id, nome, cidade")
    .ilike("nome_busca", `%${limpo}%`)
    .order("nome")
    .limit(8);

  return data ?? [];
}

export async function buscarPessoas(termo: string) {
  const limpo = termoDeBusca(termo);
  if (limpo.length < 2) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("pessoa")
    .select("id, nome")
    .ilike("nome_busca", `%${limpo}%`)
    .order("nome")
    .limit(8);

  return data ?? [];
}
