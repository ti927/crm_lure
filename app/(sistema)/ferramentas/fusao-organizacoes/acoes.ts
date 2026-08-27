"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * ⚠️ A trava de verdade está no BANCO, dentro de `funde_organizacao`, e
 * foi verificada usuário a usuário: Julio e Fabio passam, os outros
 * quatro recebem `insufficient_privilege`. Estas checagens aqui existem
 * para o erro chegar em português e a tela nem ser montada — não são
 * elas que protegem.
 */
async function exigeDesenvolvedor() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("sou_desenvolvedor");
  return { supabase, dev: data === true };
}

export type Previa = {
  principal: { id: string; nome: string };
  duplicada: { id: string; nome: string };
  move: {
    negocios: number;
    atividades: number;
    anotacoes: number;
    pessoas: number;
  };
  ja_vinculadas: number;
  adota: Record<string, string>;
  descarta: Record<string, string>;
};

export async function previaFusao(principalId: string, duplicadaId: string) {
  const { supabase, dev } = await exigeDesenvolvedor();
  if (!dev) return { erro: "Esta ferramenta é restrita aos desenvolvedores." };

  const { data, error } = await supabase.rpc("previa_fusao_organizacao", {
    p_principal: principalId,
    p_duplicada: duplicadaId,
  });
  if (error) return { erro: error.message };
  return { previa: data as unknown as Previa };
}

/**
 * Funde UMA duplicada na principal.
 *
 * ⚠️ Uma por vez, por decisão do maestro. Um botão de "fundir o grupo
 * inteiro" existiria para ser clicado sem ler — e são 668 grupos, onde o
 * agrupamento é por NOME e nome igual não prova que é a mesma empresa.
 * A operação não tem desfazer.
 */
export async function fundirOrganizacao(principalId: string, duplicadaId: string) {
  const { supabase, dev } = await exigeDesenvolvedor();
  if (!dev) return { erro: "Esta ferramenta é restrita aos desenvolvedores." };

  const { data, error } = await supabase.rpc("funde_organizacao", {
    p_principal: principalId,
    p_duplicada: duplicadaId,
  });
  if (error) return { erro: error.message };

  revalidatePath("/ferramentas/fusao-organizacoes");
  revalidatePath("/contatos");
  return { resultado: data as unknown as Record<string, unknown> };
}

/* ==================================================================
 * O cadastro inteiro, para decidir sem sair da tela.
 * ================================================================== */

export type DetalheCadastro = {
  id: string;
  nome: string;
  cidade: string | null;
  website: string | null;
  bubble_id: string | null;
  criado_em: string;
  pessoas: {
    id: string;
    nome: string;
    cargo: string | null;
    contatos: { tipo: string; valor: string }[];
  }[];
  negocios: {
    id: string;
    titulo: string;
    valor: number | null;
    status: "parado" | "negociacao" | "ganho" | "perdido";
    etapa: string | null;
    responsavel: string | null;
    criado_em: string;
  }[];
  atividades: {
    rotulo: string;
    data: string;
    concluida: boolean;
    responsavel: string | null;
  }[];
  anotacoes: { texto: string; criado_em: string; autor: string | null }[];
};

/**
 * Tudo o que um cadastro carrega, numa ida só.
 *
 * ⚠️ As contagens da tela bastam para escolher qual sobrevive; não
 * bastam para a pergunta que decide a fusão — **é a mesma empresa?**.
 * Para isso é preciso ver os nomes. Sem isto, conferir custava abrir a
 * ficha em outra aba, ler, voltar, e repetir para cada um dos 18
 * cadastros de "Amaral Group" — e numa operação sem desfazer, encarecer
 * a conferência é fazer com que se confira menos.
 */
export async function detalheDoCadastro(id: string) {
  const { supabase, dev } = await exigeDesenvolvedor();
  if (!dev) return { erro: "Esta ferramenta é restrita aos desenvolvedores." };

  const { data, error } = await supabase.rpc("fusao_detalhe_cadastro", { p_id: id });
  if (error) return { erro: error.message };
  if (!data) return { erro: "Cadastro não encontrado." };
  return { detalhe: data as unknown as DetalheCadastro };
}
