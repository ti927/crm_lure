"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label="Alternar entre tema claro e escuro"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {/* Os dois icones vao no HTML e o CSS escolhe qual aparece. O tema
          resolvido so existe no navegador; decidir em JavaScript exigiria
          esperar a montagem, e o servidor renderizaria um icone diferente
          do cliente. Aqui nao ha o que divergir. */}
      <Moon className="dark:hidden" />
      <Sun className="hidden dark:block" />
    </Button>
  );
}
