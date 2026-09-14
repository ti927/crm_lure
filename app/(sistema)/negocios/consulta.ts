import type { Database } from "@/lib/supabase/types";
import { termoDeBusca } from "@/lib/formato";

export type Status = Database["public"]["Enums"]["status_negocio"];
type Nomeado = { nome: string } | null;

/* Forma da linha depois dos vinculos. Declarada a mao e aplicada com
   .returns<>() porque a inferencia do supabase-js sobre embutidos varia
   conforme o join seja inner ou nao, e aqui ele e inner. */
export type LinhaNegocio = {
  id: string;
  titulo: string;
  valor: number | null;
  status: Status;
  criado_em: string;
  organizacao: Nomeado;
  etapa: { nome: string; ordem: number } | null;
  origem: Nomeado;
  produto: Nomeado;
  usuario: { nome: string; foto_url: string | null } | null;
  motivo_perda: Nomeado;
};

export const SELECAO = `
  id, titulo, valor, status, criado_em,
  organizacao!inner(nome),
  etapa(nome, ordem),
  origem(nome),
  produto(nome),
  usuario(nome, foto_url),
  motivo_perda(nome)
`;

/** Status e fixo em codigo (nao e lista configuravel — Doc 06). */
export const STATUS_OPCOES: { valor: Status; rotulo: string }[] = [
  { valor: "parado", rotulo: "Parado" },
  { valor: "negociacao", rotulo: "Negociação" },
  { valor: "ganho", rotulo: "Ganho" },
  { valor: "perdido", rotulo: "Perdido" },
];

export type Busca = Record<string, string | string[] | undefined>;

const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export type FiltrosLista = {
  titulo: string;
  organizacao: string;
  valorMin: string;
  valorMax: string;
  etapa: string;
  status: string;
  origem: string;
  produto: string;
  responsavel: string;
  motivoPerda: string;
  criadoDe: string;
  criadoAte: string;
  ordenarPor: string;
  crescente: boolean;
  pagina: number;
};

/** As chaves que o filtro por coluna reconhece — usadas por `buscaCrua`. */
const CHAVES_RECONHECIDAS = [
  "titulo", "organizacao", "valorMin", "valorMax", "etapa", "status",
  "origem", "produto", "responsavel", "motivoPerda", "criadoDe", "criadoAte",
  "ordenar", "dir", "pagina",
];

export function parseFiltros(p: Busca): FiltrosLista {
  return {
    titulo: um(p.titulo)?.trim() ?? "",
    organizacao: um(p.organizacao)?.trim() ?? "",
    valorMin: um(p.valorMin) ?? "",
    valorMax: um(p.valorMax) ?? "",
    etapa: um(p.etapa) ?? "",
    status: um(p.status) ?? "",
    origem: um(p.origem) ?? "",
    produto: um(p.produto) ?? "",
    responsavel: um(p.responsavel) ?? "",
    motivoPerda: um(p.motivoPerda) ?? "",
    criadoDe: um(p.criadoDe) ?? "",
    criadoAte: um(p.criadoAte) ?? "",
    ordenarPor: um(p.ordenar) ?? "criado_em",
    crescente: um(p.dir) === "asc",
    pagina: Math.max(1, Number(um(p.pagina) ?? 1) || 1),
  };
}

export function temFiltro(f: FiltrosLista): boolean {
  return Boolean(
    f.titulo || f.organizacao || f.valorMin || f.valorMax || f.etapa ||
    f.status || f.origem || f.produto || f.responsavel || f.motivoPerda ||
    f.criadoDe || f.criadoAte
  );
}

/**
 * Visita "crua": nenhum parametro que o filtro por coluna reconhece.
 * E o sinal para tentar restaurar a ultima combinacao salva do usuario
 * (B-045) — sem isto, o "Limpar filtros" (que tambem leva a URL crua)
 * seria imediatamente desfeito pela restauracao.
 */
export function buscaCrua(p: Busca): boolean {
  return !Object.keys(p).some((k) => CHAVES_RECONHECIDAS.includes(k));
}

/**
 * O termo pronto para busca: sem acento, em minúsculas e sem sintaxe de
 * filtro. Delega para `termoDeBusca`, em `lib/formato.ts`.
 *
 * ⚠️ Havia uma cópia desta limpeza AQUI e outra no módulo irmão, e as
 * duas só coincidiam por sorte. Com a busca sem acento entrando nas duas
 * telas ao mesmo tempo, manter duas definições era escolher o dia em que
 * elas passariam a discordar — e busca que discorda não acusa erro, só
 * deixa de achar.
 */
export function limparIlike(termo: string): string {
  return termoDeBusca(termo);
}

/** Inicio do dia em America/Sao_Paulo, em ISO com o deslocamento explicito
 *  (T-05: o banco guarda timestamptz em UTC; deslocar no cliente faria o
 *  filtro discordar da coluna "Criado em", que mostra o mesmo fuso). */
export function limiteDataInicio(diaISO: string): string {
  return `${diaISO}T00:00:00-03:00`;
}

export function limiteDataFim(diaISO: string): string {
  return `${diaISO}T23:59:59.999-03:00`;
}
