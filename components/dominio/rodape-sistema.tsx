import { SimboloLure } from "@/components/dominio/marca";

/**
 * Rodapé do sistema (handoff BR/BAUEN, footer.html).
 *
 * Fundo sempre escuro nos dois temas — é a âncora de marca no pé da tela,
 * como o design pede. Compacto de propósito: as telas do sistema são
 * densas e a altura é preciosa, então uma faixa fina em vez do rodapé
 * alto do protótipo.
 *
 * Os links de Suporte/Documentação/Privacidade do protótipo ficaram de
 * fora: não há página para eles ainda, e item de menu que leva a lugar
 * nenhum é defeito, não antecipação (mesma regra da navegação lateral).
 * Entram quando as páginas existirem.
 */
export function RodapeSistema() {
  return (
    <footer className="text-neutral-400 flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 bg-neutral-950 px-4 py-2.5">
      <span className="text-neutral-0 flex items-center gap-2">
        <SimboloLure className="size-5 shrink-0" />
        <span className="flex items-center gap-1.5">
          <span className="text-sm font-extrabold leading-none tracking-tight">
            LURE
          </span>
          <span
            className="text-neutral-900 inline-flex items-center rounded bg-neutral-0 px-1 py-0.5 text-[10px] font-bold leading-none"
            style={{ letterSpacing: "0.14em" }}
          >
            CRM
          </span>
        </span>
      </span>

      <span className="text-neutral-500 text-xs">
        Ferramenta interna · Lure Consultoria
      </span>

      <span
        className="text-neutral-600 ml-auto text-xs"
        style={{ fontFamily: "var(--font-plex-mono)" }}
      >
        © 2026 Lure Consultoria
      </span>
    </footer>
  );
}
