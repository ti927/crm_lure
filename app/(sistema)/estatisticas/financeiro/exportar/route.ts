import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { real, data as formatarData } from "@/lib/formato";
import type { RecorteFinanceiro } from "@/lib/supabase/types";
import { parseFiltros, type Busca } from "../../consulta";

/**
 * Exportação do relatório financeiro (D-066): ponto-e-vírgula, UTF-8 com
 * BOM, o recorte que está na tela — em blocos rotulados, como o Insights
 * do Pipedrive exporta.
 *
 * ⚠️ Todos os valores saem formatados em real e as datas em dd/mm/aaaa.
 * Uma planilha financeira que abre com ponto decimal no Excel em
 * português vira texto, e a soma na célula de baixo não funciona.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const filtros = parseFiltros(Object.fromEntries(request.nextUrl.searchParams) as Busca);

  const args: RecorteFinanceiro = {
    p_de: filtros.de || null,
    p_ate: filtros.ate || null,
    p_responsavel: filtros.responsavel || null,
    p_origem: filtros.origem || null,
    p_produto: filtros.produto || null,
    p_area: filtros.area || null,
  };

  const [
    { data: resumo },
    { data: mensal },
    { data: porVendedor },
    { data: porOrigem },
    { data: porCliente },
    { data: porArea },
    { data: pipeline },
    { data: maiores },
  ] = await Promise.all([
    supabase.rpc("financeiro_resumo", args),
    supabase.rpc("financeiro_mensal", args),
    supabase.rpc("financeiro_por_dimensao", { ...args, p_dimensao: "responsavel" }),
    supabase.rpc("financeiro_por_dimensao", { ...args, p_dimensao: "origem" }),
    supabase.rpc("financeiro_por_dimensao", { ...args, p_dimensao: "organizacao" }),
    supabase.rpc("financeiro_por_dimensao", { ...args, p_dimensao: "area" }),
    supabase.rpc("financeiro_pipeline", {
      p_responsavel: args.p_responsavel,
      p_origem: args.p_origem,
      p_produto: args.p_produto,
      p_area: args.p_area,
    }),
    supabase.rpc("financeiro_maiores", { ...args, p_limite: 25 }),
  ]);

  const r = resumo?.[0];
  const linhas: string[][] = [];
  const bloco = (titulo: string, cabecalho: string[], corpo: (string | number)[][]) => {
    if (linhas.length) linhas.push([]);
    linhas.push([titulo]);
    linhas.push(cabecalho);
    for (const l of corpo) linhas.push(l.map(String));
  };

  bloco("Relatório financeiro — recorte", ["Parâmetro", "Valor"], [
    ["Eixo do tempo", "data de fechamento do negócio"],
    ["De", filtros.de || "início da base"],
    ["Até", filtros.ate || "hoje"],
    ["Gerado em", new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })],
    ["Observação", "Sem projeção de receita — este sistema não tem data prevista de fechamento"],
  ]);

  if (r) {
    bloco("Resumo", ["Indicador", "Valor"], [
      ["Receita realizada", real(r.receita)],
      ["Contratos fechados", r.contratos],
      ["Ticket médio", real(r.ticket_medio)],
      ["Valor perdido", real(r.valor_perdido)],
      ["Contratos perdidos", r.contratos_perdidos],
      ["Pipeline em aberto", real(r.pipeline_aberto)],
      ["Negócios em negociação", r.negocios_abertos],
      ["Receita do período anterior", real(r.receita_anterior)],
      ["Contratos do período anterior", r.contratos_anterior],
    ]);
  }

  bloco(
    "Receita mês a mês",
    ["Mês", "Receita", "Contratos", "Ticket médio", "Valor perdido"],
    (mensal ?? []).map((m) => [
      m.mes,
      real(m.receita),
      m.contratos,
      real(m.ticket),
      real(m.perdido),
    ])
  );

  const dimensao = (
    titulo: string,
    dados:
      | { rotulo: string; receita: number; contratos: number; ticket: number | null; perdido: number }[]
      | null
  ) =>
    bloco(
      titulo,
      ["Rótulo", "Receita", "Contratos", "Ticket médio", "Valor perdido"],
      (dados ?? []).map((d) => [
        d.rotulo,
        real(d.receita),
        d.contratos,
        real(d.ticket),
        real(d.perdido),
      ])
    );

  dimensao("Receita por vendedor", porVendedor);
  dimensao("Receita por origem", porOrigem);
  dimensao("Receita por cliente", porCliente);
  dimensao("Receita por área do produto", porArea);

  bloco(
    "Pipeline em aberto por etapa",
    ["Etapa", "Negócios", "Valor na mesa"],
    (pipeline ?? []).map((p) => [p.etapa, p.negocios, real(p.valor)])
  );

  bloco(
    "Maiores contratos fechados",
    ["Negócio", "Cliente", "Responsável", "Fechado em", "Valor"],
    (maiores ?? []).map((m) => [
      m.titulo,
      m.organizacao,
      m.responsavel,
      formatarData(m.fechado_em),
      real(m.valor),
    ])
  );

  const csv = linhas.map((l) => l.map(campoCsv).join(";")).join("\r\n");

  // BOM: sem ele o Excel em português lê acento como lixo (regra 6).
  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="financeiro.csv"',
    },
  });
}

function campoCsv(v: string): string {
  if (/[;"\r\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}
