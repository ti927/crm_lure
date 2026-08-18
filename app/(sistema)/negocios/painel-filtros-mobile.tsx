"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X, Search } from "lucide-react";
import { STATUS_OPCOES } from "./consulta";

type Opcao = { id: string; nome: string };

/**
 * Filtros do celular, em painel próprio (B-111).
 *
 * No desktop cada filtro mora no cabeçalho da sua coluna (B-042), mas no
 * celular não existe cabeçalho de tabela — a Lista virou cartões. Então
 * os mesmos filtros voltam aqui, numa gaveta que sobe de baixo, com alvos
 * grandes o bastante para o dedo.
 *
 * O estado continua morando na URL, igual ao desktop: os dois caminhos
 * escrevem os mesmos parâmetros, e um link compartilhado abre igual nos
 * dois. Nada é aplicado enquanto a gaveta está aberta — só ao confirmar,
 * para não recarregar a lista a cada toque.
 */
export function PainelFiltrosMobile({
  etapas,
  origens,
  produtos,
  motivos,
  usuarios,
}: {
  etapas: Opcao[];
  origens: Opcao[];
  produtos: Opcao[];
  motivos: Opcao[];
  usuarios: Opcao[];
}) {
  const router = useRouter();
  const caminho = usePathname();
  const params = useSearchParams();
  const [aberto, setAberto] = useState(false);

  // Rascunho local: só vai para a URL quando confirmar. Nasce do que já
  // está na URL no momento em que a gaveta abre — por isso a `key` no
  // conteúdo lá embaixo, que remonta o formulário a cada abertura em vez
  // de sincronizar por efeito.
  const [rascunho, setRascunho] = useState<Record<string, string>>({});

  // Trava a rolagem do fundo enquanto a gaveta está aberta.
  useEffect(() => {
    if (!aberto) return;
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = antes;
    };
  }, [aberto]);

  function abrir() {
    const atual: Record<string, string> = {};
    for (const [k, v] of params.entries()) atual[k] = v;
    setRascunho(atual);
    setAberto(true);
  }

  const ativos = [
    "titulo",
    "organizacao",
    "valorMin",
    "valorMax",
    "etapa",
    "status",
    "origem",
    "produto",
    "responsavel",
    "motivoPerda",
    "criadoDe",
    "criadoAte",
  ].filter((k) => params.get(k)).length;

  function definir(chave: string, valor: string) {
    setRascunho((r) => {
      const novo = { ...r };
      if (valor) novo[chave] = valor;
      else delete novo[chave];
      return novo;
    });
  }

  function aplicar() {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(rascunho)) {
      if (v && k !== "pagina") p.set(k, v);
    }
    const s = p.toString();
    setAberto(false);
    router.push(s ? `${caminho}?${s}` : caminho);
  }

  function limpar() {
    setRascunho({});
  }

  const rotulo = "text-text-secondary mb-1 block text-sm font-medium";
  const campo =
    "h-control-lg bg-surface border-border text-md w-full rounded-md border px-3";

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        className="h-control-md border-border hover:bg-surface-hover inline-flex items-center gap-1.5 rounded-md border px-3 text-sm font-medium md:hidden"
      >
        <SlidersHorizontal className="size-3.5" aria-hidden />
        Filtros
        {ativos > 0 && (
          <span className="bg-brand text-brand-on rounded-full px-1.5 text-xs font-bold">
            {ativos}
          </span>
        )}
      </button>

      {aberto && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/50 md:hidden"
          onMouseDown={(e) => e.target === e.currentTarget && setAberto(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filtros"
            className="bg-surface animate-in slide-in-from-bottom flex max-h-[85vh] w-full flex-col rounded-t-xl duration-200"
          >
            <div className="border-border flex shrink-0 items-center justify-between border-b px-4 py-3">
              <h2 className="text-md font-semibold">Filtros</h2>
              <button
                type="button"
                onClick={() => setAberto(false)}
                aria-label="Fechar filtros"
                className="hover:bg-surface-hover -mr-1 inline-flex size-8 items-center justify-center rounded-md"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex flex-col gap-4">
                <div>
                  <label htmlFor="f-titulo" className={rotulo}>
                    Título
                  </label>
                  <div className="relative">
                    <Search
                      className="text-text-muted pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
                      aria-hidden
                    />
                    <input
                      id="f-titulo"
                      type="text"
                      value={rascunho.titulo ?? ""}
                      onChange={(e) => definir("titulo", e.target.value)}
                      placeholder="Buscar no título"
                      className={`${campo} pl-9`}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="f-org" className={rotulo}>
                    Organização
                  </label>
                  <input
                    id="f-org"
                    type="text"
                    value={rascunho.organizacao ?? ""}
                    onChange={(e) => definir("organizacao", e.target.value)}
                    placeholder="Buscar pela organização"
                    className={campo}
                  />
                </div>

                <Selecao
                  id="f-etapa"
                  rotulo="Etapa"
                  vazio="Todas as etapas"
                  valor={rascunho.etapa ?? ""}
                  opcoes={etapas}
                  aoMudar={(v) => definir("etapa", v)}
                  classe={campo}
                  rotuloClasse={rotulo}
                />

                <div>
                  <label htmlFor="f-status" className={rotulo}>
                    Status
                  </label>
                  <select
                    id="f-status"
                    value={rascunho.status ?? ""}
                    onChange={(e) => definir("status", e.target.value)}
                    className={campo}
                  >
                    <option value="">Todos os status</option>
                    {STATUS_OPCOES.map((s) => (
                      <option key={s.valor} value={s.valor}>
                        {s.rotulo}
                      </option>
                    ))}
                  </select>
                </div>

                <Selecao
                  id="f-resp"
                  rotulo="Responsável"
                  vazio="Todos os responsáveis"
                  valor={rascunho.responsavel ?? ""}
                  opcoes={usuarios}
                  aoMudar={(v) => definir("responsavel", v)}
                  classe={campo}
                  rotuloClasse={rotulo}
                />

                <div>
                  <span className={rotulo}>Valor</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      inputMode="decimal"
                      value={rascunho.valorMin ?? ""}
                      onChange={(e) => definir("valorMin", e.target.value)}
                      placeholder="mínimo"
                      aria-label="Valor mínimo"
                      className={campo}
                    />
                    <span className="text-text-muted" aria-hidden>
                      –
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={rascunho.valorMax ?? ""}
                      onChange={(e) => definir("valorMax", e.target.value)}
                      placeholder="máximo"
                      aria-label="Valor máximo"
                      className={campo}
                    />
                  </div>
                </div>

                <Selecao
                  id="f-origem"
                  rotulo="Origem"
                  vazio="Todas as origens"
                  valor={rascunho.origem ?? ""}
                  opcoes={origens}
                  aoMudar={(v) => definir("origem", v)}
                  classe={campo}
                  rotuloClasse={rotulo}
                />

                <Selecao
                  id="f-produto"
                  rotulo="Produto"
                  vazio="Todos os produtos"
                  valor={rascunho.produto ?? ""}
                  opcoes={produtos}
                  aoMudar={(v) => definir("produto", v)}
                  classe={campo}
                  rotuloClasse={rotulo}
                />

                <Selecao
                  id="f-motivo"
                  rotulo="Motivo de perda"
                  vazio="Todos os motivos"
                  valor={rascunho.motivoPerda ?? ""}
                  opcoes={motivos}
                  aoMudar={(v) => definir("motivoPerda", v)}
                  classe={campo}
                  rotuloClasse={rotulo}
                />

                <div>
                  <span className={rotulo}>Criado em</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={rascunho.criadoDe ?? ""}
                      onChange={(e) => definir("criadoDe", e.target.value)}
                      aria-label="Criado a partir de"
                      className={campo}
                    />
                    <input
                      type="date"
                      value={rascunho.criadoAte ?? ""}
                      onChange={(e) => definir("criadoAte", e.target.value)}
                      aria-label="Criado até"
                      className={campo}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-border flex shrink-0 gap-2 border-t p-4">
              <button
                type="button"
                onClick={limpar}
                className="h-control-lg border-border text-text-secondary flex-1 rounded-md border text-md font-medium"
              >
                Limpar
              </button>
              <button
                type="button"
                onClick={aplicar}
                className="h-control-lg bg-brand text-brand-on flex-[2] rounded-md text-md font-semibold"
              >
                Ver resultados
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Selecao({
  id,
  rotulo,
  vazio,
  valor,
  opcoes,
  aoMudar,
  classe,
  rotuloClasse,
}: {
  id: string;
  rotulo: string;
  vazio: string;
  valor: string;
  opcoes: Opcao[];
  aoMudar: (v: string) => void;
  classe: string;
  rotuloClasse: string;
}) {
  return (
    <div>
      <label htmlFor={id} className={rotuloClasse}>
        {rotulo}
      </label>
      <select
        id={id}
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        className={classe}
      >
        <option value="">{vazio}</option>
        {opcoes.map((o) => (
          <option key={o.id} value={o.id}>
            {o.nome}
          </option>
        ))}
      </select>
    </div>
  );
}
