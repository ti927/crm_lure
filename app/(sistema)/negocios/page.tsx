import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { real, data, texto } from "@/lib/formato";
import {
  EtiquetaStatus,
  EtiquetaEtapa,
  faixaDaEtapa,
} from "@/components/dominio/etiquetas";
import { UsuarioComFoto } from "@/components/dominio/avatar-usuario";
import { Filtros } from "./filtros";
import { BotaoNovoNegocio } from "./botao-novo-negocio";
import { CartoesNegocio } from "./cartoes-negocio";
import { PainelFiltrosMobile } from "./painel-filtros-mobile";
import { LinkOrdenacao } from "./link-ordenacao";
import { TabelaNegocios } from "./tabela-negocios";
import {
  IndicadorFiltro,
  FiltroTexto,
  FiltroNumero,
  FiltroData,
  FiltroSelecao,
  FiltroResponsavel,
} from "./filtro-coluna";
import {
  COLUNAS,
  POR_PAGINA,
  ESCONDE_CLASSE,
  LIMITE_ORGANIZACOES,
  type Coluna,
} from "./colunas";
import {
  SELECAO,
  STATUS_OPCOES,
  parseFiltros,
  temFiltro,
  buscaCrua,
  limparIlike,
  limiteDataInicio,
  limiteDataFim,
  type LinhaNegocio,
  type Busca,
  type Status,
} from "./consulta";

export default async function PaginaNegocios({
  searchParams,
}: {
  searchParams: Promise<Busca>;
}) {
  const p = await searchParams;
  const supabase = await createClient();

  // B-045: visita "crua" (sem nenhum parametro reconhecido) tenta
  // restaurar a ultima combinacao salva do usuario — e assim que ela
  // volta igual depois de um login novo. "Limpar filtros" tambem cai
  // aqui, mas ele grava preferencia vazia antes de navegar (ver
  // usar-filtros-lista.ts), entao nao ha redirecionamento em loop.
  //
  // ⚠️ A coluna tem TRES estados, e o do meio e o que entrou nesta
  // sessao:
  //
  //   preenchida — a ultima combinacao escolhida. Volta igual.
  //   NULA       — nunca escolheu nada. A Lista abre em "so os meus",
  //                igual ao Kanban e a Atividades. Nao grava nada: a
  //                coluna segue nula e o padrao segue valendo.
  //   VAZIA      — escolheu ver TUDO. O padrao NAO volta por cima.
  //
  // O terceiro estado ja existia so por causa do laco do "Limpar";
  // agora ele tambem e o que distingue "quero ver tudo" de "ainda nao
  // disse nada", que e a diferenca inteira entre respeitar a escolha e
  // atropela-la.
  if (buscaCrua(p)) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: eu } = await supabase
        .from("usuario")
        .select("id, preferencia_lista_negocios")
        .eq("auth_id", user.id)
        .maybeSingle();
      if (eu?.preferencia_lista_negocios) {
        redirect(`/negocios?${eu.preferencia_lista_negocios}`);
      }
      if (eu && eu.preferencia_lista_negocios === null) {
        redirect(`/negocios?responsavel=${eu.id}`);
      }
    }
  }

  const filtros = parseFiltros(p);

  // Coluna de ordenacao vem da URL: so vale se estiver na lista fixa.
  // Sem esta checagem, `?ordenar=` arbitrario vira expressao no PostgREST.
  const coluna =
    COLUNAS.find((c) => c.chave === filtros.ordenarPor) ??
    COLUNAS.find((c) => c.chave === "criado_em")!;

  let consulta = supabase
    .from("negocio")
    .select(SELECAO, { count: "exact" })
    .order(coluna.ordenacao, { ascending: filtros.crescente, nullsFirst: false });

  if (filtros.titulo) {
    consulta = consulta.ilike("titulo", `%${limparIlike(filtros.titulo)}%`);
  }

  /*
   * Organizacao e coluna vinculada: o PostgREST nao aceita filtro sobre
   * coluna de tabela vinculada como `ilike` direto no negocio. Os ids das
   * organizacoes que casam saem antes, numa consulta a parte, e entram
   * como `organizacao_id.in.(...)` — coluna propria de negocio. Sem
   * nenhum id, forca resultado vazio com um id que nunca existe, em vez
   * de deixar o filtro passar batido.
   */
  if (filtros.organizacao) {
    const termo = limparIlike(filtros.organizacao);
    const { data: orgs } = await supabase
      .from("organizacao")
      .select("id")
      .ilike("nome", `%${termo}%`)
      .limit(LIMITE_ORGANIZACOES);
    const ids = (orgs ?? []).map((o) => o.id);
    consulta =
      ids.length > 0
        ? consulta.in("organizacao_id", ids)
        : consulta.eq("organizacao_id", "00000000-0000-0000-0000-000000000000");
  }

  if (filtros.valorMin) consulta = consulta.gte("valor", Number(filtros.valorMin));
  if (filtros.valorMax) consulta = consulta.lte("valor", Number(filtros.valorMax));
  if (filtros.etapa) consulta = consulta.eq("etapa_id", filtros.etapa);
  if (filtros.status) consulta = consulta.eq("status", filtros.status as Status);
  if (filtros.origem) consulta = consulta.eq("origem_id", filtros.origem);
  if (filtros.produto) consulta = consulta.eq("produto_id", filtros.produto);
  if (filtros.responsavel) consulta = consulta.eq("responsavel_id", filtros.responsavel);
  if (filtros.motivoPerda) consulta = consulta.eq("motivo_perda_id", filtros.motivoPerda);
  if (filtros.criadoDe) {
    consulta = consulta.gte("criado_em", limiteDataInicio(filtros.criadoDe));
  }
  if (filtros.criadoAte) {
    consulta = consulta.lte("criado_em", limiteDataFim(filtros.criadoAte));
  }

  const inicio = (filtros.pagina - 1) * POR_PAGINA;
  const { data: linhas, count, error } = await consulta
    .range(inicio, inicio + POR_PAGINA - 1)
    .returns<LinhaNegocio[]>();

  // Quem está logado, para o "Novo negócio" já nascer no nome de quem
  // cadastra — é o padrão do Pipedrive e evita um clique repetido.
  // Resolve por `auth_id`, nunca por `id`: a D-109 separou os dois, e
  // confundi-los foi o que quebrou o log (C-05).
  const {
    data: { user: logado },
  } = await supabase.auth.getUser();

  const [
    { data: etapas },
    { data: usuarios },
    { data: origens },
    { data: produtos },
    { data: motivos },
    { data: eu },
  ] = await Promise.all([
    supabase.from("etapa").select("id, nome, ordem").order("ordem"),
    // Só quem está ativo entra no filtro: ex-integrante continua existindo
    // como responsável de negócio antigo (D-084), mas não faz sentido
    // oferecê-lo como opção de recorte novo.
    supabase.from("usuario").select("id, nome, foto_url").eq("ativo", true).order("nome"),
    supabase.from("origem").select("id, nome").eq("ativo", true).order("ordem"),
    supabase.from("produto").select("id, nome").order("nome"),
    supabase.from("motivo_perda").select("id, nome").eq("ativo", true).order("ordem"),
    supabase
      .from("usuario")
      .select("id")
      .eq("auth_id", logado?.id ?? "")
      .maybeSingle(),
  ]);

  const euId = eu?.id ?? null;
  const total = count ?? 0;
  const ultimaPagina = Math.max(1, Math.ceil(total / POR_PAGINA));
  const algumFiltro = temFiltro(filtros);

  /** Preserva os demais parametros ao trocar um deles (paginacao). */
  function comParametros(troca: Record<string, string | null>) {
    const q = new URLSearchParams();
    if (filtros.titulo) q.set("titulo", filtros.titulo);
    if (filtros.organizacao) q.set("organizacao", filtros.organizacao);
    if (filtros.valorMin) q.set("valorMin", filtros.valorMin);
    if (filtros.valorMax) q.set("valorMax", filtros.valorMax);
    if (filtros.etapa) q.set("etapa", filtros.etapa);
    if (filtros.status) q.set("status", filtros.status);
    if (filtros.origem) q.set("origem", filtros.origem);
    if (filtros.produto) q.set("produto", filtros.produto);
    if (filtros.responsavel) q.set("responsavel", filtros.responsavel);
    if (filtros.motivoPerda) q.set("motivoPerda", filtros.motivoPerda);
    if (filtros.criadoDe) q.set("criadoDe", filtros.criadoDe);
    if (filtros.criadoAte) q.set("criadoAte", filtros.criadoAte);
    if (filtros.ordenarPor !== "criado_em") q.set("ordenar", filtros.ordenarPor);
    if (filtros.crescente) q.set("dir", "asc");
    if (filtros.pagina > 1) q.set("pagina", String(filtros.pagina));
    for (const [k, v] of Object.entries(troca)) {
      if (v === null) q.delete(k);
      else q.set(k, v);
    }
    const s = q.toString();
    return s ? `/negocios?${s}` : "/negocios";
  }

  /** Se o filtro daquela coluna esta ativo — alimenta o funil do B-044. */
  function filtroAtivo(chave: string): boolean {
    switch (chave) {
      case "titulo":
        return Boolean(filtros.titulo);
      case "organizacao":
        return Boolean(filtros.organizacao);
      case "valor":
        return Boolean(filtros.valorMin || filtros.valorMax);
      case "etapa":
        return Boolean(filtros.etapa);
      case "status":
        return Boolean(filtros.status);
      case "origem":
        return Boolean(filtros.origem);
      case "produto":
        return Boolean(filtros.produto);
      case "responsavel":
        return Boolean(filtros.responsavel);
      case "motivo_perda":
        return Boolean(filtros.motivoPerda);
      case "criado_em":
        return Boolean(filtros.criadoDe || filtros.criadoAte);
      default:
        return false;
    }
  }

  /** O controle de filtro que cada coluna hospeda no cabecalho (B-042). */
  function celulaFiltro(c: Coluna) {
    switch (c.chave) {
      case "titulo":
        return <FiltroTexto nomeParam="titulo" valor={filtros.titulo} rotulo="Título" />;
      case "organizacao":
        return (
          <FiltroTexto nomeParam="organizacao" valor={filtros.organizacao} rotulo="Organização" />
        );
      case "valor":
        return <FiltroNumero min={filtros.valorMin} max={filtros.valorMax} />;
      case "etapa":
        return (
          <FiltroSelecao
            nomeParam="etapa"
            valor={filtros.etapa}
            rotuloTodos="Todas as etapas"
            opcoes={(etapas ?? []).map((e) => ({ valor: e.id, rotulo: e.nome }))}
          />
        );
      case "status":
        return (
          <FiltroSelecao
            nomeParam="status"
            valor={filtros.status}
            rotuloTodos="Todos os status"
            opcoes={STATUS_OPCOES}
          />
        );
      case "origem":
        return (
          <FiltroSelecao
            nomeParam="origem"
            valor={filtros.origem}
            rotuloTodos="Todas as origens"
            opcoes={(origens ?? []).map((o) => ({ valor: o.id, rotulo: o.nome }))}
          />
        );
      case "produto":
        return (
          <FiltroSelecao
            nomeParam="produto"
            valor={filtros.produto}
            rotuloTodos="Todos os produtos"
            opcoes={(produtos ?? []).map((o) => ({ valor: o.id, rotulo: o.nome }))}
          />
        );
      case "responsavel":
        return <FiltroResponsavel valor={filtros.responsavel} usuarios={usuarios ?? []} />;
      case "motivo_perda":
        return (
          <FiltroSelecao
            nomeParam="motivoPerda"
            valor={filtros.motivoPerda}
            rotuloTodos="Todos os motivos"
            opcoes={(motivos ?? []).map((o) => ({ valor: o.id, rotulo: o.nome }))}
          />
        );
      case "criado_em":
        return <FiltroData de={filtros.criadoDe} ate={filtros.criadoAte} />;
      default:
        return null;
    }
  }

  // ⚠️ `border-b` na CELULA, e nao no `<tr>`: no modelo de bordas
  // separado (ver `tabela-dados.tsx`) borda de linha nao e desenhada.
  const celula = "border-border border-b px-2 align-middle";

  // ⚠️ `sticky top-0` agora gruda no `main`, e não num container de
  // rolagem interno — a tabela deixou de ter um. É o que faz o cabeçalho
  // (e a linha de filtros junto dele) ficar parado ao rolar a lista, que
  // era o defeito relatado. Ver a nota em `tabela-dados.tsx`.
  //
  const cabecalho = (
    <thead className="bg-surface-sunken sticky top-0 z-20">
      <tr>
        {COLUNAS.map((c) => {
          const ativa = c.chave === filtros.ordenarPor;
          const proximaDir = ativa && filtros.crescente ? null : "asc";
          const Icone = !ativa ? ChevronsUpDown : filtros.crescente ? ArrowUp : ArrowDown;
          return (
            <th
              key={c.chave}
              scope="col"
              aria-sort={ativa ? (filtros.crescente ? "ascending" : "descending") : "none"}
              // ⚠️ `bg-surface-sunken` AQUI, na celula, e nao so no
              // `<thead>`. Com `border-collapse: collapse` o navegador
              // nao pinta o fundo do thead — pinta o das celulas —, e
              // sem isto as linhas passavam VISIVEIS por tras da faixa
              // de titulos enquanto se rolava. A linha de filtros nao
              // tinha o defeito porque as celulas dela ja tinham fundo,
              // e foi essa diferenca que denunciou a causa.
              className={`border-border bg-surface-sunken h-9 border-b text-left font-semibold ${c.largura} ${
                c.esconde ? ESCONDE_CLASSE[c.esconde] : ""
              }`}
            >
              <LinkOrdenacao
                href={comParametros({ ordenar: c.chave, dir: proximaDir, pagina: null })}
                // ⚠️ `title`: em 85px "MOTIVO DE PERDA" nao cabe de jeito
                // nenhum, e cortar em silencio perde o nome da coluna. O
                // padding caiu de 12 para 8px de cada lado, que e o que
                // devolve espaco real ao rotulo.
                titulo={c.rotulo}
                className={`hover:text-text flex h-9 items-center gap-1 px-2 text-xs uppercase tracking-caps ${
                  c.numerica ? "justify-end" : ""
                } ${ativa ? "text-text" : "text-text-muted"}`}
              >
                <span className="truncate">{c.rotulo}</span>
                <Icone className="size-3 shrink-0" aria-hidden />
                <IndicadorFiltro ativo={filtroAtivo(c.chave)} />
              </LinkOrdenacao>
            </th>
          );
        })}
      </tr>
      <tr>
        {COLUNAS.map((c) => (
          <th
            key={c.chave}
            className={`border-border bg-surface-sunken border-b p-1 font-normal ${
              c.esconde ? ESCONDE_CLASSE[c.esconde] : ""
            }`}
          >
            {c.filtro && celulaFiltro(c)}
          </th>
        ))}
      </tr>
    </thead>
  );

  const corpo = (linhas ?? []).map((n, i) => (
    <tr
      key={n.id}
      // Entrada escalonada por linha, com teto: cinquenta linhas em
      // cascata viraria espera, não elegância.
      style={{ animationDelay: `${Math.min(i, 14) * 18}ms` }}
      className="hover:bg-surface-hover animate-in fade-in fill-mode-backwards duration-300 motion-safe:transition-colors"
    >
      {/* A faixa de cor da etapa acompanha o nome escrito na
          coluna Etapa — nunca substitui (B-076). */}
      <td
        className={`border-border h-row-cozy faixa-etapa truncate border-b p-0 font-medium ${faixaDaEtapa(
          n.etapa?.ordem
        )}`}
      >
        <Link
          href={`/negocios/${n.id}`}
          className="hover:text-brand-ink block truncate px-3 py-2 underline-offset-4 hover:underline motion-safe:transition-colors"
        >
          {n.titulo}
        </Link>
      </td>
      <td className={`${celula} truncate`}>{texto(n.organizacao?.nome)}</td>
      <td className={`${celula} tabular whitespace-nowrap text-right`}>{real(n.valor)}</td>
      {/* ⚠️ Sem `whitespace-nowrap`: com `table-fixed` a coluna tem
          largura definida, e um nome de etapa que não coubesse vazaria por
          cima da vizinha em vez de quebrar. */}
      <td className={`${celula} truncate`}>
        <EtiquetaEtapa nome={n.etapa?.nome} ordem={n.etapa?.ordem} />
      </td>
      <td className={`${celula} truncate`}>
        <EtiquetaStatus status={n.status} />
      </td>
      <td className={`${celula} ${ESCONDE_CLASSE.lg} truncate`}>{texto(n.origem?.nome)}</td>
      <td className={`${celula} ${ESCONDE_CLASSE.lg} truncate`}>{texto(n.produto?.nome)}</td>
      <td className={`${celula} ${ESCONDE_CLASSE.md} truncate`}>
        {n.usuario ? (
          <UsuarioComFoto nome={n.usuario.nome} foto={n.usuario.foto_url} tamanho="sm" />
        ) : (
          texto(null)
        )}
      </td>
      {/* ⚠️ `lg`, e NÃO `xl`. A coluna foi movida para `lg` em `colunas.ts`
          e a célula ficou para trás: entre 1024 e 1280px o cabeçalho abria
          "Motivo de perda" e o corpo não, e dali para a direita cabeçalho e
          conteúdo nomeavam colunas diferentes. */}
      <td className={`${celula} ${ESCONDE_CLASSE.lg} truncate`}>{texto(n.motivo_perda?.nome)}</td>
      <td className={`${celula} ${ESCONDE_CLASSE.md} tabular whitespace-nowrap`}>
        {data(n.criado_em)}
      </td>
    </tr>
  ));

  return (
    // ⚠️ Sem `h-full`: esta tela deixou de ser um painel fixo com rolagem
    // por dentro e passou a fluir dentro do `main`, que é quem rola. É o
    // que faz o cabeçalho grudado funcionar (ele gruda no `main`) e o
    // rodapé aparecer depois da última linha, em vez de morar no pé.
    <div className="flex min-w-0 flex-col">
      <div className="border-border flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Negócios</h1>
          <p className="text-text-muted text-sm">
            {total === 0
              ? "Nenhum negócio"
              : `${total.toLocaleString("pt-BR")} ${total === 1 ? "negócio" : "negócios"}`}
            {total > POR_PAGINA && ` · página ${filtros.pagina} de ${ultimaPagina}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PainelFiltrosMobile
            etapas={etapas ?? []}
            origens={origens ?? []}
            produtos={produtos ?? []}
            motivos={motivos ?? []}
            usuarios={usuarios ?? []}
          />
          <Filtros />
          <BotaoNovoNegocio
            etapas={etapas ?? []}
            usuarios={usuarios ?? []}
            origens={origens ?? []}
            produtos={produtos ?? []}
            responsavelPadrao={euId}
          />
        </div>
      </div>

      {error ? (
        <div className="m-4 rounded-md bg-danger-bg px-4 py-3">
          <p className="text-danger-ink text-md font-medium">
            Não foi possível carregar os negócios.
          </p>
          <p className="text-danger-ink mt-1 font-mono text-xs">
            {error.code} — {error.message}
          </p>
        </div>
      ) : (
        <>
          {total === 0 ? (
            <div className="px-4 py-16 text-center">
              <p className="text-text-secondary text-md font-medium">
                {algumFiltro
                  ? "Nenhum negócio corresponde aos filtros."
                  : "A base ainda não tem negócios."}
              </p>
              <p className="text-text-muted mt-1 text-sm">
                {algumFiltro
                  ? "Ajuste ou limpe os filtros acima."
                  : "Nenhum negócio cadastrado."}
              </p>
            </div>
          ) : (
            <>
              {/* B-110: no celular a Lista vira cartões — a tabela de dez
                  colunas exigiria rolagem horizontal, que o critério proíbe. */}
              <div className="md:hidden">
                <CartoesNegocio negocios={linhas ?? []} />
              </div>
              <div className="hidden md:block">
                <TabelaNegocios cabecalho={cabecalho} linhas={corpo} />
              </div>
            </>
          )}

          {ultimaPagina > 1 && (
            <div className="border-border bg-surface flex items-center justify-between gap-3 border-t px-4 py-2">
              <span className="text-text-muted text-sm">
                {inicio + 1}–{Math.min(inicio + POR_PAGINA, total)} de{" "}
                {total.toLocaleString("pt-BR")}
              </span>
              <div className="flex gap-1">
                <Paginacao
                  href={comParametros({ pagina: String(filtros.pagina - 1) })}
                  desabilitado={filtros.pagina <= 1}
                >
                  Anterior
                </Paginacao>
                <Paginacao
                  href={comParametros({ pagina: String(filtros.pagina + 1) })}
                  desabilitado={filtros.pagina >= ultimaPagina}
                >
                  Próxima
                </Paginacao>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Paginacao({
  href,
  desabilitado,
  children,
}: {
  href: string;
  desabilitado: boolean;
  children: React.ReactNode;
}) {
  const base =
    "h-control-md border-border inline-flex items-center rounded-md border px-3 text-sm font-medium";
  if (desabilitado) {
    return (
      <span aria-disabled className={`${base} text-text-muted opacity-50`}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className={`${base} hover:bg-surface-hover`}>
      {children}
    </Link>
  );
}
