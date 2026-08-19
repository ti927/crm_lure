"use client";

import { useId, useState, useSyncExternalStore, type ReactNode } from "react";
import { Table2, ChartColumn } from "lucide-react";

/**
 * Peças comuns dos gráficos das duas abas (D-133).
 *
 * ⚠️ O que está aqui não é preferência estética — saiu do validador de
 * paleta e do catálogo de anti-padrões:
 *
 *   · O brilho neon é HALO, não cor mais clara. As matizes ficam dentro
 *     da banda de luminosidade; o que reluz é o filtro.
 *   · Categoria nominal (vendedor, origem, cliente) usa UMA cor. Colorir
 *     cada barra de um jeito re-codifica em cor o que o comprimento já
 *     mostra, e faz a cor trocar de dono quando o filtro muda a ordem.
 *   · Só o que tem ordem de verdade — etapa de funil, lead time — usa a
 *     rampa ordinal.
 *   · Todo gráfico tem gêmeo em tabela. Dica de contexto não pode ser o
 *     único jeito de ler um número.
 */

const MENOS_MOVIMENTO = "(prefers-reduced-motion: reduce)";

/**
 * `prefers-reduced-motion` (D-116). A guarda global do `globals.css` não
 * alcança animação de SVG feita em JavaScript pelo Recharts, então ela é
 * lida aqui. `useSyncExternalStore` e não efeito: assinar por efeito
 * deixaria a primeira pintura animando antes de desligar, que é
 * exatamente o que a preferência quer evitar.
 */
export function usePrefereMenosMovimento() {
  return useSyncExternalStore(
    (aoMudar) => {
      const consulta = window.matchMedia(MENOS_MOVIMENTO);
      consulta.addEventListener("change", aoMudar);
      return () => consulta.removeEventListener("change", aoMudar);
    },
    () => window.matchMedia(MENOS_MOVIMENTO).matches,
    () => true
  );
}

/** A rampa ordinal, do escuro ao claro. Só para dimensões com ordem. */
export const RAMPA = [
  "var(--color-rampa-1)",
  "var(--color-rampa-2)",
  "var(--color-rampa-3)",
  "var(--color-rampa-4)",
  "var(--color-rampa-5)",
  "var(--color-rampa-6)",
];

export const SERIE_1 = "var(--color-serie-1)";
export const SERIE_2 = "var(--color-serie-2)";

/**
 * Halo neon + gradientes. `id` único por instância — `id` repetido no
 * documento faz o navegador aplicar o primeiro que achar, e um gráfico
 * rouba o brilho do outro.
 */
export function Brilho({ id, cor }: { id: string; cor: string }) {
  return (
    <>
      <filter id={`halo-${id}`} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="var(--neon-desfoque)" result="borrado" />
        <feComponentTransfer in="borrado" result="halo">
          <feFuncA type="linear" slope="var(--neon-halo)" />
        </feComponentTransfer>
        <feMerge>
          <feMergeNode in="halo" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      <linearGradient id={`area-${id}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={cor} stopOpacity={0.5} />
        <stop offset="100%" stopColor={cor} stopOpacity={0.02} />
      </linearGradient>

      <linearGradient id={`vertical-${id}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={cor} stopOpacity={1} />
        <stop offset="100%" stopColor={cor} stopOpacity={0.4} />
      </linearGradient>

      <linearGradient id={`horizontal-${id}`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor={cor} stopOpacity={0.4} />
        <stop offset="100%" stopColor={cor} stopOpacity={1} />
      </linearGradient>
    </>
  );
}

/** Eixos recessivos: a grade fica uma sombra abaixo da superfície. */
export const EIXO = { stroke: "var(--color-text-muted)", fontSize: 12 } as const;

/**
 * Dica de contexto no tema do sistema.
 *
 * ⚠️ O tema escuro vinha quebrado: `contentStyle` pinta a caixa, mas o
 * rótulo e os itens do Recharts têm cor própria embutida — o rótulo saía
 * preto sobre fundo escuro. Precisa de `labelStyle` e `itemStyle`
 * também, e de `wrapperStyle` para tirar o contorno branco padrão.
 */
export const DICA = {
  contentStyle: {
    backgroundColor: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: 8,
    padding: "8px 10px",
    boxShadow: "0 8px 24px rgb(0 0 0 / 0.28)",
  },
  labelStyle: { color: "var(--color-text)", fontWeight: 600, marginBottom: 2 },
  itemStyle: { color: "var(--color-text-secondary)", padding: 0 },
  wrapperStyle: { outline: "none" },
} as const;

/** Espera vazia, com a altura do gráfico para a tela não pular. */
export function SemDados({ altura, texto }: { altura: number; texto: string }) {
  return (
    <div
      className="text-text-muted flex items-center justify-center text-sm"
      style={{ height: altura }}
    >
      {texto}
    </div>
  );
}

/**
 * Envelope de gráfico com o gêmeo em tabela.
 *
 * ⚠️ Requisito de acessibilidade, não enfeite: dica de contexto não pode
 * ser o único caminho para um número. Quem usa leitor de tela, quem
 * imprime e quem não distingue as cores precisam da tabela.
 */
export function Painel({
  titulo,
  apoio,
  colunas,
  linhas,
  children,
}: {
  titulo: string;
  apoio?: string;
  colunas?: string[];
  linhas?: (string | number)[][];
  children: ReactNode;
}) {
  const [tabela, setTabela] = useState(false);
  const id = useId();
  const temTabela = Boolean(colunas?.length && linhas?.length);

  return (
    <section className="border-border bg-surface rounded-lg border p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={`t${id}`} className="text-md font-semibold">
            {titulo}
          </h2>
          {apoio && <p className="text-text-muted text-sm">{apoio}</p>}
        </div>

        {temTabela && (
          <button
            type="button"
            onClick={() => setTabela((v) => !v)}
            aria-pressed={tabela}
            title={tabela ? "Ver como gráfico" : "Ver como tabela"}
            className="text-text-muted hover:bg-surface-hover hover:text-text shrink-0 rounded-md p-1.5"
          >
            {tabela ? (
              <ChartColumn className="size-4" aria-hidden />
            ) : (
              <Table2 className="size-4" aria-hidden />
            )}
            <span className="sr-only">
              {tabela ? "Ver como gráfico" : "Ver como tabela"}
            </span>
          </button>
        )}
      </div>

      {tabela && temTabela ? (
        <div className="max-h-80 overflow-auto">
          <table className="w-full text-md" aria-labelledby={`t${id}`}>
            <thead className="bg-surface sticky top-0">
              <tr className="border-border text-text-muted border-b text-left text-xs uppercase tracking-caps">
                {colunas!.map((c, i) => (
                  <th key={c} className={`h-8 px-2 font-semibold ${i > 0 ? "text-right" : ""}`}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhas!.map((l, i) => (
                <tr key={i} className="border-border border-b last:border-0">
                  {l.map((v, j) => (
                    <td
                      key={j}
                      className={`h-9 px-2 ${j > 0 ? "text-right tabular" : "truncate"}`}
                    >
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </section>
  );
}
