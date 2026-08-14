"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import { Search, X } from "lucide-react";

type Etapa = { id: string; nome: string; ordem: number };

const STATUS = [
  { valor: "parado", rotulo: "Parado" },
  { valor: "negociacao", rotulo: "Negociação" },
  { valor: "ganho", rotulo: "Ganho" },
  { valor: "perdido", rotulo: "Perdido" },
];

/**
 * Barra de filtros.
 *
 * O estado mora na URL, nao em useState. Assim o filtro sobrevive ao
 * recarregar, pode ser compartilhado por link e volta certo no botao
 * "voltar" do navegador. A persistencia por usuario entre sessoes
 * (B-045) ainda nao esta feita — falta gravar a ultima combinacao.
 */
export function Filtros({ etapas }: { etapas: Etapa[] }) {
  const router = useRouter();
  const caminho = usePathname();
  const params = useSearchParams();
  const [pendente, iniciar] = useTransition();

  function aplicar(chave: string, valor: string) {
    const p = new URLSearchParams(params);
    if (valor) p.set(chave, valor);
    else p.delete(chave);
    // Qualquer filtro novo devolve a leitura para a primeira pagina:
    // continuar na pagina 7 de um conjunto que encolheu mostra vazio.
    p.delete("pagina");
    iniciar(() => router.push(`${caminho}?${p}`));
  }

  const busca = params.get("busca") ?? "";
  const status = params.get("status") ?? "";
  const etapa = params.get("etapa") ?? "";
  const temFiltro = Boolean(busca || status || etapa);

  const campo =
    "h-control-md bg-surface border-border text-md rounded-md border px-2.5";

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      data-pendente={pendente || undefined}
    >
      <form
        className="relative"
        onSubmit={(e) => {
          e.preventDefault();
          const dado = new FormData(e.currentTarget);
          aplicar("busca", String(dado.get("busca") ?? "").trim());
        }}
      >
        <Search
          className="text-text-muted pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2"
          aria-hidden
        />
        <input
          name="busca"
          type="search"
          defaultValue={busca}
          placeholder="Título ou organização"
          aria-label="Buscar por título ou organização"
          className={`${campo} w-60 pl-8`}
        />
      </form>

      <select
        aria-label="Filtrar por etapa"
        value={etapa}
        onChange={(e) => aplicar("etapa", e.target.value)}
        className={`${campo} ${etapa ? "border-brand-ink font-medium" : ""}`}
      >
        <option value="">Todas as etapas</option>
        {etapas.map((e) => (
          <option key={e.id} value={e.id}>
            {e.nome}
          </option>
        ))}
      </select>

      <select
        aria-label="Filtrar por status"
        value={status}
        onChange={(e) => aplicar("status", e.target.value)}
        className={`${campo} ${status ? "border-brand-ink font-medium" : ""}`}
      >
        <option value="">Todos os status</option>
        {STATUS.map((s) => (
          <option key={s.valor} value={s.valor}>
            {s.rotulo}
          </option>
        ))}
      </select>

      {/* B-044 pede que filtro ativo seja visivelmente distinto. A borda
          escurecida nos campos cobre parte disso; este botao deixa
          explicito que ha filtro e como remove-lo. */}
      {temFiltro && (
        <button
          type="button"
          onClick={() => iniciar(() => router.push(caminho))}
          className="h-control-md text-text-secondary hover:bg-surface-hover hover:text-text inline-flex items-center gap-1 rounded-md px-2 text-sm font-medium"
        >
          <X className="size-3.5" aria-hidden />
          Limpar filtros
        </button>
      )}
    </div>
  );
}
