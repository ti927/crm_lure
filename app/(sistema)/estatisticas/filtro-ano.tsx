"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { anoDoRecorte, recorteDoAno, type Filtros } from "./consulta";

/**
 * Atalho de ano — o recorte que se usa o tempo todo.
 *
 * ⚠️ Faltava, e era o buraco mais visível do painel: para olhar 2025 era
 * preciso abrir a gaveta e digitar duas datas. Ano é o recorte natural de
 * quem lê indicador comercial, e merece um clique.
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
  const semPeriodo = !filtros.de && !filtros.ate;

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

  const botao =
    "h-control-md rounded-md px-2.5 text-sm font-medium transition-colors tabular";

  return (
    <div
      role="group"
      aria-label="Recorte por ano"
      className="border-border bg-surface-sunken flex items-center gap-0.5 rounded-md border p-0.5"
      // Segura o render anterior esmaecido em vez de piscar esqueleto.
      style={{ opacity: pendente ? 0.6 : 1, transition: "opacity 120ms" }}
    >
      <button
        type="button"
        onClick={() => ir(null)}
        aria-pressed={semPeriodo}
        className={`${botao} ${
          semPeriodo
            ? "bg-surface text-text shadow-xs font-semibold"
            : "text-text-secondary hover:text-text"
        }`}
      >
        Tudo
      </button>

      {anos.map((a) => {
        const ativo = atual === a;
        return (
          <button
            key={a}
            type="button"
            onClick={() => ir(recorteDoAno(a))}
            aria-pressed={ativo}
            className={`${botao} ${
              ativo
                ? "bg-surface text-text shadow-xs font-semibold"
                : "text-text-secondary hover:text-text"
            }`}
          >
            {a}
          </button>
        );
      })}
    </div>
  );
}
