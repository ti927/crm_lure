/**
 * Ensaia uma migration contra a base real, dentro de uma transação que
 * SEMPRE desfaz.
 *
 * ⚠️ Há um ambiente só (regra 8 do Doc 12): não existe banco de
 * desenvolvimento nem de ensaio, e esta máquina não tem Docker. A saída
 * é a mesma que a carga usa — uma transação única, desfeita no fim. É
 * assim que se testa DDL aqui, e não aplicando para ver no que dá.
 *
 * ⚠️ `rollback` desfaz DDL no PostgreSQL: `create table`, `alter table`
 * e `create function` são transacionais, ao contrário do MySQL. É o que
 * torna este ensaio honesto.
 *
 * ⚠️ Ensaio de migration NÃO é ensaio de aplicação. Ele responde se o
 * SQL roda e o que ele mexeu; não responde se a tela ficou certa. Para
 * isso existe o `npm run telas` (D-153).
 *
 * Uso:
 *   node scripts/ensaia-migration.mjs supabase/migrations/<arquivo>.sql
 */

import { readFile } from "node:fs/promises";
import process from "node:process";
import pg from "pg";

const arquivo = process.argv[2];
if (!arquivo) {
  console.error("Uso: node scripts/ensaia-migration.mjs <caminho do .sql>");
  process.exit(1);
}

const sql = await readFile(arquivo, "utf8");
const url = (await readFile(".env.local", "utf8"))
  .split(/\r?\n/)
  .find((l) => l.startsWith("SUPABASE_DB_URL="))
  ?.slice("SUPABASE_DB_URL=".length)
  .trim();
if (!url) throw new Error("SUPABASE_DB_URL ausente no .env.local");

const cli = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await cli.connect();

console.log(`Ensaiando ${arquivo} — a transação será desfeita no fim.\n`);

try {
  await cli.query("begin");
  await cli.query(sql);
  console.log("✅ O SQL rodou inteiro, sem erro.\n");

  // O que a migration mexeu, medido DENTRO da transação — depois do
  // rollback nada disto existe mais.
  const conta = async (rotulo, consulta) => {
    const { rows } = await cli.query(consulta);
    console.log(`   ${rotulo}: ${rows[0].n}`);
  };
  console.log("Efeito nos dados, antes de desfazer:");
  await conta("organizações com UF", "select count(*) n from organizacao where uf is not null");
  await conta("organizações com cidade", "select count(*) n from organizacao where cidade is not null");
  await conta(
    "cidades que ainda carregam vírgula ou hífen",
    "select count(*) n from organizacao where cidade ~ '[,]|\\s-'"
  );

  const { rows: amostra } = await cli.query(
    "select cidade, uf from organizacao where uf is not null order by cidade limit 15"
  );
  console.log("\nAmostra do que a separação produziu:");
  for (const r of amostra) console.log(`   ${r.cidade} — ${r.uf}`);

  // As funções recriadas precisam RESPONDER, não só compilar: uma função
  // SQL só valida o corpo na primeira execução.
  console.log("\nAs funções recriadas, executadas:");
  for (const [rotulo, consulta] of [
    ["organizacoes_agrupadas", "select * from public.organizacoes_agrupadas(null, 3, 0)"],
    [
      "organizacoes_do_grupo",
      "select * from public.organizacoes_do_grupo((select chave_agrupamento from organizacao where cidade is not null limit 1))",
    ],
    [
      "fusao_cadastros",
      "select * from public.fusao_cadastros((select chave_agrupamento from organizacao limit 1))",
    ],
    [
      "fusao_detalhe_cadastro",
      "select public.fusao_detalhe_cadastro((select id from organizacao limit 1))",
    ],
    [
      "previa_fusao_organizacao",
      `select public.previa_fusao_organizacao(
         (select id from organizacao order by id limit 1),
         (select id from organizacao order by id desc limit 1))`,
    ],
  ]) {
    const { rows } = await cli.query(consulta);
    console.log(`   ✅ ${rotulo} — ${rows.length} linha(s)`);
  }

  // ⚠️ `funde_organizacao` NÃO é exercitada: ela apaga um cadastro real.
  // O rollback desfaria, mas ensaiar uma operação sem volta contra a
  // base de produção é o tipo de atalho que a D-156 mandou não tomar. O
  // que mudou nela é a linha de adoção, coberta pela prévia acima.
  console.log("\n   (funde_organizacao não é exercitada: ela apaga cadastro real.)");
} catch (erro) {
  console.error("❌ A migration FALHOU:\n", erro.message);
  if (erro.position) console.error("   posição:", erro.position);
  process.exitCode = 1;
} finally {
  await cli.query("rollback");
  console.log("\n↩️  Transação desfeita. A base está como estava.");
  await cli.end();
}
