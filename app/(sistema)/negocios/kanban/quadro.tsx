"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { real } from "@/lib/formato";
import { EtiquetaStatus, faixaDaEtapa } from "@/components/dominio/etiquetas";
import { AvatarUsuario } from "@/components/dominio/avatar-usuario";
import { moverNegocio, maisDaEtapa } from "./acoes";
import { ETAPA_DE_DESFECHO, type Desfecho } from "./constantes";
import { DialogoDesfecho } from "./dialogo-desfecho";

export type Cartao = {
  id: string;
  titulo: string;
  valor: number | null;
  status: "parado" | "negociacao" | "ganho" | "perdido";
  organizacao: { nome: string } | null;
  usuario: { nome: string; foto_url: string | null } | null;
};

export type ColunaEtapa = {
  id: string;
  nome: string;
  ordem: number;
  total: number;
  cartoes: Cartao[];
};

const POR_VEZ = 20;

/* ---------- cartao ---------- */

function CartaoNegocio({ c, ordem }: { c: Cartao; ordem: number }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: c.id });

  return (
    <article
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`border-border bg-surface faixa-etapa cursor-grab rounded-md border p-2.5 active:cursor-grabbing ${faixaDaEtapa(
        ordem
      )} ${isDragging ? "opacity-40" : "hover:bg-surface-hover"}`}
    >
      <p className="text-md line-clamp-2 font-medium">{c.titulo}</p>
      <p className="text-text-secondary mt-0.5 truncate text-sm">
        {c.organizacao?.nome ?? "—"}
      </p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="tabular text-sm font-medium">{real(c.valor)}</span>
        <span className="flex items-center gap-1.5">
          <EtiquetaStatus status={c.status} />
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
}: {
  coluna: ColunaEtapa;
  aoCarregarMais: () => void;
  carregando: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: coluna.id });
  const faltam = coluna.total - coluna.cartoes.length;

  return (
    <section className="flex w-72 shrink-0 flex-col">
      {/* O nome da etapa sempre escrito — a cor nunca e o unico sinal
          (Doc 08, B-076). */}
      <header className="border-border flex items-baseline justify-between gap-2 border-b px-1 pb-2">
        <h2 className="text-md font-semibold">{coluna.nome}</h2>
        <span className="text-text-muted tabular text-sm">
          {coluna.total.toLocaleString("pt-BR")}
        </span>
      </header>

      <div
        ref={setNodeRef}
        className={`flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto rounded-md p-1 transition-colors ${
          isOver ? "bg-surface-hover ring-brand-ink ring-1" : ""
        }`}
      >
        {coluna.cartoes.map((c) => (
          <CartaoNegocio key={c.id} c={c} ordem={coluna.ordem} />
        ))}

        {faltam > 0 && (
          <button
            type="button"
            onClick={aoCarregarMais}
            disabled={carregando}
            className="border-border text-text-secondary hover:bg-surface-hover rounded-md border border-dashed py-2 text-sm disabled:opacity-50"
          >
            {carregando
              ? "Carregando…"
              : `Carregar mais ${Math.min(POR_VEZ, faltam)} de ${faltam.toLocaleString("pt-BR")}`}
          </button>
        )}
      </div>
    </section>
  );
}

/* ---------- quadro ---------- */

export function Quadro({
  colunas: iniciais,
  motivos,
}: {
  colunas: ColunaEtapa[];
  motivos: { id: string; nome: string }[];
}) {
  const [colunas, setColunas] = useState(iniciais);
  const [arrastando, setArrastando] = useState<Cartao | null>(null);
  const [carregando, setCarregando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  // Movimento parado a espera do desfecho (D-047).
  const [pendente, setPendente] = useState<{ cartao: Cartao; etapaId: string } | null>(
    null
  );

  // 6px antes de considerar arrasto: sem isso, clicar num cartao vira
  // arrasto acidental e o negocio muda de etapa sem querer.
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
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

    const destino = colunas.find((c) => c.id === destinoId);

    // ⚠️ A trava: nao move enquanto o desfecho nao for declarado.
    if (destino?.nome === ETAPA_DE_DESFECHO) {
      setPendente({ cartao, etapaId: destinoId });
      return;
    }

    void confirmar(cartao, destinoId);
  }

  async function carregarMais(coluna: ColunaEtapa) {
    setCarregando(coluna.id);
    const r = await maisDaEtapa(coluna.id, coluna.cartoes.length, POR_VEZ);
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
        <div className="flex flex-1 gap-4 overflow-x-auto px-4 py-3">
          {colunas.map((c) => (
            <Coluna
              key={c.id}
              coluna={c}
              carregando={carregando === c.id}
              aoCarregarMais={() => void carregarMais(c)}
            />
          ))}
        </div>

        {/* O cartao segue o cursor; o original fica esmaecido no lugar. */}
        <DragOverlay>
          {arrastando && (
            <article className="border-brand-ink bg-surface w-72 rounded-md border p-2.5 shadow-lg">
              <p className="text-md line-clamp-2 font-medium">{arrastando.titulo}</p>
              <p className="text-text-secondary mt-0.5 truncate text-sm">
                {arrastando.organizacao?.nome ?? "—"}
              </p>
            </article>
          )}
        </DragOverlay>
      </DndContext>

      {pendente && (
        <DialogoDesfecho
          titulo={pendente.cartao.titulo}
          motivos={motivos}
          aoCancelar={() => setPendente(null)}
          aoConfirmar={(desfecho) => {
            const { cartao, etapaId } = pendente;
            setPendente(null);
            void confirmar(cartao, etapaId, desfecho);
          }}
        />
      )}
    </>
  );
}
