"use client";

import { Filter } from "lucide-react";
import {
  SeletorResponsavel,
  type Usuario,
} from "@/components/dominio/seletor-responsavel";
import { useFiltrosLista } from "./usar-filtros-lista";

/**
 * Todos os controles da linha de filtro usam ESTA medida.
 *
 * ⚠️ Uma constante só, e nao cada componente escolhendo a sua: com dez
 * colunas lado a lado, 2px de diferenca de altura entre um `<select>` e
 * um `<input>` aparecem como desalinhamento na linha inteira. O que
 * parecia desleixo era isso somado ao padding curto demais.
 */
const CAMPO =
  "h-7 w-full min-w-0 rounded-md border border-border bg-surface px-2 text-sm placeholder:text-text-muted";
const CAMPO_ATIVO = "border-brand-ink";

/**
 * Marca o cabecalho com filtro ativo (B-044). A borda dos campos abaixo
 * ja muda de cor sozinha; este funil e reforco visual, nunca o unico
 * sinal — o nome da coluna continua escrito do lado (Doc 08 §5, mesma
 * regra que vale para a faixa de etapa).
 */
export function IndicadorFiltro({ ativo }: { ativo: boolean }) {
  if (!ativo) return null;
  return <Filter className="text-brand-ink size-3 shrink-0" aria-hidden />;
}

/**
 * Filtro de texto por coluna (titulo, organizacao).
 *
 * Nao commita a cada tecla — so ao sair do campo ou apertar Enter. Um
 * `ilike` por letra digitada faria dez consultas para "proposta" em vez
 * de uma. `key={valor}` forca o input a se remontar quando o valor muda
 * por fora (por exemplo, o botao "Limpar filtros"), porque o campo e
 * nao-controlado — `defaultValue` so vale na montagem.
 */
export function FiltroTexto({
  nomeParam,
  valor,
  rotulo,
}: {
  nomeParam: string;
  valor: string;
  rotulo: string;
}) {
  const { aplicar } = useFiltrosLista();

  function commit(v: string) {
    const limpo = v.trim();
    if (limpo !== valor) aplicar(nomeParam, limpo);
  }

  return (
    <input
      key={valor}
      type="text"
      defaultValue={valor}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      placeholder={`Filtrar ${rotulo.toLowerCase()}`}
      aria-label={`Filtrar por ${rotulo}`}
      className={`${CAMPO} ${valor ? CAMPO_ATIVO : ""}`}
    />
  );
}

/** Faixa de valor (coluna Valor). Os dois lados sao independentes. */
export function FiltroNumero({ min, max }: { min: string; max: string }) {
  const { aplicarVarios } = useFiltrosLista();
  const ativo = Boolean(min || max);

  function commit(campo: "valorMin" | "valorMax", atual: string, v: string) {
    const limpo = v.trim();
    if (limpo !== atual) aplicarVarios({ [campo]: limpo });
  }

  /**
   * ⚠️ EMPILHADOS, e nao lado a lado. Com `table-fixed` a coluna Valor
   * tem ~110px: dois campos na mesma linha ficavam com ~40px cada e
   * viravam dois quadradinhos onde nao dava para ler o que se digitou.
   * Empilhado, cada um usa a largura inteira da coluna — custa uma linha
   * a mais no cabecalho, uma vez so, e devolve o filtro ao uso.
   */
  return (
    <div className="flex flex-col gap-1">
      <input
        key={`min-${min}`}
        type="number"
        inputMode="decimal"
        defaultValue={min}
        onBlur={(e) => commit("valorMin", min, e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        placeholder="mín."
        aria-label="Valor mínimo"
        className={`${CAMPO} w-full text-right ${ativo ? CAMPO_ATIVO : ""}`}
      />
      <input
        key={`max-${max}`}
        type="number"
        inputMode="decimal"
        defaultValue={max}
        onBlur={(e) => commit("valorMax", max, e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        placeholder="máx."
        aria-label="Valor máximo"
        className={`${CAMPO} w-16 text-right ${ativo ? CAMPO_ATIVO : ""}`}
      />
    </div>
  );
}

/** Faixa de data (coluna Criado em). Escolha discreta — commita na hora. */
export function FiltroData({ de, ate }: { de: string; ate: string }) {
  const { aplicarVarios } = useFiltrosLista();
  const ativo = Boolean(de || ate);

  /** ⚠️ Empilhados pelo mesmo motivo do filtro de valor — e aqui era
   *  pior: campo de data nativo precisa de ~110px para mostrar
   *  "dd/mm/aaaa" mais o icone, e lado a lado sobravam 50px. */
  return (
    <div className="flex flex-col gap-1">
      <input
        type="date"
        value={de}
        onChange={(e) => aplicarVarios({ criadoDe: e.target.value })}
        aria-label="Criado a partir de"
        title="Criado a partir de"
        className={`${CAMPO} w-full ${ativo ? CAMPO_ATIVO : ""}`}
      />
      <input
        type="date"
        value={ate}
        onChange={(e) => aplicarVarios({ criadoAte: e.target.value })}
        aria-label="Criado até"
        title="Criado até"
        className={`${CAMPO} w-full ${ativo ? CAMPO_ATIVO : ""}`}
      />
    </div>
  );
}

/** Coluna Responsável — mesmo seletor com foto do Kanban (D-090). */
export function FiltroResponsavel({
  valor,
  usuarios,
}: {
  valor: string;
  usuarios: Usuario[];
}) {
  const { aplicar } = useFiltrosLista();
  return (
    <SeletorResponsavel
      usuarios={usuarios}
      escolhido={valor}
      aoEscolher={(id) => aplicar("responsavel", id)}
      classe={CAMPO}
      // O cabeçalho da coluna já diz "Responsável"; repetir a palavra
      // dentro de um campo de 120px fazia o texto quebrar em duas linhas.
      rotuloTodos="Todos"
    />
  );
}

/** Selecao simples (etapa, status, origem, produto, motivo de perda). */
export function FiltroSelecao({
  nomeParam,
  valor,
  opcoes,
  coluna,
  rotuloTodos = "Todos",
}: {
  nomeParam: string;
  valor: string;
  opcoes: { valor: string; rotulo: string }[];
  /** Nome da coluna — vai para o `aria-label`, nao para a tela. */
  coluna: string;
  /**
   * ⚠️ "Todos", e nao "Todos os produtos".
   *
   * A frase longa nao cabia em 85px e o `<select>` a cortava no meio —
   * "Todos os pr…" —, que e o que deixava a linha com cara de improviso.
   * E ela era redundante: o cabecalho LOGO ACIMA ja diz "PRODUTO". O
   * nome da coluna nao some da acessibilidade, so sai da repeticao: ele
   * passou para o `aria-label`, que antes dizia a bobagem "Filtrar por
   * todos os produtos".
   */
  rotuloTodos?: string;
}) {
  const { aplicar } = useFiltrosLista();

  return (
    <select
      value={valor}
      onChange={(e) => aplicar(nomeParam, e.target.value)}
      aria-label={`Filtrar por ${coluna}`}
      className={`${CAMPO} ${valor ? CAMPO_ATIVO : ""}`}
    >
      <option value="">{rotuloTodos}</option>
      {opcoes.map((o) => (
        <option key={o.valor} value={o.valor}>
          {o.rotulo}
        </option>
      ))}
    </select>
  );
}
