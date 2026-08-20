/**
 * Constantes e tipos do Kanban.
 *
 * Arquivo separado por exigencia do Next: um modulo "use server" so pode
 * exportar funcao assincrona — constante e tipo precisam morar fora, e
 * sao importados tanto pelo servidor quanto pelo cliente.
 */

/**
 * ⚠️ D-145 (20/08/2026) REVOGA A D-047. Nenhuma etapa exige desfecho.
 *
 * "Aguardando Contrato" e uma espera legitima — contrato em assinatura
 * nao e negocio ganho nem perdido, e forcar a escolha na entrada obrigava
 * a mentir. Os 3 negocios que a D-128 registrou parados ali sem desfecho
 * eram a realidade contradizendo a regra.
 *
 * O que NAO caiu junto:
 *   · marcar Ganho/Perdido continua existindo, pelos botoes do topo
 *   · perdido continua exigindo motivo, por restricao no banco
 *     (`perdido_exige_motivo`) — essa nunca foi a trava, e continua
 *
 * A constante fica porque a etapa continua existindo e sendo a ultima
 * do funil; o que saiu foi o poder dela de barrar.
 */
export const ETAPA_FINAL = "Aguardando Contrato";

export type Desfecho = { status: "ganho" | "perdido"; motivoId?: string | null };
