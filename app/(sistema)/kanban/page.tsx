import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FiltroKanban } from "./filtro-kanban";
import { Quadro } from "./quadro";
import { KanbanMobile } from "./kanban-mobile";
import { BotaoNovoNegocio } from "@/app/(sistema)/negocios/botao-novo-negocio";
import {
  parseFiltros,
  buscaCrua,
  paraCartao,
  totalDaColuna,
  type ColunaEtapa,
  type Busca,
} from "./consulta";

/**
 * F5 — Kanban.
 *
 * ⚠️ R-006: cada coluna comeca com poucos cartoes e cresce sob demanda.
 * Sao 2.461 negocios, e "Proposta Enviada" sozinha tem 1.168 — o Doc 10
 * supunha que o peso estivesse em Cold Lead, mas a extracao mostrou o
 * contrario: 74% da base esta nas duas ultimas etapas.
 */
const INICIAL_POR_COLUNA = 20;

export default async function PaginaKanban({
  searchParams,
}: {
  searchParams: Promise<Busca>;
}) {
  const p = await searchParams;
  const supabase = await createClient();

  const {
    data: { user: logado },
  } = await supabase.auth.getUser();

  const { data: eu } = await supabase
    .from("usuario")
    .select("id, preferencia_kanban")
    .eq("auth_id", logado?.id ?? "")
    .maybeSingle();

  /**
   * Visita "crua" (sem nenhum parametro reconhecido): e aqui que o
   * quadro decide em que recorte abrir.
   *
   * ⚠️ Os tres estados da coluna sao a regra inteira:
   *
   *   preenchida — a ultima combinacao que a pessoa escolheu. Volta
   *                igual depois de um login novo.
   *   NULA       — nunca escolheu nada. Abre em "so os meus", que e o
   *                que se espera de quem entra para trabalhar a propria
   *                carteira. Nao grava: continua nula ate a pessoa
   *                escolher algo, e o padrao segue valendo.
   *   VAZIA      — escolheu ver TUDO (clicou em "Limpar"). Nao ha
   *                redirecionamento, e o padrao NAO volta por cima.
   *
   * Sem o terceiro estado, "Limpar" seria desfeito na hora pelo padrao
   * e o botao pareceria quebrado — foi o laco que a B-045 ja tinha
   * evitado na Lista, pelo mesmo caminho.
   */
  if (buscaCrua(p)) {
    if (eu?.preferencia_kanban) redirect(`/kanban?${eu.preferencia_kanban}`);
    if (eu && eu.preferencia_kanban === null) {
      redirect(`/kanban?responsavel=${eu.id}`);
    }
  }

  const filtros = parseFiltros(p);

  const { data: etapas } = await supabase
    .from("etapa")
    .select("id, nome, ordem")
    .order("ordem");

  /**
   * Uma consulta por etapa, em paralelo: cada uma traz sua fatia e sua
   * contagem. Buscar tudo de uma vez e cortar no cliente violaria R-006.
   *
   * ⚠️ Sai de `kanban_coluna` no banco, e nao de uma consulta montada
   * aqui, por causa da C-04: a barra de busca precisa alcancar o nome da
   * ORGANIZACAO, que e coluna vinculada, e o PostgREST recusa isso
   * dentro de `or`. A funcao tambem devolve o total do recorte na mesma
   * ida, no lugar do `count: "exact"` que havia antes.
   *
   * ⚠️ D-145: o funil mostra so negocio ABERTO — o filtro de status vive
   * dentro da funcao. Ganho e perdido nao somem da Lista, so do quadro.
   */
  const colunas: ColunaEtapa[] = await Promise.all(
    (etapas ?? []).map(async (e) => {
      const { data } = await supabase.rpc("kanban_coluna", {
        p_etapa: e.id,
        p_termo: filtros.busca || null,
        p_responsavel: filtros.responsavel || null,
        p_deslocamento: 0,
        p_limite: INICIAL_POR_COLUNA,
      });

      const linhas = data ?? [];
      return {
        ...e,
        total: totalDaColuna(linhas),
        cartoes: linhas.map(paraCartao),
      };
    })
  );

  const { data: usuarios } = await supabase
    .from("usuario")
    .select("id, nome, foto_url")
    .eq("ativo", true)
    .order("nome");

  // As listas que o diálogo de criação precisa. Quem está logado já veio
  // acima, para o negócio nascer no nome de quem cadastra.
  const [{ data: origens }, { data: produtos }] = await Promise.all([
    supabase.from("origem").select("id, nome").eq("ativo", true).order("ordem"),
    supabase.from("produto").select("id, nome").order("nome"),
  ]);

  const total = colunas.reduce((s, c) => s + c.total, 0);

  // A chave amarra o estado do quadro ao recorte: trocar de responsável
  // ou de termo monta um quadro novo em vez de reaproveitar cartões que
  // já não pertencem a ele.
  const chave = `${filtros.responsavel || "todos"}|${filtros.busca}`;

  return (
    <div className="flex h-full min-w-0 flex-col">
      <div className="border-border flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Kanban</h1>
          <p className="text-text-muted text-sm">
            {total.toLocaleString("pt-BR")}{" "}
            {total === 1 ? "negócio" : "negócios"}
            {filtros.busca ? ` para “${filtros.busca}”` : ""} · arraste para
            mudar de etapa
          </p>
        </div>
        <div className="flex items-center gap-2">
          <FiltroKanban usuarios={usuarios ?? []} />
          <BotaoNovoNegocio
            etapas={etapas ?? []}
            usuarios={usuarios ?? []}
            origens={origens ?? []}
            produtos={produtos ?? []}
            responsavelPadrao={eu?.id ?? null}
          />
        </div>
      </div>

      {/* B-112: no celular, uma etapa por vez, sem arrastar (D-097). */}
      <KanbanMobile
        key={`m-${chave}`}
        colunas={colunas}
        responsavelId={filtros.responsavel}
        termo={filtros.busca}
      />

      <div className="hidden min-h-0 flex-1 flex-col md:flex">
        <Quadro
          key={chave}
          colunas={colunas}
          responsavelId={filtros.responsavel}
          termo={filtros.busca}
        />
      </div>
    </div>
  );
}
