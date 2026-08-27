"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import type { Desfecho } from "./constantes";
import { paraCartao } from "./consulta";
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
 * ⚠️ R-006: a base inteira nunca vai para o navegador. Sao 2.461
 * negocios, e "Proposta Enviada" sozinha tem 1.168 — carregar a coluna
 * inteira derrubaria a tela. Cada coluna comeca com poucos e cresce sob
 * demanda.
 *
 * ⚠️ Sai da funcao `kanban_coluna` no banco, e nao de uma consulta do
 * PostgREST, desde que a barra de busca entrou: a C-04 registra que
 * coluna de tabela vinculada nao e aceita dentro de `or`, e a busca
 * precisa cobrir o nome da ORGANIZACAO, que e vinculada. Buscar os ids
 * das organizacoes antes e passa-los em `in` (a saida que a Lista usa)
 * nao serve aqui: sao 2.897, e um termo curto passaria do teto calado.
 */
export async function maisDaEtapa(
  etapaId: string,
  jaCarregados: number,
  quantos: number,
  responsavelId?: string,
  termo?: string
) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("kanban_coluna", {
    p_etapa: etapaId,
    p_termo: termo?.trim() || null,
    // ⚠️ Sem isto, "carregar mais" traria negocios de fora do recorte e o
    // quadro passaria a mostrar mais do que o filtro promete.
    p_responsavel: responsavelId || null,
    p_deslocamento: jaCarregados,
    p_limite: quantos,
  });

  if (error) return { erro: error.message, cartoes: [] };
  return { cartoes: (data ?? []).map(paraCartao) };
}

/**
 * O que sobrevive a um logout, das coisas que a URL do Kanban carrega.
 *
 * ⚠️ `busca` fica DE FORA de proposito. Filtro de responsavel e uma
 * escolha de trabalho — "minha carteira" continua sendo minha carteira
 * na semana que vem. Termo de busca e uma pergunta de agora: reabrir o
 * quadro daqui a tres dias filtrado por "sicoob", sem ter pedido, seria
 * o sistema escondendo negocio sem dizer por que.
 */
const PERSISTENTES = ["responsavel"];

/**
 * Guarda a combinacao de filtros do Kanban no usuario.
 *
 * ⚠️ Grava string VAZIA quando nao sobrou filtro persistente nenhum, e
 * isso e deliberado: vazio quer dizer "escolhi ver tudo", enquanto NULO
 * quer dizer "nunca escolhi" — e so o nulo faz a tela abrir em "so os
 * meus". Se limpar o filtro deixasse a coluna nula, o padrao voltaria no
 * carregamento seguinte e o botao "Limpar" pareceria nao fazer nada.
 */
export async function salvarPreferenciaKanban(query: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const entrada = new URLSearchParams(query);
  const guardar = new URLSearchParams();
  for (const chave of PERSISTENTES) {
    const v = entrada.get(chave);
    if (v) guardar.set(chave, v);
  }

  await supabase
    .from("usuario")
    .update({ preferencia_kanban: guardar.toString() })
    .eq("auth_id", user.id);
}
