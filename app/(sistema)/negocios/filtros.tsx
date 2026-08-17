"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Search, X, ChevronDown, Check } from "lucide-react";
import { UsuarioComFoto } from "@/components/dominio/avatar-usuario";

type Etapa = { id: string; nome: string; ordem: number };
type Usuario = { id: string; nome: string; foto_url: string | null };

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
export function Filtros({
  etapas,
  usuarios,
}: {
  etapas: Etapa[];
  usuarios: Usuario[];
}) {
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
  const responsavel = params.get("responsavel") ?? "";
  const temFiltro = Boolean(busca || status || etapa || responsavel);

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

      <SeletorResponsavel
        usuarios={usuarios}
        escolhido={responsavel}
        aoEscolher={(id) => aplicar("responsavel", id)}
        classe={campo}
      />

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

/**
 * Seletor de responsavel com foto.
 *
 * Nao da para usar <select>: elemento nativo so aceita texto nas opcoes,
 * e o pedido era ver o rosto. Entao e um botao com lista propria — leve o
 * bastante para nao merecer dependencia nova, e com o que a lista nativa
 * daria de graca reposto a mao: fecha no Esc, fecha ao clicar fora, e o
 * estado continua morando na URL como nos outros filtros.
 */
function SeletorResponsavel({
  usuarios,
  escolhido,
  aoEscolher,
  classe,
}: {
  usuarios: Usuario[];
  escolhido: string;
  aoEscolher: (id: string) => void;
  classe: string;
}) {
  const [aberto, abrir] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);
  const atual = usuarios.find((u) => u.id === escolhido);

  useEffect(() => {
    if (!aberto) return;

    const foraOuEsc = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent) {
        if (e.key === "Escape") abrir(false);
        return;
      }
      if (!caixa.current?.contains(e.target as Node)) abrir(false);
    };

    document.addEventListener("mousedown", foraOuEsc);
    document.addEventListener("keydown", foraOuEsc);
    return () => {
      document.removeEventListener("mousedown", foraOuEsc);
      document.removeEventListener("keydown", foraOuEsc);
    };
  }, [aberto]);

  function escolher(id: string) {
    abrir(false);
    aoEscolher(id);
  }

  return (
    <div className="relative" ref={caixa}>
      <button
        type="button"
        onClick={() => abrir(!aberto)}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-label="Filtrar por responsável"
        className={`${classe} ${
          escolhido ? "border-brand-ink font-medium" : ""
        } flex items-center gap-2`}
      >
        {atual ? (
          <UsuarioComFoto nome={atual.nome} foto={atual.foto_url} tamanho="sm" />
        ) : (
          <span className="text-text">Todos os responsáveis</span>
        )}
        <ChevronDown className="text-text-muted size-3.5 shrink-0" aria-hidden />
      </button>

      {aberto && (
        <ul
          role="listbox"
          className="border-border bg-surface absolute right-0 z-20 mt-1 max-h-80 w-60 overflow-y-auto rounded-md border p-1 shadow-lg"
        >
          <li>
            <button
              type="button"
              role="option"
              aria-selected={!escolhido}
              onClick={() => escolher("")}
              className="hover:bg-surface-hover text-md flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left"
            >
              Todos os responsáveis
              {!escolhido && <Check className="size-3.5 shrink-0" aria-hidden />}
            </button>
          </li>
          {usuarios.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                role="option"
                aria-selected={u.id === escolhido}
                onClick={() => escolher(u.id)}
                className="hover:bg-surface-hover text-md flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left"
              >
                <UsuarioComFoto nome={u.nome} foto={u.foto_url} tamanho="sm" />
                {u.id === escolhido && (
                  <Check className="size-3.5 shrink-0" aria-hidden />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
