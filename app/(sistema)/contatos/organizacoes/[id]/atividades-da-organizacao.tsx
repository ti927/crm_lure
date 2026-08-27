"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus } from "lucide-react";
import { data as fdata } from "@/lib/formato";
import { AvatarUsuario } from "@/components/dominio/avatar-usuario";
import {
  SeletorResponsavel,
  type Usuario,
} from "@/components/dominio/seletor-responsavel";
import { DialogoAtividade } from "@/app/(sistema)/atividades/dialogo-atividade";
import { SITUACOES, type Situacao } from "@/app/(sistema)/atividades/consulta";

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

/**
 * Atividades da organização, com filtro de responsável e de situação.
 *
 * ⚠️ **Dois seletores, e não um.** A primeira versão tinha um só, com
 * três posições ("Minhas pendentes / Todas pendentes / Todas"), que
 * misturava DUAS perguntas independentes: *de quem* e *em que estado*.
 * Misturadas, metade das combinações não existia — não havia como ver as
 * concluídas de uma pessoa, nem as pendentes de outra que não eu. O
 * maestro pediu o filtro por usuário e o caminho certo era separar, não
 * acrescentar uma quarta posição àquela lista.
 *
 * ⚠️ O seletor de responsável é o MESMO do Kanban e da Lista (D-090), com
 * foto. Um seletor de gente diferente em cada tela seria três coisas para
 * aprender no lugar de uma.
 */
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

  // ⚠️ Abre em "eu" só se houver um "eu" para comparar. Sem isso a seção
  // nasceria vazia para quem o banco ainda não reconhece — e vazio se lê
  // como "não há nada", que é a armadilha do sino mudo da C-05.
  const [responsavel, setResponsavel] = useState(euId ?? "");
  const [situacao, setSituacao] = useState<Situacao>("pendentes");

  const casa = (a: AtividadeDaOrg) =>
    (!responsavel || a.responsavelId === responsavel) &&
    (situacao === "todas" ||
      (situacao === "pendentes" ? !a.concluida : a.concluida));

  const visiveis = atividades.filter(casa);

  // Pendente primeiro e mais antiga no topo: quem está parada há mais
  // tempo é a que cobra atenção. Concluída vai para o fim, da mais
  // recente para a mais antiga, que é ordem de histórico.
  const ordenadas = [...visiveis].sort((a, b) => {
    if (a.concluida !== b.concluida) return a.concluida ? 1 : -1;
    return a.concluida
      ? b.data.localeCompare(a.data)
      : a.data.localeCompare(b.data);
  });

  const pendentes = atividades.filter((a) => !a.concluida);
  const minhasPendentes = pendentes.filter((a) => a.responsavelId === euId).length;

  /**
   * ⚠️ Vazio NÃO é o mesmo que "não há nada", e a mensagem tem de dizer
   * qual dos dois é. Com o filtro abrindo em "eu", uma organização cheia
   * de atividades de outra pessoa apareceria vazia para mim — e eu
   * concluiria que não há nada a fazer ali. A frase abaixo conta quantas
   * o recorte está escondendo.
   */
  const escondidas = atividades.length - visiveis.length;

  return (
    <section>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-text-muted text-xs font-semibold uppercase tracking-caps">
          Atividades{" "}
          {minhasPendentes > 0 && (
            <span className="text-text-secondary normal-case">
              · {minhasPendentes}{" "}
              {minhasPendentes === 1 ? "sua pendente" : "suas pendentes"}
            </span>
          )}
        </h2>

        <div className="flex flex-wrap items-center gap-1.5">
          {/* Doc 08 §6.1: o rótulo do controle não repete o que está
              escrito ao lado, e nenhum deles quebra linha. */}
          <SeletorResponsavel
            usuarios={usuarios}
            escolhido={responsavel}
            aoEscolher={setResponsavel}
            rotuloTodos="Todos"
            classe="h-control-sm bg-surface border-border max-w-[9rem] rounded-md border px-2 text-sm"
          />

          <select
            aria-label="Filtrar por situação"
            value={situacao}
            onChange={(e) => setSituacao(e.target.value as Situacao)}
            className="h-control-sm bg-surface border-border rounded-md border px-2 text-sm"
          >
            {SITUACOES.map((s) => (
              <option key={s.valor} value={s.valor}>
                {s.rotulo}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setAgendando(true)}
            className="h-control-sm border-border hover:bg-surface-hover text-text-secondary hover:text-text inline-flex items-center gap-1.5 rounded-md border px-2 text-sm font-medium"
          >
            <CalendarPlus className="size-3.5" aria-hidden />
            Nova
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
          {atividades.length === 0
            ? "Nenhuma atividade."
            : `Nenhuma atividade neste recorte — ${escondidas} ${
                escondidas === 1 ? "está escondida" : "estão escondidas"
              } pelo filtro.`}
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
                  <span className="shrink-0" title={a.responsavelNome}>
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
