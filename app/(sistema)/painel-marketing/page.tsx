/**
 * Painel de marketing digital — o "Painel Lure", projeto à parte no
 * Vercel, exibido aqui dentro por pedido do maestro (D-171).
 *
 * ⚠️ É SÓ EXIBIÇÃO. O CRM não lê nem grava nada do painel: a página é uma
 * janela para outro site, que tem seus próprios dados e seu próprio
 * deploy.
 *
 * ⚠️ O ENDEREÇO NÃO MORA NO CÓDIGO. Desde 18/10 o painel responde num
 * caminho que funciona como senha (a raiz dá 404), e este repositório é
 * público (D-114): escrito aqui, qualquer um no GitHub o leria. Ele vem
 * de `PAINEL_MARKETING_URL`, só no servidor e nas variáveis da Vercel.
 * Sem prefixo NEXT_PUBLIC_, e de propósito: o endereço só chega ao HTML
 * de quem já passou pelo login do CRM.
 *
 * ⚠️ A página é estática: a variável é lida no build. Trocou o endereço
 * na Vercel, faça um novo deploy.
 *
 * ⚠️ O tema do painel segue o do sistema operacional, não o botão de
 * tema do CRM — são origens diferentes e uma não alcança a outra.
 */
export default function PaginaPainelMarketing() {
  const endereco = process.env.PAINEL_MARKETING_URL;

  if (!endereco) {
    return (
      <p className="text-text-muted p-6 text-sm">
        O endereço do painel não está configurado (PAINEL_MARKETING_URL).
      </p>
    );
  }

  return (
    // `h-full` resolve contra o `main` do layout, que tem altura definida
    // (h-svh na moldura) — o mesmo truque das telas de lista.
    <div className="h-full">
      <iframe
        src={endereco}
        title="Painel de marketing"
        className="block h-full w-full border-0"
      />
    </div>
  );
}
