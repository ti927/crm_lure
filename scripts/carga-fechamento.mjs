/**
 * Preenche `negocio.fechado_em` com as datas reais do Pipedrive (D-131).
 *
 * `won_time` e `lost_time` estao 100% completos na extracao de 17/08:
 * 1.031 ganhos e 1.121 perdidos, todos com data. Sem isso o relatorio
 * financeiro atribui receita ao ano errado — 2021 apareceria com 137
 * ganhos em vez de 477.
 *
 * ⚠️ Escreve so `fechado_em`. Nao toca em status, etapa, valor nem
 * responsavel — portanto o gatilho do log de eventos nao dispara (ele so
 * olha esses quatro campos) e o gatilho de carimbo tambem nao, porque o
 * status nao muda. A carga nao gera evento nenhum, e isso e proposital:
 * nada ACONTECEU com estes negocios hoje.
 *
 * Uso:  node scripts/carga-fechamento.mjs            (ensaio, nao grava)
 *       node scripts/carga-fechamento.mjs --aplicar  (grava)
 */

import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const APLICAR = process.argv.includes("--aplicar");

const texto = (v) => {
  const s = v == null ? "" : String(v).trim().replace(/\s+/g, " ");
  return s === "" ? null : s;
};
const instante = (v) => (texto(v) ? `${String(v).replace(" ", "T")}Z` : null);

const url = (await readFile(join(RAIZ, ".env.local"), "utf8"))
  .split(/\r?\n/)
  .find((l) => l.startsWith("SUPABASE_DB_URL="))
  ?.slice("SUPABASE_DB_URL=".length)
  .trim();

const cli = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await cli.connect();

console.log(
  `\n=== Datas de fechamento do Pipedrive ===\n` +
    `Modo: ${APLICAR ? "APLICAR — grava" : "ENSAIO — desfaz no fim"}\n`
);

await cli.query("begin");
let erro = null;

try {
  const deals = JSON.parse(await readFile(join(RAIZ, "dados/pipedrive/deals.json"), "utf8"));
  const { rows: negocios } = await cli.query("select id, titulo, criado_em from negocio");

  // Mesma amarracao da carga do changelog: titulo + criado_em (que
  // preservou o add_time ao segundo). 2.458 de 2.458, sem colisao.
  const chave = (t, q) => `${t} ${new Date(q).toISOString()}`;
  const porChave = new Map();
  const repetidas = new Set();
  for (const n of negocios) {
    const k = chave(n.titulo, n.criado_em);
    if (porChave.has(k)) repetidas.add(k);
    porChave.set(k, n.id);
  }

  const paraGravar = [];
  let semPar = 0;
  let semData = 0;

  for (const d of deals) {
    const quando = instante(d.won_time ?? d.lost_time ?? d.close_time);
    if (!quando) {
      // Negocio ainda aberto: nao fechou, nao tem data. Correto.
      if (d.status === "won" || d.status === "lost") semData++;
      continue;
    }
    const k = chave(texto(d.title) ?? "(sem titulo)", instante(d.add_time));
    if (repetidas.has(k)) continue;
    const id = porChave.get(k);
    if (!id) {
      semPar++;
      continue;
    }
    paraGravar.push([id, quando]);
  }

  console.log(`negocios com data de desfecho: ${paraGravar.length}`);
  if (semPar) console.log(`  ⚠️ ${semPar} sem par no banco`);
  if (semData) console.log(`  ⚠️ ${semData} fechados sem data na origem`);

  // Um update so, por lista de pares. 2.152 updates individuais seriam
  // 2.152 idas ao banco.
  const LOTE = 500;
  let gravados = 0;
  for (let i = 0; i < paraGravar.length; i += LOTE) {
    const fatia = paraGravar.slice(i, i + LOTE);
    const valores = [];
    const marcas = fatia.map((par, j) => {
      valores.push(par[0], par[1]);
      return `($${j * 2 + 1}::uuid, $${j * 2 + 2}::timestamptz)`;
    });
    const { rowCount } = await cli.query(
      `update negocio n set fechado_em = v.quando
         from (values ${marcas.join(", ")}) as v(id, quando)
        where n.id = v.id`,
      valores
    );
    gravados += rowCount;
  }
  console.log(`atualizados: ${gravados}`);

  const { rows: conf } = await cli.query(`
    select
      (select count(*) from negocio where status in ('ganho','perdido'))      as desfechos,
      (select count(*) from negocio
        where status in ('ganho','perdido') and fechado_em is not null)        as com_data,
      (select count(*) from negocio
        where status not in ('ganho','perdido') and fechado_em is not null)    as aberto_com_data,
      (select count(*) from evento_negocio)                                    as eventos
  `);
  console.log("\nConferencia (dentro da transacao):");
  console.table(conf);

  if (Number(conf[0].aberto_com_data) > 0) {
    throw new Error("Negocio aberto ficou com data de fechamento — mapeamento errado.");
  }
  if (Number(conf[0].eventos) !== 3415) {
    throw new Error(`O log mudou de tamanho (${conf[0].eventos}). Esta carga nao deveria gerar evento.`);
  }

  const { rows: porAno } = await cli.query(`
    select extract(year from fechado_em)::int ano,
           count(*) filter (where status = 'ganho')::int ganhos,
           to_char(coalesce(sum(valor) filter (where status = 'ganho'), 0),
                   'FM999G999G999D00') as receita
      from negocio where fechado_em is not null
     group by 1 order by 1 desc limit 8
  `);
  console.log("\nReceita por ano de FECHAMENTO (o eixo do relatorio financeiro):");
  console.table(porAno);
} catch (e) {
  erro = e;
} finally {
  if (erro || !APLICAR) {
    await cli.query("rollback");
    console.log(
      erro ? `\n⛔ ROLLBACK — ${erro.message}` : "\n↩️  ROLLBACK — ensaio. Use --aplicar."
    );
  } else {
    await cli.query("commit");
    console.log("\n✅ COMMIT — datas de fechamento gravadas.");
  }
  await cli.end();
  if (erro) process.exit(1);
}
