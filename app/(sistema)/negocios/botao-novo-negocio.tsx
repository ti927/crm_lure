"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { DialogoNegocio } from "./dialogo-negocio";

type Opcao = { id: string; nome: string };
type Etapa = { id: string; nome: string; ordem: number };

/**
 * O botão "Novo negócio", na Lista e no Kanban.
 *
 * ⚠️ Componente de cliente por necessidade, não por gosto: ele guarda o
 * estado "diálogo aberto" e passa manipuladores adiante. Montar isto num
 * Server Component derrubaria a rota inteira na serialização — foi o que
 * quebrou a aba Pessoas (C-06, Doc 09 §3.11). Só dado puro atravessa a
 * fronteira; as listas chegam prontas do servidor.
 */
export function BotaoNovoNegocio({
  etapas,
  usuarios,
  origens,
  produtos,
  responsavelPadrao,
}: {
  etapas: Etapa[];
  usuarios: Opcao[];
  origens: Opcao[];
  produtos: Opcao[];
  responsavelPadrao?: string | null;
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="h-control-md bg-brand text-brand-on hover:bg-brand-hover active:bg-brand-active inline-flex items-center gap-1.5 rounded-md px-3 text-sm font-semibold transition-transform hover:-translate-y-px"
      >
        <Plus className="size-3.5" aria-hidden />
        Novo negócio
      </button>

      {aberto && (
        <DialogoNegocio
          etapas={etapas}
          usuarios={usuarios}
          origens={origens}
          produtos={produtos}
          responsavelPadrao={responsavelPadrao}
          aoFechar={() => setAberto(false)}
        />
      )}
    </>
  );
}
