"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Navegacao } from "@/components/dominio/navegacao";
import { LogoLure } from "@/components/dominio/marca";

/**
 * A mesma navegação lateral, como painel deslizante no celular.
 *
 * A sidebar é `hidden md:flex` — no celular ela simplesmente não existia,
 * e não havia como trocar de seção. Aqui ela volta pelo mesmo componente
 * `Navegacao` (uma lista só, sem cópia), aberta por um botão no cabeçalho.
 * A decisão de manter a navegação na lateral continua valendo: no celular
 * a lateral vira gaveta, não barra superior.
 */
export function MenuMobile() {
  const [aberto, setAberto] = useState(false);

  // Trava a rolagem do fundo enquanto a gaveta está aberta, senão o dedo
  // arrasta a lista de trás em vez do painel.
  useEffect(() => {
    if (!aberto) return;
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const naTecla = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("keydown", naTecla);
    return () => {
      document.body.style.overflow = antes;
      document.removeEventListener("keydown", naTecla);
    };
  }, [aberto]);

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        aria-label="Abrir menu"
        aria-expanded={aberto}
        className="hover:bg-surface-hover -ml-1 mr-auto inline-flex size-9 items-center justify-center rounded-md md:hidden"
      >
        <Menu className="size-5" aria-hidden />
      </button>

      {aberto && (
        <div
          className="fixed inset-0 z-50 bg-black/50 md:hidden"
          onMouseDown={(e) => e.target === e.currentTarget && setAberto(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navegação"
            className="bg-surface border-border animate-in slide-in-from-left flex h-full w-64 max-w-[80%] flex-col border-r duration-200"
          >
            <div className="border-border flex h-14 shrink-0 items-center justify-between border-b px-4">
              <LogoLure />
              <button
                type="button"
                onClick={() => setAberto(false)}
                aria-label="Fechar menu"
                className="hover:bg-surface-hover -mr-1 inline-flex size-8 items-center justify-center rounded-md"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
            {/* Fecha ao escolher um destino: no celular a gaveta cobre a
                tela, e deixá-la aberta esconderia a página recém-aberta. */}
            <Navegacao aoNavegar={() => setAberto(false)} />
          </div>
        </div>
      )}
    </>
  );
}
