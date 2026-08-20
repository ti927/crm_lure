"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { ETAPA_DE_DESFECHO, type Desfecho } from "./constantes";
import { criarFollowUpDoGanho } from "@/app/(sistema)/notificacoes/follow-up";

type Status = Database["public"]["Enums"]["status_negocio"];

/**
 * Move um negocio de etapa.
 *
 * ⚠️ D-047 — a unica trava do sistema. Entrar em "Aguardando Contrato"
 * exige declarar Ganho ou Perdido, e Perdido exige motivo. A verificacao
 * esta aqui, no servidor, e nao so no dialogo: o dialogo pode ser
 * contornado, uma server action nao. O banco ainda reforca o motivo pela
 * restricao `perdido_exige_motivo`.
 *
 * Todas as demais transicoes sao livres, por decisao explicita — o
 * negocio so muda de etapa, o status fica como esta.
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

  const mudanca: { etapa_id: string; status?: Status; motivo_perda_id?: string | null } =
    { etapa_id: etapaId };

  if (etapa.nome === ETAPA_DE_DESFECHO) {
    if (!desfecho) return { erro: "Esta etapa exige declarar Ganho ou Perdido." };

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
    .eq("etapa_id", etapaId);

  // Sem isto, "carregar mais" traria negócios de fora do recorte e o
  // quadro passaria a mostrar mais do que o filtro promete.
  if (responsavelId) consulta = consulta.eq("responsavel_id", responsavelId);

  const { data, error } = await consulta
    .order("criado_em", { ascending: false })
    .range(jaCarregados, jaCarregados + quantos - 1);

  if (error) return { erro: error.message, cartoes: [] };
  return { cartoes: data ?? [] };
}
