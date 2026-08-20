"use client";

import { useEffect, useState } from "react";
import { Share, Plus, X, Smartphone } from "lucide-react";

/**
 * Convite para pôr o CRM na tela de início do celular.
 *
 * ⚠️ Só aparece no celular, só fora do modo aplicativo e só uma vez —
 * quem dispensa não é perguntado de novo. Faixa que reaparece toda visita
 * deixa de ser convite e vira obstáculo.
 *
 * ⚠️ Android e iPhone precisam de caminhos diferentes, e não é escolha
 * de estilo. O Chrome dispara `beforeinstallprompt` e deixa instalar com
 * um clique; o Safari do iPhone **não implementa esse evento**, e a única
 * via é o usuário fazer à mão por Compartilhar → Adicionar à Tela de
 * Início. Por isso um lado ganha botão e o outro ganha instrução: fingir
 * que os dois são iguais deixaria metade da equipe com um botão que não
 * faz nada.
 */

/** O evento do Chrome não está no lib.dom padrão. */
type EventoInstalacao = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const CHAVE = "lure:convite-instalar-dispensado";

/** `null` = não convidar. Um estado só, para não cascatear renderização. */
type Convite = { tipo: "ios" } | { tipo: "android"; evento: EventoInstalacao } | null;

export function ConviteInstalar() {
  const [convite, setConvite] = useState<Convite>(null);

  useEffect(() => {
    // Já está rodando como aplicativo instalado: nada a convidar.
    const instalado =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS não implementa display-mode e usa esta propriedade própria.
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (instalado) return;

    if (localStorage.getItem(CHAVE)) return;

    // Toque grosso é o sinal de celular/tablet que não depende de ler o
    // user agent, que mente por padrão desde que os navegadores passaram
    // a mascará-lo.
    if (!window.matchMedia("(pointer: coarse)").matches) return;

    if (/iphone|ipad|ipod/i.test(window.navigator.userAgent)) {
      // ⚠️ Exceção consciente à regra de não chamar setState direto no
      // efeito. O Safari do iPhone não tem evento nenhum para assinar —
      // `beforeinstallprompt` simplesmente não existe lá —, então a
      // única informação disponível é o ambiente, e ele só pode ser lido
      // depois da montagem: fazer isto na renderização quebraria a
      // hidratação, porque no servidor não há `window`. É uma
      // renderização extra, uma vez por sessão.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setConvite({ tipo: "ios" });
      return;
    }

    // Android/Chrome: aqui há um sistema externo de verdade para assinar.
    const aoPoder = (e: Event) => {
      // Sem isto o Chrome mostra a própria barra, e ficam duas.
      e.preventDefault();
      setConvite({ tipo: "android", evento: e as EventoInstalacao });
    };
    window.addEventListener("beforeinstallprompt", aoPoder);
    return () => window.removeEventListener("beforeinstallprompt", aoPoder);
  }, []);

  function dispensar() {
    localStorage.setItem(CHAVE, "1");
    setConvite(null);
  }

  async function instalar() {
    if (convite?.tipo !== "android") return;
    await convite.evento.prompt();
    await convite.evento.userChoice;
    // Aceitou ou recusou, o evento não pode ser reusado — e insistir
    // depois de um "não" é o começo do banner que todo mundo odeia.
    localStorage.setItem(CHAVE, "1");
    setConvite(null);
  }

  if (!convite) return null;
  const ehIOS = convite.tipo === "ios";

  return (
    <div
      role="complementary"
      aria-label="Instalar o Lure CRM no celular"
      className="border-border bg-surface animate-in slide-in-from-bottom-2 fade-in fixed inset-x-2 bottom-2 z-50 rounded-md border p-3 shadow-lg duration-300 md:hidden"
    >
      <div className="flex items-start gap-3">
        <Smartphone className="text-text-muted mt-0.5 size-5 shrink-0" aria-hidden />

        <div className="min-w-0 flex-1">
          <p className="text-md font-semibold">Deixe o CRM na tela de início</p>

          {ehIOS ? (
            <p className="text-text-secondary mt-1 text-sm">
              Toque em{" "}
              <Share className="mx-0.5 inline size-3.5 align-[-2px]" aria-label="Compartilhar" />{" "}
              e depois em <strong className="font-semibold">Adicionar à Tela de Início</strong>.
              O atalho abre direto nos Contatos.
            </p>
          ) : (
            <p className="text-text-secondary mt-1 text-sm">
              Abre direto nos Contatos, em tela cheia e sem barra de endereço.
            </p>
          )}

          {!ehIOS && (
            <button
              type="button"
              onClick={() => void instalar()}
              className="h-control-md bg-brand text-brand-on hover:bg-brand-hover active:bg-brand-active mt-2.5 inline-flex items-center gap-1.5 rounded-md px-3 text-sm font-semibold"
            >
              <Plus className="size-4" aria-hidden />
              Adicionar
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={dispensar}
          aria-label="Dispensar"
          className="hover:bg-surface-hover text-text-muted hover:text-text -mr-1 -mt-1 inline-flex size-8 shrink-0 items-center justify-center rounded"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
