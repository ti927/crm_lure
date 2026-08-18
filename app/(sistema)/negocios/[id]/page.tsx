import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Cabecalho } from "./cabecalho";
import { ZonaDados } from "./zona-dados";
import { ZonaTempo, type ItemTempo } from "./zona-tempo";
import { ZonaLateral } from "./zona-lateral";

/**
 * F4 — detalhe do negócio, em três zonas (D-057, B-050).
 *
 * O recorte segue o Pipedrive: dados à esquerda, linha do tempo no meio,
 * pessoas e atividades à direita, com a barra de etapas e os botões de
 * desfecho no topo.
 */
export default async function PaginaNegocio({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ de?: string }>;
}) {
  const { id } = await params;
  const { de } = await searchParams;
  // Quem abriu pelo Kanban volta para o Kanban; o padrao continua sendo
  // a Lista, de onde a maioria dos cliques parte.
  const voltarPara = de === "kanban" ? "/kanban" : "/negocios";
  const voltarRotulo = de === "kanban" ? "Kanban" : "Negócios";
  const supabase = await createClient();

  const { data: negocio } = await supabase
    .from("negocio")
    .select(
      `id, titulo, valor, status, criado_em, atualizado_em,
       etapa_id, responsavel_id, origem_id, produto_id, motivo_perda_id,
       organizacao(id, nome, cidade),
       etapa(id, nome, ordem),
       usuario(id, nome, foto_url),
       origem(nome), produto(nome), motivo_perda(id, nome)`
    )
    .eq("id", id)
    .maybeSingle();

  if (!negocio) notFound();

  // Tudo o que a tela precisa, em paralelo: seis idas ao banco em
  // sequência somariam meio segundo à toa.
  const [
    { data: etapas },
    { data: usuarios },
    { data: motivos },
    { data: origens },
    { data: produtos },
    { data: eventos },
    { data: anotacoes },
    { data: atividades },
    { data: pessoas },
  ] = await Promise.all([
    supabase.from("etapa").select("id, nome, ordem").order("ordem"),
    supabase.from("usuario").select("id, nome, foto_url").eq("ativo", true).order("nome"),
    supabase.from("motivo_perda").select("id, nome").eq("ativo", true).order("ordem"),
    supabase.from("origem").select("id, nome").eq("ativo", true).order("ordem"),
    supabase.from("produto").select("id, nome").order("nome"),
    supabase
      .from("evento_negocio")
      .select("id, tipo, valor_anterior, valor_novo, ocorrido_em, origem_carga, usuario(nome, foto_url)")
      .eq("negocio_id", id)
      .order("ocorrido_em", { ascending: false }),
    supabase
      .from("anotacao")
      .select("id, texto, criado_em, usuario(nome, foto_url)")
      .eq("negocio_id", id)
      .order("criado_em", { ascending: false }),
    supabase
      .from("atividade")
      .select("id, titulo, data, hora_inicio, concluida, tipo_atividade(nome), usuario(nome, foto_url)")
      .eq("negocio_id", id)
      .order("data", { ascending: false }),
    supabase
      .from("negocio_pessoa")
      .select("pessoa(id, nome, forma_contato(tipo, valor), pessoa_organizacao(cargo))")
      .eq("negocio_id", id),
  ]);

  /*
   * A linha do tempo junta três origens numa fita só, e o seletor de
   * D-058 separa por natureza:
   *   sistema  — o que o gatilho registrou (etapa, valor, responsável, status)
   *   usuario  — o que uma pessoa escreveu ou fez (anotações, atividades)
   * Misturar sem separar esconderia o registro humano no meio do
   * automático, que é muito mais volumoso.
   */
  const nomeEtapa = new Map((etapas ?? []).map((e) => [e.id, e.nome]));
  const nomeUsuario = new Map((usuarios ?? []).map((u) => [u.id, u.nome]));

  const linha: ItemTempo[] = [
    ...(eventos ?? []).map((e) => ({
      id: `e${e.id}`,
      natureza: "sistema" as const,
      tipo: e.tipo,
      quando: e.ocorrido_em,
      autor: e.usuario?.nome ?? null,
      foto: e.usuario?.foto_url ?? null,
      de: rotulo(e.tipo, e.valor_anterior, nomeEtapa, nomeUsuario),
      para: rotulo(e.tipo, e.valor_novo, nomeEtapa, nomeUsuario),
      daCarga: e.origem_carga,
    })),
    ...(anotacoes ?? []).map((a) => ({
      id: `a${a.id}`,
      natureza: "usuario" as const,
      tipo: "anotacao" as const,
      quando: a.criado_em,
      autor: a.usuario?.nome ?? null,
      foto: a.usuario?.foto_url ?? null,
      texto: a.texto,
      anotacaoId: a.id,
    })),
    ...(atividades ?? []).map((t) => ({
      id: `t${t.id}`,
      natureza: "usuario" as const,
      tipo: "atividade" as const,
      quando: t.data,
      autor: t.usuario?.nome ?? null,
      foto: t.usuario?.foto_url ?? null,
      texto: t.titulo ?? t.tipo_atividade?.nome ?? "Atividade",
      concluida: t.concluida,
    })),
  ].sort((a, b) => (a.quando < b.quando ? 1 : -1));

  return (
    <div className="flex h-full min-w-0 flex-col">
      <div className="border-border shrink-0 border-b px-4 py-3">
        <Link
          href={voltarPara}
          className="text-text-muted hover:text-text mb-2 inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          {voltarRotulo}
        </Link>

        <Cabecalho
          negocio={{
            id: negocio.id,
            titulo: negocio.titulo,
            status: negocio.status,
            etapaId: negocio.etapa_id,
            organizacao: negocio.organizacao,
          }}
          etapas={etapas ?? []}
          motivos={motivos ?? []}
        />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-px overflow-y-auto lg:grid-cols-[20rem_minmax(0,1fr)_20rem] lg:overflow-hidden">
        <ZonaDados
          negocio={negocio}
          etapas={etapas ?? []}
          usuarios={usuarios ?? []}
          motivos={motivos ?? []}
          origens={origens ?? []}
          produtos={produtos ?? []}
        />

        <ZonaTempo negocioId={negocio.id} itens={linha} />

        <ZonaLateral
          negocioId={negocio.id}
          organizacao={negocio.organizacao}
          pessoas={(pessoas ?? []).map((p) => p.pessoa).filter(Boolean)}
          atividades={atividades ?? []}
        />
      </div>
    </div>
  );
}

/** O log guarda id em texto; a tela precisa do nome. */
function rotulo(
  tipo: string,
  bruto: string | null,
  etapas: Map<string, string>,
  usuarios: Map<string, string>
) {
  if (!bruto) return null;
  if (tipo === "etapa") return etapas.get(bruto) ?? "etapa removida";
  if (tipo === "responsavel") return usuarios.get(bruto) ?? "usuário removido";
  return bruto;
}
