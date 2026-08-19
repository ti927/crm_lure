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
};

export type Filtros = {
  de: string;
  ate: string;
  responsavel: string;
  origem: string;
  produto: string;
  area: string;
  incluirParados: boolean;
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
  return {
    de: dia(p.de),
    ate: dia(p.ate),
    responsavel: id(p.responsavel),
    origem: id(p.origem),
    produto: id(p.produto),
    area: id(p.area),
    // D-067: parado fica fora por padrão. Só entra se pedirem.
    incluirParados: p.parados === "1",
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
  };
}

export function temFiltro(f: Filtros): boolean {
  return Boolean(
    f.de || f.ate || f.responsavel || f.origem || f.produto || f.area || f.incluirParados
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
