/**
 * F7 — Contatos: organizações e pessoas.
 *
 * ⚠️ R-006: 2.889 organizações e 4.589 pessoas. A lista pagina no
 * servidor; a base inteira nunca vai para o navegador.
 */

export type Aba = "organizacoes" | "pessoas";

export type LinhaOrganizacao = {
  id: string;
  nome: string;
  cidade: string | null;
  website: string | null;
  /** PostgREST devolve a contagem embutida como `[{ count: n }]`. */
  negocio: { count: number }[];
  pessoa_organizacao: { count: number }[];
};

export type LinhaPessoa = {
  id: string;
  nome: string;
  pessoa_organizacao: {
    cargo: string | null;
    organizacao: { nome: string } | null;
  }[];
  forma_contato: { tipo: string; valor: string }[];
};

export const SELECAO_ORGANIZACAO = `
  id, nome, cidade, website,
  negocio(count),
  pessoa_organizacao(count)
`;

export const SELECAO_PESSOA = `
  id, nome,
  pessoa_organizacao(cargo, organizacao(nome)),
  forma_contato(tipo, valor)
`;

/** R-006: a base inteira nunca vai para o navegador. */
export const POR_PAGINA = 50;

export type Busca = Record<string, string | string[] | undefined>;

const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export type FiltrosContato = {
  aba: Aba;
  busca: string;
  pagina: number;
};

export function parseFiltros(p: Busca): FiltrosContato {
  return {
    aba: um(p.aba) === "pessoas" ? "pessoas" : "organizacoes",
    busca: um(p.busca)?.trim() ?? "",
    pagina: Math.max(1, Number(um(p.pagina) ?? 1) || 1),
  };
}

/** Remove os caracteres que o PostgREST lê como sintaxe de filtro. */
export function limparIlike(termo: string): string {
  return termo.replace(/[%,()]/g, " ");
}


export const CONTAGEM = (c: { count: number }[]): number => c?.[0]?.count ?? 0;
