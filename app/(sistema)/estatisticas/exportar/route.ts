import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { real } from "@/lib/formato";
import { parseFiltros, comoArgumentos, type Busca } from "../consulta";

/**
 * Exportação dos indicadores (D-066): ponto-e-vírgula, UTF-8 com BOM, o
 * recorte que está na tela.
 *
 * ⚠️ Um CSV é uma grade, e o painel tem sete tabelas de formatos
 * diferentes. Em vez de escolher uma e perder as outras, o arquivo sai em
 * blocos rotulados, separados por linha em branco — que é como uma
 * planilha de indicadores se lê de verdade, e como o Insights do
 * Pipedrive exporta.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const p = Object.fromEntries(request.nextUrl.searchParams) as Busca;
  const filtros = parseFiltros(p);
  const args = comoArgumentos(filtros);

  const [
    { data: resumo },
    { data: serie },
    { data: funil },
    { data: leadTime },
    { data: valores },
    { data: porMotivo },
    { data: porOrigem },
    { data: porVendedor },
    { data: porStatus },
  ] = await Promise.all([
    supabase.rpc("indicadores_resumo", args),
    supabase.rpc("indicadores_serie_mensal", args),
    supabase.rpc("indicadores_funil", args),
    supabase.rpc("indicadores_lead_time", args),
    supabase.rpc("indicadores_valor_inicial_final", args),
    supabase.rpc("indicadores_por_dimensao", { ...args, p_dimensao: "motivo_perda" }),
    supabase.rpc("indicadores_por_dimensao", { ...args, p_dimensao: "origem" }),
    supabase.rpc("indicadores_por_dimensao", { ...args, p_dimensao: "responsavel" }),
    supabase.rpc("indicadores_por_dimensao", { ...args, p_dimensao: "status" }),
  ]);

  const r = resumo?.[0];
  const v = valores?.[0];
  const linhas: string[][] = [];

  const bloco = (titulo: string, cabecalho: string[], corpo: (string | number)[][]) => {
    if (linhas.length) linhas.push([]);
    linhas.push([titulo]);
    linhas.push(cabecalho);
    for (const l of corpo) linhas.push(l.map(String));
  };

  // O recorte vai no arquivo: uma planilha sem o filtro que a gerou é uma
  // planilha que vai ser lida errada daqui a um mês.
  bloco("Recorte", ["Parâmetro", "Valor"], [
    ["De", filtros.de || "início da base"],
    ["Até", filtros.ate || "hoje"],
    ["Negócios parados", filtros.incluirParados ? "incluídos" : "excluídos (D-067)"],
    ["Gerado em", new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })],
  ]);

  if (r) {
    bloco("Resumo", ["Indicador", "Valor"], [
      ["Negócios iniciados", r.iniciados],
      ["Ganhos", r.ganhos],
      ["Perdidos", r.perdidos],
      ["Valor ganho", real(r.valor_ganho)],
      ["Em andamento", r.em_andamento],
      ["Valor em aberto", real(r.valor_em_aberto)],
      ["Taxa de ganho", r.taxa_ganho == null ? "—" : `${r.taxa_ganho}%`],
    ]);
  }

  bloco(
    "Ao longo do tempo",
    ["Mês", "Iniciados", "Ganhos", "Valor ganho"],
    (serie ?? []).map((s) => [s.mes, s.iniciados, s.ganhos, real(s.valor_ganho)])
  );

  bloco(
    "Funil de conversão",
    ["Etapa", "Alcançaram", "Avançaram", "Conversão"],
    (funil ?? []).map((f, i, t) => [
      f.etapa,
      f.alcancaram,
      f.avancaram,
      // A última etapa não tem próxima — 0% ali seria mentira.
      i === t.length - 1 ? "—" : f.conversao == null ? "—" : `${f.conversao}%`,
    ])
  );

  bloco(
    "Lead time por etapa",
    ["Etapa", "Passagens", "Dias médios"],
    (leadTime ?? []).map((l) => [l.etapa, l.passagens, l.dias_medios ?? "—"])
  );

  if (v) {
    bloco("Valor inicial x fechado", ["Indicador", "Valor"], [
      ["Negócios com valor revisado", v.negocios],
      ["Soma dos valores iniciais", real(v.soma_inicial)],
      ["Soma dos valores finais", real(v.soma_final)],
      ["Variação", v.variacao == null ? "—" : `${v.variacao}%`],
    ]);
  }

  const dimensao = (
    titulo: string,
    dados: { rotulo: string; negocios: number; valor: number; ganhos: number }[] | null
  ) =>
    bloco(
      titulo,
      ["Rótulo", "Negócios", "Ganhos", "Valor"],
      (dados ?? []).map((d) => [d.rotulo, d.negocios, d.ganhos, real(d.valor)])
    );

  dimensao("Perdas por motivo", porMotivo);
  dimensao("Negócios por origem", porOrigem);
  dimensao("Ranking por vendedor", porVendedor);
  dimensao("Distribuição por status", porStatus);

  const csv = linhas.map((l) => l.map(campoCsv).join(";")).join("\r\n");

  // BOM: sem ele o Excel em português lê acento como lixo (regra 6).
  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="indicadores.csv"',
    },
  });
}

function campoCsv(v: string): string {
  if (/[;"\r\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}
