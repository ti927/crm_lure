"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, Mail, Building2, Check, Plus, X, Pencil } from "lucide-react";
import { data, linkWhatsApp } from "@/lib/formato";
import { useAviso } from "@/components/dominio/avisos";
import { SeletorAsync } from "@/app/(sistema)/contatos/seletor-async";
import { buscarPessoas, buscarOrganizacoes } from "@/app/(sistema)/contatos/acoes";
import {
  alternarAtividade,
  editarCampo,
  vincularPessoa,
  desvincularPessoa,
} from "./acoes";
import { Anexos, type Anexo } from "./anexos";

type Contato = { tipo: string; valor: string };
type Pessoa = {
  id: string;
  nome: string;
  forma_contato: Contato[] | null;
  pessoa_organizacao: { cargo: string | null }[] | null;
};

type Atividade = {
  id: string;
  titulo: string | null;
  data: string;
  hora_inicio: string | null;
  concluida: boolean;
  tipo_atividade: { nome: string } | null;
};

export function ZonaLateral({
  negocioId,
  organizacao,
  pessoas,
  atividades,
  anexos,
}: {
  negocioId: string;
  organizacao: { id: string; nome: string; cidade?: string | null } | null;
  pessoas: Pessoa[];
  atividades: Atividade[];
  anexos: Anexo[];
}) {
  const router = useRouter();
  const avisar = useAviso();
  const [trocandoOrg, setTrocandoOrg] = useState(false);
  const [adicionandoPessoa, setAdicionandoPessoa] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  const abertas = atividades.filter((a) => !a.concluida);
  const feitas = atividades.filter((a) => a.concluida);

  /**
   * Trocar a organização do negócio. Acontece de verdade: entre os 668
   * grupos de nome repetido (D-121), abrir o negócio no cadastro errado
   * é fácil, e até aqui não havia conserto pela tela.
   */
  async function trocarOrganizacao(id: string, nome: string) {
    setOcupado(true);
    const r = await editarCampo(negocioId, "organizacao_id", id);
    setOcupado(false);
    setTrocandoOrg(false);
    if (r?.erro) return avisar(r.erro, "erro");
    avisar(`Organização alterada para ${nome}.`);
    router.refresh();
  }

  async function adicionar(pessoaId: string, nome: string) {
    setOcupado(true);
    const r = await vincularPessoa(negocioId, pessoaId);
    setOcupado(false);
    setAdicionandoPessoa(false);
    if (r?.erro) return avisar(r.erro, "erro");
    avisar(`${nome} vinculada ao negócio.`);
    router.refresh();
  }

  async function remover(pessoaId: string, nome: string) {
    setOcupado(true);
    const r = await desvincularPessoa(negocioId, pessoaId);
    setOcupado(false);
    if (r?.erro) return avisar(r.erro, "erro");
    // Desvincular tira do negócio, não apaga o contato — a ficha da
    // pessoa continua lá, com o resto da história dela.
    avisar(`${nome} desvinculada. O contato continua cadastrado.`);
    router.refresh();
  }

  return (
    <section
      aria-label="Pessoas, atividades e anexos"
      className="border-border bg-surface flex flex-col gap-5 overflow-y-auto border-l p-4"
    >
      <div>
        <h2 className="text-text-muted mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-caps">
          Organização
          <button
            type="button"
            disabled={ocupado}
            onClick={() => setTrocandoOrg((v) => !v)}
            title="Trocar organização"
            aria-label="Trocar organização"
            className="hover:bg-surface-hover rounded p-1 normal-case opacity-60 hover:opacity-100 disabled:opacity-30"
          >
            <Pencil className="size-3.5" aria-hidden />
          </button>
        </h2>

        {trocandoOrg ? (
          <SeletorAsync
            buscar={buscarOrganizacoes}
            aoEscolher={(o) => void trocarOrganizacao(o.id, o.nome)}
            placeholder="Buscar organização…"
          />
        ) : (
          <>
            <p className="text-md flex items-center gap-2 font-medium">
              <Building2 className="text-text-muted size-4 shrink-0" aria-hidden />
              <span className="truncate">{organizacao?.nome ?? "—"}</span>
            </p>
            {organizacao?.cidade && (
              <p className="text-text-muted ml-6 text-sm">{organizacao.cidade}</p>
            )}
          </>
        )}
      </div>

      <div>
        <h2 className="text-text-muted mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-caps">
          <span>Pessoas {pessoas.length > 0 && `(${pessoas.length})`}</span>
          <button
            type="button"
            disabled={ocupado}
            onClick={() => setAdicionandoPessoa((v) => !v)}
            title="Vincular pessoa"
            aria-label="Vincular pessoa"
            className="hover:bg-surface-hover rounded p-1 normal-case opacity-60 hover:opacity-100 disabled:opacity-30"
          >
            {adicionandoPessoa ? (
              <X className="size-3.5" aria-hidden />
            ) : (
              <Plus className="size-3.5" aria-hidden />
            )}
          </button>
        </h2>

        {adicionandoPessoa && (
          <div className="mb-3">
            <SeletorAsync
              buscar={buscarPessoas}
              aoEscolher={(p) => void adicionar(p.id, p.nome)}
              placeholder="Buscar pessoa…"
            />
            <p className="text-text-muted mt-1 text-xs">
              Só vincula contatos já cadastrados. Para criar um contato novo, use
              Contatos.
            </p>
          </div>
        )}

        {pessoas.length === 0 ? (
          <p className="text-text-muted text-sm">Nenhuma pessoa vinculada.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {pessoas.map((p) => {
              const cargo = p.pessoa_organizacao?.[0]?.cargo;
              return (
                <li key={p.id} className="group">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-md min-w-0 flex-1 font-medium">{p.nome}</p>
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={() => void remover(p.id, p.nome)}
                      title="Desvincular do negócio"
                      aria-label={`Desvincular ${p.nome} do negócio`}
                      className="hover:bg-surface-hover text-text-muted hover:text-danger-ink shrink-0 rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 disabled:opacity-30"
                    >
                      <X className="size-3.5" aria-hidden />
                    </button>
                  </div>
                  {/* O cargo pertence ao vinculo, nao a pessoa (Doc 06). */}
                  {cargo && <p className="text-text-muted text-sm">{cargo}</p>}

                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {(p.forma_contato ?? []).map((c, i) =>
                      c.tipo === "telefone" ? (
                        <a
                          key={i}
                          href={linkWhatsApp(c.valor)}
                          className="border-border hover:bg-surface-hover hover:border-brand-ink inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-sm transition-all hover:-translate-y-px"
                        >
                          <Phone className="size-3" aria-hidden />
                          {c.valor}
                        </a>
                      ) : (
                        <a
                          key={i}
                          href={`mailto:${c.valor}`}
                          className="border-border hover:bg-surface-hover hover:border-brand-ink inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-sm transition-all hover:-translate-y-px"
                        >
                          <Mail className="size-3 shrink-0" aria-hidden />
                          <span className="truncate">{c.valor}</span>
                        </a>
                      )
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ⚠️ Entre Pessoas e Atividades, e não no fim da coluna. São
          poucos anexos por negócio, então o bloco quase não empurra o que
          vem depois — enquanto Atividades cresce sem teto, e pôr os
          anexos abaixo dela os deixaria fora da tela justamente nos
          negócios antigos, que são os que têm proposta enviada. */}
      <Anexos negocioId={negocioId} anexos={anexos} />

      <div>
        <h2 className="text-text-muted mb-2 text-xs font-semibold uppercase tracking-caps">
          Atividades
        </h2>

        {atividades.length === 0 ? (
          <p className="text-text-muted text-sm">Nenhuma atividade.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {[...abertas, ...feitas].map((a) => (
              <ItemAtividade key={a.id} atividade={a} negocioId={negocioId} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function ItemAtividade({
  atividade,
  negocioId,
}: {
  atividade: Atividade;
  negocioId: string;
}) {
  const [concluida, setConcluida] = useState(atividade.concluida);
  const [salvando, setSalvando] = useState(false);

  async function alternar() {
    const alvo = !concluida;
    setConcluida(alvo); // otimista: marcar tarefa tem que responder na hora
    setSalvando(true);
    const r = await alternarAtividade(atividade.id, negocioId, alvo);
    setSalvando(false);
    if (r?.erro) setConcluida(!alvo);
  }

  return (
    <li>
      <button
        type="button"
        disabled={salvando}
        onClick={() => void alternar()}
        className="hover:bg-surface-hover -mx-1.5 flex w-full items-start gap-2 rounded px-1.5 py-1 text-left transition-colors disabled:opacity-60"
      >
        <span
          aria-hidden
          className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border transition-all duration-200 ${
            concluida
              ? "border-success bg-success text-text-inverse scale-100"
              : "border-border scale-95"
          }`}
        >
          {concluida && <Check className="size-3" strokeWidth={3} />}
        </span>

        <span className="min-w-0 flex-1">
          <span
            className={`text-md block truncate transition-opacity ${
              concluida ? "line-through opacity-50" : ""
            }`}
          >
            {atividade.titulo ?? atividade.tipo_atividade?.nome ?? "Atividade"}
          </span>
          <span className="text-text-muted text-sm">
            {data(atividade.data)}
            {atividade.hora_inicio && ` · ${atividade.hora_inicio.slice(0, 5)}`}
          </span>
        </span>
      </button>
    </li>
  );
}
