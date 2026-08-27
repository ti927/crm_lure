"use client";

import { Tooltip } from "radix-ui";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Ícone + número, com a lista por trás numa dica de tela.
 *
 * ⚠️ **O número é a informação; a dica é o detalhe.** A lista de
 * organizações é a mesma no computador e no celular (D-121), e no celular
 * não existe hover — então a dica não pode carregar nada que só exista
 * ali. É a regra que a C-11 deixou: affordance só no hover não existe
 * para metade do sistema. O que a dica mostra também está inteiro na
 * ficha da organização, a um clique da mesma linha.
 *
 * ⚠️ O gatilho é um `<span>`, e não o `<button>` que o Radix põe por
 * padrão: a linha inteira já é um `<a>`, e botão dentro de link é HTML
 * inválido. Em troca, a etiqueta não recebe foco de teclado — por isso o
 * `aria-label` diz o número por extenso, que é o que um leitor de tela
 * precisa, e a dica fica marcada como decorativa.
 *
 * ⚠️ `Portal`: a dica sai para o fim do `body`, fora de qualquer
 * `overflow` ou pilha de empilhamento local. É o mesmo motivo pelo qual o
 * seletor de responsável virou Popover do Radix — não há número de
 * `z-index` para acertar contra o resto da tela.
 */
export function EtiquetaContagem({
  icone: Icone,
  n,
  rotulo,
  titulo,
  itens,
  rodape,
  vazio,
}: {
  icone: LucideIcon;
  n: number;
  /** Nome no plural, para o leitor de tela: "pessoas vinculadas". */
  rotulo: string;
  /** Cabeçalho da dica. */
  titulo: string;
  /** A amostra. Vem pronta do servidor, já limitada. */
  itens: ReactNode[];
  /** Linha de baixo: "+4 não mostradas", "2 pendentes". */
  rodape?: string;
  /** Texto quando não há nada. */
  vazio: string;
}) {
  return (
    <Tooltip.Provider delayDuration={150} skipDelayDuration={300}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <span
            aria-label={`${n} ${rotulo}`}
            className={`tabular inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-sm motion-safe:transition-colors ${
              n > 0
                ? "text-text-secondary hover:bg-surface-sunken hover:text-text"
                : "text-text-muted/50"
            }`}
          >
            <Icone className="size-3.5" aria-hidden />
            {n.toLocaleString("pt-BR")}
          </span>
        </Tooltip.Trigger>

        <Tooltip.Portal>
          <Tooltip.Content
            side="top"
            align="end"
            sideOffset={6}
            collisionPadding={8}
            // A dica é reforço do número que já está na tela: nada aqui é
            // exclusivo, então ela não precisa ser anunciada duas vezes.
            aria-hidden
            className="border-border bg-surface z-50 max-w-[20rem] rounded-md border p-0 shadow-lg
                       data-[state=delayed-open]:animate-in data-[state=closed]:animate-out
                       data-[state=delayed-open]:fade-in-0 data-[state=closed]:fade-out-0
                       data-[state=delayed-open]:zoom-in-95 data-[state=closed]:zoom-out-95
                       data-[side=top]:slide-in-from-bottom-1 data-[side=bottom]:slide-in-from-top-1
                       duration-150"
          >
            <p className="border-border text-text-muted tracking-caps border-b px-3 py-1.5 text-2xs font-semibold uppercase">
              {titulo}
            </p>

            {itens.length === 0 ? (
              <p className="text-text-muted px-3 py-2 text-sm">{vazio}</p>
            ) : (
              <ul className="flex flex-col gap-1 px-3 py-2">
                {itens.map((item, i) => (
                  <li key={i} className="text-md flex min-w-0 items-center gap-2">
                    {item}
                  </li>
                ))}
              </ul>
            )}

            {rodape && (
              <p className="border-border text-text-muted border-t px-3 py-1.5 text-xs">
                {rodape}
              </p>
            )}

            {/* A seta usa a MESMA cor do corpo; sem isso ela vira um
                triângulo branco sobre o painel no tema escuro. */}
            <Tooltip.Arrow className="fill-surface" width={10} height={5} />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
