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
  somaDaColuna,
  comValorDaColuna,
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
  /**
   * ⚠️ As DUAS idas ao banco que a preferencia custa acontecem so aqui
   * dentro, e nao mais no topo da funcao. Elas so importam na visita
   * crua — que termina em redirecionamento —, e no caminho normal (o de
   * toda busca, todo filtro, toda volta ao quadro) eram 360 ms gastos
   * para ler uma coluna cujo valor ninguem ia usar.
   */
  if (buscaCrua(p)) {
    const {
      data: { user: logado },
    } = await supabase.auth.getUser();

    const { data: eu } = await supabase
      .from("usuario")
      .select("id, preferencia_kanban")
      .eq("auth_id", logado?.id ?? "")
      .maybeSingle();

    if (eu?.preferencia_kanban) redirect(`/kanban?${eu.preferencia_kanban}`);
    if (eu && eu.preferencia_kanban === null) {
      redirect(`/kanban?responsavel=${eu.id}`);
    }
  }

  const filtros = parseFiltros(p);

  /**
   * ⚠️ ONDA 1: tudo que nao depende de mais nada.
   *
   * Medido contra a base real: uma ida ao PostgREST custa ~180 ms, e a
   * consulta em si, menos de 11 ms. Esta tela fazia SEIS ondas em serie
   * — sessao, usuario, etapas, colunas, usuarios, listas — e gastava
   * perto de um segundo so esperando. Nenhuma das quatro abaixo depende
   * das outras; so as colunas dependem das etapas, e por isso ficam na
   * onda seguinte.
   */
  const [
    { data: etapas },
    { data: usuarios },
    { data: origens },
    { data: produtos },
    { data: euId },
  ] = await Promise.all([
    supabase.from("etapa").select("id, nome, ordem").order("ordem"),
    supabase.from("usuario").select("id, nome, foto_url").eq("ativo", true).order("nome"),
    supabase.from("origem").select("id, nome").eq("ativo", true).order("ordem"),
    supabase.from("produto").select("id, nome").order("nome"),
    // Resolve o usuario pelo JWT, dentro do banco, numa ida — sem
    // `auth.getUser()` antes. Casa por `auth_id` la dentro, respeitando
    // a D-109 e sem repetir a confusao de ids da C-05.
    supabase.rpc("usuario_atual"),
  ]);

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
        // A soma vem do banco pela mesma ida, e e da coluna inteira. Ver
        // a nota em `consulta.ts`: somar `cartoes` daria a fatia.
        soma: somaDaColuna(linhas),
        comValor: comValorDaColuna(linhas),
        cartoes: linhas.map(paraCartao),
      };
    })
  );

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
            responsavelPadrao={euId ?? null}
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
