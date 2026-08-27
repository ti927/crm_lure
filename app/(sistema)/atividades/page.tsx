import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PainelAtividades } from "./painel-atividades";
import {
  SELECAO,
  parseFiltros,
  buscaCrua,
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
  const supabase = await createClient();

  /**
   * Visita "crua" (nenhum parametro de FILTRO): e aqui que a tela decide
   * em que recorte abrir.
   *
   * ⚠️ Os tres estados da coluna sao a regra inteira — os mesmos do
   * Kanban e da Lista:
   *
   *   preenchida — a ultima combinacao escolhida. Volta igual.
   *   NULA       — nunca escolheu nada. Abre em "so as minhas", que e o
   *                que se espera de quem entra para ver a propria
   *                agenda. Nao grava: segue nula, o padrao segue valendo.
   *   VAZIA      — escolheu ver TUDO. O padrao NAO volta por cima.
   *
   * ⚠️ Os parametros que ja vieram na URL sao PRESERVADOS e o recorte
   * entra por cima. Sem isso, um link do sino apontando para
   * `?vista=vencidas` perderia a aba no redirecionamento e cairia na
   * lista do dia — que nao e para onde o alerta estava mandando.
   */
  if (buscaCrua(p)) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: eu } = await supabase
        .from("usuario")
        .select("id, preferencia_atividades")
        .eq("auth_id", user.id)
        .maybeSingle();

      const destino = new URLSearchParams();
      for (const [chave, valor] of Object.entries(p)) {
        const v = Array.isArray(valor) ? valor[0] : valor;
        if (v) destino.set(chave, v);
      }

      if (eu?.preferencia_atividades) {
        for (const [chave, valor] of new URLSearchParams(
          eu.preferencia_atividades
        )) {
          destino.set(chave, valor);
        }
        redirect(`/atividades?${destino}`);
      }
      if (eu && eu.preferencia_atividades === null) {
        destino.set("responsavel", eu.id);
        redirect(`/atividades?${destino}`);
      }
    }
  }

  const filtros = parseFiltros(p);
  const hoje = hojeBrasilia();
  const dia = filtros.dia || hoje;
  filtros.dia = dia;
  if (filtros.vista === "calendario" && !filtros.mes) filtros.mes = mesBrasilia();

  let doDia: LinhaAtividade[] = [];
  let vencidas: LinhaAtividade[] = [];
  let resultados: LinhaAtividade[] = [];
  let atividadesMes: LinhaAtividade[] = [];

  if (filtros.busca) {
    // ⚠️ A busca sai de uma FUNÇÃO no banco, e não de um `or` do
    // PostgREST: a C-04 registra que coluna de tabela vinculada não é
    // aceita dentro de `or`, e esta busca precisa cobrir o nome do
    // negócio, da organização e da pessoa. A função devolve só os ids;
    // a projeção continua sendo a mesma `SELECAO` do resto da tela.
    const { data: achados } = await supabase.rpc("atividades_busca", {
      p_termo: filtros.busca,
      p_situacao: filtros.situacao,
      p_responsavel: filtros.responsavel || null,
      p_tipo: filtros.tipo || null,
      p_limite: 100,
    });
    const ids = (achados ?? []).map((r) => r.id);
    if (ids.length) {
      const { data } = await supabase
        .from("atividade")
        .select(SELECAO)
        .in("id", ids)
        .order("data", { ascending: false })
        .order("hora_inicio", { nullsFirst: true })
        .returns<LinhaAtividade[]>();
      resultados = data ?? [];
    }
  } else if (filtros.vista === "calendario") {
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
      resultados={resultados}
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
