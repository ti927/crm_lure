/**
 * Marca do Lure CRM (handoff BR/BAUEN, P-024 encerrada em 18/08/2026).
 *
 * O símbolo é o "+" da marca-mãe reconstruído em cinco blocos: quatro
 * braços e um miolo. Os braços seguem a cor do texto (`currentColor`),
 * então o mesmo SVG serve tema claro, escuro e o painel do login sem
 * precisar de variantes — quem define a cor é o container. O **miolo é
 * o único ponto de cor da marca** e é sempre `#ffdd00`, imutável nos dois
 * temas (regra do manual: nunca colorir os braços, nunca tirar o amarelo
 * do miolo).
 *
 * "LURE" e "CRM" são texto vivo em Archivo — acessíveis e nítidos em
 * qualquer tela —, como o handoff recomenda, e não parte do SVG.
 */

export function SimboloLure({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-label="Lure CRM"
      className={className}
    >
      <rect x="18.5" y="3" width="11" height="12.5" rx="1.5" fill="currentColor" />
      <rect x="18.5" y="32.5" width="11" height="12.5" rx="1.5" fill="currentColor" />
      <rect x="3" y="18.5" width="12.5" height="11" rx="1.5" fill="currentColor" />
      <rect x="32.5" y="18.5" width="12.5" height="11" rx="1.5" fill="currentColor" />
      {/* Miolo — único ponto de cor, fixo nos dois temas. */}
      <rect x="18.5" y="18.5" width="11" height="11" rx="1.5" fill="#ffdd00" />
    </svg>
  );
}

/**
 * Assinatura horizontal: símbolo + LURE + chip CRM. Auto-tema — o chip
 * inverte com o fundo (`bg-text`/`text-text-inverse`: escuro no claro,
 * claro no escuro).
 */
export function LogoLure({ className }: { className?: string }) {
  return (
    <span className={`text-text flex items-center gap-2.5 ${className ?? ""}`}>
      <SimboloLure className="size-7 shrink-0" />
      <span className="flex items-center gap-1.5">
        <span className="text-lg font-extrabold leading-none tracking-tight">
          LURE
        </span>
        <ChipCRM />
      </span>
    </span>
  );
}

/** Chip "CRM" — bloco preenchido com o texto invertido em relação ao fundo. */
export function ChipCRM({ className }: { className?: string }) {
  return (
    <span
      className={`bg-text text-text-inverse inline-flex items-center rounded px-1.5 py-1 text-[11px] font-bold leading-none ${className ?? ""}`}
      style={{ letterSpacing: "0.14em" }}
    >
      CRM
    </span>
  );
}
