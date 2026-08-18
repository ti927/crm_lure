"use client";

import { useSearchParams } from "next/navigation";
import { Download, X } from "lucide-react";
import { temFiltro, parseFiltros } from "./consulta";
import { useFiltrosLista } from "./usar-filtros-lista";

/**
 * Barra de acoes da Lista.
 *
 * O filtro em si mora nos cabecalhos das colunas (B-042) desde que a
 * Lista ganhou filtro por coluna — aqui so sobra o que age sobre o
 * conjunto inteiro: exportar (B-047) e limpar tudo de uma vez.
 */
export function Filtros() {
  const params = useSearchParams();
  const { limpar, pendente } = useFiltrosLista();
  const filtros = parseFiltros(Object.fromEntries(params));
  const ativo = temFiltro(filtros);
  const consulta = params.toString();

  return (
    <div className="flex items-center gap-2" data-pendente={pendente || undefined}>
      <a
        href={consulta ? `/negocios/exportar?${consulta}` : "/negocios/exportar"}
        className="h-control-md border-border text-text-secondary hover:bg-surface-hover hover:text-text inline-flex items-center gap-1.5 rounded-md border px-3 text-sm font-medium"
      >
        <Download className="size-3.5" aria-hidden />
        Exportar CSV
      </a>

      {/* B-044: o mesmo botao de sempre, so que agora limpa filtro de
          qualquer coluna, nao so os que moravam na barra. */}
      {ativo && (
        <button
          type="button"
          onClick={limpar}
          className="h-control-md text-text-secondary hover:bg-surface-hover hover:text-text inline-flex items-center gap-1 rounded-md px-2 text-sm font-medium"
        >
          <X className="size-3.5" aria-hidden />
          Limpar filtros
        </button>
      )}
    </div>
  );
}
