import { ThemeToggle } from "@/components/theme-toggle";

/* Superficie de verificacao dos tokens. O Doc 08 exige que todo componente
   seja conferido nos dois temas; esta pagina e onde isso se ve de uma vez.
   Sai quando a Lista de Negocios (F3) ocupar a rota raiz. */

const ETAPAS = [
  { n: 1, nome: "Cold Lead", faixa: "border-l-stage-1", ink: "text-stage-1-ink" },
  { n: 2, nome: "Hot Lead", faixa: "border-l-stage-2", ink: "text-stage-2-ink" },
  { n: 3, nome: "Contato Realizado", faixa: "border-l-stage-3", ink: "text-stage-3-ink" },
  { n: 4, nome: "Apresentação Realizada", faixa: "border-l-stage-4", ink: "text-stage-4-ink" },
  { n: 5, nome: "Proposta Enviada", faixa: "border-l-stage-5", ink: "text-stage-5-ink" },
  { n: 6, nome: "Aguardando Contrato", faixa: "border-l-stage-6", ink: "text-stage-6-ink" },
];

const STATUS = [
  { nome: "Parado", ponto: "bg-status-parado", ink: "text-status-parado-ink" },
  { nome: "Negociação", ponto: "bg-status-negociacao", ink: "text-status-negociacao-ink" },
  { nome: "Ganho", ponto: "bg-status-ganho", ink: "text-status-ganho-ink" },
  { nome: "Perdido", ponto: "bg-status-perdido", ink: "text-status-perdido-ink" },
];

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

const real = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default function Home() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-10 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">CRM Lure</h1>
          <p className="text-text-secondary mt-1 text-md">
            Fundação (F0) — tokens da Lure em tema claro e escuro.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <section className="mb-10">
        <h2 className="text-text-muted mb-3 text-xs font-semibold uppercase tracking-caps">
          Etapas do funil
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {ETAPAS.map((e) => (
            <div
              key={e.n}
              className={`bg-surface border-border faixa-etapa rounded-md border px-3 py-2 shadow-xs ${e.faixa}`}
            >
              {/* A distinção de etapa nunca depende só de cor: o nome vai escrito. */}
              <span className={`text-md font-medium ${e.ink}`}>{e.nome}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-text-muted mb-3 text-xs font-semibold uppercase tracking-caps">
          Status do negócio
        </h2>
        <div className="flex flex-wrap gap-2">
          {STATUS.map((s) => (
            <span
              key={s.nome}
              className="bg-surface border-border inline-flex items-center gap-2 rounded-pill border px-3 py-1"
            >
              <span className={`size-2 rounded-pill ${s.ponto}`} aria-hidden />
              <span className={`text-sm font-medium ${s.ink}`}>{s.nome}</span>
            </span>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-text-muted mb-3 text-xs font-semibold uppercase tracking-caps">
          Estados semânticos
        </h2>
        <div className="grid gap-2 sm:grid-cols-4">
          {SEMANTICAS.map((s) => (
            <div key={s.nome} className={`rounded-md px-3 py-2 ${s.bg}`}>
              <span className={`text-sm font-medium ${s.ink}`}>{s.nome}</span>
            </div>
          ))}
        </div>
        <p className="text-text-muted mt-2 text-xs">
          O alerta é âmbar, não amarelo — o <code className="font-mono">#ffdd00</code> ficou
          reservado à ação e à etapa 6 (Doc 08, §3.1).
        </p>
      </section>

      <section>
        <h2 className="text-text-muted mb-3 text-xs font-semibold uppercase tracking-caps">
          Densidade da lista — 44px por linha
        </h2>
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
              <span className="tabular text-right">{real.format(n.valor)}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
