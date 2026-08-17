"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { UsuarioComFoto } from "@/components/dominio/avatar-usuario";

export type Usuario = { id: string; nome: string; foto_url: string | null };

/**
 * Seletor de responsavel com foto.
 *
 * Nao da para usar <select>: elemento nativo so aceita texto nas opcoes,
 * e o pedido era ver o rosto. Entao e um botao com lista propria — leve o
 * bastante para nao merecer dependencia nova, e com o que a lista nativa
 * daria de graca reposto a mao: fecha no Esc, fecha ao clicar fora, e o
 * estado continua morando na URL como nos outros filtros.
 */
export function SeletorResponsavel({
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
