"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { X } from "lucide-react";
import {
  SeletorResponsavel,
  type Usuario,
} from "@/components/dominio/seletor-responsavel";
import { CampoBusca } from "@/components/dominio/campo-busca";
import { salvarPreferenciaKanban } from "./acoes";

/**
 * Filtro do Kanban: busca e responsável.
 *
 * Etapa é a própria coluna e status vem junto do desfecho, então filtrar
 * por eles aqui seria esconder metade do quadro sem ganho. O estado mora
 * na URL, como na Lista — sobrevive ao recarregar, pode ser mandado por
 * link e volta certo no botão "voltar".
 *
 * ⚠️ Toda mudança também grava a combinação no usuário. É assim que o
 * quadro volta no mesmo recorte no login seguinte, e é o outro lado da
 * regra que está em `page.tsx`: gravar VAZIO quando não sobrou filtro
 * nenhum é o que distingue "escolhi ver tudo" de "nunca escolhi", e o
 * segundo é o que faz a tela abrir em "só os meus".
 */
export function FiltroKanban({ usuarios }: { usuarios: Usuario[] }) {
  const router = useRouter();
  const caminho = usePathname();
  const params = useSearchParams();
  const [pendente, iniciar] = useTransition();

  const responsavel = params.get("responsavel") ?? "";
  const busca = params.get("busca") ?? "";

  const aplicar = useCallback(
    (chave: string, valor: string) => {
      const p = new URLSearchParams(params);
      if (valor) p.set(chave, valor);
      else p.delete(chave);
      const s = p.toString();
      iniciar(() => router.push(s ? `${caminho}?${s}` : caminho));
      void salvarPreferenciaKanban(s);
    },
    [params, router, caminho]
  );

  const aoBuscar = useCallback(
    (termo: string) => aplicar("busca", termo),
    [aplicar]
  );

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      data-pendente={pendente || undefined}
    >
      <CampoBusca
        valor={busca}
        aoBuscar={aoBuscar}
        placeholder="Buscar negócio ou organização"
        className="w-40 sm:w-56"
      />

      <SeletorResponsavel
        usuarios={usuarios}
        escolhido={responsavel}
        aoEscolher={(id) => aplicar("responsavel", id)}
        classe="h-control-md bg-surface border-border text-md rounded-md border px-2.5"
      />

      {(responsavel || busca) && (
        <button
          type="button"
          onClick={() => {
            // Limpa os dois de uma vez: dois `router.push` seguidos
            // fariam a segunda navegação partir da URL antiga e um dos
            // filtros voltaria sozinho.
            iniciar(() => router.push(caminho));
            void salvarPreferenciaKanban("");
          }}
          className="h-control-md text-text-secondary hover:bg-surface-hover hover:text-text inline-flex items-center gap-1 rounded-md px-2 text-sm font-medium"
        >
          <X className="size-3.5" aria-hidden />
          Limpar
        </button>
      )}
    </div>
  );
}
