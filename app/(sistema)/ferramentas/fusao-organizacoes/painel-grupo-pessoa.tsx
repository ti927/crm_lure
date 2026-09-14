"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Crown, Loader2, TriangleAlert, Building2, Phone, Briefcase } from "lucide-react";
import { data as fdata } from "@/lib/formato";
import { useAviso } from "@/components/dominio/avisos";
import { previaFusaoPessoa, fundirPessoa, type PreviaPessoa } from "./acoes-pessoa";

export type CadastroPessoa = {
  id: string;
  nome: string;
  criado_em: string;
  contatos: string[] | null;
  organizacoes: string[] | null;
  negocios: string[] | null;
  atividades: number;
  anotacoes: number;
  peso: number;
};

/** Nome de uma palavra só é o sinal de perigo desta tela. Ver abaixo. */
export function nomeDeUmaPalavra(nome: string): boolean {
  return nome.trim().split(/\s+/).length === 1;
}

/**
 * Os cadastros de um grupo de homônimos, para escolher qual sobrevive e
 * fundir os outros **um por um**.
 *
 * ⚠️ **NOME IGUAL PROVA MENOS EM PESSOA DO QUE EM ORGANIZAÇÃO, e a base
 * mostra o tamanho disso:** "Gustavo" está 20 vezes, "Fernanda" 14,
 * "Fabio" 14. Seis "Sicoob Credseguro" são quase certamente a mesma
 * empresa; vinte "Gustavo" são quase certamente vinte pessoas. Por isso
 * esta tela põe a ORGANIZAÇÃO de cada cadastro em primeiro plano — é ela
 * que responde à pergunta que decide a fusão — e avisa em cima quando o
 * grupo é de primeiro nome solto.
 *
 * ⚠️ Não existe "fundir o grupo inteiro". Um botão que resolvesse vinte
 * cadastros de uma vez existiria para ser clicado sem ler, e a operação
 * não tem desfazer.
 */
export function PainelGrupoPessoa({
  nome,
  cadastros,
}: {
  nome: string;
  cadastros: CadastroPessoa[];
}) {
  const router = useRouter();
  const avisar = useAviso();

  // ⚠️ Sugere quem carrega mais história, e não o mais antigo: fundir o
  // cadastro cheio dentro do vazio move muito mais linha sem necessidade.
  // Sugestão, não imposição.
  const sugerido = [...cadastros].sort((a, b) => Number(b.peso) - Number(a.peso))[0]?.id ?? "";
  const [principal, setPrincipal] = useState(sugerido);

  const [previa, setPrevia] = useState<PreviaPessoa | null>(null);
  const [alvo, setAlvo] = useState<CadastroPessoa | null>(null);
  const [carregando, setCarregando] = useState<string | null>(null);
  const [fundindo, setFundindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const perigoso = nomeDeUmaPalavra(nome);

  async function pedirPrevia(c: CadastroPessoa) {
    setErro(null);
    setCarregando(c.id);
    const r = await previaFusaoPessoa(principal, c.id);
    setCarregando(null);
    if (r.erro || !r.previa) {
      return setErro(r.erro ?? "Não foi possível calcular a prévia.");
    }
    setAlvo(c);
    setPrevia(r.previa);
  }

  async function confirmar() {
    if (!alvo) return;
    setFundindo(true);
    setErro(null);
    const r = await fundirPessoa(principal, alvo.id);
    setFundindo(false);
    if (r.erro) return setErro(r.erro);
    avisar(`"${alvo.nome}" foi fundida. O cadastro duplicado deixou de existir.`);
    setPrevia(null);
    setAlvo(null);
    router.refresh();
  }

  const org = (c: CadastroPessoa) => (c.organizacoes ?? []).filter(Boolean);

  return (
    <div className="min-w-0">
      <h2 className="text-lg font-semibold">{nome}</h2>
      <p className="text-text-muted text-sm">
        {cadastros.length} cadastros com este nome · escolha qual fica e funda os outros
        um a um
      </p>

      {/* ⚠️ O aviso aparece SÓ quando o nome tem uma palavra, e é por isso
          que ele é lido: avisado em todo grupo, viraria a faixa que
          ninguém enxerga. "Gustavo" ×20 é o caso em que a ferramenta
          precisa atrapalhar. */}
      {perigoso && (
        <div className="border-danger bg-danger-bg mt-3 flex items-start gap-2 rounded-md border px-3 py-2">
          <TriangleAlert className="text-danger-ink mt-0.5 size-4 shrink-0" aria-hidden />
          <p className="text-danger-ink text-sm">
            <strong>Só o primeiro nome está cadastrado.</strong> Pessoas diferentes de
            empresas diferentes compartilham primeiro nome o tempo todo — na base,
            &ldquo;Gustavo&rdquo; aparece 20 vezes. Confira a organização de cada um
            abaixo; se forem empresas diferentes, provavelmente são pessoas diferentes e
            não há nada a fundir.
          </p>
        </div>
      )}

      {erro && (
        <p role="alert" className="text-danger-ink mt-3 text-sm">
          {erro}
        </p>
      )}

      <ul className="mt-4 flex flex-col gap-2">
        {cadastros.map((c) => {
          const ehPrincipal = c.id === principal;
          const orgs = org(c);
          return (
            <li
              key={c.id}
              className={`border-border rounded-md border p-3 ${
                ehPrincipal ? "border-brand-ink bg-surface-sunken" : "bg-surface"
              }`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5">
                  {ehPrincipal && (
                    <Crown className="text-brand-ink size-3.5 shrink-0" aria-hidden />
                  )}
                  <span className="text-md truncate font-medium">{c.nome}</span>
                </span>
                <span className="text-text-muted shrink-0 text-xs">
                  criado em {fdata(c.criado_em)}
                </span>
              </div>

              {/* ⚠️ A ORGANIZAÇÃO vem primeiro, antes de qualquer contagem:
                  é o único dado desta lista que responde "é a mesma
                  pessoa?". Sem ela, decidir seria adivinhar. */}
              <p className="text-text-secondary mt-1.5 flex min-w-0 items-start gap-1.5 text-sm">
                <Building2 className="text-text-muted mt-0.5 size-3.5 shrink-0" aria-hidden />
                <span className="min-w-0">
                  {orgs.length > 0 ? (
                    orgs.join(" · ")
                  ) : (
                    <span className="text-text-muted italic">sem organização</span>
                  )}
                </span>
              </p>

              {(c.contatos ?? []).length > 0 && (
                <p className="text-text-secondary mt-1 flex min-w-0 items-start gap-1.5 text-sm">
                  <Phone className="text-text-muted mt-0.5 size-3.5 shrink-0" aria-hidden />
                  <span className="min-w-0 break-words">{(c.contatos ?? []).join(" · ")}</span>
                </p>
              )}

              {(c.negocios ?? []).length > 0 && (
                <p className="text-text-secondary mt-1 flex min-w-0 items-start gap-1.5 text-sm">
                  <Briefcase className="text-text-muted mt-0.5 size-3.5 shrink-0" aria-hidden />
                  <span className="min-w-0">{(c.negocios ?? []).join(" · ")}</span>
                </p>
              )}

              <p className="text-text-muted mt-1.5 text-xs">
                {Number(c.atividades)} atividades · {Number(c.anotacoes)} anotações
              </p>

              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                {ehPrincipal ? (
                  <span className="text-brand-ink text-xs font-semibold">
                    Este cadastro fica
                  </span>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setPrincipal(c.id)}
                      className="border-border hover:bg-surface-hover h-control-sm rounded-md border px-2.5 text-sm font-medium"
                    >
                      Manter este
                    </button>
                    <button
                      type="button"
                      onClick={() => void pedirPrevia(c)}
                      disabled={carregando === c.id}
                      className="border-danger text-danger-ink hover:bg-danger-bg h-control-sm inline-flex items-center gap-1.5 rounded-md border px-2.5 text-sm font-medium disabled:opacity-50"
                    >
                      {carregando === c.id && (
                        <Loader2 className="size-3.5 animate-spin" aria-hidden />
                      )}
                      Fundir na principal
                    </button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* ⚠️ A prévia é obrigatória e não é dispensável por opção: é o
          último ponto em que a operação ainda pode ser recusada. Ela diz
          o que MOVE e o que já está repetido — sem o segundo número,
          "move 3 contatos" e a ficha ficar com 3 pareceria perda. */}
      {previa && alvo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(e) => e.target === e.currentTarget && setPrevia(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="border-border bg-surface w-full max-w-lg rounded-lg border p-5 shadow-xl"
          >
            <h2 className="text-lg font-semibold">Fundir contato?</h2>
            <p className="text-text-secondary mt-1 text-md">
              <span className="font-medium">{previa.duplicada}</span> deixa de existir.
              Tudo o que ela carrega passa para o cadastro marcado com a coroa.
            </p>

            <dl className="border-border mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-md border p-3 text-sm">
              {[
                ["Formas de contato", previa.move.contatos, previa.repetidos.contatos],
                ["Vínculos com organização", previa.move.vinculos, previa.repetidos.vinculos],
                ["Negócios", previa.move.negocios, previa.repetidos.negocios],
                ["Atividades", previa.move.atividades, 0],
                ["Anotações", previa.move.anotacoes, 0],
              ].map(([rotulo, move, repetido]) => (
                <div key={String(rotulo)} className="contents">
                  <dt className="text-text-secondary">{rotulo}</dt>
                  <dd className="tabular text-right font-medium">
                    {Number(move)}
                    {Number(repetido) > 0 && (
                      <span className="text-text-muted font-normal">
                        {" "}
                        ({Number(repetido)} já existe
                        {Number(repetido) > 1 ? "m" : ""})
                      </span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>

            <p className="text-danger-ink mt-3 text-sm font-medium">
              Não há desfazer.
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPrevia(null)}
                className="h-control-md text-text-secondary hover:bg-surface-hover rounded-md px-3 text-md font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void confirmar()}
                disabled={fundindo}
                className="h-control-md bg-danger text-text-inverse rounded-md px-4 text-md font-semibold disabled:opacity-50"
              >
                {fundindo ? "Fundindo…" : "Fundir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
