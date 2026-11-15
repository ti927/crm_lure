import type { Cliente, Falha, Opcoes } from "./comum";

export type NovaAnotacao = {
  texto: string;
  /** `usuario.id` de quem escreve — sai da sessão, nunca da tela (D-109). */
  autorId: string | null;
  negocioId?: string | null;
  organizacaoId?: string | null;
  pessoaId?: string | null;
};

/**
 * Cria uma anotação. Pertence a negócio, organização ou pessoa — a um
 * deles pelo menos (D-108 vale para anotação também).
 */
export async function criaAnotacao(
  supabase: Cliente,
  a: NovaAnotacao,
  opcoes: Opcoes = {}
): Promise<Falha | { ok: true; id: string | null; ensaio?: true }> {
  const corpo = a.texto.trim();
  if (!corpo) return { erro: "Anotação vazia." };
  if (!a.negocioId && !a.organizacaoId && !a.pessoaId) {
    return { erro: "A anotação precisa de um negócio, organização ou pessoa." };
  }

  if (opcoes.ensaio) {
    const [tabela, id] = a.negocioId
      ? (["negocio", a.negocioId] as const)
      : a.organizacaoId
        ? (["organizacao", a.organizacaoId] as const)
        : (["pessoa", a.pessoaId!] as const);
    const { data } = await supabase.from(tabela).select("id").eq("id", id).maybeSingle();
    if (!data) return { erro: "Registro da anotação não encontrado." };
    return { ok: true, id: null, ensaio: true };
  }

  const { data, error } = await supabase
    .from("anotacao")
    .insert({
      texto: corpo,
      autor_id: a.autorId,
      negocio_id: a.negocioId ?? null,
      organizacao_id: a.organizacaoId ?? null,
      pessoa_id: a.pessoaId ?? null,
    })
    .select("id")
    .single();

  if (error) return { erro: error.message };
  return { ok: true, id: data.id };
}
