"use client";

import { useEffect, useRef, useState } from "react";
import { Briefcase, Building2, User, Search, X } from "lucide-react";
import { buscarVinculos, type Candidato } from "./acoes";

export type Vinculo = {
  tipo: "negocio" | "organizacao" | "pessoa";
  id: string;
  rotulo: string;
} | null;

const ICONE = {
  negocio: Briefcase,
  organizacao: Building2,
  pessoa: User,
} as const;

const NOME_TIPO = {
  negocio: "Negócio",
  organizacao: "Organização",
  pessoa: "Pessoa",
} as const;

/**
 * Escolhe a quem a atividade se refere: um negócio, uma organização ou
 * uma pessoa — ou nada (D-108). Um só campo de busca para os três; os
 * resultados vêm rotulados por tipo, com ícone, para não confundir um
 * negócio "Prefeitura" com a organização "Prefeitura".
 */
export function SeletorVinculo({
  valor,
  aoEscolher,
}: {
  valor: Vinculo;
  aoEscolher: (v: Vinculo) => void;
}) {
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<Candidato[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [aberto, setAberto] = useState(false);

  // Debounce: uma busca só depois que a digitação para por 250ms, senão
  // "prefeitura" dispararia dez idas ao servidor. A lista só aparece com
  // termo de 2+ letras (ver render), então não é preciso limpar
  // `resultados` de forma síncrona quando o termo encurta — o que o
  // React desaconselha dentro de um effect.
  useEffect(() => {
    const t = termo.trim();
    if (t.length < 2) return;
    let vivo = true;
    const id = setTimeout(async () => {
      setBuscando(true);
      const r = await buscarVinculos(t);
      if (!vivo) return;
      setResultados(r);
      setBuscando(false);
    }, 250);
    return () => {
      vivo = false;
      clearTimeout(id);
    };
  }, [termo]);

  const caixa = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      if (!caixa.current?.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, [aberto]);

  if (valor) {
    const Icone = ICONE[valor.tipo];
    return (
      <div className="border-border bg-surface-sunken flex items-center gap-2 rounded-md border px-2.5 py-2">
        <Icone className="text-text-muted size-4 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="text-md block truncate font-medium">{valor.rotulo}</span>
          <span className="text-text-muted text-xs">{NOME_TIPO[valor.tipo]}</span>
        </span>
        <button
          type="button"
          onClick={() => aoEscolher(null)}
          aria-label="Remover vínculo"
          className="text-text-muted hover:bg-surface-hover hover:text-text rounded p-1"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={caixa}>
      <div className="relative">
        <Search
          className="text-text-muted pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2"
          aria-hidden
        />
        <input
          type="text"
          value={termo}
          onChange={(e) => {
            setTermo(e.target.value);
            setAberto(true);
          }}
          onFocus={() => setAberto(true)}
          placeholder="Buscar negócio, organização ou pessoa…"
          className="h-control-md bg-surface border-border text-md w-full rounded-md border pl-8 pr-2.5"
        />
      </div>

      {aberto && termo.trim().length >= 2 && (
        <ul className="border-border bg-surface absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-md border p-1 shadow-lg">
          {buscando && (
            <li className="text-text-muted px-2 py-2 text-sm">Buscando…</li>
          )}
          {!buscando && resultados.length === 0 && (
            <li className="text-text-muted px-2 py-2 text-sm">Nada encontrado.</li>
          )}
          {resultados.map((c) => {
            const Icone = ICONE[c.tipo];
            return (
              <li key={`${c.tipo}-${c.id}`}>
                <button
                  type="button"
                  onClick={() => {
                    aoEscolher({ tipo: c.tipo, id: c.id, rotulo: c.rotulo });
                    setTermo("");
                    setAberto(false);
                  }}
                  className="hover:bg-surface-hover flex w-full items-center gap-2 rounded px-2 py-1.5 text-left"
                >
                  <Icone className="text-text-muted size-4 shrink-0" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="text-md block truncate">{c.rotulo}</span>
                    <span className="text-text-muted text-xs">
                      {NOME_TIPO[c.tipo]}
                      {c.detalhe && ` · ${c.detalhe}`}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
