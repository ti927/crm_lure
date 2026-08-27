"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus } from "lucide-react";
import { data as fdata } from "@/lib/formato";
import { AvatarUsuario } from "@/components/dominio/avatar-usuario";
import { DialogoAtividade } from "@/app/(sistema)/atividades/dialogo-atividade";

export type AtividadeDaOrg = {
  id: string;
  titulo: string | null;
  data: string;
  concluida: boolean;
  responsavelId: string | null;
  tipo: string | null;
  responsavelNome: string | null;
  responsavelFoto: string | null;
};

type Tipo = { id: string; nome: string };
type Usuario = { id: string; nome: string; foto_url: string | null };

/**
 * Um recorte só, com três posições, em vez de dois interruptores.
 *
 * "Ativa" aqui quer dizer **pendente** — é o que se pergunta olhando uma
 * ficha de cliente: o que ainda tenho para fazer com esta empresa. As
 * concluídas continuam alcançáveis, mas não são o padrão: elas são
 * histórico, e histórico não é o que faz alguém abrir a ficha.
 */
const RECORTES = [
  { chave: "minhas", rotulo: "Minhas pendentes" },
  { chave: "pendentes", rotulo: "Todas pendentes" },
  { chave: "todas", rotulo: "Todas" },
] as const;

type Recorte = (typeof RECORTES)[number]["chave"];

export function AtividadesDaOrganizacao({
  organizacaoId,
  organizacaoNome,
  atividades,
  tipos,
  usuarios,
  euId,
  hoje,
}: {
  organizacaoId: string;
  organizacaoNome: string;
  atividades: AtividadeDaOrg[];
  tipos: Tipo[];
  usuarios: Usuario[];
  /** `usuario.id` de quem está logado — nulo se a conta ainda não casou. */
  euId: string | null;
  /** "YYYY-MM-DD" em São Paulo, resolvido no servidor (T-05). */
  hoje: string;
}) {
  const router = useRouter();
  const [agendando, setAgendando] = useState(false);

  // ⚠️ Abre em "minhas" só se houver um "eu" para comparar. Sem isso, a
  // seção nasceria vazia para quem o banco ainda não reconhece — e vazio
  // se lê como "não há nada", que é a armadilha do sino mudo da C-05.
  const [recorte, setRecorte] = useState<Recorte>(euId ? "minhas" : "pendentes");

  const visiveis = atividades.filter((a) => {
    if (recorte === "todas") return true;
    if (a.concluida) return false;
    if (recorte === "pendentes") return true;
    return a.responsavelId === euId;
  });

  // Pendente primeiro e mais antiga no topo: quem está parada há mais
  // tempo é a que cobra atenção. Concluída (só em "Todas") vai para o
  // fim, da mais recente para a mais antiga, que é ordem de histórico.
  const ordenadas = [...visiveis].sort((a, b) => {
    if (a.concluida !== b.concluida) return a.concluida ? 1 : -1;
    return a.concluida
      ? b.data.localeCompare(a.data)
      : a.data.localeCompare(b.data);
  });

  const pendentesMinhas = atividades.filter(
    (a) => !a.concluida && a.responsavelId === euId
  ).length;

  return (
    <section>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-text-muted text-xs font-semibold uppercase tracking-caps">
          Atividades{" "}
          {pendentesMinhas > 0 && (
            <span className="text-text-secondary normal-case">
              · {pendentesMinhas}{" "}
              {pendentesMinhas === 1 ? "sua pendente" : "suas pendentes"}
            </span>
          )}
        </h2>

        <div className="flex items-center gap-2">
          <select
            aria-label="Recorte das atividades"
            value={recorte}
            onChange={(e) => setRecorte(e.target.value as Recorte)}
            className="h-control-sm bg-surface border-border rounded-md border px-2 text-sm"
          >
            {RECORTES.map((r) => (
              <option key={r.chave} value={r.chave}>
                {r.rotulo}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setAgendando(true)}
            className="h-control-sm border-border hover:bg-surface-hover text-text-secondary hover:text-text inline-flex items-center gap-1.5 rounded-md border px-2 text-sm font-medium"
          >
            <CalendarPlus className="size-3.5" aria-hidden />
            Nova atividade
          </button>
        </div>
      </div>

      {agendando && (
        <DialogoAtividade
          tipos={tipos}
          usuarios={usuarios}
          // Já nasce amarrada a esta organização — pedir o vínculo de novo
          // seria trabalho repetido. Mesmo padrão da aba do negócio.
          //
          // ⚠️ Atividade pode pertencer a organização sem passar por
          // negócio (D-108), e não é caso de borda: 55% das atividades da
          // base estão penduradas em organização.
          vinculoInicial={{
            tipo: "organizacao",
            id: organizacaoId,
            rotulo: organizacaoNome,
          }}
          aoFechar={(mudou) => {
            setAgendando(false);
            if (mudou) router.refresh();
          }}
        />
      )}

      {ordenadas.length === 0 ? (
        <p className="text-text-muted text-sm">
          {recorte === "minhas"
            ? "Nenhuma atividade sua pendente aqui."
            : recorte === "pendentes"
              ? "Nenhuma atividade pendente."
              : "Nenhuma atividade."}
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {ordenadas.map((a) => {
            const atrasada = !a.concluida && a.data < hoje;
            return (
              <li key={a.id} className="flex items-center gap-2 text-md">
                <span
                  className={`size-1.5 shrink-0 rounded-full ${
                    a.concluida
                      ? "bg-success"
                      : atrasada
                        ? "bg-danger"
                        : "bg-border-strong"
                  }`}
                  aria-hidden
                />
                <span
                  className={`truncate ${a.concluida ? "text-text-muted line-through" : ""}`}
                >
                  {a.titulo ?? a.tipo ?? "Atividade"}
                </span>

                {a.responsavelNome && (
                  <span className="shrink-0">
                    <AvatarUsuario
                      nome={a.responsavelNome}
                      foto={a.responsavelFoto}
                      tamanho="sm"
                    />
                  </span>
                )}

                {/* ⚠️ "Atrasada" escrito, e não só o ponto vermelho: cor
                    sozinha não informa (Doc 08, B-076). */}
                <span
                  className={`tabular ml-auto shrink-0 text-sm ${
                    atrasada ? "text-danger-ink font-medium" : "text-text-muted"
                  }`}
                >
                  {atrasada && <span className="mr-1">Atrasada ·</span>}
                  {fdata(a.data)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
