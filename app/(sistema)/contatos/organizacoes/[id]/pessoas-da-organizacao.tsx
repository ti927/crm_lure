"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Phone, Mail, X, UserPlus, Trash2 } from "lucide-react";
import { linkWhatsApp } from "@/lib/formato";
import { SeletorAsync } from "../../seletor-async";
import { useAviso } from "@/components/dominio/avisos";
import {
  buscarPessoas,
  criarPessoa,
  vincularOrganizacao,
  desvincularOrganizacao,
  editarCargo,
  excluirPessoa,
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
   * A pessoa que está prestes a ser APAGADA, não desvinculada.
   *
   * ⚠️ Desvincular e apagar viraram duas ações separadas, e a separação é
   * o ponto: o X sempre removeu só o vínculo — o contato continuava
   * existindo com o resto da história dele —, e quem queria o cadastro
   * fora tinha de abrir a ficha da pessoa para achar o Excluir. Apagar
   * não tem volta, então continua exigindo confirmação escrita, como na
   * ficha.
   */
  const [apagando, setApagando] = useState<PessoaVinculada | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  async function apagar(pessoa: PessoaVinculada) {
    setExcluindo(true);
    const r = await excluirPessoa(pessoa.id);
    setExcluindo(false);
    setApagando(null);
    if (r?.erro) return setErro(r.erro);
    // B-094: a exclusão leva junto vínculos e formas de contato, por
    // cascata no banco.
    avisar(`${pessoa.nome} foi apagada.`);
    router.refresh();
  }

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

      {apagando && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(e) => e.target === e.currentTarget && setApagando(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="border-border bg-surface w-full max-w-md rounded-lg border p-5 shadow-xl"
          >
            <h2 className="text-lg font-semibold">Apagar contato?</h2>
            <p className="text-text-secondary mt-1 text-md">
              <span className="font-medium">{apagando.nome}</span> será apagada da
              base inteira, junto dos vínculos com todas as organizações e das
              formas de contato. Não há como desfazer.
            </p>
            {/* Sem esta linha, quem só queria tirar a pessoa DESTA
                organização descobriria a diferença depois de apagar. */}
            <p className="text-text-muted mt-2 text-sm">
              Para tirá-la apenas desta organização, cancele e use o ✕ ao lado.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setApagando(null)}
                className="h-control-md text-text-secondary hover:bg-surface-hover rounded-md px-3 text-md font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void apagar(apagando)}
                disabled={excluindo}
                className="h-control-md bg-danger text-text-inverse rounded-md px-4 text-md font-semibold disabled:opacity-50"
              >
                {excluindo ? "Apagando…" : "Apagar"}
              </button>
            </div>
          </div>
        </div>
      )}

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
                {/* ⚠️ DUAS ações, e a diferença entre elas é o que precisa
                    ficar claro: o X tira a pessoa DESTA organização e o
                    cadastro continua existindo; a lixeira apaga o contato
                    da base. `title` em ambos porque ícone sozinho não
                    distingue "remover daqui" de "apagar de vez", e errar
                    entre os dois só se descobre depois. */}
                <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => void remover(p.id)}
                    title="Desvincular desta organização"
                    aria-label={`Desvincular ${p.nome} desta organização`}
                    className="text-text-muted hover:text-text rounded p-0.5"
                  >
                    <X className="size-3.5" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => setApagando(p)}
                    title="Apagar contato"
                    aria-label={`Apagar o contato ${p.nome}`}
                    className="text-text-muted hover:text-danger-ink rounded p-0.5"
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </button>
                </span>
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
