"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

/**
 * Campo de busca que filtra enquanto se digita.
 *
 * Antes era um `<form>` que só buscava no Enter — quem digitava e olhava
 * para a lista ficava esperando por algo que não vinha. Agora a busca sai
 * sozinha 350ms depois da última tecla: tempo suficiente para não disparar
 * uma consulta por letra, curto o bastante para parecer imediato.
 *
 * A tecla `/` põe o foco aqui de qualquer lugar da tela, como em quase
 * todo sistema de lista — menos a mão saindo do teclado. `Esc` limpa.
 */
export function CampoBusca({
  valor,
  aoBuscar,
  placeholder,
  className = "",
}: {
  valor: string;
  aoBuscar: (termo: string) => void;
  placeholder: string;
  className?: string;
}) {
  const [texto, setTexto] = useState(valor);
  const campo = useRef<HTMLInputElement>(null);

  /* O valor que veio da URL. Serve de referência para dois fins: saber
     que a mudança veio de fora (voltar do navegador, trocar de aba) e
     não disparar busca do que já está na tela. Ajustado durante o render,
     e não por efeito — é o padrão que o React recomenda para estado que
     acompanha uma prop, e evita o repique de uma renderização extra. */
  const [valorDaUrl, setValorDaUrl] = useState(valor);
  if (valor !== valorDaUrl) {
    setValorDaUrl(valor);
    setTexto(valor);
  }

  useEffect(() => {
    if (texto === valorDaUrl) return;
    const t = setTimeout(() => aoBuscar(texto.trim()), 350);
    return () => clearTimeout(t);
  }, [texto, valorDaUrl, aoBuscar]);

  // Atalho `/` — ignorado quando já se está digitando em outro campo.
  useEffect(() => {
    function naTecla(e: KeyboardEvent) {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const alvo = e.target as HTMLElement | null;
      const digitando =
        alvo?.tagName === "INPUT" ||
        alvo?.tagName === "TEXTAREA" ||
        alvo?.tagName === "SELECT" ||
        alvo?.isContentEditable;
      if (digitando) return;
      e.preventDefault();
      campo.current?.focus();
    }
    document.addEventListener("keydown", naTecla);
    return () => document.removeEventListener("keydown", naTecla);
  }, []);

  return (
    <div className={`relative ${className}`}>
      <Search
        className="text-text-muted pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2"
        aria-hidden
      />
      <input
        ref={campo}
        type="text"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && texto) {
            e.preventDefault();
            setTexto("");
          }
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-control-md bg-surface border-border text-md w-full rounded-md border pl-8 pr-8"
      />
      {texto && (
        <button
          type="button"
          onClick={() => {
            setTexto("");
            campo.current?.focus();
          }}
          aria-label="Limpar busca"
          className="text-text-muted hover:text-text absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      )}
    </div>
  );
}
