import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Acesso } from "./acesso";
import {
  hojeBrasilia,
  somaDias,
  SELECAO,
  type LinhaAtividade,
} from "@/app/(sistema)/atividades/consulta";
import { termoDeBusca } from "@/lib/formato";
import type { Notificacao } from "@/lib/notificacoes";

/**
 * O servidor MCP do CRM (Doc 16). Fase 2: as ferramentas do resumo
 * diário (D-177), todas só de leitura.
 *
 * Um servidor por requisição, sem sessão: a Vercel não guarda estado
 * entre chamadas, e cada requisição traz o próprio token.
 *
 * ⚠️ D-178: TODA chamada de ferramenta passa por `comRegistro`, que grava
 * em `chamada_agente` antes de devolver a resposta. Se o registro falhar,
 * a resposta NÃO sai — um agente que lê sem rastro é exatamente o que a
 * decisão proíbe. Ferramenta nova que não use `comRegistro` é defeito.
 */

/** Teto de linhas por chamada (R-006): nunca a base inteira. */
const TETO = 100;

type Resultado = { content: { type: "text"; text: string }[]; isError?: boolean };

export function criaServidor(acesso: Acesso, origem: string): McpServer {
  const servidor = new McpServer({ name: "crm-lure", version: "0.2.0" });
  const { supabase, usuarioId } = acesso;
  const link = (caminho: string) => `${origem}${caminho}`;

  /* ----------------------------------------------------------------
   * Resumo de pendências — a mesma derivação do sino (Doc 15)
   * ---------------------------------------------------------------- */
  servidor.registerTool(
    "resumo_de_pendencias",
    {
      title: "Resumo de pendências",
      description:
        "O resumo diário do usuário conectado no CRM Lure: negócios dele parados há tempo demais, " +
        "atividades vencidas e as próximas atividades — exatamente o que o sino do CRM mostra, " +
        "com as preferências de notificação do próprio usuário. Comece por aqui.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () =>
      comRegistro(acesso, "resumo_de_pendencias", {}, async () => {
        const { data, error } = await supabase.rpc("notificacoes");
        if (error) return erro(`Falha ao consultar: ${error.message}`);

        const lista = (data ?? []) as Notificacao[];
        const item = (n: Notificacao) => ({
          titulo: n.titulo,
          detalhe: n.detalhe,
          quando: n.referencia,
          link: link(n.destino),
        });
        const doTipo = (t: Notificacao["tipo"]) => lista.filter((n) => n.tipo === t).map(item);

        const parados = doTipo("negocio_parado");
        const vencidas = doTipo("atividade_vencida");
        const proximas = doTipo("lembrete_atividade");

        return texto({
          hoje: hojeBrasilia(),
          totais: {
            negocios_parados: parados.length,
            atividades_vencidas: vencidas.length,
            proximas_atividades: proximas.length,
          },
          negocios_parados: parados,
          atividades_vencidas: vencidas,
          proximas_atividades: proximas,
        });
      })
  );

  /* ----------------------------------------------------------------
   * Atividades pendentes (fase 1)
   * ---------------------------------------------------------------- */
  servidor.registerTool(
    "minhas_atividades_pendentes",
    {
      title: "Minhas atividades pendentes",
      description:
        "Lista as atividades NÃO concluídas do usuário conectado no CRM Lure: as vencidas e as dos próximos dias. " +
        "Os follow-ups são atividades com título começando por \"Follow-up\". Datas no fuso de São Paulo.",
      inputSchema: {
        dias_a_frente: z
          .number()
          .int()
          .min(0)
          .max(30)
          .default(0)
          .describe("Quantos dias depois de hoje incluir. 0 = só até hoje."),
        incluir_vencidas: z
          .boolean()
          .default(true)
          .describe("Incluir as atividades com data anterior a hoje."),
        limite: z.number().int().min(1).max(TETO).default(50),
      },
      annotations: { readOnlyHint: true },
    },
    async (args) =>
      comRegistro(acesso, "minhas_atividades_pendentes", args, async () => {
        const { dias_a_frente, incluir_vencidas, limite } = args;
        const hoje = hojeBrasilia();
        const ate = somaDias(hoje, dias_a_frente);

        let consulta = supabase
          .from("atividade")
          .select(SELECAO) // a mesma seleção da tela de Atividades
          .eq("responsavel_id", usuarioId)
          .eq("concluida", false)
          .lte("data", ate);
        if (!incluir_vencidas) consulta = consulta.gte("data", hoje);

        const { data, error } = await consulta
          .order("data")
          .order("hora_inicio", { nullsFirst: true })
          .limit(limite)
          .returns<LinhaAtividade[]>();

        if (error) return erro(`Falha ao consultar: ${error.message}`);

        const atividades = (data ?? []).map((a) => ({
          ...resumoAtividade(a, hoje),
          negocio: a.negocio ? { id: a.negocio.id, titulo: a.negocio.titulo, link: link(`/negocios/${a.negocio.id}`) } : null,
          organizacao: a.organizacao ? { id: a.organizacao.id, nome: a.organizacao.nome } : null,
          pessoa: a.pessoa ? { id: a.pessoa.id, nome: a.pessoa.nome } : null,
        }));

        return texto({
          hoje,
          ate,
          total: atividades.length,
          truncado: atividades.length === limite,
          atividades,
        });
      })
  );

  /* ----------------------------------------------------------------
   * Busca por nome
   * ---------------------------------------------------------------- */
  servidor.registerTool(
    "buscar_no_crm",
    {
      title: "Buscar no CRM",
      description:
        "Procura negócios (pelo título), organizações e pessoas (pelo nome) no CRM Lure, sem diferenciar acento " +
        "nem maiúscula. Devolve ids para usar em ver_negocio, ver_organizacao e ver_pessoa.",
      inputSchema: {
        texto: z.string().min(2).max(100).describe("Parte do nome ou do título."),
        onde: z
          .enum(["tudo", "negocios", "organizacoes", "pessoas"])
          .default("tudo"),
        limite: z.number().int().min(1).max(25).default(10).describe("Máximo por tipo."),
      },
      annotations: { readOnlyHint: true },
    },
    async (args) =>
      comRegistro(acesso, "buscar_no_crm", args, async () => {
        const termo = termoDeBusca(args.texto);
        if (termo.length < 2) return erro("Texto de busca curto demais.");
        const padrao = `%${termo}%`;
        const quer = (t: string) => args.onde === "tudo" || args.onde === t;

        // Em paralelo: o custo aqui é ida e volta, não consulta (D-160).
        const [negocios, organizacoes, pessoas] = await Promise.all([
          quer("negocios")
            ? supabase
                .from("negocio")
                .select("id, titulo, status, valor, organizacao(nome), etapa(nome), usuario(nome)")
                .ilike("titulo_busca", padrao)
                .order("criado_em", { ascending: false })
                .limit(args.limite)
            : null,
          quer("organizacoes")
            ? supabase
                .from("organizacao")
                .select("id, nome, cidade, uf")
                .ilike("nome_busca", padrao)
                .order("nome")
                .limit(args.limite)
            : null,
          quer("pessoas")
            ? supabase
                .from("pessoa")
                .select("id, nome, pessoa_organizacao(cargo, organizacao(nome))")
                .ilike("nome_busca", padrao)
                .order("nome")
                .limit(args.limite)
            : null,
        ]);

        const falha = [negocios, organizacoes, pessoas].find((r) => r?.error);
        if (falha?.error) return erro(`Falha ao consultar: ${falha.error.message}`);

        return texto({
          negocios: (negocios?.data ?? []).map((n) => ({
            id: n.id,
            titulo: n.titulo,
            status: n.status,
            valor: n.valor,
            organizacao: n.organizacao?.nome ?? null,
            etapa: n.etapa?.nome ?? null,
            responsavel: n.usuario?.nome ?? null,
            link: link(`/negocios/${n.id}`),
          })),
          organizacoes: (organizacoes?.data ?? []).map((o) => ({
            ...o,
            link: link(`/contatos/organizacoes/${o.id}`),
          })),
          pessoas: (pessoas?.data ?? []).map((p) => ({
            id: p.id,
            nome: p.nome,
            organizacoes: p.pessoa_organizacao.map((v) => ({ nome: v.organizacao?.nome ?? null, cargo: v.cargo })),
            link: link(`/contatos/pessoas/${p.id}`),
          })),
        });
      })
  );

  /* ----------------------------------------------------------------
   * Fichas
   * ---------------------------------------------------------------- */
  const idSchema = { id: z.string().uuid().describe("O id devolvido por buscar_no_crm ou por outra ferramenta.") };

  servidor.registerTool(
    "ver_negocio",
    {
      title: "Ver negócio",
      description:
        "A ficha de um negócio do CRM Lure: etapa, status, valor, responsável, organização, pessoas, " +
        "atividades pendentes, as últimas concluídas e as últimas anotações.",
      inputSchema: idSchema,
      annotations: { readOnlyHint: true },
    },
    async (args) =>
      comRegistro(acesso, "ver_negocio", args, async () => {
        const hoje = hojeBrasilia();
        const [negocio, pessoas, pendentes, concluidas, anotacoes] = await Promise.all([
          supabase
            .from("negocio")
            .select(
              "id, titulo, status, valor, criado_em, atualizado_em, fechado_em, " +
                "organizacao(id, nome), etapa(nome), origem(nome), produto(nome), usuario(nome), motivo_perda(nome)"
            )
            .eq("id", args.id)
            .maybeSingle<FichaNegocio>(),
          supabase.from("negocio_pessoa").select("pessoa(id, nome)").eq("negocio_id", args.id),
          atividadesDe(supabase, "negocio_id", args.id, false),
          atividadesDe(supabase, "negocio_id", args.id, true),
          anotacoesDe(supabase, "negocio_id", args.id),
        ]);

        const falha = [negocio, pessoas, pendentes, concluidas, anotacoes].find((r) => r.error);
        if (falha?.error) return erro(`Falha ao consultar: ${falha.error.message}`);
        const n = negocio.data;
        if (!n) return erro("Negócio não encontrado.");

        return texto({
          id: n.id,
          titulo: n.titulo,
          status: n.status,
          etapa: n.etapa?.nome ?? null,
          valor: n.valor,
          responsavel: n.usuario?.nome ?? null,
          organizacao: n.organizacao ? { id: n.organizacao.id, nome: n.organizacao.nome } : null,
          origem: n.origem?.nome ?? null,
          produto: n.produto?.nome ?? null,
          motivo_perda: n.motivo_perda?.nome ?? null,
          criado_em: n.criado_em,
          atualizado_em: n.atualizado_em,
          fechado_em: n.fechado_em,
          pessoas: (pessoas.data ?? []).map((v) => v.pessoa).filter(Boolean),
          atividades_pendentes: (pendentes.data ?? []).map((a) => resumoAtividade(a, hoje)),
          ultimas_atividades_concluidas: (concluidas.data ?? []).map((a) => resumoAtividade(a, hoje)),
          ultimas_anotacoes: (anotacoes.data ?? []).map(resumoAnotacao),
          link: link(`/negocios/${n.id}`),
        });
      })
  );

  servidor.registerTool(
    "ver_organizacao",
    {
      title: "Ver organização",
      description:
        "A ficha de uma organização (empresa cliente) do CRM Lure: endereço, pessoas com cargo, negócios, " +
        "atividades pendentes e as últimas anotações.",
      inputSchema: idSchema,
      annotations: { readOnlyHint: true },
    },
    async (args) =>
      comRegistro(acesso, "ver_organizacao", args, async () => {
        const hoje = hojeBrasilia();
        const [org, pessoas, negocios, pendentes, anotacoes] = await Promise.all([
          supabase
            .from("organizacao")
            .select("id, nome, cidade, uf, endereco, website, criado_em")
            .eq("id", args.id)
            .maybeSingle(),
          supabase.from("pessoa_organizacao").select("cargo, pessoa(id, nome)").eq("organizacao_id", args.id),
          supabase
            .from("negocio")
            .select("id, titulo, status, valor, etapa(nome), usuario(nome)")
            .eq("organizacao_id", args.id)
            .order("criado_em", { ascending: false })
            .limit(50),
          atividadesDe(supabase, "organizacao_id", args.id, false),
          anotacoesDe(supabase, "organizacao_id", args.id),
        ]);

        const falha = [org, pessoas, negocios, pendentes, anotacoes].find((r) => r.error);
        if (falha?.error) return erro(`Falha ao consultar: ${falha.error.message}`);
        if (!org.data) return erro("Organização não encontrada.");

        return texto({
          ...org.data,
          pessoas: (pessoas.data ?? []).map((v) => ({ ...v.pessoa, cargo: v.cargo })),
          negocios: (negocios.data ?? []).map((n) => ({
            id: n.id,
            titulo: n.titulo,
            status: n.status,
            valor: n.valor,
            etapa: n.etapa?.nome ?? null,
            responsavel: n.usuario?.nome ?? null,
          })),
          atividades_pendentes: (pendentes.data ?? []).map((a) => resumoAtividade(a, hoje)),
          ultimas_anotacoes: (anotacoes.data ?? []).map(resumoAnotacao),
          link: link(`/contatos/organizacoes/${org.data.id}`),
        });
      })
  );

  servidor.registerTool(
    "ver_pessoa",
    {
      title: "Ver pessoa",
      description:
        "A ficha de uma pessoa (contato) do CRM Lure: telefones e e-mails, organizações com cargo, negócios " +
        "em que participa, atividades pendentes e as últimas anotações.",
      inputSchema: idSchema,
      annotations: { readOnlyHint: true },
    },
    async (args) =>
      comRegistro(acesso, "ver_pessoa", args, async () => {
        const hoje = hojeBrasilia();
        const [pessoa, negocios, pendentes, anotacoes] = await Promise.all([
          supabase
            .from("pessoa")
            .select("id, nome, criado_em, forma_contato(tipo, valor), pessoa_organizacao(cargo, organizacao(id, nome))")
            .eq("id", args.id)
            .maybeSingle(),
          supabase
            .from("negocio_pessoa")
            .select("negocio(id, titulo, status, valor, etapa(nome))")
            .eq("pessoa_id", args.id),
          atividadesDe(supabase, "pessoa_id", args.id, false),
          anotacoesDe(supabase, "pessoa_id", args.id),
        ]);

        const falha = [pessoa, negocios, pendentes, anotacoes].find((r) => r.error);
        if (falha?.error) return erro(`Falha ao consultar: ${falha.error.message}`);
        const p = pessoa.data;
        if (!p) return erro("Pessoa não encontrada.");

        return texto({
          id: p.id,
          nome: p.nome,
          criado_em: p.criado_em,
          contatos: p.forma_contato,
          organizacoes: p.pessoa_organizacao.map((v) => ({ ...v.organizacao, cargo: v.cargo })),
          negocios: (negocios.data ?? [])
            .map((v) => v.negocio)
            .filter((n): n is NonNullable<typeof n> => Boolean(n))
            .map((n) => ({ id: n.id, titulo: n.titulo, status: n.status, valor: n.valor, etapa: n.etapa?.nome ?? null })),
          atividades_pendentes: (pendentes.data ?? []).map((a) => resumoAtividade(a, hoje)),
          ultimas_anotacoes: (anotacoes.data ?? []).map(resumoAnotacao),
          link: link(`/contatos/pessoas/${p.id}`),
        });
      })
  );

  return servidor;
}

/* ================================================================
 * Registro (D-178)
 * ================================================================ */

async function comRegistro(
  acesso: Acesso,
  ferramenta: string,
  argumentos: Record<string, unknown>,
  executa: () => Promise<Resultado>
): Promise<Resultado> {
  let resultado: Resultado;
  let falha: string | null = null;
  try {
    resultado = await executa();
    if (resultado.isError) falha = resultado.content[0]?.text ?? "erro";
  } catch (e) {
    falha = e instanceof Error ? e.message : String(e);
    resultado = erro("Falha interna ao executar a ferramenta.");
  }

  const { error } = await acesso.supabase.rpc("registra_chamada_agente", {
    p_ferramenta: ferramenta,
    p_argumentos: argumentos as never,
    p_sucesso: !falha,
    p_erro: falha ?? undefined,
  });

  // Sem registro, sem resposta (D-178).
  if (error) return erro("A chamada não pôde ser registrada no CRM e por isso não foi atendida. Tente de novo.");
  return resultado;
}

/* ================================================================
 * Consultas e formatos comuns às fichas
 * ================================================================ */

type Cliente = Acesso["supabase"];
type Vinculo = "negocio_id" | "organizacao_id" | "pessoa_id";

type FichaNegocio = {
  id: string;
  titulo: string;
  status: string;
  valor: number | null;
  criado_em: string;
  atualizado_em: string | null;
  fechado_em: string | null;
  organizacao: { id: string; nome: string } | null;
  etapa: { nome: string } | null;
  origem: { nome: string } | null;
  produto: { nome: string } | null;
  usuario: { nome: string } | null;
  motivo_perda: { nome: string } | null;
};

function atividadesDe(supabase: Cliente, vinculo: Vinculo, id: string, concluidas: boolean) {
  return supabase
    .from("atividade")
    .select(SELECAO)
    .eq(vinculo, id)
    .eq("concluida", concluidas)
    .order("data", { ascending: !concluidas })
    .limit(concluidas ? 10 : 30)
    .returns<LinhaAtividade[]>();
}

function anotacoesDe(supabase: Cliente, vinculo: Vinculo, id: string) {
  return supabase
    .from("anotacao")
    .select("texto, criado_em, usuario(nome)")
    .eq(vinculo, id)
    .order("criado_em", { ascending: false })
    .limit(10);
}

function resumoAtividade(a: LinhaAtividade, hoje: string) {
  return {
    id: a.id,
    titulo: a.titulo,
    tipo: a.tipo_atividade?.nome ?? null,
    data: a.data,
    hora: a.hora_inicio,
    concluida: a.concluida,
    situacao: a.concluida ? "concluida" : a.data < hoje ? "vencida" : a.data === hoje ? "hoje" : "futura",
    responsavel: a.usuario?.nome ?? null,
    descricao: a.descricao ? textoPuro(a.descricao) : null,
  };
}

function resumoAnotacao(n: { texto: string; criado_em: string; usuario: { nome: string } | null }) {
  return { autor: n.usuario?.nome ?? null, criado_em: n.criado_em, texto: textoPuro(n.texto) };
}

/** Anotação e descrição vêm do editor em HTML; o agente lê texto. */
function textoPuro(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function texto(dados: unknown): Resultado {
  return { content: [{ type: "text", text: JSON.stringify(dados, null, 2) }] };
}

function erro(mensagem: string): Resultado {
  return { isError: true, content: [{ type: "text", text: mensagem }] };
}
