import type { Database } from "@/lib/supabase/types";

/**
 * Tipos e helpers compartilhados da tela de Atividades (F6).
 *
 * ⚠️ Diferente de negócio, atividade guarda `data` como `date` e as horas
 * como `time` — sem fuso. São data e hora locais de Brasília gravadas
 * como texto, não `timestamptz`. Por isso não há conversão de fuso aqui:
 * o que está no banco já é o que se mostra. O único ponto onde o fuso
 * importa é decidir "que dia é hoje" (`hojeBrasilia`), porque o servidor
 * roda em UTC na Vercel e "hoje" às 22h de São Paulo já é amanhã em UTC.
 */

type Nomeado = { nome: string } | null;

/** Forma da atividade depois dos vínculos, aplicada com `.returns<>()`. */
export type LinhaAtividade = {
  id: string;
  titulo: string | null;
  data: string;
  hora_inicio: string | null;
  hora_fim: string | null;
  concluida: boolean;
  descricao: string | null;
  tipo_id: string | null;
  responsavel_id: string | null;
  negocio_id: string | null;
  organizacao_id: string | null;
  pessoa_id: string | null;
  tipo_atividade: Nomeado;
  usuario: { nome: string; foto_url: string | null } | null;
  negocio: { id: string; titulo: string } | null;
  organizacao: { id: string; nome: string } | null;
  pessoa: { id: string; nome: string } | null;
};

export const SELECAO = `
  id, titulo, data, hora_inicio, hora_fim, concluida, descricao,
  tipo_id, responsavel_id, negocio_id, organizacao_id, pessoa_id,
  tipo_atividade(nome),
  usuario(nome, foto_url),
  negocio(id, titulo),
  organizacao(id, nome),
  pessoa(id, nome)
`;

export type Vista = "lista" | "vencidas" | "calendario";
export type Situacao = "pendentes" | "concluidas" | "todas";

export type FiltrosAtividade = {
  vista: Vista;
  situacao: Situacao;
  responsavel: string;
  tipo: string;
  /** Dia em foco na lista, "YYYY-MM-DD". Vazio = hoje (resolvido na página). */
  dia: string;
  /** Mês visível no calendário, "YYYY-MM". Só usado quando vista=calendario. */
  mes: string;
  /**
   * Termo de busca. Quando presente, a tela deixa de ser "um dia por vez"
   * e passa a mostrar resultados de TODA a base — que é o que se espera
   * de uma busca. Sem isso, procurar por um cliente só encontraria algo
   * se a atividade dele fosse justamente do dia em foco.
   */
  busca: string;
};

export type Busca = Record<string, string | string[] | undefined>;

const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parseFiltros(p: Busca): FiltrosAtividade {
  const v = um(p.vista);
  const vista: Vista =
    v === "calendario" ? "calendario" : v === "vencidas" ? "vencidas" : "lista";
  const situacaoBruta = um(p.situacao);
  const situacao: Situacao =
    situacaoBruta === "concluidas" || situacaoBruta === "todas"
      ? situacaoBruta
      : "pendentes";
  return {
    vista,
    situacao,
    responsavel: um(p.responsavel) ?? "",
    tipo: um(p.tipo) ?? "",
    dia: um(p.dia) ?? "",
    mes: um(p.mes) ?? "",
    busca: (um(p.busca) ?? "").trim(),
  };
}

export function temFiltro(f: FiltrosAtividade): boolean {
  return Boolean(f.responsavel || f.tipo || f.situacao !== "pendentes" || f.busca);
}

/** As chaves de FILTRO que esta tela reconhece. `vista`, `dia` e `mes`
 *  ficam de fora: sao onde a pessoa esta olhando, nao o que ela escolheu
 *  ver — e um link do sino que traga `vista=vencidas` precisa continuar
 *  contando como visita crua, para o recorte do usuario ser aplicado por
 *  cima em vez de atropelar a aba pedida. */
const CHAVES_RECONHECIDAS = ["situacao", "tipo", "responsavel", "busca"];

/**
 * Visita "crua": nenhum parametro de filtro. E o sinal para aplicar a
 * preferencia salva do usuario (ou o padrao "so as minhas") — ver a nota
 * em `page.tsx`.
 */
export function buscaCrua(p: Busca): boolean {
  return !Object.keys(p).some((k) => CHAVES_RECONHECIDAS.includes(k));
}

/**
 * Para onde o clique numa atividade leva.
 *
 * ⚠️ Só 24% das atividades têm negócio (1.564 de 6.522): 55% estão
 * penduradas em organização e 20% em pessoa, por causa da D-108. Mandar
 * sempre para o negócio deixaria três de cada quatro cliques sem
 * destino. Abre o que houver, na ordem em que a informação é mais
 * específica; as 29 sem vínculo nenhum devolvem null e caem na edição.
 */
export function destinoDaAtividade(a: LinhaAtividade, volta?: string): string | null {
  // ⚠️ `de=atividades` faz o link "voltar" da ficha do negócio apontar
  // para cá, e não para a Lista. `volta` carrega a query da tela de
  // Atividades — o dia em foco, a busca, os filtros —, para o retorno
  // cair no lugar exato de onde se saiu. Sem isso, quem estava vendo as
  // vencidas de 2022 voltava para "hoje" e perdia o lugar.
  const retorno = volta ? `&volta=${encodeURIComponent(volta)}` : "";
  if (a.negocio) return `/negocios/${a.negocio.id}?de=atividades${retorno}`;
  if (a.organizacao) return `/contatos/organizacoes/${a.organizacao.id}`;
  if (a.pessoa) return `/contatos/pessoas/${a.pessoa.id}`;
  return null;
}

/* ---------- datas ---------- */

/** "YYYY-MM-DD" de hoje no fuso de São Paulo (T-05). */
export function hojeBrasilia(): string {
  // 'en-CA' formata como YYYY-MM-DD, que é exatamente a forma da coluna.
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });
}

/** "YYYY-MM" do mês corrente em São Paulo — mês inicial do calendário. */
export function mesBrasilia(): string {
  return hojeBrasilia().slice(0, 7);
}

/** Soma dias a uma data "YYYY-MM-DD" sem passar por fuso nenhum. */
export function somaDias(iso: string, dias: number): string {
  const [a, m, d] = iso.split("-").map(Number);
  // UTC de propósito: só quero aritmética de calendário, sem que o fuso
  // local da máquina desloque a data de um dia.
  const base = new Date(Date.UTC(a, m - 1, d));
  base.setUTCDate(base.getUTCDate() + dias);
  return base.toISOString().slice(0, 10);
}

/** Primeiro e último dia (inclusive) de um mês "YYYY-MM". */
export function limitesDoMes(mes: string): { de: string; ate: string } {
  const [a, m] = mes.split("-").map(Number);
  const primeiro = `${mes}-01`;
  // Dia 0 do mês seguinte é o último dia deste mês.
  const ultimo = new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
  return { de: primeiro, ate: ultimo };
}

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** dd/mm/aaaa a partir de "YYYY-MM-DD", sem instanciar Date (sem fuso). */
export function formataData(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

/** Dia da semana abreviado de uma data "YYYY-MM-DD". */
export function diaDaSemana(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number);
  return DIAS_SEMANA[new Date(Date.UTC(a, m - 1, d)).getUTCDay()];
}

/** Rótulo do dia em foco: Hoje, Amanhã, Ontem, ou "Ter, 19/08/2026". */
export function rotuloDia(dia: string, hoje: string): string {
  if (dia === hoje) return "Hoje";
  if (dia === somaDias(hoje, 1)) return "Amanhã";
  if (dia === somaDias(hoje, -1)) return "Ontem";
  return `${diaDaSemana(dia)}, ${formataData(dia)}`;
}

/** "agosto de 2026" para o cabeçalho do calendário. */
export function nomeDoMes(mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  return `${MESES[m - 1]} de ${a}`;
}

export type Situacoes = { valor: Situacao; rotulo: string }[];

export const SITUACOES: Situacoes = [
  { valor: "pendentes", rotulo: "Pendentes" },
  { valor: "concluidas", rotulo: "Concluídas" },
  { valor: "todas", rotulo: "Todas" },
];

export type StatusNegocio = Database["public"]["Enums"]["status_negocio"];
