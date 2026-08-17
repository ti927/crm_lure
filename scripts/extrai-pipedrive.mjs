/**
 * F1 — Extracao da base do Pipedrive (P-020, Doc 14 secao 3).
 *
 * Grava os dados BRUTOS, um arquivo por entidade, antes de qualquer
 * transformacao. O mapeamento para o Modelo de Dominio acontece depois,
 * lendo estes arquivos — assim a transformacao pode ser refeita quantas
 * vezes for preciso sem bater na API de novo.
 *
 * ⚠️ Prazo: a API fecha junto com o contrato em 3/9/2026. Depois disso
 * estes arquivos sao a unica copia da base.
 *
 * Uso:  node scripts/extrai-pipedrive.mjs
 */

import { writeFile, mkdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const DESTINO = join(RAIZ, "dados", "pipedrive");

const PAUSA_MS = 300; // burst limit e por janela de 2s; 300ms sobra folga
const TENTATIVAS = 5;
const LIMITE = 500;
const LOTE_IDS = 200; // maximo confirmado contra a API real

/* ---------- token ---------- */

async function leToken() {
  if (process.env.PIPEDRIVE_API_TOKEN) return process.env.PIPEDRIVE_API_TOKEN;

  // Sem dependencia externa: o .env.local e simples o bastante.
  const texto = await readFile(join(RAIZ, ".env.local"), "utf8");
  const linha = texto
    .split(/\r?\n/)
    .find((l) => l.startsWith("PIPEDRIVE_API_TOKEN="));

  const valor = linha?.slice("PIPEDRIVE_API_TOKEN=".length).trim();
  if (!valor) {
    throw new Error(
      "PIPEDRIVE_API_TOKEN nao encontrado. Doc 14 secao 1: o token vem do " +
        "ambiente, nunca do codigo."
    );
  }
  return valor;
}

/* ---------- chamada com repeticao ---------- */

const dorme = (ms) => new Promise((r) => setTimeout(r, ms));

async function chama(url, token) {
  for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa++) {
    const resposta = await fetch(url, { headers: { "x-api-token": token } });

    // 429: o Pipedrive diz quanto esperar. Sem o cabecalho, recuo dobrado.
    if (resposta.status === 429) {
      const espera = Number(resposta.headers.get("retry-after")) || 2 ** tentativa;
      console.log(`   429 — aguardando ${espera}s (tentativa ${tentativa})`);
      await dorme(espera * 1000);
      continue;
    }

    if (!resposta.ok) {
      const corpo = await resposta.text();
      throw new Error(`HTTP ${resposta.status} em ${url}\n${corpo.slice(0, 300)}`);
    }

    return resposta.json();
  }
  throw new Error(`Desisti apos ${TENTATIVAS} tentativas: ${url}`);
}

/* ---------- paginacao ---------- */

/** v1: offset. `start` avanca ate more_items_in_collection virar false. */
async function paginaV1(caminho, token, extra = {}) {
  const registros = [];
  let start = 0;

  for (;;) {
    const url = new URL(`https://api.pipedrive.com/v1/${caminho}`);
    url.searchParams.set("limit", String(LIMITE));
    url.searchParams.set("start", String(start));
    for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v);

    const json = await chama(url, token);
    if (Array.isArray(json.data)) registros.push(...json.data);

    const p = json.additional_data?.pagination;
    if (!p?.more_items_in_collection) return registros;

    start = p.next_start;
    process.stdout.write(`   ${registros.length}…\r`);
    await dorme(PAUSA_MS);
  }
}

/** v2: cursor. Usada so pelos produtos por negocio. */
async function paginaV2(caminho, token, extra = {}) {
  const registros = [];
  let cursor = null;

  for (;;) {
    const url = new URL(`https://api.pipedrive.com/api/v2/${caminho}`);
    url.searchParams.set("limit", String(LIMITE));
    if (cursor) url.searchParams.set("cursor", cursor);
    for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v);

    const json = await chama(url, token);
    if (Array.isArray(json.data)) registros.push(...json.data);

    cursor = json.additional_data?.next_cursor;
    if (!cursor) return registros;
    await dorme(PAUSA_MS);
  }
}

/* ---------- entidades (Doc 14 secao 3) ---------- */

const ENTIDADES = [
  { nome: "deals", caminho: "deals", extra: { status: "all_not_deleted" } },
  { nome: "organizations", caminho: "organizations" },
  { nome: "persons", caminho: "persons" },
  // ⚠️ Sem user_id=0 a API devolve so as atividades do dono do token.
  { nome: "activities", caminho: "activities", extra: { user_id: "0" } },
  { nome: "notes", caminho: "notes" },
  { nome: "products", caminho: "products" },
  { nome: "pipelines", caminho: "pipelines" },
  { nome: "stages", caminho: "stages" },
  { nome: "users", caminho: "users" },
  // Os tres *Fields nao viram dado: interpretam os campos personalizados,
  // que vem com chave em formato de hash (Doc 14 secao 5.8).
  { nome: "dealFields", caminho: "dealFields" },
  { nome: "personFields", caminho: "personFields" },
  { nome: "organizationFields", caminho: "organizationFields" },
  { nome: "activityTypes", caminho: "activityTypes" },
];

async function grava(nome, dados) {
  // JSON sem BOM de proposito: a regra 7 do Doc 00 vale para documentos e
  // CSVs. BOM em JSON quebra JSON.parse.
  await writeFile(join(DESTINO, `${nome}.json`), JSON.stringify(dados, null, 2), "utf8");
}

/* ---------- produtos por negocio ---------- */

/**
 * Um produto por negocio e regra do destino (D-030), nao da origem: no
 * Pipedrive a relacao e N:N. Extraimos como esta e resolvemos na
 * transformacao (Doc 14 secao 5.2).
 *
 * A v2 aceita ate 200 ids por chamada — 13 chamadas em vez de 2.458.
 */
async function produtosPorNegocio(deals, token) {
  const ids = deals.map((d) => d.id);
  const vinculos = [];

  for (let i = 0; i < ids.length; i += LOTE_IDS) {
    const lote = ids.slice(i, i + LOTE_IDS);
    const parte = await paginaV2("deals/products", token, {
      deal_ids: lote.join(","),
    });
    vinculos.push(...parte);
    process.stdout.write(`   ${i + lote.length}/${ids.length} negocios…\r`);
    await dorme(PAUSA_MS);
  }
  return vinculos;
}

/* ---------- execucao ---------- */

const token = await leToken();
await mkdir(DESTINO, { recursive: true });

const dono = (await chama("https://api.pipedrive.com/v1/users/me", token)).data;
console.log(`Pipedrive: ${dono.company_name} — token de ${dono.name}\n`);

const contagens = {};
let deals = null;

for (const { nome, caminho, extra } of ENTIDADES) {
  process.stdout.write(`${nome}… `);
  const dados = await paginaV1(caminho, token, extra);
  await grava(nome, dados);
  contagens[nome] = dados.length;
  if (nome === "deals") deals = dados;
  console.log(`${dados.length} registros`.padStart(20 - nome.length + 10));
  await dorme(PAUSA_MS);
}

process.stdout.write("dealProducts… ");
const vinculos = await produtosPorNegocio(deals, token);
await grava("dealProducts", vinculos);
contagens.dealProducts = vinculos.length;
console.log(`${vinculos.length} vinculos`);

// O resumo e o que se confere contra a tela do Pipedrive (Doc 14 secao 8).
const resumo = {
  extraido_em: new Date().toISOString(),
  empresa: dono.company_name,
  token_de: { nome: dono.name, email: dono.email, admin: Boolean(dono.is_admin) },
  contagens,
};
await grava("_resumo", resumo);

console.log("\n--- contagens ---");
for (const [k, v] of Object.entries(contagens)) console.log(`${k.padEnd(22)} ${v}`);
console.log(`\nGravado em dados/pipedrive/`);
