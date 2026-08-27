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
import { ConviteInstalar } from "@/components/dominio/convite-instalar";
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
    // Coluna externa: a linha [sidebar + conteúdo] ocupa a altura que
    // sobra, e o rodapé fecha a página embaixo dela, atravessando a
    // largura inteira (ver a nota lá embaixo).
    //
    // ⚠️ `h-svh`, e não `min-h-svh`. A diferença não é estética: com
    // `min-h`, esta coluna CRESCE com o conteúdo e nenhum descendente tem
    // altura definida — então o `h-full` que todas as telas de lista usam
    // não resolve contra nada, as colunas do Kanban esticam até caber
    // tudo, a página fica mais alta que a janela e a barra de rolagem
    // horizontal vai parar abaixo da dobra. Era preciso rolar para baixo
    // para descobrir que havia mais coluna para o lado.
    //
    // Com `h-svh` a moldura passa a ser exatamente a janela, e cada tela
    // rola por dentro — que é como elas já estavam escritas desde a F3.
    <ProvedorAvisos>
      <div className="bg-background flex h-svh flex-col overflow-hidden">
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

            {/* ⚠️ `min-h-0` é o que permite este bloco ENCOLHER dentro do
                flex: sem ele, um filho alto empurra o container e o
                `overflow` nunca dispara. `rolagem-visivel` cobre as telas
                que rolam aqui em vez de por dentro — Estatísticas e
                Notificações. */}
            <main className="rolagem-visivel min-h-0 min-w-0 flex-1 overflow-auto">
              {children}
            </main>
          </div>
        </div>

        {/* ⚠️ O RODAPÉ MORA AQUI: na coluna externa, depois da linha
            [sidebar + conteúdo]. Atravessa a largura inteira, por baixo
            da sidebar — rodapé de página, como em qualquer site.

            ⚠️ Isto REVOGA a D-146, que o tinha posto dentro do `main`
            para ele rolar com o conteúdo e devolver ~41px a toda tela. O
            preço daquilo não estava no documento: com o rodapé lá
            dentro, as telas de altura cheia (Lista, Kanban, Contatos)
            passavam a ter DUAS rolagens — a de dentro, e mais 41px da
            página inteira. Esses 41px foram a segunda causa da C-12: eles
            levavam os rótulos das etapas do Kanban para fora da tela. E
            visualmente o rodapé virou parte do painel de cada seção, em
            vez de pé da página.

            Aqui fora, o `main` deixa de transbordar: cada tela tem
            exatamente UMA rolagem, e os 41px voltam a ser custo fixo
            declarado em vez de rolagem fantasma. Encerra a P-049. */}
        <RodapeSistema />

        {/* Convite para a tela de inicio. So no celular, so fora do modo
            aplicativo, e so uma vez — ver o componente. */}
        <ConviteInstalar />
      </div>
    </ProvedorAvisos>
  );
}
