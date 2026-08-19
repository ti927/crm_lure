"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Download, SlidersHorizontal, X } from "lucide-react";
import type { Filtros } from "./consulta";

type Opcao = { id: string; nome: string };

/**
 * Recorte dos indicadores (D-064): período · responsável · origem ·
 * produto · área — mais o interruptor de parados (D-067).
 *
 * ⚠️ Nada é aplicado enquanto a gaveta está aberta, só ao confirmar. É o
 * mesmo padrão do painel de filtros da Lista no celular: sete consultas
 * ao banco a cada tecla digitada seria desperdício e piscaria a tela.
 */
export function FiltrosIndicadores({
  filtros,
  usuarios,
  origens,
  produtos,
  areas,
  consulta,
  destino = "/estatisticas",
  esconderParados = false,
}: {
  filtros: Filtros;
  usuarios: Opcao[];
  origens: Opcao[];
  produtos: Opcao[];
  areas: Opcao[];
  consulta: string;
  /** Para onde o recorte navega — a barra serve as duas abas. */
  destino?: string;
  /**
   * O financeiro não oferece o interruptor de parados: cadastro dormente
   * não é receita nem pipeline, e oferecer a escolha convidaria a somar
   * dinheiro que não existe.
   */
  esconderParados?: boolean;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [pendente, comecar] = useTransition();
  const [rascunho, setRascunho] = useState<Filtros>(filtros);

  const ativo =
    filtros.de ||
    filtros.ate ||
    filtros.responsavel ||
    filtros.origem ||
    filtros.produto ||
    filtros.area ||
    (!esconderParados && filtros.incluirParados);

  function aplicar(f: Filtros) {
    const q = new URLSearchParams();
    if (f.de) q.set("de", f.de);
    if (f.ate) q.set("ate", f.ate);
    if (f.responsavel) q.set("responsavel", f.responsavel);
    if (f.origem) q.set("origem", f.origem);
    if (f.produto) q.set("produto", f.produto);
    if (f.area) q.set("area", f.area);
    if (f.incluirParados && !esconderParados) q.set("parados", "1");
    const s = q.toString();
    setAberto(false);
    comecar(() => router.push(s ? `${destino}?${s}` : destino));
  }

  const rotulo = "text-text-secondary mb-1 block text-sm font-medium";
  const campo =
    "h-control-md bg-surface border-border text-md w-full rounded-md border px-2.5";

  return (
    <div className="flex items-center gap-2" data-pendente={pendente || undefined}>
      <a
        href={consulta ? `${destino}/exportar?${consulta}` : `${destino}/exportar`}
        className="h-control-md border-border text-text-secondary hover:bg-surface-hover hover:text-text inline-flex items-center gap-1.5 rounded-md border px-3 text-sm font-medium"
      >
        <Download className="size-3.5" aria-hidden />
        Exportar CSV
      </a>

      <button
        type="button"
        onClick={() => {
          setRascunho(filtros);
          setAberto(true);
        }}
        className={`h-control-md inline-flex items-center gap-1.5 rounded-md border px-3 text-sm font-medium ${
          ativo
            ? "border-brand-ink text-text"
            : "border-border text-text-secondary hover:bg-surface-hover hover:text-text"
        }`}
      >
        <SlidersHorizontal className="size-3.5" aria-hidden />
        Recorte
        {/* Recorte ativo nunca depende só da borda: o ponto amarelo é
            fundo com forma própria, e #ffdd00 aqui é fundo, não tinta. */}
        {ativo && <span className="bg-brand size-1.5 rounded-pill" aria-hidden />}
      </button>

      {ativo && (
        <button
          type="button"
          onClick={() =>
            aplicar({
              de: "",
              ate: "",
              responsavel: "",
              origem: "",
              produto: "",
              area: "",
              incluirParados: false,
            })
          }
          className="h-control-md text-text-secondary hover:bg-surface-hover hover:text-text inline-flex items-center gap-1 rounded-md px-2 text-sm font-medium"
        >
          <X className="size-3.5" aria-hidden />
          Limpar
        </button>
      )}

      {aberto && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
          onMouseDown={(e) => e.target === e.currentTarget && setAberto(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-recorte"
            className="border-border bg-surface my-8 w-full max-w-md rounded-lg border p-5 shadow-xl"
          >
            <h2 id="titulo-recorte" className="text-lg font-semibold">
              Recorte dos indicadores
            </h2>
            <p className="text-text-muted mt-1 text-sm">
              Vale para todos os números da tela ao mesmo tempo.
            </p>

            <div className="mt-4 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="ind-de" className={rotulo}>
                    De
                  </label>
                  <input
                    id="ind-de"
                    type="date"
                    value={rascunho.de}
                    onChange={(e) => setRascunho({ ...rascunho, de: e.target.value })}
                    className={campo}
                  />
                </div>
                <div>
                  <label htmlFor="ind-ate" className={rotulo}>
                    Até
                  </label>
                  <input
                    id="ind-ate"
                    type="date"
                    value={rascunho.ate}
                    onChange={(e) => setRascunho({ ...rascunho, ate: e.target.value })}
                    className={campo}
                  />
                </div>
              </div>

              <Selecao
                id="ind-responsavel"
                rotulo="Responsável"
                todos="Todos"
                valor={rascunho.responsavel}
                opcoes={usuarios}
                aoMudar={(v) => setRascunho({ ...rascunho, responsavel: v })}
              />
              <Selecao
                id="ind-origem"
                rotulo="Origem"
                todos="Todas"
                valor={rascunho.origem}
                opcoes={origens}
                aoMudar={(v) => setRascunho({ ...rascunho, origem: v })}
              />
              <Selecao
                id="ind-produto"
                rotulo="Produto"
                todos="Todos"
                valor={rascunho.produto}
                opcoes={produtos}
                aoMudar={(v) => setRascunho({ ...rascunho, produto: v })}
              />
              <Selecao
                id="ind-area"
                rotulo="Área do produto"
                todos="Todas"
                valor={rascunho.area}
                opcoes={areas}
                aoMudar={(v) => setRascunho({ ...rascunho, area: v })}
              />

              {/* D-067 na tela: o interruptor existe porque a decisão previu
                  que às vezes se quer olhar a base dormente de propósito. */}
              {!esconderParados && (
              <label className="border-border bg-surface-sunken flex cursor-pointer items-start gap-2.5 rounded-md border p-3">
                <input
                  type="checkbox"
                  checked={rascunho.incluirParados}
                  onChange={(e) =>
                    setRascunho({ ...rascunho, incluirParados: e.target.checked })
                  }
                  className="mt-0.5 size-4 shrink-0"
                />
                <span>
                  <span className="text-md block font-medium">Incluir negócios parados</span>
                  <span className="text-text-muted text-sm">
                    Cadastro dormente fica fora dos indicadores de desempenho por
                    padrão. Ligue para ver a saúde da base.
                  </span>
                </span>
              </label>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAberto(false)}
                className="h-control-md text-text-secondary hover:bg-surface-hover rounded-md px-3 text-md font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => aplicar(rascunho)}
                className="h-control-md bg-brand text-brand-on rounded-md px-4 text-md font-semibold"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Selecao({
  id,
  rotulo,
  todos,
  valor,
  opcoes,
  aoMudar,
}: {
  id: string;
  rotulo: string;
  todos: string;
  valor: string;
  opcoes: Opcao[];
  aoMudar: (v: string) => void;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="text-text-secondary mb-1 block text-sm font-medium"
      >
        {rotulo}
      </label>
      <select
        id={id}
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        className="h-control-md bg-surface border-border text-md w-full rounded-md border px-2.5"
      >
        <option value="">{todos}</option>
        {opcoes.map((o) => (
          <option key={o.id} value={o.id}>
            {o.nome}
          </option>
        ))}
      </select>
    </div>
  );
}
