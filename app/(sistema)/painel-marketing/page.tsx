/**
 * Painel de marketing digital — o "Painel Lure", projeto à parte no
 * Vercel, exibido aqui dentro por pedido do maestro (18/10/2026).
 *
 * ⚠️ É SÓ EXIBIÇÃO. O CRM não lê nem grava nada do painel: a página é uma
 * janela para outro site, que tem seus próprios dados e seu próprio
 * deploy. Se o painel mudar de endereço, é aqui que se troca.
 *
 * ⚠️ O tema do painel segue o do sistema operacional, não o botão de
 * tema do CRM — são origens diferentes e uma não alcança a outra.
 */
const ENDERECO_PAINEL = "https://painel-lure.vercel.app";

export default function PaginaPainelMarketing() {
  return (
    // `h-full` resolve contra o `main` do layout, que tem altura definida
    // (h-svh na moldura) — o mesmo truque das telas de lista.
    <div className="h-full">
      <iframe
        src={ENDERECO_PAINEL}
        title="Painel de marketing"
        className="block h-full w-full border-0"
      />
    </div>
  );
}
