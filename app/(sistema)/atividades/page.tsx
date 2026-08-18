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
 * F6 — Atividades, em modo lista e modo calendário (B-080).
 *
 * ⚠️ Atividade não exige mais negócio (D-108): pode pertencer a negócio,
 * organização, pessoa ou nada. 76% da base não tem negócio.
 *
 * ⚠️ R-006: são 6.483 atividades. A tela nunca as carrega todas. A lista
 * mostra um dia por vez (padrão: hoje), no modelo do Pipedrive — mais as
 * pendências vencidas no topo, que não somem enquanto não forem tratadas.
 * O calendário carrega só o mês visível.
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
  } else {
    // Atividades do dia em foco.
    let cDia = supabase.from("atividade").select(SELECAO).eq("data", dia);
    cDia = aplicaFiltros(cDia, filtros);
    const { data } = await cDia
      .order("hora_inicio", { nullsFirst: true })
      .returns<LinhaAtividade[]>();
    doDia = data ?? [];

    // Vencidas: pendências atrasadas, sempre no topo quando o foco é hoje.
    // Não aparecem se o recorte é "só concluídas" (uma vencida é, por
    // definição, uma pendente).
    if (dia === hoje && filtros.situacao !== "concluidas") {
      let cv = supabase
        .from("atividade")
        .select(SELECAO)
        .eq("concluida", false)
        .lt("data", hoje);
      if (filtros.responsavel) cv = cv.eq("responsavel_id", filtros.responsavel);
      if (filtros.tipo) cv = cv.eq("tipo_id", filtros.tipo);
      const { data: venc } = await cv
        .order("data")
        .order("hora_inicio", { nullsFirst: true })
        .returns<LinhaAtividade[]>();
      vencidas = venc ?? [];
    }
  }

  const [{ data: tipos }, { data: usuarios }] = await Promise.all([
    supabase.from("tipo_atividade").select("id, nome").eq("ativo", true).order("ordem"),
    supabase.from("usuario").select("id, nome, foto_url").eq("ativo", true).order("nome"),
  ]);

  const exportHref = montaExportHref(p);

  return (
    <PainelAtividades
      doDia={doDia}
      vencidas={vencidas}
      atividadesMes={atividadesMes}
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
