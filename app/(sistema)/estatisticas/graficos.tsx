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
  AMARELO,
  AZUL,
  COR_STATUS,
  DICA,
  EIXO,
  GRADE,
  Halo,
  RECUO,
  RAMPA,
  SemDados,
  VERDE,
  usePrefereMenosMovimento,
} from "./grafico-base";

/**
 * Gráficos da aba Comercial (D-134).
 *
 * ⚠️ Uma matiz só, em duas intensidades. O item que lidera vem forte, o
 * resto recuado — a hierarquia é o que faz a leitura, não a variedade de
 * cor. Uma cor por categoria foi tentada e virou arco-íris sem sentido.
 *
 * ⚠️ Sem eixo de valor nas barras horizontais: o número está escrito na
 * ponta de cada uma. Eixo + rótulo é a mesma informação duas vezes.
 */

const num = (v: unknown) => Number(v).toLocaleString("pt-BR");

/* ---------- Iniciados e ganhos por mês ---------- */

export function SerieMensal({
  dados,
}: {
  dados: { mes: string; iniciados: number; ganhos: number }[];
}) {
  const reduzido = usePrefereMenosMovimento();
  if (dados.length === 0) return <SemDados altura={280} texto="Sem negócios no recorte." />;

  const pontos = dados.map((d) => ({
    rotulo: new Date(`${d.mes}T12:00:00`).toLocaleDateString("pt-BR", {
      month: "short",
      year: "2-digit",
    }),
    Iniciados: Number(d.iniciados),
    Ganhos: Number(d.ganhos),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={pontos} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <defs>
          <Halo id="serie" />
        </defs>
        <CartesianGrid {...GRADE} vertical={false} />
        <XAxis dataKey="rotulo" {...EIXO} tickLine={false} axisLine={false} minTickGap={28} />
        {/* Um eixo só: as duas séries contam a mesma coisa — negócios. */}
        <YAxis {...EIXO} tickLine={false} axisLine={false} width={36} />
        <Tooltip {...DICA} cursor={{ stroke: "var(--color-border)", strokeWidth: 1 }} />
        <Legend
          verticalAlign="top"
          align="right"
          height={28}
          wrapperStyle={{ fontSize: 12, color: "var(--color-text-secondary)" }}
        />

        {/* Iniciados é o contexto; ganhos é o que importa, e vem forte. */}
        <Line
          type="monotone"
          dataKey="Iniciados"
          stroke={RECUO}
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--color-surface)" }}
          isAnimationActive={!reduzido}
          animationDuration={700}
        />
        <Line
          type="monotone"
          dataKey="Ganhos"
          stroke={VERDE}
          strokeWidth={2.25}
          filter="url(#halo-serie)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--color-surface)" }}
          isAnimationActive={!reduzido}
          animationDuration={700}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/* ---------- Barras por categoria ---------- */

export function BarrasCategoria({
  dados,
  altura = 280,
  larguraRotulo = 150,
  formata = num,
  status,
}: {
  dados: { rotulo: string; valor: number }[];
  altura?: number;
  larguraRotulo?: number;
  formata?: (v: unknown) => string;
  /** Quando o eixo é status, a cor SIGNIFICA o estado (Doc 08 §4). */
  status?: boolean;
}) {
  const reduzido = usePrefereMenosMovimento();
  if (dados.length === 0) return <SemDados altura={altura} texto="Sem dados no recorte." />;

  const pontos = dados.map((d) => ({ ...d, Valor: Number(d.valor) }));
  const maior = Math.max(...pontos.map((p) => p.Valor));

  return (
    <ResponsiveContainer width="100%" height={altura}>
      <BarChart
        data={pontos}
        layout="vertical"
        margin={{ top: 0, right: 64, bottom: 0, left: 0 }}
        barCategoryGap="28%"
      >
        <defs>
          <Halo id={`cat-${larguraRotulo}`} />
        </defs>
        {/* Sem grade e sem eixo de valor: o número está na ponta da barra. */}
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="rotulo"
          {...EIXO}
          tickLine={false}
          axisLine={false}
          width={larguraRotulo}
        />
        <Tooltip
          {...DICA}
          cursor={{ fill: "var(--color-surface-hover)", opacity: 0.45 }}
          formatter={(v) => formata(v)}
        />
        <Bar
          dataKey="Valor"
          name="Valor"
          radius={[0, 3, 3, 0]}
          isAnimationActive={!reduzido}
          animationDuration={650}
          barSize={14}
          filter={`url(#halo-cat-${larguraRotulo})`}
        >
          {/* Quem lidera vem forte; o resto recua. É a hierarquia que
              carrega a leitura, não uma cor diferente por linha. */}
          {pontos.map((p) => (
            <Cell
              key={p.rotulo}
              fill={
                status
                  ? COR_STATUS[p.rotulo] ?? AZUL
                  : p.Valor === maior
                    ? AZUL
                    : RECUO
              }
            />
          ))}
          <LabelList
            dataKey="Valor"
            position="right"
            offset={10}
            className="fill-text-secondary"
            fontSize={12}
            formatter={(v: unknown) => formata(v)}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ---------- Lead time por etapa (ordinal) ---------- */

export function LeadTime({
  dados,
}: {
  dados: { etapa: string; passagens: number; dias_medios: number | null }[];
}) {
  const reduzido = usePrefereMenosMovimento();
  if (dados.length === 0) return <SemDados altura={260} texto="Sem passagens no recorte." />;

  const pontos = dados.map((d) => ({
    // Nome curto no eixo: "Apresentação Realizada" inclinado fica ilegível.
    curto: d.etapa.split(" ")[0],
    etapa: d.etapa,
    Dias: Number(d.dias_medios ?? 0),
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={pontos} margin={{ top: 24, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid {...GRADE} vertical={false} />
        <XAxis dataKey="curto" {...EIXO} tickLine={false} axisLine={false} interval={0} />
        <YAxis
          {...EIXO}
          tickLine={false}
          axisLine={false}
          width={40}
          tickFormatter={(v: number) => `${v}d`}
        />
        <Tooltip
          {...DICA}
          cursor={{ fill: "var(--color-surface-hover)", opacity: 0.45 }}
          labelFormatter={(_, p) => p?.[0]?.payload?.etapa ?? ""}
          formatter={(v) => `${num(v)} dias em média`}
        />
        {/* Etapa tem ordem de verdade, então a cor mostra a ordem. */}
        <Bar
          dataKey="Dias"
          name="Dias na etapa"
          radius={[3, 3, 0, 0]}
          isAnimationActive={!reduzido}
          animationDuration={650}
          maxBarSize={56}
        >
          {pontos.map((_, i) => (
            <Cell key={i} fill={RAMPA[Math.min(i, RAMPA.length - 1)]} />
          ))}
          <LabelList
            dataKey="Dias"
            position="top"
            offset={8}
            className="fill-text-secondary"
            fontSize={12}
            formatter={(v: unknown) => `${num(v)}d`}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ---------- Ciclo de venda × taxa de ganho ---------- */

export function CicloDeVenda({
  dados,
}: {
  dados: { faixa: string; negocios: number; ganhos: number; taxa_ganho: number | null }[];
}) {
  const reduzido = usePrefereMenosMovimento();
  if (dados.length === 0) return <SemDados altura={260} texto="Sem desfechos no recorte." />;

  const pontos = dados.map((d) => ({
    faixa: d.faixa,
    Desfechos: Number(d.negocios),
    taxa: Number(d.taxa_ganho ?? 0),
  }));
  const melhor = Math.max(...pontos.map((p) => p.taxa));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={pontos} margin={{ top: 24, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid {...GRADE} vertical={false} />
        <XAxis dataKey="faixa" {...EIXO} tickLine={false} axisLine={false} interval={0} />
        <YAxis {...EIXO} tickLine={false} axisLine={false} width={40} />
        <Tooltip
          {...DICA}
          cursor={{ fill: "var(--color-surface-hover)", opacity: 0.45 }}
          formatter={(v, nome, item) =>
            nome === "Desfechos"
              ? `${num(v)} desfechos · ${item?.payload?.taxa}% ganhos`
              : num(v)
          }
        />
        {/* A faixa com melhor taxa de ganho ganha o amarelo da marca —
            é o que a tela existe para mostrar. Amarelo é fundo, o texto
            do rótulo continua em tinta de texto. */}
        <Bar
          dataKey="Desfechos"
          radius={[3, 3, 0, 0]}
          isAnimationActive={!reduzido}
          animationDuration={650}
          maxBarSize={64}
        >
          {pontos.map((p, i) => (
            <Cell key={i} fill={p.taxa === melhor ? AMARELO : RECUO} />
          ))}
          <LabelList
            dataKey="taxa"
            position="top"
            offset={8}
            className="fill-text-secondary"
            fontSize={12}
            formatter={(v: unknown) => `${v}%`}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
