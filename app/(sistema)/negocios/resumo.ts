"use server";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type Status = Database["public"]["Enums"]["status_negocio"];

/**
 * Forma do que `negocio_resumo` devolve.
 *
 * ⚠️ Declarada à mão porque a função retorna `jsonb`: o tipo gerado diz
 * `Json`, que é honesto e inútil. O contrato de verdade está na migração
 * `20260827223000_resumo_do_negocio_rotulos.sql` — se um campo mudar lá,
 * muda aqui.
 */
export type ResumoNegocio = {
  id: string;
  titulo: string;
  valor: number | null;
  status: Status;
  criado_em: string;
  fechado_em: string | null;
  organizacao: { id: string; nome: string; cidade: string | null } | null;
  etapa: { nome: string; ordem: number } | null;
  responsavel: { nome: string; foto_url: string | null } | null;
  origem: string | null;
  produto: string | null;
  motivo_perda: string | null;
  pessoas: {
    id: string;
    nome: string;
    cargo: string | null;
    contatos: { tipo: string; valor: string }[];
  }[];
  atividades: { rotulo: string; data: string; concluida: boolean }[];
  anotacoes: { texto: string; criado_em: string; autor: string | null }[];
  total_atividades: number;
  total_anotacoes: number;
  eventos: {
    tipo: string;
    de: string | null;
    para: string | null;
    ocorrido_em: string;
    importado_do_pipedrive: boolean;
    autor: string | null;
  }[];
};

/**
 * Tudo o que a prévia mostra, numa ida só ao banco.
 *
 * A ficha completa faz onze — o negócio, seis listas de opções para os
 * campos editáveis, mais eventos, anotações, atividades e pessoas. Quem
 * só analisa não precisa da lista de etapas para escolher, e é esse peso
 * que a prévia existe para não pagar.
 */
export async function resumoDoNegocio(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("negocio_resumo", { p_id: id });
  if (error) return { erro: error.message };
  if (!data) return { erro: "Negócio não encontrado." };
  return { resumo: data as unknown as ResumoNegocio };
}
