import { normalizaUf } from "@/lib/uf";
import { termoDeBusca } from "@/lib/formato";
import type { Cliente, Falha, Opcoes } from "./comum";

export type NovaOrganizacao = {
  nome: string;
  cidade: string;
  /** Sigla de duas letras, ou vazio. Normalizada aqui. */
  uf: string;
  endereco: string;
  website: string;
  bubbleId: string;
};

/** Um cadastro que já existe com o mesmo nome — o que o aviso mostra. */
export type Homonima = { id: string; nome: string; cidade: string | null; uf: string | null };

/**
 * Cadastros com o MESMO nome, ignorando acento e caixa (D-168).
 *
 * ⚠️ Nome igual, e não parecido: aviso que dispara em parecença vira
 * barulho. `nome_busca` é a coluna gerada sem acento.
 */
export async function organizacoesComMesmoNome(supabase: Cliente, nome: string): Promise<Homonima[]> {
  const alvo = termoDeBusca(nome);
  if (!alvo) return [];

  const { data } = await supabase
    .from("organizacao")
    .select("id, nome, cidade, uf")
    .eq("nome_busca", alvo)
    .order("nome")
    .limit(10);

  return data ?? [];
}

/**
 * Cria uma organização.
 *
 * ⚠️ RECUSA NA PRIMEIRA TENTATIVA quando já existe cadastro de mesmo nome
 * e devolve quais são (D-168): 41% da base é duplicata de nome. Não é
 * trava — `confirmado` passa por cima —, é fazer quem cria VER a lista.
 * Vale para a tela e para o agente: o caminho apressado é onde a
 * duplicata nasce.
 */
export async function criaOrganizacao(
  supabase: Cliente,
  d: NovaOrganizacao,
  opcoes: Opcoes & { confirmado?: boolean } = {}
): Promise<Falha | { duplicadas: Homonima[] } | { ok: true; id: string | null; ensaio?: true }> {
  const nome = d.nome.trim();
  if (!nome) return { erro: "O nome é obrigatório." };

  if (!opcoes.confirmado) {
    const jaExistem = await organizacoesComMesmoNome(supabase, nome);
    if (jaExistem.length > 0) return { duplicadas: jaExistem };
  }

  const uf = normalizaUf(d.uf);
  if (d.uf.trim() && !uf) return { erro: "UF inválida: use a sigla de duas letras (ex.: GO)." };

  if (opcoes.ensaio) return { ok: true, id: null, ensaio: true };

  const { data, error } = await supabase
    .from("organizacao")
    .insert({
      nome,
      cidade: d.cidade.trim() || null,
      endereco: d.endereco.trim() || null,
      uf,
      website: d.website.trim() || null,
      bubble_id: d.bubbleId.trim() || null,
    })
    .select("id")
    .single();

  if (error) return { erro: error.message };
  return { ok: true, id: data.id };
}

export async function criaPessoa(
  supabase: Cliente,
  nome: string,
  opcoes: Opcoes = {}
): Promise<Falha | { ok: true; id: string | null; ensaio?: true }> {
  const limpo = nome.trim();
  if (!limpo) return { erro: "O nome é obrigatório." };
  if (opcoes.ensaio) return { ok: true, id: null, ensaio: true };

  const { data, error } = await supabase.from("pessoa").insert({ nome: limpo }).select("id").single();
  if (error) return { erro: error.message };
  return { ok: true, id: data.id };
}

/**
 * Vincula pessoa a organização. ⚠️ O cargo mora no VÍNCULO (D-036).
 * ⚠️ Dois uuid seguidos: confira a ordem (C-13).
 */
export async function vinculaPessoaOrganizacao(
  supabase: Cliente,
  pessoaId: string,
  organizacaoId: string,
  cargo: string
): Promise<Falha | { ok: true }> {
  const { error } = await supabase.from("pessoa_organizacao").insert({
    pessoa_id: pessoaId,
    organizacao_id: organizacaoId,
    cargo: cargo.trim() || null,
  });

  if (error) {
    if (error.code === "23505") return { erro: "Esta pessoa já está vinculada a essa organização." };
    return { erro: error.message };
  }
  return { ok: true };
}

export async function adicionaFormaContato(
  supabase: Cliente,
  pessoaId: string,
  tipo: "telefone" | "email",
  valor: string
): Promise<Falha | { ok: true }> {
  const limpo = valor.trim();
  if (!limpo) return { erro: "O valor é obrigatório." };

  const { error } = await supabase.from("forma_contato").insert({ pessoa_id: pessoaId, tipo, valor: limpo });
  if (error) return { erro: error.message };
  return { ok: true };
}
