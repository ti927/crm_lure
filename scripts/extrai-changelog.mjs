/**
 * F1 — Changelog dos negocios (P-021, Doc 14 secao 7).
 *
 * O Pipedrive guarda, por negocio, o historico de alteracao campo a campo.
 * E a unica fonte capaz de dar passado ao log de eventos, que de outro modo
 * nasce no dia da virada. Se serve ou nao, decide-se depois — mas so da
 * para decidir com os dados na mao, e a API fecha em 3/9/2026.
 *
 * Grava JSONL, uma linha por negocio, e retoma de onde parou: sao 2.458
 * chamadas, e uma queda no meio nao pode custar o trabalho inteiro.
 *
 * Uso:  node scripts/extrai-changelog.mjs
 */

import { readFile, appendFile, mkdir } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const DESTINO = join(RAIZ, "dados", "pipedrive");
const ARQUIVO = join(DESTINO, "dealChangelog.jsonl");

const PAUSA_MS = 300;
const TENTATIVAS = 5;

const dorme = (ms) => new Promise((r) => setTimeout(r, ms));

async function leToken() {
  if (process.env.PIPEDRIVE_API_TOKEN) return process.env.PIPEDRIVE_API_TOKEN;
  const texto = await readFile(join(RAIZ, ".env.local"), "utf8");
  const linha = texto.split(/\r?\n/).find((l) => l.startsWith("PIPEDRIVE_API_TOKEN="));
  const valor = linha?.slice("PIPEDRIVE_API_TOKEN=".length).trim();
  if (!valor) throw new Error("PIPEDRIVE_API_TOKEN nao encontrado no .env.local");
  return valor;
}

async function chama(url, token) {
  for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa++) {
    const r = await fetch(url, { headers: { "x-api-token": token } });
    if (r.status === 429) {
      const espera = Number(r.headers.get("retry-after")) || 2 ** tentativa;
      console.log(`   429 — aguardando ${espera}s`);
      await dorme(espera * 1000);
      continue;
    }
    if (!r.ok) throw new Error(`HTTP ${r.status} em ${url}`);
    return r.json();
  }
  throw new Error(`Desisti apos ${TENTATIVAS} tentativas: ${url}`);
}

/** Cursor: o changelog nao usa offset. */
async function changelogDe(id, token) {
  const mudancas = [];
  let cursor = null;

  for (;;) {
    const url = new URL(`https://api.pipedrive.com/v1/deals/${id}/changelog`);
    url.searchParams.set("limit", "500");
    if (cursor) url.searchParams.set("cursor", cursor);

    const json = await chama(url, token);
    if (Array.isArray(json.data)) mudancas.push(...json.data);

    cursor = json.additional_data?.next_cursor;
    if (!cursor) return mudancas;
    await dorme(PAUSA_MS);
  }
}

/* ---------- execucao ---------- */

const token = await leToken();
await mkdir(DESTINO, { recursive: true });

const deals = JSON.parse(await readFile(join(DESTINO, "deals.json"), "utf8"));

// Retomada: o que ja foi gravado nao se pede de novo.
const prontos = new Set();
if (existsSync(ARQUIVO)) {
  for (const linha of readFileSync(ARQUIVO, "utf8").split("\n")) {
    if (linha.trim()) prontos.add(JSON.parse(linha).deal_id);
  }
  console.log(`Retomando: ${prontos.size} negocios ja extraidos.`);
}

const pendentes = deals.filter((d) => !prontos.has(d.id));
console.log(`${pendentes.length} negocios a extrair.\n`);

let feitos = 0;
let totalMudancas = 0;

for (const deal of pendentes) {
  const mudancas = await changelogDe(deal.id, token);
  await appendFile(
    ARQUIVO,
    JSON.stringify({ deal_id: deal.id, mudancas }) + "\n",
    "utf8"
  );

  feitos++;
  totalMudancas += mudancas.length;
  if (feitos % 50 === 0) {
    console.log(`   ${feitos}/${pendentes.length} — ${totalMudancas} mudancas`);
  }
  await dorme(PAUSA_MS);
}

console.log(`\nPronto: ${feitos} negocios, ${totalMudancas} mudancas.`);
console.log(`Gravado em dados/pipedrive/dealChangelog.jsonl`);
