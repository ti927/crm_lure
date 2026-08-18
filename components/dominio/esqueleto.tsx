/**
 * Esqueletos de carregamento.
 *
 * As telas do sistema são renderizadas no servidor sob demanda: cada
 * navegação espera as consultas ao banco. Sem um estado de carregamento,
 * o Next segura a tela anterior e a troca parece travar. Um `loading.tsx`
 * que devolve um destes esqueletos aparece na hora do clique — o feedback
 * passa a ser imediato, ainda que os dados levem o tempo que levam.
 *
 * A animação `pulse` é desligada por quem pediu `prefers-reduced-motion`
 * (guarda global no globals.css): fica o bloco parado, sem pulsar.
 */

function Barra({ className = "" }: { className?: string }) {
  return <div className={`bg-skeleton animate-pulse rounded ${className}`} />;
}

/** Cabeçalho + linhas — serve Lista de negócios, Atividades e Contatos. */
export function EsqueletoLista() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-border flex items-center justify-between gap-3 border-b px-4 py-3">
        <Barra className="h-6 w-40" />
        <div className="flex gap-2">
          <Barra className="h-8 w-28" />
          <Barra className="h-8 w-28" />
          <Barra className="h-8 w-36" />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-px p-2">
        {Array.from({ length: 14 }).map((_, i) => (
          <Barra key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}

/** Colunas do Kanban. */
export function EsqueletoKanban() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-border flex items-center justify-between gap-3 border-b px-4 py-3">
        <Barra className="h-6 w-32" />
        <Barra className="h-8 w-48" />
      </div>
      <div className="flex flex-1 gap-4 overflow-hidden px-4 py-3">
        {Array.from({ length: 6 }).map((_, c) => (
          <div key={c} className="flex w-72 shrink-0 flex-col gap-2">
            <Barra className="h-6 w-full" />
            {Array.from({ length: 4 }).map((_, i) => (
              <Barra key={i} className="h-20 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Ficha em duas zonas — detalhe do negócio e fichas de contato. */
export function EsqueletoFicha() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-border shrink-0 border-b px-4 py-3">
        <Barra className="mb-2 h-4 w-20" />
        <Barra className="h-7 w-64" />
      </div>
      <div className="grid flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Barra key={i} className="h-8 w-full" />
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Barra key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
