"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Anexos do negócio — a proposta enviada, e o link para ela.
 *
 * ⚠️ **O arquivo NÃO passa por aqui.** Server Action tem teto de 1 MB de
 * corpo no Next por padrão, e proposta em PDF passa disso sem esforço; o
 * envio vai do navegador direto ao Storage, com a sessão do próprio
 * usuário. Estas ações cuidam do REGISTRO: gravam a linha depois que o
 * objeto já subiu, emitem a URL assinada para baixar, e apagam os dois
 * lados juntos.
 */

const BALDE = "anexos";

/** Quem está escrevendo, resolvido por `auth_id` — a D-109 separou os dois. */
async function euSou(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("usuario")
    .select("id")
    .eq("auth_id", user.id)
    .maybeSingle();
  return data?.id ?? null;
}

/**
 * Onde o objeto mora dentro do balde. Montado NO SERVIDOR, e a partir do
 * id do negócio — não do nome que o navegador mandou.
 *
 * ⚠️ O nome original vira só o sufixo, higienizado. Um "../" no nome do
 * arquivo escreveria fora da pasta do negócio, e dois arquivos com o
 * mesmo nome no mesmo negócio sobrescreveriam um ao outro sem aviso — o
 * `crypto.randomUUID()` na frente resolve os dois.
 */
export async function caminhoParaEnvio(negocioId: string, nomeArquivo: string) {
  const supabase = await createClient();
  const { data: negocio } = await supabase
    .from("negocio")
    .select("id")
    .eq("id", negocioId)
    .maybeSingle();
  if (!negocio) return { erro: "Negócio não encontrado." };

  const limpo =
    nomeArquivo
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(-80) || "arquivo";

  return { caminho: `${negocioId}/${crypto.randomUUID()}-${limpo}` };
}

/** Grava a linha depois que o objeto já subiu. */
export async function registrarArquivo(
  negocioId: string,
  dados: { caminho: string; nome: string; tamanho: number; mime: string | null }
) {
  const supabase = await createClient();

  // ⚠️ O caminho tem que começar pela pasta deste negócio. Sem esta
  // conferência, uma chamada montada à mão apontaria a linha de um
  // negócio para o arquivo de outro — e a política do balde, que só olha
  // o domínio, deixaria passar.
  if (!dados.caminho.startsWith(`${negocioId}/`)) {
    return { erro: "Caminho de anexo inválido." };
  }

  const { error } = await supabase.from("anexo_negocio").insert({
    negocio_id: negocioId,
    tipo: "arquivo",
    nome: dados.nome.trim().slice(0, 200) || "arquivo",
    caminho: dados.caminho,
    tamanho: dados.tamanho,
    mime: dados.mime,
    autor_id: await euSou(supabase),
  });

  if (error) {
    // A linha não entrou: o objeto no balde ficaria órfão, invisível na
    // tela e ocupando espaço para sempre. Melhor desfazer o envio.
    await supabase.storage.from(BALDE).remove([dados.caminho]);
    return { erro: error.message };
  }

  revalidatePath(`/negocios/${negocioId}`);
  return { ok: true };
}

/**
 * Registra um link.
 *
 * ⚠️ Só `http` e `https`. `javascript:` num href é execução de código na
 * sessão de quem clicar, e a lista fechada é o que impede — validar
 * "parece um endereço" não impede.
 */
export async function registrarLink(
  negocioId: string,
  endereco: string,
  rotulo: string
) {
  const cru = endereco.trim();
  if (!cru) return { erro: "Informe o endereço." };

  const comEsquema = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(cru) ? cru : `https://${cru}`;
  let url: URL;
  try {
    url = new URL(comEsquema);
  } catch {
    return { erro: "Endereço inválido." };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { erro: "Só endereços http ou https." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("anexo_negocio").insert({
    negocio_id: negocioId,
    tipo: "link",
    // Sem rótulo, o próprio endereço serve de nome — mas sem o esquema,
    // que só ocupa espaço numa coluna estreita.
    nome:
      rotulo.trim().slice(0, 200) ||
      `${url.host}${url.pathname === "/" ? "" : url.pathname}`.slice(0, 200),
    url: url.toString(),
    autor_id: await euSou(supabase),
  });

  if (error) return { erro: error.message };

  revalidatePath(`/negocios/${negocioId}`);
  return { ok: true };
}

/**
 * O endereço para abrir o anexo.
 *
 * ⚠️ Link volta como está; arquivo ganha URL ASSINADA, válida por cinco
 * minutos. O balde é privado de propósito (proposta com valor não pode
 * vazar para quem adivinhe o caminho), então não existe endereço fixo
 * para o arquivo — ele é emitido a cada clique, e por isso esta é uma
 * ação e não um campo da listagem.
 */
export async function abrirAnexo(id: string) {
  const supabase = await createClient();

  const { data: anexo, error } = await supabase
    .from("anexo_negocio")
    .select("tipo, url, caminho, nome")
    .eq("id", id)
    .maybeSingle();

  if (error) return { erro: error.message };
  if (!anexo) return { erro: "Anexo não encontrado." };
  if (anexo.tipo === "link") return { url: anexo.url! };

  const { data, error: erroUrl } = await supabase.storage
    .from(BALDE)
    .createSignedUrl(anexo.caminho!, 300, { download: anexo.nome });

  if (erroUrl) return { erro: erroUrl.message };
  return { url: data.signedUrl };
}

/**
 * Apaga o anexo.
 *
 * ⚠️ **A linha primeiro, o objeto depois.** Na ordem inversa, uma falha
 * no meio deixaria uma linha na tela apontando para um arquivo que não
 * existe mais — e quem clicasse veria erro sem entender. Nesta ordem, a
 * falha no meio deixa um objeto órfão no balde: invisível, mas inofensivo.
 */
export async function excluirAnexo(id: string, negocioId: string) {
  const supabase = await createClient();

  const { data: anexo } = await supabase
    .from("anexo_negocio")
    .select("caminho")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("anexo_negocio").delete().eq("id", id);
  if (error) return { erro: error.message };

  if (anexo?.caminho) {
    await supabase.storage.from(BALDE).remove([anexo.caminho]);
  }

  revalidatePath(`/negocios/${negocioId}`);
  return { ok: true };
}
