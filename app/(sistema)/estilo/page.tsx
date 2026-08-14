/* Superficie de verificacao dos tokens. A regra 4 do CLAUDE.md exige que
   todo componente seja conferido nos dois temas; esta pagina e onde isso
   se ve de uma vez. Morava na raiz durante a F0 e mudou para ca quando a
   Lista de negocios assumiu a rota principal. */

import { EtiquetaStatus, EtiquetaEtapa } from "@/components/dominio/etiquetas";
import { real } from "@/lib/formato";

const ETAPAS = [
  { n: 1, nome: "Cold Lead", faixa: "border-l-stage-1" },
  { n: 2, nome: "Hot Lead", faixa: "border-l-stage-2" },
  { n: 3, nome: "Contato Realizado", faixa: "border-l-stage-3" },
  { n: 4, nome: "Apresentação Realizada", faixa: "border-l-stage-4" },
  { n: 5, nome: "Proposta Enviada", faixa: "border-l-stage-5" },
  { n: 6, nome: "Aguardando Contrato", faixa: "border-l-stage-6" },
] as const;

const STATUS = ["parado", "negociacao", "ganho", "perdido"] as const;

const SEMANTICAS = [
  { nome: "Sucesso", bg: "bg-success-bg", ink: "text-success-ink" },
  { nome: "Alerta", bg: "bg-warning-bg", ink: "text-warning-ink" },
  { nome: "Erro", bg: "bg-danger-bg", ink: "text-danger-ink" },
  { nome: "Informação", bg: "bg-info-bg", ink: "text-info-ink" },
];

const NEGOCIOS = [
  { titulo: "Diagnóstico organizacional", org: "Metalúrgica Andrade", valor: 120000 },
  { titulo: "Reestruturação comercial", org: "Grupo Vertente", valor: 98500 },
  { titulo: "Planejamento estratégico", org: "Cooperativa São Bento", valor: 145000 },
];

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-text-muted mb-3 text-xs font-semibold uppercase tracking-caps">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

export default function PaginaEstilo() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight">Estilo</h1>
        <p className="text-text-secondary mt-1 text-md">
          Tokens da Lure conferidos em tema claro e escuro.
        </p>
      </header>

      <Secao titulo="Etapas do funil">
        <div className="grid gap-2 sm:grid-cols-2">
          {ETAPAS.map((e) => (
            <div
              key={e.n}
              className={`bg-surface border-border faixa-etapa rounded-md border px-3 py-2 shadow-xs ${e.faixa}`}
            >
              <EtiquetaEtapa nome={e.nome} ordem={e.n} />
            </div>
          ))}
        </div>
      </Secao>

      <Secao titulo="Status do negócio">
        <div className="flex flex-wrap gap-2">
          {STATUS.map((s) => (
            <span
              key={s}
              className="bg-surface border-border inline-flex items-center rounded-pill border px-3 py-1"
            >
              <EtiquetaStatus status={s} />
            </span>
          ))}
        </div>
      </Secao>

      <Secao titulo="Estados semânticos">
        <div className="grid gap-2 sm:grid-cols-4">
          {SEMANTICAS.map((s) => (
            <div key={s.nome} className={`rounded-md px-3 py-2 ${s.bg}`}>
              <span className={`text-sm font-medium ${s.ink}`}>{s.nome}</span>
            </div>
          ))}
        </div>
        <p className="text-text-muted mt-2 text-xs">
          O alerta é âmbar, não amarelo — o <code className="font-mono">#ffdd00</code>{" "}
          ficou reservado à ação e à etapa 6 (Doc 08, §3.1).
        </p>
      </Secao>

      <Secao titulo="Densidade da lista — 44px por linha">
        <div className="bg-surface border-border overflow-hidden rounded-md border">
          {NEGOCIOS.map((n, i) => (
            <div
              key={n.titulo}
              className={`h-row-cozy flex items-center gap-4 px-3 ${
                i > 0 ? "border-border border-t" : ""
              }`}
            >
              <span className="flex-1 truncate font-medium">{n.titulo}</span>
              <span className="text-text-secondary hidden flex-1 truncate sm:block">
                {n.org}
              </span>
              <span className="tabular text-right">{real(n.valor)}</span>
            </div>
          ))}
        </div>
      </Secao>
    </div>
  );
}
