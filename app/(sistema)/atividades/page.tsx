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
 * ⚠️ R-006: são 6.483 atividades. A tela nunca as carrega todas. O padrão
 * mostra só as pendentes (206 na base), agrupadas por dia. Concluídas e
 * "todas" vêm limitadas às mais recentes, com aviso quando há mais.
 */
const LIMITE_PENDENTES = 500;
const LIMITE_HISTORICO = 200;

/** Monta a consulta com os filtros comuns às duas vistas. */
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
  if (filtros.vista === "calendario" && !filtros.mes) filtros.mes = mesBrasilia();

  const hoje = hojeBrasilia();
  const supabase = await createClient();

  let consulta = supabase.from("atividade").select(SELECAO, { count: "exact" });
  consulta = aplicaFiltros(consulta, filtros);

  let truncou = false;
  let total = 0;
  let atividades: LinhaAtividade[] = [];

  if (filtros.vista === "calendario") {
    const { de, ate } = limitesDoMes(filtros.mes);
    const { data, count } = await consulta
      .gte("data", de)
      .lte("data", ate)
      .order("data")
      .order("hora_inicio", { nullsFirst: true })
      .returns<LinhaAtividade[]>();
    atividades = data ?? [];
    total = count ?? 0;
  } else {
    // Pendentes sobem do passado (vencidas) para o futuro; histórico
    // (concluídas/todas) mostra o mais recente primeiro.
    const pendente = filtros.situacao === "pendentes";
    const limite = pendente ? LIMITE_PENDENTES : LIMITE_HISTORICO;
    const { data, count } = await consulta
      .order("data", { ascending: pendente })
      .order("hora_inicio", { nullsFirst: true })
      .range(0, limite - 1)
      .returns<LinhaAtividade[]>();
    atividades = data ?? [];
    total = count ?? 0;
    truncou = total > atividades.length;
  }

  const [{ data: tipos }, { data: usuarios }] = await Promise.all([
    supabase.from("tipo_atividade").select("id, nome").eq("ativo", true).order("ordem"),
    supabase.from("usuario").select("id, nome, foto_url").eq("ativo", true).order("nome"),
  ]);

  const exportHref = montaExportHref(p);

  return (
    <div className="flex h-full min-w-0 flex-col">
      <PainelAtividades
        atividades={atividades}
        tipos={tipos ?? []}
        usuarios={usuarios ?? []}
        usuariosFoto={usuarios ?? []}
        filtros={filtros}
        hoje={hoje}
        exportHref={exportHref}
      />
      {truncou && (
        <p className="border-border text-text-muted shrink-0 border-t px-4 py-2 text-sm">
          Mostrando {atividades.length.toLocaleString("pt-BR")} de{" "}
          {total.toLocaleString("pt-BR")}. Refine por tipo, responsável ou
          situação para ver o resto — ou exporte o CSV, que traz tudo.
        </p>
      )}
    </div>
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
