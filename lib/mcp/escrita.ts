import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Acesso } from "./acesso";
import { comEscrita, erro, texto } from "./registro";
import { criaAnotacao } from "@/lib/regras/anotacao";
import { criaAtividade, mudaAtividade } from "@/lib/regras/atividade";
import {
  adicionaFormaContato,
  criaOrganizacao,
  criaPessoa,
  vinculaPessoaOrganizacao,
} from "@/lib/regras/contatos";
import { criaNegocio, mudaNegocio, type MudancaNegocio } from "@/lib/regras/negocio";
import type { Database } from "@/lib/supabase/types";

/**
 * Ferramentas de ESCRITA do MCP (Doc 16 §5, fases 3 e 4).
 *
 * ⚠️ Toda escrita passa pelas regras de `lib/regras` — as MESMAS que as
 * telas chamam (D-172). Nada de insert direto daqui.
 * ⚠️ Toda escrita aceita `ensaio`: confere tudo e diz o que faria, sem
 * gravar (não há base de teste).
 * ⚠️ Toda resposta de escrita traz id e link: o agente pode narrar
 * sucesso sem ter feito; o link é a prova.
 * ⚠️ A marca "via Agente IA" (D-174) NÃO é posta aqui: o banco a põe por
 * gatilho, a partir do token (migration 20261115140000).
 * ⛔ Excluir, fundir e mexer em listas ficam FORA do MCP (Doc 16 §5).
 */

type Status = Database["public"]["Enums"]["status_negocio"];

const uuid = (o: string) => z.string().uuid().describe(o);
const ensaio = z
  .boolean()
  .default(false)
  .describe("true = só confere e diz o que faria, sem gravar nada. Use quando estiver em dúvida.");
const data = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .describe("Data no formato AAAA-MM-DD (fuso de São Paulo).");
const hora = z
  .string()
  .regex(/^\d{2}:\d{2}$/)
  .describe("Hora no formato HH:MM.");

export function registraEscritas(servidor: McpServer, acesso: Acesso, link: (caminho: string) => string) {
  const { supabase, usuarioId } = acesso;
  const linkNegocio = (id: string) => link(`/negocios/${id}`);

  /* ================================================================
   * Fase 3 — escrita reversível (sempre liberada)
   * ================================================================ */

  servidor.registerTool(
    "criar_anotacao",
    {
      title: "Criar anotação",
      description:
        "Escreve uma anotação no CRM Lure, no nome do usuário, presa a UM negócio, organização ou pessoa. " +
        "Texto puro; quebras de linha são mantidas. Fica marcada como feita via agente de IA.",
      inputSchema: {
        texto: z.string().min(1).max(10000),
        negocio_id: uuid("Negócio da anotação.").optional(),
        organizacao_id: uuid("Organização da anotação.").optional(),
        pessoa_id: uuid("Pessoa da anotação.").optional(),
        ensaio,
      },
    },
    async (args) =>
      comEscrita(acesso, "criar_anotacao", args, {}, async () => {
        const alvos = [args.negocio_id, args.organizacao_id, args.pessoa_id].filter(Boolean);
        if (alvos.length !== 1) return erro("Informe exatamente um entre negocio_id, organizacao_id e pessoa_id.");

        const r = await criaAnotacao(
          supabase,
          {
            texto: args.texto,
            autorId: usuarioId,
            negocioId: args.negocio_id,
            organizacaoId: args.organizacao_id,
            pessoaId: args.pessoa_id,
          },
          { ensaio: args.ensaio }
        );
        if ("erro" in r) return erro(r.erro);

        const onde = args.negocio_id
          ? linkNegocio(args.negocio_id)
          : args.organizacao_id
            ? link(`/contatos/organizacoes/${args.organizacao_id}`)
            : link(`/contatos/pessoas/${args.pessoa_id}`);
        if (r.ensaio) return texto({ ensaio: true, faria: "criar a anotação", em: onde });

        if (args.negocio_id) revalidatePath(`/negocios/${args.negocio_id}`);
        return { ...texto({ feito: "anotação criada", id: r.id, link: onde }), alvo: onde };
      })
  );

  const camposAtividade = {
    titulo: z.string().min(1).max(300),
    data,
    hora_inicio: hora.nullable().optional(),
    hora_fim: hora.nullable().optional(),
    tipo_id: uuid("Tipo da atividade (listas_do_crm → tipos_atividade).").nullable().optional(),
    responsavel_id: uuid("Usuário responsável (listas_do_crm → usuarios). Padrão: o próprio usuário.")
      .nullable()
      .optional(),
    descricao: z.string().max(10000).nullable().optional(),
  };

  servidor.registerTool(
    "criar_atividade",
    {
      title: "Criar atividade",
      description:
        "Agenda uma atividade (tarefa, ligação, reunião…) no CRM Lure. Pode ficar presa a UM negócio, " +
        "organização ou pessoa, ou a nenhum. Sem responsável, fica para o próprio usuário.",
      inputSchema: {
        ...camposAtividade,
        negocio_id: uuid("Negócio da atividade.").optional(),
        organizacao_id: uuid("Organização da atividade.").optional(),
        pessoa_id: uuid("Pessoa da atividade.").optional(),
        ensaio,
      },
    },
    async (args) =>
      comEscrita(acesso, "criar_atividade", args, {}, async () => {
        const vinculos = [args.negocio_id, args.organizacao_id, args.pessoa_id].filter(Boolean);
        if (vinculos.length > 1) return erro("Informe no máximo um entre negocio_id, organizacao_id e pessoa_id.");

        const r = await criaAtividade(
          supabase,
          {
            titulo: args.titulo.trim(),
            data: args.data,
            hora_inicio: args.hora_inicio ?? null,
            hora_fim: args.hora_fim ?? null,
            tipo_id: args.tipo_id ?? null,
            responsavel_id: args.responsavel_id ?? usuarioId,
            descricao: args.descricao?.trim() || null,
            concluida: false,
            negocio_id: args.negocio_id ?? null,
            organizacao_id: args.organizacao_id ?? null,
            pessoa_id: args.pessoa_id ?? null,
          },
          { ensaio: args.ensaio }
        );
        if ("erro" in r) return erro(r.erro);
        if (r.ensaio) return texto({ ensaio: true, faria: "criar a atividade", titulo: args.titulo, data: args.data });

        revalidatePath("/atividades");
        if (args.negocio_id) revalidatePath(`/negocios/${args.negocio_id}`);
        const onde = args.negocio_id ? linkNegocio(args.negocio_id) : link(`/atividades?dia=${args.data}`);
        return { ...texto({ feito: "atividade criada", id: r.id, link: onde }), alvo: onde };
      })
  );

  servidor.registerTool(
    "editar_atividade",
    {
      title: "Editar atividade",
      description:
        "Muda campos de uma atividade existente do CRM Lure (título, data, hora, tipo, responsável, descrição). " +
        "Mande só o que muda; null apaga hora, tipo ou descrição.",
      inputSchema: {
        id: uuid("A atividade."),
        titulo: camposAtividade.titulo.optional(),
        data: data.optional(),
        hora_inicio: camposAtividade.hora_inicio,
        hora_fim: camposAtividade.hora_fim,
        tipo_id: camposAtividade.tipo_id,
        responsavel_id: camposAtividade.responsavel_id,
        descricao: camposAtividade.descricao,
        ensaio,
      },
    },
    async (args) =>
      comEscrita(acesso, "editar_atividade", args, {}, async () => {
        const { id, ensaio: e, ...campos } = args;
        const mudanca = Object.fromEntries(
          Object.entries(campos).filter(([, v]) => v !== undefined)
        ) as Parameters<typeof mudaAtividade>[2];
        if (typeof mudanca.titulo === "string") mudanca.titulo = mudanca.titulo.trim();
        if (Object.keys(mudanca).length === 0) return erro("Nada para mudar.");

        const r = await mudaAtividade(supabase, id, mudanca, { ensaio: e });
        if ("erro" in r) return erro(r.erro);
        if (r.ensaio) return texto({ ensaio: true, faria: "editar a atividade", mudanca });

        revalidatePath("/atividades");
        if (r.negocioId) revalidatePath(`/negocios/${r.negocioId}`);
        const onde = r.negocioId ? linkNegocio(r.negocioId) : link(`/atividades?dia=${r.data}`);
        return { ...texto({ feito: "atividade editada", id, link: onde }), alvo: onde };
      })
  );

  servidor.registerTool(
    "concluir_atividade",
    {
      title: "Concluir atividade",
      description: "Marca uma atividade do CRM Lure como concluída (ou desfaz, com concluida=false).",
      inputSchema: {
        id: uuid("A atividade."),
        concluida: z.boolean().default(true),
        ensaio,
      },
    },
    async (args) =>
      comEscrita(acesso, "concluir_atividade", args, {}, async () => {
        const r = await mudaAtividade(supabase, args.id, { concluida: args.concluida }, { ensaio: args.ensaio });
        if ("erro" in r) return erro(r.erro);
        if (r.ensaio) return texto({ ensaio: true, faria: args.concluida ? "concluir a atividade" : "reabrir a atividade" });

        revalidatePath("/atividades");
        if (r.negocioId) revalidatePath(`/negocios/${r.negocioId}`);
        const onde = r.negocioId ? linkNegocio(r.negocioId) : link(`/atividades?dia=${r.data}`);
        return {
          ...texto({ feito: args.concluida ? "atividade concluída" : "atividade reaberta", id: args.id, link: onde }),
          alvo: onde,
        };
      })
  );

  servidor.registerTool(
    "criar_organizacao",
    {
      title: "Criar organização",
      description:
        "Cadastra uma organização (empresa cliente) no CRM Lure. ⚠️ Se já existir cadastro com o MESMO nome, " +
        "NÃO cria: devolve os existentes. Mostre-os ao usuário — quase sempre o certo é usar um deles. " +
        "Só repita com confirmar_mesmo_nome=true se o usuário confirmar que é outra empresa.",
      inputSchema: {
        nome: z.string().min(1).max(300),
        cidade: z.string().max(100).optional(),
        uf: z.string().max(2).optional().describe("Sigla da UF, ex.: GO."),
        endereco: z.string().max(300).optional().describe("Logradouro, número e bairro. Não repita cidade/UF."),
        website: z.string().max(300).optional(),
        confirmar_mesmo_nome: z.boolean().default(false),
        ensaio,
      },
    },
    async (args) =>
      comEscrita(acesso, "criar_organizacao", args, {}, async () => {
        const r = await criaOrganizacao(
          supabase,
          {
            nome: args.nome,
            cidade: args.cidade ?? "",
            uf: args.uf ?? "",
            endereco: args.endereco ?? "",
            website: args.website ?? "",
            bubbleId: "",
          },
          { confirmado: args.confirmar_mesmo_nome, ensaio: args.ensaio }
        );
        if ("erro" in r) return erro(r.erro);
        if ("duplicadas" in r) {
          return texto({
            criado: false,
            motivo: "Já existe organização com este nome. Mostre ao usuário antes de qualquer coisa.",
            existentes: r.duplicadas.map((o) => ({ ...o, link: link(`/contatos/organizacoes/${o.id}`) })),
          });
        }
        if (r.ensaio) return texto({ ensaio: true, faria: "criar a organização", nome: args.nome.trim() });

        revalidatePath("/contatos");
        const onde = link(`/contatos/organizacoes/${r.id}`);
        return { ...texto({ feito: "organização criada", id: r.id, link: onde }), alvo: onde };
      })
  );

  servidor.registerTool(
    "criar_pessoa",
    {
      title: "Criar pessoa",
      description:
        "Cadastra uma pessoa (contato) no CRM Lure, opcionalmente já vinculada a uma organização com cargo, " +
        "e com telefones e e-mails. Procure antes com buscar_no_crm para não duplicar.",
      inputSchema: {
        nome: z.string().min(1).max(300),
        organizacao_id: uuid("Organização onde a pessoa trabalha.").optional(),
        cargo: z.string().max(200).optional().describe("Cargo na organização (exige organizacao_id)."),
        telefones: z.array(z.string().min(3).max(50)).max(5).optional(),
        emails: z.array(z.string().email().max(200)).max(5).optional(),
        ensaio,
      },
    },
    async (args) =>
      comEscrita(acesso, "criar_pessoa", args, {}, async () => {
        if (args.cargo && !args.organizacao_id) return erro("Cargo exige organizacao_id: o cargo pertence ao vínculo.");

        if (args.ensaio) {
          if (args.organizacao_id) {
            const { data: org } = await supabase.from("organizacao").select("nome").eq("id", args.organizacao_id).maybeSingle();
            if (!org) return erro("Organização não encontrada.");
          }
          const r = await criaPessoa(supabase, args.nome, { ensaio: true });
          if ("erro" in r) return erro(r.erro);
          const { ensaio: _e, ...pedido } = args;
          void _e;
          return texto({ ensaio: true, faria: "criar a pessoa", ...pedido, nome: args.nome.trim() });
        }

        const r = await criaPessoa(supabase, args.nome);
        if ("erro" in r) return erro(r.erro);
        const id = r.id!;
        const onde = link(`/contatos/pessoas/${id}`);

        // A pessoa já existe a partir daqui: falha num passo seguinte é
        // relatada junto com o link, para não se criar outra ao repetir.
        const avisos: string[] = [];
        if (args.organizacao_id) {
          const v = await vinculaPessoaOrganizacao(supabase, id, args.organizacao_id, args.cargo ?? "");
          if ("erro" in v) avisos.push(`vínculo com a organização: ${v.erro}`);
        }
        for (const t of args.telefones ?? []) {
          const c = await adicionaFormaContato(supabase, id, "telefone", t);
          if ("erro" in c) avisos.push(`telefone ${t}: ${c.erro}`);
        }
        for (const e of args.emails ?? []) {
          const c = await adicionaFormaContato(supabase, id, "email", e);
          if ("erro" in c) avisos.push(`e-mail ${e}: ${c.erro}`);
        }

        revalidatePath("/contatos");
        if (args.organizacao_id) revalidatePath(`/contatos/organizacoes/${args.organizacao_id}`);
        return {
          ...texto({
            feito: "pessoa criada",
            id,
            link: onde,
            ...(avisos.length ? { atencao: "A pessoa foi criada, mas algo falhou depois — não crie de novo.", avisos } : {}),
          }),
          alvo: onde,
        };
      })
  );

  servidor.registerTool(
    "criar_negocio",
    {
      title: "Criar negócio",
      description:
        "Abre um negócio no CRM Lure para uma organização. Sem etapa, nasce na primeira do funil (Cold Lead); " +
        "o status vem da etapa. Sem responsável, fica com o próprio usuário. Ids de etapa, origem, produto e " +
        "usuários vêm de listas_do_crm.",
      inputSchema: {
        titulo: z.string().min(1).max(300),
        organizacao_id: uuid("A organização (obrigatória)."),
        etapa_id: uuid("Etapa inicial.").optional(),
        valor: z.number().min(0).max(1e10).optional().describe("Valor em reais."),
        responsavel_id: uuid("Usuário responsável.").optional(),
        origem_id: uuid("De onde veio o cliente.").optional(),
        produto_id: uuid("Produto.").optional(),
        pessoa_ids: z.array(z.string().uuid()).max(10).optional().describe("Pessoas que participam do negócio."),
        ensaio,
      },
    },
    async (args) =>
      comEscrita(acesso, "criar_negocio", args, {}, async () => {
        let etapaId = args.etapa_id;
        if (!etapaId) {
          const { data: primeira } = await supabase.from("etapa").select("id").order("ordem").limit(1).maybeSingle();
          if (!primeira) return erro("Nenhuma etapa cadastrada.");
          etapaId = primeira.id;
        }

        const r = await criaNegocio(
          supabase,
          {
            titulo: args.titulo,
            organizacaoId: args.organizacao_id,
            etapaId,
            valor: args.valor ?? null,
            responsavelId: args.responsavel_id ?? usuarioId,
            origemId: args.origem_id ?? null,
            produtoId: args.produto_id ?? null,
          },
          undefined,
          { ensaio: args.ensaio }
        );
        if ("erro" in r) return erro(r.erro);
        if (r.ensaio) {
          return texto({ ensaio: true, faria: "criar o negócio", titulo: args.titulo.trim(), etapa: r.etapa, status: r.status });
        }

        const id = r.id!;
        const avisos: string[] = [];
        for (const p of args.pessoa_ids ?? []) {
          const { error } = await supabase.from("negocio_pessoa").insert({ negocio_id: id, pessoa_id: p });
          if (error && error.code !== "23505") avisos.push(`pessoa ${p}: ${error.message}`);
        }

        revalidatePath("/negocios");
        revalidatePath("/kanban");
        const onde = linkNegocio(id);
        return {
          ...texto({
            feito: "negócio criado",
            id,
            etapa: r.etapa,
            status: r.status,
            link: onde,
            ...(avisos.length ? { atencao: "O negócio foi criado, mas algo falhou depois — não crie de novo.", avisos } : {}),
          }),
          alvo: onde,
        };
      })
  );

  /* ================================================================
   * Fase 4 — escrita sensível (atrás do interruptor, D-176)
   * ================================================================ */

  /** Caminho comum das quatro: a regra única de mudança do negócio. */
  async function mudaComo(ferramenta: string, negocioId: string, mudanca: MudancaNegocio, eEnsaio: boolean, feito: string) {
    const r = await mudaNegocio(supabase, negocioId, mudanca, { ensaio: eEnsaio });
    if ("erro" in r) return erro(r.erro);
    if (r.ensaio) return texto({ ensaio: true, faria: feito, negocio: linkNegocio(negocioId) });

    revalidatePath(`/negocios/${negocioId}`);
    revalidatePath("/negocios");
    revalidatePath("/kanban");
    if (r.ganhou) revalidatePath("/atividades");
    const onde = linkNegocio(negocioId);
    return {
      ...texto({
        feito,
        ferramenta,
        link: onde,
        ...(r.ganhou ? { observacao: "O follow-up do ganho foi agendado automaticamente." } : {}),
      }),
      alvo: onde,
    };
  }

  const AVISO_SENSIVEL = " É mudança sensível: só funciona se o usuário deixou ligada em Agentes de IA.";

  servidor.registerTool(
    "mover_etapa",
    {
      title: "Mover etapa",
      description: "Move um negócio do CRM Lure para outra etapa do funil (ids em listas_do_crm). Não muda o status." + AVISO_SENSIVEL,
      inputSchema: { negocio_id: uuid("O negócio."), etapa_id: uuid("A nova etapa."), ensaio },
    },
    async (args) =>
      comEscrita(acesso, "mover_etapa", args, { sensivel: true }, async () => {
        const { data: etapa } = await supabase.from("etapa").select("nome").eq("id", args.etapa_id).maybeSingle();
        if (!etapa) return erro("Etapa não encontrada.");
        return mudaComo("mover_etapa", args.negocio_id, { etapa_id: args.etapa_id }, args.ensaio, `negócio movido para ${etapa.nome}`);
      })
  );

  servidor.registerTool(
    "alterar_valor",
    {
      title: "Alterar valor",
      description: "Muda o valor (em reais) de um negócio do CRM Lure; null apaga o valor." + AVISO_SENSIVEL,
      inputSchema: {
        negocio_id: uuid("O negócio."),
        valor: z.number().min(0).max(1e10).nullable(),
        ensaio,
      },
    },
    async (args) =>
      comEscrita(acesso, "alterar_valor", args, { sensivel: true }, async () =>
        mudaComo("alterar_valor", args.negocio_id, { valor: args.valor }, args.ensaio, "valor alterado")
      )
  );

  servidor.registerTool(
    "trocar_responsavel",
    {
      title: "Trocar responsável",
      description: "Passa um negócio do CRM Lure para outro usuário (ids em listas_do_crm → usuarios)." + AVISO_SENSIVEL,
      inputSchema: { negocio_id: uuid("O negócio."), responsavel_id: uuid("O novo responsável."), ensaio },
    },
    async (args) =>
      comEscrita(acesso, "trocar_responsavel", args, { sensivel: true }, async () => {
        const { data: u } = await supabase.from("usuario").select("nome, ativo").eq("id", args.responsavel_id).maybeSingle();
        if (!u || !u.ativo) return erro("Usuário não encontrado ou inativo.");
        return mudaComo(
          "trocar_responsavel",
          args.negocio_id,
          { responsavel_id: args.responsavel_id },
          args.ensaio,
          `responsável trocado para ${u.nome}`
        );
      })
  );

  servidor.registerTool(
    "declarar_desfecho",
    {
      title: "Declarar desfecho",
      description:
        "Muda o status de um negócio do CRM Lure: ganho, perdido (exige motivo_perda_id, de listas_do_crm), " +
        "ou de volta a negociacao/parado. Não muda a etapa. Ganhar agenda o follow-up automático." +
        AVISO_SENSIVEL,
      inputSchema: {
        negocio_id: uuid("O negócio."),
        status: z.enum(["ganho", "perdido", "negociacao", "parado"]),
        motivo_perda_id: uuid("Motivo da perda — obrigatório para perdido.").optional(),
        ensaio,
      },
    },
    async (args) =>
      comEscrita(acesso, "declarar_desfecho", args, { sensivel: true }, async () => {
        if (args.status === "perdido" && !args.motivo_perda_id) return erro("Negócio perdido exige motivo (motivo_perda_id).");
        const mudanca: MudancaNegocio = { status: args.status as Status };
        if (args.status === "perdido") mudanca.motivo_perda_id = args.motivo_perda_id;
        return mudaComo("declarar_desfecho", args.negocio_id, mudanca, args.ensaio, `status alterado para ${args.status}`);
      })
  );
}
