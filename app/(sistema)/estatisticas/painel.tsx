import type { ReactNode } from "react";

/*
 * ⚠️ Este arquivo NAO reexporta o `Painel`.
 *
 * Ele fazia isso — `import { Painel } from "./grafico-base"; export const
 * Painel = Painel;` — e derrubava a rota inteira em producao com "server
 * error", passando em desenvolvimento. Num modulo de SERVIDOR, importar
 * de um modulo "use client" devolve uma REFERENCIA de cliente, nao o
 * componente; reatribui-la a um `const` e reexportar quebra o vinculo com
 * o modulo, e o renderizador nao sabe mais o que instanciar.
 *
 * As paginas importam o `Painel` direto de `./grafico-base`. Aqui fica so
 * o que e de servidor mesmo.
 */

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
