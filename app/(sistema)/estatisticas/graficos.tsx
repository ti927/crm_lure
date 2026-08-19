"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Brilho,
  COR_STATUS,
  DICA,
  EIXO,
  RAMPA,
  SERIE_1,
  SERIE_2,
  SemDados,
  slotDaCategoria,
  usePrefereMenosMovimento,
} from "./grafico-base";

/**
 * Gráficos da aba Comercial (D-133).
 *
 * ⚠️ O que mudou em relação à primeira versão, e por quê:
 *
 *   · **Saiu o eixo duplo.** Contagem e valor tinham escalas próprias no
 *     mesmo gráfico — o alinhamento entre duas escalas é arbitrário, e o
 *     desenho inventa uma correlação que o dado não tem. Contagem fica
 *     aqui; valor mora na aba Financeiro.
 *   · **Categoria nominal usa uma cor.** Antes cada barra pegava um hex
 *     pelo índice: a cor trocava de dono quando o filtro mudava a ordem,
 *     e repetia em cor o que o comprimento já dizia.
 *   · **Etapa usa a rampa ordinal**, porque etapa tem ordem de verdade.
 */

const num = (v: unknown) => Number(v).toLocaleString("pt-BR");

/* ---------- Indicador 5: iniciados e ganhos por mês ---------- */

export function SerieMensal({
  dados,
}: {
  dados: { mes: string; iniciados: number; ganhos: number }[];
}) {
  const reduzido = usePrefereMenosMovimento();
  if (dados.length === 0) return <SemDados altura={300} texto="Sem negócios no recorte." />;

  const pontos = dados.map((d) => ({
    rotulo: new Date(`${d.mes}T12:00:00`).toLocaleDateString("pt-BR", {
      month: "short",
      year: "2-digit",
    }),
    Iniciados: Number(d.iniciados),
    Ganhos: Number(d.ganhos),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={pontos} margin={{ top: 12, right: 12, bottom: 0, left: 4 }}>
        <defs>
          <Brilho id="ini" cor={SERIE_1} />
          <Brilho id="gan" cor={SERIE_2} />
        </defs>

        <CartesianGrid stroke="var(--color-border)" vertical={false} opacity={0.6} />
        <XAxis dataKey="rotulo" {...EIXO} tickLine={false} minTickGap={24} />
        {/* Um eixo só: as duas séries contam a mesma coisa — negócios. */}
        <YAxis {...EIXO} tickLine={false} axisLine={false} width={40} />
        <Tooltip {...DICA} cursor={{ stroke: "var(--color-border)", strokeWidth: 2 }} />
        <Legend wrapperStyle={{ fontSize: 12, color: "var(--color-text-secondary)" }} />

        <Line
          type="monotone"
          dataKey="Iniciados"
          stroke={SERIE_1}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--color-surface)" }}
          filter="url(#halo-ini)"
          isAnimationActive={!reduzido}
          animationDuration={800}
        />
        <Line
          type="monotone"
          dataKey="Ganhos"
          stroke={SERIE_2}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--color-surface)" }}
          filter="url(#halo-gan)"
          isAnimationActive={!reduzido}
          animationDuration={800}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/* ---------- Indicadores 10 a 13: categoria nominal ---------- */

export function BarrasCategoria({
  dados,
  altura = 300,
  chave,
  status,
}: {
  dados: { rotulo: string; negocios: number }[];
  altura?: number;
  chave: string;
  /** Quando o eixo é status, a cor SIGNIFICA o estado (Doc 08 §4). */
  status?: boolean;
}) {
  const reduzido = usePrefereMenosMovimento();
  if (dados.length === 0) return <SemDados altura={altura} texto="Sem dados no recorte." />;

  const pontos = dados.map((d) => ({ ...d, Negócios: Number(d.negocios) }));

  return (
    <ResponsiveContainer width="100%" height={altura}>
      <BarChart
        data={pontos}
        layout="vertical"
        margin={{ top: 4, right: 52, bottom: 4, left: 4 }}
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
          formatter={(v) => num(v)}
        />
        {/* Rótulo direto na ponta: o valor não fica refém da dica de
            contexto, e o eixo X some — a barra já é a escala. */}
        <Bar
          dataKey="Negócios"
          radius={[0, 4, 4, 0]}
          filter={`url(#halo-${chave})`}
          isAnimationActive={!reduzido}
          animationDuration={700}
          barSize={18}
        >
          {/* Cor presa ao nome da categoria, nunca à ordem da lista. */}
          {pontos.map((p) => (
            <Cell
              key={p.rotulo}
              fill={status ? COR_STATUS[p.rotulo] ?? SERIE_1 : slotDaCategoria(p.rotulo)}
            />
          ))}
          <LabelList
            dataKey="Negócios"
            position="right"
            offset={8}
            className="fill-text-secondary"
            fontSize={12}
            formatter={(v: unknown) => num(v)}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ---------- Indicador 8: lead time por etapa (ordinal) ---------- */

export function LeadTime({
  dados,
}: {
  dados: { etapa: string; passagens: number; dias_medios: number | null }[];
}) {
  const reduzido = usePrefereMenosMovimento();
  if (dados.length === 0) return <SemDados altura={280} texto="Sem passagens no recorte." />;

  const pontos = dados.map((d) => ({ ...d, Dias: Number(d.dias_medios ?? 0) }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={pontos} margin={{ top: 20, right: 8, bottom: 0, left: 4 }}>
        <defs>
          <Brilho id="lead" cor={SERIE_1} />
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
          width={40}
          tickFormatter={(v: number) => `${v}d`}
        />
        <Tooltip
          {...DICA}
          cursor={{ fill: "var(--color-surface-hover)", opacity: 0.5 }}
          formatter={(v) => `${Number(v).toLocaleString("pt-BR")} dias em média`}
        />
        {/* Etapa tem ordem, então a cor mostra a ordem: rampa de uma
            matiz, do escuro ao claro, na sequência do funil. */}
        <Bar
          dataKey="Dias"
          radius={[4, 4, 0, 0]}
          filter="url(#halo-lead)"
          isAnimationActive={!reduzido}
          animationDuration={700}
        >
          {pontos.map((_, i) => (
            <Cell key={i} fill={RAMPA[Math.min(i, RAMPA.length - 1)]} />
          ))}
          <LabelList
            dataKey="Dias"
            position="top"
            offset={6}
            className="fill-text-secondary"
            fontSize={12}
            formatter={(v: unknown) => `${Number(v).toLocaleString("pt-BR")}d`}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
