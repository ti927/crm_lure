import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SELECAO, parseFiltros, formataData, type LinhaAtividade } from "../consulta";

/**
 * Exportação CSV das atividades (B-085, mesmo padrão do B-047):
 * ponto-e-vírgula, UTF-8 com BOM, o recorte filtrado inteiro — não a
 * página que está na tela. Busca em blocos para não depender do teto de
 * linhas do PostgREST.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const p = Object.fromEntries(request.nextUrl.searchParams);
  const f = parseFiltros(p);

  let base = supabase.from("atividade").select(SELECAO);
  if (f.situacao === "pendentes") base = base.eq("concluida", false);
  else if (f.situacao === "concluidas") base = base.eq("concluida", true);
  if (f.responsavel) base = base.eq("responsavel_id", f.responsavel);
  if (f.tipo) base = base.eq("tipo_id", f.tipo);
  base = base.order("data", { ascending: false }).order("hora_inicio", { nullsFirst: true });

  const BLOCO = 1000;
  const linhas: LinhaAtividade[] = [];
  for (let inicio = 0; ; inicio += BLOCO) {
    const { data, error } = await base
      .range(inicio, inicio + BLOCO - 1)
      .returns<LinhaAtividade[]>();
    if (error) return new Response(error.message, { status: 500 });
    linhas.push(...(data ?? []));
    if (!data || data.length < BLOCO) break;
  }

  const cabecalho = [
    "Data", "Início", "Fim", "Tipo", "Título",
    "Referente a", "Tipo do vínculo", "Responsável", "Concluída", "Descrição",
  ];

  const corpo = linhas.map((a) => {
    const vinculo = a.negocio
      ? { rotulo: a.negocio.titulo, tipo: "Negócio" }
      : a.organizacao
        ? { rotulo: a.organizacao.nome, tipo: "Organização" }
        : a.pessoa
          ? { rotulo: a.pessoa.nome, tipo: "Pessoa" }
          : { rotulo: "", tipo: "" };
    return [
      formataData(a.data),
      a.hora_inicio?.slice(0, 5) ?? "",
      a.hora_fim?.slice(0, 5) ?? "",
      a.tipo_atividade?.nome ?? "",
      a.titulo ?? "",
      vinculo.rotulo,
      vinculo.tipo,
      a.usuario?.nome ?? "",
      a.concluida ? "Sim" : "Não",
      a.descricao ?? "",
    ];
  });

  const csv = [cabecalho, ...corpo]
    .map((linha) => linha.map(campoCsv).join(";"))
    .join("\r\n");

  // BOM: sem ele o Excel em português lê acento como lixo (regra 6).
  const arquivo = "﻿" + csv;

  return new Response(arquivo, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="atividades.csv"',
    },
  });
}

function campoCsv(v: string): string {
  if (/[;"\r\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}
