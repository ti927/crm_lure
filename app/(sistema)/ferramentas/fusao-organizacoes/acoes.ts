"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * ⚠️ A trava de verdade está no BANCO, dentro de `funde_organizacao`, e
 * foi verificada usuário a usuário: Julio e Fabio passam, os outros
 * quatro recebem `insufficient_privilege`. Estas checagens aqui existem
 * para o erro chegar em português e a tela nem ser montada — não são
 * elas que protegem.
 */
async function exigeDesenvolvedor() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("sou_desenvolvedor");
  return { supabase, dev: data === true };
}

export type Previa = {
  principal: { id: string; nome: string };
  duplicada: { id: string; nome: string };
  move: {
    negocios: number;
    atividades: number;
    anotacoes: number;
    pessoas: number;
  };
  ja_vinculadas: number;
  adota: Record<string, string>;
  descarta: Record<string, string>;
};

export async function previaFusao(principalId: string, duplicadaId: string) {
  const { supabase, dev } = await exigeDesenvolvedor();
  if (!dev) return { erro: "Esta ferramenta é restrita aos desenvolvedores." };

  const { data, error } = await supabase.rpc("previa_fusao_organizacao", {
    p_principal: principalId,
    p_duplicada: duplicadaId,
  });
  if (error) return { erro: error.message };
  return { previa: data as unknown as Previa };
}

/**
 * Funde UMA duplicada na principal.
 *
 * ⚠️ Uma por vez, por decisão do maestro. Um botão de "fundir o grupo
 * inteiro" existiria para ser clicado sem ler — e são 668 grupos, onde o
 * agrupamento é por NOME e nome igual não prova que é a mesma empresa.
 * A operação não tem desfazer.
 */
export async function fundirOrganizacao(principalId: string, duplicadaId: string) {
  const { supabase, dev } = await exigeDesenvolvedor();
  if (!dev) return { erro: "Esta ferramenta é restrita aos desenvolvedores." };

  const { data, error } = await supabase.rpc("funde_organizacao", {
    p_principal: principalId,
    p_duplicada: duplicadaId,
  });
  if (error) return { erro: error.message };

  revalidatePath("/ferramentas/fusao-organizacoes");
  revalidatePath("/contatos");
  return { resultado: data as unknown as Record<string, unknown> };
}
