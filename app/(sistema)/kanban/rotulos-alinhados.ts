"use client";

import { useEffect, useRef } from "react";

/**
 * Mantém a faixa de rótulos alinhada com o quadro de cartões.
 *
 * ⚠️ Os rótulos saíram de dentro da rolagem dos cartões — antes eram
 * `sticky` lá dentro, e isso quebrava de duas formas ao mesmo tempo:
 * cartão aparecia acima deles na faixa de `padding` do container, e
 * bastava o `main` rolar seus ~41px (o rodapé da D-146, P-049) para o
 * quadro inteiro subir levando os rótulos junto. Rótulo que some quando
 * se rola não é rótulo.
 *
 * Fora da rolagem os dois problemas somem por construção: nada pode
 * passar por cima do que está em outro container, e o `sticky top-0`
 * passa a valer contra o `main`, que é quem de fato rola.
 *
 * O preço é este arquivo — duas faixas separadas precisam concordar em
 * largura:
 *
 * 1. **A barra de rolagem vertical do quadro** ocupa largura real
 *    (12px, fixados por `rolagem-visivel`). A faixa de rótulos não tem
 *    barra nenhuma, então sem compensar ela seria 12px mais larga e as
 *    seis colunas sairiam progressivamente do lugar — 2px na primeira,
 *    12px na última. Medido, e não chutado: `offsetWidth - clientWidth`
 *    dá a largura real da barra naquele navegador, naquele tema.
 *
 * 2. **Abaixo do piso de 160px por coluna** o quadro volta a rolar de
 *    lado (D-148). Aí a faixa precisa andar junto, senão os rótulos
 *    passam a nomear a coluna errada — que é pior do que não ter rótulo.
 *
 * ⚠️ O hook é DONO dos dois refs e os devolve, em vez de recebê-los
 * prontos. Não é estilo: o compilador do React recusa escrever em algo
 * que chegou como argumento de hook (`faixa.style.marginRight = …`), e
 * está certo — quem cria o ref é quem pode mexer nele.
 */
export function useRotulosAlinhados(
  /** Muda quando entram ou saem cartões: é quando a barra vertical
   *  aparece, some ou muda de tamanho. */
  quantidade: number
) {
  const quadro = useRef<HTMLDivElement>(null);
  const rotulos = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const caixa = quadro.current;
    const faixa = rotulos.current;
    if (!caixa || !faixa) return;

    // ⚠️ Arrow, e não `function`: declaração de função é içada, e o
    // TypeScript descarta o estreitamento do `if` acima ao atravessar
    // uma — os dois nós voltariam a ser "possivelmente nulos" num ponto
    // onde já se sabe que não são.
    const ajusta = () => {
      // ⚠️ `marginRight`, e não `paddingRight`: o padding lateral vem das
      // classes (`px-3`) e precisa continuar igual nas duas faixas. A
      // margem encolhe a faixa de rótulos exatamente pela largura que o
      // quadro perde para a barra de rolagem.
      faixa.style.marginRight = `${caixa.offsetWidth - caixa.clientWidth}px`;
      faixa.scrollLeft = caixa.scrollLeft;
    };

    const aoRolar = () => {
      faixa.scrollLeft = caixa.scrollLeft;
    };

    ajusta();
    caixa.addEventListener("scroll", aoRolar, { passive: true });

    // A janela mudando de tamanho muda quem cabe e se a barra existe.
    const observador = new ResizeObserver(ajusta);
    observador.observe(caixa);

    return () => {
      caixa.removeEventListener("scroll", aoRolar);
      observador.disconnect();
    };
  }, [quantidade]);

  return { quadro, rotulos };
}
