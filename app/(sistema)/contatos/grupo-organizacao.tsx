"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, ChevronRight, Briefcase, Layers } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type Grupo = {
  chave: string;
  nome: string;
  quantidade: number;
  representante_id: string;
  cidade: string | null;
  website: string | null;
  negocios: number;
  /** Títulos dos negócios mais recentes — a referência que identifica o
   *  cadastro quando o nome se repete e cidade/site estão vazios. */
  titulos: string[] | null;
};

type Irmao = {
  id: string;
  nome: string;
  cidade: string | null;
  website: string | null;
  negocios: number;
  titulos: string[] | null;
};

/**
 * Uma organização, ou um grupo de cadastros com o mesmo nome.
 *
 * ⚠️ 1.195 dos 2.889 registros da base são repetição — "Sicoob
 * Credseguro" está lá seis vezes, vindo assim do Pipedrive. Quando o
 * grupo tem um só registro, a linha é um link comum. Com mais de um, ela
 * expande e mostra os irmãos, cada um com seus próprios negócios.
 *
 * Isto **não é mesclagem** (fora do MVP): nada é fundido nem apagado, os
 * registros continuam separados. Só a lista deixa de repetir a mesma
 * empresa quinze vezes.
 *
 * Os irmãos são buscados sob demanda, ao expandir — carregar todos de
 * antemão traria de volta as 2.889 linhas que o agrupamento evitou.
 */
export function LinhaGrupo({ grupo }: { grupo: Grupo }) {
  const [aberto, setAberto] = useState(false);
  const [irmaos, setIrmaos] = useState<Irmao[] | null>(null);
  const [carregando, setCarregando] = useState(false);

  const unico = grupo.quantidade === 1;

  async function alternar() {
    const abrindo = !aberto;
    setAberto(abrindo);
    if (abrindo && irmaos === null) {
      setCarregando(true);
      const supabase = createClient();
      const { data } = await supabase.rpc("organizacoes_do_grupo", {
        chave_grupo: grupo.chave,
      });
      setIrmaos((data ?? []) as Irmao[]);
      setCarregando(false);
    }
  }

  if (unico) {
    return (
      <li>
        <Link
          href={`/contatos/organizacoes/${grupo.representante_id}`}
          className="border-border hover:bg-surface-hover flex items-center gap-3 border-b px-4 py-2.5"
        >
          <Building2 className="text-text-muted size-4 shrink-0" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="text-md block truncate font-medium">{grupo.nome}</span>
            <Referencia cidade={grupo.cidade} titulos={grupo.titulos} />
          </span>
          <Contagem n={grupo.negocios} />
        </Link>
      </li>
    );
  }

  return (
    <li className="border-border border-b">
      <button
        type="button"
        onClick={() => void alternar()}
        aria-expanded={aberto}
        className="hover:bg-surface-hover flex w-full items-center gap-3 px-4 py-2.5 text-left"
      >
        <ChevronRight
          className={`text-text-muted size-4 shrink-0 transition-transform ${aberto ? "rotate-90" : ""}`}
          aria-hidden
        />
        <span className="min-w-0 flex-1">
          <span className="text-md flex items-center gap-2 font-medium">
            <span className="truncate">{grupo.nome}</span>
            {/* Quantos cadastros iguais existem. O número é o aviso de que
                há duplicata, sem afirmar que são a mesma empresa. */}
            <span className="bg-surface-sunken text-text-secondary inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold">
              <Layers className="size-3" aria-hidden />
              {grupo.quantidade}
            </span>
          </span>
          <Referencia cidade={grupo.cidade} titulos={grupo.titulos} />
        </span>
        <Contagem n={grupo.negocios} />
      </button>

      {aberto && (
        <ul className="bg-surface-sunken/40">
          {carregando && (
            <li className="text-text-muted px-4 py-2 pl-11 text-sm">Carregando…</li>
          )}
          {irmaos?.map((o) => (
            <li key={o.id}>
              <Link
                href={`/contatos/organizacoes/${o.id}`}
                className="border-border/60 hover:bg-surface-hover flex items-center gap-3 border-t px-4 py-2 pl-11"
              >
                <span className="min-w-0 flex-1">
                  <span className="text-md block truncate">{o.nome}</span>
                  <Referencia cidade={o.cidade} titulos={o.titulos} />
                </span>
                <Contagem n={o.negocios} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * A linha de referência sob o nome: cidade, quando existe, e os títulos
 * dos negócios. Com "Sicoob Credseguro" repetido seis vezes e cidade
 * vazia, é o negócio que diz qual cadastro é qual.
 */
function Referencia({
  cidade,
  titulos,
}: {
  cidade: string | null;
  titulos: string[] | null;
}) {
  const lista = titulos?.filter(Boolean) ?? [];
  if (!cidade && lista.length === 0) return null;

  return (
    <span className="text-text-muted mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 text-sm">
      {cidade && <span className="truncate">{cidade}</span>}
      {cidade && lista.length > 0 && <span aria-hidden className="opacity-40">·</span>}
      {lista.map((t, i) => (
        <span key={i} className="inline-flex min-w-0 items-center gap-1">
          <Briefcase className="size-3 shrink-0 opacity-60" aria-hidden />
          <span className="max-w-[16rem] truncate">{t}</span>
        </span>
      ))}
    </span>
  );
}

function Contagem({ n }: { n: number }) {
  return (
    <span className="text-text-muted tabular flex shrink-0 items-center gap-1 text-sm">
      <Briefcase className="size-3.5" aria-hidden />
      {n.toLocaleString("pt-BR")}
    </span>
  );
}
