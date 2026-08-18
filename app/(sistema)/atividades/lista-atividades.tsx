"use client";

import { useState } from "react";
import { Check, Briefcase, Building2, User, Clock } from "lucide-react";
import { UsuarioComFoto } from "@/components/dominio/avatar-usuario";
import { concluirAtividade } from "./acoes";
import {
  formataData,
  diaDaSemana,
  somaDias,
  type LinhaAtividade,
} from "./consulta";

const ICONE_VINCULO = {
  negocio: Briefcase,
  organizacao: Building2,
  pessoa: User,
} as const;

const VENCIDAS = "vencidas";

/** Chave de grupo: pendente e no passado cai em "vencidas"; o resto, no
 *  próprio dia. É o agrupamento do Pipedrive. */
function grupoDe(a: LinhaAtividade, hoje: string): string {
  if (!a.concluida && a.data < hoje) return VENCIDAS;
  return a.data;
}

function rotuloGrupo(chave: string, hoje: string): string {
  if (chave === VENCIDAS) return "Vencidas";
  if (chave === hoje) return "Hoje";
  if (chave === somaDias(hoje, 1)) return "Amanhã";
  return `${diaDaSemana(chave)}, ${formataData(chave)}`;
}

export function ListaAtividades({
  atividades,
  hoje,
  aoEditar,
  aoMudar,
}: {
  atividades: LinhaAtividade[];
  hoje: string;
  aoEditar: (a: LinhaAtividade) => void;
  aoMudar: () => void;
}) {
  // Agrupa preservando a ordem já vinda do servidor: crescente para
  // pendentes (vencidas antigas → futuro), decrescente para o histórico
  // (mais recente primeiro). Só o grupo "Vencidas" é forçado ao topo,
  // porque é a pilha de atrasados que precisa saltar aos olhos.
  const grupos: { chave: string; itens: LinhaAtividade[] }[] = [];
  const indice = new Map<string, number>();
  for (const a of atividades) {
    const chave = grupoDe(a, hoje);
    if (!indice.has(chave)) {
      indice.set(chave, grupos.length);
      grupos.push({ chave, itens: [] });
    }
    grupos[indice.get(chave)!].itens.push(a);
  }
  const vencidas = grupos.filter((g) => g.chave === VENCIDAS);
  const resto = grupos.filter((g) => g.chave !== VENCIDAS);
  const ordenados = [...vencidas, ...resto];

  if (atividades.length === 0) {
    return (
      <div className="px-4 py-16 text-center">
        <p className="text-text-secondary text-md font-medium">
          Nenhuma atividade neste recorte.
        </p>
        <p className="text-text-muted mt-1 text-sm">
          Ajuste os filtros acima ou crie uma nova atividade.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {ordenados.map((g) => {
        const vencido = g.chave === VENCIDAS;
        return (
          <section key={g.chave}>
            <h2
              className={`bg-surface-sunken border-border sticky top-0 z-10 border-b px-4 py-1.5 text-xs font-semibold uppercase tracking-caps ${
                vencido ? "text-danger-ink" : "text-text-muted"
              }`}
            >
              {rotuloGrupo(g.chave, hoje)}
              <span className="ml-2 opacity-60">{g.itens.length}</span>
            </h2>
            <ul>
              {g.itens.map((a, i) => (
                <ItemLista
                  key={a.id}
                  atividade={a}
                  indice={i}
                  aoEditar={aoEditar}
                  aoMudar={aoMudar}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
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
