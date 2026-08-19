"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ChevronDown } from "lucide-react";
import { anoDoRecorte, recorteDoAno, type Filtros } from "./consulta";

/**
 * Atalho de ano — o recorte que se usa o tempo todo.
 *
 * ⚠️ Faltava, e era o buraco mais visível do painel: para olhar 2025 era
 * preciso abrir a gaveta e digitar duas datas.
 *
 * ⚠️ Lista suspensa, e não uma fileira de botões: são dez anos de base, e
 * dez botões tomavam a barra inteira, empurrando as abas e o Recorte para
 * a segunda linha. Um seletor ocupa a largura de um.
 *
 * O intervalo livre continua na gaveta, para quem quer um trimestre ou um
 * mês. Este atalho não substitui: convive.
 *
 * ⚠️ Uma fileira de filtros acima de tudo que eles recortam — nunca um
 * filtro dentro do cartão de um gráfico. Todos os números da tela mudam
 * juntos, senão dois painéis passam a falar de recortes diferentes sem
 * avisar.
 */
export function FiltroAno({
  filtros,
  anos,
  destino,
}: {
  filtros: Filtros;
  anos: number[];
  destino: string;
}) {
  const router = useRouter();
  const [pendente, comecar] = useTransition();
  const atual = anoDoRecorte(filtros);

  function ir(troca: { de: string; ate: string } | null) {
    const q = new URLSearchParams();
    if (troca) {
      q.set("de", troca.de);
      q.set("ate", troca.ate);
    }
    // O resto do recorte sobrevive à troca de ano.
    if (filtros.responsavel) q.set("responsavel", filtros.responsavel);
    if (filtros.origem) q.set("origem", filtros.origem);
    if (filtros.produto) q.set("produto", filtros.produto);
    if (filtros.area) q.set("area", filtros.area);
    if (filtros.incluirParados) q.set("parados", "1");
    const s = q.toString();
    comecar(() => router.push(s ? `${destino}?${s}` : destino));
  }

  return (
    <div className="relative" style={{ opacity: pendente ? 0.6 : 1, transition: "opacity 120ms" }}>
      <label htmlFor="recorte-ano" className="sr-only">
        Recorte por ano
      </label>
      <select
        id="recorte-ano"
        value={atual ?? ""}
        onChange={(e) => ir(e.target.value ? recorteDoAno(Number(e.target.value)) : null)}
        className="h-control-md border-border bg-surface text-text hover:bg-surface-hover w-32 rounded-md border pl-2.5 pr-7 text-sm font-medium tabular"
      >
        <option value="">Todos os anos</option>
        {anos.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="text-text-muted pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2"
      />
    </div>
  );
}
