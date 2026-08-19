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

/**
 * Data com hora, para a linha do tempo — onde a ordem dos acontecimentos
 * no mesmo dia importa.
 *
 * ⚠️ Fuso fixo em Sao Paulo. O banco guarda timestamptz em UTC, e deixar
 * a conversao por conta do navegador faria o mesmo evento aparecer em
 * horas diferentes conforme a maquina de quem olha — inaceitavel num log
 * que serve de prova do que aconteceu.
 */
export function dataHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Valor curto para eixo de gráfico: R$ 27,0 mi · R$ 350 mil.
 *
 * O eixo de um gráfico não comporta "R$ 27.015.293,04" sem virar sopa de
 * dígitos, e ninguém lê centavo num eixo. O valor exato continua na
 * dica de contexto (tooltip) e nos cartões de número.
 */
export function realCurto(valor: number | string | null | undefined): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  const n = typeof valor === "string" ? Number(valor) : valor;
  if (!Number.isFinite(n)) return "—";

  const abs = Math.abs(n);
  const sinal = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sinal}R$ ${(abs / 1_000_000).toFixed(1).replace(".", ",")} mi`;
  if (abs >= 1_000) return `${sinal}R$ ${Math.round(abs / 1_000)} mil`;
  return `${sinal}R$ ${Math.round(abs)}`;
}
