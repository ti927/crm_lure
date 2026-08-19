import Link from "next/link";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { real, data as formatarData } from "@/lib/formato";
import type { RecorteFinanceiro } from "@/lib/supabase/types";
import { AbasEstatisticas } from "../abas";
import { FiltrosIndicadores } from "../filtros-indicadores";
import { InterruptorNeon } from "../interruptor-neon";
import { FiltroAno } from "../filtro-ano";
import { Painel } from "../grafico-base";
import { CartaoNumero } from "../painel";
import { parseFiltros, comoConsulta, anosDisponiveis, type Busca } from "../consulta";
import {
  ReceitaNoTempo,
  ReceitaPorCategoria,
  PipelinePorEtapa,
} from "../graficos-adiados";

/**
 * Relatório financeiro (D-131), no padrão de leitura do Insights do
 * Pipedrive: receita realizada, ticket médio, evolução no tempo e
 * recortes por vendedor, origem, produto e cliente.
 *
 * ⚠️ **O eixo do tempo é `fechado_em`, não `criado_em`.** É a diferença
 * entre "quando entrou dinheiro" e "quando o lead entrou" — e para 2021
 * a resposta difere em 3,5×. A aba Comercial usa o outro eixo de
 * propósito; os dois números não fecham entre si, e não deveriam.
 *
 * ⚠️ **Não há projeção de receita, e não pode haver.** Não existe data
 * prevista de fechamento neste sistema (D-024). O que se mostra é
 * realizado, mais o que está na mesa — sem prever quando fecha.
 */
export default async function PaginaFinanceiro({
  searchParams,
}: {
  searchParams: Promise<Busca>;
}) {
  const filtros = parseFiltros(await searchParams);
  const consulta = comoConsulta(filtros);

  // O recorte do financeiro não leva `p_incluir_parados`: cadastro
  // dormente não é receita nem pipeline.
  const args: RecorteFinanceiro = {
    p_de: filtros.de || null,
    p_ate: filtros.ate || null,
    p_responsavel: filtros.responsavel || null,
    p_origem: filtros.origem || null,
    p_produto: filtros.produto || null,
    p_area: filtros.area || null,
  };

  const supabase = await createClient();

  const [
    { data: resumo },
    { data: mensal },
    { data: porVendedor },
    { data: porOrigem },
    { data: porCliente },
    { data: porArea },
    { data: pipeline },
    { data: maiores },
    { data: usuarios },
    { data: origens },
    { data: produtos },
    { data: areas },
    { data: primeiro },
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
    supabase.rpc("financeiro_maiores", { ...args, p_limite: 10 }),
    supabase.from("usuario").select("id, nome").eq("ativo", true).order("nome"),
    supabase.from("origem").select("id, nome").eq("ativo", true).order("ordem"),
    supabase.from("produto").select("id, nome").order("nome"),
    supabase.from("area_produto").select("id, nome").eq("ativo", true).order("ordem"),
    supabase
      .from("negocio")
      .select("fechado_em")
      .not("fechado_em", "is", null)
      .order("fechado_em", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  const anos = anosDisponiveis(primeiro?.fechado_em);
  const r = resumo?.[0];
  const receita = Number(r?.receita ?? 0);
  const anterior = Number(r?.receita_anterior ?? 0);
  const temComparativo = Boolean(filtros.de && filtros.ate);
  const variacao = anterior > 0 ? ((receita - anterior) / anterior) * 100 : null;

  const totalPipeline = (pipeline ?? []).reduce((s, p) => s + Number(p.valor), 0);
  const perdido = Number(r?.valor_perdido ?? 0);
  const taxaValor =
    receita + perdido > 0 ? (receita / (receita + perdido)) * 100 : null;

  return (
    <div className="flex h-full min-w-0 flex-col overflow-y-auto">
      <div className="border-border bg-surface sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Financeiro</h1>
            <p className="text-text-muted text-sm">
              Por data de fechamento
              {filtros.de || filtros.ate
                ? ` · ${filtros.de || "início"} a ${filtros.ate || "hoje"}`
                : " · toda a base"}
            </p>
          </div>
          <AbasEstatisticas consulta={consulta} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <InterruptorNeon />
          <FiltroAno filtros={filtros} anos={anos} destino="/estatisticas/financeiro" />
          <FiltrosIndicadores
            filtros={filtros}
            usuarios={usuarios ?? []}
            origens={origens ?? []}
            produtos={produtos ?? []}
            areas={areas ?? []}
            consulta={consulta}
            destino="/estatisticas/financeiro"
            esconderParados
          />
        </div>
      </div>

      <div className="flex flex-col gap-4 p-4">
        {/* ---------- Cartões de topo ---------- */}
        <section aria-label="Números do período" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <CartaoNumero
            rotulo="Receita realizada"
            realce
            valor={real(receita)}
            apoio={
              temComparativo && variacao !== null ? (
                <Variacao pct={variacao} anterior={real(anterior)} />
              ) : (
                `${Number(r?.contratos ?? 0).toLocaleString("pt-BR")} contratos fechados`
              )
            }
          />
          <CartaoNumero
            rotulo="Ticket médio"
            valor={real(r?.ticket_medio)}
            apoio="por contrato ganho"
          />
          <CartaoNumero
            rotulo="Pipeline em aberto"
            valor={real(totalPipeline)}
            realce
            apoio={`${Number(r?.negocios_abertos ?? 0)} negócios em negociação`}
          />
          <CartaoNumero
            rotulo="Valor perdido"
            valor={real(perdido)}
            apoio={
              taxaValor !== null
                ? `${taxaValor.toFixed(1)}% do valor disputado foi ganho`
                : `${Number(r?.contratos_perdidos ?? 0)} contratos`
            }
          />
        </section>

        {/* ---------- Evolução ---------- */}
        <Painel
          titulo="Receita ao longo do tempo"
          apoio="Linha cheia: receita fechada no mês. Tracejada: valor perdido no mesmo mês."
        >
          <ReceitaNoTempo dados={mensal ?? []} />
        </Painel>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Painel titulo="Receita por vendedor" apoio="Quem fechou quanto no recorte">
            <ReceitaPorCategoria
              dados={(porVendedor ?? []).slice(0, 8)}
              chave="vendedor"
            />
          </Painel>

          <Painel
            titulo="Pipeline em aberto por etapa"
            apoio="Valor que está na mesa hoje. Não é previsão — não existe data prevista de fechamento (D-024)."
          >
            <PipelinePorEtapa dados={pipeline ?? []} />
          </Painel>

          <Painel titulo="Receita por origem" apoio="De onde veio o dinheiro">
            <ReceitaPorCategoria
              dados={(porOrigem ?? []).slice(0, 8)}
              chave="origem"
            />
          </Painel>

          <Painel
            titulo="Receita por área do produto"
            apoio={
              (porArea ?? []).every((a) => a.rotulo === "(sem informação)")
                ? "A base nasceu sem produtos cadastrados — este corte se preenche conforme vocês cadastrarem"
                : "Por área de atuação"
            }
          >
            <ReceitaPorCategoria
              dados={(porArea ?? []).slice(0, 8)}
              chave="area"
            />
          </Painel>
        </div>

        {/* ---------- Maiores clientes ---------- */}
        <Painel titulo="Maiores clientes por receita" apoio="Os dez que mais trouxeram">
          <ReceitaPorCategoria
            dados={(porCliente ?? []).slice(0, 10)}
            chave="cliente"
            altura={360}
          />
        </Painel>

        {/* ---------- Maiores contratos ---------- */}
        <Painel titulo="Maiores contratos fechados" apoio="Os dez de maior valor no recorte">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-md">
              <thead>
                <tr className="border-border text-text-muted border-b text-left text-xs uppercase tracking-caps">
                  <th className="h-9 px-3 font-semibold">Negócio</th>
                  <th className="h-9 px-3 font-semibold">Cliente</th>
                  <th className="h-9 px-3 font-semibold">Responsável</th>
                  <th className="h-9 px-3 font-semibold">Fechado em</th>
                  <th className="h-9 px-3 text-right font-semibold">Valor</th>
                </tr>
              </thead>
              <tbody>
                {(maiores ?? []).map((m) => (
                  <tr key={m.id} className="border-border hover:bg-surface-hover h-row-cozy border-b">
                    <td className="px-3">
                      <Link
                        href={`/negocios/${m.id}`}
                        className="hover:text-brand-ink font-medium underline-offset-2 hover:underline"
                      >
                        {m.titulo}
                      </Link>
                    </td>
                    <td className="text-text-secondary px-3">{m.organizacao}</td>
                    <td className="text-text-secondary px-3">{m.responsavel}</td>
                    <td className="text-text-secondary px-3 tabular">
                      {formatarData(m.fechado_em)}
                    </td>
                    <td className="px-3 text-right font-semibold tabular">{real(m.valor)}</td>
                  </tr>
                ))}
                {(maiores ?? []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-text-muted px-3 py-8 text-center text-sm">
                      Nenhum contrato fechado no recorte.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Painel>

        <p className="text-text-muted px-1 pb-2 text-xs">
          Receita é a soma do <strong>valor total do contrato</strong> dos negócios
          ganhos (D-006), atribuída ao mês em que o negócio foi fechado. Contratos
          recorrentes entram normalizados como contrato anual. Moeda única: real
          (D-087). <strong>Não há projeção</strong> — este sistema não tem data
          prevista de fechamento (D-024), e o pipeline em aberto é valor na mesa,
          não receita esperada.
        </p>
      </div>
    </div>
  );
}

/* ---------- peças ---------- */

function Variacao({ pct, anterior }: { pct: number; anterior: string }) {
  const subiu = pct > 0.05;
  const desceu = pct < -0.05;
  const Icone = subiu ? ArrowUp : desceu ? ArrowDown : Minus;
  return (
    <span
      className={`inline-flex items-center gap-1 ${
        subiu ? "text-success-ink" : desceu ? "text-danger-ink" : "text-text-muted"
      }`}
    >
      <Icone className="size-3" aria-hidden />
      {pct > 0 ? "+" : ""}
      {pct.toFixed(1)}% vs. período anterior ({anterior})
    </span>
  );
}

