"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, X, Plus } from "lucide-react";
import { SeletorAsync } from "../../seletor-async";
import { useAviso } from "@/components/dominio/avisos";
import {
  buscarOrganizacoes,
  vincularOrganizacao,
  desvincularOrganizacao,
  editarCargo,
} from "../../acoes";

export type OrgVinculada = { id: string; nome: string; cargo: string | null };

/** Organizações da pessoa (B-091): a mesma pessoa em várias organizações,
 *  com cargo diferente em cada (o cargo é do vínculo, D-036). */
export function OrganizacoesDaPessoa({
  pessoaId,
  organizacoes,
}: {
  pessoaId: string;
  organizacoes: OrgVinculada[];
}) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const avisar = useAviso();
  const [adicionando, setAdicionando] = useState(false);

  async function vincular(orgId: string) {
    setErro(null);
    const r = await vincularOrganizacao(pessoaId, orgId, "");
    if (r?.erro) return setErro(r.erro);
    setAdicionando(false);
    avisar("Vínculo criado.");
    router.refresh();
  }

  async function remover(orgId: string) {
    const r = await desvincularOrganizacao(pessoaId, orgId);
    if (r?.erro) return setErro(r.erro);
    avisar("Vínculo removido.");
    router.refresh();
  }

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-text-muted text-xs font-semibold uppercase tracking-caps">
          Organizações {organizacoes.length > 0 && `(${organizacoes.length})`}
        </h2>
        <button
          type="button"
          onClick={() => setAdicionando((v) => !v)}
          className="text-text-secondary hover:text-text inline-flex items-center gap-1 text-sm font-medium"
        >
          <Plus className="size-3.5" aria-hidden />
          Vincular
        </button>
      </div>

      {adicionando && (
        <div className="mb-3">
          <SeletorAsync
            buscar={buscarOrganizacoes}
            aoEscolher={(o) => void vincular(o.id)}
            placeholder="Buscar organização pelo nome…"
          />
        </div>
      )}

      {erro && <p className="text-danger-ink mb-2 text-sm">{erro}</p>}

      {organizacoes.length === 0 ? (
        <p className="text-text-muted text-sm">Nenhuma organização vinculada.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {organizacoes.map((o) => (
            <li key={o.id} className="group">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/contatos/organizacoes/${o.id}`}
                  className="text-md hover:text-brand-ink flex items-center gap-2 font-medium hover:underline"
                >
                  <Building2 className="text-text-muted size-4 shrink-0" aria-hidden />
                  <span className="truncate">{o.nome}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => void remover(o.id)}
                  aria-label={`Desvincular ${o.nome}`}
                  className="text-text-muted hover:text-danger-ink shrink-0 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </div>
              <input
                key={o.cargo ?? ""}
                type="text"
                defaultValue={o.cargo ?? ""}
                placeholder="Cargo"
                aria-label={`Cargo em ${o.nome}`}
                onBlur={async (e) => {
                  const novo = e.target.value.trim();
                  if (novo !== (o.cargo ?? "")) {
                    await editarCargo(pessoaId, o.id, novo);
                    router.refresh();
                  }
                }}
                className="text-text-muted placeholder:text-text-muted/60 mt-0.5 ml-6 w-[calc(100%-1.5rem)] rounded border border-transparent bg-transparent text-sm hover:border-border focus:border-border focus:px-1.5"
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
