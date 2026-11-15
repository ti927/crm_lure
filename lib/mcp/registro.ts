import type { Acesso } from "./acesso";

/**
 * Registro de toda chamada de agente (D-178) e as travas da escrita
 * (Doc 16 §5 e §7).
 *
 * ⚠️ TODA ferramenta passa por `comRegistro` (leitura) ou `comEscrita`
 * (escrita). Se o registro falhar, a resposta NÃO sai — um agente que
 * age sem rastro é exatamente o que a D-178 proíbe.
 */

export type Resultado = { content: { type: "text"; text: string }[]; isError?: boolean };

/** O que a ferramenta devolve: a resposta e, se houver, o link do registro tocado. */
export type Saida = Resultado & { alvo?: string };

/**
 * Teto de escritas de verdade por usuário por dia, somando todos os
 * agentes dele (P-058). Ensaio não conta. Protege a base — que não tem
 * cópia de teste — de um agente em laço ou de instrução escondida num
 * texto que ele leu.
 */
export const LIMITE_DIARIO_DE_ESCRITAS = 100;

export function texto(dados: unknown): Saida {
  return { content: [{ type: "text", text: JSON.stringify(dados, null, 2) }] };
}

export function erro(mensagem: string): Saida {
  return { isError: true, content: [{ type: "text", text: mensagem }] };
}

export async function comRegistro(
  acesso: Acesso,
  ferramenta: string,
  argumentos: Record<string, unknown>,
  executa: () => Promise<Saida>,
  escrita = false
): Promise<Resultado> {
  let saida: Saida;
  let falha: string | null = null;
  try {
    saida = await executa();
    if (saida.isError) falha = saida.content[0]?.text ?? "erro";
  } catch (e) {
    falha = e instanceof Error ? e.message : String(e);
    saida = erro("Falha interna ao executar a ferramenta.");
  }

  const { error } = await acesso.supabase.rpc("registra_chamada_agente", {
    p_ferramenta: ferramenta,
    p_argumentos: argumentos as never,
    p_sucesso: !falha,
    p_erro: falha ?? undefined,
    p_escrita: escrita,
    p_alvo: saida.alvo,
  });

  // Sem registro, sem resposta (D-178).
  if (error) {
    return erro(
      escrita && !falha
        ? "A gravação foi feita, mas o registro da chamada falhou. Confira no CRM antes de repetir."
        : "A chamada não pôde ser registrada no CRM e por isso não foi atendida. Tente de novo."
    );
  }
  const { alvo: _alvo, ...resultado } = saida;
  void _alvo;
  return resultado;
}

/**
 * Embrulho das ferramentas que escrevem.
 *
 * - `sensivel`: etapa, valor, responsável e desfecho só passam se o
 *   usuário deixou o interruptor ligado em Agentes de IA (D-176). Linha
 *   ausente = ligado (D-178).
 * - Fora do ensaio, recusa quando o teto do dia já foi atingido.
 * - Só conta como escrita (para o teto e para o registro) o que não foi
 *   ensaio.
 */
export async function comEscrita(
  acesso: Acesso,
  ferramenta: string,
  argumentos: Record<string, unknown> & { ensaio?: boolean },
  opcoes: { sensivel?: boolean },
  executa: () => Promise<Saida>
): Promise<Resultado> {
  const ensaio = Boolean(argumentos.ensaio);

  return comRegistro(
    acesso,
    ferramenta,
    argumentos,
    async () => {
      if (opcoes.sensivel) {
        const { data, error } = await acesso.supabase
          .from("preferencia_agente")
          .select("escrita_sensivel")
          .eq("usuario_id", acesso.usuarioId)
          .maybeSingle();
        if (error) return erro(`Falha ao conferir a permissão: ${error.message}`);
        if (data && !data.escrita_sensivel) {
          return erro(
            "O usuário desligou as mudanças sensíveis (etapa, valor, responsável e desfecho) para agentes. " +
              "Ele pode religar no CRM, em Agentes de IA. Não tente outro caminho."
          );
        }
      }

      if (!ensaio) {
        const { data: feitas, error } = await acesso.supabase.rpc("escritas_de_agente_hoje");
        if (error) return erro(`Falha ao conferir o limite diário: ${error.message}`);
        if ((feitas ?? 0) >= LIMITE_DIARIO_DE_ESCRITAS) {
          return erro(
            `Limite diário de ${LIMITE_DIARIO_DE_ESCRITAS} gravações por agentes atingido para este usuário. ` +
              "Volta a valer amanhã. O que faltou precisa ser feito pela tela do CRM."
          );
        }
      }

      return executa();
    },
    !ensaio
  );
}
