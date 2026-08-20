"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Check,
  Briefcase,
  Building2,
  User,
  Clock,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Pencil,
  SearchX,
} from "lucide-react";
import { UsuarioComFoto } from "@/components/dominio/avatar-usuario";
import { concluirAtividade } from "./acoes";
import {
  somaDias,
  rotuloDia,
  formataData,
  destinoDaAtividade,
  type LinhaAtividade,
} from "./consulta";

const ICONE_VINCULO = {
  negocio: Briefcase,
  organizacao: Building2,
  pessoa: User,
} as const;

/**
 * Vista "Lista": um dia em foco por vez, começando em Hoje, no modelo do
 * Pipedrive. As vencidas NÃO aparecem aqui — moram na aba própria, para
 * não empurrar as atividades de hoje para baixo (pedido do maestro).
 */
export function ListaAtividades({
  dia,
  hoje,
  doDia,
  aoEditar,
  aoMudar,
}: {
  dia: string;
  hoje: string;
  doDia: LinhaAtividade[];
  aoEditar: (a: LinhaAtividade) => void;
  aoMudar: () => void;
}) {
  const router = useRouter();
  const caminho = usePathname();
  const params = useSearchParams();
  const [pendente, iniciar] = useTransition();

  function irParaDia(alvo: string) {
    const p = new URLSearchParams(params);
    // Hoje é o padrão: não suja a URL com ?dia= quando volta ao presente.
    if (alvo === hoje) p.delete("dia");
    else p.set("dia", alvo);
    const s = p.toString();
    iniciar(() => router.push(s ? `${caminho}?${s}` : caminho));
  }

  return (
    <div className="flex flex-col" data-pendente={pendente || undefined}>
      <div className="border-border bg-surface sticky top-0 z-20 flex items-center gap-2 border-b px-4 py-2">
        <button
          type="button"
          onClick={() => irParaDia(somaDias(dia, -1))}
          aria-label="Dia anterior"
          className="border-border hover:bg-surface-hover inline-flex size-7 items-center justify-center rounded-md border"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => irParaDia(somaDias(dia, 1))}
          aria-label="Próximo dia"
          className="border-border hover:bg-surface-hover inline-flex size-7 items-center justify-center rounded-md border"
        >
          <ChevronRight className="size-4" aria-hidden />
        </button>
        <h2 className="text-md font-semibold">{rotuloDia(dia, hoje)}</h2>
        {doDia.length > 0 && (
          <span className="text-text-muted text-sm">{doDia.length}</span>
        )}
        {dia !== hoje && (
          <button
            type="button"
            onClick={() => irParaDia(hoje)}
            className="border-border hover:bg-surface-hover ml-1 h-7 rounded-md border px-2.5 text-sm font-medium"
          >
            Hoje
          </button>
        )}
      </div>

      {doDia.length === 0 ? (
        <p className="text-text-muted px-4 py-16 text-center text-sm">
          Nenhuma atividade neste dia.
        </p>
      ) : (
        <ul>
          {doDia.map((a, i) => (
            <ItemLista
              key={a.id}
              atividade={a}
              indice={i}
              aoEditar={aoEditar}
              aoMudar={aoMudar}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Vista "Vencidas": todas as pendências em atraso, cada uma com a data em
 * que venceu à frente. Sem navegação de dia — é a pilha inteira de
 * atrasados de uma vez, da mais antiga para a mais recente.
 */
export function ListaVencidas({
  vencidas,
  hoje,
  aoEditar,
  aoMudar,
}: {
  vencidas: LinhaAtividade[];
  hoje: string;
  aoEditar: (a: LinhaAtividade) => void;
  aoMudar: () => void;
}) {
  if (vencidas.length === 0) {
    return (
      <div className="px-4 py-16 text-center">
        <p className="text-text-secondary text-md font-medium">
          Nenhuma atividade vencida.
        </p>
        <p className="text-text-muted mt-1 text-sm">
          Tudo em dia neste recorte.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <h2 className="bg-surface-sunken border-border text-danger-ink sticky top-0 z-10 flex items-center gap-2 border-b px-4 py-2 text-xs font-semibold uppercase tracking-caps">
        <AlertTriangle className="size-3.5" aria-hidden />
        Vencidas
        <span className="opacity-60">{vencidas.length}</span>
      </h2>
      <ul>
        {vencidas.map((a, i) => (
          <ItemLista
            key={a.id}
            atividade={a}
            indice={i}
            venceuEm={a.data}
            hoje={hoje}
            aoEditar={aoEditar}
            aoMudar={aoMudar}
          />
        ))}
      </ul>
    </div>
  );
}

/**
 * Vista de busca: resultados de toda a base, e não de um dia.
 *
 * ⚠️ Cada linha mostra a DATA, coisa que a lista do dia não precisa
 * mostrar. Sem ela o resultado fica ambíguo — "Chamada · Sicoob" não diz
 * se foi ontem ou em 2023.
 */
export function ListaResultados({
  resultados,
  termo,
  hoje,
  aoEditar,
  aoMudar,
}: {
  resultados: LinhaAtividade[];
  termo: string;
  hoje: string;
  aoEditar: (a: LinhaAtividade) => void;
  aoMudar: () => void;
}) {
  if (resultados.length === 0) {
    return (
      <div className="px-4 py-16 text-center">
        <SearchX className="text-text-muted mx-auto size-6" aria-hidden />
        <p className="text-text-secondary mt-3 text-md font-medium">
          Nada encontrado para &ldquo;{termo}&rdquo;.
        </p>
        <p className="text-text-muted mt-1 text-sm">
          A busca cobre o título da atividade, a descrição e o nome do negócio, da
          organização e da pessoa.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <h2 className="bg-surface-sunken border-border text-text-muted sticky top-0 z-10 flex items-center gap-2 border-b px-4 py-2 text-xs font-semibold uppercase tracking-caps">
        Resultados
        <span className="opacity-60">{resultados.length}</span>
        {/* ⚠️ O teto é 100. Dizer isso evita a leitura de que "só existem
            estes" — resultado truncado com cara de completo é pior que
            resultado nenhum. */}
        {resultados.length >= 100 && (
          <span className="ml-auto normal-case tracking-normal opacity-70">
            mostrando os 100 mais recentes
          </span>
        )}
      </h2>
      <ul>
        {resultados.map((a, i) => (
          <ItemLista
            key={a.id}
            atividade={a}
            indice={i}
            mostrarData
            hoje={hoje}
            aoEditar={aoEditar}
            aoMudar={aoMudar}
          />
        ))}
      </ul>
    </div>
  );
}

/** Quantos dias uma data está atrás de hoje. */
function diasDeAtraso(data: string, hoje: string): number {
  const um = Date.parse(`${data}T00:00:00Z`);
  const outro = Date.parse(`${hoje}T00:00:00Z`);
  return Math.round((outro - um) / 86_400_000);
}

function ItemLista({
  atividade,
  indice,
  mostrarData,
  venceuEm,
  hoje,
  aoEditar,
  aoMudar,
}: {
  atividade: LinhaAtividade;
  indice: number;
  /** Vista de busca: a data vem à frente, porque o resultado não é de um dia só. */
  mostrarData?: boolean;
  /** Quando presente, mostra a data de vencimento à frente (aba Vencidas). */
  venceuEm?: string;
  hoje?: string;
  aoEditar: (a: LinhaAtividade) => void;
  aoMudar: () => void;
}) {
  const [concluida, setConcluida] = useState(atividade.concluida);
  const [salvando, setSalvando] = useState(false);

  async function alternar() {
    const alvo = !concluida;
    setConcluida(alvo); // otimista: marcar tarefa responde na hora
    setSalvando(true);
    const r = await concluirAtividade(atividade.id, alvo);
    setSalvando(false);
    if (r?.erro) setConcluida(!alvo);
    else aoMudar(); // reconcilia com o servidor
  }

  const tipoVinculo = atividade.negocio
    ? "negocio"
    : atividade.organizacao
      ? "organizacao"
      : atividade.pessoa
        ? "pessoa"
        : null;
  const IconeVinculo = tipoVinculo ? ICONE_VINCULO[tipoVinculo] : null;
  const nomeVinculo =
    atividade.negocio?.titulo ??
    atividade.organizacao?.nome ??
    atividade.pessoa?.nome ??
    null;

  const atraso = venceuEm && hoje ? diasDeAtraso(venceuEm, hoje) : 0;
  const destino = destinoDaAtividade(atividade);

  return (
    <li
      style={{ animationDelay: `${Math.min(indice, 14) * 18}ms` }}
      className="border-border hover:bg-surface-hover animate-in fade-in fill-mode-backwards border-b duration-300 motion-safe:transition-colors"
    >
      <div className="flex items-start gap-3 px-4 py-2.5">
        <button
          type="button"
          disabled={salvando}
          onClick={() => void alternar()}
          aria-label={concluida ? "Reabrir atividade" : "Concluir atividade"}
          className="hover:bg-surface-hover mt-0.5 -m-1 shrink-0 rounded p-1 disabled:opacity-60"
        >
          <span
            aria-hidden
            className={`flex size-5 items-center justify-center rounded border transition-all duration-200 ${
              concluida
                ? "border-success bg-success text-text-inverse"
                : "border-border hover:border-brand-ink scale-95"
            }`}
          >
            {concluida && <Check className="size-3.5" strokeWidth={3} />}
          </span>
        </button>

        {/* Data de vencimento à frente, na aba Vencidas. */}
        {venceuEm && (
          <span className="mt-0.5 shrink-0 text-right">
            <span className="text-danger-ink block text-sm font-semibold tabular">
              {formataData(venceuEm)}
            </span>
            {atraso > 0 && (
              <span className="text-text-muted block text-xs">
                {atraso === 1 ? "1 dia" : `${atraso} dias`}
              </span>
            )}
          </span>
        )}

        {/* Na busca a data vem antes do título, e não depois: o resultado
            vem de qualquer época, e "quando foi" é o que situa a linha. */}
        {mostrarData && !venceuEm && (
          <span
            className={`tabular mt-0.5 w-[4.5rem] shrink-0 text-sm ${
              hoje && atividade.data < hoje && !atividade.concluida
                ? "text-danger-ink font-semibold"
                : "text-text-muted"
            }`}
          >
            {formataData(atividade.data)}
          </span>
        )}

        {/* ⚠️ O clique abre O VÍNCULO, não a atividade — pedido do
            maestro, no modelo do Pipedrive: quem olha a lista quer chegar
            ao cliente, não ao cadastro da tarefa. Editar a atividade
            continua possível pelo lápis à direita.

            ⚠️ Vai para o negócio quando há um, mas só 24% das atividades
            têm (D-108): 55% estão em organização e 20% em pessoa. Manda
            para o que existir; as 29 sem vínculo nenhum não viram link e
            abrem a edição, que é o único destino que resta. */}
        <Alvo
          destino={destino}
          aoEditar={() => aoEditar(atividade)}
          className="hover:text-brand-ink min-w-0 flex-1 text-left"
        >
          <span
            className={`text-md block font-medium ${
              concluida ? "text-text-muted line-through" : ""
            }`}
          >
            {atividade.titulo ?? atividade.tipo_atividade?.nome ?? "Atividade"}
          </span>

          <span className="text-text-muted mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm">
            {atividade.tipo_atividade && atividade.titulo && (
              <span>{atividade.tipo_atividade.nome}</span>
            )}
            {atividade.hora_inicio && (
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3" aria-hidden />
                {atividade.hora_inicio.slice(0, 5)}
                {atividade.hora_fim && `–${atividade.hora_fim.slice(0, 5)}`}
              </span>
            )}
            {nomeVinculo && IconeVinculo && (
              <span className="inline-flex min-w-0 items-center gap-1">
                <IconeVinculo className="size-3 shrink-0" aria-hidden />
                <span className="truncate">{nomeVinculo}</span>
              </span>
            )}
          </span>
        </Alvo>

        {/* O lápis é o que sobrou de editar, agora que o clique na linha
            leva ao cliente. Discreto: editar atividade é raro perto de
            concluir e de abrir o negócio. */}
        <button
          type="button"
          onClick={() => aoEditar(atividade)}
          aria-label="Editar atividade"
          title="Editar atividade"
          className="hover:bg-surface-hover text-text-muted hover:text-text mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded"
        >
          <Pencil className="size-3.5" aria-hidden />
        </button>

        {atividade.usuario && (
          <span className="mt-0.5 shrink-0">
            <UsuarioComFoto
              nome={atividade.usuario.nome}
              foto={atividade.usuario.foto_url}
              tamanho="sm"
            />
          </span>
        )}
      </div>
    </li>
  );
}

/**
 * O corpo clicável da linha: vira link quando há para onde ir, e botão de
 * edição quando não há.
 *
 * ⚠️ `<Link>` e `<button>` e não uma `div` com `onClick`: o link precisa
 * abrir em nova aba com o meio do mouse e aparecer na navegação por
 * teclado, e nada disso vem de graça num elemento genérico.
 */
function Alvo({
  destino,
  aoEditar,
  className,
  children,
}: {
  destino: string | null;
  aoEditar: () => void;
  className: string;
  children: React.ReactNode;
}) {
  if (destino) {
    return (
      <Link href={destino} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={aoEditar} className={className}>
      {children}
    </button>
  );
}
