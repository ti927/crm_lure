"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ChevronDown } from "lucide-react";
import {
  ATALHOS,
  anoDoRecorte,
  recorteDoAno,
  recorteDoAtalho,
  type Filtros,
} from "./consulta";

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
    // O resto do recorte sobrevive à troca de período.
    if (filtros.etapa) q.set("etapa", filtros.etapa);
    if (filtros.status) q.set("status", filtros.status);
    if (filtros.valorMin) q.set("valorMin", filtros.valorMin);
    if (filtros.valorMax) q.set("valorMax", filtros.valorMax);
    if (filtros.motivo) q.set("motivo", filtros.motivo);
    const s = q.toString();
    comecar(() => router.push(s ? `${destino}?${s}` : destino));
  }

  return (
    <div className="relative" style={{ opacity: pendente ? 0.6 : 1, transition: "opacity 120ms" }}>
      <label htmlFor="recorte-ano" className="sr-only">
        Filtrar por ano
      </label>
      <select
        id="recorte-ano"
        value={atual ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          if (!v) return ir(null);
          ir(v.startsWith("@") ? recorteDoAtalho(v.slice(1)) : recorteDoAno(Number(v)));
        }}
        /* `appearance-none` tira a seta nativa: sem isso ficam duas, a do
           navegador e a desenhada aqui. */
        className="h-control-md border-border bg-surface text-text hover:bg-surface-hover w-40 appearance-none rounded-md border pl-2.5 pr-7 text-sm font-medium"
      >
        <option value="">Todo o período</option>
        {/* Atalhos do Pipedrive: calculados na hora, nunca guardados —
            "últimos 90 dias" guardado como par de datas envelhece. */}
        <optgroup label="Períodos">
          {ATALHOS.map((a) => (
            <option key={a.chave} value={`@${a.chave}`}>
              {a.rotulo}
            </option>
          ))}
        </optgroup>
        <optgroup label="Ano">
          {anos.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </optgroup>
      </select>
      <ChevronDown
        aria-hidden
        className="text-text-muted pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2"
      />
    </div>
  );
}
