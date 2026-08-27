"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Phone, Mail, X, UserPlus } from "lucide-react";
import { linkWhatsApp } from "@/lib/formato";
import { SeletorAsync } from "../../seletor-async";
import { useAviso } from "@/components/dominio/avisos";
import {
  buscarPessoas,
  criarPessoa,
  vincularOrganizacao,
  desvincularOrganizacao,
  editarCargo,
} from "../../acoes";

export type PessoaVinculada = {
  id: string;
  nome: string;
  cargo: string | null;
  contatos: { tipo: string; valor: string }[];
};

/**
 * Pessoas ligadas à organização (B-091). O cargo é do vínculo (D-036),
 * editável inline aqui. Vincular alguém já existente é uma busca; o cargo
 * se preenche depois, direto na linha.
 */
export function PessoasDaOrganizacao({
  organizacaoId,
  pessoas,
}: {
  organizacaoId: string;
  pessoas: PessoaVinculada[];
}) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const avisar = useAviso();
  const [adicionando, setAdicionando] = useState(false);

  /**
   * ⚠️ A ordem dos argumentos é (pessoaId, organizacaoId) — e ESTAS TRÊS
   * chamadas a invertiam. O efeito não era o mesmo nas três, e é por isso
   * que passou:
   *
   *   vincular    → violava a chave estrangeira (23503). Falha visível.
   *   editarCargo → `update … where pessoa_id = <id da organização>`
   *                 casava com ZERO linhas e devolvia sucesso. O cargo
   *                 sumia sem erro nenhum.
   *   desvincular → mesma coisa, e a tela ainda dizia "Vínculo removido".
   *
   * A ficha da PESSOA sempre passou na ordem certa, e é por isso que a
   * C-11 concluiu que o campo de cargo "existia e gravava": gravava de
   * lá, nunca daqui.
   */
  async function vincular(pessoaId: string) {
    setErro(null);
    const r = await vincularOrganizacao(pessoaId, organizacaoId, "");
    if (r?.erro) return setErro(r.erro);
    setAdicionando(false);
    avisar("Vínculo criado.");
    router.refresh();
  }

  /**
   * Cadastra a pessoa que a busca não achou e já a vincula.
   *
   * ⚠️ O nome vem do TERMO BUSCADO, e o botão fica por último na lista de
   * resultados: cadastrar duplicata é o erro caro nesta base, onde 41%
   * dos cadastros já são repetição de nome (D-121). Quem existe tem de
   * ser mais fácil de achar do que de recriar.
   */
  async function criarEVincular(nome: string) {
    setErro(null);
    const criada = await criarPessoa(nome);
    if (criada?.erro || !criada?.id) {
      return setErro(criada?.erro ?? "Não foi possível cadastrar a pessoa.");
    }
    const r = await vincularOrganizacao(criada.id, organizacaoId, "");
    if (r?.erro) return setErro(r.erro);
    setAdicionando(false);
    avisar(`${nome} cadastrada e vinculada.`);
    router.refresh();
  }

  async function remover(pessoaId: string) {
    const r = await desvincularOrganizacao(pessoaId, organizacaoId);
    if (r?.erro) return setErro(r.erro);
    avisar("Vínculo removido.");
    router.refresh();
  }

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-text-muted text-xs font-semibold uppercase tracking-caps">
          Pessoas {pessoas.length > 0 && `(${pessoas.length})`}
        </h2>
        <button
          type="button"
          onClick={() => setAdicionando((v) => !v)}
          className="text-text-secondary hover:text-text inline-flex items-center gap-1 text-sm font-medium"
        >
          <UserPlus className="size-3.5" aria-hidden />
          Adicionar
        </button>
      </div>

      {adicionando && (
        <div className="mb-3">
          <SeletorAsync
            buscar={buscarPessoas}
            aoEscolher={(p) => void vincular(p.id)}
            aoCriar={(nome) => void criarEVincular(nome)}
            rotuloCriar={(nome) => `Cadastrar "${nome}" e vincular`}
            placeholder="Buscar pessoa pelo nome…"
          />
        </div>
      )}

      {erro && <p className="text-danger-ink mb-2 text-sm">{erro}</p>}

      {pessoas.length === 0 ? (
        <p className="text-text-muted text-sm">Nenhuma pessoa vinculada.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {pessoas.map((p) => (
            <li key={p.id} className="group">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/contatos/pessoas/${p.id}`}
                  className="text-md hover:text-brand-ink font-medium hover:underline"
                >
                  {p.nome}
                </Link>
                <button
                  type="button"
                  onClick={() => void remover(p.id)}
                  aria-label={`Desvincular ${p.nome}`}
                  className="text-text-muted hover:text-danger-ink shrink-0 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </div>

              {/* ⚠️ Ver a nota gêmea em organizacoes-da-pessoa.tsx (C-11):
                  borda e fundo permanentes, hover como reforço e não como
                  única pista. */}
              <input
                key={p.cargo ?? ""}
                type="text"
                defaultValue={p.cargo ?? ""}
                placeholder="Cargo"
                aria-label={`Cargo de ${p.nome}`}
                onBlur={async (e) => {
                  const novo = e.target.value.trim();
                  if (novo !== (p.cargo ?? "")) {
                    await editarCargo(p.id, organizacaoId, novo);
                    router.refresh();
                  }
                }}
                className="h-control-sm border-border-strong bg-surface-sunken placeholder:text-text-muted hover:bg-surface-hover focus:border-brand-ink mt-1.5 w-full rounded-md border px-2 text-sm"
              />

              <div className="mt-1 flex flex-wrap gap-1.5">
                {p.contatos.map((c, i) =>
                  c.tipo === "telefone" ? (
                    <a
                      key={i}
                      href={linkWhatsApp(c.valor)}
                      className="border-border hover:border-brand-ink inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-sm"
                    >
                      <Phone className="size-3" aria-hidden />
                      {c.valor}
                    </a>
                  ) : (
                    <a
                      key={i}
                      href={`mailto:${c.valor}`}
                      className="border-border hover:border-brand-ink inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-sm"
                    >
                      <Mail className="size-3 shrink-0" aria-hidden />
                      <span className="truncate">{c.valor}</span>
                    </a>
                  )
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
