import type { MetadataRoute } from "next";

/**
 * Manifesto do aplicativo — o que permite "Adicionar à Tela de Início".
 *
 * ⚠️ `start_url` aponta para a tela de Contatos, e não para a raiz. Foi pedido
 * do maestro em 17/08 e repetido em 20/08: no celular o que se precisa
 * na rua é o telefone do cliente, não o funil. Quem abre pelo ícone da
 * tela de início cai direto na lista de contatos, com busca; quem abre
 * pelo navegador continua caindo em /negocios.
 *
 * ⚠️ `display: standalone` tira a barra de endereço. É o que faz o
 * atalho parecer aplicativo em vez de favorito — e é também o que
 * obriga a navegação interna a funcionar sozinha, porque não há mais
 * botão "voltar" do navegador à vista no iOS.
 *
 * ⚠️ Isto NÃO é notificação push. O manifesto só instala o atalho; o
 * sino continua sendo derivado na leitura (D-124). Ver a P-044 no
 * Doc 15 — push exige um agendador, que é justamente o que a D-124
 * recusou.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lure CRM",
    short_name: "Lure",
    description: "CRM da Lure Consultoria",
    start_url: "/contatos",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "pt-BR",
    dir: "ltr",
    // Preto de base, como o manual da Lure pede. O amarelo é destaque e
    // não vira fundo de tela cheia.
    background_color: "#171717",
    theme_color: "#171717",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icone-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icone-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      // Pressionar e segurar o ícone abre estes atalhos no Android.
      { name: "Contatos", url: "/contatos" },
      { name: "Atividades de hoje", url: "/atividades" },
      { name: "Negócios", url: "/negocios" },
    ],
  };
}
