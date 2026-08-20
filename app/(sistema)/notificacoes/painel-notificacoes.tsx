"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import {
  ORDEM_TIPOS,
  TIPOS,
  rotuloDegrau,
  type Preferencia,
  type TipoNotificacao,
} from "@/lib/notificacoes";
import { salvarPreferencia } from "./acoes";
import { BlocoPush } from "./bloco-push";
import { useAviso } from "@/components/dominio/avisos";

/**
 * F8 — os quatro blocos de configuração (Doc 15 §5.2).
 *
 * ⚠️ Os degraus vêm da D-139 (30/45/60/90) e da D-140 (1/2/3/7), e não
 * de campo livre. Degrau fechado evita alguém digitar 3 e transformar o
 * sino em ruído. A mesma regra está no `check` do banco: a tela é a
 * conveniência, a restrição é a guarda.
 *
 * ⚠️ Escolher o valor que já é o padrão APAGA a linha em vez de gravá-la
 * (a ação cuida disso). A tabela precisa continuar significando "quem
 * quis diferente" — senão, mudar o padrão um dia não alcançaria quem
 * nunca escolheu de verdade.
 */
export function PainelNotificacoes({
  preferencias,
  chavePushPublica,
}: {
  preferencias: Preferencia[];
  chavePushPublica: string;
}) {
  const router = useRouter();
  const avisar = useAviso();
  const [salvando, iniciar] = useTransition();

  const inicial = new Map(preferencias.map((p) => [p.tipo, p]));
  const [estado, setEstado] = useState<Record<TipoNotificacao, Preferencia>>(() => {
    const base = {} as Record<TipoNotificacao, Preferencia>;
    for (const tipo of ORDEM_TIPOS) {
      const p = inicial.get(tipo);
      base[tipo] = {
        tipo,
        ativo: p?.ativo ?? true,
        dias: p?.dias ?? TIPOS[tipo].padrao,
      };
    }
    return base;
  });

  function aplicar(tipo: TipoNotificacao, mudanca: Partial<Preferencia>) {
    const antes = estado[tipo];
    const depois = { ...antes, ...mudanca };
    setEstado((s) => ({ ...s, [tipo]: depois }));

    iniciar(async () => {
      const r = await salvarPreferencia(tipo, depois.ativo, depois.dias);
      if (r?.erro) {
        setEstado((s) => ({ ...s, [tipo]: antes }));
        avisar(r.erro, "erro");
        return;
      }
      // O sino vive no layout: sem isto o número só mudaria na próxima
      // navegação completa.
      router.refresh();
    });
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <header className="mb-6">
        <div className="flex items-center gap-2.5">
          <Bell className="text-text-muted size-5" aria-hidden />
          <h1 className="text-xl font-semibold tracking-tight">Notificações</h1>
        </div>
        <p className="text-text-secondary mt-2 text-md">
          Estas escolhas são só suas. O sino calcula os alertas toda vez que você abre o
          sistema — nada fica agendado, e o aviso some sozinho quando o motivo dele
          desaparece.
        </p>
      </header>

      <div className="mb-3">
        <BlocoPush chavePublica={chavePushPublica} />
      </div>

      <div data-pendente={salvando ? "" : undefined} className="flex flex-col gap-3">
        {ORDEM_TIPOS.map((tipo) => (
          <BlocoTipo
            key={tipo}
            tipo={tipo}
            preferencia={estado[tipo]}
            aoMudar={aplicar}
          />
        ))}
      </div>

      <p className="text-text-muted mt-6 text-sm">
        O número no sino conta só o que exige ação — negócio parado e atividade vencida.
        As próximas atividades aparecem na lista sem entrar na conta.
      </p>
    </div>
  );
}

function BlocoTipo({
  tipo,
  preferencia,
  aoMudar,
}: {
  tipo: TipoNotificacao;
  preferencia: Preferencia;
  aoMudar: (tipo: TipoNotificacao, mudanca: Partial<Preferencia>) => void;
}) {
  const def = TIPOS[tipo];
  const escolhido = preferencia.dias ?? def.padrao;

  return (
    <section className="border-border bg-surface rounded-md border p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-md font-semibold">{def.rotulo}</h2>
          <p className="text-text-secondary mt-1 text-sm">{def.explicacao}</p>
        </div>

        <Interruptor
          ligado={preferencia.ativo}
          rotulo={`${preferencia.ativo ? "Desativar" : "Ativar"} ${def.rotulo}`}
          aoAlternar={() => aoMudar(tipo, { ativo: !preferencia.ativo })}
        />
      </div>

      {def.degraus.length > 0 && (
        <fieldset className="mt-3" disabled={!preferencia.ativo}>
          <legend className="text-text-muted mb-1.5 text-sm">
            {tipo === "negocio_parado"
              ? "Avisar quando ficar sem movimento por:"
              : "Avisar com antecedência de:"}
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {def.degraus.map((d) => {
              const atual = escolhido === d;
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={atual}
                  onClick={() => aoMudar(tipo, { dias: d })}
                  className={`h-control-md rounded-md border px-3 text-sm font-medium disabled:opacity-50 ${
                    atual
                      ? "border-brand-ink bg-surface-hover text-text"
                      : "border-border text-text-secondary hover:bg-surface-hover"
                  }`}
                >
                  {rotuloDegrau(tipo, d)}
                </button>
              );
            })}
          </div>
          {escolhido === def.padrao && (
            <p className="text-text-muted mt-1.5 text-sm">Padrão do sistema.</p>
          )}
        </fieldset>
      )}

      {/* P-042: o prazo do follow-up ainda não é editável. A D-021 só o
          descreve como desativável, e inventar o campo seria decidir
          sozinho — o schema já aceita, quando for decidido. */}
      {tipo === "follow_up_ganho" && (
        <p className="text-text-muted mt-3 text-sm">
          Prazo fixo de 90 dias.
        </p>
      )}
    </section>
  );
}

/**
 * Interruptor sobre `<button role="switch">` — o elemento nativo mais
 * próximo. Um checkbox estilizado daria o mesmo desenho e perderia o
 * `aria-checked`, que é o que o leitor de tela anuncia como "ligado".
 */
function Interruptor({
  ligado,
  rotulo,
  aoAlternar,
}: {
  ligado: boolean;
  rotulo: string;
  aoAlternar: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-label={rotulo}
      onClick={aoAlternar}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-pill border transition-colors ${
        ligado
          ? "bg-brand border-brand-ink hover:bg-brand-hover"
          : "bg-surface-sunken border-border hover:bg-surface-hover hover:border-border-strong"
      }`}
    >
      <span
        className={`bg-surface border-border size-4 rounded-full border shadow-sm transition-transform ${
          ligado ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}
