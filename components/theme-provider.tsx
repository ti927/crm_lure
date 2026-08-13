"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/* D-091: os dois temas, alternaveis por botao. `attribute="class"` poe a
   classe `dark` no <html>, que e o gancho do @custom-variant em globals.css.
   `defaultTheme="system"` respeita a preferencia do sistema no primeiro acesso;
   a escolha explicita do usuario passa a valer a partir dai. */
export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
