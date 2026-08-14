import type { ReactNode } from "react";
import Link from "next/link";
import { Navegacao } from "@/components/dominio/navegacao";
import { BotaoSair } from "@/components/dominio/botao-sair";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/lib/supabase/server";

/**
 * Moldura das telas autenticadas.
 *
 * Grupo de rotas `(sistema)`: os parenteses nao entram na URL, entao
 * /negocios continua sendo /negocios. Serve so para separar o que tem
 * esta moldura do que nao tem — /login nao tem.
 *
 * Quem barra o acesso e o proxy.ts, antes daqui. A leitura de usuario
 * abaixo e para exibir quem esta logado, nao para autorizar: a
 * autorizacao de verdade mora nas politicas do banco.
 */
export default async function LayoutSistema({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="bg-background flex min-h-svh">
      <aside className="bg-surface border-border hidden w-56 shrink-0 flex-col border-r md:flex">
        <div className="border-border flex h-14 items-center border-b px-4">
          <Link href="/negocios" className="flex items-center gap-2">
            {/* Marca em texto ate os vetores do logotipo chegarem (P-024). */}
            <span className="bg-brand text-brand-on grid size-6 place-items-center rounded-sm text-sm font-bold">
              L
            </span>
            <span className="text-md font-semibold tracking-tight">
              CRM Lure
            </span>
          </Link>
        </div>
        <Navegacao />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-surface border-border sticky top-0 z-30 flex h-14 shrink-0 items-center justify-end gap-2 border-b px-4">
          {user?.email && (
            <span className="text-text-muted mr-1 hidden truncate text-sm sm:block">
              {user.email}
            </span>
          )}
          <ThemeToggle />
          <BotaoSair />
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
