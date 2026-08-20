/**
 * F8 — vocabulário compartilhado da central de notificações (Doc 15).
 *
 * Fica em `lib/` porque três lugares precisam das mesmas definições: o
 * layout (que busca), o sino (que exibe) e o painel de configuração (que
 * ajusta). Um rótulo que diverge entre a lista e o painel faria duas
 * telas descreverem o mesmo alerta de jeitos diferentes.
 *
 * ⚠️ Os degraus e os padrões aparecem aqui SÓ para a tela desenhar as
 * opções. A verdade mora no banco — `padrao_notificacao()` e o `check`
 * `dias_do_tipo` da migração `20260820120000_notificacoes.sql`. Se um
 * dia divergirem, o banco recusa a gravação e a tela é que está errada.
 */

import type { Database } from "@/lib/supabase/types";

export type TipoNotificacao = Database["public"]["Enums"]["tipo_notificacao"];

/** Uma linha devolvida por `public.notificacoes()`. */
export type Notificacao = {
  tipo: TipoNotificacao;
  chave: string;
  titulo: string;
  detalhe: string;
  referencia: string;
  destino: string;
  /** D-141: só negócio parado e atividade vencida entram no número. */
  conta: boolean;
  lida: boolean;
};

export type Preferencia = {
  tipo: TipoNotificacao;
  ativo: boolean;
  /** `null` = usa o padrão do sistema. */
  dias: number | null;
};

type Definicao = {
  /** Título do bloco no painel e do grupo no sino. */
  rotulo: string;
  /** Plural, para o cabeçalho do grupo no sino. */
  grupo: string;
  /** O que o alerta faz, em português e sem jargão (Doc 15 §5.2). */
  explicacao: string;
  /** Degraus oferecidos na tela. Vazio = o tipo não usa dias. */
  degraus: number[];
  /** O padrão do sistema, espelhando `public.padrao_notificacao()`. */
  padrao: number | null;
  /** Sufixo do degrau no singular e no plural. */
  unidade: [string, string];
};

/**
 * A ordem deste objeto é a ordem do enum no banco, que é a ordem em que
 * o sino agrupa: parados, vencidas, próximas.
 */
export const TIPOS: Record<TipoNotificacao, Definicao> = {
  negocio_parado: {
    rotulo: "Negócio parado",
    grupo: "Negócios parados",
    explicacao:
      "Avisa quando um negócio seu fica sem movimento. Movimento é mudança de " +
      "etapa, valor, responsável ou status, e também atividade registrada nele.",
    degraus: [30, 45, 60, 90],
    padrao: 60, // D-139
    unidade: ["dia", "dias"],
  },
  atividade_vencida: {
    rotulo: "Atividade vencida",
    grupo: "Atividades vencidas",
    explicacao:
      "Avisa sobre atividades suas com data já passada e ainda não concluídas.",
    degraus: [],
    padrao: null,
    unidade: ["dia", "dias"],
  },
  lembrete_atividade: {
    rotulo: "Lembrete de próxima atividade",
    grupo: "Próximas atividades",
    explicacao: "Avisa com antecedência sobre o que está por vir.",
    degraus: [1, 2, 3, 7],
    padrao: 1, // D-140
    unidade: ["dia", "dias"],
  },
  follow_up_ganho: {
    rotulo: "Follow-up ao ganhar",
    grupo: "Follow-up ao ganhar",
    explicacao:
      "Ao marcar um negócio como Ganho, cria uma atividade de retorno para " +
      "daqui a 90 dias.",
    degraus: [], // P-042: o prazo não é editável enquanto a D-021 não mudar
    padrao: 90, // D-021
    unidade: ["dia", "dias"],
  },
};

export const ORDEM_TIPOS = Object.keys(TIPOS) as TipoNotificacao[];

/**
 * ⚠️ `follow_up_ganho` nunca aparece no sino: é o único dos quatro que
 * escreve em vez de ler. Ele cria a atividade de retorno dentro da ação
 * de desfecho, e a atividade criada é que, um dia, vira lembrete.
 */
export const TIPOS_DO_SINO: TipoNotificacao[] = [
  "negocio_parado",
  "atividade_vencida",
  "lembrete_atividade",
];

/** O número do sino: o que exige ação e ainda não foi lido (D-141). */
export function contarNaoLidas(lista: Notificacao[]): number {
  return lista.filter((n) => n.conta && !n.lida).length;
}

export function degrauValido(tipo: TipoNotificacao, dias: number | null): boolean {
  const { degraus } = TIPOS[tipo];
  if (dias === null) return true; // null = padrão do sistema
  return degraus.includes(dias);
}

/** "1 dia" · "30 dias" — o rótulo de um degrau. */
export function rotuloDegrau(tipo: TipoNotificacao, dias: number): string {
  const [um, muitos] = TIPOS[tipo].unidade;
  return `${dias} ${dias === 1 ? um : muitos}`;
}
