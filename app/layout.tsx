import type { Metadata, Viewport } from "next";
import { Archivo, IBM_Plex_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";
import { SCRIPT_NEON } from "@/app/(sistema)/estatisticas/interruptor-neon";

/* Archivo substitui a Flama do manual — grotesca livre de proporcoes
   proximas, com pesos suficientes para hierarquia densa (Doc 08 §5). */
const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

/* Monoespacada de uso restrito a identificadores. */
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Lure CRM",
  description: "CRM da Lure Consultoria",
  // ⚠️ O manifesto sozinho não basta no iPhone: sem isto o atalho da
  // tela de início abre no Safari com barra de endereço, em vez de em
  // tela cheia. O Android obedece ao manifesto; o iOS ainda depende
  // destas meta tags antigas.
  appleWebApp: {
    capable: true,
    title: "Lure",
    statusBarStyle: "black-translucent",
  },
};

/* A barra de status do celular acompanha o tema, em vez de ficar branca
   sobre um aplicativo escuro. */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#171717" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${archivo.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Restaura o brilho antes da primeira pintura, senão os
            gráficos acendem um quadro depois — piscar assim é pior
            que não ter o recurso. */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_NEON }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
