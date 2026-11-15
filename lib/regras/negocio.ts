import type { Database } from "@/lib/supabase/types";
import { criarFollowUpDoGanho } from "@/app/(sistema)/notificacoes/follow-up";
import type { Cliente, Falha, Opcoes } from "./comum";

type Status = Database["public"]["Enums"]["status_negocio"];
export type MudancaNegocio = Database["public"]["Tables"]["negocio"]["Update"];

export type NovoNegocio = {
  titulo: string;
  organizacaoId: string;
  etapaId: string;
  /** Já convertido. Nulo é "sem valor", diferente de zero. */
  valor: number | null;
  responsavelId: string | null;
  origemId: string | null;
  produtoId: string | null;
};

export type Desfecho = { status: "ganho" | "perdido"; motivoId?: string | null };

/**
 * Cria um negócio (regra das telas e do agente).
 *
 * ⚠️ O status não vem de quem chama: sai de `etapa.status_inicial`
 * (D-045), salvo desfecho declarado na criação. Perdido exige motivo.
 * ⚠️ D-021: nascer ganho cria o follow-up, como os outros caminhos.
 */
export async function criaNegocio(
  supabase: Cliente,
  d: NovoNegocio,
  desfecho?: Desfecho,
  opcoes: Opcoes = {}
): Promise<Falha | { ok: true; id: string | null; status: Status; etapa: string; ensaio?: true }> {
  const titulo = d.titulo.trim();
  if (!titulo) return { erro: "O título é obrigatório." };
  if (!d.organizacaoId) return { erro: "A organização é obrigatória." };
  if (!d.etapaId) return { erro: "A etapa é obrigatória." };
  if (d.valor !== null && !Number.isFinite(d.valor)) return { erro: "Valor inválido." };

  const { data: etapa } = await supabase
    .from("etapa")
    .select("nome, status_inicial")
    .eq("id", d.etapaId)
    .maybeSingle();
  if (!etapa) return { erro: "Etapa não encontrada." };

  let status: Status = etapa.status_inicial;
  let motivoPerdaId: string | null = null;
  if (desfecho) {
    if (desfecho.status === "perdido" && !desfecho.motivoId) {
      return { erro: "Negócio perdido exige motivo." };
    }
    status = desfecho.status;
    motivoPerdaId = desfecho.status === "perdido" ? desfecho.motivoId ?? null : null;
  }

  if (opcoes.ensaio) {
    // O banco recusaria organização inexistente pela chave estrangeira;
    // no ensaio não há insert, então a conferência é feita aqui.
    const { data: org } = await supabase
      .from("organizacao")
      .select("id")
      .eq("id", d.organizacaoId)
      .maybeSingle();
    if (!org) return { erro: "Organização não encontrada." };
    return { ok: true, id: null, status, etapa: etapa.nome, ensaio: true };
  }

  const { data, error } = await supabase
    .from("negocio")
    .insert({
      titulo,
      organizacao_id: d.organizacaoId,
      etapa_id: d.etapaId,
      status,
      motivo_perda_id: motivoPerdaId,
      valor: d.valor,
      responsavel_id: d.responsavelId || null,
      origem_id: d.origemId || null,
      produto_id: d.produtoId || null,
    })
    .select("id")
    .single();

  if (error) return { erro: error.message };

  if (status === "ganho") await criarFollowUpDoGanho(supabase, data.id);
  return { ok: true, id: data.id, status, etapa: etapa.nome };
}

/**
 * Aplica uma mudança a um negócio — o caminho único de etapa, valor,
 * responsável, status e demais campos (ficha, Kanban, agente).
 *
 * ⚠️ Sair de Perdido larga o motivo: motivo sem perda mente no relatório.
 * ⚠️ D-021: virar Ganho cria o follow-up, qualquer que seja o caminho.
 * ⚠️ O update confere que achou o negócio: update que casa zero linhas
 * devolve sucesso calado (C-13).
 */
export async function mudaNegocio(
  supabase: Cliente,
  negocioId: string,
  mudanca: MudancaNegocio,
  opcoes: Opcoes = {}
): Promise<Falha | { ok: true; ganhou: boolean; ensaio?: true }> {
  const final: MudancaNegocio = { ...mudanca };
  if (final.status !== undefined && final.status !== "perdido") final.motivo_perda_id = null;
  if (final.status === "perdido" && final.motivo_perda_id === null) {
    return { erro: "Negócio perdido exige motivo." };
  }

  if (opcoes.ensaio) {
    const { data: atual } = await supabase
      .from("negocio")
      .select("id, motivo_perda_id")
      .eq("id", negocioId)
      .maybeSingle();
    if (!atual) return { erro: "Negócio não encontrado." };
    if (final.status === "perdido" && !final.motivo_perda_id && !atual.motivo_perda_id) {
      return { erro: "Negócio perdido exige motivo." };
    }
    return { ok: true, ganhou: final.status === "ganho", ensaio: true };
  }

  const { data, error } = await supabase
    .from("negocio")
    .update(final)
    .eq("id", negocioId)
    .select("id");

  if (error) return { erro: error.message };
  if (!data?.length) return { erro: "Negócio não encontrado." };

  const ganhou = final.status === "ganho";
  if (ganhou) await criarFollowUpDoGanho(supabase, negocioId);
  return { ok: true, ganhou };
}
