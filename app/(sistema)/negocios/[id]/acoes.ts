"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import type { Desfecho } from "@/app/(sistema)/kanban/constantes";
import { mudaNegocio, type MudancaNegocio } from "@/lib/regras/negocio";
import { criaAnotacao } from "@/lib/regras/anotacao";
import { mudaAtividade } from "@/lib/regras/atividade";

type Status = Database["public"]["Enums"]["status_negocio"];

/** Só estes campos são editáveis. Lista fechada, e não o que vier da tela. */
const CAMPOS = [
  "valor",
  "etapa_id",
  "status",
  "responsavel_id",
  "origem_id",
  "produto_id",
  "motivo_perda_id",
  "titulo",
  // Trocar a organização de um negócio é paridade com o Pipedrive, e
  // acontece de verdade: negócio aberto no cadastro errado entre os 668
  // grupos de nome repetido (D-121) só se conserta assim.
  "organizacao_id",
] as const;

type Campo = (typeof CAMPOS)[number];

/**
 * Edita um campo do negócio.
 *
 * ⚠️ Quatro destes campos — etapa, valor, responsável e status — geram
 * evento no log por gatilho no banco (B-051). É aqui que o log de eventos
 * começa a existir de verdade: até agora `evento_negocio` estava vazia,
 * porque a carga de migração não dispara o gatilho.
 *
 * ⚠️ D-145 revogou a D-047: mudar de etapa não exige mais desfecho
 * nenhum. O parâmetro segue aceito para quem quiser mover e declarar de
 * uma vez.
 */
export async function editarCampo(
  negocioId: string,
  campo: Campo,
  valor: string | number | null,
  desfecho?: Desfecho
) {
  if (!CAMPOS.includes(campo)) return { erro: "Campo não editável." };

  const supabase = await createClient();
  const mudanca: MudancaNegocio = { [campo]: valor } as MudancaNegocio;

  if (campo === "etapa_id" && valor && desfecho) {
    if (desfecho.status === "perdido" && !desfecho.motivoId) {
      return { erro: "Negócio perdido exige motivo." };
    }
    mudanca.status = desfecho.status as Status;
    mudanca.motivo_perda_id =
      desfecho.status === "perdido" ? desfecho.motivoId ?? null : null;
  }

  // Sair de Perdido larga o motivo, e virar Ganho cria o follow-up
  // (D-021) — os dois dentro de `mudaNegocio`, que é o caminho único
  // de mudança do negócio para a tela, o Kanban e o agente de IA.
  const r = await mudaNegocio(supabase, negocioId, mudanca);
  if ("erro" in r) return { erro: r.erro };

  revalidatePath(`/negocios/${negocioId}`);
  revalidatePath("/negocios");
  revalidatePath("/kanban");
  if (mudanca.status === "ganho") revalidatePath("/atividades");
  return { ok: true };
}

/** Ganho e Perdido pelos botões do topo (B-056), sem passar pela etapa. */
export async function declararDesfecho(negocioId: string, desfecho: Desfecho) {
  if (desfecho.status === "perdido" && !desfecho.motivoId) {
    return { erro: "Negócio perdido exige motivo." };
  }

  const supabase = await createClient();

  // ⚠️ A ETAPA NÃO MUDA MAIS. Antes, declarar o desfecho empurrava o
  // negócio para "Aguardando Contrato" — consequência da D-047, que
  // exigia estar lá para ter desfecho. Com a D-145 isso deixou de fazer
  // sentido e passou a destruir informação: um negócio perdido em Cold
  // Lead ia parar na etapa final e ninguém mais saberia ONDE ele morreu.
  // Os dados herdados mostram perdas em todas as etapas (147 em Cold
  // Lead, 786 em Proposta Enviada) — é assim que se lê um funil.
  //
  // É também o princípio que o CLAUDE.md já enunciava: status e etapa
  // são dimensões independentes. A etapa diz até onde chegou; o status
  // diz como terminou.
  // D-021: ganhar cria o follow-up — dentro de `mudaNegocio`, depois
  // do update e nunca antes.
  const r = await mudaNegocio(supabase, negocioId, {
    status: desfecho.status as Status,
    motivo_perda_id: desfecho.status === "perdido" ? desfecho.motivoId : null,
  });
  if ("erro" in r) return { erro: r.erro };

  revalidatePath(`/negocios/${negocioId}`);
  revalidatePath("/negocios");
  revalidatePath("/kanban");
  revalidatePath("/atividades");
  return { ok: true };
}

/* ---------- anotações (B-053) ---------- */

export async function criarAnotacao(negocioId: string, texto: string) {
  const supabase = await createClient();

  // O autor sai da sessão, não da tela: quem escreve não escolhe a
  // própria assinatura. Resolve por `auth_id` e não por `id` — a D-109
  // separou os dois, e confundi-los foi o que quebrou o log do Julio.
  const { data: eu } = await supabase.rpc("usuario_atual");

  const r = await criaAnotacao(supabase, { negocioId, texto, autorId: eu ?? null });
  if ("erro" in r) return { erro: r.erro };

  revalidatePath(`/negocios/${negocioId}`);
  return { ok: true };
}

export async function editarAnotacao(id: string, negocioId: string, texto: string) {
  const corpo = texto.trim();
  if (!corpo) return { erro: "Anotação vazia." };

  const supabase = await createClient();
  const { error } = await supabase.from("anotacao").update({ texto: corpo }).eq("id", id);

  if (error) return { erro: error.message };

  revalidatePath(`/negocios/${negocioId}`);
  return { ok: true };
}

export async function excluirAnotacao(id: string, negocioId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("anotacao").delete().eq("id", id);

  if (error) return { erro: error.message };

  revalidatePath(`/negocios/${negocioId}`);
  return { ok: true };
}

/** Marcar atividade como concluída — a ação mais repetida do vendedor. */
export async function alternarAtividade(
  id: string,
  negocioId: string,
  concluida: boolean
) {
  const supabase = await createClient();
  const r = await mudaAtividade(supabase, id, { concluida });
  if ("erro" in r) return { erro: r.erro };

  revalidatePath(`/negocios/${negocioId}`);
  return { ok: true };
}

/* ---------- pessoas do negócio (negocio_pessoa) ----------
 *
 * A tabela existia e era só lida: a ficha mostrava as pessoas vindas da
 * migração e não havia como acrescentar nem tirar. Num negócio novo a
 * lista nascia sempre vazia, sem remédio.
 *
 * ⚠️ O cargo NÃO é gravado aqui. Ele pertence ao vínculo pessoa↔organização
 * (D-036), não ao vínculo pessoa↔negócio — e é a ficha do contato que o
 * edita. Aqui só se declara quem participa deste negócio.
 */

export async function vincularPessoa(negocioId: string, pessoaId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("negocio_pessoa")
    .insert({ negocio_id: negocioId, pessoa_id: pessoaId });

  if (error) {
    // 23505 = chave duplicada. Vincular quem já está vinculado não é
    // erro do ponto de vista de quem clicou: o estado desejado já vale.
    if (error.code === "23505") return { ok: true };
    return { erro: error.message };
  }

  revalidatePath(`/negocios/${negocioId}`);
  return { ok: true };
}

export async function desvincularPessoa(negocioId: string, pessoaId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("negocio_pessoa")
    .delete()
    .eq("negocio_id", negocioId)
    .eq("pessoa_id", pessoaId);

  if (error) return { erro: error.message };

  revalidatePath(`/negocios/${negocioId}`);
  return { ok: true };
}
