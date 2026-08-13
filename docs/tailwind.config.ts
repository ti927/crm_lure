import type { Config } from "tailwindcss";

/**
 * LURE CRM — configuração de tema Tailwind.
 * Todos os valores apontam para as variáveis CSS de lure-crm-tokens.css,
 * portanto tema claro/escuro alternam via classe `dark` no <html>.
 * Compatível com shadcn/ui (mantém os nomes background/foreground/primary/…).
 */
const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // --- shadcn/ui bridge ---
        background: "var(--bg)",
        foreground: "var(--text)",
        card: { DEFAULT: "var(--surface)", foreground: "var(--text)" },
        popover: { DEFAULT: "var(--surface)", foreground: "var(--text)" },
        muted: { DEFAULT: "var(--surface-sunken)", foreground: "var(--text-muted)" },
        primary: { DEFAULT: "var(--accent)", foreground: "var(--accent-on)" },
        secondary: { DEFAULT: "var(--surface)", foreground: "var(--text)" },
        destructive: { DEFAULT: "var(--danger)", foreground: "#ffffff" },
        border: "var(--border)",
        input: "var(--border)",
        ring: "var(--focus-ring)",

        // --- neutros ---
        neutral: {
          0: "var(--neutral-0)", 25: "var(--neutral-25)", 50: "var(--neutral-50)",
          100: "var(--neutral-100)", 200: "var(--neutral-200)", 300: "var(--neutral-300)",
          400: "var(--neutral-400)", 500: "var(--neutral-500)", 600: "var(--neutral-600)",
          700: "var(--neutral-700)", 800: "var(--neutral-800)", 900: "var(--neutral-900)",
          950: "var(--neutral-950)", 1000: "var(--neutral-1000)",
        },

        // --- marca ---
        brand: {
          yellow: "var(--brand-yellow)",
          cyan: "var(--brand-cyan)",
          magenta: "var(--brand-magenta)",
          green: "var(--brand-green)",
          olive: "var(--brand-olive)",
          purple: "var(--brand-purple)",
          wine: "var(--brand-wine)",
          "green-dark": "var(--brand-green-dark)",
          // versões seguras para texto/borda
          "yellow-ink": "var(--brand-yellow-ink)",
          "cyan-ink": "var(--brand-cyan-ink)",
          "magenta-ink": "var(--brand-magenta-ink)",
          "green-ink": "var(--brand-green-ink)",
          "olive-ink": "var(--brand-olive-ink)",
        },

        // --- semânticas ---
        success: { DEFAULT: "var(--success)", ink: "var(--success-ink)", bg: "var(--success-bg)" },
        danger: { DEFAULT: "var(--danger)", ink: "var(--danger-ink)", bg: "var(--danger-bg)" },
        warning: { DEFAULT: "var(--warning)", ink: "var(--warning-ink)", bg: "var(--warning-bg)" },
        info: { DEFAULT: "var(--info)", ink: "var(--info-ink)", bg: "var(--info-bg)" },

        // --- domínio: etapas do funil ---
        stage: {
          1: "var(--stage-1)", "1-ink": "var(--stage-1-ink)",
          2: "var(--stage-2)", "2-ink": "var(--stage-2-ink)",
          3: "var(--stage-3)", "3-ink": "var(--stage-3-ink)",
          4: "var(--stage-4)", "4-ink": "var(--stage-4-ink)",
          5: "var(--stage-5)", "5-ink": "var(--stage-5-ink)",
          6: "var(--stage-6)", "6-ink": "var(--stage-6-ink)",
        },

        // --- domínio: status do negócio ---
        status: {
          parado: "var(--status-parado)", "parado-ink": "var(--status-parado-ink)",
          negociacao: "var(--status-negociacao)", "negociacao-ink": "var(--status-negociacao-ink)",
          ganho: "var(--status-ganho)", "ganho-ink": "var(--status-ganho-ink)",
          perdido: "var(--status-perdido)", "perdido-ink": "var(--status-perdido-ink)",
        },
      },

      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },

      fontSize: {
        "2xs": ["var(--text-2xs)", { lineHeight: "var(--lh-2xs)" }],
        xs: ["var(--text-xs)", { lineHeight: "var(--lh-xs)" }],
        sm: ["var(--text-sm)", { lineHeight: "var(--lh-sm)" }],
        base: ["var(--text-base)", { lineHeight: "var(--lh-base)" }],
        md: ["var(--text-md)", { lineHeight: "var(--lh-md)" }],
        lg: ["var(--text-lg)", { lineHeight: "var(--lh-lg)" }],
        xl: ["var(--text-xl)", { lineHeight: "var(--lh-xl)" }],
        "2xl": ["var(--text-2xl)", { lineHeight: "var(--lh-2xl)" }],
        "3xl": ["var(--text-3xl)", { lineHeight: "var(--lh-3xl)" }],
      },

      spacing: {
        0: "var(--space-0)", px: "var(--space-1)", 1: "var(--space-2)", 1.5: "var(--space-3)",
        2: "var(--space-4)", 3: "var(--space-5)", 4: "var(--space-6)", 5: "var(--space-7)",
        6: "var(--space-8)", 8: "var(--space-9)", 10: "var(--space-10)", 14: "var(--space-12)",
      },

      height: {
        "row-compact": "var(--row-h-compact)",
        "row-cozy": "var(--row-h-cozy)",
        "control-sm": "var(--control-h-sm)",
        "control-md": "var(--control-h-md)",
        "control-lg": "var(--control-h-lg)",
      },

      borderRadius: {
        none: "var(--radius-none)",
        sm: "var(--radius-sm)",
        DEFAULT: "var(--radius-md)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        pill: "var(--radius-pill)",
      },

      borderWidth: {
        DEFAULT: "var(--border-w)",
        strong: "var(--border-w-strong)",
        accent: "var(--border-w-accent)",
      },

      boxShadow: {
        none: "var(--shadow-none)",
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        overlay: "var(--shadow-overlay)",
      },

      letterSpacing: { caps: "var(--tracking-caps)" },

      zIndex: {
        dropdown: "var(--z-dropdown)", sticky: "var(--z-sticky)",
        modal: "var(--z-modal)", toast: "var(--z-toast)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
