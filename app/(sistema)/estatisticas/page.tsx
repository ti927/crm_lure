import { createClient } from "@/lib/supabase/server";
import { real } from "@/lib/formato";
import { AbasEstatisticas } from "./abas";
import { FiltrosIndicadores } from "./filtros-indicadores";
import { SerieMensal, BarrasCategoria, LeadTime } from "./graficos";
import { parseFiltros, comoArgumentos, comoConsulta, temFiltro, type Busca } from "./consulta";

/**
 * Módulo de estatísticas — o catálogo de treze indicadores da D-063,
 * no nível B da D-062: catálogo interno com recortes, não construtor
 * genérico de relatórios (que é E-008, fase 2).
 *
 * ⚠️ Todo o cálculo acontece no banco, em sete funções versionadas. A
 * regra 3 do CLAUDE.md proíbe trazer a base para somar no navegador, e
 * aqui isso seria 2.458 negócios mais 3.415 eventos.
 *
 * ⚠️ D-067: negócio `parado` fica fora por padrão, com interruptor na
 * barra de filtros. Cadastro dormente não é negociação em curso.
 *
 * ⚠️ Os indicadores 7, 8 e 9 só existem porque o histórico do Pipedrive
 * foi carregado no log (D-129). Sem ele nasceriam cegos, e não havia
 * como recuperar depois que a API do Pipedrive fechasse.
 */
export default async function PaginaEstatisticas({
  searchParams,
}: {
  searchParams: Promise<Busca>;
}) {
  const filtros = parseFiltros(await searchParams);
  const args = comoArgumentos(filtros);
  const supabase = await createClient();

  // Sete chamadas em paralelo. Em sequência somariam mais de um segundo
  // de espera por nada — nenhuma depende do resultado da outra.
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
    { data: usuarios },
    { data: origens },
    { data: produtos },
    { data: areas },
    { count: importados },
    { count: desteSistema },
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
    supabase.from("usuario").select("id, nome").eq("ativo", true).order("nome"),
    supabase.from("origem").select("id, nome").eq("ativo", true).order("ordem"),
    supabase.from("produto").select("id, nome").order("nome"),
    supabase.from("area_produto").select("id, nome").eq("ativo", true).order("ordem"),
    // Procedência do log, para o rodapé dizer sobre o que os indicadores
    // de trajetória se apoiam — sem número escrito à mão, que envelhece.
    supabase
      .from("evento_negocio")
      .select("id", { count: "exact", head: true })
      .eq("importado_do_pipedrive", true),
    supabase
      .from("evento_negocio")
      .select("id", { count: "exact", head: true })
      .eq("importado_do_pipedrive", false)
      .eq("origem_carga", false),
  ]);

  const r = resumo?.[0];
  const v = valores?.[0];
  const consulta = comoConsulta(filtros);

  return (
    <div className="flex h-full min-w-0 flex-col overflow-y-auto">
      <div className="border-border sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b bg-surface px-4 py-3">
        <div className="flex flex-wrap items-center gap-4">
          <div>
          <h1 className="text-xl font-semibold tracking-tight">Estatísticas</h1>
          <p className="text-text-muted text-sm">
            {r
              ? `${Number(r.iniciados).toLocaleString("pt-BR")} negócio${
                  Number(r.iniciados) === 1 ? "" : "s"
                } no recorte`
              : "—"}
            {!filtros.incluirParados && " · parados fora (D-067)"}
          </p>
          </div>
          <AbasEstatisticas consulta={consulta} />
        </div>
        <FiltrosIndicadores
          filtros={filtros}
          usuarios={usuarios ?? []}
          origens={origens ?? []}
          produtos={produtos ?? []}
          areas={areas ?? []}
          consulta={consulta}
        />
      </div>

      <div className="flex flex-col gap-4 p-4">
        {/* ---------- Indicadores 1 a 4 e 6 ---------- */}
        <section aria-label="Números do período" className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Numero rotulo="Negócios iniciados" valor={num(r?.iniciados)} />
          <Numero rotulo="Ganhos" valor={num(r?.ganhos)} tom="ganho" />
          <Numero rotulo="Valor ganho" valor={real(r?.valor_ganho)} tom="ganho" destaque />
          <Numero
            rotulo="Em andamento"
            valor={num(r?.em_andamento)}
            apoio={real(r?.valor_em_aberto)}
          />
          <Numero
            rotulo="Taxa de ganho"
            valor={r?.taxa_ganho == null ? "—" : `${r.taxa_ganho}%`}
            apoio={`sobre ${num(Number(r?.ganhos ?? 0) + Number(r?.perdidos ?? 0))} desfechos`}
          />
        </section>

        {/* ---------- Indicador 5 ---------- */}
        <Painel
          titulo="Ao longo do tempo"
          apoio="Negócios iniciados e ganhos por mês, com o valor ganho na linha"
        >
          <SerieMensal dados={serie ?? []} />
        </Painel>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {/* ---------- Indicador 7 ---------- */}
          <Painel
            titulo="Funil de conversão"
            apoio="Dos que alcançaram cada etapa, quantos avançaram para a seguinte"
          >
            <ol className="flex flex-col gap-2">
              {(funil ?? []).map((f, i, todas) => {
                const ultima = i === todas.length - 1;
                const maior = Math.max(...todas.map((x) => Number(x.alcancaram)), 1);
                const largura = (Number(f.alcancaram) / maior) * 100;
                return (
                  <li key={f.etapa}>
                    <div className="mb-1 flex items-baseline justify-between gap-2">
                      {/* A etapa nunca depende só de cor: o nome vem escrito (B-076). */}
                      <span className="text-md font-medium">{f.etapa}</span>
                      <span className="text-text-secondary text-sm tabular">
                        {num(f.alcancaram)}
                        {!ultima && f.conversao != null && (
                          <span className="text-text-muted">
                            {" · "}
                            {f.conversao}% avançou
                          </span>
                        )}
                        {/* A última etapa não tem próxima: 0% ali seria mentira. */}
                        {ultima && <span className="text-text-muted"> · fim do funil</span>}
                      </span>
                    </div>
                    <div className="bg-surface-sunken h-2 w-full overflow-hidden rounded-pill">
                      <div
                        className="bg-chart-1 h-full rounded-pill"
                        style={{ width: `${largura}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ol>
          </Painel>

          {/* ---------- Indicador 8 ---------- */}
          <Painel
            titulo="Lead time por etapa"
            apoio="Dias médios que um negócio passa em cada etapa antes de sair"
          >
            <LeadTime dados={leadTime ?? []} />
          </Painel>

          {/* ---------- Indicador 10 ---------- */}
          <Painel titulo="Perdas por motivo" apoio="Só negócios perdidos, por quantidade">
            <BarrasCategoria dados={(porMotivo ?? []).slice(0, 8)} medida="negocios" />
          </Painel>

          {/* ---------- Indicador 11 ---------- */}
          <Painel titulo="Negócios por origem" apoio="De onde vieram os cadastros do recorte">
            <BarrasCategoria dados={(porOrigem ?? []).slice(0, 8)} medida="negocios" />
          </Painel>
        </div>

        {/* ---------- Indicador 13 ---------- */}
        <Painel titulo="Ranking por vendedor" apoio="Negócios, ganhos e valor por responsável">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-md">
              <thead>
                <tr className="border-border text-text-muted border-b text-left text-xs uppercase tracking-caps">
                  <th className="h-9 px-3 font-semibold">Responsável</th>
                  <th className="h-9 px-3 text-right font-semibold">Negócios</th>
                  <th className="h-9 px-3 text-right font-semibold">Ganhos</th>
                  <th className="h-9 px-3 text-right font-semibold">Taxa</th>
                  <th className="h-9 px-3 text-right font-semibold">Valor</th>
                </tr>
              </thead>
              <tbody>
                {(porVendedor ?? []).map((u) => {
                  const total = Number(u.negocios);
                  const ganhos = Number(u.ganhos);
                  return (
                    <tr key={u.rotulo} className="border-border h-row-cozy border-b">
                      <td className="px-3">{u.rotulo}</td>
                      <td className="px-3 text-right tabular">{num(total)}</td>
                      <td className="text-success-ink px-3 text-right tabular">{num(ganhos)}</td>
                      <td className="px-3 text-right tabular">
                        {total === 0 ? "—" : `${((ganhos / total) * 100).toFixed(1)}%`}
                      </td>
                      <td className="px-3 text-right tabular">{real(u.valor)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Painel>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {/* ---------- Indicador 12 ---------- */}
          <Painel
            titulo="Distribuição por status"
            apoio={
              filtros.incluirParados
                ? "Toda a base do recorte"
                : "Parados não entram — ligue o interruptor para vê-los"
            }
          >
            <BarrasCategoria dados={porStatus ?? []} medida="negocios" altura={200} />
          </Painel>

          {/* ---------- Indicador 9 ---------- */}
          <Painel
            titulo="Valor inicial × valor fechado"
            apoio="Como o valor negociado mudou entre a primeira e a última revisão"
          >
            {!v || Number(v.negocios) === 0 ? (
              <p className="text-text-muted py-8 text-center text-sm">
                Nenhum negócio do recorte teve o valor revisado.
              </p>
            ) : (
              <div className="flex flex-col gap-3 py-2">
                <Linha rotulo="Negócios com valor revisado" valor={num(v.negocios)} />
                <Linha rotulo="Soma dos valores iniciais" valor={real(v.soma_inicial)} />
                <Linha rotulo="Soma dos valores finais" valor={real(v.soma_final)} />
                <div className="border-border flex items-baseline justify-between border-t pt-3">
                  <span className="text-md font-medium">Variação</span>
                  <span
                    className={`text-lg font-semibold tabular ${
                      v.variacao == null
                        ? ""
                        : Number(v.variacao) < 0
                          ? "text-danger-ink"
                          : "text-success-ink"
                    }`}
                  >
                    {v.variacao == null
                      ? "—"
                      : `${Number(v.variacao) > 0 ? "+" : ""}${v.variacao}%`}
                  </span>
                </div>
                <p className="text-text-muted text-xs">
                  A base é o primeiro valor não nulo e não zero: negócio nasce sem
                  valor, e comparar contra zero faria a variação parecer infinita.
                </p>
              </div>
            )}
          </Painel>
        </div>

        <p className="text-text-muted px-1 pb-2 text-xs">
          Funil, lead time e valor se apoiam no log de eventos:{" "}
          <strong>{num(importados)}</strong> importados do Pipedrive (D-129) e{" "}
          <strong>{num(desteSistema)}</strong> registrados neste sistema. Parados{" "}
          {filtros.incluirParados ? "estão incluídos" : "ficam de fora"} (D-067).
          {temFiltro(filtros) && " Recorte ativo."}
        </p>
      </div>
    </div>
  );
}

/* ---------- peças de apresentação ---------- */

const num = (v: number | string | null | undefined) =>
  v === null || v === undefined ? "—" : Number(v).toLocaleString("pt-BR");

function Numero({
  rotulo,
  valor,
  apoio,
  tom,
  destaque,
}: {
  rotulo: string;
  valor: string;
  apoio?: string;
  tom?: "ganho";
  destaque?: boolean;
}) {
  return (
    <div
      className={`border-border bg-surface rounded-lg border p-3 ${
        destaque ? "lg:col-span-1" : ""
      }`}
    >
      <p className="text-text-muted text-xs font-semibold uppercase tracking-caps">{rotulo}</p>
      <p
        className={`mt-1 text-xl font-semibold tabular ${
          tom === "ganho" ? "text-success-ink" : ""
        }`}
      >
        {valor}
      </p>
      {apoio && <p className="text-text-muted mt-0.5 text-xs">{apoio}</p>}
    </div>
  );
}

function Painel({
  titulo,
  apoio,
  children,
}: {
  titulo: string;
  apoio?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-border bg-surface rounded-lg border p-4">
      <h2 className="text-md font-semibold">{titulo}</h2>
      {apoio && <p className="text-text-muted mb-3 text-sm">{apoio}</p>}
      {children}
    </section>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-text-secondary text-md">{rotulo}</span>
      <span className="text-md font-medium tabular">{valor}</span>
    </div>
  );
}
