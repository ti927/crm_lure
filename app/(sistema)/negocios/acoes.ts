"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import type { Desfecho } from "@/app/(sistema)/kanban/constantes";
import { criarFollowUpDoGanho } from "@/app/(sistema)/notificacoes/follow-up";

type Status = Database["public"]["Enums"]["status_negocio"];

/**
 * Persiste a ultima combinacao de filtro e ordenacao da Lista para o
 * usuario logado (B-045: "filtros e ordenacao voltam iguais apos
 * recarregar e apos novo login").
 *
 * A pagina nunca entra na string salva — pedir a pagina 7 de um recorte
 * que encolheu mostraria vazio. Quem monta a string ja tira "pagina"
 * antes de chamar isto (ver `usar-filtros-lista.ts` e `link-ordenacao.tsx`).
 */
export async function salvarPreferenciaLista(query: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("usuario")
    .update({ preferencia_lista_negocios: query })
    .eq("auth_id", user.id);
}

/* ==================================================================
 * Criar, excluir — o buraco que a verificacao da F10 encontrou.
 *
 * O negocio era a unica entidade do sistema sem caminho de criacao:
 * organizacao, pessoa, produto, atividade e anotacao ja tinham CRUD, e
 * ele nao. Passou despercebido porque as F3, F4 e F5 foram construidas
 * sobre 2.458 negocios ja migrados — nunca houve o momento em que
 * alguem precisou de um novo. Sem isto o criterio 2 da D-098 e
 * impossivel: no vocabulario deste projeto todo contato novo vira um
 * negocio em Cold Lead, e nao havia onde registrar.
 * ================================================================== */

export type DadosNegocio = {
  titulo: string;
  organizacaoId: string;
  etapaId: string;
  valor: string;
  responsavelId: string;
  origemId: string;
  produtoId: string;
};

/**
 * Cria um negocio.
 *
 * ⚠️ D-145 revoga a D-047: nenhuma etapa exige desfecho ao nascer.
 * Quem ja sabe o resultado pode declarar; quem nao sabe, cria e pronto.
 *
 * O que a checagem daqui ainda garante — e por isso ela continua no
 * servidor, onde dialogo nenhum a contorna: Perdido exige motivo.
 *
 * ⚠️ O status nao vem da tela: sai de `etapa.status_inicial` (D-045).
 * Cold Lead nasce `parado`, e e por isso que "parado" e a maioria da
 * base sem ser anomalia.
 *
 * ⚠️ Criar nao gera evento no log, e isso esta certo: `tipo_evento` tem
 * quatro valores — etapa, valor, responsavel, status — e o gatilho e
 * `after update`. O log registra a trajetoria de um negocio, nao o seu
 * nascimento, que ja esta em `criado_em`.
 */
export async function criarNegocio(d: DadosNegocio, desfecho?: Desfecho) {
  const titulo = d.titulo.trim();
  if (!titulo) return { erro: "O título é obrigatório." };
  if (!d.organizacaoId) return { erro: "A organização é obrigatória." };
  if (!d.etapaId) return { erro: "A etapa é obrigatória." };

  const supabase = await createClient();

  const { data: etapa } = await supabase
    .from("etapa")
    .select("nome, status_inicial")
    .eq("id", d.etapaId)
    .single();

  if (!etapa) return { erro: "Etapa não encontrada." };

  let status: Status = etapa.status_inicial;
  let motivoPerdaId: string | null = null;

  // ⚠️ D-145: criar em qualquer etapa não exige mais desfecho. Quem já
  // sabe o resultado pode declarar na criação; quem não sabe, cria e o
  // status vem de `etapa.status_inicial` (D-045).
  if (desfecho) {
    if (desfecho.status === "perdido" && !desfecho.motivoId) {
      return { erro: "Negócio perdido exige motivo." };
    }
    status = desfecho.status;
    motivoPerdaId = desfecho.status === "perdido" ? desfecho.motivoId ?? null : null;
  }

  // Valor vem como texto do formulario. Vazio e nulo — e diferente de
  // zero, que seria negocio de R$ 0,00.
  const bruto = d.valor.trim().replace(/\./g, "").replace(",", ".");
  const valor = bruto === "" ? null : Number(bruto);
  if (valor !== null && !Number.isFinite(valor)) return { erro: "Valor inválido." };

  const { data, error } = await supabase
    .from("negocio")
    .insert({
      titulo,
      organizacao_id: d.organizacaoId,
      etapa_id: d.etapaId,
      status,
      motivo_perda_id: motivoPerdaId,
      valor,
      responsavel_id: d.responsavelId || null,
      origem_id: d.origemId || null,
      produto_id: d.produtoId || null,
    })
    .select("id")
    .single();

  if (error) return { erro: error.message };

  // D-021. ⚠️ Sim, um negocio pode NASCER ganho: a D-017 deixa criar
  // em qualquer etapa e quem ja sabe o resultado pode declara-lo aqui.
  // Nascer ganho sem follow-up seria o unico caminho de desfecho sem a
  // automacao — e o comprador que entra ja fechado e justamente o que
  // mais merece retorno.
  if (status === "ganho") {
    await criarFollowUpDoGanho(supabase, data.id);
    revalidatePath("/atividades");
  }

  revalidatePath("/negocios");
  revalidatePath("/kanban");
  return { ok: true, id: data.id };
}

/**
 * Exclui um negocio.
 *
 * ⚠️ Leva junto, por cascata do schema: atividades, anotacoes, vinculos
 * com pessoas e **o log de eventos daquele negocio**. O log e a unica
 * coisa nao recuperavel do sistema — quem chama isto precisa ter avisado
 * a pessoa, e o dialogo avisa.
 *
 * ⚠️ Nao ha exclusao em massa, de proposito. Uma de cada vez, sempre
 * partindo da ficha do negocio que se esta olhando.
 */
export async function excluirNegocio(id: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("negocio").delete().eq("id", id);
  if (error) return { erro: error.message };

  revalidatePath("/negocios");
  revalidatePath("/kanban");
  return { ok: true };
}
