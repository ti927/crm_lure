import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Globe, Boxes, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { real, dataHora, local } from "@/lib/formato";
import { EtiquetaStatus, EtiquetaEtapa } from "@/components/dominio/etiquetas";
import { CabecalhoOrganizacao } from "./cabecalho-organizacao";
import {
  PessoasDaOrganizacao,
  type PessoaVinculada,
} from "./pessoas-da-organizacao";
import {
  AtividadesDaOrganizacao,
  type AtividadeDaOrg,
} from "./atividades-da-organizacao";
import { hojeBrasilia } from "@/app/(sistema)/atividades/consulta";
import { BotaoNovoNegocio } from "@/app/(sistema)/negocios/botao-novo-negocio";

function comEsquema(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export default async function FichaOrganizacao({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  /**
   * Ficha + histórico derivado (B-093) + as listas do "Novo negócio",
   * TUDO numa onda só.
   *
   * ⚠️ Eram três ondas em série: o cadastro, depois `auth.getUser()`,
   * depois o resto. Medido nesta base, cada ida ao PostgREST custa ~180
   * ms e a consulta em si menos de 11 ms — as duas primeiras ondas eram
   * ~360 ms de espera pura. O cadastro entra na onda junto: se ele não
   * existir, sete consultas se perdem, e isso acontece quando alguém
   * digita um id inválido, não quando alguém abre uma ficha.
   *
   * ⚠️ `usuario_atual()` no lugar de `auth.getUser()` + busca por
   * `auth_id`: resolve pelo JWT dentro do banco, numa ida, e continua
   * casando por `auth_id` lá dentro — a D-109 de pé e a C-05 evitada.
   */
  const [
    { data: org },
    { data: vinculos },
    { data: negocios },
    { data: atividades },
    { data: anotacoes },
    { data: tipos },
    { data: usuarios },
    { data: euId },
    { data: etapas },
    { data: origens },
    { data: produtos },
  ] = await Promise.all([
    supabase
      .from("organizacao")
      .select("id, nome, cidade, uf, endereco, website, bubble_id")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("pessoa_organizacao")
      .select("cargo, pessoa(id, nome, forma_contato(tipo, valor))")
      .eq("organizacao_id", id),
    supabase
      .from("negocio")
      .select("id, titulo, valor, status, etapa(nome, ordem)")
      .eq("organizacao_id", id)
      .order("criado_em", { ascending: false })
      .limit(100),
    // ⚠️ 100, e não 50: o recorte de "pendentes" é aplicado no cliente
    // sobre o que veio, e um teto curto poderia cortar justamente as
    // pendentes antigas — que são as que mais importam numa ficha. Não é
    // risco de volume: são 6.561 atividades para 2.897 organizações,
    // pouco mais de duas por cadastro.
    supabase
      .from("atividade")
      .select(
        "id, titulo, data, concluida, responsavel_id, tipo_atividade(nome), usuario(nome, foto_url)"
      )
      .eq("organizacao_id", id)
      .order("data", { ascending: false })
      .limit(100),
    supabase
      .from("anotacao")
      .select("id, texto, criado_em, usuario(nome)")
      .eq("organizacao_id", id)
      .order("criado_em", { ascending: false })
      .limit(50),
    supabase.from("tipo_atividade").select("id, nome").order("nome"),
    supabase
      .from("usuario")
      .select("id, nome, foto_url")
      .eq("ativo", true)
      .order("nome"),
    // ⚠️ `usuario.id`, e NUNCA `auth.uid()`: desde a D-109 os dois são
    // diferentes, e comparar com o errado deixaria "minhas pendentes"
    // vazio exatamente para quem veio da carga — os sócios —, sem erro
    // nenhum na tela. É a armadilha da C-05.
    supabase.rpc("usuario_atual"),
    // As três listas que o diálogo de "Novo negócio" precisa. Viajam de
    // graça: já estão na onda que a tela ia esperar de qualquer jeito.
    supabase.from("etapa").select("id, nome, ordem").order("ordem"),
    supabase.from("origem").select("id, nome").eq("ativo", true).order("ordem"),
    supabase.from("produto").select("id, nome").order("nome"),
  ]);

  if (!org) notFound();

  const pessoas: PessoaVinculada[] = (vinculos ?? [])
    .filter((v) => v.pessoa)
    .map((v) => ({
      id: v.pessoa!.id,
      nome: v.pessoa!.nome,
      cargo: v.cargo,
      contatos: v.pessoa!.forma_contato ?? [],
    }));

  // ⚠️ Só DADOS atravessam para o componente de cliente: nenhuma função,
  // nenhum formatador passado como propriedade (C-09/C-10).
  const atividadesDaOrg: AtividadeDaOrg[] = (atividades ?? []).map((a) => ({
    id: a.id,
    titulo: a.titulo,
    data: a.data,
    concluida: a.concluida,
    responsavelId: a.responsavel_id,
    tipo: a.tipo_atividade?.nome ?? null,
    responsavelNome: a.usuario?.nome ?? null,
    responsavelFoto: a.usuario?.foto_url ?? null,
  }));

  const secao = "text-text-muted mb-2 text-xs font-semibold uppercase tracking-caps";

  return (
    /* ⚠️ ALTURA FIXA SÓ NO COMPUTADOR (D-151, pela porta do celular).
       A ficha é um quadro de três painéis quando há largura para três
       painéis. Empilhada num telefone ela deixa de ser quadro e vira
       página: `h-full` amarraria as três zonas à altura da janela, e o
       cabeçalho — que no celular quebra em três fileiras de etapas —
       comeria mais da metade dela, sobrando uma tira para cada zona. Sem
       `h-full`, o conteúdo cresce e quem rola é o `main`, uma vez só. */
    <div className="flex min-w-0 flex-col lg:h-full">
      <div className="border-border shrink-0 border-b px-4 py-3">
        <Link
          href="/contatos"
          className="text-text-muted hover:text-text mb-2 inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Contatos
        </Link>
        <CabecalhoOrganizacao
          org={{
            id: org.id,
            nome: org.nome,
            cidade: org.cidade ?? "",
            uf: org.uf ?? "",
            endereco: org.endereco ?? "",
            website: org.website ?? "",
            bubbleId: org.bubble_id ?? "",
          }}
        />
      </div>

      {/* Ver a nota da ficha do negócio: no celular nada rola por dentro. */}
      <div className="grid grid-cols-1 gap-px lg:min-h-0 lg:flex-1 lg:grid-cols-[20rem_minmax(0,1fr)] lg:overflow-hidden">
        {/* Coluna esquerda: dados + pessoas */}
        <div className="bg-surface flex flex-col gap-5 p-4 lg:overflow-y-auto lg:border-r lg:border-border">
          <div>
            <h2 className={secao}>Dados</h2>
            <dl className="flex flex-col gap-2 text-md">
              {/* ⚠️ Um pino só para as duas linhas: cidade/UF e
                  logradouro são o mesmo endereço, e dois pinos empilhados
                  fariam parecer dois lugares. O logradouro só aparece
                  quando existe — em 21 dos 2.903 cadastros. */}
              <div className="flex items-start gap-2">
                <MapPin className="text-text-muted mt-0.5 size-4 shrink-0" aria-hidden />
                <span className="min-w-0">
                  <span className="block">{local(org.cidade, org.uf) ?? "—"}</span>
                  {org.endereco && (
                    <span className="text-text-secondary block text-sm">
                      {org.endereco}
                    </span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="text-text-muted size-4 shrink-0" aria-hidden />
                {org.website ? (
                  <a
                    href={comEsquema(org.website)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-info-ink inline-flex items-center gap-1 hover:underline"
                  >
                    <span className="truncate">{org.website}</span>
                    <ExternalLink className="size-3 shrink-0" aria-hidden />
                  </a>
                ) : (
                  <span>—</span>
                )}
              </div>
              {org.bubble_id && (
                <div className="flex items-center gap-2">
                  <Boxes className="text-text-muted size-4 shrink-0" aria-hidden />
                  <span className="text-text-secondary text-sm">
                    Bubble: {org.bubble_id}
                  </span>
                </div>
              )}
            </dl>
          </div>

          <PessoasDaOrganizacao organizacaoId={org.id} pessoas={pessoas} />
        </div>

        {/* Coluna direita: histórico derivado */}
        <div className="flex flex-col gap-6 p-4 lg:overflow-y-auto">
          <section>
            {/* ⚠️ O botão vive AQUI, no cabeçalho da seção de negócios, e
                não no topo da ficha: é onde a pergunta "que negócios esta
                empresa tem?" está sendo respondida, e é de lá que nasce a
                vontade de abrir mais um. A organização já vai travada no
                diálogo — quem clica daqui já disse de quem é o negócio, e
                reabrir a busca numa base com 41% de nomes repetidos seria
                convidar a errar de cadastro. */}
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-text-muted text-xs font-semibold uppercase tracking-caps">
                Negócios {negocios && negocios.length > 0 && `(${negocios.length})`}
              </h2>
              <BotaoNovoNegocio
                etapas={etapas ?? []}
                usuarios={usuarios ?? []}
                origens={origens ?? []}
                produtos={produtos ?? []}
                responsavelPadrao={euId ?? null}
                organizacaoFixa={{ id: org.id, nome: org.nome }}
                rotulo="Novo negócio"
              />
            </div>
            {!negocios || negocios.length === 0 ? (
              <p className="text-text-muted text-sm">Nenhum negócio.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {negocios.map((n) => (
                  <li key={n.id}>
                    <Link
                      href={`/negocios/${n.id}`}
                      className="border-border hover:bg-surface-hover flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="text-md block truncate font-medium">{n.titulo}</span>
                        <span className="mt-0.5 flex items-center gap-2">
                          <EtiquetaEtapa nome={n.etapa?.nome} ordem={n.etapa?.ordem} />
                          <EtiquetaStatus status={n.status} />
                        </span>
                      </span>
                      <span className="tabular shrink-0 text-md font-medium">{real(n.valor)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <AtividadesDaOrganizacao
            organizacaoId={org.id}
            organizacaoNome={org.nome}
            atividades={atividadesDaOrg}
            tipos={tipos ?? []}
            usuarios={usuarios ?? []}
            euId={euId ?? null}
            hoje={hojeBrasilia()}
          />

          <section>
            <h2 className={secao}>Anotações {anotacoes && anotacoes.length > 0 && `(${anotacoes.length})`}</h2>
            {!anotacoes || anotacoes.length === 0 ? (
              <p className="text-text-muted text-sm">Nenhuma anotação.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {anotacoes.map((an) => (
                  <li key={an.id} className="border-border rounded-md border px-3 py-2">
                    <p className="text-md whitespace-pre-wrap">{an.texto}</p>
                    <p className="text-text-muted mt-1 text-xs">
                      {an.usuario?.nome ?? "—"} · {dataHora(an.criado_em)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
