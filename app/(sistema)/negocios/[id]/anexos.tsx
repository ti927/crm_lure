"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, Upload, X, FileText, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { data as formataData } from "@/lib/formato";
import { useAviso } from "@/components/dominio/avisos";
import {
  caminhoParaEnvio,
  registrarArquivo,
  registrarLink,
  abrirAnexo,
  excluirAnexo,
} from "./anexos-acoes";

export type Anexo = {
  id: string;
  tipo: "arquivo" | "link";
  nome: string;
  url: string | null;
  tamanho: number | null;
  criado_em: string;
  usuario: { nome: string } | null;
};

/** 25 MiB — o mesmo teto do balde, para o aviso vir antes do envio. */
const TETO = 26214400;

/**
 * Anexos do negócio: a proposta enviada, como arquivo ou como link.
 *
 * Pedido da Daniela: "na parte de negócios, onde podemos anexar a
 * proposta que foi entregue... no Pipe eu colocava em negócios". É
 * paridade com o Pipedrive — lá o negócio tinha Files.
 *
 * ⚠️ **Fica na coluna da direita, e não numa aba da linha do tempo.** A
 * frase dela foi "pra deixar registrado as propostas enviadas": o valor
 * está em achar a proposta depois, não em ver quando foi anexada. Numa
 * aba, a de dois meses atrás estaria a dezenas de eventos de rolagem.
 *
 * ⚠️ **O arquivo sobe daqui direto para o Storage**, não por Server
 * Action — o corpo de uma Server Action tem teto de 1 MB por padrão, e
 * proposta em PDF passa disso. A ação só grava a linha depois.
 */
export function Anexos({
  negocioId,
  anexos,
}: {
  negocioId: string;
  anexos: Anexo[];
}) {
  const router = useRouter();
  const avisar = useAviso();
  const arquivoRef = useRef<HTMLInputElement>(null);

  const [ocupado, setOcupado] = useState(false);
  const [progresso, setProgresso] = useState<string | null>(null);
  const [colandoLink, setColandoLink] = useState(false);

  async function enviarArquivo(arquivo: File) {
    if (arquivo.size > TETO) {
      return avisar(
        `"${arquivo.name}" tem ${tamanho(arquivo.size)}. O limite é 25 MB — para algo maior, guarde na nuvem e cole o link.`,
        "erro"
      );
    }

    setOcupado(true);
    setProgresso(arquivo.name);
    try {
      // O caminho é montado no servidor, a partir do id do negócio: o
      // nome que o navegador manda não decide onde o arquivo escreve.
      const c = await caminhoParaEnvio(negocioId, arquivo.name);
      if ("erro" in c) return avisar(c.erro!, "erro");

      const supabase = createClient();
      const { error } = await supabase.storage
        .from("anexos")
        .upload(c.caminho!, arquivo, {
          contentType: arquivo.type || "application/octet-stream",
          upsert: false,
        });
      if (error) return avisar(`Não deu para enviar: ${error.message}`, "erro");

      const r = await registrarArquivo(negocioId, {
        caminho: c.caminho!,
        nome: arquivo.name,
        tamanho: arquivo.size,
        mime: arquivo.type || null,
      });
      if (r?.erro) return avisar(r.erro, "erro");

      avisar(`"${arquivo.name}" anexado.`);
      router.refresh();
    } finally {
      setOcupado(false);
      setProgresso(null);
      if (arquivoRef.current) arquivoRef.current.value = "";
    }
  }

  async function salvarLink(form: HTMLFormElement) {
    const f = new FormData(form);
    setOcupado(true);
    const r = await registrarLink(
      negocioId,
      String(f.get("url") ?? ""),
      String(f.get("rotulo") ?? "")
    );
    setOcupado(false);
    if (r?.erro) return avisar(r.erro, "erro");
    setColandoLink(false);
    form.reset();
    avisar("Link anexado.");
    router.refresh();
  }

  /**
   * ⚠️ O arquivo não tem endereço fixo: o balde é privado, e a URL é
   * assinada na hora, válida por cinco minutos. Por isso o item é um
   * botão que pede o endereço e só então navega — e não um `<a href>`.
   */
  async function abrir(a: Anexo) {
    setOcupado(true);
    const r = await abrirAnexo(a.id);
    setOcupado(false);
    if (r?.erro) return avisar(r.erro, "erro");
    window.open(r.url!, "_blank", "noopener,noreferrer");
  }

  async function apagar(a: Anexo) {
    setOcupado(true);
    const r = await excluirAnexo(a.id, negocioId);
    setOcupado(false);
    if (r?.erro) return avisar(r.erro, "erro");
    avisar(
      a.tipo === "arquivo"
        ? `"${a.nome}" excluído.`
        : "Link removido."
    );
    router.refresh();
  }

  return (
    <div>
      <h2 className="text-text-muted mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-caps">
        <span>Anexos {anexos.length > 0 && `(${anexos.length})`}</span>
      </h2>

      {/* ⚠️ Os dois botões carregam BORDA. A C-11 custou um campo que
          existia, gravava, e ninguém achou porque a affordance só
          aparecia no hover — que não existe no celular. */}
      <div className="mb-3 flex gap-1.5">
        <button
          type="button"
          disabled={ocupado}
          onClick={() => arquivoRef.current?.click()}
          className="border-border hover:bg-surface-hover hover:border-brand-ink h-control-md inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border px-2 text-sm font-medium transition-all disabled:opacity-50"
        >
          <Upload className="size-3.5 shrink-0" aria-hidden />
          Arquivo
        </button>
        <button
          type="button"
          disabled={ocupado}
          onClick={() => setColandoLink((v) => !v)}
          aria-expanded={colandoLink}
          className="border-border hover:bg-surface-hover hover:border-brand-ink h-control-md inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border px-2 text-sm font-medium transition-all disabled:opacity-50"
        >
          <Link2 className="size-3.5 shrink-0" aria-hidden />
          Link
        </button>
      </div>

      <input
        ref={arquivoRef}
        type="file"
        className="hidden"
        aria-label="Escolher arquivo para anexar"
        onChange={(e) => {
          const f = e.currentTarget.files?.[0];
          if (f) void enviarArquivo(f);
        }}
      />

      {colandoLink && (
        <form
          className="border-border bg-surface-sunken mb-3 flex flex-col gap-1.5 rounded-md border p-2"
          onSubmit={(e) => {
            e.preventDefault();
            void salvarLink(e.currentTarget);
          }}
        >
          <input
            name="url"
            type="text"
            required
            autoFocus
            placeholder="Endereço da proposta…"
            aria-label="Endereço do link"
            className="bg-surface border-border text-md focus:border-brand-ink h-control-md rounded-md border px-2 transition-colors"
          />
          <input
            name="rotulo"
            type="text"
            placeholder="Nome (opcional)"
            aria-label="Nome do link"
            className="bg-surface border-border text-md focus:border-brand-ink h-control-md rounded-md border px-2 transition-colors"
          />
          <button
            type="submit"
            disabled={ocupado}
            className="h-control-md bg-brand text-brand-on hover:bg-brand-hover active:bg-brand-active rounded-md px-3 text-sm font-semibold transition-transform active:scale-95 disabled:opacity-50"
          >
            Anexar link
          </button>
        </form>
      )}

      {progresso && (
        <p className="text-text-muted mb-2 truncate text-sm">Enviando {progresso}…</p>
      )}

      {anexos.length === 0 ? (
        <p className="text-text-muted text-sm">
          Nenhum anexo. A proposta enviada fica aqui.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {anexos.map((a) => (
            <li key={a.id} className="group flex items-start gap-1">
              <button
                type="button"
                disabled={ocupado}
                onClick={() => void abrir(a)}
                className="hover:bg-surface-hover -mx-1.5 flex min-w-0 flex-1 items-start gap-2 rounded px-1.5 py-1 text-left transition-colors disabled:opacity-60"
              >
                <span className="text-text-muted mt-0.5 shrink-0" aria-hidden>
                  {a.tipo === "arquivo" ? (
                    <FileText className="size-4" />
                  ) : (
                    <ExternalLink className="size-4" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-md block truncate font-medium">{a.nome}</span>
                  <span className="text-text-muted block truncate text-sm">
                    {a.tipo === "arquivo" && a.tamanho ? `${tamanho(a.tamanho)} · ` : ""}
                    {formataData(a.criado_em)}
                    {a.usuario?.nome ? ` · ${a.usuario.nome}` : ""}
                  </span>
                </span>
              </button>

              <button
                type="button"
                disabled={ocupado}
                onClick={() => void apagar(a)}
                title="Excluir anexo"
                aria-label={`Excluir ${a.nome}`}
                className="hover:bg-surface-hover text-text-muted hover:text-danger-ink mt-1 shrink-0 rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 disabled:opacity-30"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Bytes em algo legível. Uma casa decimal basta para "2,4 MB". */
function tamanho(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1).replace(".", ",")} MB`;
}

