import Link from "next/link";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { IrParaPagina } from "./ir-para-pagina";

/**
 * Paginação com números, extremos e campo para digitar a página.
 *
 * ⚠️ Substitui o par "Anterior / Próxima", que obrigava a clicar 26 vezes
 * para chegar ao fim de 27 páginas. Com 50 páginas de negócios e 34 de
 * organizações, o custo de navegar deixou de ser desprezível.
 *
 * ⚠️ **Componente de SERVIDOR, e os números são links de verdade.** É o
 * que dá ctrl+clique, botão do meio e "abrir em nova aba" de graça — e o
 * que evita mandar uma função para o cliente montar endereço, que é a
 * fronteira que já derrubou este sistema três vezes (C-06, C-09, C-10).
 * Só o campo de digitar é cliente, e ele recebe **strings**.
 */
export function Paginacao({
  pagina,
  ultima,
  caminho,
  consulta,
  paramPagina = "pagina",
}: {
  pagina: number;
  ultima: number;
  /** Rota base, sem query. Ex.: "/negocios". */
  caminho: string;
  /** Querystring atual, já sem o parâmetro de página. */
  consulta: string;
  paramPagina?: string;
}) {
  if (ultima <= 1) return null;

  const href = (n: number) => {
    const p = new URLSearchParams(consulta);
    if (n > 1) p.set(paramPagina, String(n));
    else p.delete(paramPagina);
    const s = p.toString();
    return s ? `${caminho}?${s}` : caminho;
  };

  return (
    <nav
      aria-label="Paginação"
      className="flex flex-wrap items-center justify-center gap-1"
    >
      <Extremo href={href(1)} desabilitado={pagina <= 1} rotulo="Primeira página">
        <ChevronsLeft className="size-3.5" aria-hidden />
      </Extremo>
      <Extremo href={href(pagina - 1)} desabilitado={pagina <= 1} rotulo="Página anterior">
        <ChevronLeft className="size-3.5" aria-hidden />
      </Extremo>

      {janela(pagina, ultima).map((n, i) =>
        n === null ? (
          <span key={`x${i}`} className="text-text-muted px-1 text-sm" aria-hidden>
            …
          </span>
        ) : (
          <Link
            key={n}
            href={href(n)}
            aria-label={`Página ${n}`}
            aria-current={n === pagina ? "page" : undefined}
            className={`h-control-sm tabular inline-flex min-w-8 items-center justify-center rounded-md px-2 text-sm ${
              n === pagina
                ? "bg-brand text-brand-on font-bold"
                : "border-border hover:bg-surface-hover border font-medium"
            }`}
          >
            {n}
          </Link>
        )
      )}

      <Extremo
        href={href(pagina + 1)}
        desabilitado={pagina >= ultima}
        rotulo="Próxima página"
      >
        <ChevronRight className="size-3.5" aria-hidden />
      </Extremo>
      <Extremo href={href(ultima)} desabilitado={pagina >= ultima} rotulo="Última página">
        <ChevronsRight className="size-3.5" aria-hidden />
      </Extremo>

      <IrParaPagina
        ultima={ultima}
        caminho={caminho}
        consulta={consulta}
        paramPagina={paramPagina}
      />
    </nav>
  );
}

/**
 * Quais números aparecem: os extremos, os vizinhos da atual, e "…" no
 * lugar do resto.
 *
 * ⚠️ Largura FIXA — sempre as mesmas posições ocupadas. Uma janela que
 * cresce e encolhe faz os botões dançarem sob o ponteiro entre um clique
 * e o seguinte, que é como se erra a página numa lista de 50.
 */
function janela(atual: number, ultima: number): (number | null)[] {
  if (ultima <= 7) return Array.from({ length: ultima }, (_, i) => i + 1);

  const meio = Math.min(Math.max(atual, 3), ultima - 2);
  const nums = new Set([1, meio - 1, meio, meio + 1, ultima]);
  const ordenados = [...nums].filter((n) => n >= 1 && n <= ultima).sort((a, b) => a - b);

  const saida: (number | null)[] = [];
  let anterior = 0;
  for (const n of ordenados) {
    if (anterior && n - anterior > 1) saida.push(null);
    saida.push(n);
    anterior = n;
  }
  return saida;
}

function Extremo({
  href,
  desabilitado,
  rotulo,
  children,
}: {
  href: string;
  desabilitado: boolean;
  rotulo: string;
  children: React.ReactNode;
}) {
  const classe =
    "h-control-sm border-border inline-flex items-center justify-center rounded-md border px-1.5";
  // Desabilitado vira `<span>`: link que não leva a lugar nenhum é o
  // defeito que a navegação lateral já evita neste projeto (D-096).
  if (desabilitado) {
    return (
      <span className={`${classe} text-text-muted opacity-40`} aria-hidden>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} aria-label={rotulo} className={`${classe} hover:bg-surface-hover`}>
      {children}
    </Link>
  );
}
