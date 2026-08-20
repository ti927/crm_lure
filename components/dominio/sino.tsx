"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Popover } from "radix-ui";
import { Bell, Check, Settings, Undo2 } from "lucide-react";
import {
  TIPOS,
  TIPOS_DO_SINO,
  type Notificacao,
  type TipoNotificacao,
} from "@/lib/notificacoes";
import { marcarLida, marcarLidas, desmarcarLida } from "@/app/(sistema)/notificacoes/acoes";
import { useAviso } from "@/components/dominio/avisos";

/**
 * F8 — o sino (Doc 15 §5.1).
 *
 * ⚠️ Este componente vive no LAYOUT, não numa rota. Um defeito aqui
 * derruba todas as telas do sistema de uma vez, não uma página. Por isso
 * a fronteira servidor→cliente é respeitada ao pé da letra: o layout
 * passa DADOS (`notificacoes`, um array de objetos simples) e nenhuma
 * função. Foi manipulador de evento e formatador atravessando essa
 * fronteira que causaram C-06, C-09 e C-10, em três telas diferentes.
 *
 * ⚠️ O número só conta o que exige ação (D-141): negócio parado e
 * atividade vencida. Lembrete de atividade futura aparece na lista sem
 * entrar na conta — compromisso de amanhã não é pendência, e o número é
 * o que faz alguém clicar.
 *
 * ⚠️ Marcar como lida esconde do CONTADOR, não da lista. Sumir da lista
 * tiraria a chance de rever o que se dispensou — e por isso existe o
 * "desfazer" em cada item já lido.
 */
export function Sino({ notificacoes }: { notificacoes: Notificacao[] }) {
  const avisar = useAviso();
  const [salvando, iniciar] = useTransition();

  /**
   * Leitura otimista. O servidor é a verdade, mas o layout só volta a
   * buscar na próxima navegação completa — sem isto, clicar em "lida"
   * não mudaria nada na tela até o usuário sair e voltar.
   */
  const [lidasLocais, setLidasLocais] = useState<Record<string, boolean>>({});

  const estaLida = (n: Notificacao) => lidasLocais[n.chave] ?? n.lida;

  const numero = useMemo(
    () => notificacoes.filter((n) => n.conta && !(lidasLocais[n.chave] ?? n.lida)).length,
    [notificacoes, lidasLocais],
  );

  const grupos = useMemo(
    () =>
      TIPOS_DO_SINO.map((tipo) => ({
        tipo,
        itens: notificacoes.filter((n) => n.tipo === tipo),
      })).filter((g) => g.itens.length > 0),
    [notificacoes],
  );

  const pendentes = notificacoes.filter((n) => n.conta && !estaLida(n));

  function alternar(n: Notificacao) {
    const jaLida = estaLida(n);
    setLidasLocais((s) => ({ ...s, [n.chave]: !jaLida }));
    iniciar(async () => {
      const r = jaLida ? await desmarcarLida(n.chave) : await marcarLida(n.chave);
      if (r?.erro) {
        setLidasLocais((s) => ({ ...s, [n.chave]: jaLida }));
        avisar(r.erro, "erro");
      }
    });
  }

  function marcarTodas() {
    const chaves = pendentes.map((n) => n.chave);
    if (chaves.length === 0) return;
    setLidasLocais((s) => {
      const novo = { ...s };
      for (const c of chaves) novo[c] = true;
      return novo;
    });
    iniciar(async () => {
      const r = await marcarLidas(chaves);
      if (r?.erro) {
        setLidasLocais((s) => {
          const novo = { ...s };
          for (const c of chaves) novo[c] = false;
          return novo;
        });
        avisar(r.erro, "erro");
      }
    });
  }

  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label={
          numero > 0 ? `Notificações — ${numero} pendente${numero > 1 ? "s" : ""}` : "Notificações"
        }
        className="hover:bg-surface-hover relative inline-flex size-9 items-center justify-center rounded-md"
      >
        <Bell className="size-5" aria-hidden />
        {/* Sem número, sem cor. Sino que grita todo dia vira sino que
            ninguém ouve — por isso nada aparece quando não há pendência. */}
        {numero > 0 && (
          <span className="bg-danger text-text-inverse tabular absolute -right-0.5 -top-0.5 min-w-4 rounded-full px-1 text-[11px] font-semibold leading-4">
            {numero > 99 ? "99+" : numero}
          </span>
        )}
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={6}
          collisionPadding={8}
          data-pendente={salvando ? "" : undefined}
          className="border-border bg-surface z-40 flex max-h-[min(32rem,80svh)] w-[min(24rem,calc(100vw-1rem))] flex-col rounded-md border shadow-lg"
        >
          <header className="border-border flex h-11 shrink-0 items-center justify-between gap-2 border-b px-3">
            <span className="text-md font-semibold">Notificações</span>
            {pendentes.length > 0 && (
              <button
                type="button"
                onClick={marcarTodas}
                className="text-text-muted hover:text-text text-sm font-medium"
              >
                Marcar todas como lidas
              </button>
            )}
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {grupos.length === 0 ? (
              <p className="text-text-muted px-3 py-8 text-center text-md">
                Nada pendente por aqui.
              </p>
            ) : (
              grupos.map((g) => (
                <GrupoSino
                  key={g.tipo}
                  tipo={g.tipo}
                  itens={g.itens}
                  lidasLocais={lidasLocais}
                  aoAlternar={alternar}
                />
              ))
            )}
          </div>

          <footer className="border-border shrink-0 border-t p-1">
            <Popover.Close asChild>
              <Link
                href="/notificacoes"
                className="hover:bg-surface-hover text-text-secondary flex h-9 items-center gap-2 rounded px-2 text-sm font-medium"
              >
                <Settings className="size-3.5" aria-hidden />
                Configurar notificações
              </Link>
            </Popover.Close>
          </footer>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function GrupoSino({
  tipo,
  itens,
  lidasLocais,
  aoAlternar,
}: {
  tipo: TipoNotificacao;
  itens: Notificacao[];
  lidasLocais: Record<string, boolean>;
  aoAlternar: (n: Notificacao) => void;
}) {
  const naoLidas = itens.filter((n) => !(lidasLocais[n.chave] ?? n.lida)).length;

  return (
    <section>
      <h3 className="bg-surface-sunken text-text-muted sticky top-0 flex items-center justify-between px-3 py-1.5 text-sm font-semibold">
        {TIPOS[tipo].grupo}
        <span className="tabular font-normal">
          {/* D-141: o grupo que não conta diz isso por escrito, para o
              usuário não achar que o número do sino está errado. */}
          {itens[0]?.conta ? naoLidas : `${itens.length} · não contam`}
        </span>
      </h3>

      <ul>
        {itens.map((n, i) => (
          <ItemSino
            key={n.chave}
            n={n}
            indice={i}
            lida={lidasLocais[n.chave] ?? n.lida}
            aoAlternar={aoAlternar}
          />
        ))}
      </ul>
    </section>
  );
}

function ItemSino({
  n,
  indice,
  lida,
  aoAlternar,
}: {
  n: Notificacao;
  indice: number;
  lida: boolean;
  aoAlternar: (n: Notificacao) => void;
}) {
  return (
    <li
      // D-116: cascata com teto. Uma lista de 96 vencidas escalonada sem
      // limite vira espera, não elegância. `prefers-reduced-motion`
      // desliga tudo por guarda global no globals.css.
      style={{ animationDelay: `${Math.min(indice, 14) * 18}ms` }}
      className="border-border animate-in fade-in fill-mode-backwards border-b duration-300 last:border-b-0"
    >
      <div className={`flex items-start gap-2 px-3 py-2 ${lida ? "opacity-55" : ""}`}>
        <Popover.Close asChild>
          <Link href={n.destino} className="hover:text-brand-ink min-w-0 flex-1">
            <span className="text-md block truncate font-medium">{n.titulo}</span>
            <span className="text-text-muted block truncate text-sm">{n.detalhe}</span>
          </Link>
        </Popover.Close>

        <button
          type="button"
          onClick={() => aoAlternar(n)}
          aria-label={lida ? "Marcar como não lida" : "Marcar como lida"}
          title={lida ? "Marcar como não lida" : "Marcar como lida"}
          className="hover:bg-surface-hover text-text-muted mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded"
        >
          {lida ? (
            <Undo2 className="size-3.5" aria-hidden />
          ) : (
            <Check className="size-4" aria-hidden />
          )}
        </button>
      </div>
    </li>
  );
}
