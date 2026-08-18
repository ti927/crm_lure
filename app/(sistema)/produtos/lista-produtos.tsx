"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Package, Plus, Briefcase } from "lucide-react";
import { CampoBusca } from "@/components/dominio/campo-busca";
import { DialogoProduto, type Area, type ProdutoEdicao } from "./dialogo-produto";

export type LinhaProduto = {
  id: string;
  nome: string;
  area_id: string | null;
  area_produto: { nome: string } | null;
  negocios: number;
};

/**
 * Produtos e serviços (B-096).
 *
 * ⚠️ A base nasce vazia aqui: o Pipedrive não tinha **nenhum** produto
 * cadastrado, então o cadastro passa a ser feito neste sistema. A busca é
 * no cliente porque a lista é pequena por natureza — são serviços de
 * consultoria, dezenas e não milhares, e nenhuma das restrições da R-006
 * se aplica a um conjunto desse tamanho.
 */
export function ListaProdutos({
  produtos,
  areas,
}: {
  produtos: LinhaProduto[];
  areas: Area[];
}) {
  const router = useRouter();
  const [termo, setTermo] = useState("");
  const [dialogo, setDialogo] = useState<
    { modo: "novo" } | { modo: "editar"; produto: ProdutoEdicao } | null
  >(null);

  const busca = termo.trim().toLowerCase();
  const visiveis = busca
    ? produtos.filter(
        (p) =>
          p.nome.toLowerCase().includes(busca) ||
          p.area_produto?.nome.toLowerCase().includes(busca)
      )
    : produtos;

  function fechar(mudou: boolean) {
    setDialogo(null);
    if (mudou) router.refresh();
  }

  return (
    <div className="flex h-full min-w-0 flex-col">
      <div className="border-border flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">Produtos</h1>
          <span className="text-text-muted text-sm">
            {produtos.length.toLocaleString("pt-BR")}
          </span>
        </div>

        <div className="flex w-full items-center gap-2 md:w-auto">
          <CampoBusca
            valor={termo}
            aoBuscar={setTermo}
            placeholder="Buscar produto"
            className="min-w-0 flex-1 md:w-56 md:flex-none"
          />
          <button
            type="button"
            onClick={() => setDialogo({ modo: "novo" })}
            aria-label="Novo produto"
            className="h-control-md bg-brand text-brand-on inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 text-sm font-semibold md:px-3"
          >
            <Plus className="size-4" aria-hidden />
            <span className="hidden md:inline">Novo produto</span>
          </button>
        </div>
      </div>

      {visiveis.length === 0 ? (
        <div className="px-4 py-16 text-center">
          <p className="text-text-secondary text-md font-medium">
            {termo ? "Nenhum produto corresponde à busca." : "Nenhum produto cadastrado."}
          </p>
          <p className="text-text-muted mt-1 text-sm">
            {termo
              ? "Ajuste ou limpe a busca."
              : "O Pipedrive não tinha produtos — o cadastro começa aqui."}
          </p>
        </div>
      ) : (
        <ul className="min-h-0 flex-1 overflow-auto">
          {visiveis.map((p, i) => (
            <li
              key={p.id}
              style={{ animationDelay: `${Math.min(i, 14) * 18}ms` }}
              className="border-border animate-in fade-in fill-mode-backwards border-b duration-300"
            >
              <div className="hover:bg-surface-hover flex items-center gap-3 px-4 py-2.5 motion-safe:transition-colors">
                <Package className="text-text-muted size-4 shrink-0" aria-hidden />
                <button
                  type="button"
                  onClick={() =>
                    setDialogo({
                      modo: "editar",
                      produto: { id: p.id, nome: p.nome, areaId: p.area_id },
                    })
                  }
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="text-md block truncate font-medium">{p.nome}</span>
                  {p.area_produto?.nome && (
                    <span className="text-text-muted block truncate text-sm">
                      {p.area_produto.nome}
                    </span>
                  )}
                </button>

                {/* Quantos negócios usam o produto — vira o aviso de que
                    excluí-lo será recusado pelo banco. */}
                {p.negocios > 0 ? (
                  <Link
                    href={`/negocios?produto=${p.id}`}
                    className="text-text-muted hover:text-text tabular flex shrink-0 items-center gap-1 text-sm"
                    title="Ver negócios com este produto"
                  >
                    <Briefcase className="size-3.5" aria-hidden />
                    {p.negocios.toLocaleString("pt-BR")}
                  </Link>
                ) : (
                  <span className="text-text-muted tabular flex shrink-0 items-center gap-1 text-sm opacity-50">
                    <Briefcase className="size-3.5" aria-hidden />0
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {dialogo && (
        <DialogoProduto
          edicao={dialogo.modo === "editar" ? dialogo.produto : undefined}
          areas={areas}
          aoFechar={fechar}
        />
      )}
    </div>
  );
}
