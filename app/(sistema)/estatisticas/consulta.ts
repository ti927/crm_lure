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
