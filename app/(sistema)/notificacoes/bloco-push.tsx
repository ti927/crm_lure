"use client";

import { useEffect, useState, useTransition } from "react";
import { Smartphone, BellRing, BellOff, Share } from "lucide-react";
import { salvarInscricao, removerInscricao } from "./acoes-push";
import { useAviso } from "@/components/dominio/avisos";

/**
 * D-144 — aceitar (ou recusar) push neste aparelho.
 *
 * ⚠️ A inscrição é POR APARELHO, não por pessoa, e a tela diz isso. É a
 * primeira coisa que confunde: aceitar no computador não faz o celular
 * receber. Guardar por aparelho é o único jeito, porque o endereço de
 * push é emitido pelo navegador de cada um.
 *
 * ⚠️ No iPhone, push só funciona DEPOIS que o app está na tela de
 * início. No Safari comum o `PushManager` sequer existe — daí o aviso
 * específico em vez de um botão que falharia sem explicação.
 */

type Estado =
  | { fase: "carregando" }
  | { fase: "indisponivel"; motivo: string }
  | { fase: "precisa-instalar" }
  | { fase: "bloqueado" }
  | { fase: "desligado" }
  | { fase: "ligado"; endpoint: string };

/**
 * A chave pública vem em base64url e o navegador quer bytes.
 *
 * ⚠️ Devolve ArrayBuffer, e não Uint8Array, porque o TypeScript novo
 * distingue Uint8Array<ArrayBuffer> de Uint8Array<SharedArrayBuffer> e
 * `applicationServerKey` só aceita o primeiro.
 */
function paraBytes(base64url: string): ArrayBuffer {
  const base64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const bruto = atob(base64);
  const bytes = new Uint8Array(bruto.length);
  for (let i = 0; i < bruto.length; i++) bytes[i] = bruto.charCodeAt(i);
  return bytes.buffer;
}

function nomeDoAparelho(): string {
  const ua = navigator.userAgent;
  const sistema = /iphone|ipad|ipod/i.test(ua)
    ? "iPhone"
    : /android/i.test(ua)
      ? "Android"
      : /mac/i.test(ua)
        ? "Mac"
        : /windows/i.test(ua)
          ? "Windows"
          : "Aparelho";
  const navegador = /edg\//i.test(ua)
    ? "Edge"
    : /chrome|crios/i.test(ua)
      ? "Chrome"
      : /firefox|fxios/i.test(ua)
        ? "Firefox"
        : /safari/i.test(ua)
          ? "Safari"
          : "navegador";
  return `${sistema} · ${navegador}`;
}

export function BlocoPush({ chavePublica }: { chavePublica: string }) {
  const avisar = useAviso();
  const [estado, setEstado] = useState<Estado>({ fase: "carregando" });
  const [salvando, iniciar] = useTransition();

  useEffect(() => {
    let vivo = true;

    (async () => {
      if (!chavePublica) {
        if (vivo) setEstado({ fase: "indisponivel", motivo: "chave-ausente" });
        return;
      }
      if (!("serviceWorker" in navigator) || !("Notification" in window)) {
        if (vivo) setEstado({ fase: "indisponivel", motivo: "navegador" });
        return;
      }
      // iPhone fora da tela de início: PushManager não existe.
      if (!("PushManager" in window)) {
        const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
        if (vivo) {
          setEstado(ios ? { fase: "precisa-instalar" } : { fase: "indisponivel", motivo: "navegador" });
        }
        return;
      }
      if (Notification.permission === "denied") {
        if (vivo) setEstado({ fase: "bloqueado" });
        return;
      }

      const registro = await navigator.serviceWorker.register("/sw.js");
      const atual = await registro.pushManager.getSubscription();
      if (!vivo) return;
      setEstado(atual ? { fase: "ligado", endpoint: atual.endpoint } : { fase: "desligado" });
    })().catch(() => {
      if (vivo) setEstado({ fase: "indisponivel", motivo: "falha" });
    });

    return () => {
      vivo = false;
    };
  }, [chavePublica]);

  async function ligar() {
    try {
      const permissao = await Notification.requestPermission();
      if (permissao !== "granted") {
        setEstado(permissao === "denied" ? { fase: "bloqueado" } : { fase: "desligado" });
        return;
      }
      const registro = await navigator.serviceWorker.ready;
      const inscricao = await registro.pushManager.subscribe({
        // Exigido pelos navegadores: push silencioso não é permitido.
        userVisibleOnly: true,
        applicationServerKey: paraBytes(chavePublica),
      });

      const bruto = inscricao.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };

      iniciar(async () => {
        const r = await salvarInscricao(bruto, nomeDoAparelho());
        if (r?.erro) {
          await inscricao.unsubscribe();
          avisar(r.erro, "erro");
          setEstado({ fase: "desligado" });
          return;
        }
        setEstado({ fase: "ligado", endpoint: bruto.endpoint });
        avisar("Este aparelho vai receber avisos.");
      });
    } catch (e) {
      avisar(e instanceof Error ? e.message : "Não foi possível ativar.", "erro");
    }
  }

  async function desligar() {
    const registro = await navigator.serviceWorker.ready;
    const inscricao = await registro.pushManager.getSubscription();
    const endpoint = inscricao?.endpoint;
    if (inscricao) await inscricao.unsubscribe();
    setEstado({ fase: "desligado" });
    if (endpoint) {
      iniciar(async () => {
        const r = await removerInscricao(endpoint);
        if (r?.erro) avisar(r.erro, "erro");
      });
    }
  }

  return (
    <section className="border-border bg-surface rounded-md border p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-md font-semibold">
            <Smartphone className="text-text-muted size-4" aria-hidden />
            Avisar neste aparelho
          </h2>
          <p className="text-text-secondary mt-1 text-sm">
            Manda um aviso para o celular quando aparecer pendência nova, mesmo com o
            sistema fechado. Um aviso por vez, agrupado — nunca um por item.
          </p>
        </div>

        {estado.fase === "ligado" && (
          <button
            type="button"
            disabled={salvando}
            onClick={() => void desligar()}
            className="h-control-md border-border text-text-secondary hover:bg-surface-hover hover:text-text inline-flex shrink-0 items-center gap-1.5 rounded-md border px-3 text-sm font-medium"
          >
            <BellOff className="size-4" aria-hidden />
            Desligar
          </button>
        )}

        {estado.fase === "desligado" && (
          <button
            type="button"
            disabled={salvando}
            onClick={() => void ligar()}
            className="h-control-md bg-brand text-brand-on hover:bg-brand-hover active:bg-brand-active inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 text-sm font-semibold"
          >
            <BellRing className="size-4" aria-hidden />
            Ativar
          </button>
        )}
      </div>

      {estado.fase === "ligado" && (
        <p className="text-success-ink mt-3 text-sm">
          Ativo neste aparelho. Aceitar aqui não vale para os outros — cada celular e cada
          computador precisa ser ativado uma vez.
        </p>
      )}

      {estado.fase === "precisa-instalar" && (
        <p className="text-text-secondary mt-3 text-sm">
          No iPhone, o aviso só funciona depois que o CRM está na tela de início. Toque em{" "}
          <Share className="mx-0.5 inline size-3.5 align-[-2px]" aria-label="Compartilhar" /> e
          depois em <strong className="font-semibold">Adicionar à Tela de Início</strong>; abra o
          CRM por lá e volte aqui.
        </p>
      )}

      {estado.fase === "bloqueado" && (
        <p className="text-warning-ink mt-3 text-sm">
          As notificações estão bloqueadas para este site nas configurações do navegador. O
          sistema não consegue reverter isso sozinho — precisa ser liberado por lá.
        </p>
      )}

      {estado.fase === "indisponivel" && (
        <p className="text-text-muted mt-3 text-sm">
          {estado.motivo === "chave-ausente"
            ? "Falta configurar a chave de envio no servidor."
            : "Este navegador não sabe receber avisos."}
        </p>
      )}
    </section>
  );
}
