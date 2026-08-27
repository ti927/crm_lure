"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Building2,
  ChevronRight,
  Briefcase,
  Layers,
  Users,
  CalendarCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { data as fdata } from "@/lib/formato";
import { EtiquetaContagem } from "@/components/dominio/etiqueta-contagem";

/** Item da amostra de atividades — vem em `jsonb` para carregar o estado. */
export type AtividadeAmostra = {
  rotulo: string;
  data: string;
  concluida: boolean;
};

/**
 * As contagens que a linha mostra, com a amostra de cada uma.
 *
 * ⚠️ Contagem e amostra são coisas separadas de propósito: são 3.312
 * vínculos de pessoa e 5.213 atividades ligadas a organização, e trazer
 * as listas inteiras para desenhar três números carregaria a base numa
 * tela de 50 linhas (R-006). O número é exato; a lista é uma amostra, e a
 * dica diz quanto ficou de fora.
 */
type Contagens = {
  negocios: number;
  /** Títulos dos negócios mais recentes — a referência que identifica o
   *  cadastro quando o nome se repete e cidade/site estão vazios. */
  titulos: string[] | null;
  pessoas: number;
  nomes_pessoas: string[] | null;
  atividades: number;
  atividades_pendentes: number;
  amostra_atividades: AtividadeAmostra[] | null;
};

export type Grupo = Contagens & {
  chave: string;
  nome: string;
  quantidade: number;
  representante_id: string;
  cidade: string | null;
  website: string | null;
};

type Irmao = Contagens & {
  id: string;
  nome: string;
  cidade: string | null;
  website: string | null;
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
          <Contagens item={grupo} />
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
        <Contagens item={grupo} />
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
                <Contagens item={o} />
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
  // ⚠️ Só os dois primeiros. A amostra do servidor subiu para 6 porque a
  // dica de tela dos negócios usa a mesma lista; aqui, seis títulos numa
  // linha de 44px voltariam a empurrar o nome da organização para fora.
  const lista = (titulos?.filter(Boolean) ?? []).slice(0, 2);
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

/**
 * As três contagens da linha, na mesma ordem em toda a lista: pessoas,
 * atividades, negócios. Ordem fixa é o que deixa a coluna da direita
 * legível de cima a baixo — com a ordem variando, cada linha exigiria ler
 * o ícone de novo.
 */
function Contagens({ item }: { item: Contagens }) {
  const pessoas = item.nomes_pessoas?.filter(Boolean) ?? [];
  const ativs = item.amostra_atividades ?? [];
  const titulos = item.titulos?.filter(Boolean) ?? [];

  const restantes = (total: number, mostrados: number) =>
    total > mostrados
      ? `+${(total - mostrados).toLocaleString("pt-BR")} não ${
          total - mostrados === 1 ? "mostrada" : "mostradas"
        }`
      : undefined;

  return (
    <span className="flex shrink-0 items-center gap-0.5">
      <EtiquetaContagem
        icone={Users}
        n={item.pessoas}
        rotulo="pessoas vinculadas"
        titulo="Pessoas vinculadas"
        vazio="Nenhuma pessoa vinculada."
        rodape={restantes(item.pessoas, pessoas.length)}
        itens={pessoas.map((nome) => (
          <span key={nome} className="truncate">
            {nome}
          </span>
        ))}
      />

      <EtiquetaContagem
        icone={CalendarCheck}
        n={item.atividades}
        rotulo="atividades vinculadas"
        titulo="Atividades"
        vazio="Nenhuma atividade."
        // ⚠️ O rodapé diz PENDENTES, e não só quantas sobraram: numa ficha
        // de cliente a pergunta é o que falta fazer, e o número do ícone
        // conta tudo, inclusive as concluídas de 2021.
        rodape={
          [
            item.atividades_pendentes > 0
              ? `${item.atividades_pendentes} pendente${item.atividades_pendentes === 1 ? "" : "s"}`
              : "Nenhuma pendente",
            restantes(item.atividades, ativs.length),
          ]
            .filter(Boolean)
            .join(" · ") || undefined
        }
        itens={ativs.map((a, i) => (
          <span key={i} className="flex min-w-0 flex-1 items-center gap-2">
            {/* Verde concluída, cinza pendente — e a data escrita do lado,
                porque cor sozinha não informa (Doc 08, B-076). */}
            <span
              className={`size-1.5 shrink-0 rounded-full ${
                a.concluida ? "bg-success" : "bg-border-strong"
              }`}
              aria-hidden
            />
            <span className={`truncate ${a.concluida ? "text-text-muted" : ""}`}>
              {a.rotulo}
            </span>
            <span className="text-text-muted tabular ml-auto shrink-0 text-sm">
              {fdata(a.data)}
            </span>
          </span>
        ))}
      />

      <EtiquetaContagem
        icone={Briefcase}
        n={item.negocios}
        rotulo="negócios"
        titulo="Negócios"
        vazio="Nenhum negócio."
        rodape={restantes(item.negocios, titulos.length)}
        itens={titulos.map((t, i) => (
          <span key={i} className="truncate">
            {t}
          </span>
        ))}
      />
    </span>
  );
}
