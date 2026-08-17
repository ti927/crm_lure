"use client";

import { useState } from "react";
import { Phone, Mail, Building2, Check } from "lucide-react";
import { data } from "@/lib/formato";
import { alternarAtividade } from "./acoes";

type Contato = { tipo: string; valor: string };
type Pessoa = {
  id: string;
  nome: string;
  forma_contato: Contato[] | null;
  pessoa_organizacao: { cargo: string | null }[] | null;
};

type Atividade = {
  id: string;
  titulo: string | null;
  data: string;
  hora_inicio: string | null;
  concluida: boolean;
  tipo_atividade: { nome: string } | null;
};

/** Só dígitos, com 55 na frente — é o que o link do WhatsApp aceita. */
function paraWhatsApp(numero: string) {
  const so = numero.replace(/\D/g, "");
  return so.startsWith("55") ? so : `55${so}`;
}

export function ZonaLateral({
  negocioId,
  organizacao,
  pessoas,
  atividades,
}: {
  negocioId: string;
  organizacao: { id: string; nome: string; cidade?: string | null } | null;
  pessoas: Pessoa[];
  atividades: Atividade[];
}) {
  const abertas = atividades.filter((a) => !a.concluida);
  const feitas = atividades.filter((a) => a.concluida);

  return (
    <section
      aria-label="Pessoas e atividades"
      className="border-border bg-surface flex flex-col gap-5 overflow-y-auto border-l p-4"
    >
      <div>
        <h2 className="text-text-muted mb-2 text-xs font-semibold uppercase tracking-caps">
          Organização
        </h2>
        <p className="text-md flex items-center gap-2 font-medium">
          <Building2 className="text-text-muted size-4 shrink-0" aria-hidden />
          <span className="truncate">{organizacao?.nome ?? "—"}</span>
        </p>
        {organizacao?.cidade && (
          <p className="text-text-muted ml-6 text-sm">{organizacao.cidade}</p>
        )}
      </div>

      <div>
        <h2 className="text-text-muted mb-2 text-xs font-semibold uppercase tracking-caps">
          Pessoas {pessoas.length > 0 && `(${pessoas.length})`}
        </h2>

        {pessoas.length === 0 ? (
          <p className="text-text-muted text-sm">Nenhuma pessoa vinculada.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {pessoas.map((p) => {
              const cargo = p.pessoa_organizacao?.[0]?.cargo;
              return (
                <li key={p.id}>
                  <p className="text-md font-medium">{p.nome}</p>
                  {/* O cargo pertence ao vinculo, nao a pessoa (Doc 06). */}
                  {cargo && <p className="text-text-muted text-sm">{cargo}</p>}

                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {(p.forma_contato ?? []).map((c, i) =>
                      c.tipo === "telefone" ? (
                        <a
                          key={i}
                          href={`https://wa.me/${paraWhatsApp(c.valor)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="border-border hover:bg-surface-hover hover:border-brand-ink inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-sm transition-all hover:-translate-y-px"
                        >
                          <Phone className="size-3" aria-hidden />
                          {c.valor}
                        </a>
                      ) : (
                        <a
                          key={i}
                          href={`mailto:${c.valor}`}
                          className="border-border hover:bg-surface-hover hover:border-brand-ink inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-sm transition-all hover:-translate-y-px"
                        >
                          <Mail className="size-3 shrink-0" aria-hidden />
                          <span className="truncate">{c.valor}</span>
                        </a>
                      )
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div>
        <h2 className="text-text-muted mb-2 text-xs font-semibold uppercase tracking-caps">
          Atividades
        </h2>

        {atividades.length === 0 ? (
          <p className="text-text-muted text-sm">Nenhuma atividade.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {[...abertas, ...feitas].map((a) => (
              <ItemAtividade key={a.id} atividade={a} negocioId={negocioId} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function ItemAtividade({
  atividade,
  negocioId,
}: {
  atividade: Atividade;
  negocioId: string;
}) {
  const [concluida, setConcluida] = useState(atividade.concluida);
  const [salvando, setSalvando] = useState(false);

  async function alternar() {
    const alvo = !concluida;
    setConcluida(alvo); // otimista: marcar tarefa tem que responder na hora
    setSalvando(true);
    const r = await alternarAtividade(atividade.id, negocioId, alvo);
    setSalvando(false);
    if (r?.erro) setConcluida(!alvo);
  }

  return (
    <li>
      <button
        type="button"
        disabled={salvando}
        onClick={() => void alternar()}
        className="hover:bg-surface-hover -mx-1.5 flex w-full items-start gap-2 rounded px-1.5 py-1 text-left transition-colors disabled:opacity-60"
      >
        <span
          aria-hidden
          className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border transition-all duration-200 ${
            concluida
              ? "border-success bg-success text-text-inverse scale-100"
              : "border-border scale-95"
          }`}
        >
          {concluida && <Check className="size-3" strokeWidth={3} />}
        </span>

        <span className="min-w-0 flex-1">
          <span
            className={`text-md block truncate transition-opacity ${
              concluida ? "line-through opacity-50" : ""
            }`}
          >
            {atividade.titulo ?? atividade.tipo_atividade?.nome ?? "Atividade"}
          </span>
          <span className="text-text-muted text-sm">
            {data(atividade.data)}
            {atividade.hora_inicio && ` · ${atividade.hora_inicio.slice(0, 5)}`}
          </span>
        </span>
      </button>
    </li>
  );
}
