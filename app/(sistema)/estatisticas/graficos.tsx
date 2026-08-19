"use client";

import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Legend,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { real, realCurto } from "@/lib/formato";

/**
 * Os gráficos do painel de indicadores.
 *
 * ⚠️ Doc 08 §3.3: série de valor contínuo usa UMA cor (`--chart-1`), não
 * uma por barra. A sequência categórica de oito só entra quando as barras
 * representam categorias diferentes entre si — como motivo de perda.
 *
 * ⚠️ As cores saem dos tokens em `var(--color-chart-N)`, e não de literais,
 * para que o tema escuro troque a paleta junto (tokens.css linha 208).
 *
 * ⚠️ `prefers-reduced-motion` desliga a animação, por guarda global no
 * globals.css e pelo `isAnimationActive` abaixo — movimento não pedido
 * causa enjoo em quem tem sensibilidade vestibular (D-116).
 */

const EIXO = {
  stroke: "var(--color-text-muted)",
  fontSize: 12,
};

/** Tooltip no tema do sistema, e não o branco padrão do Recharts. */
const CAIXA = {
  backgroundColor: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: 6,
  fontSize: 13,
  color: "var(--color-text)",
};

function semDados(altura: number) {
  return (
    <div
      className="text-text-muted flex items-center justify-center text-sm"
      style={{ height: altura }}
    >
      Sem dados no recorte escolhido.
    </div>
  );
}

/* ---------- Indicador 5: séries mensais ---------- */

export function SerieMensal({
  dados,
}: {
  dados: { mes: string; iniciados: number; ganhos: number; valor_ganho: number }[];
}) {
  if (dados.length === 0) return semDados(280);

  const pontos = dados.map((d) => ({
    ...d,
    // "2024-03-01" -> "mar/24". O eixo precisa caber sem girar o rótulo.
    rotulo: new Date(`${d.mes}T12:00:00`).toLocaleDateString("pt-BR", {
      month: "short",
      year: "2-digit",
    }),
    valor_ganho: Number(d.valor_ganho),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={pontos} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <CartesianGrid stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="rotulo" {...EIXO} tickLine={false} minTickGap={16} />
        <YAxis yAxisId="qtd" {...EIXO} tickLine={false} axisLine={false} width={36} />
        <YAxis
          yAxisId="valor"
          orientation="right"
          {...EIXO}
          tickLine={false}
          axisLine={false}
          width={60}
          tickFormatter={(v: number) => realCurto(v)}
        />
        <Tooltip
          contentStyle={CAIXA}
          cursor={{ fill: "var(--color-surface-hover)" }}
          formatter={(v, nome) =>
            nome === "Valor ganho" ? real(Number(v)) : Number(v).toLocaleString("pt-BR")
          }
        />
        <Legend wrapperStyle={{ fontSize: 12, color: "var(--color-text-secondary)" }} />
        <Bar
          yAxisId="qtd"
          dataKey="iniciados"
          name="Iniciados"
          fill="var(--color-chart-1)"
          radius={[3, 3, 0, 0]}
          isAnimationActive={false}
        />
        <Bar
          yAxisId="qtd"
          dataKey="ganhos"
          name="Ganhos"
          fill="var(--color-chart-3)"
          radius={[3, 3, 0, 0]}
          isAnimationActive={false}
        />
        <Line
          yAxisId="valor"
          type="monotone"
          dataKey="valor_ganho"
          name="Valor ganho"
          stroke="var(--color-chart-2)"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/* ---------- Indicadores 10 a 13: barras por categoria ---------- */

export function BarrasCategoria({
  dados,
  medida,
  altura = 300,
}: {
  dados: { rotulo: string; negocios: number; valor: number; ganhos: number }[];
  medida: "negocios" | "valor";
  altura?: number;
}) {
  if (dados.length === 0) return semDados(altura);

  const pontos = dados.map((d) => ({ ...d, valor: Number(d.valor) }));

  return (
    <ResponsiveContainer width="100%" height={altura}>
      <BarChart
        data={pontos}
        layout="vertical"
        margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
      >
        <CartesianGrid stroke="var(--color-border)" horizontal={false} />
        <XAxis
          type="number"
          {...EIXO}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => (medida === "valor" ? realCurto(v) : String(v))}
        />
        {/* Rótulo largo: nome de motivo de perda chega a 40 caracteres. */}
        <YAxis
          type="category"
          dataKey="rotulo"
          {...EIXO}
          tickLine={false}
          axisLine={false}
          width={150}
        />
        <Tooltip
          contentStyle={CAIXA}
          cursor={{ fill: "var(--color-surface-hover)" }}
          formatter={(v) =>
            medida === "valor" ? real(Number(v)) : Number(v).toLocaleString("pt-BR")
          }
        />
        <Bar dataKey={medida} radius={[0, 3, 3, 0]} isAnimationActive={false}>
          {/* Categorias distintas entre si: aqui a sequência de oito cores
              do Doc 08 é o que se pede, repetindo com o nono item. */}
          {pontos.map((_, i) => (
            <Cell key={i} fill={`var(--color-chart-${(i % 8) + 1})`} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ---------- Indicador 8: lead time por etapa ---------- */

export function LeadTime({
  dados,
}: {
  dados: { etapa: string; passagens: number; dias_medios: number | null }[];
}) {
  if (dados.length === 0) return semDados(260);

  const pontos = dados.map((d) => ({ ...d, dias: Number(d.dias_medios ?? 0) }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={pontos} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <CartesianGrid stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="etapa" {...EIXO} tickLine={false} interval={0} height={48} />
        <YAxis
          {...EIXO}
          tickLine={false}
          axisLine={false}
          width={44}
          tickFormatter={(v: number) => `${v}d`}
        />
        <Tooltip
          contentStyle={CAIXA}
          cursor={{ fill: "var(--color-surface-hover)" }}
          formatter={(v) => `${Number(v)} dias em média`}
        />
        {/* Uma cor só: é a mesma medida em etapas diferentes, não
            categorias que competem entre si (Doc 08 §3.3). */}
        <Bar
          dataKey="dias"
          name="Dias na etapa"
          fill="var(--color-chart-1)"
          radius={[3, 3, 0, 0]}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
