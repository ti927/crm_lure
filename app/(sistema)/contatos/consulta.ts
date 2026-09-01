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
  uf: string | null;
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
  id, nome, cidade, uf, website,
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

/**
 * O recorte de local, já traduzido para o que as funções do banco pedem.
 *
 * ⚠️ Três estados, e o terceiro é o que costuma faltar: **sem endereço
 * nenhum** são 1.877 organizações, a maioria da base. Um filtro de local
 * que só sabe dizer "onde" não tem como levar até elas — e é justamente
 * até elas que alguém precisa chegar para preencher.
 */
export type Local = {
  uf: string | null;
  cidade: string | null;
  semLocal: boolean;
};

/**
 * O local viaja na querystring como UM parâmetro, em três formas:
 *
 *     ?local=GO             o estado inteiro
 *     ?local=GO:Anápolis    a cidade
 *     ?local=sem            os que não têm endereço
 *
 * ⚠️ Um parâmetro e não dois (`uf` + `cidade`) porque o controle na tela
 * é um só: com dois, o endereço aceitaria combinações que o seletor
 * nunca produz — `?cidade=Anápolis&uf=SP` — e alguém teria que decidir o
 * que fazer com elas. Uma escolha, um parâmetro.
 *
 * ⚠️ `:` como separador é seguro aqui: nenhuma das 64 cidades da base o
 * contém, e o `split` é limitado ao PRIMEIRO, então um nome que viesse a
 * ter dois-pontos ainda chegaria inteiro.
 */
export function parseLocal(valor: string | undefined): Local {
  const v = valor?.trim() ?? "";
  if (!v) return { uf: null, cidade: null, semLocal: false };
  if (v === "sem") return { uf: null, cidade: null, semLocal: true };

  const corte = v.indexOf(":");
  if (corte < 0) return { uf: v.toUpperCase(), cidade: null, semLocal: false };
  return {
    uf: v.slice(0, corte).toUpperCase() || null,
    cidade: v.slice(corte + 1) || null,
    semLocal: false,
  };
}

/** O caminho de volta: de recorte para o valor do seletor. */
export function localParaValor(l: Local): string {
  if (l.semLocal) return "sem";
  if (!l.uf) return "";
  return l.cidade ? `${l.uf}:${l.cidade}` : l.uf;
}

export const temLocal = (l: Local): boolean => l.semLocal || l.uf !== null;

export type FiltrosContato = {
  aba: Aba;
  busca: string;
  local: Local;
  pagina: number;
};

export function parseFiltros(p: Busca): FiltrosContato {
  return {
    aba: um(p.aba) === "pessoas" ? "pessoas" : "organizacoes",
    busca: um(p.busca)?.trim() ?? "",
    local: parseLocal(um(p.local)),
    pagina: Math.max(1, Number(um(p.pagina) ?? 1) || 1),
  };
}

/** Uma UF e as cidades que ela tem na base, com quanto cada uma pesa. */
export type UfComCidades = {
  uf: string;
  /** Todos os cadastros da UF — inclusive os que não têm cidade. */
  total: number;
  cidades: { nome: string; quantidade: number }[];
};

export type Locais = {
  ufs: UfComCidades[];
  /** Cadastros com cidade mas sem UF — endereço de fora do Brasil. */
  semUf: { nome: string; quantidade: number }[];
  semLocal: number;
};

/** Remove os caracteres que o PostgREST lê como sintaxe de filtro. */
export function limparIlike(termo: string): string {
  return termo.replace(/[%,()]/g, " ");
}


export const CONTAGEM = (c: { count: number }[]): number => c?.[0]?.count ?? 0;
