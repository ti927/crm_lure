"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type NovaAtividade = Database["public"]["Tables"]["atividade"]["Insert"];

/**
 * Dados que a tela envia. O vínculo é um par tipo+id, e não três campos —
 * a interface deixa escolher UM alvo (negócio, organização ou pessoa) ou
 * nenhum, no modelo do Pipedrive (D-108). O banco tem um gatilho que
 * encadeia a organização a partir do negócio ou da pessoa, então aqui só
 * se grava o que o usuário escolheu.
 */
export type DadosAtividade = {
  tipoId: string | null;
  titulo: string;
  data: string;
  horaInicio: string | null;
  horaFim: string | null;
  responsavelId: string | null;
  descricao: string;
  concluida: boolean;
  vinculoTipo: "negocio" | "organizacao" | "pessoa" | null;
  vinculoId: string | null;
};

function paraColunas(d: DadosAtividade): NovaAtividade {
  return {
    tipo_id: d.tipoId,
    titulo: d.titulo.trim() || null,
    data: d.data,
    hora_inicio: d.horaInicio || null,
    hora_fim: d.horaFim || null,
    responsavel_id: d.responsavelId,
    descricao: d.descricao.trim() || null,
    concluida: d.concluida,
    negocio_id: d.vinculoTipo === "negocio" ? d.vinculoId : null,
    organizacao_id: d.vinculoTipo === "organizacao" ? d.vinculoId : null,
    pessoa_id: d.vinculoTipo === "pessoa" ? d.vinculoId : null,
  };
}

/** Data é o único campo sem o qual a atividade não existe (schema). */
function validar(d: DadosAtividade): string | null {
  if (!d.data) return "A data é obrigatória.";
  if (d.horaInicio && d.horaFim && d.horaFim < d.horaInicio) {
    return "A hora de fim não pode ser antes da de início.";
  }
  return null;
}

export async function criarAtividade(d: DadosAtividade) {
  const erro = validar(d);
  if (erro) return { erro };

  const supabase = await createClient();

  // Sem responsável escolhido, assume quem está criando — o caso comum
  // de anotar a própria tarefa. Resolve por auth_id, não por id (D-109).
  let responsavelId = d.responsavelId;
  if (!responsavelId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: eu } = await supabase
      .from("usuario")
      .select("id")
      .eq("auth_id", user?.id ?? "")
      .maybeSingle();
    responsavelId = eu?.id ?? null;
  }

  const { error } = await supabase
    .from("atividade")
    .insert(paraColunas({ ...d, responsavelId }));

  if (error) return { erro: error.message };

  revalidatePath("/atividades");
  if (d.vinculoTipo === "negocio" && d.vinculoId) {
    revalidatePath(`/negocios/${d.vinculoId}`);
  }
  return { ok: true };
}

export async function editarAtividade(id: string, d: DadosAtividade) {
  const erro = validar(d);
  if (erro) return { erro };

  const supabase = await createClient();
  const { error } = await supabase
    .from("atividade")
    .update(paraColunas(d))
    .eq("id", id);

  if (error) return { erro: error.message };

  revalidatePath("/atividades");
  if (d.vinculoTipo === "negocio" && d.vinculoId) {
    revalidatePath(`/negocios/${d.vinculoId}`);
  }
  return { ok: true };
}

/** Marcar concluída é a ação mais repetida — vale no desktop e no mobile. */
export async function concluirAtividade(id: string, concluida: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("atividade")
    .update({ concluida })
    .eq("id", id);

  if (error) return { erro: error.message };

  revalidatePath("/atividades");
  return { ok: true };
}

export async function excluirAtividade(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("atividade").delete().eq("id", id);

  if (error) return { erro: error.message };

  revalidatePath("/atividades");
  return { ok: true };
}

/* ---------- busca de vínculo ---------- */

export type Candidato = {
  tipo: "negocio" | "organizacao" | "pessoa";
  id: string;
  rotulo: string;
  detalhe: string | null;
};

/**
 * Busca as três entidades que uma atividade pode ter como alvo. Um só
 * campo de busca para os três, porque o usuário pensa em "a quem isto se
 * refere", não em qual tabela. Poucos resultados de cada, porque a lista
 * é para escolher um, não para navegar.
 */
export async function buscarVinculos(termo: string): Promise<Candidato[]> {
  const limpo = termo.trim().replace(/[%,()]/g, " ");
  if (limpo.length < 2) return [];

  const supabase = await createClient();
  const filtro = `%${limpo}%`;

  const [{ data: negocios }, { data: orgs }, { data: pessoas }] = await Promise.all([
    supabase
      .from("negocio")
      .select("id, titulo, organizacao(nome)")
      .ilike("titulo", filtro)
      .limit(6),
    supabase.from("organizacao").select("id, nome, cidade").ilike("nome", filtro).limit(6),
    supabase
      .from("pessoa")
      .select("id, nome, pessoa_organizacao(organizacao(nome))")
      .ilike("nome", filtro)
      .limit(6),
  ]);

  const candidatos: Candidato[] = [];

  for (const n of negocios ?? []) {
    candidatos.push({
      tipo: "negocio",
      id: n.id,
      rotulo: n.titulo,
      detalhe: (n.organizacao as { nome: string } | null)?.nome ?? null,
    });
  }
  for (const o of orgs ?? []) {
    candidatos.push({
      tipo: "organizacao",
      id: o.id,
      rotulo: o.nome,
      detalhe: o.cidade,
    });
  }
  for (const p of pessoas ?? []) {
    const org = (
      p.pessoa_organizacao as { organizacao: { nome: string } | null }[] | null
    )?.[0]?.organizacao?.nome;
    candidatos.push({
      tipo: "pessoa",
      id: p.id,
      rotulo: p.nome,
      detalhe: org ?? null,
    });
  }

  return candidatos;
}
