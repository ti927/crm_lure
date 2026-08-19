import type { RecorteIndicador } from "@/lib/supabase/types";

/** Os parâmetros que a tela aceita pela URL. */
export type Busca = {
  de?: string;
  ate?: string;
  responsavel?: string;
  origem?: string;
  produto?: string;
  area?: string;
  parados?: string;
  etapa?: string;
  status?: string;
  valorMin?: string;
  valorMax?: string;
  motivo?: string;
};

export type Filtros = {
  de: string;
  ate: string;
  responsavel: string;
  origem: string;
  produto: string;
  area: string;
  incluirParados: boolean;
  etapa: string;
  status: string;
  valorMin: string;
  valorMax: string;
  motivo: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Só o que tem forma válida entra. Um id malformado viraria erro do
 * PostgREST no meio de sete chamadas paralelas, derrubando a tela inteira
 * por causa de um parâmetro de URL digitado à mão.
 */
export function parseFiltros(p: Busca): Filtros {
  const id = (v?: string) => (v && UUID.test(v) ? v : "");
  const dia = (v?: string) => (v && DATA.test(v) ? v : "");
  // Valor chega como texto da URL; só número finito e não negativo entra.
  const numero = (v?: string) => {
    if (!v) return "";
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? String(n) : "";
  };
  return {
    de: dia(p.de),
    ate: dia(p.ate),
    responsavel: id(p.responsavel),
    origem: id(p.origem),
    produto: id(p.produto),
    area: id(p.area),
    // D-067: parado fica fora por padrão. Só entra se pedirem.
    incluirParados: p.parados === "1",
    etapa: id(p.etapa),
    // Status é lista fixa de quatro valores (D-042): nada fora dela passa.
    status: ["parado", "negociacao", "ganho", "perdido"].includes(p.status ?? "")
      ? p.status!
      : "",
    valorMin: numero(p.valorMin),
    valorMax: numero(p.valorMax),
    motivo: id(p.motivo),
  };
}

/** Traduz o recorte da tela para os argumentos das funções do banco. */
export function comoArgumentos(f: Filtros): RecorteIndicador {
  return {
    p_de: f.de || null,
    p_ate: f.ate || null,
    p_responsavel: f.responsavel || null,
    p_origem: f.origem || null,
    p_produto: f.produto || null,
    p_area: f.area || null,
    p_incluir_parados: f.incluirParados,
    p_etapa: f.etapa || null,
    p_status: f.status || null,
    p_valor_min: f.valorMin ? Number(f.valorMin) : null,
    p_valor_max: f.valorMax ? Number(f.valorMax) : null,
    p_motivo_perda: f.motivo || null,
  };
}

export function temFiltro(f: Filtros): boolean {
  return Boolean(
    f.de || f.ate || f.responsavel || f.origem || f.produto || f.area ||
    f.incluirParados || f.etapa || f.status || f.valorMin || f.valorMax || f.motivo
  );
}

/** Preserva o recorte ao trocar um parâmetro — usado na exportação e nos links. */
export function comoConsulta(f: Filtros): string {
  const q = new URLSearchParams();
  if (f.de) q.set("de", f.de);
  if (f.ate) q.set("ate", f.ate);
  if (f.responsavel) q.set("responsavel", f.responsavel);
  if (f.origem) q.set("origem", f.origem);
  if (f.produto) q.set("produto", f.produto);
  if (f.area) q.set("area", f.area);
  if (f.incluirParados) q.set("parados", "1");
  if (f.etapa) q.set("etapa", f.etapa);
  if (f.status) q.set("status", f.status);
  if (f.valorMin) q.set("valorMin", f.valorMin);
  if (f.valorMax) q.set("valorMax", f.valorMax);
  if (f.motivo) q.set("motivo", f.motivo);
  return q.toString();
}

/**
 * O banco devolve o status pelo valor do enum — `negociacao`, sem acento,
 * porque nome de coluna e de tipo é `snake_case` sem acento por convenção
 * (regra 2). Isso é identificador, não texto de tela: quem lê o painel
 * precisa ver "Negociação".
 */
const ROTULO_STATUS: Record<string, string> = {
  parado: "Parado",
  negociacao: "Negociação",
  ganho: "Ganho",
  perdido: "Perdido",
};

export function rotulo(bruto: string): string {
  return ROTULO_STATUS[bruto] ?? bruto;
}

/**
 * Os anos que a tela oferece como atalho.
 *
 * ⚠️ Não é lista fixa em código: sai da própria base, do primeiro negócio
 * até hoje. Uma lista escrita à mão envelhece calada — vira 1º de janeiro
 * e o ano novo não aparece.
 */
export function anosDisponiveis(desde: string | null | undefined): number[] {
  const hoje = new Date().getFullYear();
  const inicio = desde ? new Date(desde).getFullYear() : hoje;
  const anos: number[] = [];
  for (let a = hoje; a >= inicio; a--) anos.push(a);
  return anos;
}

/** O recorte de um ano inteiro, como a barra de filtros o representa. */
export function recorteDoAno(ano: number): { de: string; ate: string } {
  return { de: `${ano}-01-01`, ate: `${ano}-12-31` };
}

/** Qual ano o recorte atual representa, se representar algum. */
export function anoDoRecorte(f: Filtros): number | null {
  if (!f.de || !f.ate) return null;
  const a = Number(f.de.slice(0, 4));
  const r = recorteDoAno(a);
  return f.de === r.de && f.ate === r.ate ? a : null;
}

/**
 * Períodos prontos, no padrão do Pipedrive.
 *
 * ⚠️ Calculados na hora da escolha, não guardados: "últimos 90 dias"
 * guardado como par de datas envelhece — amanhã seria 91.
 */
export type Atalho = { chave: string; rotulo: string };

export const ATALHOS: Atalho[] = [
  { chave: "mes", rotulo: "Este mês" },
  { chave: "30", rotulo: "Últimos 30 dias" },
  { chave: "90", rotulo: "Últimos 90 dias" },
  { chave: "trimestre", rotulo: "Este trimestre" },
  { chave: "ano", rotulo: "Este ano" },
  { chave: "anterior", rotulo: "Ano passado" },
];

const iso = (d: Date) => d.toISOString().slice(0, 10);

export function recorteDoAtalho(chave: string): { de: string; ate: string } | null {
  const hoje = new Date();
  const fim = iso(hoje);
  switch (chave) {
    case "mes":
      return { de: iso(new Date(hoje.getFullYear(), hoje.getMonth(), 1)), ate: fim };
    case "30":
      return { de: iso(new Date(hoje.getTime() - 29 * 864e5)), ate: fim };
    case "90":
      return { de: iso(new Date(hoje.getTime() - 89 * 864e5)), ate: fim };
    case "trimestre": {
      const inicio = Math.floor(hoje.getMonth() / 3) * 3;
      return { de: iso(new Date(hoje.getFullYear(), inicio, 1)), ate: fim };
    }
    case "ano":
      return { de: `${hoje.getFullYear()}-01-01`, ate: fim };
    case "anterior": {
      const a = hoje.getFullYear() - 1;
      return { de: `${a}-01-01`, ate: `${a}-12-31` };
    }
    default:
      return null;
  }
}
