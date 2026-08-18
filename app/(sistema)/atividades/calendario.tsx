"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  limitesDoMes,
  somaDias,
  nomeDoMes,
  type LinhaAtividade,
} from "./consulta";

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** Mês vizinho de "YYYY-MM". */
function mesVizinho(mes: string, delta: number): string {
  const [a, m] = mes.split("-").map(Number);
  const total = (a * 12 + (m - 1)) + delta;
  const na = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${na}-${String(nm).padStart(2, "0")}`;
}

export function Calendario({
  mes,
  atividades,
  hoje,
  aoEditar,
  aoNovoNoDia,
}: {
  mes: string;
  atividades: LinhaAtividade[];
  hoje: string;
  aoEditar: (a: LinhaAtividade) => void;
  aoNovoNoDia: (data: string) => void;
}) {
  const router = useRouter();
  const caminho = usePathname();
  const params = useSearchParams();
  const [pendente, iniciar] = useTransition();

  function irParaMes(alvo: string) {
    const p = new URLSearchParams(params);
    p.set("mes", alvo);
    iniciar(() => router.push(`${caminho}?${p}`));
  }

  // 42 células (6 semanas) a partir do domingo que antecede o dia 1 —
  // grade de altura estável, mês entra e sai sem a tabela "pular".
  const { de } = limitesDoMes(mes);
  const diaSemanaDo1 = new Date(`${de}T00:00:00Z`).getUTCDay();
  const inicioGrade = somaDias(de, -diaSemanaDo1);

  const porDia = new Map<string, LinhaAtividade[]>();
  for (const a of atividades) {
    if (!porDia.has(a.data)) porDia.set(a.data, []);
    porDia.get(a.data)!.push(a);
  }

  const celulas = Array.from({ length: 42 }, (_, i) => somaDias(inicioGrade, i));

  return (
    <div
      className="flex min-h-0 flex-1 flex-col p-4"
      data-pendente={pendente || undefined}
    >
      <div className="mb-3 flex items-center gap-3">
        <h2 className="text-md font-semibold capitalize">{nomeDoMes(mes)}</h2>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => irParaMes(mesVizinho(mes, -1))}
            aria-label="Mês anterior"
            className="border-border hover:bg-surface-hover inline-flex size-7 items-center justify-center rounded-md border"
          >
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => irParaMes(mesVizinho(mes, 1))}
            aria-label="Próximo mês"
            className="border-border hover:bg-surface-hover inline-flex size-7 items-center justify-center rounded-md border"
          >
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-border border-l border-t">
        {DIAS.map((d) => (
          <div
            key={d}
            className="border-border text-text-muted border-b border-r px-2 py-1 text-xs font-semibold uppercase tracking-caps"
          >
            {d}
          </div>
        ))}
        {celulas.map((data) => {
          const doMes = data.slice(0, 7) === mes;
          const eHoje = data === hoje;
          const itens = porDia.get(data) ?? [];
          return (
            <div
              key={data}
              className={`border-border min-h-24 border-b border-r p-1 ${
                doMes ? "" : "bg-surface-sunken/40"
              }`}
            >
              <button
                type="button"
                onClick={() => aoNovoNoDia(data)}
                title="Nova atividade neste dia"
                className={`mb-1 flex size-6 items-center justify-center rounded-full text-xs ${
                  eHoje
                    ? "bg-brand text-brand-on font-bold"
                    : doMes
                      ? "text-text hover:bg-surface-hover"
                      : "text-text-muted hover:bg-surface-hover"
                }`}
              >
                {Number(data.slice(8, 10))}
              </button>

              <div className="flex flex-col gap-0.5">
                {itens.slice(0, 4).map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => aoEditar(a)}
                    title={a.titulo ?? a.tipo_atividade?.nome ?? "Atividade"}
                    className={`flex items-center gap-1 rounded px-1 py-0.5 text-left text-xs ${
                      a.concluida
                        ? "text-text-muted line-through"
                        : "bg-surface-hover hover:bg-border"
                    }`}
                  >
                    {a.hora_inicio && (
                      <span className="tabular shrink-0 opacity-70">
                        {a.hora_inicio.slice(0, 5)}
                      </span>
                    )}
                    <span className="truncate">
                      {a.titulo ?? a.tipo_atividade?.nome ?? "Atividade"}
                    </span>
                  </button>
                ))}
                {itens.length > 4 && (
                  <span className="text-text-muted px-1 text-xs">
                    +{itens.length - 4}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
