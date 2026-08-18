"use client";

import { Popover } from "radix-ui";
import { ChevronDown, Check } from "lucide-react";
import { UsuarioComFoto } from "@/components/dominio/avatar-usuario";

export type Usuario = { id: string; nome: string; foto_url: string | null };

/**
 * Seletor de responsavel com foto.
 *
 * Nao da para usar <select>: elemento nativo so aceita texto nas opcoes,
 * e o pedido era ver o rosto. O Radix Popover repoe o que o <select>
 * daria de graca — fecha no Esc, fecha ao clicar fora, foco preso dentro
 * — e corrige o defeito que a versao anterior (uma div absoluta com
 * z-index fixo) tinha: bastava um cabecalho de tabela sticky (tambem
 * z-index) vir depois no HTML para pintar por cima da lista aberta. O
 * Portal do Radix sai para o final do body, fora de qualquer "overflow"
 * ou pilha de empilhamento local — nao ha mais numero de z-index para
 * acertar contra o resto da tela.
 */
export function SeletorResponsavel({
  usuarios,
  escolhido,
  aoEscolher,
  classe,
}: {
  usuarios: Usuario[];
  escolhido: string;
  aoEscolher: (id: string) => void;
  classe: string;
}) {
  const atual = usuarios.find((u) => u.id === escolhido);

  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label="Filtrar por responsável"
        className={`${classe} ${
          escolhido ? "border-brand-ink font-medium" : ""
        } flex items-center gap-2`}
      >
        {atual ? (
          <UsuarioComFoto nome={atual.nome} foto={atual.foto_url} tamanho="sm" />
        ) : (
          <span className="text-text">Todos os responsáveis</span>
        )}
        <ChevronDown className="text-text-muted size-3.5 shrink-0" aria-hidden />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          collisionPadding={8}
          className="border-border bg-surface z-40 max-h-80 w-60 overflow-y-auto rounded-md border p-1 shadow-lg"
        >
          <ul role="listbox">
            <li>
              <Popover.Close asChild>
                <button
                  type="button"
                  role="option"
                  aria-selected={!escolhido}
                  onClick={() => aoEscolher("")}
                  className="hover:bg-surface-hover text-md flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left"
                >
                  Todos os responsáveis
                  {!escolhido && <Check className="size-3.5 shrink-0" aria-hidden />}
                </button>
              </Popover.Close>
            </li>
            {usuarios.map((u) => (
              <li key={u.id}>
                <Popover.Close asChild>
                  <button
                    type="button"
                    role="option"
                    aria-selected={u.id === escolhido}
                    onClick={() => aoEscolher(u.id)}
                    className="hover:bg-surface-hover text-md flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left"
                  >
                    <UsuarioComFoto nome={u.nome} foto={u.foto_url} tamanho="sm" />
                    {u.id === escolhido && (
                      <Check className="size-3.5 shrink-0" aria-hidden />
                    )}
                  </button>
                </Popover.Close>
              </li>
            ))}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
