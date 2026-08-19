import type { ReactNode } from "react";
import { Painel as PainelCliente } from "./grafico-base";

/** Reexporta o painel com gêmeo em tabela, para as páginas de servidor. */
export const Painel = PainelCliente;

/**
 * Cartão de número.
 *
 * ⚠️ Sem `tabular-nums`. Dígito de largura fixa alinha coluna de tabela,
 * mas num número grande e solto deixa vãos — "121" fica frouxo.
 *
 * ⚠️ O realce é uma faixa fina no topo, não a tinta do número. Texto usa
 * tinta de texto: uma cor de série no número troca legibilidade por
 * decoração, e no tema claro o azul fica abaixo do contraste mínimo.
 */
export function CartaoNumero({
  rotulo,
  valor,
  apoio,
  realce,
}: {
  rotulo: string;
  valor: string;
  apoio?: ReactNode;
  realce?: boolean;
}) {
  return (
    <div className="border-border bg-surface relative overflow-hidden rounded-lg border p-4">
      {realce && (
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-0.5"
          style={{ background: "var(--color-dado-forte)" }}
        />
      )}
      <p className="text-text-muted text-xs font-semibold uppercase tracking-caps">
        {rotulo}
      </p>
      <p className="text-text mt-1.5 text-xl font-semibold">{valor}</p>
      {apoio && <p className="text-text-muted mt-1 text-xs">{apoio}</p>}
    </div>
  );
}
