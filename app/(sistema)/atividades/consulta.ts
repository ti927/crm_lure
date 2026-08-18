import type { Database } from "@/lib/supabase/types";

/**
 * Tipos e helpers compartilhados da tela de Atividades (F6).
 *
 * ⚠️ Diferente de negócio, atividade guarda `data` como `date` e as horas
 * como `time` — sem fuso. São data e hora locais de Brasília gravadas
 * como texto, não `timestamptz`. Por isso não há conversão de fuso aqui:
 * o que está no banco já é o que se mostra. O único ponto onde o fuso
 * importa é decidir "que dia é hoje" (`hojeBrasilia`), porque o servidor
 * roda em UTC na Vercel e "hoje" às 22h de São Paulo já é amanhã em UTC.
 */

type Nomeado = { nome: string } | null;

/** Forma da atividade depois dos vínculos, aplicada com `.returns<>()`. */
export type LinhaAtividade = {
  id: string;
  titulo: string | null;
  data: string;
  hora_inicio: string | null;
  hora_fim: string | null;
  concluida: boolean;
  descricao: string | null;
  tipo_id: string | null;
  responsavel_id: string | null;
  negocio_id: string | null;
  organizacao_id: string | null;
  pessoa_id: string | null;
  tipo_atividade: Nomeado;
  usuario: { nome: string; foto_url: string | null } | null;
  negocio: { id: string; titulo: string } | null;
  organizacao: { id: string; nome: string } | null;
  pessoa: { id: string; nome: string } | null;
};

export const SELECAO = `
  id, titulo, data, hora_inicio, hora_fim, concluida, descricao,
  tipo_id, responsavel_id, negocio_id, organizacao_id, pessoa_id,
  tipo_atividade(nome),
  usuario(nome, foto_url),
  negocio(id, titulo),
  organizacao(id, nome),
  pessoa(id, nome)
`;

export type Vista = "lista" | "calendario";
export type Situacao = "pendentes" | "concluidas" | "todas";

export type FiltrosAtividade = {
  vista: Vista;
  situacao: Situacao;
  responsavel: string;
  tipo: string;
  /** Mês visível no calendário, "YYYY-MM". Só usado quando vista=calendario. */
  mes: string;
};

export type Busca = Record<string, string | string[] | undefined>;

const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parseFiltros(p: Busca): FiltrosAtividade {
  const vista = um(p.vista) === "calendario" ? "calendario" : "lista";
  const situacaoBruta = um(p.situacao);
  const situacao: Situacao =
    situacaoBruta === "concluidas" || situacaoBruta === "todas"
      ? situacaoBruta
      : "pendentes";
  return {
    vista,
    situacao,
    responsavel: um(p.responsavel) ?? "",
    tipo: um(p.tipo) ?? "",
    mes: um(p.mes) ?? "",
  };
}

export function temFiltro(f: FiltrosAtividade): boolean {
  return Boolean(f.responsavel || f.tipo || f.situacao !== "pendentes");
}

/* ---------- datas ---------- */

/** "YYYY-MM-DD" de hoje no fuso de São Paulo (T-05). */
export function hojeBrasilia(): string {
  // 'en-CA' formata como YYYY-MM-DD, que é exatamente a forma da coluna.
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });
}

/** "YYYY-MM" do mês corrente em São Paulo — mês inicial do calendário. */
export function mesBrasilia(): string {
  return hojeBrasilia().slice(0, 7);
}

/** Soma dias a uma data "YYYY-MM-DD" sem passar por fuso nenhum. */
export function somaDias(iso: string, dias: number): string {
  const [a, m, d] = iso.split("-").map(Number);
  // UTC de propósito: só quero aritmética de calendário, sem que o fuso
  // local da máquina desloque a data de um dia.
  const base = new Date(Date.UTC(a, m - 1, d));
  base.setUTCDate(base.getUTCDate() + dias);
  return base.toISOString().slice(0, 10);
}

/** Primeiro e último dia (inclusive) de um mês "YYYY-MM". */
export function limitesDoMes(mes: string): { de: string; ate: string } {
  const [a, m] = mes.split("-").map(Number);
  const primeiro = `${mes}-01`;
  // Dia 0 do mês seguinte é o último dia deste mês.
  const ultimo = new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
  return { de: primeiro, ate: ultimo };
}

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** dd/mm/aaaa a partir de "YYYY-MM-DD", sem instanciar Date (sem fuso). */
export function formataData(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

/** Dia da semana abreviado de uma data "YYYY-MM-DD". */
export function diaDaSemana(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number);
  return DIAS_SEMANA[new Date(Date.UTC(a, m - 1, d)).getUTCDay()];
}

/** "agosto de 2026" para o cabeçalho do calendário. */
export function nomeDoMes(mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  return `${MESES[m - 1]} de ${a}`;
}

export type Situacoes = { valor: Situacao; rotulo: string }[];

export const SITUACOES: Situacoes = [
  { valor: "pendentes", rotulo: "Pendentes" },
  { valor: "concluidas", rotulo: "Concluídas" },
  { valor: "todas", rotulo: "Todas" },
];

export type StatusNegocio = Database["public"]["Enums"]["status_negocio"];
