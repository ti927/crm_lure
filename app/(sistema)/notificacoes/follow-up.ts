import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type Cliente = SupabaseClient<Database>;

/**
 * F8, quarta automação — o follow-up ao ganhar (D-021, Doc 15 §4.4).
 *
 * ⚠️ É o único dos quatro alertas que ESCREVE. Os outros três são
 * derivados na leitura e não deixam rastro; este cria uma atividade de
 * verdade, que a partir daí é uma pendência como qualquer outra — e que
 * um dia vira "lembrete de próxima atividade" e depois "vencida".
 *
 * ⚠️ Mora aqui, e não em gatilho de banco, por dois motivos. A atividade
 * precisa de tipo e de um título em português, que são decisão de
 * aplicação; e a D-047 já concentra os três caminhos de desfecho —
 * mover no Kanban, declarar na ficha, criar já na etapa final — em três
 * server actions que podem chamar esta função. Gatilho pegaria também as
 * escritas de script e de carga, que não devem gerar tarefa nenhuma.
 */

/** Prefixo estável: é por ele que a guarda de duplicata reconhece o item. */
const PREFIXO = "Follow-up:";

/**
 * Cria o follow-up de um negócio recém-ganho. Silencioso por desenho:
 * qualquer problema aqui não pode derrubar a declaração do Ganho, que é
 * o que o usuário de fato pediu. Devolve o que aconteceu para quem
 * quiser registrar.
 */
export async function criarFollowUpDoGanho(
  supabase: Cliente,
  negocioId: string,
): Promise<{ criada: boolean; motivo?: string }> {
  try {
    // ⚠️ A preferência lida é a de quem está declarando o Ganho — a RLS
    // de `preferencia_notificacao` só devolve as linhas do próprio
    // usuário, e é assim que tem de ser. Na operação real os sócios
    // fecham os próprios negócios, então quem declara e quem é
    // responsável são a mesma pessoa. Ver P-043 no Doc 15: o caso de
    // fechar o negócio de outro nunca foi decidido.
    const { data: pref } = await supabase
      .from("preferencia_notificacao")
      .select("ativo, dias")
      .eq("tipo", "follow_up_ganho")
      .maybeSingle();

    // Linha ausente = padrão do sistema, e o padrão é ativo (D-021).
    if (pref && !pref.ativo) return { criada: false, motivo: "desativado pelo usuário" };

    const { data: padraoBruto } = await supabase.rpc("padrao_notificacao", {
      p_tipo: "follow_up_ganho",
    });
    const dias = pref?.dias ?? (padraoBruto as number | null) ?? 90;

    const { data: negocio } = await supabase
      .from("negocio")
      .select("id, titulo, responsavel_id")
      .eq("id", negocioId)
      .maybeSingle();

    if (!negocio) return { criada: false, motivo: "negócio não encontrado" };

    // ⚠️ Guarda de duplicata. Ganhar, reverter e ganhar de novo passaria
    // duas vezes por aqui; sem isto o vendedor acumularia follow-ups
    // repetidos do mesmo negócio, que é ruído com cara de tarefa.
    const { data: jaExiste } = await supabase
      .from("atividade")
      .select("id")
      .eq("negocio_id", negocioId)
      .eq("concluida", false)
      .ilike("titulo", `${PREFIXO}%`)
      .limit(1)
      .maybeSingle();

    if (jaExiste) return { criada: false, motivo: "já há follow-up pendente" };

    // "Tarefa" é o tipo mais próximo entre os seis herdados do Pipedrive;
    // não existe um tipo "Follow-up" e criar um seria mexer numa lista
    // configurável que não tem tela no MVP.
    const { data: tipo } = await supabase
      .from("tipo_atividade")
      .select("id")
      .eq("nome", "Tarefa")
      .maybeSingle();

    const { error } = await supabase.from("atividade").insert({
      negocio_id: negocioId,
      tipo_id: tipo?.id ?? null,
      titulo: `${PREFIXO} ${negocio.titulo}`,
      data: emDias(dias),
      responsavel_id: negocio.responsavel_id,
      descricao:
        `Retorno automático ${dias} dias após o negócio ser marcado como Ganho.`,
      concluida: false,
    });

    if (error) return { criada: false, motivo: error.message };
    return { criada: true };
  } catch (e) {
    return { criada: false, motivo: e instanceof Error ? e.message : "erro" };
  }
}

/**
 * "YYYY-MM-DD" daqui a N dias, no fuso de São Paulo.
 *
 * ⚠️ `atividade.data` é `date`, sem fuso — é data local gravada como
 * texto (T-05). Partir de `new Date()` no servidor da Vercel, que roda
 * em UTC, jogaria o follow-up um dia à frente quando o Ganho for
 * declarado depois das 21h de Brasília.
 */
function emDias(dias: number): string {
  const hoje = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });
  const [a, m, d] = hoje.split("-").map(Number);
  // UTC de propósito: aqui só se quer aritmética de calendário, sem que
  // o fuso da máquina desloque a data de um dia.
  const base = new Date(Date.UTC(a, m - 1, d));
  base.setUTCDate(base.getUTCDate() + dias);
  return base.toISOString().slice(0, 10);
}
