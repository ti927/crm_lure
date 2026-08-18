"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Check, AlertTriangle, X } from "lucide-react";

/**
 * Avisos de ação (toasts).
 *
 * ⚠️ Era o maior buraco de retorno do sistema: criar, editar ou excluir
 * fechava o diálogo em silêncio absoluto. Quem clicava não sabia se tinha
 * dado certo — e a lista, atrás do diálogo, às vezes ainda não tinha
 * recarregado. Isto fecha o laço: toda ação diz o que aconteceu.
 *
 * Escrito à mão em vez de dependência nova, pelo mesmo critério do
 * seletor de responsável: são poucas linhas, e assim o movimento e as
 * cores saem dos tokens da Lure. `aria-live="polite"` faz o leitor de
 * tela anunciar sem interromper o que a pessoa está fazendo.
 */

type Tipo = "ok" | "erro";
type Aviso = { id: number; texto: string; tipo: Tipo };

const Contexto = createContext<((texto: string, tipo?: Tipo) => void) | null>(null);

/** Quanto tempo o aviso fica na tela. Erro fica mais, porque exige leitura. */
const DURACAO: Record<Tipo, number> = { ok: 3200, erro: 5200 };

export function ProvedorAvisos({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const proximoId = useRef(0);

  const avisar = useCallback((texto: string, tipo: Tipo = "ok") => {
    const id = proximoId.current++;
    setAvisos((a) => [...a, { id, texto, tipo }]);
  }, []);

  const fechar = useCallback((id: number) => {
    setAvisos((a) => a.filter((x) => x.id !== id));
  }, []);

  return (
    <Contexto.Provider value={avisar}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed bottom-4 left-1/2 z-[70] flex w-[min(92vw,26rem)] -translate-x-1/2 flex-col gap-2 sm:left-auto sm:right-4 sm:translate-x-0"
      >
        {avisos.map((a) => (
          <ItemAviso key={a.id} aviso={a} aoFechar={() => fechar(a.id)} />
        ))}
      </div>
    </Contexto.Provider>
  );
}

function ItemAviso({ aviso, aoFechar }: { aviso: Aviso; aoFechar: () => void }) {
  useEffect(() => {
    const t = setTimeout(aoFechar, DURACAO[aviso.tipo]);
    return () => clearTimeout(t);
  }, [aviso.tipo, aoFechar]);

  const erro = aviso.tipo === "erro";
  const Icone = erro ? AlertTriangle : Check;

  return (
    <div
      role={erro ? "alert" : "status"}
      className={`animate-in fade-in slide-in-from-bottom-2 pointer-events-auto flex items-start gap-2.5 rounded-md border px-3 py-2.5 shadow-lg duration-200 ${
        erro
          ? "border-danger bg-danger-bg text-danger-ink"
          : "border-border bg-surface text-text"
      }`}
    >
      <Icone
        className={`mt-0.5 size-4 shrink-0 ${erro ? "" : "text-success-ink"}`}
        aria-hidden
      />
      <p className="text-md min-w-0 flex-1">{aviso.texto}</p>
      <button
        type="button"
        onClick={aoFechar}
        aria-label="Fechar aviso"
        className="hover:bg-surface-hover -mr-1 -mt-0.5 shrink-0 rounded p-1 opacity-60 hover:opacity-100"
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}

/**
 * `avisar("Organização salva")` ou `avisar(msg, "erro")`.
 *
 * Devolve uma função vazia fora do provedor em vez de quebrar: um aviso
 * que não aparece é um defeito pequeno; uma tela que não abre, não.
 */
export function useAviso() {
  return useContext(Contexto) ?? (() => {});
}
