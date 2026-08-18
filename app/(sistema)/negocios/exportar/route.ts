import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { real, data as formatarData } from "@/lib/formato";
import { COLUNAS, LIMITE_ORGANIZACOES } from "../colunas";
import {
  SELECAO,
  STATUS_OPCOES,
  parseFiltros,
  limparIlike,
  limiteDataInicio,
  limiteDataFim,
  type LinhaNegocio,
  type Status,
} from "../consulta";

/**
 * Exportação CSV (B-047): ponto-e-vírgula, UTF-8 com BOM, o conjunto
 * filtrado inteiro — não a página de 50 que está na tela.
 *
 * Rota, não server action: uma action devolvendo um CSV inteiro como
 * string vira JSON gigante na resposta do RSC. Uma rota comum já resolve
 * `Content-Type`/`Content-Disposition` de graça, e um `<a href>` simples
 * dispara o download sem JavaScript nenhum.
 *
 * ⚠️ R-006 é sobre nunca carregar a base inteira no NAVEGADOR — estado
 * de tela, paginação, Kanban. Uma exportação é o oposto: o usuário pediu
 * deliberadamente um arquivo com tudo que bate no filtro (podem ser os
 * 2.458, se nenhum filtro estiver ativo), o servidor monta e entrega
 * pronto, sem passar pela lista virtualizada.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const p = Object.fromEntries(request.nextUrl.searchParams);
  const filtros = parseFiltros(p);

  const coluna =
    COLUNAS.find((c) => c.chave === filtros.ordenarPor) ??
    COLUNAS.find((c) => c.chave === "criado_em")!;

  let consulta = supabase
    .from("negocio")
    .select(SELECAO)
    .order(coluna.ordenacao, { ascending: filtros.crescente, nullsFirst: false });

  if (filtros.titulo) {
    consulta = consulta.ilike("titulo", `%${limparIlike(filtros.titulo)}%`);
  }
  if (filtros.organizacao) {
    const termo = limparIlike(filtros.organizacao);
    const { data: orgs } = await supabase
      .from("organizacao")
      .select("id")
      .ilike("nome", `%${termo}%`)
      .limit(LIMITE_ORGANIZACOES);
    const ids = (orgs ?? []).map((o) => o.id);
    consulta =
      ids.length > 0
        ? consulta.in("organizacao_id", ids)
        : consulta.eq("organizacao_id", "00000000-0000-0000-0000-000000000000");
  }
  if (filtros.valorMin) consulta = consulta.gte("valor", Number(filtros.valorMin));
  if (filtros.valorMax) consulta = consulta.lte("valor", Number(filtros.valorMax));
  if (filtros.etapa) consulta = consulta.eq("etapa_id", filtros.etapa);
  if (filtros.status) consulta = consulta.eq("status", filtros.status as Status);
  if (filtros.origem) consulta = consulta.eq("origem_id", filtros.origem);
  if (filtros.produto) consulta = consulta.eq("produto_id", filtros.produto);
  if (filtros.responsavel) consulta = consulta.eq("responsavel_id", filtros.responsavel);
  if (filtros.motivoPerda) consulta = consulta.eq("motivo_perda_id", filtros.motivoPerda);
  if (filtros.criadoDe) {
    consulta = consulta.gte("criado_em", limiteDataInicio(filtros.criadoDe));
  }
  if (filtros.criadoAte) {
    consulta = consulta.lte("criado_em", limiteDataFim(filtros.criadoAte));
  }

  // O PostgREST tem teto de linhas por resposta — busca em blocos até
  // esvaziar, em vez de confiar que o teto do projeto cobre os 2.458.
  const BLOCO = 1000;
  const linhas: LinhaNegocio[] = [];
  for (let inicio = 0; ; inicio += BLOCO) {
    const { data: bloco, error } = await consulta
      .range(inicio, inicio + BLOCO - 1)
      .returns<LinhaNegocio[]>();

    if (error) {
      return new Response(error.message, { status: 500 });
    }
    linhas.push(...(bloco ?? []));
    if (!bloco || bloco.length < BLOCO) break;
  }

  const rotuloStatus = new Map(STATUS_OPCOES.map((s) => [s.valor, s.rotulo]));

  const cabecalho = COLUNAS.map((c) => c.rotulo);
  const corpo = linhas.map((n) => [
    n.titulo,
    n.organizacao?.nome ?? "",
    real(n.valor),
    n.etapa?.nome ?? "",
    rotuloStatus.get(n.status) ?? n.status,
    n.origem?.nome ?? "",
    n.produto?.nome ?? "",
    n.usuario?.nome ?? "",
    n.motivo_perda?.nome ?? "",
    formatarData(n.criado_em),
  ]);

  const csv = [cabecalho, ...corpo]
    .map((linha) => linha.map(campoCsv).join(";"))
    .join("\r\n");

  // BOM: sem ele o Excel em português le acento como lixo (regra 6 do
  // CLAUDE.md).
  const arquivo = "﻿" + csv;

  return new Response(arquivo, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="negocios.csv"',
    },
  });
}

function campoCsv(v: string): string {
  if (/[;"\r\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}
