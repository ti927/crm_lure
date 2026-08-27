"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Crown, ExternalLink, Loader2, TriangleAlert } from "lucide-react";
import { data as fdata } from "@/lib/formato";
import { useAviso } from "@/components/dominio/avisos";
import { previaFusao, fundirOrganizacao, type Previa } from "./acoes";

export type Cadastro = {
  id: string;
  nome: string;
  cidade: string | null;
  website: string | null;
  bubble_id: string | null;
  criado_em: string;
  negocios: number;
  pessoas: number;
  atividades: number;
  anotacoes: number;
};

const peso = (c: Cadastro) =>
  Number(c.negocios) + Number(c.pessoas) + Number(c.atividades) + Number(c.anotacoes);

/**
 * Os cadastros de um grupo, para escolher qual sobrevive e fundir os
 * outros **um por um**.
 *
 * ⚠️ Não existe "fundir o grupo inteiro", por decisão do maestro, e a
 * razão está na própria base: o agrupamento é por NOME, e nome igual não
 * prova que é a mesma empresa. Um botão que resolvesse onze cadastros de
 * uma vez existiria para ser clicado sem ler — e a operação não tem
 * desfazer.
 */
export function PainelGrupo({
  nome,
  cadastros,
}: {
  nome: string;
  cadastros: Cadastro[];
}) {
  const router = useRouter();
  const avisar = useAviso();

  // ⚠️ Sugere o mais pesado, e não o mais antigo: fundir o cadastro gordo
  // dentro do magro move muito mais linha sem necessidade, e é onde um
  // erro custa mais caro. Sugestão, não imposição — o dono da decisão é
  // quem está olhando.
  const sugerido = [...cadastros].sort((a, b) => peso(b) - peso(a))[0]?.id ?? "";
  const [principal, setPrincipal] = useState(sugerido);

  const [previa, setPrevia] = useState<Previa | null>(null);
  const [alvo, setAlvo] = useState<Cadastro | null>(null);
  const [carregando, setCarregando] = useState<string | null>(null);
  const [fundindo, setFundindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function pedirPrevia(c: Cadastro) {
    setErro(null);
    setCarregando(c.id);
    const r = await previaFusao(principal, c.id);
    setCarregando(null);
    if (r.erro || !r.previa) return setErro(r.erro ?? "Não foi possível calcular a prévia.");
    setAlvo(c);
    setPrevia(r.previa);
  }

  async function confirmar() {
    if (!alvo) return;
    setFundindo(true);
    setErro(null);
    const r = await fundirOrganizacao(principal, alvo.id);
    setFundindo(false);
    if (r.erro) return setErro(r.erro);
    setPrevia(null);
    setAlvo(null);
    avisar(`"${alvo.nome}" foi fundida.`);
    router.refresh();
  }

  if (cadastros.length === 0) {
    return <p className="text-text-muted text-sm">Grupo vazio ou já resolvido.</p>;
  }

  return (
    <section>
      <div className="mb-3">
        <h2 className="text-lg font-semibold">{nome}</h2>
        <p className="text-text-muted text-sm">
          {cadastros.length} cadastros com este nome. Escolha qual permanece e funda os
          outros, um de cada vez.
        </p>
      </div>

      {erro && (
        <p
          role="alert"
          className="border-danger text-danger-ink mb-3 rounded-md border px-3 py-2 text-sm"
        >
          {erro}
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {cadastros.map((c) => {
          const ehPrincipal = c.id === principal;
          const vazio = peso(c) === 0;
          return (
            <li
              key={c.id}
              className={`rounded-md border px-3 py-2.5 ${
                ehPrincipal ? "border-brand-ink bg-surface-sunken" : "border-border"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2.5">
                  <input
                    type="radio"
                    name="principal"
                    checked={ehPrincipal}
                    onChange={() => setPrincipal(c.id)}
                    className="mt-1 size-4 shrink-0 accent-brand-ink"
                    aria-label={`Manter ${c.nome} (${c.id.slice(0, 8)})`}
                  />
                  <span className="min-w-0">
                    <span className="text-md flex flex-wrap items-center gap-2 font-medium">
                      <span className="truncate">{c.nome}</span>
                      {ehPrincipal && (
                        <span className="bg-brand text-brand-on inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold">
                          <Crown className="size-3" aria-hidden />
                          Permanece
                        </span>
                      )}
                      {vazio && !ehPrincipal && (
                        <span className="text-text-muted shrink-0 text-xs">
                          nada vinculado
                        </span>
                      )}
                    </span>

                    <span className="text-text-muted mt-0.5 flex flex-wrap items-center gap-x-2 text-sm">
                      <span className="font-mono text-xs">{c.id.slice(0, 8)}</span>
                      <span aria-hidden className="opacity-40">·</span>
                      <span>criado {fdata(c.criado_em)}</span>
                      {c.cidade && (
                        <>
                          <span aria-hidden className="opacity-40">·</span>
                          <span>{c.cidade}</span>
                        </>
                      )}
                      {c.website && (
                        <>
                          <span aria-hidden className="opacity-40">·</span>
                          <span className="truncate">{c.website}</span>
                        </>
                      )}
                    </span>

                    <span className="text-text-secondary tabular mt-1 flex flex-wrap gap-x-3 text-sm">
                      <span>{c.negocios} negócios</span>
                      <span>{c.pessoas} pessoas</span>
                      <span>{c.atividades} atividades</span>
                      <span>{c.anotacoes} anotações</span>
                    </span>
                  </span>
                </label>

                <span className="flex shrink-0 items-center gap-2">
                  <Link
                    href={`/contatos/organizacoes/${c.id}`}
                    target="_blank"
                    className="text-text-secondary hover:text-text inline-flex items-center gap-1 text-sm"
                  >
                    Abrir
                    <ExternalLink className="size-3" aria-hidden />
                  </Link>

                  {!ehPrincipal && (
                    <button
                      type="button"
                      onClick={() => void pedirPrevia(c)}
                      disabled={carregando === c.id}
                      className="h-control-sm border-border hover:bg-surface-hover inline-flex items-center gap-1.5 rounded-md border px-2.5 text-sm font-medium disabled:opacity-50"
                    >
                      {carregando === c.id && (
                        <Loader2 className="size-3.5 animate-spin" aria-hidden />
                      )}
                      Fundir na principal
                    </button>
                  )}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      {previa && alvo && (
        <DialogoConfirmacao
          previa={previa}
          fundindo={fundindo}
          aoCancelar={() => {
            setPrevia(null);
            setAlvo(null);
          }}
          aoConfirmar={() => void confirmar()}
        />
      )}
    </section>
  );
}

/**
 * A confirmação mostra a prévia que veio do BANCO — a mesma consulta que
 * a fusão usa para mover. Um número calculado na tela e outro no servidor
 * divergiriam no dia em que alguém mexesse só num dos dois.
 */
function DialogoConfirmacao({
  previa,
  fundindo,
  aoCancelar,
  aoConfirmar,
}: {
  previa: Previa;
  fundindo: boolean;
  aoCancelar: () => void;
  aoConfirmar: () => void;
}) {
  const m = previa.move;
  const nada = m.negocios + m.atividades + m.anotacoes + m.pessoas === 0;
  const descarta = Object.entries(previa.descarta ?? {});
  const adota = Object.entries(previa.adota ?? {});

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Confirmar fusão"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="bg-surface border-border w-full max-w-lg rounded-lg border p-5 shadow-xl">
        <h3 className="text-lg font-semibold">Fundir cadastro</h3>
        <p className="text-text-secondary mt-1 text-sm">
          Tudo abaixo passa de <strong>{previa.duplicada.nome}</strong> (
          <span className="font-mono text-xs">{previa.duplicada.id.slice(0, 8)}</span>)
          para <strong>{previa.principal.nome}</strong> (
          <span className="font-mono text-xs">{previa.principal.id.slice(0, 8)}</span>).
          O cadastro de origem é apagado depois.
        </p>

        <ul className="border-border mt-3 grid grid-cols-2 gap-2 rounded-md border p-3 text-md">
          <li className="tabular">{m.negocios} negócios</li>
          <li className="tabular">{m.atividades} atividades</li>
          <li className="tabular">{m.anotacoes} anotações</li>
          <li className="tabular">{m.pessoas} vínculos de pessoa</li>
        </ul>

        {previa.ja_vinculadas > 0 && (
          <p className="text-text-muted mt-2 text-sm">
            {previa.ja_vinculadas}{" "}
            {previa.ja_vinculadas === 1 ? "pessoa já está" : "pessoas já estão"} vinculada
            {previa.ja_vinculadas === 1 ? "" : "s"} à principal — o vínculo repetido some,
            e o cargo é aproveitado se a principal não tiver.
          </p>
        )}

        {adota.length > 0 && (
          <p className="text-text-muted mt-2 text-sm">
            A principal vai adotar o que está vazio nela:{" "}
            {adota.map(([k, v]) => `${k} "${v}"`).join(", ")}.
          </p>
        )}

        {/* ⚠️ O que se perde aparece com o mesmo destaque do que se ganha.
            Preenchido nos dois e diferente, o valor da duplicada some — e
            quem confirma tem de ver isso antes, não depois. */}
        {descarta.length > 0 && (
          <p className="border-warning bg-warning-bg text-warning-ink mt-2 flex items-start gap-2 rounded-md border px-3 py-2 text-sm">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              Estes valores da duplicada <strong>serão perdidos</strong>, porque a
              principal já tem os dela:{" "}
              {descarta.map(([k, v]) => `${k} "${v}"`).join(", ")}.
            </span>
          </p>
        )}

        {nada && (
          <p className="text-text-muted mt-2 text-sm">
            Este cadastro não tem nada vinculado — a fusão só o apaga.
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={aoCancelar}
            disabled={fundindo}
            className="h-control-md border-border hover:bg-surface-hover rounded-md border px-3 text-md font-medium disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={aoConfirmar}
            disabled={fundindo}
            className="h-control-md bg-brand text-brand-on hover:bg-brand-hover inline-flex items-center gap-2 rounded-md px-3 text-md font-semibold disabled:opacity-50"
          >
            {fundindo && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {fundindo ? "Fundindo…" : "Fundir sem desfazer"}
          </button>
        </div>
      </div>
    </div>
  );
}
