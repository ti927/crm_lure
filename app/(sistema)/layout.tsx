import type { ReactNode } from "react";
import Link from "next/link";
import { Navegacao } from "@/components/dominio/navegacao";
import { BotaoSair } from "@/components/dominio/botao-sair";
import { LogoLure } from "@/components/dominio/marca";
import { RodapeSistema } from "@/components/dominio/rodape-sistema";
import { MenuMobile } from "@/components/dominio/menu-mobile";
import { ProgressoNavegacao } from "@/components/dominio/progresso-navegacao";
import { ProvedorAvisos } from "@/components/dominio/avisos";
import { Sino } from "@/components/dominio/sino";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/lib/supabase/server";
import type { Notificacao } from "@/lib/notificacoes";

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
  const [{ data: sessao }, { data: alertas }] = await Promise.all([
    supabase.auth.getUser(),
    // F8 — os alertas são DERIVADOS na leitura (D-124), sem agendador:
    // esta é a consulta que os calcula. Custa ~12 ms no banco, e sai numa
    // ida só porque a latência do pooler (~150 ms por viagem) é a
    // restrição real, não o custo da consulta (Doc 15 §2.1).
    //
    // ⚠️ Buscar aqui, e não dentro do sino, é o que evita o piscar: o
    // número já chega junto com a tela. O preço é que o layout só volta a
    // consultar numa navegação completa — coerente com a D-124, que diz
    // que o alerta aparece quando alguém abre o sistema.
    supabase.rpc("notificacoes"),
  ]);
  const user = sessao.user;
  const notificacoes = (alertas ?? []) as Notificacao[];

  return (
    // Coluna externa: a linha [sidebar + conteúdo] ocupa a altura, e o
    // rodapé fica fixo no pé. O `min-h-0` na linha é o que deixa as telas
    // com rolagem interna encolherem em vez de empurrar o rodapé para fora.
    <ProvedorAvisos>
      <div className="bg-background flex min-h-svh flex-col">
        <ProgressoNavegacao />
        <div className="flex min-h-0 flex-1">
          <aside className="bg-surface border-border hidden w-56 shrink-0 flex-col border-r md:flex">
            <div className="border-border flex h-14 items-center border-b px-4">
              {/* P-024 encerrada: os vetores da marca chegaram (handoff BR/BAUEN). */}
              <Link href="/negocios" aria-label="Lure CRM — início">
                <LogoLure />
              </Link>
            </div>
            <Navegacao />
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="bg-surface border-border sticky top-0 z-30 flex h-14 shrink-0 items-center justify-end gap-2 border-b px-4">
              {/* No celular a sidebar some; a mesma navegação volta como
                gaveta por este botão. */}
              <MenuMobile />
              {user?.email && (
                <span className="text-text-muted mr-1 hidden truncate text-sm sm:block">
                  {user.email}
                </span>
              )}
              {/* ⚠️ Só DADOS atravessam para cá: `notificacoes` é um
                  array de objetos simples. Nenhum manipulador, nenhum
                  formatador — este é o layout, e um erro de serialização
                  aqui derruba todas as telas de uma vez (C-06/C-09/C-10). */}
              <Sino notificacoes={notificacoes} />
              <ThemeToggle />
              <BotaoSair />
            </header>

            <main className="min-w-0 flex-1">{children}</main>
          </div>
        </div>

        <RodapeSistema />
      </div>
    </ProvedorAvisos>
  );
}
