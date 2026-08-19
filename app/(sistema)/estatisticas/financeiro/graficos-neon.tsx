"use client";

import { useSyncExternalStore } from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { real, realCurto } from "@/lib/formato";

/**
 * Gráficos do relatório financeiro, com brilho neon (D-132).
 *
 * ⚠️ O brilho é filtro SVG (`feGaussianBlur` + `feMerge`), não sombra CSS:
 * sombra não acompanha a forma de uma linha ou de uma barra arredondada,
 * e o resultado seria um retângulo borrado atrás do gráfico.
 *
 * ⚠️ A intensidade sai dos tokens `--neon-halo` e `--neon-desfoque`, que
 * mudam por tema. No claro o halo é discreto — neon sobre branco vira
 * borrão; no escuro ele existe de verdade.
 *
 * ⚠️ **A animação obedece ao sistema.** `prefers-reduced-motion` desliga
 * tudo (D-116): movimento não pedido causa enjoo e desorientação em quem
 * tem sensibilidade vestibular. Isso não é ajuste de gosto — a guarda
 * global do `globals.css` não alcança animação de SVG feita em
 * JavaScript pelo Recharts, então ela precisa ser lida aqui.
 */

const MENOS_MOVIMENTO = "(prefers-reduced-motion: reduce)";

/**
 * Lê a preferência do sistema e acompanha mudanças em tempo real.
 *
 * `useSyncExternalStore` e não `useEffect` + `useState`: matchMedia é uma
 * fonte externa, e assinar por efeito deixa a primeira pintura com o
 * valor errado — quem pediu menos movimento veria a animação começar
 * antes de ela ser desligada, que é exatamente o que a preferência quer
 * evitar.
 */
function usePrefereMenosMovimento() {
  return useSyncExternalStore(
    (aoMudar) => {
      const consulta = window.matchMedia(MENOS_MOVIMENTO);
      consulta.addEventListener("change", aoMudar);
      return () => consulta.removeEventListener("change", aoMudar);
    },
    () => window.matchMedia(MENOS_MOVIMENTO).matches,
    // No servidor não há preferência para ler. Assume "sem movimento":
    // errar para o lado de não animar é o erro barato.
    () => true
  );
}

/**
 * Os filtros e gradientes que os gráficos usam. Ficam num `<defs>` único
 * por gráfico — `id` repetido no documento faz o navegador aplicar o
 * primeiro que encontrar, e um gráfico roubaria o brilho do outro.
 */
function Brilho({ id, cor }: { id: string; cor: string }) {
  return (
    <>
      <filter id={`halo-${id}`} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="var(--neon-desfoque)" result="borrado" />
        <feComponentTransfer in="borrado" result="halo">
          {/* A opacidade do halo vem do token: forte no escuro, discreta
              no claro. */}
          <feFuncA type="linear" slope="var(--neon-halo)" />
        </feComponentTransfer>
        <feMerge>
          <feMergeNode in="halo" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      <linearGradient id={`gradiente-${id}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={cor} stopOpacity={0.55} />
        <stop offset="100%" stopColor={cor} stopOpacity={0.02} />
      </linearGradient>

      <linearGradient id={`barra-${id}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={cor} stopOpacity={1} />
        <stop offset="100%" stopColor={cor} stopOpacity={0.35} />
      </linearGradient>
    </>
  );
}

const EIXO = { stroke: "var(--color-text-muted)", fontSize: 12 };

const CAIXA = {
  backgroundColor: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  fontSize: 13,
  color: "var(--color-text)",
  boxShadow: "0 4px 20px rgb(0 0 0 / 0.25)",
};

function semDados(altura: number) {
  return (
    <div
      className="text-text-muted flex items-center justify-center text-sm"
      style={{ height: altura }}
    >
      Nenhum contrato fechado no recorte escolhido.
    </div>
  );
}

/* ---------- Evolução da receita ---------- */

export function ReceitaNoTempo({
  dados,
}: {
  dados: { mes: string; receita: number; contratos: number; perdido: number }[];
}) {
  const reduzido = usePrefereMenosMovimento();
  if (dados.length === 0) return semDados(320);

  const pontos = dados.map((d) => ({
    rotulo: new Date(`${d.mes}T12:00:00`).toLocaleDateString("pt-BR", {
      month: "short",
      year: "2-digit",
    }),
    receita: Number(d.receita),
    perdido: Number(d.perdido),
    contratos: Number(d.contratos),
  }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={pontos} margin={{ top: 12, right: 8, bottom: 0, left: 8 }}>
        <defs>
          <Brilho id="receita" cor="var(--color-neon-1)" />
          <Brilho id="perdido" cor="var(--color-neon-2)" />
        </defs>

        <CartesianGrid stroke="var(--color-border)" vertical={false} opacity={0.5} />
        <XAxis dataKey="rotulo" {...EIXO} tickLine={false} minTickGap={20} />
        <YAxis
          {...EIXO}
          tickLine={false}
          axisLine={false}
          width={64}
          tickFormatter={(v: number) => realCurto(v)}
        />
        <Tooltip
          contentStyle={CAIXA}
          cursor={{ stroke: "var(--color-neon-1)", strokeOpacity: 0.3, strokeWidth: 2 }}
          formatter={(v, nome) =>
            nome === "Contratos" ? Number(v).toLocaleString("pt-BR") : real(Number(v))
          }
        />
        <Legend wrapperStyle={{ fontSize: 12, color: "var(--color-text-secondary)" }} />

        <Area
          type="monotone"
          dataKey="receita"
          name="Receita"
          stroke="none"
          fill="url(#gradiente-receita)"
          isAnimationActive={!reduzido}
          animationDuration={900}
        />
        <Line
          type="monotone"
          dataKey="receita"
          name="Receita"
          stroke="var(--color-neon-1)"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 5, filter: "url(#halo-receita)" }}
          filter="url(#halo-receita)"
          isAnimationActive={!reduzido}
          animationDuration={900}
          legendType="none"
        />
        <Line
          type="monotone"
          dataKey="perdido"
          name="Perdido"
          stroke="var(--color-neon-2)"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          dot={false}
          filter="url(#halo-perdido)"
          isAnimationActive={!reduzido}
          animationDuration={1100}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/* ---------- Receita por categoria ---------- */

export function ReceitaPorCategoria({
  dados,
  altura = 300,
  cor = "var(--color-neon-1)",
  chave = "cat",
}: {
  dados: { rotulo: string; receita: number; contratos: number; ticket: number | null }[];
  altura?: number;
  cor?: string;
  chave?: string;
}) {
  const reduzido = usePrefereMenosMovimento();
  if (dados.length === 0) return semDados(altura);

  const pontos = dados.map((d) => ({ ...d, receita: Number(d.receita) }));

  return (
    <ResponsiveContainer width="100%" height={altura}>
      <BarChart
        data={pontos}
        layout="vertical"
        margin={{ top: 4, right: 20, bottom: 4, left: 8 }}
      >
        <defs>
          <Brilho id={chave} cor={cor} />
          <linearGradient id={`horizontal-${chave}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={cor} stopOpacity={0.35} />
            <stop offset="100%" stopColor={cor} stopOpacity={1} />
          </linearGradient>
        </defs>

        <CartesianGrid stroke="var(--color-border)" horizontal={false} opacity={0.4} />
        <XAxis
          type="number"
          {...EIXO}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => realCurto(v)}
        />
        <YAxis
          type="category"
          dataKey="rotulo"
          {...EIXO}
          tickLine={false}
          axisLine={false}
          width={140}
        />
        <Tooltip
          contentStyle={CAIXA}
          cursor={{ fill: "var(--color-surface-hover)", opacity: 0.5 }}
          formatter={(v) => real(Number(v))}
        />
        <Bar
          dataKey="receita"
          name="Receita"
          radius={[0, 5, 5, 0]}
          fill={`url(#horizontal-${chave})`}
          filter={`url(#halo-${chave})`}
          isAnimationActive={!reduzido}
          animationDuration={800}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ---------- Pipeline em aberto, por etapa ---------- */

export function PipelinePorEtapa({
  dados,
}: {
  dados: { etapa: string; negocios: number; valor: number }[];
}) {
  const reduzido = usePrefereMenosMovimento();
  const pontos = dados.map((d) => ({ ...d, valor: Number(d.valor) }));
  if (pontos.every((p) => p.valor === 0 && p.negocios === 0)) return semDados(260);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={pontos} margin={{ top: 12, right: 8, bottom: 0, left: 8 }}>
        <defs>
          <Brilho id="pipeline" cor="var(--color-neon-4)" />
        </defs>

        <CartesianGrid stroke="var(--color-border)" vertical={false} opacity={0.4} />
        {/* O nome da etapa sempre escrito — cor nunca é o único sinal
            (Doc 08, B-076). */}
        <XAxis
          dataKey="etapa"
          {...EIXO}
          tickLine={false}
          interval={0}
          height={52}
          angle={-12}
          textAnchor="end"
        />
        <YAxis
          {...EIXO}
          tickLine={false}
          axisLine={false}
          width={64}
          tickFormatter={(v: number) => realCurto(v)}
        />
        <Tooltip
          contentStyle={CAIXA}
          cursor={{ fill: "var(--color-surface-hover)", opacity: 0.5 }}
          formatter={(v) => real(Number(v))}
        />
        <Bar
          dataKey="valor"
          name="Em aberto"
          radius={[5, 5, 0, 0]}
          fill="url(#barra-pipeline)"
          filter="url(#halo-pipeline)"
          isAnimationActive={!reduzido}
          animationDuration={800}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
