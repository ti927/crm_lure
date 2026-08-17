/**
 * Constantes e tipos do Kanban.
 *
 * Arquivo separado por exigencia do Next: um modulo "use server" so pode
 * exportar funcao assincrona — constante e tipo precisam morar fora, e
 * sao importados tanto pelo servidor quanto pelo cliente.
 */

/** A etapa que exige desfecho (D-047). Nome, e nao id: a semente pode ser recriada. */
export const ETAPA_DE_DESFECHO = "Aguardando Contrato";

export type Desfecho = { status: "ganho" | "perdido"; motivoId?: string | null };
