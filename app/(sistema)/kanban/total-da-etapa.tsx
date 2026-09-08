"use client";

import { Tooltip } from "radix-ui";
import { Sigma } from "lucide-react";
import { real } from "@/lib/formato";
import { detalheDoTotal } from "./consulta";

/**
 * O valor somado de uma coluna do Kanban, numa dica de tela.
 *
 * Pedido da sessão 16, com o Pipedrive como referência: o cabeçalho da
 * etapa mostra quantos negócios existem ali e, ao passar o mouse, quanto
 * eles somam.
 *
 * ⚠️ **O número não é da fatia carregada, é da coluna inteira.** Ele vem
 * de `kanban_coluna` por window function, calculada antes do
 * offset/limit — "Proposta Enviada" mostra 20 cartões e soma os 45.
 * Somar no navegador o que está na tela daria um total menor com toda a
 * aparência de estar certo, e é o pior defeito possível num número.
 *
 * ⚠️ **A contagem "com valor" não é enfeite.** Na base real, Cold Lead
 * tem 141 negócios abertos e 3 com valor preenchido; Proposta Enviada
 * tem 45 e 43. Sem essa linha, a mesma soma de R$ 96.400 pareceria a
 * carteira inteira da etapa quando é o que três cadastros trazem. É a
 * mesma regra da D-161: dois números que não se explicam na mesma tela
 * desacreditam os dois.
 *
 * ⚠️ **Fica no CABEÇALHO, e não na área dos cartões.** O corpo da coluna
 * é alvo de arrasto e cada cartão já tem seu próprio realce no hover —
 * uma dica abrindo ali competiria com o dnd-kit e apareceria sem ser
 * chamada a cada cartão que o cursor cruzasse.
 *
 * ⚠️ O gatilho é `<button>` de propósito (o padrão do Radix, aqui não há
 * link por volta como em `etiqueta-contagem.tsx`): assim ele recebe foco
 * de teclado e a dica abre no `focus`, não só no hover. Dica que só
 * existe no hover não existe para quem navega por teclado — é a lição
 * da C-11 pela porta do teclado em vez da do celular.
 *
 * ⚠️ `Portal`: a dica sai para o fim do `body`. O quadro rola nos dois
 * eixos e a faixa de rótulos tem `overflow-x-hidden` — dentro dela, a
 * dica seria recortada pela própria faixa que a ancora.
 */
export function TotalDaEtapa({
  nome,
  total,
  soma,
  comValor,
  filtrado,
}: {
  /** Nome da etapa, para o cabeçalho da dica e o leitor de tela. */
  nome: string;
  /** Negócios abertos no recorte. É o número que já aparecia aqui. */
  total: number;
  /** Valor somado do recorte inteiro. */
  soma: number;
  /** Quantos deles têm valor diferente de zero. */
  comValor: number;
  /** Há filtro de responsável ou busca em uso? */
  filtrado: boolean;
}) {
  const n = total.toLocaleString("pt-BR");

  const detalhe = detalheDoTotal(total, comValor);

  return (
    <Tooltip.Provider delayDuration={150} skipDelayDuration={300}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            type="button"
            // O clique não leva a lugar nenhum: quem abre a dica é o
            // hover e o foco. O botão existe pelo foco de teclado.
            onClick={(e) => e.preventDefault()}
            aria-label={`${nome}: ${n} ${total === 1 ? "negócio" : "negócios"}, somando ${real(soma)}. ${detalhe}`}
            // Sem anel próprio: o `globals.css` já desenha o contorno de
            // foco em todo `button`, e sobrescrever aqui trocaria um foco
            // que funciona por um `ring-` sem token correspondente.
            className="text-text-muted hover:bg-surface-sunken hover:text-text tabular -mr-1 inline-flex shrink-0 items-center gap-0.5 rounded px-1 text-xs motion-safe:transition-colors"
          >
            {/* O Σ é a única pista de que há algo aqui, e por isso ele
                está sempre visível em vez de aparecer no hover. */}
            <Sigma className="size-3" aria-hidden />
            {n}
          </button>
        </Tooltip.Trigger>

        <Tooltip.Portal>
          <Tooltip.Content
            side="bottom"
            align="end"
            sideOffset={6}
            collisionPadding={8}
            // Tudo aqui já está no `aria-label` do gatilho — anunciar de
            // novo faria o leitor de tela repetir o mesmo texto.
            aria-hidden
            className="border-border bg-surface z-50 rounded-md border shadow-lg
                       data-[state=delayed-open]:animate-in data-[state=closed]:animate-out
                       data-[state=delayed-open]:fade-in-0 data-[state=closed]:fade-out-0
                       data-[state=delayed-open]:zoom-in-95 data-[state=closed]:zoom-out-95
                       data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1
                       duration-150"
          >
            <p className="border-border text-text-muted tracking-caps truncate border-b px-3 py-1.5 text-2xs font-semibold uppercase">
              {nome}
            </p>

            <p className="tabular px-3 pt-2 text-lg font-semibold leading-none">
              {real(soma)}
            </p>

            <p className="text-text-secondary px-3 pb-2 pt-1.5 text-xs">
              {detalhe}
            </p>

            {/* Sem esta linha, o valor menor sob um filtro pareceria a
                soma da etapa inteira — e o usuário concluiria que sumiu
                dinheiro. */}
            {filtrado && (
              <p className="border-border text-text-muted border-t px-3 py-1.5 text-2xs">
                Soma o que o filtro em uso deixa ver.
              </p>
            )}

            <Tooltip.Arrow className="fill-surface" width={10} height={5} />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
