"use client";

import { useEffect, useState } from "react";
import { useFocoDialogo } from "@/components/dominio/usar-foco-dialogo";
import { Trash2 } from "lucide-react";
import { useAviso } from "@/components/dominio/avisos";
import { SeletorVinculo, type Vinculo } from "./seletor-vinculo";
import {
  criarAtividade,
  editarAtividade,
  excluirAtividade,
  type DadosAtividade,
} from "./acoes";

export type Tipo = { id: string; nome: string };
export type Usuario = { id: string; nome: string };

/** O que uma atividade existente traz para o formulário de edição. */
export type AtividadeEdicao = {
  id: string;
  tipoId: string | null;
  titulo: string;
  data: string;
  horaInicio: string | null;
  horaFim: string | null;
  responsavelId: string | null;
  descricao: string;
  concluida: boolean;
  vinculo: Vinculo;
};

/**
 * Criar ou editar atividade (B-082, B-084). Registro retroativo é só uma
 * data no passado — o campo aceita, sem trava. Concluída pode ser marcada
 * já na criação, que é como se registra algo que já aconteceu.
 *
 * Data é o único campo obrigatório: o schema não exige mais negócio
 * (D-108), nem título, nem tipo.
 */
export function DialogoAtividade({
  edicao,
  tipos,
  usuarios,
  vinculoInicial,
  dataInicial,
  aoFechar,
}: {
  edicao?: AtividadeEdicao;
  tipos: Tipo[];
  usuarios: Usuario[];
  vinculoInicial?: Vinculo;
  dataInicial?: string;
  aoFechar: (mudou: boolean) => void;
}) {
  const [tipoId, setTipoId] = useState(edicao?.tipoId ?? "");
  const caixaDialogo = useFocoDialogo<HTMLDivElement>();
  const [titulo, setTitulo] = useState(edicao?.titulo ?? "");
  const [data, setData] = useState(edicao?.data ?? dataInicial ?? "");
  const [horaInicio, setHoraInicio] = useState(edicao?.horaInicio?.slice(0, 5) ?? "");
  const [horaFim, setHoraFim] = useState(edicao?.horaFim?.slice(0, 5) ?? "");
  const [responsavelId, setResponsavelId] = useState(edicao?.responsavelId ?? "");
  const [descricao, setDescricao] = useState(edicao?.descricao ?? "");
  const [concluida, setConcluida] = useState(edicao?.concluida ?? false);
  const [vinculo, setVinculo] = useState<Vinculo>(
    edicao?.vinculo ?? vinculoInicial ?? null
  );

  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const avisar = useAviso();

  useEffect(() => {
    const naTecla = (e: KeyboardEvent) => e.key === "Escape" && aoFechar(false);
    document.addEventListener("keydown", naTecla);
    return () => document.removeEventListener("keydown", naTecla);
  }, [aoFechar]);

  async function salvar() {
    setErro(null);
    setSalvando(true);
    const dados: DadosAtividade = {
      tipoId: tipoId || null,
      titulo,
      data,
      horaInicio: horaInicio || null,
      horaFim: horaFim || null,
      responsavelId: responsavelId || null,
      descricao,
      concluida,
      vinculoTipo: vinculo?.tipo ?? null,
      vinculoId: vinculo?.id ?? null,
    };
    const r = edicao
      ? await editarAtividade(edicao.id, dados)
      : await criarAtividade(dados);
    setSalvando(false);
    if (r?.erro) return setErro(r.erro);
    avisar(edicao ? "Atividade atualizada." : "Atividade criada.");
    aoFechar(true);
  }

  async function excluir() {
    if (!edicao) return;
    setExcluindo(true);
    const r = await excluirAtividade(edicao.id);
    setExcluindo(false);
    if (r?.erro) return setErro(r.erro);
    avisar("Atividade excluída.");
    aoFechar(true);
  }

  const rotulo = "text-text-secondary mb-1 block text-sm font-medium";
  const campo =
    "h-control-md bg-surface border-border text-md w-full rounded-md border px-2.5";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && aoFechar(false)}
    >
      <div
        ref={caixaDialogo}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-dialogo-atividade"
        className="border-border bg-surface my-8 w-full max-w-lg rounded-lg border p-5 shadow-xl"
      >
        <h2 id="titulo-dialogo-atividade" className="text-lg font-semibold">
          {edicao ? "Editar atividade" : "Nova atividade"}
        </h2>

        <div className="mt-4 flex flex-col gap-4">
          <div>
            <span className={rotulo}>Referente a</span>
            <SeletorVinculo valor={vinculo} aoEscolher={setVinculo} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="tipo" className={rotulo}>
                Tipo
              </label>
              <select
                id="tipo"
                value={tipoId}
                onChange={(e) => setTipoId(e.target.value)}
                className={campo}
              >
                <option value="">Sem tipo</option>
                {tipos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="responsavel" className={rotulo}>
                Responsável
              </label>
              <select
                id="responsavel"
                value={responsavelId}
                onChange={(e) => setResponsavelId(e.target.value)}
                className={campo}
              >
                <option value="">Eu</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="titulo" className={rotulo}>
              Título
            </label>
            <input
              id="titulo"
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ligar, reunião, enviar proposta…"
              className={campo}
            />
          </div>

          <div className="grid grid-cols-[1fr_auto_auto] items-end gap-3">
            <div>
              <label htmlFor="data" className={rotulo}>
                Data <span className="text-danger-ink">*</span>
              </label>
              <input
                id="data"
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className={campo}
              />
            </div>
            <div>
              <label htmlFor="hora-inicio" className={rotulo}>
                Início
              </label>
              <input
                id="hora-inicio"
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                className={campo}
              />
            </div>
            <div>
              <label htmlFor="hora-fim" className={rotulo}>
                Fim
              </label>
              <input
                id="hora-fim"
                type="time"
                value={horaFim}
                onChange={(e) => setHoraFim(e.target.value)}
                className={campo}
              />
            </div>
          </div>

          <div>
            <label htmlFor="descricao" className={rotulo}>
              Descrição
            </label>
            <textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
              className="bg-surface border-border text-md w-full resize-y rounded-md border px-2.5 py-2"
            />
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={concluida}
              onChange={(e) => setConcluida(e.target.checked)}
              className="size-4"
            />
            <span className="text-md">Já concluída</span>
          </label>
        </div>

        {erro && (
          <p role="alert" className="text-danger-ink mt-3 text-sm">
            {erro}
          </p>
        )}

        <div className="mt-5 flex items-center justify-between gap-2">
          {edicao ? (
            <button
              type="button"
              onClick={() => void excluir()}
              disabled={excluindo || salvando}
              className="text-danger-ink hover:bg-danger-bg inline-flex items-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium disabled:opacity-50"
            >
              <Trash2 className="size-4" aria-hidden />
              Excluir
            </button>
          ) : (
            <span />
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => aoFechar(false)}
              className="h-control-md text-text-secondary hover:bg-surface-hover rounded-md px-3 text-md font-medium"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void salvar()}
              disabled={salvando || excluindo || !data}
              className="h-control-md bg-brand text-brand-on hover:bg-brand-hover active:bg-brand-active rounded-md px-4 text-md font-semibold disabled:opacity-40"
            >
              {salvando ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
