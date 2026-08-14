/**
 * Formatacao pt-BR (D-087, T4 do Doc 11).
 *
 * Os formatadores do Intl sao caros de construir e sao chamados uma vez
 * por celula da Lista — com 50 linhas x 2 colunas formatadas isso seria
 * 100 construcoes por pintura. Instanciados aqui uma unica vez.
 */

const REAL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const DATA = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

/** R$ 120.000,00 — vazio vira travessao, nao "R$ 0,00". */
export function real(valor: number | string | null | undefined): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  const n = typeof valor === "string" ? Number(valor) : valor;
  return Number.isFinite(n) ? REAL.format(n) : "—";
}

/**
 * dd/mm/aaaa. O banco grava timestamptz em UTC (T-05); a exibicao e
 * sempre em Brasilia, senao um negocio criado as 21h de Sao Paulo
 * aparece com a data do dia seguinte.
 */
export function data(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : DATA.format(d);
}

/** Campo de texto ausente. Nunca devolve string vazia: a celula colapsaria. */
export function texto(v: string | null | undefined): string {
  return v && v.trim() !== "" ? v : "—";
}
