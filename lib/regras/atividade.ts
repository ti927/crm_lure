import type { Database } from "@/lib/supabase/types";
import type { Cliente, Falha, Opcoes } from "./comum";

type Colunas = Database["public"]["Tables"]["atividade"]["Insert"];
type Mudanca = Database["public"]["Tables"]["atividade"]["Update"];

/**
 * Data é o único campo sem o qual a atividade não existe (schema), e o
 * fim não pode vir antes do início.
 */
function valida(a: { data?: string | null; hora_inicio?: string | null; hora_fim?: string | null }): string | null {
  if (!a.data) return "A data é obrigatória.";
  if (a.hora_inicio && a.hora_fim && a.hora_fim < a.hora_inicio) {
    return "A hora de fim não pode ser antes da de início.";
  }
  return null;
}

/**
 * Cria uma atividade. O vínculo (negócio, organização ou pessoa) é
 * opcional e o banco encadeia a organização a partir dos outros dois
 * (D-108, gatilho `encadeia_vinculo_atividade`).
 */
export async function criaAtividade(
  supabase: Cliente,
  colunas: Colunas,
  opcoes: Opcoes = {}
): Promise<Falha | { ok: true; id: string | null; ensaio?: true }> {
  const problema = valida(colunas);
  if (problema) return { erro: problema };

  if (opcoes.ensaio) {
    const falta = await vinculoInexistente(supabase, colunas);
    if (falta) return { erro: falta };
    return { ok: true, id: null, ensaio: true };
  }

  const { data, error } = await supabase.from("atividade").insert(colunas).select("id").single();
  if (error) return { erro: error.message };
  return { ok: true, id: data.id };
}

/**
 * Muda uma atividade — inteira (a tela manda todos os campos) ou em
 * parte (o agente manda só o que muda). A validação é feita sobre o
 * resultado final, por isso a linha atual é lida antes.
 */
export async function mudaAtividade(
  supabase: Cliente,
  id: string,
  mudanca: Mudanca,
  opcoes: Opcoes = {}
): Promise<Falha | { ok: true; negocioId: string | null; data: string; ensaio?: true }> {
  const { data: atual } = await supabase
    .from("atividade")
    .select("data, hora_inicio, hora_fim, negocio_id")
    .eq("id", id)
    .maybeSingle();
  if (!atual) return { erro: "Atividade não encontrada." };

  const problema = valida({ ...atual, ...mudanca });
  if (problema) return { erro: problema };

  const negocioId = mudanca.negocio_id !== undefined ? mudanca.negocio_id : atual.negocio_id;
  const data = mudanca.data ?? atual.data;

  if (opcoes.ensaio) {
    const falta = await vinculoInexistente(supabase, mudanca);
    if (falta) return { erro: falta };
    return { ok: true, negocioId, data, ensaio: true };
  }

  const { data: linhas, error } = await supabase.from("atividade").update(mudanca).eq("id", id).select("id");
  if (error) return { erro: error.message };
  if (!linhas?.length) return { erro: "Atividade não encontrada." };
  return { ok: true, negocioId, data };
}

/** No ensaio não há insert para a chave estrangeira recusar; confere aqui. */
async function vinculoInexistente(
  supabase: Cliente,
  c: { negocio_id?: string | null; organizacao_id?: string | null; pessoa_id?: string | null; tipo_id?: string | null; responsavel_id?: string | null }
): Promise<string | null> {
  const checa = async (tabela: "negocio" | "organizacao" | "pessoa" | "tipo_atividade" | "usuario", id: string | null | undefined, nome: string) => {
    if (!id) return null;
    const { data } = await supabase.from(tabela).select("id").eq("id", id).maybeSingle();
    return data ? null : `${nome} não encontrado(a).`;
  };
  const r = await Promise.all([
    checa("negocio", c.negocio_id, "Negócio"),
    checa("organizacao", c.organizacao_id, "Organização"),
    checa("pessoa", c.pessoa_id, "Pessoa"),
    checa("tipo_atividade", c.tipo_id, "Tipo de atividade"),
    checa("usuario", c.responsavel_id, "Responsável"),
  ]);
  return r.find(Boolean) ?? null;
}
