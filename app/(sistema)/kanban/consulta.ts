import type { Database } from "@/lib/supabase/types";

/**
 * Tipos e leitura de filtros da tela de Kanban (F5).
 *
 * ⚠️ Vive num arquivo sem "use client" de proposito: a pagina (Server
 * Component), o quadro e o Kanban do celular precisam das MESMAS formas,
 * e tipo exportado de arquivo de cliente amarra os tres a ele sem
 * necessidade.
 */

export type Status = Database["public"]["Enums"]["status_negocio"];

export type Cartao = {
  id: string;
  titulo: string;
  valor: number | null;
  status: Status;
  organizacao: { nome: string } | null;
  usuario: { nome: string; foto_url: string | null } | null;
};

export type ColunaEtapa = {
  id: string;
  nome: string;
  ordem: number;
  total: number;
  /**
   * Valor somado da coluna INTEIRA, no recorte que estiver valendo — nao
   * da fatia carregada. Vem de `kanban_coluna`, por window function que
   * roda antes do offset/limit; somar `cartoes` aqui daria o total dos
   * 20 primeiros com cara de total da etapa.
   */
  soma: number;
  /** Quantos desses negocios tem valor diferente de zero. */
  comValor: number;
  cartoes: Cartao[];
};

/** Linha crua da funcao `kanban_coluna`, que devolve tudo achatado. */
export type LinhaKanban =
  Database["public"]["Functions"]["kanban_coluna"]["Returns"][number];

/**
 * Achatado → aninhado.
 *
 * A funcao do banco devolve `organizacao_nome`/`usuario_nome` porque uma
 * funcao SQL nao tem como devolver objeto embutido do jeito que o
 * PostgREST monta. O cartao continua com a forma antiga para que quadro
 * e Kanban do celular nao precisassem mudar por causa disso.
 */
export function paraCartao(l: LinhaKanban): Cartao {
  return {
    id: l.id,
    titulo: l.titulo,
    valor: l.valor,
    status: l.status,
    organizacao: l.organizacao_nome ? { nome: l.organizacao_nome } : null,
    usuario: l.usuario_nome
      ? { nome: l.usuario_nome, foto_url: l.usuario_foto }
      : null,
  };
}

/**
 * `count(*) over ()` nao devolve linha quando o recorte esta vazio —
 * entao "sem linha" e total zero, e nao total desconhecido.
 */
export function totalDaColuna(linhas: LinhaKanban[]): number {
  return Number(linhas[0]?.total ?? 0);
}

/**
 * A soma e a contagem com valor viajam repetidas em toda linha, porque
 * sao window functions — ler a primeira basta. `Number()` porque
 * `numeric` pode chegar como texto dependendo da versao do PostgREST, e
 * `"1000" + "2000"` seria concatenacao silenciosa.
 */
export function somaDaColuna(linhas: LinhaKanban[]): number {
  return Number(linhas[0]?.soma ?? 0);
}

export function comValorDaColuna(linhas: LinhaKanban[]): number {
  return Number(linhas[0]?.com_valor ?? 0);
}

/**
 * Quantas colunas, contadas do FIM do funil, mostram o total somado.
 *
 * ⚠️ Duas, por pedido — e o pedido tem razao de ser no dado: valor so
 * passa a existir quando a proposta e feita. Na base de hoje, Cold Lead
 * tem 141 negocios abertos e 3 com valor; Proposta Enviada tem 45 e 43.
 * Somar as primeiras etapas exibiria um numero que nao significa nada.
 *
 * ⚠️ Mora aqui, e nao no quadro, porque o Kanban do celular precisa
 * responder a MESMA pergunta. Duas telas decidindo isso por conta
 * propria e como elas divergem no dia em que alguem mudar o numero.
 */
export const COLUNAS_COM_TOTAL = 2;

export function mostraTotalSomado(indice: number, quantasColunas: number): boolean {
  return indice >= quantasColunas - COLUNAS_COM_TOTAL;
}

/**
 * A frase que impede a soma de mentir por omissao.
 *
 * ⚠️ Funcao unica porque o computador e o celular mostram o MESMO total
 * e precisam explica-lo do mesmo jeito. Duas redacoes divergem no dia em
 * que alguem corrigir uma — e a D-161 ja registrou o que acontece quando
 * dois numeros da mesma tela nao se explicam: nenhum dos dois e
 * acreditado, nem o certo.
 */
export function detalheDoTotal(total: number, comValor: number): string {
  const n = total.toLocaleString("pt-BR");
  if (total === 0) return "Nenhum negócio aberto nesta etapa.";
  if (comValor === 0) return `Nenhum dos ${n} negócios tem valor preenchido.`;
  if (comValor === total) {
    return `Todos os ${n} ${total === 1 ? "negócio tem" : "negócios têm"} valor.`;
  }
  return `${comValor.toLocaleString("pt-BR")} de ${n} negócios têm valor; o resto está zerado.`;
}

export type Busca = Record<string, string | string[] | undefined>;

const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export type FiltrosKanban = {
  responsavel: string;
  /** Termo da barra de busca. Cobre titulo do negocio e nome da organizacao. */
  busca: string;
};

/** As chaves que esta tela reconhece — usadas por `buscaCrua`. */
const CHAVES_RECONHECIDAS = ["responsavel", "busca"];

export function parseFiltros(p: Busca): FiltrosKanban {
  return {
    responsavel: um(p.responsavel) ?? "",
    busca: (um(p.busca) ?? "").trim(),
  };
}

export function temFiltro(f: FiltrosKanban): boolean {
  return Boolean(f.responsavel || f.busca);
}

/**
 * Visita "crua": nenhum parametro que esta tela reconheca. E o sinal
 * para aplicar a preferencia salva do usuario (ou o padrao "so os
 * meus") — ver a nota em `page.tsx`.
 */
export function buscaCrua(p: Busca): boolean {
  return !Object.keys(p).some((k) => CHAVES_RECONHECIDAS.includes(k));
}
