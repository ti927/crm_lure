import { createClient } from "@/lib/supabase/server";
import { real } from "@/lib/formato";
import { AbasEstatisticas } from "./abas";
import { FiltrosIndicadores } from "./filtros-indicadores";
import { FiltroAno } from "./filtro-ano";
import { Painel, CartaoNumero } from "./painel";
import { SerieMensal, BarrasCategoria, LeadTime } from "./graficos-adiados";
import {
  parseFiltros,
  comoArgumentos,
  comoConsulta,
  temFiltro,
  rotulo,
  anosDisponiveis,
  type Busca,
} from "./consulta";

/**
 * Aba Comercial — o catálogo de treze indicadores da D-063, no nível B da
 * D-062: catálogo com recortes, não construtor genérico (E-008, fase 2).
 *
 * ⚠️ O eixo do tempo aqui é `criado_em` — "quando o lead entrou". A aba
 * Financeiro usa `fechado_em`. Os dois não fecham entre si de propósito.
 *
 * ⚠️ Todo o cálculo mora no banco (regra 3 do CLAUDE.md): são 2.458
 * negócios e 3.415 eventos, e nenhuma tela puxa isso para somar aqui.
 */
export default async function PaginaEstatisticas({
  searchParams,
}: {
  searchParams: Promise<Busca>;
}) {
  const filtros = parseFiltros(await searchParams);
  const args = comoArgumentos(filtros);
  const supabase = await createClient();

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
    { data: primeiro },
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
    // O ano mais antigo da base, para os atalhos de ano não serem lista fixa.
    supabase
      .from("negocio")
      .select("criado_em")
      .order("criado_em", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  const r = resumo?.[0];
  const v = valores?.[0];
  const consulta = comoConsulta(filtros);
  const anos = anosDisponiveis(primeiro?.criado_em);

  const num = (x: number | string | null | undefined) =>
    x === null || x === undefined ? "—" : Number(x).toLocaleString("pt-BR");

  // Os rótulos crus do banco viram texto de tela — com acento.
  const status = (porStatus ?? []).map((s) => ({ ...s, rotulo: rotulo(s.rotulo) }));

  return (
    <div className="flex h-full min-w-0 flex-col overflow-y-auto">
      <div className="border-border bg-surface sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Estatísticas</h1>
            <p className="text-text-muted text-sm">
              Por data de entrada do negócio
              {!filtros.incluirParados && " · parados fora"}
            </p>
          </div>
          <AbasEstatisticas consulta={consulta} />
        </div>

        {/* Uma fileira de filtros acima de tudo que eles recortam. */}
        <div className="flex flex-wrap items-center gap-2">
          <FiltroAno filtros={filtros} anos={anos} destino="/estatisticas" />
          <FiltrosIndicadores
            filtros={filtros}
            usuarios={usuarios ?? []}
            origens={origens ?? []}
            produtos={produtos ?? []}
            areas={areas ?? []}
            consulta={consulta}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4 p-4">
        <section aria-label="Números do período" className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <CartaoNumero rotulo="Negócios iniciados" valor={num(r?.iniciados)} />
          <CartaoNumero rotulo="Ganhos" valor={num(r?.ganhos)} realce />
          <CartaoNumero rotulo="Perdidos" valor={num(r?.perdidos)} />
          <CartaoNumero
            rotulo="Em andamento"
            valor={num(r?.em_andamento)}
            apoio={real(r?.valor_em_aberto)}
          />
          <CartaoNumero
            rotulo="Taxa de ganho"
            valor={r?.taxa_ganho == null ? "—" : `${r.taxa_ganho}%`}
            apoio={`sobre ${num(Number(r?.ganhos ?? 0) + Number(r?.perdidos ?? 0))} desfechos`}
            realce
          />
        </section>

        <Painel
          titulo="Negócios ao longo do tempo"
          apoio="Iniciados e ganhos por mês. Valor mora na aba Financeiro — contagem e dinheiro no mesmo gráfico exigiriam duas escalas, e duas escalas inventam correlação."
          colunas={["Mês", "Iniciados", "Ganhos"]}
          linhas={(serie ?? []).map((s) => [s.mes, s.iniciados, s.ganhos])}
        >
          <SerieMensal dados={serie ?? []} />
        </Painel>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Painel
            titulo="Funil de conversão"
            apoio="Dos que alcançaram cada etapa, quantos avançaram para a seguinte"
            colunas={["Etapa", "Alcançaram", "Avançaram", "Conversão"]}
            linhas={(funil ?? []).map((f, i, t) => [
              f.etapa,
              f.alcancaram,
              f.avancaram,
              i === t.length - 1 ? "—" : f.conversao == null ? "—" : `${f.conversao}%`,
            ])}
          >
            <ol className="flex flex-col gap-2.5">
              {(funil ?? []).map((f, i, todas) => {
                const ultima = i === todas.length - 1;
                const maior = Math.max(...todas.map((x) => Number(x.alcancaram)), 1);
                const largura = (Number(f.alcancaram) / maior) * 100;
                const cor = `var(--color-rampa-${Math.min(i + 1, 6)})`;
                return (
                  <li key={f.etapa}>
                    <div className="mb-1 flex items-baseline justify-between gap-2">
                      {/* Etapa sempre escrita — cor nunca é o único sinal. */}
                      <span className="text-md font-medium">{f.etapa}</span>
                      <span className="text-text-secondary text-sm tabular">
                        {num(f.alcancaram)}
                        {!ultima && f.conversao != null && (
                          <span className="text-text-muted"> · {f.conversao}% avançou</span>
                        )}
                        {ultima && <span className="text-text-muted"> · fim do funil</span>}
                      </span>
                    </div>
                    {/* Etapa tem ordem, então a cor mostra a ordem. */}
                    <div className="bg-surface-sunken h-2.5 w-full overflow-hidden rounded-pill">
                      <div
                        className="h-full rounded-pill"
                        style={{
                          width: `${largura}%`,
                          background: cor,
                          color: cor,
                          filter: "drop-shadow(0 0 5px currentColor)",
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ol>
          </Painel>

          <Painel
            titulo="Lead time por etapa"
            apoio="Dias médios que um negócio passa em cada etapa antes de sair"
            colunas={["Etapa", "Passagens", "Dias médios"]}
            linhas={(leadTime ?? []).map((l) => [l.etapa, l.passagens, l.dias_medios ?? "—"])}
          >
            <LeadTime dados={leadTime ?? []} />
          </Painel>

          <Painel
            titulo="Perdas por motivo"
            apoio="Só negócios perdidos"
            colunas={["Motivo", "Negócios", "Valor"]}
            linhas={(porMotivo ?? []).map((m) => [m.rotulo, m.negocios, real(m.valor)])}
          >
            <BarrasCategoria dados={(porMotivo ?? []).slice(0, 8)} chave="motivo" />
          </Painel>

          <Painel
            titulo="Negócios por origem"
            apoio="De onde vieram os cadastros do recorte"
            colunas={["Origem", "Negócios", "Ganhos"]}
            linhas={(porOrigem ?? []).map((o) => [o.rotulo, o.negocios, o.ganhos])}
          >
            <BarrasCategoria dados={(porOrigem ?? []).slice(0, 8)} chave="origem" />
          </Painel>
        </div>

        <Painel
          titulo="Ranking por vendedor"
          apoio="Negócios, ganhos e valor por responsável"
        >
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
                      <td className="px-3 text-right tabular">{num(ganhos)}</td>
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
          <Painel
            titulo="Distribuição por status"
            apoio={
              filtros.incluirParados
                ? "Toda a base do recorte"
                : "Parados não entram — ligue o interruptor no Recorte para vê-los"
            }
            colunas={["Status", "Negócios", "Valor"]}
            linhas={status.map((s) => [s.rotulo, s.negocios, real(s.valor)])}
          >
            <BarrasCategoria dados={status} chave="status" altura={200} status />
          </Painel>

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
                    className={`text-lg font-semibold ${
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
          Funil, lead time e valor se apoiam no log de eventos, que inclui o
          histórico importado do Pipedrive (D-129). Parados{" "}
          {filtros.incluirParados ? "estão incluídos" : "ficam de fora"} (D-067).
          {temFiltro(filtros) && " Recorte ativo."}
        </p>
      </div>
    </div>
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
