"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Check,
  Briefcase,
  Building2,
  User,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { UsuarioComFoto } from "@/components/dominio/avatar-usuario";
import { concluirAtividade } from "./acoes";
import { somaDias, rotuloDia, type LinhaAtividade } from "./consulta";

const ICONE_VINCULO = {
  negocio: Briefcase,
  organizacao: Building2,
  pessoa: User,
} as const;

/**
 * Lista de atividades no modelo do Pipedrive: um dia em foco por vez,
 * começando em hoje, com as pendências vencidas destacadas no topo — elas
 * não somem enquanto não forem tratadas. A navegação ‹ › anda dia a dia;
 * "Hoje" volta ao presente.
 */
export function ListaAtividades({
  dia,
  hoje,
  doDia,
  vencidas,
  aoEditar,
  aoMudar,
}: {
  dia: string;
  hoje: string;
  doDia: LinhaAtividade[];
  vencidas: LinhaAtividade[];
  aoEditar: (a: LinhaAtividade) => void;
  aoMudar: () => void;
}) {
  const router = useRouter();
  const caminho = usePathname();
  const params = useSearchParams();
  const [pendente, iniciar] = useTransition();

  function irParaDia(alvo: string) {
    const p = new URLSearchParams(params);
    // Hoje é o padrão: não suja a URL com ?dia= quando volta ao presente.
    if (alvo === hoje) p.delete("dia");
    else p.set("dia", alvo);
    const s = p.toString();
    iniciar(() => router.push(s ? `${caminho}?${s}` : caminho));
  }

  return (
    <div className="flex flex-col" data-pendente={pendente || undefined}>
      <div className="border-border bg-surface sticky top-0 z-20 flex items-center gap-2 border-b px-4 py-2">
        <button
          type="button"
          onClick={() => irParaDia(somaDias(dia, -1))}
          aria-label="Dia anterior"
          className="border-border hover:bg-surface-hover inline-flex size-7 items-center justify-center rounded-md border"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => irParaDia(somaDias(dia, 1))}
          aria-label="Próximo dia"
          className="border-border hover:bg-surface-hover inline-flex size-7 items-center justify-center rounded-md border"
        >
          <ChevronRight className="size-4" aria-hidden />
        </button>
        <h2 className="text-md font-semibold">{rotuloDia(dia, hoje)}</h2>
        {dia !== hoje && (
          <button
            type="button"
            onClick={() => irParaDia(hoje)}
            className="border-border hover:bg-surface-hover ml-1 h-7 rounded-md border px-2.5 text-sm font-medium"
          >
            Hoje
          </button>
        )}
      </div>

      {vencidas.length > 0 && (
        <Grupo rotulo="Vencidas" total={vencidas.length} vencido>
          {vencidas.map((a, i) => (
            <ItemLista
              key={a.id}
              atividade={a}
              indice={i}
              aoEditar={aoEditar}
              aoMudar={aoMudar}
            />
          ))}
        </Grupo>
      )}

      <Grupo rotulo={rotuloDia(dia, hoje)} total={doDia.length}>
        {doDia.length === 0 ? (
          <li className="text-text-muted px-4 py-8 text-center text-sm">
            Nenhuma atividade neste dia.
          </li>
        ) : (
          doDia.map((a, i) => (
            <ItemLista
              key={a.id}
              atividade={a}
              indice={i}
              aoEditar={aoEditar}
              aoMudar={aoMudar}
            />
          ))
        )}
      </Grupo>
    </div>
  );
}

function Grupo({
  rotulo,
  total,
  vencido,
  children,
}: {
  rotulo: string;
  total: number;
  vencido?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3
        className={`bg-surface-sunken border-border border-b px-4 py-1.5 text-xs font-semibold uppercase tracking-caps ${
          vencido ? "text-danger-ink" : "text-text-muted"
        }`}
      >
        {rotulo}
        <span className="ml-2 opacity-60">{total}</span>
      </h3>
      <ul>{children}</ul>
    </section>
  );
}

function ItemLista({
  atividade,
  indice,
  aoEditar,
  aoMudar,
}: {
  atividade: LinhaAtividade;
  indice: number;
  aoEditar: (a: LinhaAtividade) => void;
  aoMudar: () => void;
}) {
  const [concluida, setConcluida] = useState(atividade.concluida);
  const [salvando, setSalvando] = useState(false);

  async function alternar() {
    const alvo = !concluida;
    setConcluida(alvo); // otimista: marcar tarefa responde na hora
    setSalvando(true);
    const r = await concluirAtividade(atividade.id, alvo);
    setSalvando(false);
    if (r?.erro) setConcluida(!alvo);
    else aoMudar(); // reconcilia: sai da lista se o filtro for "pendentes"
  }

  const tipoVinculo = atividade.negocio
    ? "negocio"
    : atividade.organizacao
      ? "organizacao"
      : atividade.pessoa
        ? "pessoa"
        : null;
  const IconeVinculo = tipoVinculo ? ICONE_VINCULO[tipoVinculo] : null;
  const nomeVinculo =
    atividade.negocio?.titulo ??
    atividade.organizacao?.nome ??
    atividade.pessoa?.nome ??
    null;

  return (
    <li
      style={{ animationDelay: `${Math.min(indice, 14) * 18}ms` }}
      className="border-border hover:bg-surface-hover animate-in fade-in fill-mode-backwards border-b duration-300 motion-safe:transition-colors"
    >
      <div className="flex items-start gap-3 px-4 py-2.5">
        <button
          type="button"
          disabled={salvando}
          onClick={() => void alternar()}
          aria-label={concluida ? "Reabrir atividade" : "Concluir atividade"}
          className="mt-0.5 shrink-0 disabled:opacity-60"
        >
          <span
            aria-hidden
            className={`flex size-5 items-center justify-center rounded border transition-all duration-200 ${
              concluida
                ? "border-success bg-success text-text-inverse"
                : "border-border hover:border-brand-ink scale-95"
            }`}
          >
            {concluida && <Check className="size-3.5" strokeWidth={3} />}
          </span>
        </button>

        <button
          type="button"
          onClick={() => aoEditar(atividade)}
          className="min-w-0 flex-1 text-left"
        >
          <span
            className={`text-md block font-medium ${
              concluida ? "text-text-muted line-through" : ""
            }`}
          >
            {atividade.titulo ?? atividade.tipo_atividade?.nome ?? "Atividade"}
          </span>

          <span className="text-text-muted mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm">
            {atividade.tipo_atividade && atividade.titulo && (
              <span>{atividade.tipo_atividade.nome}</span>
            )}
            {atividade.hora_inicio && (
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3" aria-hidden />
                {atividade.hora_inicio.slice(0, 5)}
                {atividade.hora_fim && `–${atividade.hora_fim.slice(0, 5)}`}
              </span>
            )}
            {nomeVinculo && IconeVinculo && (
              <span className="inline-flex min-w-0 items-center gap-1">
                <IconeVinculo className="size-3 shrink-0" aria-hidden />
                <span className="truncate">{nomeVinculo}</span>
              </span>
            )}
          </span>
        </button>

        {atividade.usuario && (
          <span className="mt-0.5 shrink-0">
            <UsuarioComFoto
              nome={atividade.usuario.nome}
              foto={atividade.usuario.foto_url}
              tamanho="sm"
            />
          </span>
        )}
      </div>
    </li>
  );
}
