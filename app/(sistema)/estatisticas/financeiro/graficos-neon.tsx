"use client";

import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { real, realCurto } from "@/lib/formato";
import {
  DICA,
  EIXO,
  FORTE,
  GRADE,
  MEDIO,
  RAMPA,
  SemDados,
  usePrefereMenosMovimento,
} from "../grafico-base";

/**
 * Gráficos do relatório financeiro (D-132, revisto pela D-133).
 *
 * ⚠️ Uma matiz só, em duas intensidades, sem brilho. O neon saiu: só
 * ficava razoável no tema escuro, e no claro virava borrão.
 *
 * ⚠️ Receita e valor perdido são a mesma unidade (real), então dividem um
 * eixo. Nunca dois eixos no mesmo gráfico: o alinhamento entre duas
 * escalas é arbitrário e inventa correlação que o dado não tem.
 */

/* ---------- Evolução da receita ---------- */

export function ReceitaNoTempo({
  dados,
}: {
  dados: { mes: string; receita: number; contratos: number; perdido: number }[];
}) {
  const reduzido = usePrefereMenosMovimento();
  if (dados.length === 0)
    return <SemDados altura={320} texto="Nenhum contrato fechado no recorte." />;

  const pontos = dados.map((d) => ({
    rotulo: new Date(`${d.mes}T12:00:00`).toLocaleDateString("pt-BR", {
      month: "short",
      year: "2-digit",
    }),
    Receita: Number(d.receita),
    Perdido: Number(d.perdido),
  }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={pontos} margin={{ top: 12, right: 12, bottom: 0, left: 4 }}>

        <CartesianGrid {...GRADE} vertical={false} />
        <XAxis dataKey="rotulo" {...EIXO} tickLine={false} minTickGap={24} />
        <YAxis
          {...EIXO}
          tickLine={false}
          axisLine={false}
          width={64}
          tickFormatter={(v: number) => realCurto(v)}
        />
        <Tooltip
          {...DICA}
          cursor={{ stroke: "var(--color-border)", strokeWidth: 2 }}
          formatter={(v) => real(Number(v))}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: "var(--color-text-secondary)" }} />

        <Area
          type="monotone"
          dataKey="Receita"
          stroke="none"
          fill="var(--color-dado-fraco)"
          fillOpacity={0.35}
          isAnimationActive={!reduzido}
          animationDuration={900}
          legendType="none"
        />
        <Line
          type="monotone"
          dataKey="Receita"
          stroke={FORTE}
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--color-surface)" }}
          isAnimationActive={!reduzido}
          animationDuration={900}
          legendType="none"
        />
        <Line
          type="monotone"
          dataKey="Perdido"
          stroke={MEDIO}
          strokeWidth={1.75}
          dot={false}
          activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--color-surface)" }}
          isAnimationActive={!reduzido}
          animationDuration={1100}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/* ---------- Receita por categoria nominal ---------- */

export function ReceitaPorCategoria({
  dados,
  altura = 300,
  chave,
}: {
  dados: { rotulo: string; receita: number; contratos: number; ticket: number | null }[];
  altura?: number;
  chave: string;
}) {
  const reduzido = usePrefereMenosMovimento();
  if (dados.length === 0)
    return <SemDados altura={altura} texto="Nenhum contrato fechado no recorte." />;

  const pontos = dados.map((d) => ({ ...d, Receita: Number(d.receita) }));
  const maior = Math.max(...pontos.map((p) => p.Receita));

  return (
    <ResponsiveContainer width="100%" height={altura}>
      <BarChart
        data={pontos}
        layout="vertical"
        margin={{ top: 4, right: 76, bottom: 4, left: 4 }}
      >

        
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="rotulo"
          {...EIXO}
          tickLine={false}
          axisLine={false}
          width={148}
        />
        <Tooltip
          {...DICA}
          cursor={{ fill: "var(--color-surface-hover)", opacity: 0.5 }}
          formatter={(v) => real(Number(v))}
        />
        <Bar
          dataKey="Receita"
          radius={[0, 4, 4, 0]}
          filter={`url(#halo-${chave})`}
          isAnimationActive={!reduzido}
          animationDuration={800}
          barSize={14}
        >
          {/* Quem lidera vem forte; o resto recua. */}
          {pontos.map((p) => (
            <Cell key={p.rotulo} fill={p.Receita === maior ? FORTE : MEDIO} />
          ))}
          <LabelList
            dataKey="Receita"
            position="right"
            offset={8}
            className="fill-text-secondary"
            fontSize={12}
            formatter={(v: unknown) => realCurto(Number(v))}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ---------- Pipeline em aberto, por etapa (ordinal) ---------- */

export function PipelinePorEtapa({
  dados,
}: {
  dados: { etapa: string; negocios: number; valor: number }[];
}) {
  const reduzido = usePrefereMenosMovimento();
  const pontos = dados.map((d) => ({ ...d, Valor: Number(d.valor) }));
  if (pontos.every((p) => p.Valor === 0 && Number(p.negocios) === 0))
    return <SemDados altura={280} texto="Nada em negociação no recorte." />;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={pontos} margin={{ top: 20, right: 8, bottom: 0, left: 4 }}>

        <CartesianGrid {...GRADE} vertical={false} />
        <XAxis
          dataKey="etapa"
          {...EIXO}
          tickLine={false}
          interval={0}
          height={54}
          angle={-14}
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
          {...DICA}
          cursor={{ fill: "var(--color-surface-hover)", opacity: 0.5 }}
          formatter={(v) => real(Number(v))}
        />
        {/* Etapa tem ordem: rampa de uma matiz na sequência do funil. */}
        <Bar
          dataKey="Valor"
          radius={[4, 4, 0, 0]}
          isAnimationActive={!reduzido}
          animationDuration={800}
        >
          {pontos.map((_, i) => (
            <Cell key={i} fill={RAMPA[Math.min(i, RAMPA.length - 1)]} />
          ))}
          <LabelList
            dataKey="Valor"
            position="top"
            offset={6}
            className="fill-text-secondary"
            fontSize={12}
            formatter={(v: unknown) => (Number(v) > 0 ? realCurto(Number(v)) : "")}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
