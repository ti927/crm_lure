"use client";

import { useState } from "react";
import { Trophy, XCircle } from "lucide-react";
import { EtiquetaStatus } from "@/components/dominio/etiquetas";
import { DialogoDesfecho } from "@/app/(sistema)/kanban/dialogo-desfecho";
import { ETAPA_DE_DESFECHO, type Desfecho } from "@/app/(sistema)/kanban/constantes";
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
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
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
          <h1 className="truncate text-xl font-semibold tracking-tight">
            {negocio.titulo}
          </h1>
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
                    ? "border-brand-ink bg-brand text-brand-on"
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
