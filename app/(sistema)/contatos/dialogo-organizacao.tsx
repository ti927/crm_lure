"use client";

import { useEffect, useState } from "react";
import { useFocoDialogo } from "@/components/dominio/usar-foco-dialogo";
import { useAviso } from "@/components/dominio/avisos";
import { UFS } from "@/lib/uf";
import { local } from "@/lib/formato";
import {
  criarOrganizacao,
  editarOrganizacao,
  type DadosOrganizacao,
  type Homonima,
} from "./acoes";

export type OrganizacaoEdicao = {
  id: string;
  nome: string;
  cidade: string;
  uf: string;
  endereco: string;
  website: string;
  bubbleId: string;
};

/**
 * Criar ou editar organização (B-090): nome, cidade, UF, website e o
 * identificador do Bubble. Só o nome é obrigatório (schema).
 *
 * ⚠️ A UF é LISTA FECHADA, e não texto livre. Foi o texto livre que
 * deixou "Goiânia" e "Goiânia, GO" conviverem como cidades diferentes na
 * base — o defeito que a migration da UF teve que desfazer. Com 27
 * opções, escolher é mais rápido que digitar, e "go", "Go" e "GO " não
 * chegam a existir.
 */
export function DialogoOrganizacao({
  edicao,
  aoFechar,
}: {
  edicao?: OrganizacaoEdicao;
  aoFechar: (r: { mudou: boolean; id?: string }) => void;
}) {
  const [nome, setNome] = useState(edicao?.nome ?? "");
  const caixaDialogo = useFocoDialogo<HTMLDivElement>();
  const [cidade, setCidade] = useState(edicao?.cidade ?? "");
  const [uf, setUf] = useState(edicao?.uf ?? "");
  const [endereco, setEndereco] = useState(edicao?.endereco ?? "");
  const [website, setWebsite] = useState(edicao?.website ?? "");
  const [bubbleId, setBubbleId] = useState(edicao?.bubbleId ?? "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  /**
   * Cadastros de mesmo nome que já existem. Enquanto houver algum aqui,
   * o botão muda de "Salvar" para "Criar mesmo assim" — o aviso não
   * proíbe, ele obriga a olhar.
   */
  const [duplicadas, setDuplicadas] = useState<Homonima[] | null>(null);
  const avisar = useAviso();

  useEffect(() => {
    const naTecla = (e: KeyboardEvent) =>
      e.key === "Escape" && aoFechar({ mudou: false });
    document.addEventListener("keydown", naTecla);
    return () => document.removeEventListener("keydown", naTecla);
  }, [aoFechar]);

  async function salvar(confirmado = false) {
    setErro(null);
    setSalvando(true);
    const dados: DadosOrganizacao = { nome, cidade, uf, endereco, website, bubbleId };
    const r = edicao
      ? await editarOrganizacao(edicao.id, dados)
      : await criarOrganizacao(dados, { confirmado });
    setSalvando(false);
    if (r?.erro) return setErro(r.erro);

    // A ação recusa a primeira tentativa quando já existe cadastro com o
    // mesmo nome, e devolve quais são. Nada foi gravado ainda.
    const achadas = (r as { duplicadas?: Homonima[] }).duplicadas;
    if (achadas?.length) {
      setNomeAvisado(nome);
      return setDuplicadas(achadas);
    }

    avisar(edicao ? "Organização atualizada." : "Organização criada.");
    aoFechar({ mudou: true, id: edicao?.id ?? (r as { id?: string }).id });
  }

  /* Trocar o nome depois do aviso desfaz o aviso: ele falava de outro
     nome, e deixá-lo na tela faria a próxima confirmação passar por cima
     de uma checagem que já não vale. */
  const [nomeAvisado, setNomeAvisado] = useState("");
  if (duplicadas && nome !== nomeAvisado && nomeAvisado !== "") {
    setDuplicadas(null);
  }

  const rotulo = "text-text-secondary mb-1 block text-sm font-medium";
  const campo =
    "h-control-md bg-surface border-border text-md w-full rounded-md border px-2.5";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && aoFechar({ mudou: false })}
    >
      <div
        ref={caixaDialogo}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-org"
        className="border-border bg-surface my-8 w-full max-w-md rounded-lg border p-5 shadow-xl"
      >
        <h2 id="titulo-org" className="text-lg font-semibold">
          {edicao ? "Editar organização" : "Nova organização"}
        </h2>

        <div className="mt-4 flex flex-col gap-4">
          <div>
            <label htmlFor="org-nome" className={rotulo}>
              Nome <span className="text-danger-ink">*</span>
            </label>
            <input
              id="org-nome"
              type="text"
              autoFocus
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className={campo}
            />
          </div>
          {/* Cidade e UF na mesma linha: são um endereço só, e separá-los
              em duas linhas faria a UF parecer outro assunto. A cidade
              cresce, a UF tem largura fixa — 27 siglas de duas letras não
              precisam de mais. */}
          <div className="flex gap-3">
            <div className="min-w-0 flex-1">
              <label htmlFor="org-cidade" className={rotulo}>
                Cidade
              </label>
              <input
                id="org-cidade"
                type="text"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                className={campo}
              />
            </div>
            {/* ⚠️ A sigla vem PRIMEIRO no rótulo, e é por isso que a
                largura pode ser curta: fechado, o seletor corta o nome do
                estado pela direita ("MS · Mato Grosso do S…") e a sigla,
                que é o que se lê depois de escolher, nunca some. Aberto,
                a lista mostra os 27 por extenso — que é quando o nome
                serve para alguma coisa. */}
            <div className="w-32 shrink-0">
              <label htmlFor="org-uf" className={rotulo}>
                UF
              </label>
              <select
                id="org-uf"
                value={uf}
                onChange={(e) => setUf(e.target.value)}
                className={campo}
              >
                {/* O vazio é opção legítima e a primeira: 2.309 das 2.903
                    organizações não têm endereço, e a base tem um cadastro
                    em Luanda, que não tem UF nenhuma. */}
                <option value="">—</option>
                {UFS.map(([sigla, nome]) => (
                  <option key={sigla} value={sigla}>
                    {sigla} · {nome}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {/* ⚠️ Depois de cidade e UF, e não antes: o dado que existe em
              1.035 cadastros vem primeiro; o logradouro, que existe em 21,
              vem depois. Ordem de formulário é ordem de importância, e
              nesta base o endereço postal é a exceção. */}
          <div>
            <label htmlFor="org-endereco" className={rotulo}>
              Logradouro
            </label>
            <input
              id="org-endereco"
              type="text"
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              placeholder="Rua, número, bairro"
              className={campo}
            />
            <p className="text-text-muted mt-1 text-xs">
              Não repita cidade e UF: elas têm campo próprio acima.
            </p>
          </div>
          <div>
            <label htmlFor="org-site" className={rotulo}>
              Website
            </label>
            <input
              id="org-site"
              type="text"
              inputMode="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="exemplo.com.br"
              className={campo}
            />
          </div>
          <div>
            <label htmlFor="org-bubble" className={rotulo}>
              Identificador Bubble
            </label>
            <input
              id="org-bubble"
              type="text"
              value={bubbleId}
              onChange={(e) => setBubbleId(e.target.value)}
              className={campo}
            />
            <p className="text-text-muted mt-1 text-xs">
              Vínculo com o sistema interno, preenchido depois do Ganho.
            </p>
          </div>
        </div>

        {erro && (
          <p role="alert" className="text-danger-ink mt-3 text-sm">
            {erro}
          </p>
        )}

        {/* ⚠️ O aviso mostra CIDADE e UF de cada cadastro, e não só o
            nome: a pergunta que ele precisa responder é "é a mesma
            empresa?", e nome igual sozinho não responde — "Elmo
            Engenharia" está nove vezes na base. É a mesma razão da
            D-159 na ferramenta de fusão. */}
        {duplicadas && duplicadas.length > 0 && (
          <div
            role="alert"
            className="border-warning bg-warning-bg mt-3 rounded-md border p-3"
          >
            <p className="text-md font-semibold">
              {duplicadas.length === 1
                ? "Já existe uma organização com este nome."
                : `Já existem ${duplicadas.length} organizações com este nome.`}
            </p>
            <ul className="text-text-secondary mt-2 flex flex-col gap-1 text-sm">
              {duplicadas.map((o) => (
                <li key={o.id} className="flex min-w-0 items-baseline gap-2">
                  <span className="truncate font-medium">{o.nome}</span>
                  <span className="text-text-muted shrink-0 text-xs">
                    {local(o.cidade, o.uf) || "sem local"}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-text-muted mt-2 text-xs">
              41% dos cadastros desta base já são nome repetido. Se for a
              mesma empresa, cancele e use a existente — duplicar agora
              custa uma fusão depois.
            </p>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => aoFechar({ mudou: false })}
            className="h-control-md text-text-secondary hover:bg-surface-hover rounded-md px-3 text-md font-medium"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void salvar(Boolean(duplicadas))}
            disabled={salvando || !nome.trim()}
            className="h-control-md bg-brand text-brand-on hover:bg-brand-hover active:bg-brand-active rounded-md px-4 text-md font-semibold disabled:opacity-40"
          >
            {salvando
              ? "Salvando…"
              : duplicadas
                ? "Criar mesmo assim"
                : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
