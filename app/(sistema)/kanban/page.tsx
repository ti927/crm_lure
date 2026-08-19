import { createClient } from "@/lib/supabase/server";
import { FiltroKanban } from "./filtro-kanban";
import { Quadro, type ColunaEtapa, type Cartao } from "./quadro";
import { KanbanMobile } from "./kanban-mobile";
import { BotaoNovoNegocio } from "@/app/(sistema)/negocios/botao-novo-negocio";

/**
 * F5 — Kanban.
 *
 * ⚠️ R-006: cada coluna comeca com poucos cartoes e cresce sob demanda.
 * Sao 2.458 negocios, e "Proposta Enviada" sozinha tem 1.168 — o Doc 10
 * supunha que o peso estivesse em Cold Lead, mas a extracao mostrou o
 * contrario: 74% da base esta nas duas ultimas etapas.
 */
const INICIAL_POR_COLUNA = 20;

type Busca = Promise<Record<string, string | string[] | undefined>>;

export default async function PaginaKanban({
  searchParams,
}: {
  searchParams: Busca;
}) {
  const p = await searchParams;
  const responsavelId = (Array.isArray(p.responsavel) ? p.responsavel[0] : p.responsavel) ?? "";

  const supabase = await createClient();

  const { data: etapas } = await supabase
    .from("etapa")
    .select("id, nome, ordem")
    .order("ordem");

  // Uma consulta por etapa, em paralelo: cada uma traz sua fatia e sua
  // contagem. Buscar tudo de uma vez e cortar no cliente violaria R-006.
  const colunas: ColunaEtapa[] = await Promise.all(
    (etapas ?? []).map(async (e) => {
      let consulta = supabase
        .from("negocio")
        .select(
          "id, titulo, valor, status, organizacao(nome), usuario(nome, foto_url)",
          { count: "exact" }
        )
        .eq("etapa_id", e.id);

      if (responsavelId) consulta = consulta.eq("responsavel_id", responsavelId);

      const { data, count } = await consulta
        .order("criado_em", { ascending: false })
        .range(0, INICIAL_POR_COLUNA - 1)
        .returns<Cartao[]>();

      return { ...e, total: count ?? 0, cartoes: data ?? [] };
    })
  );

  // Só os motivos ativos entram no diálogo: a carga trouxe 107 do
  // Pipedrive e deixou inativa a cauda de texto livre usada uma ou duas
  // vezes, que polui a escolha sem ajudar ninguém.
  const { data: motivos } = await supabase
    .from("motivo_perda")
    .select("id, nome")
    .eq("ativo", true)
    .order("ordem");

  const { data: usuarios } = await supabase
    .from("usuario")
    .select("id, nome, foto_url")
    .eq("ativo", true)
    .order("nome");

  // As listas que o diálogo de criação precisa, e quem está logado para
  // o negócio já nascer no nome de quem cadastra.
  const {
    data: { user: logado },
  } = await supabase.auth.getUser();

  const [{ data: origens }, { data: produtos }, { data: eu }] = await Promise.all([
    supabase.from("origem").select("id, nome").eq("ativo", true).order("ordem"),
    supabase.from("produto").select("id, nome").order("nome"),
    supabase.from("usuario").select("id").eq("auth_id", logado?.id ?? "").maybeSingle(),
  ]);

  const total = colunas.reduce((s, c) => s + c.total, 0);

  return (
    <div className="flex h-full min-w-0 flex-col">
      <div className="border-border flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Kanban</h1>
          <p className="text-text-muted text-sm">
            {total.toLocaleString("pt-BR")}{" "}
            {total === 1 ? "negócio" : "negócios"} · arraste para mudar de etapa
          </p>
        </div>
        <div className="flex items-center gap-2">
          <FiltroKanban usuarios={usuarios ?? []} />
          <BotaoNovoNegocio
            etapas={etapas ?? []}
            usuarios={usuarios ?? []}
            origens={origens ?? []}
            produtos={produtos ?? []}
            motivos={motivos ?? []}
            responsavelPadrao={eu?.id ?? null}
          />
        </div>
      </div>

      {/* A chave amarra o estado do quadro ao filtro: trocar de responsável
          monta um quadro novo em vez de reaproveitar cartões que já não
          pertencem ao recorte. */}
      {/* B-112: no celular, uma etapa por vez, sem arrastar (D-097). */}
      <KanbanMobile
        key={`m-${responsavelId || "todos"}`}
        colunas={colunas}
        responsavelId={responsavelId}
      />

      <div className="hidden min-h-0 flex-1 flex-col md:flex">
        <Quadro
          key={responsavelId || "todos"}
          colunas={colunas}
          motivos={motivos ?? []}
          responsavelId={responsavelId}
        />
      </div>
    </div>
  );
}
