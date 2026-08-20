"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import type { Desfecho } from "./constantes";
import { criarFollowUpDoGanho } from "@/app/(sistema)/notificacoes/follow-up";

type Status = Database["public"]["Enums"]["status_negocio"];

/**
 * Move um negocio de etapa.
 *
 * ⚠️ D-145 revogou a D-047: NENHUMA etapa exige desfecho. Toda transicao
 * e livre, e mover so muda a etapa — o status fica como esta.
 *
 * O parametro `desfecho` continua aceito porque o mesmo caminho serve
 * para mover E declarar de uma vez, quando quem arrasta ja sabe o
 * resultado. So que agora e opcional de verdade.
 */
export async function moverNegocio(
  negocioId: string,
  etapaId: string,
  desfecho?: Desfecho
) {
  const supabase = await createClient();

  const { data: etapa, error: erroEtapa } = await supabase
    .from("etapa")
    .select("nome")
    .eq("id", etapaId)
    .single();

  if (erroEtapa || !etapa) return { erro: "Etapa não encontrada." };
  void etapa;

  const mudanca: { etapa_id: string; status?: Status; motivo_perda_id?: string | null } =
    { etapa_id: etapaId };

  if (desfecho) {
    // O motivo continua obrigatorio na perda: isso e regra de dado, nao
    // de fluxo, e o banco recusa de qualquer forma.
    if (desfecho.status === "perdido" && !desfecho.motivoId) {
      return { erro: "Negócio perdido exige motivo." };
    }
    mudanca.status = desfecho.status;
    mudanca.motivo_perda_id =
      desfecho.status === "perdido" ? desfecho.motivoId! : null;
  }

  const { error } = await supabase
    .from("negocio")
    .update(mudanca)
    .eq("id", negocioId);

  if (error) return { erro: error.message };

  // D-021: arrastar o cartao para Aguardando Contrato e declarar Ganho e
  // um dos tres caminhos de desfecho da D-047, entao cria follow-up
  // igual aos outros dois. Regra que so vale num caminho nao e regra.
  if (mudanca.status === "ganho") {
    await criarFollowUpDoGanho(supabase, negocioId);
    revalidatePath("/atividades");
  }

  revalidatePath("/kanban");
  revalidatePath("/negocios");
  return { ok: true };
}

/**
 * Proxima fatia de uma coluna.
 *
 * ⚠️ R-006: a base inteira nunca vai para o navegador. Sao 2.458
 * negocios, e "Proposta Enviada" sozinha tem 1.168 — carregar a coluna
 * inteira derrubaria a tela. Cada coluna comeca com poucos e cresce sob
 * demanda.
 */
export async function maisDaEtapa(
  etapaId: string,
  jaCarregados: number,
  quantos: number,
  responsavelId?: string
) {
  const supabase = await createClient();

  let consulta = supabase
    .from("negocio")
    .select("id, titulo, valor, status, organizacao(nome), usuario(nome, foto_url)")
    .eq("etapa_id", etapaId)
    // D-145: o quadro so tem negocio aberto. Sem isto, "carregar mais"
    // traria os encerrados de volta e o total nao bateria com a coluna.
    .in("status", ["parado", "negociacao"]);

  // Sem isto, "carregar mais" traria negócios de fora do recorte e o
  // quadro passaria a mostrar mais do que o filtro promete.
  if (responsavelId) consulta = consulta.eq("responsavel_id", responsavelId);

  const { data, error } = await consulta
    .order("criado_em", { ascending: false })
    .range(jaCarregados, jaCarregados + quantos - 1);

  if (error) return { erro: error.message, cartoes: [] };
  return { cartoes: data ?? [] };
}
