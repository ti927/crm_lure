"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { List, CalendarDays, Plus, Download } from "lucide-react";
import {
  SeletorResponsavel,
  type Usuario as UsuarioFoto,
} from "@/components/dominio/seletor-responsavel";
import { ListaAtividades } from "./lista-atividades";
import { Calendario } from "./calendario";
import {
  DialogoAtividade,
  type Tipo,
  type Usuario,
  type AtividadeEdicao,
} from "./dialogo-atividade";
import type { Vinculo } from "./seletor-vinculo";
import {
  SITUACOES,
  type FiltrosAtividade,
  type LinhaAtividade,
} from "./consulta";

type Estado =
  | { modo: "novo"; data?: string; vinculo?: Vinculo }
  | { modo: "editar"; atividade: LinhaAtividade }
  | null;

/** LinhaAtividade → o que o formulário de edição consome. */
function paraEdicao(a: LinhaAtividade): AtividadeEdicao {
  const vinculo: Vinculo = a.negocio
    ? { tipo: "negocio", id: a.negocio.id, rotulo: a.negocio.titulo }
    : a.organizacao
      ? { tipo: "organizacao", id: a.organizacao.id, rotulo: a.organizacao.nome }
      : a.pessoa
        ? { tipo: "pessoa", id: a.pessoa.id, rotulo: a.pessoa.nome }
        : null;
  return {
    id: a.id,
    tipoId: a.tipo_id,
    titulo: a.titulo ?? "",
    data: a.data,
    horaInicio: a.hora_inicio,
    horaFim: a.hora_fim,
    responsavelId: a.responsavel_id,
    descricao: a.descricao ?? "",
    concluida: a.concluida,
    vinculo,
  };
}

export function PainelAtividades({
  doDia,
  vencidas,
  atividadesMes,
  dia,
  tipos,
  usuarios,
  usuariosFoto,
  filtros,
  hoje,
  exportHref,
}: {
  doDia: LinhaAtividade[];
  vencidas: LinhaAtividade[];
  atividadesMes: LinhaAtividade[];
  dia: string;
  tipos: Tipo[];
  usuarios: Usuario[];
  usuariosFoto: UsuarioFoto[];
  filtros: FiltrosAtividade;
  hoje: string;
  exportHref: string;
}) {
  const router = useRouter();
  const caminho = usePathname();
  const params = useSearchParams();
  const [pendente, iniciar] = useTransition();
  const [dialogo, setDialogo] = useState<Estado>(null);

  function aplicar(chave: string, valor: string) {
    const p = new URLSearchParams(params);
    if (valor) p.set(chave, valor);
    else p.delete(chave);
    iniciar(() => router.push(`${caminho}?${p}`));
  }

  function fecharDialogo(mudou: boolean) {
    setDialogo(null);
    if (mudou) router.refresh();
  }

  const campo =
    "h-control-md bg-surface border-border text-md rounded-md border px-2.5";
  const naVista = (v: "lista" | "calendario") => filtros.vista === v;

  return (
    <div className="flex h-full min-w-0 flex-col">
      <div
        className="border-border flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3"
        data-pendente={pendente || undefined}
      >
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight">Atividades</h1>

          {/* Alternador de vista (B-080). */}
          <div className="border-border ml-2 flex rounded-md border p-0.5">
            <button
              type="button"
              onClick={() => aplicar("vista", "")}
              aria-pressed={naVista("lista")}
              className={`inline-flex h-7 items-center gap-1.5 rounded px-2.5 text-sm font-medium ${
                naVista("lista") ? "bg-surface-hover text-text" : "text-text-muted"
              }`}
            >
              <List className="size-3.5" aria-hidden />
              Lista
            </button>
            <button
              type="button"
              onClick={() => aplicar("vista", "calendario")}
              aria-pressed={naVista("calendario")}
              className={`inline-flex h-7 items-center gap-1.5 rounded px-2.5 text-sm font-medium ${
                naVista("calendario") ? "bg-surface-hover text-text" : "text-text-muted"
              }`}
            >
              <CalendarDays className="size-3.5" aria-hidden />
              Calendário
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filtrar por situação"
            value={filtros.situacao}
            onChange={(e) => aplicar("situacao", e.target.value)}
            className={`${campo} ${filtros.situacao !== "pendentes" ? "border-brand-ink font-medium" : ""}`}
          >
            {SITUACOES.map((s) => (
              <option key={s.valor} value={s.valor}>
                {s.rotulo}
              </option>
            ))}
          </select>

          <select
            aria-label="Filtrar por tipo"
            value={filtros.tipo}
            onChange={(e) => aplicar("tipo", e.target.value)}
            className={`${campo} ${filtros.tipo ? "border-brand-ink font-medium" : ""}`}
          >
            <option value="">Todos os tipos</option>
            {tipos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>

          <SeletorResponsavel
            usuarios={usuariosFoto}
            escolhido={filtros.responsavel}
            aoEscolher={(id) => aplicar("responsavel", id)}
            classe={campo}
          />

          <a
            href={exportHref}
            className="h-control-md border-border text-text-secondary hover:bg-surface-hover hover:text-text inline-flex items-center gap-1.5 rounded-md border px-3 text-sm font-medium"
          >
            <Download className="size-3.5" aria-hidden />
            CSV
          </a>

          <button
            type="button"
            // Na lista, já nasce no dia em foco; no calendário, sem data —
            // ali o dia se escolhe clicando na célula.
            onClick={() =>
              setDialogo({
                modo: "novo",
                data: filtros.vista === "lista" ? dia : undefined,
              })
            }
            className="h-control-md bg-brand text-brand-on inline-flex items-center gap-1.5 rounded-md px-3 text-sm font-semibold"
          >
            <Plus className="size-4" aria-hidden />
            Nova atividade
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {filtros.vista === "calendario" ? (
          <Calendario
            mes={filtros.mes}
            atividades={atividadesMes}
            hoje={hoje}
            aoEditar={(a) => setDialogo({ modo: "editar", atividade: a })}
            aoNovoNoDia={(data) => setDialogo({ modo: "novo", data })}
          />
        ) : (
          <ListaAtividades
            dia={dia}
            hoje={hoje}
            doDia={doDia}
            vencidas={vencidas}
            aoEditar={(a) => setDialogo({ modo: "editar", atividade: a })}
            aoMudar={() => router.refresh()}
          />
        )}
      </div>

      {dialogo && (
        <DialogoAtividade
          edicao={dialogo.modo === "editar" ? paraEdicao(dialogo.atividade) : undefined}
          tipos={tipos}
          usuarios={usuarios}
          vinculoInicial={dialogo.modo === "novo" ? dialogo.vinculo : undefined}
          dataInicial={dialogo.modo === "novo" ? dialogo.data : undefined}
          aoFechar={fecharDialogo}
        />
      )}
    </div>
  );
}
