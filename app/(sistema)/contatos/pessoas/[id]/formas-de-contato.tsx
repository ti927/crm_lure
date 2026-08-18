"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, Mail, X, Plus } from "lucide-react";
import { paraWhatsApp } from "../../consulta";
import { useAviso } from "@/components/dominio/avisos";
import { adicionarFormaContato, removerFormaContato } from "../../acoes";

export type Contato = { id: string; tipo: string; valor: string };

/** Formas de contato (B-092): telefone abre WhatsApp por wa.me, e-mail
 *  abre mailto. Lista simples com adicionar e remover. */
export function FormasDeContato({
  pessoaId,
  contatos,
}: {
  pessoaId: string;
  contatos: Contato[];
}) {
  const router = useRouter();
  const [tipo, setTipo] = useState<"telefone" | "email">("telefone");
  const [valor, setValor] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const avisar = useAviso();

  async function adicionar() {
    const limpo = valor.trim();
    if (!limpo) return;
    setErro(null);
    setSalvando(true);
    const r = await adicionarFormaContato(pessoaId, tipo, limpo);
    setSalvando(false);
    if (r?.erro) return setErro(r.erro);
    setValor("");
    avisar("Contato adicionado.");
    router.refresh();
  }

  async function remover(id: string) {
    const r = await removerFormaContato(id, pessoaId);
    if (r?.erro) return setErro(r.erro);
    avisar("Contato removido.");
    router.refresh();
  }

  return (
    <section>
      <h2 className="text-text-muted mb-2 text-xs font-semibold uppercase tracking-caps">
        Formas de contato
      </h2>

      {contatos.length > 0 && (
        <ul className="mb-3 flex flex-col gap-1.5">
          {contatos.map((c) => (
            <li key={c.id} className="group flex items-center gap-2">
              {c.tipo === "telefone" ? (
                <a
                  href={`https://wa.me/${paraWhatsApp(c.valor)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="border-border hover:border-brand-ink inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-md"
                >
                  <Phone className="size-3.5" aria-hidden />
                  {c.valor}
                </a>
              ) : (
                <a
                  href={`mailto:${c.valor}`}
                  className="border-border hover:border-brand-ink inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-md"
                >
                  <Mail className="size-3.5 shrink-0" aria-hidden />
                  <span className="truncate">{c.valor}</span>
                </a>
              )}
              <button
                type="button"
                onClick={() => void remover(c.id)}
                aria-label="Remover contato"
                className="text-text-muted hover:text-danger-ink shrink-0 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        className="flex items-center gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          void adicionar();
        }}
      >
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as "telefone" | "email")}
          aria-label="Tipo de contato"
          className="h-control-md bg-surface border-border text-md rounded-md border px-2"
        >
          <option value="telefone">Telefone</option>
          <option value="email">E-mail</option>
        </select>
        <input
          type={tipo === "email" ? "email" : "text"}
          inputMode={tipo === "telefone" ? "tel" : "email"}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder={tipo === "telefone" ? "(62) 99999-9999" : "nome@empresa.com"}
          aria-label="Valor do contato"
          className="h-control-md bg-surface border-border text-md min-w-0 flex-1 rounded-md border px-2.5"
        />
        <button
          type="submit"
          disabled={salvando || !valor.trim()}
          aria-label="Adicionar contato"
          className="h-control-md border-border hover:bg-surface-hover inline-flex items-center rounded-md border px-2.5 disabled:opacity-40"
        >
          <Plus className="size-4" aria-hidden />
        </button>
      </form>

      {erro && <p className="text-danger-ink mt-2 text-sm">{erro}</p>}
    </section>
  );
}
