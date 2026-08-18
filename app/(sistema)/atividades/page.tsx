import { createClient } from "@/lib/supabase/server";
import { PainelAtividades } from "./painel-atividades";
import {
  SELECAO,
  parseFiltros,
  mesBrasilia,
  hojeBrasilia,
  limitesDoMes,
  type LinhaAtividade,
  type Busca,
  type FiltrosAtividade,
} from "./consulta";

/**
 * F6 — Atividades, em três vistas (B-080): Lista (um dia por vez, abrindo
 * em Hoje, no modelo do Pipedrive), Vencidas (as pendências atrasadas,
 * cada uma com a data em que venceu) e Calendário (mês).
 *
 * ⚠️ Atividade não exige mais negócio (D-108): pode pertencer a negócio,
 * organização, pessoa ou nada. 76% da base não tem negócio.
 *
 * ⚠️ R-006: são 6.483 atividades. A tela nunca as carrega todas — a Lista
 * é um dia por vez, o Calendário é só o mês visível, e as Vencidas são as
 * poucas pendências em atraso.
 */

/** Filtros comuns de situação/tipo/responsável, sem o recorte de data. */
function aplicaFiltros<T>(consulta: T, f: FiltrosAtividade): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let c = consulta as any;
  if (f.situacao === "pendentes") c = c.eq("concluida", false);
  else if (f.situacao === "concluidas") c = c.eq("concluida", true);
  if (f.responsavel) c = c.eq("responsavel_id", f.responsavel);
  if (f.tipo) c = c.eq("tipo_id", f.tipo);
  return c as T;
}

export default async function PaginaAtividades({
  searchParams,
}: {
  searchParams: Promise<Busca>;
}) {
  const p = await searchParams;
  const filtros = parseFiltros(p);
  const hoje = hojeBrasilia();
  const dia = filtros.dia || hoje;
  filtros.dia = dia;
  if (filtros.vista === "calendario" && !filtros.mes) filtros.mes = mesBrasilia();

  const supabase = await createClient();

  let doDia: LinhaAtividade[] = [];
  let vencidas: LinhaAtividade[] = [];
  let atividadesMes: LinhaAtividade[] = [];

  if (filtros.vista === "calendario") {
    const { de, ate } = limitesDoMes(filtros.mes);
    let c = supabase.from("atividade").select(SELECAO);
    c = aplicaFiltros(c, filtros);
    const { data } = await c
      .gte("data", de)
      .lte("data", ate)
      .order("data")
      .order("hora_inicio", { nullsFirst: true })
      .returns<LinhaAtividade[]>();
    atividadesMes = data ?? [];
  } else if (filtros.vista === "vencidas") {
    // Todas as pendências em atraso, da mais antiga para a mais recente —
    // as que estão paradas há mais tempo aparecem primeiro. Situação não
    // se aplica: uma vencida é, por definição, uma pendente.
    let cv = supabase
      .from("atividade")
      .select(SELECAO)
      .eq("concluida", false)
      .lt("data", hoje);
    if (filtros.responsavel) cv = cv.eq("responsavel_id", filtros.responsavel);
    if (filtros.tipo) cv = cv.eq("tipo_id", filtros.tipo);
    const { data } = await cv
      .order("data")
      .order("hora_inicio", { nullsFirst: true })
      .returns<LinhaAtividade[]>();
    vencidas = data ?? [];
  } else {
    // Lista: só as atividades do dia em foco. Nada de vencidas aqui — elas
    // moram na própria aba (pedido do maestro em 18/08).
    let cDia = supabase.from("atividade").select(SELECAO).eq("data", dia);
    cDia = aplicaFiltros(cDia, filtros);
    const { data } = await cDia
      .order("hora_inicio", { nullsFirst: true })
      .returns<LinhaAtividade[]>();
    doDia = data ?? [];
  }

  // Contagem de vencidas para o número na aba — sempre, respeitando os
  // filtros de tipo/responsável que também valem naquela vista.
  let contaVencidas = supabase
    .from("atividade")
    .select("id", { count: "exact", head: true })
    .eq("concluida", false)
    .lt("data", hoje);
  if (filtros.responsavel) contaVencidas = contaVencidas.eq("responsavel_id", filtros.responsavel);
  if (filtros.tipo) contaVencidas = contaVencidas.eq("tipo_id", filtros.tipo);

  const [{ count: totalVencidas }, { data: tipos }, { data: usuarios }] =
    await Promise.all([
      contaVencidas,
      supabase.from("tipo_atividade").select("id, nome").eq("ativo", true).order("ordem"),
      supabase.from("usuario").select("id, nome, foto_url").eq("ativo", true).order("nome"),
    ]);

  const exportHref = montaExportHref(p);

  return (
    <PainelAtividades
      doDia={doDia}
      vencidas={vencidas}
      atividadesMes={atividadesMes}
      totalVencidas={totalVencidas ?? 0}
      dia={dia}
      hoje={hoje}
      tipos={tipos ?? []}
      usuarios={usuarios ?? []}
      usuariosFoto={usuarios ?? []}
      filtros={filtros}
      exportHref={exportHref}
    />
  );
}

/** Preserva os filtros na URL da exportação. */
function montaExportHref(p: Busca): string {
  const q = new URLSearchParams();
  for (const chave of ["situacao", "responsavel", "tipo"]) {
    const v = p[chave];
    const s = Array.isArray(v) ? v[0] : v;
    if (s) q.set(chave, s);
  }
  const s = q.toString();
  return s ? `/atividades/exportar?${s}` : "/atividades/exportar";
}
