/**
 * D-144 — ensaio da migracao de push.
 *
 * ⚠️ NAO GRAVA NADA: aplica dentro de uma transacao e desfaz sempre.
 * Mesmo metodo do ensaio da F8 e da carga. Ha UMA base, e ela e a de
 * producao (D-101).
 *
 * O que verifica:
 *   1. a migracao aplica
 *   2. `notificacoes()` continua respondendo IGUAL depois de passar a
 *      delegar — se o sino mudar de numero, a refatoracao quebrou algo
 *   3. `notificacoes_de` esta fechada para `authenticated`
 *   4. `notificacao_enviada` e invisivel para usuario comum
 *   5. o agregado que o enviador mandaria, por pessoa
 *
 * Uso:  node scripts/ensaia-push.mjs
 */

import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const MIGRACAO = join(RAIZ, "supabase/migrations/20260820160000_push.sql");

const CORES = { ok: "\x1b[32m", falha: "\x1b[31m", aviso: "\x1b[33m", fim: "\x1b[0m" };
const marca = { ok: "  OK  ", falha: "FALHA ", aviso: "AVISO " };
let falhas = 0;
const anota = (s, t, d) => {
  if (s === "falha") falhas++;
  console.log(`${CORES[s]}[${marca[s]}]${CORES.fim} ${t}`);
  if (d) console.log(`         ${String(d).replace(/\n/g, "\n         ")}`);
};

const url = (await readFile(join(RAIZ, ".env.local"), "utf8"))
  .split(/\r?\n/)
  .find((l) => l.startsWith("SUPABASE_DB_URL="))
  ?.slice("SUPABASE_DB_URL=".length)
  .trim();
if (!url) throw new Error("SUPABASE_DB_URL ausente no .env.local");

const cli = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await cli.connect();
const q = async (sql, a) => (await cli.query(sql, a)).rows;

console.log("\n=== D-144 — ensaio do push ===");
console.log(`Base: ${url.replace(/:[^:@]*@/, ":***@")}`);
console.log("⚠️  Transacao unica, desfeita no fim.\n");

const usuarios = await q(
  `select id, nome, email, auth_id from usuario where auth_id is not null and ativo order by nome`,
);

/** Roda um bloco na pele de um usuario logado. */
async function comoUsuario(u, fn) {
  await cli.query("savepoint sessao");
  await cli.query(`select set_config('request.jwt.claims', $1, true)`, [
    JSON.stringify({ sub: u.auth_id, email: u.email, role: "authenticated" }),
  ]);
  await cli.query("set local role authenticated");
  try {
    return await fn();
  } finally {
    await cli.query("reset role");
    await cli.query("rollback to savepoint sessao");
  }
}

await cli.query("begin");
try {
  /* --- antes: guarda o numero de cada sino para comparar depois --- */
  const antes = {};
  for (const u of usuarios) {
    antes[u.id] = await comoUsuario(u, async () => {
      const r = await q(`select count(*)::int n from public.notificacoes()`);
      return r[0].n;
    });
  }

  const [{ ja }] = await q(`
    select count(*) = 2 as ja from information_schema.tables
     where table_schema = 'public'
       and table_name in ('inscricao_push', 'notificacao_enviada')`);

  if (ja) {
    anota("aviso", "Migracao ja aplicada — verificando o que esta no ar");
  } else {
    await cli.query(await readFile(MIGRACAO, "utf8"));
    anota("ok", "A migracao aplica sem erro na base real");
  }

  /* --- 2. o sino nao pode ter mudado de numero --- */
  let divergiu = 0;
  const linhas = [];
  for (const u of usuarios) {
    const depois = await comoUsuario(u, async () => {
      const r = await q(`select count(*)::int n from public.notificacoes()`);
      return r[0].n;
    });
    if (depois !== antes[u.id]) divergiu++;
    linhas.push(`${u.nome}: ${antes[u.id]} -> ${depois}`);
  }
  anota(
    divergiu === 0 ? "ok" : "falha",
    "notificacoes() responde IGUAL depois de passar a delegar",
    linhas.join(" · "),
  );

  /* --- 3. notificacoes_de fechada para usuario comum --- */
  const alvo = usuarios[0];
  const fechada = await comoUsuario(alvo, async () => {
    try {
      await cli.query("savepoint t");
      await q(`select * from public.notificacoes_de($1) limit 1`, [usuarios[1]?.id ?? alvo.id]);
      await cli.query("rollback to savepoint t");
      return false;
    } catch {
      await cli.query("rollback to savepoint t");
      return true;
    }
  });
  anota(
    fechada ? "ok" : "falha",
    "notificacoes_de(uuid) recusa usuario comum (nao da para ler a caixa alheia)",
  );

  /* --- 4. notificacao_enviada invisivel --- */
  const invisivel = await comoUsuario(alvo, async () => {
    try {
      await cli.query("savepoint t");
      const r = await q(`select count(*)::int n from public.notificacao_enviada`);
      await cli.query("rollback to savepoint t");
      // Sem policy e com RLS ligada, o select passa mas devolve zero.
      return { negou: false, n: r[0].n };
    } catch (e) {
      await cli.query("rollback to savepoint t");
      return { negou: true, msg: e.message };
    }
  });
  anota(
    invisivel.negou || invisivel.n === 0 ? "ok" : "falha",
    "notificacao_enviada e opaca para usuario comum",
    invisivel.negou ? "acesso negado pelo grant" : `RLS sem policy devolve ${invisivel.n} linhas`,
  );

  /* --- 5. o que o enviador mandaria na primeira rodada --- */
  console.log("\n--- Primeiro disparo, por pessoa (agregado) ---");
  for (const u of usuarios) {
    const [r] = await q(
      `select count(*) filter (where conta and not lida)::int pendentes,
              count(*) filter (where conta and not lida and tipo = 'negocio_parado')::int parados,
              count(*) filter (where conta and not lida and tipo = 'atividade_vencida')::int vencidas
         from public.notificacoes_de($1)`,
      [u.id],
    );
    if (r.pendentes === 0) {
      anota("aviso", `${u.nome} — nada a empurrar`);
    } else {
      anota(
        "ok",
        `${u.nome} — 1 push com "${r.pendentes} pendências"`,
        `⚠️ seriam ${r.pendentes} vibracoes sem o agregado ` +
          `(${r.parados} parados, ${r.vencidas} vencidas)`,
      );
    }
  }
} catch (e) {
  anota("falha", "O ensaio parou com erro", `${e.message}\n${e.detail ?? ""}`);
} finally {
  await cli.query("rollback");
  console.log("\n⚠️  ROLLBACK executado — a base esta como estava.");
  await cli.end();
}

console.log(
  falhas === 0
    ? `\n${CORES.ok}Ensaio limpo.${CORES.fim}\n`
    : `\n${CORES.falha}${falhas} falha(s).${CORES.fim}\n`,
);
process.exit(falhas === 0 ? 0 : 1);
