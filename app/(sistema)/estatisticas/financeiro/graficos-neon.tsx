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
  Brilho,
  DICA,
  EIXO,
  RAMPA,
  SERIE_1,
  SERIE_2,
  SemDados,
  usePrefereMenosMovimento,
} from "../grafico-base";

/**
 * Gráficos do relatório financeiro (D-132, revisto pela D-133).
 *
 * ⚠️ As matizes saem do validador de paleta, não do gosto. O efeito neon
 * é o halo e o gradiente — cor mais clara reprova na banda de
 * luminosidade e passa a dar glare em vez de brilho.
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
        <defs>
          <Brilho id="rec" cor={SERIE_1} />
          <Brilho id="perd" cor={SERIE_2} />
        </defs>

        <CartesianGrid stroke="var(--color-border)" vertical={false} opacity={0.6} />
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
          fill="url(#area-rec)"
          isAnimationActive={!reduzido}
          animationDuration={900}
          legendType="none"
        />
        <Line
          type="monotone"
          dataKey="Receita"
          stroke={SERIE_1}
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--color-surface)" }}
          filter="url(#halo-rec)"
          isAnimationActive={!reduzido}
          animationDuration={900}
          legendType="none"
        />
        <Line
          type="monotone"
          dataKey="Perdido"
          stroke={SERIE_2}
          strokeWidth={1.75}
          dot={false}
          activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--color-surface)" }}
          filter="url(#halo-perd)"
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

  return (
    <ResponsiveContainer width="100%" height={altura}>
      <BarChart
        data={pontos}
        layout="vertical"
        margin={{ top: 4, right: 76, bottom: 4, left: 4 }}
      >
        <defs>
          <Brilho id={chave} cor={SERIE_1} />
        </defs>

        <CartesianGrid stroke="var(--color-border)" horizontal={false} opacity={0.5} />
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
        {/* Categoria nominal: uma cor para todas as barras. O comprimento
            já mostra a magnitude — colorir por valor gastaria o canal de
            identidade repetindo a mesma informação. */}
        <Bar
          dataKey="Receita"
          radius={[0, 4, 4, 0]}
          fill={`url(#horizontal-${chave})`}
          filter={`url(#halo-${chave})`}
          isAnimationActive={!reduzido}
          animationDuration={800}
          barSize={18}
        >
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
        <defs>
          <Brilho id="pipe" cor={SERIE_1} />
        </defs>

        <CartesianGrid stroke="var(--color-border)" vertical={false} opacity={0.6} />
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
          filter="url(#halo-pipe)"
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
