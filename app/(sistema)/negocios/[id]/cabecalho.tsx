"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, Trash2, Trophy, XCircle } from "lucide-react";
import { EtiquetaStatus } from "@/components/dominio/etiquetas";
import { useAviso } from "@/components/dominio/avisos";
import { DialogoDesfecho } from "@/app/(sistema)/kanban/dialogo-desfecho";
import { ETAPA_DE_DESFECHO, type Desfecho } from "@/app/(sistema)/kanban/constantes";
import { excluirNegocio } from "@/app/(sistema)/negocios/acoes";
import { editarCampo, declararDesfecho } from "./acoes";

type Etapa = { id: string; nome: string; ordem: number };

/**
 * Barra de etapas e botoes de desfecho (B-056).
 *
 * A barra tambem move o negocio: clicar numa etapa e o mesmo que arrastar
 * o cartao no Kanban, e cai na mesma trava (D-047).
 */
export function Cabecalho({
  negocio,
  etapas,
  motivos,
}: {
  negocio: {
    id: string;
    titulo: string;
    status: "parado" | "negociacao" | "ganho" | "perdido";
    etapaId: string | null;
    organizacao: { id: string; nome: string } | null;
  };
  etapas: Etapa[];
  motivos: { id: string; nome: string }[];
}) {
  const router = useRouter();
  const avisar = useAviso();
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [editandoTitulo, setEditandoTitulo] = useState(false);
  const [rascunho, setRascunho] = useState(negocio.titulo);
  const [confirmando, setConfirmando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  // O que espera o desfecho: uma etapa de destino, ou um botao do topo.
  const [pendente, setPendente] = useState<
    { tipo: "etapa"; etapaId: string } | { tipo: "botao"; status: "ganho" | "perdido" } | null
  >(null);

  const atual = etapas.find((e) => e.id === negocio.etapaId);

  async function irPara(etapaId: string, desfecho?: Desfecho) {
    setSalvando(true);
    const r = await editarCampo(negocio.id, "etapa_id", etapaId, desfecho);
    setSalvando(false);
    if (r?.erro) setErro(r.erro);
  }

  async function desfechoDireto(d: Desfecho) {
    setSalvando(true);
    const r = await declararDesfecho(negocio.id, d);
    setSalvando(false);
    if (r?.erro) setErro(r.erro);
  }

  /** O título era texto fixo: nasceu errado, ficava errado para sempre. */
  async function salvarTitulo() {
    const novo = rascunho.trim();
    setEditandoTitulo(false);
    if (!novo || novo === negocio.titulo) return setRascunho(negocio.titulo);

    setSalvando(true);
    const r = await editarCampo(negocio.id, "titulo", novo);
    setSalvando(false);
    if (r?.erro) {
      setRascunho(negocio.titulo);
      return setErro(r.erro);
    }
    avisar("Título atualizado.");
  }

  async function excluir() {
    setErro(null);
    setExcluindo(true);
    const r = await excluirNegocio(negocio.id);
    setExcluindo(false);
    if (r?.erro) {
      setConfirmando(false);
      return setErro(r.erro);
    }
    avisar("Negócio excluído.");
    router.push("/negocios");
  }

  function clicarEtapa(e: Etapa) {
    if (e.id === negocio.etapaId) return;
    if (e.nome === ETAPA_DE_DESFECHO) return setPendente({ tipo: "etapa", etapaId: e.id });
    void irPara(e.id);
  }

  const concluido = negocio.status === "ganho" || negocio.status === "perdido";

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {editandoTitulo ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                autoFocus
                value={rascunho}
                onChange={(e) => setRascunho(e.target.value)}
                onBlur={() => void salvarTitulo()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void salvarTitulo();
                  if (e.key === "Escape") {
                    setRascunho(negocio.titulo);
                    setEditandoTitulo(false);
                  }
                }}
                aria-label="Título do negócio"
                className="h-control-md bg-surface border-border w-full max-w-md rounded-md border px-2 text-xl font-semibold tracking-tight"
              />
              <Check className="text-text-muted size-4 shrink-0" aria-hidden />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setRascunho(negocio.titulo);
                setEditandoTitulo(true);
              }}
              title="Editar título"
              className="group hover:bg-surface-hover -mx-1.5 flex max-w-full items-center gap-2 rounded px-1.5 text-left"
            >
              <h1 className="truncate text-xl font-semibold tracking-tight">
                {negocio.titulo}
              </h1>
              <Pencil
                className="text-text-muted size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                aria-hidden
              />
            </button>
          )}
          <p className="text-text-secondary text-sm">
            {negocio.organizacao?.nome ?? "—"}
            <span className="mx-2 opacity-40">·</span>
            <EtiquetaStatus status={negocio.status} />
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={salvando}
            onClick={() => setPendente({ tipo: "botao", status: "ganho" })}
            className={`h-control-md inline-flex items-center gap-1.5 rounded-md border px-3 text-md font-medium disabled:opacity-50 ${
              negocio.status === "ganho"
                ? "border-success bg-success-bg text-success-ink"
                : "border-border hover:bg-surface-hover"
            }`}
          >
            <Trophy className="size-4" aria-hidden />
            Ganho
          </button>
          <button
            type="button"
            disabled={salvando}
            onClick={() => setPendente({ tipo: "botao", status: "perdido" })}
            className={`h-control-md inline-flex items-center gap-1.5 rounded-md border px-3 text-md font-medium disabled:opacity-50 ${
              negocio.status === "perdido"
                ? "border-danger bg-danger-bg text-danger-ink"
                : "border-border hover:bg-surface-hover"
            }`}
          >
            <XCircle className="size-4" aria-hidden />
            Perdido
          </button>

          <button
            type="button"
            disabled={salvando}
            onClick={() => setConfirmando(true)}
            title="Excluir negócio"
            aria-label="Excluir negócio"
            className="h-control-md text-danger-ink hover:bg-danger-bg inline-flex items-center gap-1.5 rounded-md px-2.5 text-md font-medium disabled:opacity-50"
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        </div>
      </div>

      {/* Trilha de etapas. O nome sempre escrito — cor nunca e o unico
          sinal (Doc 08, B-076). */}
      <ol className="mt-3 flex flex-wrap gap-1">
        {etapas.map((e) => {
          const passou = atual ? e.ordem <= atual.ordem : false;
          const aqui = e.id === negocio.etapaId;
          return (
            <li key={e.id}>
              <button
                type="button"
                disabled={salvando || aqui}
                onClick={() => clicarEtapa(e)}
                aria-current={aqui ? "step" : undefined}
                title={aqui ? "Etapa atual" : `Mover para ${e.nome}`}
                className={`h-control-md rounded-md border px-2.5 text-sm font-medium transition-colors disabled:cursor-default ${
                  aqui
                    ? "border-brand-ink bg-brand text-brand-on hover:bg-brand-hover active:bg-brand-active"
                    : passou && !concluido
                      ? "border-border bg-surface-hover text-text"
                      : "border-border text-text-secondary hover:bg-surface-hover"
                }`}
              >
                {e.nome}
              </button>
            </li>
          );
        })}
      </ol>

      {erro && (
        <p role="alert" className="text-danger-ink mt-2 text-sm">
          {erro}
        </p>
      )}

      {/* ⚠️ A exclusão leva o log daquele negócio junto, por cascata do
          schema. O log é a única coisa não recuperável do sistema — então
          a confirmação diz exatamente o que se perde, em vez do "tem
          certeza?" genérico que ninguém lê. */}
      {confirmando && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(e) => e.target === e.currentTarget && setConfirmando(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-excluir-negocio"
            className="border-border bg-surface w-full max-w-md rounded-lg border p-5 shadow-xl"
          >
            <h2 id="titulo-excluir-negocio" className="text-lg font-semibold">
              Excluir negócio?
            </h2>
            <p className="text-text-secondary mt-1 text-md">
              <span className="font-medium">{negocio.titulo}</span> será removido.
            </p>
            <p className="text-danger-ink bg-danger-bg mt-3 rounded-md px-3 py-2 text-sm">
              Vão junto, sem volta: as atividades e anotações deste negócio, os
              vínculos com pessoas e <strong>o histórico da linha do tempo</strong>.
              A organização e as pessoas continuam existindo.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmando(false)}
                className="h-control-md text-text-secondary hover:bg-surface-hover rounded-md px-3 text-md font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void excluir()}
                disabled={excluindo}
                className="h-control-md bg-danger text-text-inverse rounded-md px-4 text-md font-semibold disabled:opacity-50"
              >
                {excluindo ? "Excluindo…" : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {pendente && (
        <DialogoDesfecho
          titulo={negocio.titulo}
          motivos={motivos}
          aoCancelar={() => setPendente(null)}
          aoConfirmar={(d) => {
            const p = pendente;
            setPendente(null);
            if (p.tipo === "etapa") void irPara(p.etapaId, d);
            else void desfechoDireto(d);
          }}
        />
      )}
    </>
  );
}
