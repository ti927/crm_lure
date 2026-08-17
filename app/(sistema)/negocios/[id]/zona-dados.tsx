"use client";

import { useState } from "react";
import { Check, Pencil } from "lucide-react";
import { real, data } from "@/lib/formato";
import { UsuarioComFoto } from "@/components/dominio/avatar-usuario";
import { editarCampo } from "./acoes";

type Opcao = { id: string; nome: string };

/**
 * Zona 1 — os dados do negocio, editaveis em linha (B-051).
 *
 * ⚠️ Alterar valor, etapa, responsavel ou status dispara o gatilho do log
 * no banco. E a partir daqui que `evento_negocio` deixa de estar vazia.
 *
 * Etapa nao entra nesta lista: ela se muda pela trilha do topo, que ja
 * trata a trava de desfecho. Ter dois caminhos para a mesma coisa, um
 * deles sem a trava, seria convite a erro.
 */
export function ZonaDados({
  negocio,
  usuarios,
  motivos,
  origens,
  produtos,
}: {
  negocio: {
    id: string;
    valor: number | null;
    status: "parado" | "negociacao" | "ganho" | "perdido";
    criado_em: string;
    responsavel_id: string | null;
    origem_id: string | null;
    produto_id: string | null;
    motivo_perda_id: string | null;
    etapa: { nome: string } | null;
    usuario: { nome: string; foto_url: string | null } | null;
  };
  etapas: Opcao[];
  usuarios: { id: string; nome: string; foto_url: string | null }[];
  motivos: Opcao[];
  origens: Opcao[];
  produtos: Opcao[];
}) {
  return (
    <section
      aria-label="Dados do negócio"
      className="border-border bg-surface flex flex-col gap-px overflow-y-auto border-r p-4"
    >
      <h2 className="text-text-muted mb-2 text-xs font-semibold uppercase tracking-caps">
        Detalhes
      </h2>

      <CampoValor negocioId={negocio.id} valor={negocio.valor} />

      <Linha rotulo="Etapa" valor={negocio.etapa?.nome ?? "—"} />

      <CampoLista
        negocioId={negocio.id}
        campo="status"
        rotulo="Status"
        atual={negocio.status}
        opcoes={[
          { id: "parado", nome: "Parado" },
          { id: "negociacao", nome: "Negociação" },
          { id: "ganho", nome: "Ganho" },
          { id: "perdido", nome: "Perdido" },
        ]}
      />

      <CampoLista
        negocioId={negocio.id}
        campo="responsavel_id"
        rotulo="Responsável"
        atual={negocio.responsavel_id}
        opcoes={usuarios}
        exibicao={
          negocio.usuario ? (
            <UsuarioComFoto
              nome={negocio.usuario.nome}
              foto={negocio.usuario.foto_url}
              tamanho="sm"
            />
          ) : undefined
        }
      />

      <CampoLista
        negocioId={negocio.id}
        campo="origem_id"
        rotulo="Origem"
        atual={negocio.origem_id}
        opcoes={origens}
        vazio="Nenhuma origem cadastrada"
      />

      <CampoLista
        negocioId={negocio.id}
        campo="produto_id"
        rotulo="Produto"
        atual={negocio.produto_id}
        opcoes={produtos}
        vazio="Nenhum produto cadastrado"
      />

      {negocio.status === "perdido" && (
        <CampoLista
          negocioId={negocio.id}
          campo="motivo_perda_id"
          rotulo="Motivo da perda"
          atual={negocio.motivo_perda_id}
          opcoes={motivos}
          obrigatorio
        />
      )}

      <Linha rotulo="Criado em" valor={data(negocio.criado_em)} />
    </section>
  );
}

/* ---------- peças ---------- */

const LINHA = "flex items-baseline justify-between gap-3 py-1.5";
const ROTULO = "text-text-muted shrink-0 text-sm";

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className={LINHA}>
      <span className={ROTULO}>{rotulo}</span>
      <span className="text-md truncate text-right font-medium">{valor}</span>
    </div>
  );
}

function CampoValor({ negocioId, valor }: { negocioId: string; valor: number | null }) {
  const [editando, editar] = useState(false);
  const [salvando, setSalvando] = useState(false);

  async function salvar(bruto: string) {
    // Aceita "3.500,00" e "3500.00" — o vendedor digita como fala.
    const limpo = bruto.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
    const numero = limpo === "" ? null : Number(limpo);
    if (numero !== null && Number.isNaN(numero)) return editar(false);

    setSalvando(true);
    await editarCampo(negocioId, "valor", numero);
    setSalvando(false);
    editar(false);
  }

  if (!editando) {
    return (
      <button
        type="button"
        onClick={() => editar(true)}
        className={`${LINHA} hover:bg-surface-hover group -mx-1.5 rounded px-1.5 text-left transition-colors`}
      >
        <span className={ROTULO}>Valor</span>
        <span className="text-md tabular flex items-center gap-1.5 font-medium">
          {real(valor)}
          <Pencil
            className="text-text-muted size-3 opacity-0 transition-opacity group-hover:opacity-100"
            aria-hidden
          />
        </span>
      </button>
    );
  }

  return (
    <form
      className={`${LINHA} -mx-1.5 px-1.5`}
      onSubmit={(e) => {
        e.preventDefault();
        void salvar(String(new FormData(e.currentTarget).get("valor") ?? ""));
      }}
    >
      <label className={ROTULO} htmlFor="campo-valor">
        Valor
      </label>
      <span className="flex items-center gap-1">
        <input
          id="campo-valor"
          name="valor"
          autoFocus
          disabled={salvando}
          defaultValue={valor ?? ""}
          onBlur={(e) => void salvar(e.currentTarget.value)}
          className="h-control-md bg-background border-border tabular w-28 rounded border px-2 text-right text-md"
        />
        <button type="submit" aria-label="Salvar" className="text-text-muted hover:text-text">
          <Check className="size-4" aria-hidden />
        </button>
      </span>
    </form>
  );
}

function CampoLista({
  negocioId,
  campo,
  rotulo,
  atual,
  opcoes,
  exibicao,
  vazio,
  obrigatorio,
}: {
  negocioId: string;
  campo: "status" | "responsavel_id" | "origem_id" | "produto_id" | "motivo_perda_id";
  rotulo: string;
  atual: string | null;
  opcoes: Opcao[];
  exibicao?: React.ReactNode;
  vazio?: string;
  obrigatorio?: boolean;
}) {
  const [salvando, setSalvando] = useState(false);
  const escolhida = opcoes.find((o) => o.id === atual);

  async function trocar(valor: string) {
    setSalvando(true);
    await editarCampo(negocioId, campo, valor || null);
    setSalvando(false);
  }

  if (opcoes.length === 0) {
    return <Linha rotulo={rotulo} valor={vazio ?? "—"} />;
  }

  return (
    <div className={LINHA}>
      <label className={ROTULO} htmlFor={`campo-${campo}`}>
        {rotulo}
        {obrigatorio && <span className="text-danger-ink"> *</span>}
      </label>
      <span className="flex min-w-0 items-center gap-1.5">
        {exibicao}
        <select
          id={`campo-${campo}`}
          value={atual ?? ""}
          disabled={salvando}
          onChange={(e) => void trocar(e.target.value)}
          aria-label={rotulo}
          className="h-control-md bg-surface hover:bg-surface-hover border-transparent hover:border-border max-w-[11rem] cursor-pointer truncate rounded border px-1.5 text-md font-medium transition-colors disabled:opacity-50"
        >
          {!obrigatorio && <option value="">—</option>}
          {opcoes.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nome}
            </option>
          ))}
        </select>
        {exibicao && escolhida && <span className="sr-only">{escolhida.nome}</span>}
      </span>
    </div>
  );
}
