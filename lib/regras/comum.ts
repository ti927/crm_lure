import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/**
 * Camada comum de regras (Doc 16 §3, D-172, R-009).
 *
 * As telas (Server Actions) e o MCP dos agentes chamam AS MESMAS funções
 * daqui. Regra que mora só na tela não vale para o agente (D-081) — foi
 * por isso que a escrita do agente esperou esta extração.
 *
 * ⚠️ Nada aqui chama `revalidatePath` nem lê cookie: quem chama é que
 * sabe se há tela a atualizar e qual cliente usar (o da sessão do
 * navegador, ou o do agente, com o token dele).
 *
 * ⚠️ Toda função de escrita aceita `ensaio`: faz todas as conferências,
 * lê o que precisar, e devolve o que FARIA — sem gravar nada (Doc 16 §7:
 * não há base de teste).
 */

export type Cliente = SupabaseClient<Database>;

export type Opcoes = { ensaio?: boolean };

export type Falha = { erro: string };

export function falhou<T extends object>(r: T | Falha): r is Falha {
  return "erro" in r;
}
