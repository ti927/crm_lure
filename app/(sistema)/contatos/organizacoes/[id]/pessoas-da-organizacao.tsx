"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Phone, Mail, X, UserPlus } from "lucide-react";
import { paraWhatsApp } from "../../consulta";
import { SeletorAsync } from "../../seletor-async";
import { useAviso } from "@/components/dominio/avisos";
import {
  buscarPessoas,
  vincularOrganizacao,
  desvincularOrganizacao,
  editarCargo,
} from "../../acoes";

export type PessoaVinculada = {
  id: string;
  nome: string;
  cargo: string | null;
  contatos: { tipo: string; valor: string }[];
};

/**
 * Pessoas ligadas à organização (B-091). O cargo é do vínculo (D-036),
 * editável inline aqui. Vincular alguém já existente é uma busca; o cargo
 * se preenche depois, direto na linha.
 */
export function PessoasDaOrganizacao({
  organizacaoId,
  pessoas,
}: {
  organizacaoId: string;
  pessoas: PessoaVinculada[];
}) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const avisar = useAviso();
  const [adicionando, setAdicionando] = useState(false);

  async function vincular(pessoaId: string) {
    setErro(null);
    const r = await vincularOrganizacao(organizacaoId, pessoaId, "");
    if (r?.erro) return setErro(r.erro);
    setAdicionando(false);
    avisar("Vínculo criado.");
    router.refresh();
  }

  async function remover(pessoaId: string) {
    const r = await desvincularOrganizacao(organizacaoId, pessoaId);
    if (r?.erro) return setErro(r.erro);
    avisar("Vínculo removido.");
    router.refresh();
  }

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-text-muted text-xs font-semibold uppercase tracking-caps">
          Pessoas {pessoas.length > 0 && `(${pessoas.length})`}
        </h2>
        <button
          type="button"
          onClick={() => setAdicionando((v) => !v)}
          className="text-text-secondary hover:text-text inline-flex items-center gap-1 text-sm font-medium"
        >
          <UserPlus className="size-3.5" aria-hidden />
          Vincular
        </button>
      </div>

      {adicionando && (
        <div className="mb-3">
          <SeletorAsync
            buscar={buscarPessoas}
            aoEscolher={(p) => void vincular(p.id)}
            placeholder="Buscar pessoa pelo nome…"
          />
        </div>
      )}

      {erro && <p className="text-danger-ink mb-2 text-sm">{erro}</p>}

      {pessoas.length === 0 ? (
        <p className="text-text-muted text-sm">Nenhuma pessoa vinculada.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {pessoas.map((p) => (
            <li key={p.id} className="group">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/contatos/pessoas/${p.id}`}
                  className="text-md hover:text-brand-ink font-medium hover:underline"
                >
                  {p.nome}
                </Link>
                <button
                  type="button"
                  onClick={() => void remover(p.id)}
                  aria-label={`Desvincular ${p.nome}`}
                  className="text-text-muted hover:text-danger-ink shrink-0 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </div>

              <input
                key={p.cargo ?? ""}
                type="text"
                defaultValue={p.cargo ?? ""}
                placeholder="Cargo"
                aria-label={`Cargo de ${p.nome}`}
                onBlur={async (e) => {
                  const novo = e.target.value.trim();
                  if (novo !== (p.cargo ?? "")) {
                    await editarCargo(organizacaoId, p.id, novo);
                    router.refresh();
                  }
                }}
                className="text-text-muted placeholder:text-text-muted/60 mt-0.5 w-full rounded border border-transparent bg-transparent px-0 text-sm hover:border-border focus:border-border focus:px-1.5"
              />

              <div className="mt-1 flex flex-wrap gap-1.5">
                {p.contatos.map((c, i) =>
                  c.tipo === "telefone" ? (
                    <a
                      key={i}
                      href={`https://wa.me/${paraWhatsApp(c.valor)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="border-border hover:border-brand-ink inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-sm"
                    >
                      <Phone className="size-3" aria-hidden />
                      {c.valor}
                    </a>
                  ) : (
                    <a
                      key={i}
                      href={`mailto:${c.valor}`}
                      className="border-border hover:border-brand-ink inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-sm"
                    >
                      <Mail className="size-3 shrink-0" aria-hidden />
                      <span className="truncate">{c.valor}</span>
                    </a>
                  )
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
