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
  rotuloTodos = "Todos os responsáveis",
}: {
  usuarios: Usuario[];
  escolhido: string;
  aoEscolher: (id: string) => void;
  classe: string;
  /**
   * Texto de "sem filtro" no gatilho.
   *
   * ⚠️ Existe porque o mesmo seletor vive em duas larguras muito
   * diferentes: no Kanban ele tem a barra inteira, na coluna da Lista tem
   * ~120px. "Todos os responsáveis" ali quebrava em DUAS LINHAS dentro do
   * campo, e duas linhas dentro de um controle de 28px se leem como
   * defeito. Na Lista o cabeçalho da coluna já diz "Responsável", então
   * repetir a palavra dentro do campo não informa nada.
   */
  rotuloTodos?: string;
}) {
  const atual = usuarios.find((u) => u.id === escolhido);

  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label="Filtrar por responsável"
        title={atual ? atual.nome : rotuloTodos}
        // ⚠️ `min-w-0` no conteudo e `shrink-0` na seta: sem os dois, um
        // nome longo empurra a seta para fora do campo em vez de cortar o
        // nome. `justify-between` mantem a seta colada na direita mesmo
        // quando sobra espaco.
        className={`${classe} ${
          escolhido ? "border-brand-ink font-medium" : ""
        } hover:bg-surface-hover flex items-center justify-between gap-1.5 overflow-hidden whitespace-nowrap`}
      >
        <span className="min-w-0 flex-1 truncate text-left">
          {atual ? (
            <UsuarioComFoto nome={atual.nome} foto={atual.foto_url} tamanho="sm" />
          ) : (
            <span className="text-text">{rotuloTodos}</span>
          )}
        </span>
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
