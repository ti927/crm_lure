import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Acesso } from "./acesso";
import {
  hojeBrasilia,
  somaDias,
  SELECAO,
  type LinhaAtividade,
} from "@/app/(sistema)/atividades/consulta";

/**
 * O servidor MCP do CRM (Doc 16). Fase 1: uma ferramenta, só leitura —
 * a prova de que o agente chega ao banco como o usuário que o conectou.
 *
 * Um servidor por requisição, sem sessão: a Vercel não guarda estado
 * entre chamadas, e cada requisição traz o próprio token.
 */

/** Teto de linhas por chamada (R-006): nunca a base inteira. */
const TETO = 100;

export function criaServidor(acesso: Acesso): McpServer {
  const servidor = new McpServer({ name: "crm-lure", version: "0.1.0" });

  servidor.registerTool(
    "minhas_atividades_pendentes",
    {
      title: "Minhas atividades pendentes",
      description:
        "Lista as atividades NÃO concluídas do usuário conectado no CRM Lure: as vencidas e as dos próximos dias. " +
        "Use para o resumo diário de pendências. Datas no fuso de São Paulo.",
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
    async ({ dias_a_frente, incluir_vencidas, limite }) => {
      const { supabase, usuarioId, email } = acesso;

      // Usuário do domínio, achado pelo login e não pelo id (D-109).
      const { data: eu, error: erroEu } = await supabase
        .from("usuario")
        .select("id, nome")
        .eq("auth_id", usuarioId)
        .maybeSingle();

      if (erroEu || !eu) {
        return erro(`Não achei o usuário do CRM para ${email}.`);
      }

      const hoje = hojeBrasilia();
      const ate = somaDias(hoje, dias_a_frente);

      let consulta = supabase
        .from("atividade")
        .select(SELECAO) // a mesma seleção da tela de Atividades
        .eq("responsavel_id", eu.id)
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
        id: a.id,
        titulo: a.titulo,
        tipo: a.tipo_atividade?.nome ?? null,
        data: a.data,
        hora: a.hora_inicio,
        situacao: a.data < hoje ? "vencida" : a.data === hoje ? "hoje" : "futura",
        negocio: a.negocio ? { id: a.negocio.id, titulo: a.negocio.titulo } : null,
        organizacao: a.organizacao ? { id: a.organizacao.id, nome: a.organizacao.nome } : null,
        pessoa: a.pessoa ? { id: a.pessoa.id, nome: a.pessoa.nome } : null,
        descricao: a.descricao,
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                usuario: eu.nome,
                hoje,
                ate,
                total: atividades.length,
                truncado: atividades.length === limite,
                atividades,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  return servidor;
}

function erro(texto: string) {
  return { isError: true, content: [{ type: "text" as const, text: texto }] };
}
