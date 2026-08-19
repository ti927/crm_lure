"use client";

import dynamic from "next/dynamic";

/**
 * Fronteira que adia o Recharts.
 *
 * ⚠️ O Recharts é a maior dependência do projeto — 8,8 MB em
 * `node_modules`, e o maior pedaço do JavaScript entregue ao navegador.
 * Sem isto ele entra no HTML de todo mundo que abre o painel, e é
 * renderizado no servidor também, sem necessidade: gráfico não precisa
 * chegar pintado no primeiro byte.
 *
 * `ssr: false` exige um componente de cliente — daí este arquivo existir
 * só para ser essa fronteira. O resto da página segue componente de
 * servidor, buscando os dados como antes.
 *
 * ⚠️ O `loading` reserva a MESMA altura do gráfico. Sem isso o conteúdo
 * abaixo salta quando o gráfico chega — e um esqueleto que pisca a cada
 * troca de filtro é pior que espera nenhuma.
 */

function Espera({ altura }: { altura: number }) {
  return (
    <div
      aria-hidden
      className="bg-surface-sunken animate-pulse rounded-md"
      style={{ height: altura }}
    />
  );
}

export const SerieMensal = dynamic(
  () => import("./graficos").then((m) => m.SerieMensal),
  { ssr: false, loading: () => <Espera altura={280} /> }
);

export const BarrasCategoria = dynamic(
  () => import("./graficos").then((m) => m.BarrasCategoria),
  { ssr: false, loading: () => <Espera altura={280} /> }
);

export const CicloDeVenda = dynamic(
  () => import("./graficos").then((m) => m.CicloDeVenda),
  { ssr: false, loading: () => <Espera altura={260} /> }
);

export const LeadTime = dynamic(
  () => import("./graficos").then((m) => m.LeadTime),
  { ssr: false, loading: () => <Espera altura={260} /> }
);

export const ReceitaNoTempo = dynamic(
  () => import("./financeiro/graficos-neon").then((m) => m.ReceitaNoTempo),
  { ssr: false, loading: () => <Espera altura={320} /> }
);

export const ReceitaPorCategoria = dynamic(
  () => import("./financeiro/graficos-neon").then((m) => m.ReceitaPorCategoria),
  { ssr: false, loading: () => <Espera altura={280} /> }
);

export const PipelinePorEtapa = dynamic(
  () => import("./financeiro/graficos-neon").then((m) => m.PipelinePorEtapa),
  { ssr: false, loading: () => <Espera altura={260} /> }
);
