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
