/**
 * Etiquetas de Status e Etapa.
 *
 * ⚠️ As classes aparecem escritas por extenso nos mapas abaixo, e nao
 * montadas como `bg-status-${x}`. O Tailwind v4 varre o codigo-fonte em
 * busca de nomes de classe literais; qualquer nome construido em tempo
 * de execucao simplesmente nao e gerado, e a cor some sem erro nenhum.
 */

import type { Database } from "@/lib/supabase/types";

type Status = Database["public"]["Enums"]["status_negocio"];

const STATUS: Record<Status, { rotulo: string; ponto: string; ink: string }> = {
  parado: {
    rotulo: "Parado",
    ponto: "bg-status-parado",
    ink: "text-status-parado-ink",
  },
  negociacao: {
    rotulo: "Negociação",
    ponto: "bg-status-negociacao",
    ink: "text-status-negociacao-ink",
  },
  ganho: {
    rotulo: "Ganho",
    ponto: "bg-status-ganho",
    ink: "text-status-ganho-ink",
  },
  perdido: {
    rotulo: "Perdido",
    ponto: "bg-status-perdido",
    ink: "text-status-perdido-ink",
  },
};

/**
 * `parado` e a maioria da base e nao e anomalia (D-045). Por isso a
 * etiqueta e cinza e discreta — nunca com aparencia de erro ou alerta,
 * como manda B-075.
 */
export function EtiquetaStatus({
  status,
  compacta = false,
}: {
  status: Status;
  /**
   * Cartao do Kanban, onde a coluna pode ter 160px de largura e o
   * rotulo divide a linha com valor e avatar.
   *
   * ⚠️ O texto CONTINUA la, so menor. Reduzir a etiqueta ao ponto
   * colorido caberia melhor e seria a solucao errada: a cor viraria o
   * unico sinal, que e exatamente o que o Doc 08 (B-076) proibe — e
   * quem nao distingue as cores ficaria sem saber se o negocio esta
   * parado ou em negociacao.
   */
  compacta?: boolean;
}) {
  const s = STATUS[status];
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap ${
        compacta ? "gap-1" : "gap-1.5"
      }`}
    >
      <span
        className={`shrink-0 rounded-pill ${compacta ? "size-1.5" : "size-2"} ${s.ponto}`}
        aria-hidden
      />
      <span className={`font-medium ${compacta ? "text-2xs" : "text-sm"} ${s.ink}`}>
        {s.rotulo}
      </span>
    </span>
  );
}

/* A cor da etapa vem da ORDEM no funil, nao do nome: as etapas sao
   configuraveis (D-020) e um funil renomeado nao pode perder as cores. */
const ETAPA_INK = [
  "text-stage-1-ink",
  "text-stage-2-ink",
  "text-stage-3-ink",
  "text-stage-4-ink",
  "text-stage-5-ink",
  "text-stage-6-ink",
] as const;

const ETAPA_FAIXA = [
  "border-l-stage-1",
  "border-l-stage-2",
  "border-l-stage-3",
  "border-l-stage-4",
  "border-l-stage-5",
  "border-l-stage-6",
] as const;

/** Cor da faixa lateral da linha, por ordem da etapa. Sem etapa, sem faixa. */
export function faixaDaEtapa(ordem: number | null | undefined): string {
  if (!ordem) return "border-l-transparent";
  return ETAPA_FAIXA[(ordem - 1) % ETAPA_FAIXA.length];
}

/**
 * ⚠️ O nome da etapa vai sempre escrito (B-076, Doc 08 §3.2). A cor
 * acompanha, nunca substitui — as etapas 4 e 5 sao adjacentes no funil e
 * so a cor nao as separa sob deuteranopia.
 */
export function EtiquetaEtapa({
  nome,
  ordem,
}: {
  nome: string | null | undefined;
  ordem: number | null | undefined;
}) {
  if (!nome) return <span className="text-text-muted">—</span>;
  const ink = ordem ? ETAPA_INK[(ordem - 1) % ETAPA_INK.length] : "text-text";
  return <span className={`text-sm font-medium ${ink}`}>{nome}</span>;
}
