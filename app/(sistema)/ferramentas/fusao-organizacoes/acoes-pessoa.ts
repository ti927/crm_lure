"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Fusão de PESSOAS duplicadas — a segunda aba da ferramenta.
 *
 * ⚠️ A recusa mora no BANCO, dentro de `funde_pessoa`
 * (`pertence_ao_dominio()`), como a D-164 deixou para as organizações.
 * Esconder o botão nunca protegeu nada.
 *
 * ⚠️ **Fundir pessoa é mais perigoso que fundir organização, e a base
 * diz por quê:** "Gustavo" aparece **20 vezes**, "Fabiana Moretti" 14,
 * "Fernanda" 14. Seis "Sicoob Credseguro" são a mesma empresa; vinte
 * "Gustavo" são vinte pessoas de vinte empresas que só têm o primeiro
 * nome cadastrado. Por isso a tela mostra a ORGANIZAÇÃO de cada um antes
 * de qualquer botão — é ela que responde se são a mesma pessoa.
 */

export type PreviaPessoa = {
  principal: string;
  duplicada: string;
  move: {
    contatos: number;
    vinculos: number;
    negocios: number;
    atividades: number;
    anotacoes: number;
  };
  /** O que a principal já tem e por isso não vai duplicar. */
  repetidos: { contatos: number; vinculos: number; negocios: number };
};

export async function previaFusaoPessoa(principalId: string, duplicadaId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("previa_fusao_pessoa", {
    p_principal: principalId,
    p_duplicada: duplicadaId,
  });
  if (error) return { erro: error.message };
  return { previa: data as unknown as PreviaPessoa };
}

/**
 * Funde UMA duplicada na principal.
 *
 * ⚠️ Uma por vez, pelo mesmo motivo da fusão de organizações: um botão de
 * "fundir o grupo inteiro" existiria para ser clicado sem ler, e aqui
 * isso juntaria vinte pessoas diferentes num cadastro só. São 625 grupos
 * e a operação não tem desfazer.
 */
export async function fundirPessoa(principalId: string, duplicadaId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("funde_pessoa", {
    p_principal: principalId,
    p_duplicada: duplicadaId,
  });
  if (error) return { erro: error.message };

  revalidatePath("/ferramentas/fusao-organizacoes");
  revalidatePath("/contatos");
  return { resultado: data as unknown as Record<string, unknown> };
}
