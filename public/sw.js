/**
 * Service worker do Lure CRM — só o que o push exige.
 *
 * ⚠️ Este arquivo NÃO faz cache de nada, e é de propósito. Um service
 * worker que serve páginas do cache transforma "atualizei o sistema" em
 * "algumas pessoas continuam vendo o de ontem, e não dá para saber
 * quem". Num CRM interno com um deploy só, isso é risco sem
 * contrapartida: o ganho seria abrir offline, e o sistema não funciona
 * offline de qualquer forma — todo dado vem do banco.
 *
 * Ele existe por um motivo único: com o aplicativo FECHADO, o navegador
 * precisa de algum código vivo para receber o push e desenhar a
 * notificação. É esse código.
 *
 * ⚠️ Não use `import` aqui. Service worker clássico não é módulo, e
 * qualquer sintaxe de módulo faz o registro falhar em silêncio.
 */

/* Assume o controle sem esperar a aba antiga fechar. Sem isto, uma
   versão nova do arquivo só passa a valer no próximo dia. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (evento) => evento.waitUntil(self.clients.claim()));

/**
 * Chegou um push.
 *
 * ⚠️ `tag` fixa é o que impede empilhar. Sem ela, cada envio vira uma
 * linha nova na gaveta de notificações e o celular acumula dez avisos
 * dizendo quase a mesma coisa. Com ela, o aviso novo SUBSTITUI o
 * anterior — que é o comportamento certo para um contador que muda.
 */
self.addEventListener("push", (evento) => {
  let dados = {};
  try {
    dados = evento.data ? evento.data.json() : {};
  } catch {
    dados = { corpo: evento.data ? evento.data.text() : "" };
  }

  const titulo = dados.titulo || "Lure CRM";
  const opcoes = {
    body: dados.corpo || "Você tem pendências no CRM.",
    icon: "/icone-192.png",
    badge: "/icone-192.png",
    tag: "lure-pendencias",
    renotify: true,
    lang: "pt-BR",
    data: { destino: dados.destino || "/notificacoes" },
    // Vibração curta. Alerta de trabalho não precisa de alarme.
    vibrate: [80, 40, 80],
  };

  evento.waitUntil(self.registration.showNotification(titulo, opcoes));
});

/**
 * Tocou na notificação.
 *
 * ⚠️ Reaproveita uma janela já aberta em vez de abrir outra. Abrir
 * sempre nova deixa o celular com quatro abas do CRM depois de uma
 * semana — e o usuário perde onde estava.
 */
self.addEventListener("notificationclick", (evento) => {
  evento.notification.close();
  const destino = (evento.notification.data && evento.notification.data.destino) || "/";

  evento.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((janelas) => {
        for (const j of janelas) {
          if ("focus" in j) {
            if ("navigate" in j) j.navigate(destino);
            return j.focus();
          }
        }
        return self.clients.openWindow(destino);
      }),
  );
});

/**
 * O serviço de push pode trocar o endereço do aparelho sozinho.
 *
 * ⚠️ Quando isso acontece, a inscrição guardada no banco vira lixo e a
 * pessoa simplesmente para de receber, sem erro em lugar nenhum. Aqui a
 * inscrição nova é reenviada para o servidor.
 */
self.addEventListener("pushsubscriptionchange", (evento) => {
  evento.waitUntil(
    self.registration.pushManager
      .subscribe(evento.oldSubscription ? evento.oldSubscription.options : undefined)
      .then((nova) =>
        fetch("/api/inscricao-push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nova: nova.toJSON(),
            antiga: evento.oldSubscription ? evento.oldSubscription.endpoint : null,
          }),
        }),
      )
      .catch(() => {
        /* Sem sessão não dá para regravar; a próxima abertura conserta. */
      }),
  );
});
