"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useRolagemLateral } from "@/components/dominio/rolagem-lateral";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  defaultDropAnimationSideEffects,
  type DropAnimation,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { real } from "@/lib/formato";
import { EtiquetaStatus, faixaDaEtapa } from "@/components/dominio/etiquetas";
import { AvatarUsuario } from "@/components/dominio/avatar-usuario";
import { moverNegocio, maisDaEtapa } from "./acoes";
import type { Desfecho } from "./constantes";
import type { Cartao, ColunaEtapa } from "./consulta";

const POR_VEZ = 20;

/**
 * Como o cartao pousa quando solto.
 *
 * A curva `elastico` passa do ponto e volta — e o detalhe que faz o
 * movimento parecer ter peso em vez de simplesmente terminar. O original
 * volta ao normal durante o voo, senao o cartao pousaria sobre um vazio.
 */
const AO_SOLTAR: DropAnimation = {
  duration: 260,
  easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: "1" } },
  }),
};

/* ---------- cartao ---------- */

function CartaoNegocio({
  c,
  ordem,
  indice,
}: {
  c: Cartao;
  ordem: number;
  indice: number;
}) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: c.id });

  return (
    <article
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      // O sensor só considera arrasto depois de 6px, então um clique
      // parado chega aqui inteiro e abre o negócio. `de=kanban` marca a
      // origem para o link "voltar" do detalhe apontar para o Kanban, e
      // não para a Lista (padrão de quem entrou por lá).
      onClick={() => !isDragging && router.push(`/negocios/${c.id}?de=kanban`)}
      // Entrada escalonada: a coluna se monta de cima para baixo em vez
      // de aparecer de uma vez. Teto de dez para não virar espera.
      style={{ animationDelay: `${Math.min(indice, 10) * 30}ms` }}
      className={`border-border bg-surface faixa-etapa animate-in fade-in slide-in-from-top-1 fill-mode-backwards cursor-grab rounded-md border p-2 duration-300 active:cursor-grabbing ${faixaDaEtapa(
        ordem
      )} ${
        isDragging
          ? // O original vira um vazio esmaecido; quem tem corpo é a cópia
            // que segue o cursor.
            "scale-[0.97] opacity-30 blur-[1px]"
          : "hover:bg-surface-hover hover:border-border-strong hover:-translate-y-0.5 hover:shadow-md motion-safe:transition-all motion-safe:duration-200"
      }`}
    >
      <p className="line-clamp-2 text-base font-medium leading-snug">{c.titulo}</p>
      <p className="text-text-secondary truncate text-xs">
        {c.organizacao?.nome ?? "—"}
      </p>
      {/* ⚠️ `flex-wrap`: numa coluna estreita, valor + status + avatar
          nem sempre cabem na mesma linha. Sem isto um deles vazaria para
          fora do cartão; com isto a linha quebra e o cartão só fica um
          pouco mais alto. Nada some. */}
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <span className="tabular text-xs font-semibold">{real(c.valor)}</span>
        <span className="flex items-center gap-1.5">
          <EtiquetaStatus status={c.status} compacta />
          {c.usuario && (
            <AvatarUsuario
              nome={c.usuario.nome}
              foto={c.usuario.foto_url}
              tamanho="sm"
            />
          )}
        </span>
      </div>
    </article>
  );
}

/* ---------- coluna ---------- */

function Coluna({
  coluna,
  aoCarregarMais,
  carregando,
  buscando,
}: {
  coluna: ColunaEtapa;
  aoCarregarMais: () => void;
  carregando: boolean;
  buscando: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: coluna.id });
  const faltam = coluna.total - coluna.cartoes.length;

  return (
    // ⚠️ `flex-1 basis-0` no lugar do `w-72 shrink-0` que havia aqui: as
    // seis etapas DIVIDEM a largura disponível em vez de somarem 1.840px
    // e obrigarem a arrastar para o lado para ver as duas últimas — que
    // são justamente onde estão 74% da base.
    //
    // ⚠️ `min-w-40` (160px) é o piso: abaixo disso o cartão deixa de ser
    // legível, e aí é melhor voltar a rolar de lado do que apertar até
    // não dar para ler. Em qualquer tela a partir de ~1.280px as seis
    // colunas cabem inteiras; abaixo, o quadro volta a rolar. O aperto
    // tem limite, e o limite está escrito aqui.
    <section className="flex min-w-40 flex-1 basis-0 flex-col">
      {/* O nome da etapa sempre escrito — a cor nunca e o unico sinal
          (Doc 08, B-076).

          ⚠️ `sticky top-0`: como quem rola na vertical e o QUADRO
          inteiro, e nao cada coluna, sem isto o cabecalho sairia de cena
          na primeira descida e ninguem saberia mais em que etapa esta
          olhando. O fundo solido existe pelo mesmo motivo — sem ele os
          cartoes apareceriam por tras do texto. */}
      <header className="border-border bg-background sticky top-0 z-10 flex items-baseline justify-between gap-1 border-b px-1 pb-1.5">
        {/* `truncate` com `title`: "Apresentação Realizada" não cabe em
            160px, e cortar em silêncio seria perder o nome da etapa. O
            atributo devolve o texto inteiro ao parar o ponteiro em cima. */}
        <h2 className="truncate text-sm font-semibold" title={coluna.nome}>
          {coluna.nome}
        </h2>
        <span className="text-text-muted tabular shrink-0 text-xs">
          {coluna.total.toLocaleString("pt-BR")}
        </span>
      </header>

      {/* ⚠️ SEM `overflow-y-auto` aqui, de proposito. Cada coluna tinha a
          propria barra vertical, e seis barrinhas competindo na mesma
          tela e ruido: para ver o fim de uma coluna era preciso achar a
          barra dela. Agora a coluna cresce ate onde precisa e quem rola
          e o quadro, com UMA barra a direita.

          `min-h-24` volta porque, sem altura propria, a coluna vazia
          nao teria area nenhuma para receber um cartao arrastado. */}
      <div
        ref={setNodeRef}
        className={`flex min-h-24 flex-1 flex-col gap-1.5 rounded-md p-1 motion-safe:transition-colors motion-safe:duration-200 ${
          isOver ? "bg-surface-hover alvo-de-solta" : ""
        }`}
      >
        {coluna.cartoes.map((c, i) => (
          <CartaoNegocio key={c.id} c={c} ordem={coluna.ordem} indice={i} />
        ))}

        {/* Só durante uma busca. Fora dela, etapa vazia é fato comum do
            funil e não precisa de aviso; durante a busca, o vazio É o
            resultado e merece ser dito. */}
        {buscando && coluna.cartoes.length === 0 && (
          <p className="text-text-muted px-1 py-3 text-xs">Nada aqui.</p>
        )}

        {faltam > 0 && (
          <button
            type="button"
            onClick={aoCarregarMais}
            disabled={carregando}
            className="border-border text-text-secondary hover:bg-surface-hover rounded-md border border-dashed py-1.5 text-xs disabled:opacity-50"
          >
            {carregando
              ? "Carregando…"
              : `Mais ${Math.min(POR_VEZ, faltam)} de ${faltam.toLocaleString("pt-BR")}`}
          </button>
        )}
      </div>
    </section>
  );
}

/* ---------- quadro ---------- */

export function Quadro({
  colunas: iniciais,
  responsavelId,
  termo,
}: {
  colunas: ColunaEtapa[];
  responsavelId?: string;
  termo?: string;
}) {
  const quadroRef = useRef<HTMLDivElement>(null);
  useRolagemLateral(quadroRef);

  const [colunas, setColunas] = useState(iniciais);
  const [arrastando, setArrastando] = useState<Cartao | null>(null);
  const [carregando, setCarregando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const buscando = Boolean(termo);
  const vazio = colunas.every((c) => c.total === 0);

  // 6px antes de considerar arrasto: sem isso, clicar num cartao vira
  // arrasto acidental e o negocio muda de etapa sem querer. E o mesmo
  // limiar que deixa o clique passar inteiro para abrir o detalhe.
  //
  // O sensor de teclado nao e enfeite: sem ele, mover negocio de etapa
  // seria impossivel para quem nao usa mouse — espaco pega o cartao,
  // setas escolhem a coluna, espaco solta.
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  );

  const acharCartao = (id: string) =>
    colunas.flatMap((c) => c.cartoes).find((c) => c.id === id) ?? null;

  /** Move na tela antes da resposta do servidor; desfaz se falhar. */
  function moverLocal(cartaoId: string, destinoId: string) {
    setColunas((antes) => {
      const cartao = antes.flatMap((c) => c.cartoes).find((c) => c.id === cartaoId);
      if (!cartao) return antes;

      return antes.map((col) => {
        if (col.cartoes.some((c) => c.id === cartaoId)) {
          return {
            ...col,
            total: col.total - 1,
            cartoes: col.cartoes.filter((c) => c.id !== cartaoId),
          };
        }
        if (col.id === destinoId) {
          return { ...col, total: col.total + 1, cartoes: [cartao, ...col.cartoes] };
        }
        return col;
      });
    });
  }

  async function confirmar(cartao: Cartao, etapaId: string, desfecho?: Desfecho) {
    const origem = colunas.find((c) => c.cartoes.some((x) => x.id === cartao.id));
    moverLocal(cartao.id, etapaId);

    const r = await moverNegocio(cartao.id, etapaId, desfecho);
    if (r?.erro) {
      setErro(r.erro);
      if (origem) moverLocal(cartao.id, origem.id); // desfaz
    }
  }

  function aoSoltar(e: DragEndEvent) {
    setArrastando(null);
    const destinoId = e.over?.id as string | undefined;
    if (!destinoId) return;

    const cartao = acharCartao(e.active.id as string);
    if (!cartao) return;

    const atual = colunas.find((c) => c.cartoes.some((x) => x.id === cartao.id));
    if (!atual || atual.id === destinoId) return;

    // ⚠️ D-145 revogou a D-047: nenhuma etapa trava mais o arrasto.
    // "Aguardando Contrato" e uma espera legitima — contrato em
    // assinatura nao e ganho nem perdido. Declarar o desfecho continua
    // existindo, pelos botoes do topo da ficha do negocio.
    void confirmar(cartao, destinoId);
  }

  async function carregarMais(coluna: ColunaEtapa) {
    setCarregando(coluna.id);
    const r = await maisDaEtapa(
      coluna.id,
      coluna.cartoes.length,
      POR_VEZ,
      responsavelId,
      termo
    );
    setCarregando(null);
    if (r.erro) return setErro(r.erro);

    setColunas((antes) =>
      antes.map((c) =>
        c.id === coluna.id
          ? { ...c, cartoes: [...c.cartoes, ...(r.cartoes as Cartao[])] }
          : c
      )
    );
  }

  return (
    <>
      {erro && (
        <div
          role="alert"
          className="border-danger text-danger-ink mx-4 mt-3 rounded-md border px-3 py-2 text-sm"
        >
          {erro}
        </div>
      )}

      <DndContext
        sensors={sensores}
        onDragStart={(e: DragStartEvent) =>
          setArrastando(acharCartao(e.active.id as string))
        }
        onDragEnd={aoSoltar}
        onDragCancel={() => setArrastando(null)}
      >
        {/* ⚠️ As colunas agora DIVIDEM a largura (`flex-1 basis-0` em cada
            uma) em vez de somarem 288px cada. Em qualquer tela a partir
            de ~1.280px as seis cabem sem rolar de lado.

            `overflow-auto` continua aqui, e não é contradição: abaixo do
            piso de 160px por coluna a rolagem lateral volta, de propósito
            — é a válvula que impede o quadro de apertar até ficar
            ilegível numa janela estreita. Nessa faixa a barra desenhada
            (`rolagem-visivel`) e a roda de lado seguem valendo, porque é
            justamente onde ainda há para onde rolar.

            `items-start` deixaria as colunas com alturas diferentes;
            sem ele elas se esticam até a mais alta, e a coluna curta
            continua sendo um alvo grande para soltar um cartão. */}
        <div
          ref={quadroRef}
          className="rolagem-visivel flex min-h-0 flex-1 gap-2 overflow-auto px-3 py-2"
        >
          {colunas.map((c) => (
            <Coluna
              key={c.id}
              coluna={c}
              carregando={carregando === c.id}
              buscando={buscando}
              aoCarregarMais={() => void carregarMais(c)}
            />
          ))}
        </div>

        {buscando && vazio && (
          <p className="text-text-muted px-4 pb-3 text-sm">
            Nenhum negócio aberto casa com “{termo}”. Ganho e perdido não
            aparecem no funil — procure na Lista.
          </p>
        )}

        {/* O cartao segue o cursor; o original fica esmaecido no lugar.
            A inclinacao de 3 graus e a sombra alta sao o que faz parecer
            que ele saiu do plano da tela, e nao que esta deslizando nele. */}
        <DragOverlay dropAnimation={AO_SOLTAR}>
          {arrastando && (
            <article className="border-brand-ink bg-surface w-48 rotate-3 scale-105 cursor-grabbing rounded-md border-2 p-2 shadow-2xl">
              <p className="line-clamp-2 text-base font-medium leading-snug">
                {arrastando.titulo}
              </p>
              <p className="text-text-secondary truncate text-xs">
                {arrastando.organizacao?.nome ?? "—"}
              </p>
              <p className="tabular mt-1.5 text-xs font-semibold">
                {real(arrastando.valor)}
              </p>
            </article>
          )}
        </DragOverlay>
      </DndContext>
    </>
  );
}
