"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bot, Check, Copy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAviso } from "@/components/dominio/avisos";
import { dataHora } from "@/lib/formato";
import { Interruptor } from "../notificacoes/painel-notificacoes";
import { desconectarAgente, salvarEscritaSensivel } from "./acoes";

export type AgenteConectado = { clienteId: string; nome: string; desde: string };

export type Chamada = {
  id: number;
  agente: string;
  ferramenta: string;
  argumentos: Record<string, unknown>;
  sucesso: boolean;
  erro: string | null;
  ocorrido_em: string;
};

/** O nome de cada ferramenta como a pessoa entende. */
const FERRAMENTAS: Record<string, string> = {
  resumo_de_pendencias: "Resumo de pendências",
  minhas_atividades_pendentes: "Atividades pendentes",
  buscar_no_crm: "Busca",
  ver_negocio: "Ficha de negócio",
  ver_organizacao: "Ficha de organização",
  ver_pessoa: "Ficha de pessoa",
};

export function PainelAgentes({
  enderecoMcp,
  escritaSensivel,
  conectados,
  falhaAoListar,
  chamadas,
}: {
  enderecoMcp: string;
  escritaSensivel: boolean;
  conectados: AgenteConectado[];
  falhaAoListar: boolean;
  chamadas: Chamada[];
}) {
  const router = useRouter();
  const avisar = useAviso();
  const [pendente, iniciar] = useTransition();
  const [sensivel, setSensivel] = useState(escritaSensivel);
  const [copiado, setCopiado] = useState(false);
  const [confirmando, setConfirmando] = useState<string | null>(null);

  function alternarSensivel() {
    const antes = sensivel;
    setSensivel(!antes);
    iniciar(async () => {
      const r = await salvarEscritaSensivel(!antes);
      if (r?.erro) {
        setSensivel(antes);
        avisar(r.erro, "erro");
      }
    });
  }

  function desconectar(agente: AgenteConectado) {
    iniciar(async () => {
      const r = await desconectarAgente(agente.clienteId);
      setConfirmando(null);
      if (r?.erro) {
        avisar(r.erro, "erro");
        return;
      }
      avisar(`${agente.nome} foi desconectado.`);
      router.refresh();
    });
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(enderecoMcp);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      avisar("Não foi possível copiar. Selecione o endereço e copie à mão.", "erro");
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6" data-pendente={pendente ? "" : undefined}>
      <header className="mb-6">
        <div className="flex items-center gap-2.5">
          <Bot className="text-text-muted size-5" aria-hidden />
          <h1 className="text-xl font-semibold tracking-tight">Agentes de IA</h1>
        </div>
        <p className="text-text-secondary mt-2 text-md">
          Um agente conectado age <strong className="text-text">como você</strong>: vê o que você vê,
          e o que ele fizer fica no seu nome. Tudo o que ele pede ao CRM fica registrado abaixo.
        </p>
      </header>

      <div className="flex flex-col gap-3">
        {/* ---------- Como conectar ---------- */}
        <section className="border-border bg-surface rounded-md border p-4">
          <h2 className="text-md font-semibold">Conectar um agente</h2>
          <p className="text-text-secondary mt-1 text-sm">
            No claude.ai, no Grok ou em outro agente que aceite conector MCP, adicione um conector
            personalizado com este endereço. Ao conectar, você entra com o Google da Lure e aprova.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <code className="bg-surface-sunken border-border min-w-0 flex-1 truncate rounded-md border px-3 py-2 text-sm">
              {enderecoMcp}
            </code>
            <Button type="button" variant="outline" onClick={copiar} aria-label="Copiar endereço">
              {copiado ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
            </Button>
          </div>
        </section>

        {/* ---------- Conectados ---------- */}
        <section className="border-border bg-surface rounded-md border p-4">
          <h2 className="text-md font-semibold">Agentes conectados</h2>
          {falhaAoListar ? (
            <p className="bg-danger-bg text-danger-ink mt-3 rounded-md px-3 py-2 text-sm">
              Não foi possível consultar os agentes conectados agora.
            </p>
          ) : conectados.length === 0 ? (
            <p className="text-text-muted mt-2 text-sm">Nenhum agente conectado.</p>
          ) : (
            <ul className="divide-border mt-2 divide-y">
              {conectados.map((a) => (
                <li key={a.clienteId} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <p className="text-md font-medium">{a.nome}</p>
                    <p className="text-text-muted text-sm">Conectado em {dataHora(a.desde)}</p>
                  </div>
                  {confirmando === a.clienteId ? (
                    <div className="flex items-center gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => setConfirmando(null)}>
                        Manter
                      </Button>
                      <Button type="button" size="sm" variant="destructive" onClick={() => desconectar(a)} disabled={pendente}>
                        Desconectar agora
                      </Button>
                    </div>
                  ) : (
                    <Button type="button" size="sm" variant="outline" onClick={() => setConfirmando(a.clienteId)}>
                      Desconectar
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ---------- Escrita sensível ---------- */}
        <section className="border-border bg-surface rounded-md border p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-md font-semibold">Permitir mudanças sensíveis</h2>
              <p className="text-text-secondary mt-1 text-sm">
                Deixa o agente mudar etapa, valor, responsável e desfecho dos negócios. Desligado, ele
                continua podendo consultar, anotar e criar atividades.
              </p>
            </div>
            <Interruptor
              ligado={sensivel}
              rotulo={`${sensivel ? "Desligar" : "Ligar"} mudanças sensíveis pelo agente`}
              aoAlternar={alternarSensivel}
            />
          </div>
          <p className="text-text-muted mt-3 text-sm">
            Hoje os agentes só consultam o CRM. Esta escolha passa a valer quando a escrita chegar.
          </p>
        </section>

        {/* ---------- Registro ---------- */}
        <section className="border-border bg-surface rounded-md border p-4">
          <h2 className="text-md font-semibold">Últimas chamadas</h2>
          {chamadas.length === 0 ? (
            <p className="text-text-muted mt-2 text-sm">Nenhum agente usou o CRM em seu nome ainda.</p>
          ) : (
            <ul className="divide-border mt-2 divide-y">
              {chamadas.map((c) => (
                <li key={c.id} className="flex items-start gap-2.5 py-2">
                  {c.sucesso ? (
                    <Check className="text-text-muted mt-0.5 size-4 shrink-0" aria-label="Atendida" />
                  ) : (
                    <X className="text-danger-ink mt-0.5 size-4 shrink-0" aria-label="Com erro" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{FERRAMENTAS[c.ferramenta] ?? c.ferramenta}</span>
                      <span className="text-text-muted"> · {c.agente}</span>
                    </p>
                    {resumoArgumentos(c.argumentos) && (
                      <p className="text-text-secondary truncate text-sm">{resumoArgumentos(c.argumentos)}</p>
                    )}
                    {c.erro && <p className="text-danger-ink text-sm">{c.erro}</p>}
                  </div>
                  <time className="text-text-muted shrink-0 text-sm tabular-nums">{dataHora(c.ocorrido_em)}</time>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

/** "texto: sicoob · onde: pessoas" — o que o agente pediu, em uma linha. */
function resumoArgumentos(args: Record<string, unknown>): string {
  return Object.entries(args ?? {})
    .map(([k, v]) => `${k.replace(/_/g, " ")}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
    .join(" · ");
}
