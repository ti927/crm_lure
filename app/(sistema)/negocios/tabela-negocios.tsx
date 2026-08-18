"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

/** D-090: 44px em qualquer tema — mesma medida do token `--row-h-cozy`. */
const ALTURA_LINHA = 44;

/**
 * Lista virtualizada (R-006, Doc 10 §F3): a paginacao no servidor ja
 * limita a 50 linhas por vez, mas so a virtualizacao evita montar as 50
 * de uma vez no DOM — cada `<tr>` fora da janela visivel nem existe,
 * so duas linhas-espacadoras marcam o espaco que ele ocuparia.
 *
 * As linhas chegam prontas (Server Components), nao uma funcao de
 * renderizacao: o corpo de cada `<tr>` usa dado que so o servidor tem
 * (formatacao, joins), e passar arvore ja renderizada por prop e o jeito
 * de um componente cliente hospedar JSX de servidor sem vira-lo cliente
 * tambem.
 */
export function TabelaNegocios({
  cabecalho,
  linhas,
}: {
  cabecalho: ReactNode;
  linhas: ReactNode[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Toda troca de filtro, ordenacao ou pagina chega aqui como um `linhas`
  // novo (o servidor renderizou de novo). Sem isto, uma lista curta
  // depois de um filtro herdaria a posicao de rolagem da lista longa de
  // antes — a tela ficaria em branco ou pulando para o fim sem motivo.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [linhas]);

  const virtualizador = useVirtualizer({
    count: linhas.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ALTURA_LINHA,
    overscan: 10,
  });

  const itens = virtualizador.getVirtualItems();
  const alturaTotal = virtualizador.getTotalSize();
  const topo = itens[0]?.start ?? 0;
  const fundo = alturaTotal - (itens[itens.length - 1]?.end ?? 0);

  return (
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto">
      <table className="w-full border-collapse text-base">
        {cabecalho}
        <tbody>
          {topo > 0 && (
            <tr aria-hidden="true">
              <td style={{ height: topo, padding: 0, border: 0 }} />
            </tr>
          )}
          {itens.map((item) => linhas[item.index])}
          {fundo > 0 && (
            <tr aria-hidden="true">
              <td style={{ height: fundo, padding: 0, border: 0 }} />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
