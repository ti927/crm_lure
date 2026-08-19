"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRightLeft,
  CircleDollarSign,
  UserRound,
  Flag,
  MessageSquare,
  CalendarCheck,
  CalendarPlus,
  Trash2,
} from "lucide-react";
import { real, dataHora } from "@/lib/formato";
import { AvatarUsuario } from "@/components/dominio/avatar-usuario";
import { DialogoAtividade } from "@/app/(sistema)/atividades/dialogo-atividade";
import { criarAnotacao, excluirAnotacao } from "./acoes";

export type ItemTempo = {
  id: string;
  natureza: "sistema" | "usuario";
  tipo: string;
  quando: string;
  autor: string | null;
  foto: string | null;
  de?: string | null;
  para?: string | null;
  texto?: string;
  concluida?: boolean;
  daCarga?: boolean;
  anotacaoId?: string;
};

/** Seletor de tres posicoes (D-058, B-052). */
const FILTROS = [
  { chave: "tudo", rotulo: "Tudo" },
  { chave: "usuario", rotulo: "Usuário" },
  { chave: "sistema", rotulo: "Sistema" },
] as const;

const ICONE: Record<string, typeof Flag> = {
  etapa: ArrowRightLeft,
  valor: CircleDollarSign,
  responsavel: UserRound,
  status: Flag,
  anotacao: MessageSquare,
  atividade: CalendarCheck,
};

export function ZonaTempo({
  negocioId,
  titulo,
  itens,
  tipos,
  usuarios,
}: {
  negocioId: string;
  titulo: string;
  itens: ItemTempo[];
  tipos: { id: string; nome: string }[];
  usuarios: { id: string; nome: string }[];
}) {
  const router = useRouter();
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]["chave"]>("tudo");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [agendando, setAgendando] = useState(false);

  const visiveis =
    filtro === "tudo" ? itens : itens.filter((i) => i.natureza === filtro);

  async function escrever(form: HTMLFormElement) {
    const texto = String(new FormData(form).get("texto") ?? "");
    if (!texto.trim()) return;

    setEnviando(true);
    const r = await criarAnotacao(negocioId, texto);
    setEnviando(false);
    if (r?.erro) return setErro(r.erro);
    form.reset();
  }

  return (
    <section aria-label="Linha do tempo" className="bg-background flex min-w-0 flex-col">
      <div className="border-border flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2.5">
        <h2 className="text-text-muted text-xs font-semibold uppercase tracking-caps">
          Linha do tempo
        </h2>

        <div
          role="group"
          aria-label="Filtrar a linha do tempo"
          className="border-border bg-surface-sunken inline-flex rounded-md border p-0.5"
        >
          {FILTROS.map((f) => (
            <button
              key={f.chave}
              type="button"
              onClick={() => setFiltro(f.chave)}
              aria-pressed={filtro === f.chave}
              className={`rounded px-2.5 py-1 text-sm font-medium transition-all duration-150 ${
                filtro === f.chave
                  ? "bg-surface text-text shadow-sm"
                  : "text-text-secondary hover:text-text"
              }`}
            >
              {f.rotulo}
            </button>
          ))}
        </div>
      </div>

      {/* ⚠️ Abas de registro, no padrão do Pipedrive: anotar e agendar
          moram no próprio negócio. Ter de ir até a seção Atividades para
          marcar um retorno é o tipo de desvio que faz o vendedor não
          registrar — e o dado que não se registra não existe. */}
      <div className="border-border flex shrink-0 items-center gap-1 border-b px-3 pt-2">
        <span className="border-brand-ink text-text -mb-px border-b-2 px-2 pb-2 text-sm font-semibold">
          Anotação
        </span>
        <button
          type="button"
          onClick={() => setAgendando(true)}
          className="text-text-secondary hover:text-text -mb-px inline-flex items-center gap-1.5 border-b-2 border-transparent px-2 pb-2 text-sm font-medium"
        >
          <CalendarPlus className="size-3.5" aria-hidden />
          Agendar atividade
        </button>
      </div>

      <form
        className="border-border shrink-0 border-b p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void escrever(e.currentTarget);
        }}
      >
        <textarea
          name="texto"
          rows={2}
          disabled={enviando}
          placeholder="Escrever uma anotação…"
          aria-label="Nova anotação"
          className="bg-surface border-border text-md focus:border-brand-ink w-full resize-y rounded-md border p-2.5 transition-colors"
        />
        <div className="mt-2 flex items-center justify-end gap-2">
          {erro && <span className="text-danger-ink mr-auto text-sm">{erro}</span>}
          <button
            type="submit"
            disabled={enviando}
            className="h-control-md bg-brand text-brand-on rounded-md px-3 text-md font-semibold transition-transform active:scale-95 disabled:opacity-50"
          >
            {enviando ? "Salvando…" : "Anotar"}
          </button>
        </div>
      </form>

      {agendando && (
        <DialogoAtividade
          tipos={tipos}
          usuarios={usuarios}
          // Já nasce amarrada a este negócio: o vínculo é o motivo de a
          // aba existir aqui, e pedi-lo de novo seria trabalho repetido.
          vinculoInicial={{ tipo: "negocio", id: negocioId, rotulo: titulo }}
          aoFechar={(mudou) => {
            setAgendando(false);
            if (mudou) router.refresh();
          }}
        />
      )}

      <ol className="min-h-0 flex-1 overflow-y-auto p-3">
        {visiveis.map((i, indice) => (
          <ItemDaLinha
            key={i.id}
            item={i}
            negocioId={negocioId}
            atraso={Math.min(indice, 12) * 25}
          />
        ))}

        {visiveis.length === 0 && (
          <li className="text-text-muted px-1 py-10 text-center text-sm">
            {filtro === "sistema"
              ? "Nenhuma mudança registrada ainda. O log passa a gravar a partir da primeira edição."
              : filtro === "usuario"
                ? "Nenhuma anotação ou atividade neste negócio."
                : "Nada aconteceu com este negócio ainda."}
          </li>
        )}
      </ol>
    </section>
  );
}

function ItemDaLinha({
  item,
  negocioId,
  atraso,
}: {
  item: ItemTempo;
  negocioId: string;
  atraso: number;
}) {
  const [saindo, setSaindo] = useState(false);
  const Icone = ICONE[item.tipo] ?? Flag;

  async function apagar() {
    if (!item.anotacaoId) return;
    setSaindo(true);
    const r = await excluirAnotacao(item.anotacaoId, negocioId);
    if (r?.erro) setSaindo(false);
  }

  return (
    <li
      // A entrada escalonada faz a fita "assentar" em vez de piscar
      // inteira. O atraso e limitado a doze itens: alem disso, esperar
      // vira lentidao em vez de elegancia.
      style={{ animationDelay: `${atraso}ms` }}
      className={`animate-in fade-in slide-in-from-bottom-1 fill-mode-backwards group flex gap-3 py-2.5 duration-300 ${
        saindo ? "pointer-events-none scale-95 opacity-0 transition-all duration-200" : ""
      }`}
    >
      <span
        className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full ${
          item.natureza === "sistema"
            ? "bg-surface-sunken text-text-muted"
            : "bg-brand/15 text-brand-ink"
        }`}
        aria-hidden
      >
        <Icone className="size-3.5" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-md">
          {item.natureza === "sistema" ? (
            <Descricao item={item} />
          ) : item.tipo === "atividade" ? (
            <>
              <span className={item.concluida ? "line-through opacity-60" : ""}>
                {item.texto}
              </span>
              {item.concluida && (
                <span className="text-success-ink ml-2 text-sm">concluída</span>
              )}
            </>
          ) : (
            <span className="whitespace-pre-wrap">{item.texto}</span>
          )}
        </p>

        <p className="text-text-muted mt-0.5 flex items-center gap-1.5 text-sm">
          {item.autor && <AvatarUsuario nome={item.autor} foto={item.foto} tamanho="sm" />}
          {item.autor ?? "Sistema"}
          <span className="opacity-40">·</span>
          {dataHora(item.quando)}
          {item.daCarga && (
            <span
              className="border-border text-text-muted ml-1 rounded-full border px-1.5 text-[10px]"
              title="Evento gerado pela carga de migração, não por operação real"
            >
              migração
            </span>
          )}
        </p>
      </div>

      {item.anotacaoId && (
        <button
          type="button"
          onClick={() => void apagar()}
          aria-label="Excluir anotação"
          className="text-text-muted hover:text-danger-ink h-fit rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        >
          <Trash2 className="size-3.5" aria-hidden />
        </button>
      )}
    </li>
  );
}

/** O log guarda o que mudou; aqui vira frase. */
function Descricao({ item }: { item: ItemTempo }) {
  const de = item.tipo === "valor" ? real(Number(item.de ?? 0)) : item.de;
  const para = item.tipo === "valor" ? real(Number(item.para ?? 0)) : item.para;

  const nome: Record<string, string> = {
    etapa: "Etapa",
    valor: "Valor",
    responsavel: "Responsável",
    status: "Status",
  };

  return (
    <>
      <span className="font-medium">{nome[item.tipo] ?? item.tipo}</span>{" "}
      {de ? (
        <>
          de <span className="text-text-secondary">{de}</span> para{" "}
        </>
      ) : (
        "definido como "
      )}
      <span className="font-medium">{para ?? "—"}</span>
    </>
  );
}
