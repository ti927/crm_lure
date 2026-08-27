import type { ReactNode } from "react";

/**
 * Tabela de dados da Lista e de Contatos.
 *
 * ⚠️ **Não cria rolagem própria, e é isso que importa aqui.** Quem rola é
 * o `main` — a tabela apenas flui dentro dele. Com uma rolagem interna, o
 * `thead` `sticky` grudava no scrollport de DENTRO; bastava o `main`
 * mover-se (ele rola os ~41px do rodapé) para o cabeçalho subir junto e
 * sair da tela. Foi o mesmo defeito dos rótulos do Kanban (C-12), pela
 * mesma causa: `sticky` gruda no scrollport mais próximo, e o de dentro
 * não protege de nada quando é o de fora que se move.
 *
 * Sem rolagem interna há UM scroll só na tela, o cabeçalho gruda no
 * `main` e o rodapé aparece depois da última linha — que é como uma
 * página se comporta.
 *
 * ⚠️ **A virtualização saiu daqui** (`@tanstack/react-virtual`). Ela
 * existia para não montar 50 `<tr>` de uma vez, mas 50 linhas não são
 * problema para o DOM — o que sustenta a R-006 é a **paginação no
 * servidor**, que continua intacta e é quem impede a base inteira de
 * chegar ao navegador. A virtualização exigia um container de rolagem
 * próprio, que é justamente o que causava o defeito acima; e o
 * `useVirtualizer` era também a única coisa que o compilador do React
 * não conseguia memoizar neste projeto.
 *
 * ⚠️ `table-fixed`: sem ele o navegador dimensiona as colunas pelo
 * conteúdo, um título longo empurra a tabela para além da tela e volta a
 * rolagem horizontal — que é o que o pedido desta sessão veio eliminar.
 * As larguras vêm de `COLUNAS` e são percentuais, então continuam
 * somando 100% mesmo quando uma coluna se esconde num breakpoint.
 *
 * As linhas chegam prontas (Server Components), não uma função de
 * renderização: o corpo de cada `<tr>` usa dado que só o servidor tem
 * (formatação, joins), e passar árvore já renderizada por prop é o jeito
 * de hospedar JSX de servidor sem virar cliente também.
 */
export function TabelaDados({
  cabecalho,
  linhas,
}: {
  cabecalho: ReactNode;
  linhas: ReactNode[];
}) {
  return (
    <table className="w-full table-fixed border-collapse text-base">
      {cabecalho}
      <tbody>{linhas}</tbody>
    </table>
  );
}
